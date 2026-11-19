import React, { useMemo, useState } from 'react';
import { FolderOpen, RefreshCw, Sparkles, ArrowUpRight } from 'lucide-react';
import type { ActiveRoute, StudioStoreState, UserAccount } from '../types/studio';
import { TRANSLATIONS } from '../i18n/translations';
import { getApprovedGuidelineVersion } from '../utils/brandLogic';
import { listDriveFolderFiles, type DriveFileSummary } from '../services/driveAuth';
import { apiRequest } from '../services/apiClient';

interface WorkshopViewProps {
  state: StudioStoreState;
  activeUser: UserAccount;
  driveConnected: boolean;
  onNavigate: (route: ActiveRoute) => void;
  onGoogleSignIn: () => void;
}

export const WorkshopView: React.FC<WorkshopViewProps> = ({
  state,
  activeUser,
  driveConnected,
  onNavigate,
  onGoogleSignIn,
}) => {
  const t = TRANSLATIONS[state.language];
  const [filterClientId, setFilterClientId] = useState<string>('ALL');
  const [filterCampaign, setFilterCampaign] = useState<string>('ALL');
  const [filterPeriod, setFilterPeriod] = useState<'ALL' | '7D' | '30D'>('30D');

  const [driveFiles, setDriveFiles] = useState<DriveFileSummary[]>([]);
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [autopostPlan, setAutopostPlan] = useState<{
    summary: string;
    recommendations: Array<{
      fileName: string;
      matchedClient: string;
      targetSubfolder: string;
      readyStatus: string;
    }>;
  } | null>(null);
  const [classifiedAssets, setClassifiedAssets] = useState<
    Array<{ name: string; category: string; confidence: number }>
  >([]);

  const visibleClients = useMemo(() => {
    if (activeUser.role === 'ADMIN' || activeUser.assignedClientIds.length === 0) {
      return state.clients;
    }
    return state.clients.filter((c) => activeUser.assignedClientIds.includes(c.id));
  }, [state.clients, activeUser]);

  const clientIdsFilter = useMemo(() => {
    if (filterClientId !== 'ALL') return new Set([filterClientId]);
    return new Set(visibleClients.map((c) => c.id));
  }, [filterClientId, visibleClients]);

  const metrics = useMemo(() => {
    const activeBrands = state.workspaces.filter((w) => clientIdsFilter.has(w.clientId));
    const uploadedDocs = state.assets.filter((a) => clientIdsFilter.has(a.clientId));
    const approvedGuides = activeBrands.filter(
      (b) => getApprovedGuidelineVersion(state.guidelines[b.id]) !== null
    );
    const campaigns = state.creativeDirections.filter((c) => clientIdsFilter.has(c.clientId));
    const socials = state.socialContents.filter((s) => {
      if (!clientIdsFilter.has(s.clientId)) return false;
      if (filterCampaign !== 'ALL' && s.campaignName !== filterCampaign) return false;
      return true;
    });
    const productionTasks =
      state.briefs.filter((b) => clientIdsFilter.has(b.clientId)).length +
      state.studioBoards.filter((sb) => clientIdsFilter.has(sb.clientId)).length;
    const audits = state.visualAudits.filter((a) => clientIdsFilter.has(a.clientId));
    const avgCompliance =
      audits.length > 0
        ? Math.round(audits.reduce((sum, a) => sum + a.overallScore, 0) / audits.length)
        : null;

    const totalTarget = visibleClients
      .filter((c) => clientIdsFilter.has(c.id))
      .reduce((acc, c) => acc + c.monthlyVideoTarget, 0);
    const totalCompleted = visibleClients
      .filter((c) => clientIdsFilter.has(c.id))
      .reduce((acc, c) => acc + c.monthlyVideoCompleted, 0);

    return {
      activeBrands: activeBrands.length,
      uploadedDocs: uploadedDocs.length,
      approvedGuidelines: approvedGuides.length,
      creativeCampaigns: campaigns.length,
      contentGenerated: socials.length,
      productionTasks,
      visualAudits: audits.length,
      avgCompliance,
      totalTarget,
      totalCompleted,
    };
  }, [state, clientIdsFilter, filterCampaign, visibleClients]);

  const uniqueCampaignNames = useMemo(() => {
    const set = new Set<string>();
    state.socialContents.forEach((s) => set.add(s.campaignName));
    state.campaigns.forEach((c) => set.add(c.name));
    return Array.from(set);
  }, [state.socialContents, state.campaigns]);

  const filteredLogs = useMemo(() => {
    const cutoff =
      filterPeriod === '7D'
        ? Date.now() - 7 * 86400000
        : filterPeriod === '30D'
        ? Date.now() - 30 * 86400000
        : 0;
    return state.activityLogs
      .filter((log) => clientIdsFilter.has(log.clientId))
      .filter((log) => (cutoff === 0 ? true : new Date(log.timestamp).getTime() >= cutoff))
      .slice(0, 8);
  }, [state.activityLogs, clientIdsFilter, filterPeriod]);

  const handleLoadReadyToPost = async () => {
    if (!driveConnected) {
      onGoogleSignIn();
      return;
    }
    setDriveLoading(true);
    setDriveError(null);
    try {
      const files = await listDriveFolderFiles(state.systemConfig.readyToPostFolderId);
      setDriveFiles(files);
    } catch (err: unknown) {
      setDriveError(err instanceof Error ? err.message : 'Gagal memuat folder Drive.');
    } finally {
      setDriveLoading(false);
    }
  };

  const handlePlanAutopost = async () => {
    setDriveLoading(true);
    setDriveError(null);
    try {
      const fileList =
        driveFiles.length > 0
          ? driveFiles.map((f) => ({ id: f.id, name: f.name, mimeType: f.mimeType }))
          : state.videos.map((v) => ({ id: v.id, name: v.title, mimeType: 'video/mp4' }));

      const res = await apiRequest<{
        ok: boolean;
        plan: {
          summary: string;
          recommendations: Array<{
            fileName: string;
            matchedClient: string;
            targetSubfolder: string;
            readyStatus: string;
          }>;
        };
      }>('/api/agent/autopost-organize', activeUser, {
        body: {
          folderId: state.systemConfig.readyToPostFolderId,
          files: fileList,
        },
      });
      setAutopostPlan(res.plan);
    } catch (err: unknown) {
      setDriveError(err instanceof Error ? err.message : 'Gagal membuat rencana autopost.');
    } finally {
      setDriveLoading(false);
    }
  };

  const handleClassifyDriveAssets = async () => {
    setDriveLoading(true);
    setDriveError(null);
    try {
      const fileList =
        driveFiles.length > 0
          ? driveFiles.map((f) => ({ name: f.name, mimeType: f.mimeType }))
          : [
              ...state.videos.map((v) => ({ name: `${v.title}.mp4`, mimeType: 'video/mp4' })),
              ...state.assets.map((a) => ({ name: a.name, mimeType: a.mimeType })),
            ];
      const res = await apiRequest<{
        ok: boolean;
        classified: Array<{ name: string; category: string; confidence: number }>;
      }>('/api/agent/classify-drive-assets', activeUser, {
        body: { files: fileList },
      });
      setClassifiedAssets(res.classified || []);
    } catch (err: unknown) {
      setDriveError(err instanceof Error ? err.message : 'Gagal mengklasifikasikan aset Drive.');
    } finally {
      setDriveLoading(false);
    }
  };

  const targetPercent =
    metrics.totalTarget > 0
      ? Math.min(100, Math.round((metrics.totalCompleted / metrics.totalTarget) * 100))
      : 0;

  return (
    <div className="space-y-6">
      {/* Page Title & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1B3D]">{t.workshop.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{t.workshop.subtitle}</p>
        </div>

        <div className="flex flex-wrap xl:flex-nowrap items-center gap-2 shrink-0">
          <select
            aria-label="Filter klien"
            value={filterClientId}
            onChange={(e) => setFilterClientId(e.target.value)}
            className="rounded-lg border border-[#DDE3F2] bg-white px-2.5 py-2 text-xs font-semibold text-[#0F1B3D] max-w-[175px]"
          >
            <option value="ALL">{t.workshop.filterAllClients}</option>
            {visibleClients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            aria-label="Filter kampanye"
            value={filterCampaign}
            onChange={(e) => setFilterCampaign(e.target.value)}
            className="rounded-lg border border-[#DDE3F2] bg-white px-2.5 py-2 text-xs font-semibold text-[#0F1B3D] max-w-[175px]"
          >
            <option value="ALL">Semua Kampanye</option>
            {uniqueCampaignNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>

          <div className="flex items-center rounded-lg border border-[#DDE3F2] bg-white p-0.5 shrink-0">
            {(['7D', '30D', 'ALL'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setFilterPeriod(p)}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap ${
                  filterPeriod === p ? 'bg-[#05349B] text-white' : 'text-slate-600 hover:text-[#0F1B3D]'
                }`}
              >
                {p === 'ALL' ? 'Semua' : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Brand Intelligence 8-Metric Strip */}
      <section aria-labelledby="brand-overview-heading">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="brand-overview-heading" className="text-sm font-bold text-[#0F1B3D]">
            {t.workshop.brandOverviewTitle}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('brand-reports')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#05349B] hover:underline"
          >
            {t.nav.brandReports}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: t.workshop.activeBrands, value: metrics.activeBrands, route: 'brand-workspace' as ActiveRoute },
            { label: t.workshop.uploadedDocs, value: metrics.uploadedDocs, route: 'brand-intelligence' as ActiveRoute },
            { label: t.workshop.approvedGuidelines, value: metrics.approvedGuidelines, route: 'brand-guidelines' as ActiveRoute },
            { label: t.workshop.creativeCampaigns, value: metrics.creativeCampaigns, route: 'creative-direction' as ActiveRoute },
            { label: t.workshop.contentGenerated, value: metrics.contentGenerated, route: 'social-studio' as ActiveRoute },
            { label: t.workshop.productionTasks, value: metrics.productionTasks, route: 'studio' as ActiveRoute },
            { label: t.workshop.visualAudits, value: metrics.visualAudits, route: 'visual-checker' as ActiveRoute },
            {
              label: t.workshop.avgCompliance,
              value: metrics.avgCompliance !== null ? `${metrics.avgCompliance}%` : '—',
              route: 'visual-checker' as ActiveRoute,
            },
          ].map((stat, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onNavigate(stat.route)}
              className="text-left rounded-xl border border-[#DDE3F2] bg-white p-4 hover:border-[#05349B] transition-colors"
            >
              <div className="text-xs font-medium text-slate-500">{stat.label}</div>
              <div className="mt-1.5 text-2xl font-bold text-[#0F1B3D] tabular-nums">{stat.value}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Main Split: Monthly Video Target + Ready To Post Drive Hub */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Monthly Video Production Target */}
        <section className="lg:col-span-7 rounded-xl border border-[#DDE3F2] bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#0F1B3D]">{t.workshop.monthlyTarget}</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {state.language === 'en'
                    ? 'Video delivery progress across active client channels'
                    : 'Progres pengiriman video di seluruh kanal klien aktif'}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-extrabold text-[#05349B] tabular-nums">
                  {metrics.totalCompleted} / {metrics.totalTarget}
                </div>
                <div className="text-xs font-semibold text-slate-500 tabular-nums">{targetPercent}% selesai</div>
              </div>
            </div>

            <div className="mt-4 h-3 w-full rounded-full bg-[#F4F6FC] overflow-hidden border border-[#DDE3F2]">
              <div
                className="h-full bg-[#05349B] transition-all"
                style={{ width: `${targetPercent}%` }}
              />
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#DDE3F2] text-slate-500">
                    <th className="py-2 font-semibold">Klien / Kanal</th>
                    <th className="py-2 font-semibold">Industri</th>
                    <th className="py-2 text-right font-semibold">Selesai / Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DDE3F2]/60">
                  {visibleClients
                    .filter((c) => clientIdsFilter.has(c.id))
                    .map((client) => (
                      <tr key={client.id} className="hover:bg-[#F4F6FC]/60">
                        <td className="py-2.5 font-semibold text-[#0F1B3D]">{client.name}</td>
                        <td className="py-2.5 text-slate-500">{client.industry}</td>
                        <td className="py-2.5 text-right font-mono tabular-nums font-semibold text-[#05349B]">
                          {client.monthlyVideoCompleted}/{client.monthlyVideoTarget}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Ready To Post Hub (Folder ID preserved: 1aEn3k_aXdmohkJN545ygm4HGhLbA-5qY) */}
        <section className="lg:col-span-5 rounded-xl border border-[#DDE3F2] bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#0F1B3D]">{t.workshop.readyToPostHub}</h2>
                <div className="mt-1 font-mono text-xs text-slate-500 break-all">
                  Folder ID: {state.systemConfig.readyToPostFolderId} · Protected Root
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs leading-relaxed text-slate-600">
              Struktur asli folder Ready To Post dipertahankan dan terpisah dari folder Brand Library.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleLoadReadyToPost}
                disabled={driveLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-[#05349B] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#042878] disabled:opacity-50 whitespace-nowrap"
              >
                {driveLoading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <FolderOpen className="h-3.5 w-3.5" />}
                {t.workshop.openReadyToPost}
              </button>
              <button
                type="button"
                onClick={handlePlanAutopost}
                disabled={driveLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] px-3.5 py-2 text-xs font-semibold text-[#0F1B3D] hover:border-[#05349B] disabled:opacity-50 whitespace-nowrap"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#05349B]" />
                {t.workshop.organizeReadyToPost}
              </button>
              <button
                type="button"
                onClick={handleClassifyDriveAssets}
                disabled={driveLoading}
                className="inline-flex items-center gap-2 rounded-lg border border-[#DDE3F2] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F1B3D] hover:border-[#05349B] disabled:opacity-50 whitespace-nowrap"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#05349B]" />
                Klasifikasi Aset AI
              </button>
            </div>

            {driveError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {driveError}
              </div>
            )}

            {driveFiles.length > 0 && (
              <div className="mt-4 border-t border-[#DDE3F2] pt-3">
                <div className="text-xs font-bold text-[#0F1B3D] mb-2">
                  File Drive Ditemukan ({driveFiles.length})
                </div>
                <ul className="max-h-40 overflow-y-auto space-y-1.5 text-xs">
                  {driveFiles.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2 py-1 border-b border-[#DDE3F2]/50">
                      <span className="truncate font-medium text-[#0F1B3D]">{f.name}</span>
                      <span className="font-mono text-[11px] text-slate-400 shrink-0">
                        {f.mimeType.split('/').pop()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {autopostPlan && (
              <div className="mt-4 rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3 text-xs space-y-2">
                <div className="font-bold text-[#05349B]">Rencana Autopost AI</div>
                <p className="text-slate-700">{autopostPlan.summary}</p>
                <ul className="space-y-1">
                  {autopostPlan.recommendations.slice(0, 4).map((rec, i) => (
                    <li key={i} className="text-slate-600">
                      <span className="font-semibold text-[#0F1B3D]">{rec.fileName}</span> → {rec.matchedClient} ({rec.targetSubfolder})
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {classifiedAssets.length > 0 && (
              <div className="mt-4 rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3 text-xs space-y-2">
                <div className="font-bold text-[#05349B]">Klasifikasi Aset Drive (Gemini)</div>
                <ul className="space-y-1">
                  {classifiedAssets.slice(0, 6).map((item, idx) => (
                    <li key={idx} className="flex items-center justify-between gap-2 text-slate-700">
                      <span className="truncate font-medium text-[#0F1B3D]">{item.name}</span>
                      <span className="font-mono text-[11px] font-semibold text-[#05349B] shrink-0">
                        {item.category} ({Math.round(item.confidence * (item.confidence <= 1 ? 100 : 1))}%)
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#DDE3F2] flex items-center justify-between text-xs text-slate-500">
            <span>Google Flow Project</span>
            <span className="font-mono text-[#0F1B3D]">{state.systemConfig.googleFlowProjectId}</span>
          </div>
        </section>
      </div>

      {/* Recent Brand Intelligence Activity Feed */}
      <section className="rounded-xl border border-[#DDE3F2] bg-white p-5">
        <h2 className="text-base font-bold text-[#0F1B3D]">{t.workshop.recentActivity}</h2>
        {filteredLogs.length === 0 ? (
          <p className="mt-3 text-xs text-slate-500">Belum ada aktivitas pada filter periode ini.</p>
        ) : (
          <div className="mt-3 divide-y divide-[#DDE3F2]">
            {filteredLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold text-[#0F1B3D]">{log.actor}</span>
                  <span className="text-slate-400">·</span>
                  <span className="font-mono text-[11px] text-[#05349B]">{log.action}</span>
                  <span className="text-slate-400">·</span>
                  <span className="truncate text-slate-700">{log.target}</span>
                </div>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                  {new Date(log.timestamp).toLocaleString('id-ID')}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
