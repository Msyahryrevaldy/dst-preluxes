import React, { useState } from 'react';
import { Compass, Sparkles, FileText, Clapperboard, CheckCircle2 } from 'lucide-react';
import type {
  CreativeConcept,
  CreativeDirection,
  StudioStoreState,
  UserAccount,
} from '../types/studio';
import {
  getApprovedGuidelineVersion,
  hasRolePermission,
  isolateByClient,
} from '../utils/brandLogic';
import { apiRequest } from '../services/apiClient';

interface CreativeDirectionViewProps {
  state: StudioStoreState;
  activeUser: UserAccount;
  onAddCreativeDirection: (dir: CreativeDirection) => void;
  onSelectConcept: (directionId: string, idx: number) => void;
  onSendToBrief: (direction: CreativeDirection, concept: CreativeConcept) => void;
  onSendToStudio: (direction: CreativeDirection, concept: CreativeConcept) => void;
}

export const CreativeDirectionView: React.FC<CreativeDirectionViewProps> = ({
  state,
  activeUser,
  onAddCreativeDirection,
  onSelectConcept,
  onSendToBrief,
  onSendToStudio,
}) => {
  const activeWorkspace = state.workspaces.find((w) => w.clientId === state.activeClientId);
  const approvedGuideline = activeWorkspace
    ? getApprovedGuidelineVersion(state.guidelines[activeWorkspace.id])
    : null;
  const clientDirections = isolateByClient(state.creativeDirections, state.activeClientId);

  const canGenerate = hasRolePermission(
    activeUser.role,
    'GENERATE_CREATIVE',
    state.activeClientId,
    activeUser.assignedClientIds
  );

  const [campaignObjective, setCampaignObjective] = useState('Meningkatkan awareness dan konversi kampanye Q4');
  const [targetAudience, setTargetAudience] = useState(activeWorkspace?.targetAudience || '');
  const [product, setProduct] = useState(activeWorkspace?.productsServices || '');
  const [platform, setPlatform] = useState('Instagram & TikTok');
  const [mainMessage, setMainMessage] = useState('');
  const [duration, setDuration] = useState('14 Hari');
  const [emotion, setEmotion] = useState('Optimis, kredibel, menginspirasi');
  const [format, setFormat] = useState('Carousel + Reels 30s');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDirectionId, setSelectedDirectionId] = useState<string>(clientDirections[0]?.id ?? '');

  const activeDirection =
    clientDirections.find((d) => d.id === selectedDirectionId) ?? clientDirections[0] ?? null;

  const handleGenerateConcepts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !canGenerate) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest<{ ok: boolean; concepts: CreativeConcept[] }>(
        '/api/brand/creative/generate',
        activeUser,
        {
          body: {
            clientId: activeWorkspace.clientId,
            brandId: activeWorkspace.id,
            workspace: {
              brandName: activeWorkspace.brandName,
              positioning: activeWorkspace.positioning,
              uvp: activeWorkspace.uvp,
            },
            approvedGuideline,
            campaignObjective,
            targetAudience,
            product,
            platform,
            mainMessage: mainMessage || activeWorkspace.uvp,
            duration,
            emotion,
            format,
            language: state.language,
          },
        }
      );

      const newDir: CreativeDirection = {
        id: `cd-${Date.now().toString(36)}`,
        brandId: activeWorkspace.id,
        clientId: activeWorkspace.clientId,
        guidelineVersionId: approvedGuideline?.id ?? null,
        campaignObjective,
        targetAudience,
        product,
        platform,
        mainMessage: mainMessage || activeWorkspace.uvp,
        duration,
        emotion,
        format,
        concepts: res.concepts,
        selectedConceptIndex: 0,
        status: 'DRAFT',
        createdBy: activeUser.name,
        createdAt: new Date().toISOString(),
      };
      onAddCreativeDirection(newDir);
      setSelectedDirectionId(newDir.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menghasilkan konsep kreatif.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">
            Creative Direction Engine · {activeWorkspace?.brandName}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            AI Creative Director menghasilkan 3 konsep strategis yang patuh pada pedoman resmi tanpa menimpa guideline master.
          </p>
        </div>
        <div className="text-xs font-semibold text-[#05349B]">
          {approvedGuideline
            ? `Terkunci ke Guideline v${approvedGuideline.versionNumber} (APPROVED)`
            : 'Belum ada Guideline APPROVED — menggunakan profil dasar brand'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Inputs Form */}
        <form
          onSubmit={handleGenerateConcepts}
          className="lg:col-span-4 rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-3"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-[#0F1B3D]">
            <Compass className="h-4 w-4 text-[#05349B]" />
            Parameter Kampanye
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">Tujuan Kampanye</label>
            <input
              value={campaignObjective}
              onChange={(e) => setCampaignObjective(e.target.value)}
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">Target Audiens</label>
            <input
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">Produk / Layanan</label>
            <input
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">Platform</label>
              <input
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">Durasi</label>
              <input
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">Pesan Utama</label>
            <textarea
              rows={2}
              value={mainMessage}
              onChange={(e) => setMainMessage(e.target.value)}
              placeholder="Pesan inti yang harus diingat audiens..."
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">Emosi Target</label>
              <input
                value={emotion}
                onChange={(e) => setEmotion(e.target.value)}
                className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">Format</label>
              <input
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
              />
            </div>
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
            {loading ? 'Merancang 3 Konsep...' : 'Hasilkan 3 Konsep Kreatif'}
          </button>

          {clientDirections.length > 0 && (
            <div className="pt-3 border-t border-[#DDE3F2] space-y-1.5">
              <div className="text-xs font-bold text-[#0F1B3D]">Riwayat Arahan Kreatif</div>
              {clientDirections.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setSelectedDirectionId(d.id)}
                  className={`w-full text-left rounded-lg border px-3 py-2 text-xs ${
                    activeDirection?.id === d.id
                      ? 'border-[#05349B] bg-[#05349B]/5 font-bold'
                      : 'border-[#DDE3F2]'
                  }`}
                >
                  <div className="truncate">{d.campaignObjective}</div>
                  <div className="text-[11px] text-slate-500">{d.concepts.length} konsep · {d.status}</div>
                </button>
              ))}
            </div>
          )}
        </form>

        {/* 3 Distinct Concepts Display */}
        <div className="lg:col-span-8 space-y-4">
          {!activeDirection ? (
            <div className="rounded-xl border border-dashed border-[#DDE3F2] bg-white p-10 text-center text-sm text-slate-500">
              Isi parameter kampanye di sebelah kiri untuk menghasilkan 3 konsep Creative Direction.
            </div>
          ) : (
            <>
              {/* Concept Tabs */}
              <div className="flex flex-wrap gap-2">
                {activeDirection.concepts.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => onSelectConcept(activeDirection.id, idx)}
                    className={`rounded-lg border px-4 py-2 text-xs font-bold transition-colors ${
                      activeDirection.selectedConceptIndex === idx
                        ? 'bg-[#05349B] text-white border-[#05349B]'
                        : 'bg-white text-[#0F1B3D] border-[#DDE3F2] hover:border-[#05349B]'
                    }`}
                  >
                    Konsep {idx + 1}: {c.conceptTitle}
                  </button>
                ))}
              </div>

              {activeDirection.concepts[activeDirection.selectedConceptIndex] && (() => {
                const concept = activeDirection.concepts[activeDirection.selectedConceptIndex];
                return (
                  <div className="rounded-xl border border-[#DDE3F2] bg-white p-6 space-y-5">
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#DDE3F2] pb-4">
                      <div>
                        <div className="text-xs font-bold text-[#05349B]">{concept.campaignName}</div>
                        <h2 className="text-xl font-bold text-[#0F1B3D] mt-0.5">{concept.conceptTitle}</h2>
                        <p className="mt-1 text-sm font-semibold text-slate-700">
                          Big Idea: &ldquo;{concept.bigIdea}&rdquo;
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => onSendToBrief(activeDirection, concept)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-[#05349B] bg-white px-3.5 py-2 text-xs font-semibold text-[#05349B] hover:bg-[#F4F6FC]"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Kirim ke Brief
                        </button>
                        <button
                          type="button"
                          onClick={() => onSendToStudio(activeDirection, concept)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#05349B] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#042878]"
                        >
                          <Clapperboard className="h-3.5 w-3.5" />
                          Kirim ke Studio Board
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
                      <div>
                        <div className="font-bold text-[#0F1B3D]">Konsep Kreatif</div>
                        <p className="mt-1 text-slate-600">{concept.creativeConcept}</p>
                      </div>
                      <div>
                        <div className="font-bold text-[#0F1B3D]">Rasional Strategis</div>
                        <p className="mt-1 text-slate-600">{concept.strategicRationale}</p>
                      </div>
                      <div>
                        <div className="font-bold text-[#0F1B3D]">Art & Visual Direction</div>
                        <p className="mt-1 text-slate-600">
                          {concept.artDirection} — {concept.visualDirection}
                        </p>
                      </div>
                      <div>
                        <div className="font-bold text-[#0F1B3D]">Moodboard & Photography</div>
                        <p className="mt-1 text-slate-600">
                          {concept.moodboardBrief}. {concept.photographyDirection}
                        </p>
                      </div>
                      <div>
                        <div className="font-bold text-[#0F1B3D]">Color & Typography Direction</div>
                        <p className="mt-1 text-slate-600">
                          {concept.colorDirection} · {concept.typographyDirection}
                        </p>
                      </div>
                      <div>
                        <div className="font-bold text-[#0F1B3D]">Composition & CTA</div>
                        <p className="mt-1 text-slate-600">
                          {concept.composition} · CTA: <strong>{concept.cta}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-4 space-y-2 text-xs">
                      <div className="font-bold text-[#0F1B3D]">Opsi Headline</div>
                      <ul className="space-y-1 text-slate-700">
                        {concept.headlines.map((h, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <CheckCircle2 className="h-3.5 w-3.5 text-[#05349B] shrink-0" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="font-bold text-[#0F1B3D]">AI Image Generation Prompts (Tanpa Teks Overlay)</div>
                      {concept.aiImagePrompts.map((p, i) => (
                        <div key={i} className="rounded-lg border border-[#DDE3F2] bg-white p-3 font-mono text-[11px] text-[#0F1B3D]">
                          {p}
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg border border-[#DDE3F2] p-4 text-xs">
                      <div className="font-bold text-[#0F1B3D]">Brief Produksi Desainer Lengkap</div>
                      <p className="mt-1 text-slate-700 leading-relaxed">{concept.designerProductionBrief}</p>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
