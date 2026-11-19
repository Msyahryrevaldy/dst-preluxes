import fs from 'node:fs';
import path from 'node:path';
import type { Express } from 'express';
import { requirePermission } from './rbac.ts';
import { PRELUXES_SITE_PAGES } from '../src/data/preluxesSeed.ts';
import type { PreluxesFeed } from '../src/utils/preluxesSchedule.ts';

const DEFAULT_SITE_URL = 'http://localhost:3001';
const BUNDLED_FEED_RELATIVE = path.join('sites', 'preluxes', 'brand-kit-archive', 'feeds', 'catalog-feed.json');
const BUNDLED_ORIGIN = 'http://localhost:3000';
const CACHE_TTL_MS = 20_000;
const FETCH_TIMEOUT_MS = 4_000;

function configPath(): string {
  return path.resolve(process.cwd(), 'data', 'preluxes-config.json');
}

export function normalizeSiteUrl(raw: string): string {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new Error('URL website tidak valid.');
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new Error('URL website harus diawali http:// atau https://');
  }
  // Hanya origin; path/query dibuang agar tidak bisa dipakai membaca endpoint lain.
  return u.origin;
}

export function getSiteUrl(): string {
  try {
    const saved = JSON.parse(fs.readFileSync(configPath(), 'utf-8')) as { siteUrl?: string };
    if (saved.siteUrl) return normalizeSiteUrl(saved.siteUrl);
  } catch {
    /* belum ada konfigurasi tersimpan */
  }
  return normalizeSiteUrl(process.env.PRELUXES_SITE_URL || DEFAULT_SITE_URL);
}

export function saveSiteUrl(raw: string): string {
  const siteUrl = normalizeSiteUrl(raw);
  const file = configPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ siteUrl, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
  cache = null;
  return siteUrl;
}

export function rewriteBundledOrigin(rawJson: string, siteUrl: string): string {
  return rawJson
    .split(BUNDLED_ORIGIN)
    .join(siteUrl)
    .split(encodeURIComponent(BUNDLED_ORIGIN))
    .join(encodeURIComponent(siteUrl));
}

function isFeed(x: unknown): x is PreluxesFeed {
  return !!x && typeof x === 'object' && Array.isArray((x as PreluxesFeed).items);
}

export interface FeedResult {
  source: 'live' | 'bundled' | 'none';
  siteUrl: string;
  fetchedAt: string;
  feed: PreluxesFeed | null;
  error?: string;
}

let cache: { at: number; siteUrl: string; result: FeedResult } | null = null;

export async function loadPreluxesFeed(force = false): Promise<FeedResult> {
  const siteUrl = getSiteUrl();
  if (!force && cache && cache.siteUrl === siteUrl && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.result;
  }

  let liveError = '';
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    const resp = await fetch(`${siteUrl}/api/integration/catalog-feed.json`, {
      signal: ctrl.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json: unknown = await resp.json();
    if (!isFeed(json)) throw new Error('Format feed tidak dikenali');
    const result: FeedResult = { source: 'live', siteUrl, fetchedAt: new Date().toISOString(), feed: json };
    cache = { at: Date.now(), siteUrl, result };
    return result;
  } catch (err) {
    liveError = err instanceof Error ? err.message : String(err);
  }

  try {
    const raw = fs.readFileSync(path.resolve(process.cwd(), BUNDLED_FEED_RELATIVE), 'utf-8');
    const json: unknown = JSON.parse(rewriteBundledOrigin(raw, siteUrl));
    if (!isFeed(json)) throw new Error('Format feed bundel tidak dikenali');
    const result: FeedResult = {
      source: 'bundled',
      siteUrl,
      fetchedAt: new Date().toISOString(),
      feed: json,
      error: `Website tidak terjangkau (${liveError}). Memakai katalog bawaan paket.`,
    };
    cache = { at: Date.now(), siteUrl, result };
    return result;
  } catch (err) {
    return {
      source: 'none',
      siteUrl,
      fetchedAt: new Date().toISOString(),
      feed: null,
      error: `Website tidak terjangkau (${liveError}) dan katalog bawaan tidak bisa dibaca: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

export function registerPreluxesRoutes(app: Express): void {
  app.get('/api/preluxes/info', async (req, res) => {
    const result = await loadPreluxesFeed(req.query.refresh === '1');
    res.json({
      ok: true,
      siteUrl: result.siteUrl,
      source: result.source,
      reachable: result.source === 'live',
      error: result.error ?? null,
      totalItems: result.feed?.items.length ?? 0,
      pages: PRELUXES_SITE_PAGES,
      fetchedAt: result.fetchedAt,
    });
  });

  app.get('/api/preluxes/catalog', async (req, res) => {
    const result = await loadPreluxesFeed(req.query.refresh === '1');
    if (!result.feed) {
      res.status(502).json({ ok: false, error: result.error ?? 'Katalog tidak tersedia.' });
      return;
    }
    res.json({ ok: true, source: result.source, siteUrl: result.siteUrl, error: result.error ?? null, feed: result.feed });
  });

  app.post('/api/preluxes/config', requirePermission('MANAGE_ADMIN'), (req, res) => {
    try {
      const siteUrl = saveSiteUrl(String(req.body?.siteUrl ?? ''));
      res.json({ ok: true, siteUrl });
    } catch (err) {
      res.status(400).json({ ok: false, error: err instanceof Error ? err.message : 'URL tidak valid.' });
    }
  });
}
