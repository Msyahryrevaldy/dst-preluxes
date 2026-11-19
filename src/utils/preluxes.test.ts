import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { INITIAL_STUDIO_STATE } from '../data/seedData';
import { PRELUXES_CLIENT_ID, PRELUXES_PLATFORMS, getAllowedPlatforms } from '../data/preluxesSeed';
import { backfillSeedClient, migrateStudioStorage } from './storageMigration';
import {
  buildPreluxesSchedule,
  checkSiteReadiness,
  sanitizePreluxesPlatforms,
  type PreluxesFeed,
} from './preluxesSchedule';

const feed = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'sites/preluxes/brand-kit-archive/feeds/catalog-feed.json'), 'utf-8')
) as PreluxesFeed;

test('Preluxes hanya boleh IG, Facebook, TikTok; klien lain tetap 4 platform', () => {
  assert.deepEqual(getAllowedPlatforms(PRELUXES_CLIENT_ID), ['Instagram', 'Facebook', 'TikTok']);
  assert.equal(getAllowedPlatforms('dst-internal').includes('LinkedIn'), true);
  assert.deepEqual(sanitizePreluxesPlatforms(['LinkedIn', 'TikTok']), ['TikTok']);
  assert.deepEqual(sanitizePreluxesPlatforms(['LinkedIn']), PRELUXES_PLATFORMS);
});

test('seed memuat klien, workspace, guideline APPROVED, dan channel Preluxes', () => {
  const s = INITIAL_STUDIO_STATE;
  assert.ok(s.clients.some((c) => c.id === PRELUXES_CLIENT_ID));
  const ws = s.workspaces.find((w) => w.clientId === PRELUXES_CLIENT_ID);
  assert.ok(ws);
  assert.equal(s.guidelines[ws!.id].versions[0].status, 'APPROVED');
  assert.ok(s.guidelines[ws!.id].versions[0].swatches.some((x) => x.hex === '#E9BBAA'));
  assert.ok(s.channels.some((c) => c.clientId === PRELUXES_CLIENT_ID));
});

test('backfill menambahkan Preluxes ke data lama tanpa menghapus apa pun dan idempotent', () => {
  const old = {
    ...INITIAL_STUDIO_STATE,
    clients: INITIAL_STUDIO_STATE.clients.filter((c) => c.id !== PRELUXES_CLIENT_ID),
    workspaces: INITIAL_STUDIO_STATE.workspaces.filter((w) => w.clientId !== PRELUXES_CLIENT_ID),
    channels: INITIAL_STUDIO_STATE.channels.filter((c) => c.clientId !== PRELUXES_CLIENT_ID),
    assets: INITIAL_STUDIO_STATE.assets.filter((a) => a.clientId !== PRELUXES_CLIENT_ID),
    walletTransactions: [{ ...INITIAL_STUDIO_STATE.walletTransactions[0], id: 'tx-mine' }],
    users: INITIAL_STUDIO_STATE.users.map((u) => ({
      ...u,
      assignedClientIds: u.assignedClientIds.filter((id) => id !== PRELUXES_CLIENT_ID),
    })),
  };
  const out = backfillSeedClient(old, INITIAL_STUDIO_STATE, PRELUXES_CLIENT_ID);
  assert.equal(out.clients.length, old.clients.length + 1);
  assert.equal(out.walletTransactions[0].id, 'tx-mine');
  const pm = out.users.find((u) => u.role === 'PM')!;
  assert.ok(pm.assignedClientIds.includes(PRELUXES_CLIENT_ID));
  const admin = out.users.find((u) => u.role === 'ADMIN')!;
  assert.equal(admin.assignedClientIds.length, 0, 'ADMIN (akses semua) tidak diubah');
  const again = backfillSeedClient(out, INITIAL_STUDIO_STATE, PRELUXES_CLIENT_ID);
  assert.equal(again, out);
  const viaMigration = migrateStudioStorage({ ...old, schemaVersion: 10 }, INITIAL_STUDIO_STATE).state;
  assert.ok(viaMigration.clients.some((c) => c.id === PRELUXES_CLIENT_ID));
});

test('jadwal: 14 hari, 3 platform, Sel/Kam/Sab, semua DRAFT, tanpa LinkedIn', () => {
  const r = buildPreluxesSchedule(feed, {
    startDate: '2026-11-18', // Rabu
    horizonDays: 14,
    platforms: ['Instagram', 'Facebook', 'TikTok', 'LinkedIn'],
    includeDemo: true,
  });
  // 18 Nov..1 Des: Kam 19, Sab 21, Sel 24, Kam 26, Sab 28, Sel 1 Des = 6 hari tayang x 3 platform
  assert.equal(r.items.length, 18);
  assert.ok(r.items.every((i) => i.status === 'DRAFT'));
  assert.ok(r.items.every((i) => i.platform !== 'LinkedIn'));
  assert.deepEqual([...new Set(r.items.map((i) => i.scheduledDate))], [
    '2026-11-19', '2026-11-21', '2026-11-24', '2026-11-26', '2026-11-28', '2026-12-01',
  ]);
  assert.equal(new Set(r.items.map((i) => i.id)).size, r.items.length, 'ID unik');
  const tiktok = r.items.find((i) => i.platform === 'TikTok')!;
  assert.ok(tiktok.videoScript && tiktok.sceneBreakdown.length === 4);
  const ig = r.items.find((i) => i.platform === 'Instagram')!;
  assert.equal(ig.carouselSlides.length, 5);
  assert.ok(!/https?:\/\//.test(ig.caption), 'caption IG tidak memuat URL');
  const fb = r.items.find((i) => i.platform === 'Facebook')!;
  assert.ok(/https?:\/\//.test(fb.caption), 'caption Facebook memuat link produk');
});

test('jadwal: deterministik (sinkron ulang menghasilkan ID sama) dan item demo bisa dikecualikan', () => {
  const opts = { startDate: '2026-11-18', horizonDays: 7 as const, platforms: ['Instagram' as const], includeDemo: true };
  const a = buildPreluxesSchedule(feed, opts);
  const b = buildPreluxesSchedule(feed, opts);
  assert.deepEqual(a.items.map((i) => i.id), b.items.map((i) => i.id));
  const noDemo = buildPreluxesSchedule(feed, { ...opts, includeDemo: false });
  assert.equal(noDemo.items.length, 0);
  assert.ok(noDemo.skippedReasons.length > 0);
});

test('kesiapan tayang menandai demo, nomor WA placeholder, dan localhost', () => {
  const checks = checkSiteReadiness(feed, 'bundled');
  const by = Object.fromEntries(checks.map((c) => [c.id, c.ok]));
  assert.equal(by['live'], false);
  assert.equal(by['real-products'], false);
  assert.equal(by['whatsapp'], false);
});
