import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  Globe,
  Monitor,
  RefreshCw,
  Smartphone,
  TriangleAlert,
} from 'lucide-react';
import type { ActiveRoute, SocialPlatform, StudioStoreState, UserAccount } from '../types/studio';
import { apiRequest } from '../services/apiClient';
import { hasRolePermission } from '../utils/brandLogic';
import {
  PRELUXES_CLIENT_ID,
  PRELUXES_PLATFORMS,
  PRELUXES_SITE_PAGES,
} from '../data/preluxesSeed';
import {
  buildPreluxesSchedule,
  checkSiteReadiness,
  type PreluxesFeed,
  type ScheduleResult,
} from '../utils/preluxesSchedule';

interface WebsiteHubViewProps {
  state: StudioStoreState;
  activeUser: UserAccount;
  onSwitchClient: (clientId: string) => void;
  onNavigate: (route: ActiveRoute) => void;
  onAddSchedule: (result: ScheduleResult) => void;
}

interface CatalogResponse {
  ok: boolean;
  source: 'live' | 'bundled';
  siteUrl: string;
  error: string | null;
  feed: PreluxesFeed;
}

function todayWib(): string {
  return new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
}

export const WebsiteHubView: React.FC<WebsiteHubViewProps> = ({
  state,
  activeUser,
  onSwitchClient,
  onNavigate,
  onAddSchedule,
}) => {
  const isPreluxes = state.activeClientId === PRELUXES_CLIENT_ID;
  const canSchedule = hasRolePermission(
    activeUser.role,
    'GENERATE_SOCIAL',
    PRELUXES_CLIENT_ID,
    activeUser.assignedClientIds
  );
  const canConfigure = hasRolePermission(activeUser.role, 'MANAGE_ADMIN');

  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [pagePath, setPagePath] = useState('/');
  const [urlDraft, setUrlDraft] = useState('');
  const [urlMessage, setUrlMessage] = useState<string | null>(null);

  const [startDate, setStartDate] = useState(todayWib());
  const [horizonDays, setHorizonDays] = useState<7 | 14 | 30>(14);
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([...PRELUXES_PLATFORMS]);
  const [includeDemo, setIncludeDemo] = useState(true);
  const [scheduleMessage, setScheduleMessage] = useState<string | null>(null);

  const load = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await apiRequest<CatalogResponse>(
          `/api/preluxes/catalog${refresh ? '?refresh=1' : ''}`,
          activeUser,
          { method: 'GET' }
        );
        setCatalog(res);
        setUrlDraft((prev) => prev || res.siteUrl);
      } catch (err: unknown) {
        setCatalog(null);
        setLoadError(err instanceof Error ? err.message : 'Gagal memuat katalog Preluxes.');
      } finally {
        setLoading(false);
      }
    },
    [activeUser]
  );

  useEffect(() => {
    if (isPreluxes) void load();
  }, [isPreluxes, load]);

  const source = catalog?.source ?? 'none';
  const feed = catalog?.feed ?? null;
  const siteUrl = catalog?.siteUrl ?? '';
  const readiness = useMemo(() => checkSiteReadiness(feed, source), [feed, source]);
  const demoOnly = !!feed && feed.items.length > 0 && feed.items.every((i) => i.isDemo);

  const togglePlatform = (p: SocialPlatform) =>
    setPlatforms((prev) => (prev.includes(p) ? (prev.length > 1 ? prev.filter((x) => x !== p) : prev) : [...prev, p]));

  const handleSaveUrl = async () => {
    setUrlMessage(null);
    try {
      const res = await apiRequest<{ ok: boolean; siteUrl: string }>('/api/preluxes/config', activeUser, {
        body: { siteUrl: urlDraft },
      });
      setUrlDraft(res.siteUrl);
      setUrlMessage('URL website disimpan.');
      await load(true);
    } catch (err: unknown) {
      setUrlMessage(err instanceof Error ? err.message : 'Gagal menyimpan URL.');
    }
  };

  const handleSchedule = () => {
    if (!feed) return;
    const result = buildPreluxesSchedule(feed, { startDate, horizonDays, platforms, includeDemo });
    const existing = new Set(state.socialContents.map((s) => s.id));
    const fresh = result.items.filter((i) => !existing.has(i.id));
    if (fresh.length === 0) {
      setScheduleMessage(
        result.items.length === 0
          ? 'Tidak ada produk yang memenuhi syarat untuk dijadwalkan.'
          : 'Semua konten pada rentang ini sudah ada di kalender. Tidak ada yang ditambahkan.'
      );
      return;
    }
    onAddSchedule({ ...result, items: fresh });
    setScheduleMessage(
      `${fresh.length} konten DRAFT ditambahkan (${platforms.join(', ')})${
        result.items.length > fresh.length ? `, ${result.items.length - fresh.length} sudah ada dan dilewati` : ''
      }.`
    );
  };

  if (!isPreluxes) {
    return (
      <div className="rounded-xl border border-dashed border-[#DDE3F2] bg-white p-10 text-center space-y-3">
        <Globe className="mx-auto h-8 w-8 text-[#05349B]" />
        <h1 className="text-lg font-bold text-[#0F1B3D]">Modul Website terhubung ke Preluxes</h1>
        <p className="text-sm text-slate-600">Pilih klien Preluxes untuk melihat tampilan website, katalog, dan jadwal kontennya.</p>
        <button
          type="button"
          onClick={() => onSwitchClient(PRELUXES_CLIENT_ID)}
          className="rounded-lg bg-[#05349B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#042878]"
        >
          Beralih ke Preluxes
        </button>
      </div>
    );
  }

  const previewUrl = siteUrl ? `${siteUrl}${pagePath}` : '';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">Website · Preluxes</h1>
          <p className="text-sm text-slate-600 mt-1">
            Pratinjau storefront, katalog live, dan jadwal konten Instagram · Facebook · TikTok dari satu tempat.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              source === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
            }`}
          >
            {source === 'live' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
            {source === 'live' ? 'Website live' : source === 'bundled' ? 'Offline · katalog bawaan' : 'Tidak terhubung'}
          </span>
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3F2] bg-white px-3 py-2 text-xs font-semibold text-[#0F1B3D] hover:bg-[#F4F6FC] disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Muat ulang
          </button>
          {siteUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#05349B] px-3 py-2 text-xs font-semibold text-white hover:bg-[#042878]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Buka website
            </a>
          )}
        </div>
      </div>

      {loadError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{loadError}</div>
      )}
      {catalog?.error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          {catalog.error}{' '}
          <span className="font-mono">
            Jalankan <strong>npm run dev:all</strong> agar website Preluxes aktif di {siteUrl}.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Preview */}
        <section className="xl:col-span-8 rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {PRELUXES_SITE_PAGES.map((p) => (
                <button
                  key={p.path}
                  type="button"
                  title={p.note}
                  onClick={() => setPagePath(p.path)}
                  className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                    pagePath === p.path
                      ? 'border-[#05349B] bg-[#05349B]/10 text-[#05349B]'
                      : 'border-[#DDE3F2] text-slate-600 hover:border-[#05349B]'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-[#DDE3F2] p-0.5">
              <button
                type="button"
                aria-label="Tampilan desktop"
                onClick={() => setDevice('desktop')}
                className={`rounded-md p-1.5 ${device === 'desktop' ? 'bg-[#05349B] text-white' : 'text-slate-500'}`}
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Tampilan mobile"
                onClick={() => setDevice('mobile')}
                className={`rounded-md p-1.5 ${device === 'mobile' ? 'bg-[#05349B] text-white' : 'text-slate-500'}`}
              >
                <Smartphone className="h-4 w-4" />
              </button>
            </div>
          </div>

          {source === 'live' ? (
            <div className="rounded-lg bg-[#F4F6FC] p-3 flex justify-center overflow-auto">
              <iframe
                key={`${previewUrl}-${device}`}
                title="Pratinjau website Preluxes"
                src={previewUrl}
                className="rounded-lg border border-[#DDE3F2] bg-white"
                style={{ width: device === 'mobile' ? 390 : '100%', height: device === 'mobile' ? 720 : 640 }}
              />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[#DDE3F2] bg-[#F4F6FC] p-8 text-center text-sm text-slate-600 space-y-2">
              <Globe className="mx-auto h-7 w-7 text-slate-400" />
              <p className="font-semibold text-[#0F1B3D]">Pratinjau live belum tersedia</p>
              <p>
                Jalankan website dengan <code className="font-mono">npm run dev:all</code> (atau isi URL website yang sudah
                di-deploy di bawah), lalu tekan Muat ulang.
              </p>
            </div>
          )}

          <div className="flex flex-wrap items-end gap-2 border-t border-[#DDE3F2] pt-4">
            <div className="flex-1 min-w-[16rem]">
              <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">URL website Preluxes</label>
              <input
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                disabled={!canConfigure}
                placeholder="https://preluxes.example.com"
                className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs font-mono disabled:bg-slate-50"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSaveUrl()}
              disabled={!canConfigure || !urlDraft.trim()}
              className="rounded-lg border border-[#DDE3F2] bg-white px-3 py-2 text-xs font-semibold text-[#0F1B3D] hover:bg-[#F4F6FC] disabled:opacity-40"
            >
              Simpan URL
            </button>
            {!canConfigure && <span className="text-[11px] text-slate-500">Hanya Admin yang dapat mengubah URL.</span>}
            {urlMessage && <span className="text-[11px] text-slate-600">{urlMessage}</span>}
          </div>
        </section>

        {/* Readiness + develop */}
        <aside className="xl:col-span-4 space-y-6">
          <section className="rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#0F1B3D]">Kesiapan tayang</h2>
            <ul className="space-y-2">
              {readiness.map((c) => (
                <li key={c.id} className="flex gap-2 text-xs">
                  {c.ok ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <TriangleAlert className="h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <div>
                    <div className="font-semibold text-[#0F1B3D]">{c.label}</div>
                    <div className="text-slate-600">{c.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-2">
            <h2 className="text-sm font-bold text-[#0F1B3D]">Develop website</h2>
            <p className="text-xs text-slate-600">
              Source website ada di <code className="font-mono">sites/preluxes</code>. Edit di sana; perubahan langsung terlihat di pratinjau.
            </p>
            <pre className="rounded-lg bg-[#0F1B3D] p-3 text-[11px] leading-relaxed text-slate-100 overflow-auto">{`npm install
npm run install:site
npm run dev:all
# Studio DST  → http://localhost:3000
# Preluxes    → http://localhost:3001`}</pre>
          </section>
        </aside>
      </div>

      {/* Catalog */}
      <section className="rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0F1B3D]">Katalog ({feed?.items.length ?? 0} produk)</h2>
          {demoOnly && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-700">Semua item masih demo</span>
          )}
        </div>
        {feed && feed.items.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-slate-500 border-b border-[#DDE3F2]">
                  <th className="py-2 pr-3">Produk</th>
                  <th className="py-2 pr-3">SKU</th>
                  <th className="py-2 pr-3">Grade</th>
                  <th className="py-2 pr-3">Harga</th>
                  <th className="py-2 pr-3">Stok</th>
                  <th className="py-2">Link</th>
                </tr>
              </thead>
              <tbody>
                {feed.items.map((it) => (
                  <tr key={it.id} className="border-b border-[#F0F3FA]">
                    <td className="py-2 pr-3 font-semibold text-[#0F1B3D]">
                      {it.name}
                      {it.isDemo && <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">DEMO</span>}
                    </td>
                    <td className="py-2 pr-3 font-mono">{it.sku}</td>
                    <td className="py-2 pr-3 font-mono">{it.conditionGrade}</td>
                    <td className="py-2 pr-3 font-mono">{it.sellingPriceFormatted ?? it.sellingPrice}</td>
                    <td className="py-2 pr-3 font-mono">{it.availableQuantity}</td>
                    <td className="py-2">
                      <a href={it.productUrl} target="_blank" rel="noreferrer" className="text-[#05349B] hover:underline">
                        Buka
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500">Belum ada produk terbaca dari katalog.</p>
        )}
      </section>

      {/* Scheduler */}
      <section className="rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#0F1B3D]">
          <CalendarDays className="h-4 w-4 text-[#05349B]" />
          Jadwalkan konten dari katalog · Instagram, Facebook, TikTok
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">Mulai tanggal</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
            />
          </div>
          <div>
            <div className="text-xs font-semibold text-[#0F1B3D] mb-1">Durasi</div>
            <div className="grid grid-cols-3 gap-2">
              {([7, 14, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setHorizonDays(d)}
                  className={`rounded-lg border py-2 text-xs font-bold ${
                    horizonDays === d ? 'bg-[#05349B] text-white border-[#05349B]' : 'bg-white text-[#0F1B3D] border-[#DDE3F2]'
                  }`}
                >
                  {d} hari
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold text-[#0F1B3D] mb-1">Platform</div>
            <div className="grid grid-cols-3 gap-2">
              {PRELUXES_PLATFORMS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`rounded-lg border py-2 text-xs font-semibold ${
                    platforms.includes(p)
                      ? 'border-[#05349B] bg-[#05349B]/10 text-[#05349B]'
                      : 'border-[#DDE3F2] text-slate-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-700 md:mt-6">
            <input type="checkbox" checked={includeDemo} onChange={(e) => setIncludeDemo(e.target.checked)} />
            Sertakan item demo (untuk uji coba)
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSchedule}
            disabled={!canSchedule || !feed || platforms.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-[#05349B] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#042878] disabled:opacity-50"
          >
            <CalendarDays className="h-4 w-4" />
            Buat jadwal (status DRAFT)
          </button>
          <button
            type="button"
            onClick={() => onNavigate('social-studio')}
            className="rounded-lg border border-[#DDE3F2] bg-white px-4 py-2.5 text-xs font-semibold text-[#0F1B3D] hover:bg-[#F4F6FC]"
          >
            Buka Social Media Studio
          </button>
          {scheduleMessage && <span className="text-xs text-slate-600">{scheduleMessage}</span>}
        </div>
        <p className="text-[11px] text-slate-500">
          Hari tayang Selasa, Kamis, Sabtu. Semua konten dibuat sebagai DRAFT dan baru tayang setelah di-review di Social Media Studio.
        </p>
      </section>
    </div>
  );
};
