import React, { useMemo, useState } from 'react';
import { Lock, Send, Sparkles, Plus, ShieldCheck } from 'lucide-react';
import type { LockConfig, SceneCard, StudioBoard, StudioStoreState, UserAccount } from '../types/studio';
import {
  buildBrandLockedPrompt,
  getApprovedGuidelineVersion,
  isolateByClient,
} from '../utils/brandLogic';
import { apiRequest } from '../services/apiClient';

interface StudioViewProps {
  state: StudioStoreState;
  activeUser: UserAccount;
  onUpdateBoard: (board: StudioBoard) => void;
  onCreateBoard: (board: StudioBoard) => void;
}

export const StudioView: React.FC<StudioViewProps> = ({
  state,
  activeUser,
  onUpdateBoard,
  onCreateBoard,
}) => {
  const clientBoards = isolateByClient(state.studioBoards, state.activeClientId);
  const [selectedBoardId, setSelectedBoardId] = useState<string>(clientBoards[0]?.id ?? '');
  const [flowFeedback, setFlowFeedback] = useState<string | null>(null);
  const [busySceneId, setBusySceneId] = useState<string | null>(null);

  const activeBoard =
    clientBoards.find((b) => b.id === selectedBoardId) ?? clientBoards[0] ?? null;

  const activeWorkspace = state.workspaces.find((w) => w.clientId === state.activeClientId);
  const approvedGuideline = useMemo(() => {
    if (!activeWorkspace) return null;
    return getApprovedGuidelineVersion(state.guidelines[activeWorkspace.id]);
  }, [activeWorkspace, state.guidelines]);

  const channelPreset = activeBoard
    ? state.channels.find((c) => c.id === activeBoard.channelId) ?? null
    : null;

  const handleToggleLock = (key: keyof LockConfig) => {
    if (!activeBoard) return;
    const current = activeBoard.locks[key];
    if (typeof current !== 'boolean') return;
    onUpdateBoard({
      ...activeBoard,
      locks: { ...activeBoard.locks, [key]: !current },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleLockRefChange = (key: 'characterRef' | 'setRef' | 'styleRef' | 'productRef', val: string) => {
    if (!activeBoard) return;
    onUpdateBoard({
      ...activeBoard,
      locks: { ...activeBoard.locks, [key]: val },
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateScene = (sceneId: string, patch: Partial<SceneCard>) => {
    if (!activeBoard) return;
    onUpdateBoard({
      ...activeBoard,
      scenes: activeBoard.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s)),
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddScene = () => {
    if (!activeBoard) return;
    const nextNum = activeBoard.scenes.length + 1;
    onUpdateBoard({
      ...activeBoard,
      scenes: [
        ...activeBoard.scenes,
        {
          id: `scn-${Date.now().toString(36)}`,
          sceneNumber: nextNum,
          title: `Scene ${nextNum}`,
          durationSec: 5,
          visualDescription: 'Adegan produksi sesuai preset kanal.',
          textOverlay: '',
          voiceover: '',
          compiledPrompt: '',
          flowJobStatus: 'IDLE',
        },
      ],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleCreateDefaultBoard = () => {
    const ch = state.channels.find((c) => c.clientId === state.activeClientId) ?? state.channels[0];
    const newBoard: StudioBoard = {
      id: `stb-${Date.now().toString(36)}`,
      clientId: state.activeClientId,
      brandId: activeWorkspace?.id || `ws-${state.activeClientId}`,
      channelId: ch.id,
      title: `Board Produksi · ${activeWorkspace?.brandName || state.activeClientId}`,
      locks: {
        characterLock: true,
        characterRef: ch.characterLockPreset,
        setLock: false,
        setRef: '',
        styleLock: true,
        styleRef: ch.visualStyle,
        productLock: false,
        productRef: '',
        brandLock: Boolean(approvedGuideline),
        logoLock: Boolean(approvedGuideline),
        typographyLock: Boolean(approvedGuideline),
        visualIdentityLock: Boolean(approvedGuideline),
      },
      scenes: [
        {
          id: `scn-${Date.now().toString(36)}`,
          sceneNumber: 1,
          title: 'Opening Hook Scene',
          durationSec: 4,
          visualDescription: `${ch.visualStyle}. Subjek utama sesuai narasi pembuka.`,
          textOverlay: 'Judul Pembuka di Luar Gambar',
          voiceover: 'Narasi pembuka 4 detik.',
          compiledPrompt: '',
          flowJobStatus: 'IDLE',
        },
      ],
      updatedAt: new Date().toISOString(),
    };
    onCreateBoard(newBoard);
    setSelectedBoardId(newBoard.id);
  };

  const handleSendToFlow = async (scene: SceneCard) => {
    if (!activeBoard) return;
    setBusySceneId(scene.id);
    setFlowFeedback(null);
    const compiled = buildBrandLockedPrompt({
      baseVisualPrompt: scene.visualDescription,
      textOverlay: scene.textOverlay,
      locks: activeBoard.locks,
      approvedGuideline,
      channelPreset,
    });

    try {
      const resp = await fetch('/api/flow/dispatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-dst-user-id': activeUser.id,
          'x-dst-user-name': activeUser.name,
          'x-dst-role': activeUser.role,
          'x-dst-client-ids': activeUser.assignedClientIds.join(','),
        },
        body: JSON.stringify({
          sceneTitle: scene.title,
          compiledPrompt: compiled.illustrationPrompt,
          textOverlaySpec: compiled.textOverlaySpec,
          negativeDirectives: compiled.negativeDirectives,
          projectId: state.systemConfig.googleFlowProjectId,
        }),
      });
      const data = await resp.json();
      handleUpdateScene(scene.id, {
        compiledPrompt: compiled.illustrationPrompt,
        flowJobStatus: resp.ok ? 'SUBMITTED' : data.status === 'PROVIDER_UNCONFIGURED' ? 'PROVIDER_UNCONFIGURED' : 'FAILED',
        flowJobMessage: data.message || 'Status diterima dari server Flow.',
      });
      setFlowFeedback(data.message || 'Selesai memproses permintaan Google Flow.');
    } catch (err: unknown) {
      setFlowFeedback(err instanceof Error ? err.message : 'Gagal menghubungi server Flow.');
    } finally {
      setBusySceneId(null);
    }
  };

  const handleRefineSceneViaGemini = async (scene: SceneCard) => {
    setBusySceneId(scene.id);
    setFlowFeedback(null);
    try {
      const res = await apiRequest<{ ok: boolean; refinedCaption: string }>(
        '/api/agent/refine-caption',
        activeUser,
        {
          body: {
            caption: scene.voiceover || scene.visualDescription,
            platform: channelPreset?.platform || 'Instagram Reels',
            toneOfVoice: approvedGuideline?.sections.toneOfVoice,
            brandName: activeWorkspace?.brandName,
          },
        }
      );
      handleUpdateScene(scene.id, { voiceover: res.refinedCaption });
    } catch (err: unknown) {
      setFlowFeedback(err instanceof Error ? err.message : 'Gagal menyempurnakan naskah scene.');
    } finally {
      setBusySceneId(null);
    }
  };

  const handleGenerateSceneViaGemini = async (scene: SceneCard) => {
    setBusySceneId(scene.id);
    setFlowFeedback(null);
    try {
      const res = await apiRequest<{
        ok: boolean;
        scene: { visualDescription: string; textOverlay: string; voiceover: string };
      }>('/api/agent/studio-scene-generate', activeUser, {
        body: {
          brandName: activeWorkspace?.brandName || state.activeClientId,
          sceneNumber: scene.sceneNumber,
          sceneTitle: scene.title,
          channelStyle: channelPreset?.visualStyle,
          characterRef: activeBoard?.locks.characterRef,
          approvedGuideline,
        },
      });
      handleUpdateScene(scene.id, {
        visualDescription: res.scene.visualDescription,
        textOverlay: res.scene.textOverlay,
        voiceover: res.scene.voiceover,
      });
    } catch (err: unknown) {
      setFlowFeedback(err instanceof Error ? err.message : 'Gagal menghasilkan scene dengan Gemini.');
    } finally {
      setBusySceneId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">Studio Produksi & @Lock + Google Flow</h1>
          <p className="text-sm text-slate-600 mt-1">
            Orkestrasi scene dengan Character/Set/Style/Product Lock serta Brand Lock terverifikasi.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {clientBoards.length > 0 && (
            <select
              aria-label="Pilih Studio Board"
              value={activeBoard?.id || ''}
              onChange={(e) => setSelectedBoardId(e.target.value)}
              className="rounded-lg border border-[#DDE3F2] bg-white px-3 py-2 text-xs font-semibold text-[#0F1B3D] min-w-0 flex-1 sm:flex-initial max-w-full"
            >
              {clientBoards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={handleCreateDefaultBoard}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#05349B] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#042878] whitespace-nowrap shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Board Baru
          </button>
        </div>
      </div>

      {!activeBoard ? (
        <div className="rounded-xl border border-dashed border-[#DDE3F2] bg-white p-10 text-center space-y-3">
          <div className="text-sm font-semibold text-[#0F1B3D]">
            Belum ada Studio Board untuk klien ini.
          </div>
          <button
            type="button"
            onClick={handleCreateDefaultBoard}
            className="inline-flex items-center gap-2 rounded-lg bg-[#05349B] px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" />
            Buat Studio Board Pertama
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Preserved @Lock + Brand Lock Controls */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-[#0F1B3D] flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#05349B]" />
                  @Lock Production System
                </h2>
                <span className="font-mono text-[11px] text-slate-500">
                  Flow: {state.systemConfig.googleFlowProjectId.slice(0, 8)}...
                </span>
              </div>

              {/* Brand Lock Status */}
              <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3 text-xs">
                <div className="flex items-center gap-2 font-bold text-[#0F1B3D]">
                  <ShieldCheck className="h-4 w-4 text-[#05349B]" />
                  {approvedGuideline
                    ? `Approved Guideline v${approvedGuideline.versionNumber} Aktif`
                    : 'Belum Ada Guideline APPROVED'}
                </div>
                <p className="mt-1 text-slate-600">
                  {approvedGuideline
                    ? 'Brand Lock akan menyuntikkan palet, logo, dan aturan tipografi terverifikasi secara otomatis.'
                    : 'Brand Lock tidak akan menyuntikkan aturan DRAFT/REVIEW. Setujui pedoman di Brand Guidelines terlebih dahulu.'}
                </p>
              </div>

              {/* Brand Intelligence Locks */}
              <div className="space-y-2">
                <div className="text-[11px] font-bold tracking-wider text-[#05349B]">BRAND INTELLIGENCE LOCKS</div>
                {(
                  [
                    { key: 'brandLock', label: 'Brand Lock (Palette & Visual Rules)' },
                    { key: 'logoLock', label: 'Logo Lock (Clear Space & Placement)' },
                    { key: 'typographyLock', label: 'Typography Lock (Overlay Spec Only)' },
                    { key: 'visualIdentityLock', label: 'Visual Identity Lock (DOs & Composition)' },
                  ] as const
                ).map((item) => {
                  const checked = activeBoard.locks[item.key];
                  return (
                    <label
                      key={item.key}
                      className="flex items-center justify-between gap-2 rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs font-medium cursor-pointer hover:bg-[#F4F6FC]"
                    >
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleLock(item.key)}
                        className="h-4 w-4 accent-[#05349B]"
                      />
                    </label>
                  );
                })}
              </div>

              {/* Preserved Production Locks */}
              <div className="space-y-3 pt-2 border-t border-[#DDE3F2]">
                <div className="text-[11px] font-bold tracking-wider text-slate-500">CORE STUDIO LOCKS</div>
                {(
                  [
                    { boolKey: 'characterLock', refKey: 'characterRef', label: 'Character Lock' },
                    { boolKey: 'setLock', refKey: 'setRef', label: 'Set Lock' },
                    { boolKey: 'styleLock', refKey: 'styleRef', label: 'Style Lock' },
                    { boolKey: 'productLock', refKey: 'productRef', label: 'Product Lock' },
                  ] as const
                ).map((item) => (
                  <div key={item.boolKey} className="space-y-1.5">
                    <label className="flex items-center justify-between text-xs font-semibold text-[#0F1B3D] cursor-pointer">
                      <span>{item.label}</span>
                      <input
                        type="checkbox"
                        checked={activeBoard.locks[item.boolKey]}
                        onChange={() => handleToggleLock(item.boolKey)}
                        className="h-4 w-4 accent-[#05349B]"
                      />
                    </label>
                    {activeBoard.locks[item.boolKey] && (
                      <input
                        type="text"
                        value={activeBoard.locks[item.refKey]}
                        onChange={(e) => handleLockRefChange(item.refKey, e.target.value)}
                        placeholder={`Referensi ${item.label}...`}
                        className="w-full rounded-lg border border-[#DDE3F2] px-2.5 py-1.5 text-xs"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* Right Panel: Scene Cards & Prompt Compilation */}
          <div className="lg:col-span-8 space-y-4">
            {flowFeedback && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 text-xs font-medium text-amber-900">
                {flowFeedback}
              </div>
            )}

            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0F1B3D]">
                {activeBoard.title} ({activeBoard.scenes.length} Scene)
              </h2>
              <button
                type="button"
                onClick={handleAddScene}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3F2] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F1B3D] hover:border-[#05349B]"
              >
                <Plus className="h-3.5 w-3.5" />
                Tambah Scene
              </button>
            </div>

            {activeBoard.scenes.map((scene) => {
              const compiled = buildBrandLockedPrompt({
                baseVisualPrompt: scene.visualDescription,
                textOverlay: scene.textOverlay,
                locks: activeBoard.locks,
                approvedGuideline,
                channelPreset,
              });

              return (
                <div key={scene.id} className="rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#05349B] text-xs font-bold text-white tabular-nums">
                        {scene.sceneNumber}
                      </span>
                      <input
                        aria-label={`Judul Scene ${scene.sceneNumber}`}
                        value={scene.title}
                        onChange={(e) => handleUpdateScene(scene.id, { title: e.target.value })}
                        className="w-full text-sm font-bold text-[#0F1B3D] border-b border-transparent focus:border-[#05349B] outline-none"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleGenerateSceneViaGemini(scene)}
                        disabled={busySceneId === scene.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3F2] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F1B3D] hover:border-[#05349B] disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[#05349B]" />
                        Hasilkan Scene (AI)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRefineSceneViaGemini(scene)}
                        disabled={busySceneId === scene.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] px-3 py-1.5 text-xs font-semibold text-[#0F1B3D] hover:border-[#05349B] disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[#05349B]" />
                        Poles VO (Gemini)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendToFlow(scene)}
                        disabled={busySceneId === scene.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#05349B] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#042878] disabled:opacity-50"
                      >
                        <Send className="h-3.5 w-3.5" />
                        SEND TO GOOGLE FLOW
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Deskripsi Visual AI (Tanpa Teks Overlay)
                      </label>
                      <textarea
                        rows={3}
                        value={scene.visualDescription}
                        onChange={(e) => handleUpdateScene(scene.id, { visualDescription: e.target.value })}
                        className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Lapisan Text Overlay (Terpisah dari Gambar AI)
                        </label>
                        <input
                          value={scene.textOverlay}
                          onChange={(e) => handleUpdateScene(scene.id, { textOverlay: e.target.value })}
                          className="w-full rounded-lg border border-[#DDE3F2] px-3 py-1.5 text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                          Voiceover / Narasi
                        </label>
                        <input
                          value={scene.voiceover}
                          onChange={(e) => handleUpdateScene(scene.id, { voiceover: e.target.value })}
                          className="w-full rounded-lg border border-[#DDE3F2] px-3 py-1.5 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Compiled Brand-Locked Prompt Output */}
                  <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#05349B]">
                        Prompt Ilustrasi Terkompilasi {compiled.injectedGuidelineVersion ? `(Brand Lock v${compiled.injectedGuidelineVersion})` : '(Tanpa Brand Lock)'}
                      </span>
                      {scene.flowJobStatus && scene.flowJobStatus !== 'IDLE' && (
                        <span className="font-mono text-[11px] font-bold text-amber-800">
                          Flow Status: {scene.flowJobStatus}
                        </span>
                      )}
                    </div>
                    <pre className="whitespace-pre-wrap font-mono text-[11px] text-[#0F1B3D] leading-relaxed">
                      {compiled.illustrationPrompt}
                    </pre>
                    <div className="border-t border-[#DDE3F2] pt-2 text-[11px] text-slate-600">
                      <div>
                        <strong className="text-[#0F1B3D]">Overlay Terpisah:</strong> {compiled.textOverlaySpec}
                      </div>
                      <div className="mt-1">
                        <strong className="text-[#0F1B3D]">Negative Directives:</strong> {compiled.negativeDirectives}
                      </div>
                      {scene.flowJobMessage && (
                        <div className="mt-1 text-amber-800">
                          <strong>Provider Info:</strong> {scene.flowJobMessage}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
