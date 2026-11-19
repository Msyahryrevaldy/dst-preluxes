import React, { useEffect, useState } from 'react';
import { CalendarDays, Sparkles, Download, FileText, Clapperboard } from 'lucide-react';
import type {
  SocialContent,
  SocialContentStatus,
  SocialPlatform,
  StudioStoreState,
  UserAccount,
} from '../types/studio';
import {
  exportSocialPlanToCsv,
  exportSocialPlanToMarkdown,
  getApprovedGuidelineVersion,
  hasRolePermission,
  isolateByClient,
} from '../utils/brandLogic';
import { apiRequest } from '../services/apiClient';
import { PRELUXES_CLIENT_ID, getAllowedPlatforms } from '../data/preluxesSeed';

interface SocialMediaStudioViewProps {
  state: StudioStoreState;
  activeUser: UserAccount;
  onAddSocialContents: (
    campaignName: string,
    horizonDays: 7 | 14 | 30,
    platforms: SocialPlatform[],
    contentPillars: string[],
    strategySummary: string,
    items: SocialContent[]
  ) => void;
  onUpdateSocialStatus: (id: string, status: SocialContentStatus) => void;
  onUpdateSocialCaption: (id: string, caption: string, hook?: string) => void;
  onConvertToBrief: (item: SocialContent) => void;
  onCreateStudioBoard: (item: SocialContent) => void;
}

export const SocialMediaStudioView: React.FC<SocialMediaStudioViewProps> = ({
  state,
  activeUser,
  onAddSocialContents,
  onUpdateSocialStatus,
  onUpdateSocialCaption,
  onConvertToBrief,
  onCreateStudioBoard,
}) => {
  const activeWorkspace = state.workspaces.find((w) => w.clientId === state.activeClientId);
  const approvedGuideline = activeWorkspace
    ? getApprovedGuidelineVersion(state.guidelines[activeWorkspace.id])
    : null;
  const clientSocials = isolateByClient(state.socialContents, state.activeClientId);

  const canGenerate = hasRolePermission(
    activeUser.role,
    'GENERATE_SOCIAL',
    state.activeClientId,
    activeUser.assignedClientIds
  );

  const [campaignName, setCampaignName] = useState('Kampanye Edukasi & Brand Authority');
  const [horizonDays, setHorizonDays] = useState<7 | 14 | 30>(7);
  const PLATFORMS = getAllowedPlatforms(state.activeClientId);
  const [selectedPlatforms, setSelectedPlatforms] = useState<SocialPlatform[]>(
    state.activeClientId === PRELUXES_CLIENT_ID ? PLATFORMS : ['Instagram', 'TikTok']
  );
  const [filterPlatformReset, setFilterPlatformReset] = useState(state.activeClientId);
  useEffect(() => {
    if (filterPlatformReset === state.activeClientId) return;
    setFilterPlatformReset(state.activeClientId);
    setSelectedPlatforms(state.activeClientId === PRELUXES_CLIENT_ID ? PLATFORMS : ['Instagram', 'TikTok']);
    setFilterPlatform('ALL');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.activeClientId]);
  const [topicFocus, setTopicFocus] = useState('Cerita produk, edukasi audiens, dan bukti sosial');
  const [filterPlatform, setFilterPlatform] = useState<string>('ALL');
  const [loading, setLoading] = useState(false);
  const [refiningId, setRefiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [strategySummary, setStrategySummary] = useState<string | null>(null);

  const filteredItems = clientSocials.filter((item) =>
    filterPlatform === 'ALL' ? true : item.platform === filterPlatform
  );

  const togglePlatform = (p: SocialPlatform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? (prev.length > 1 ? prev.filter((x) => x !== p) : prev) : [...prev, p]
    );
  };

  const handleGeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !canGenerate) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{
        ok: boolean;
        strategySummary: string;
        contentPillars: string[];
        items: SocialContent[];
      }>('/api/brand/content/generate', activeUser, {
        body: {
          clientId: activeWorkspace.clientId,
          brandId: activeWorkspace.id,
          brandName: activeWorkspace.brandName,
          campaignName,
          horizonDays,
          platforms: selectedPlatforms,
          topicFocus,
          approvedGuideline,
          language: state.language,
        },
      });
      setStrategySummary(res.strategySummary);
      onAddSocialContents(
        campaignName,
        horizonDays,
        selectedPlatforms,
        res.contentPillars,
        res.strategySummary,
        res.items
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal membuat rencana konten sosial.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefineCaption = async (item: SocialContent) => {
    setRefiningId(item.id);
    setError(null);
    try {
      const res = await apiRequest<{
        ok: boolean;
        refinedCaption: string;
        hookAlternatives?: string[];
      }>('/api/agent/refine-caption', activeUser, {
        body: {
          caption: item.caption,
          platform: item.platform,
          toneOfVoice: approvedGuideline?.sections.toneOfVoice,
          brandName: activeWorkspace?.brandName,
        },
      });
      onUpdateSocialCaption(item.id, res.refinedCaption, res.hookAlternatives?.[0]);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal memoles caption dengan Gemini.');
    } finally {
      setRefiningId(null);
    }
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">
            Social Media Studio · {activeWorkspace?.brandName}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Perencanaan konten 7/14/30 hari untuk {PLATFORMS.join(', ')} yang terikat pada Brand Guideline.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={filteredItems.length === 0}
            onClick={() =>
              downloadFile(
                exportSocialPlanToCsv(filteredItems),
                `social-plan-${state.activeClientId}.csv`,
                'text/csv'
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3F2] bg-white px-3 py-2 text-xs font-semibold text-[#0F1B3D] hover:bg-[#F4F6FC] disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Ekspor CSV
          </button>
          <button
            type="button"
            disabled={filteredItems.length === 0}
            onClick={() =>
              downloadFile(
                exportSocialPlanToMarkdown(filteredItems, activeWorkspace?.brandName || state.activeClientId),
                `social-plan-${state.activeClientId}.md`,
                'text/markdown'
              )
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3F2] bg-white px-3 py-2 text-xs font-semibold text-[#0F1B3D] hover:bg-[#F4F6FC] disabled:opacity-40"
          >
            <Download className="h-3.5 w-3.5" />
            Ekspor Markdown
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Planner Form */}
        <form
          onSubmit={handleGeneratePlan}
          className="lg:col-span-4 rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-[#0F1B3D]">
            <CalendarDays className="h-4 w-4 text-[#05349B]" />
            Generator Kalender & Naskah Sosial
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">Nama Kampanye</label>
            <input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
              required
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-[#0F1B3D] mb-1">Durasi Perencanaan</div>
            <div className="grid grid-cols-3 gap-2">
              {([7, 14, 30] as const).map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setHorizonDays(days)}
                  className={`rounded-lg border py-2 text-xs font-bold ${
                    horizonDays === days
                      ? 'bg-[#05349B] text-white border-[#05349B]'
                      : 'bg-white text-[#0F1B3D] border-[#DDE3F2]'
                  }`}
                >
                  {days} Hari
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-[#0F1B3D] mb-1">Platform Target</div>
            <div className="grid grid-cols-2 gap-2">
              {PLATFORMS.map((p) => {
                const active = selectedPlatforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`rounded-lg border py-2 text-xs font-semibold ${
                      active
                        ? 'border-[#05349B] bg-[#05349B]/10 text-[#05349B]'
                        : 'border-[#DDE3F2] text-slate-600'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">Fokus Topik & Pilar Konten</label>
            <textarea
              rows={3}
              value={topicFocus}
              onChange={(e) => setTopicFocus(e.target.value)}
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
              required
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!canGenerate || loading}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#05349B] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#042878] disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {loading ? 'Menyusun Kalender Konten...' : `Hasilkan Rencana ${horizonDays} Hari`}
          </button>

          {strategySummary && (
            <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3 text-xs text-slate-700">
              <strong className="text-[#05349B]">Strategi:</strong> {strategySummary}
            </div>
          )}
        </form>

        {/* Calendar Items & Editorial Review */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold text-[#0F1B3D]">
              Daftar Konten Terjadwal ({filteredItems.length})
            </h2>
            <div className="flex items-center gap-1 rounded-lg border border-[#DDE3F2] bg-white p-0.5">
              {(['ALL', ...PLATFORMS] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilterPlatform(p)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap ${
                    filterPlatform === p ? 'bg-[#05349B] text-white' : 'text-slate-600'
                  }`}
                >
                  {p === 'ALL' ? 'Semua' : p}
                </button>
              ))}
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#DDE3F2] bg-white p-10 text-center text-sm text-slate-500">
              Belum ada konten sosial untuk klien ini. Jalankan generator rencana konten di sebelah kiri.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.map((item) => (
                <article key={item.id} className="rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#DDE3F2] pb-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-bold text-[#05349B]">{item.scheduledDate}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-bold text-[#0F1B3D]">{item.platform}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.format}</span>
                      <span aria-hidden="true">·</span>
                      <span>Pilar: {item.contentPillar}</span>
                    </div>

                    <select
                      aria-label={`Status editorial ${item.headline}`}
                      value={item.status}
                      onChange={(e) => onUpdateSocialStatus(item.id, e.target.value as SocialContentStatus)}
                      className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] px-2.5 py-1 text-xs font-bold text-[#0F1B3D]"
                    >
                      <option value="DRAFT">DRAFT</option>
                      <option value="REVIEW">REVIEW</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="SCHEDULED">SCHEDULED</option>
                      <option value="PUBLISHED">PUBLISHED</option>
                    </select>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-[#0F1B3D]">{item.headline}</h3>
                    <div className="mt-1 text-xs font-semibold text-[#05349B]">
                      Hook: &ldquo;{item.hook}&rdquo;
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-line">{item.caption}</p>

                  <div className="text-xs text-slate-500">
                    <strong className="text-[#0F1B3D]">CTA:</strong> {item.cta} ·{' '}
                    <span className="font-mono">{item.hashtags.join(' ')}</span>
                  </div>

                  {item.carouselSlides.length > 0 && (
                    <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3 text-xs space-y-1">
                      <div className="font-bold text-[#0F1B3D]">Struktur Slide Carousel</div>
                      {item.carouselSlides.map((slide, idx) => (
                        <div key={idx} className="text-slate-700">
                          {idx + 1}. {slide}
                        </div>
                      ))}
                    </div>
                  )}

                  {item.videoScript && (
                    <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3 text-xs space-y-1.5">
                      <div className="font-bold text-[#0F1B3D]">Naskah Video & Scene Breakdown</div>
                      <p className="text-slate-700">{item.videoScript}</p>
                      {item.sceneBreakdown.length > 0 && (
                        <ul className="list-disc pl-4 text-slate-600">
                          {item.sceneBreakdown.map((sc, i) => (
                            <li key={i}>{sc}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#DDE3F2]">
                    <div className="text-[11px] font-mono text-slate-500 truncate max-w-md">
                      Prompt: {item.visualPrompt}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleRefineCaption(item)}
                        disabled={refiningId === item.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] px-3 py-1.5 text-xs font-semibold text-[#0F1B3D] hover:border-[#05349B] disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[#05349B]" />
                        {refiningId === item.id ? 'Memoles...' : 'Poles Caption (Gemini)'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onConvertToBrief(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3F2] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F1B3D] hover:border-[#05349B]"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        Konversi ke Brief
                      </button>
                      <button
                        type="button"
                        onClick={() => onCreateStudioBoard(item)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#05349B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#042878]"
                      >
                        <Clapperboard className="h-3.5 w-3.5" />
                        Buat Studio Board
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
