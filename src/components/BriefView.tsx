import React, { useState } from 'react';
import { Plus, Clapperboard, Sparkles } from 'lucide-react';
import type { BriefItem, StudioStoreState, UserAccount } from '../types/studio';
import { getApprovedGuidelineVersion, isolateByClient } from '../utils/brandLogic';
import { apiRequest } from '../services/apiClient';

interface BriefViewProps {
  state: StudioStoreState;
  activeUser: UserAccount;
  onAddBrief: (brief: BriefItem) => void;
  onSendBriefToStudio: (brief: BriefItem) => void;
}

export const BriefView: React.FC<BriefViewProps> = ({
  state,
  activeUser,
  onAddBrief,
  onSendBriefToStudio,
}) => {
  const [selectedChannelId, setSelectedChannelId] = useState<string>('ALL');
  const [title, setTitle] = useState('');
  const [objective, setObjective] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [channelId, setChannelId] = useState(
    state.channels.find((ch) => ch.clientId === state.activeClientId)?.id ?? state.channels[0]?.id ?? ''
  );
  const [dueDate, setDueDate] = useState('2026-11-30');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const clientBriefs = isolateByClient(state.briefs, state.activeClientId).filter((b) =>
    selectedChannelId === 'ALL' ? true : b.channelId === selectedChannelId
  );

  const activeWorkspace = state.workspaces.find((w) => w.clientId === state.activeClientId);

  const handleCreateBrief = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !objective.trim()) return;
    const ch = state.channels.find((c) => c.id === channelId);
    onAddBrief({
      id: `brf-${Date.now().toString(36)}`,
      clientId: state.activeClientId,
      brandId: activeWorkspace?.id || `ws-${state.activeClientId}`,
      channelId,
      title: title.trim(),
      objective: objective.trim(),
      targetAudience: activeWorkspace?.targetAudience || 'Audiens utama',
      keyMessage: keyMessage.trim() || objective.trim(),
      deliverableFormat: ch?.platform || 'Video / Social Post',
      dueDate,
      status: 'NEW',
    });
    setTitle('');
    setObjective('');
    setKeyMessage('');
  };

  const handleGenerateBriefWithGemini = async () => {
    const ch = state.channels.find((c) => c.id === channelId) ?? state.channels[0];
    if (!ch) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const approvedGuideline = activeWorkspace
        ? getApprovedGuidelineVersion(state.guidelines[activeWorkspace.id])
        : null;
      const res = await apiRequest<{
        ok: boolean;
        brief: { title: string; objective: string; keyMessage: string };
      }>('/api/agent/brief-generate', activeUser, {
        body: {
          brandName: activeWorkspace?.brandName || state.activeClientId,
          channelName: ch.name,
          platform: ch.platform,
          visualStyle: ch.visualStyle,
          topicIdea: title.trim() || undefined,
          approvedGuideline,
        },
      });
      setTitle(res.brief.title);
      setObjective(res.brief.objective);
      setKeyMessage(res.brief.keyMessage);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'Gagal membuat draf brief dengan Gemini.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1B3D]">Brief & 7+ Kanal Konten Aktif</h1>
        <p className="text-sm text-slate-600 mt-1">
          Seluruh preset visual, struktur scene, safe zone, dan character lock setiap kanal tetap terjaga.
        </p>
      </div>

      {/* Preserved 7+ Content Channels Catalog */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#0F1B3D]">
            Kanal Konten Aktif ({state.channels.length} Kanal)
          </h2>
          <button
            type="button"
            onClick={() => setSelectedChannelId('ALL')}
            className="text-xs font-semibold text-[#05349B] hover:underline"
          >
            Tampilkan Semua Brief
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {state.channels.map((ch) => {
            const selected = selectedChannelId === ch.id;
            return (
              <div
                key={ch.id}
                className={`rounded-xl border p-4 bg-white transition-colors ${
                  selected ? 'border-[#05349B] ring-1 ring-[#05349B]' : 'border-[#DDE3F2]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-bold text-[#0F1B3D] leading-snug">{ch.name}</div>
                  <span className="font-mono text-[11px] font-bold text-[#05349B] tabular-nums shrink-0">
                    {ch.producedMonthly}/{ch.targetMonthly}
                  </span>
                </div>
                <div className="mt-1 text-[11px] font-medium text-slate-500">{ch.platform}</div>
                <p className="mt-2 text-xs text-slate-600 line-clamp-2">{ch.visualStyle}</p>
                <div className="mt-2 pt-2 border-t border-[#DDE3F2]/60 text-[11px] text-slate-500 space-y-1">
                  <div className="truncate">
                    <span className="font-semibold text-[#0F1B3D]">Character:</span> {ch.characterLockPreset}
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-[#0F1B3D]">Struktur:</span> {ch.sceneStructure}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedChannelId(selected ? 'ALL' : ch.id)}
                  className="mt-3 w-full rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] py-1.5 text-xs font-semibold text-[#0F1B3D] hover:border-[#05349B]"
                >
                  {selected ? 'Dipilih (Klik Reset)' : 'Filter Brief Kanal Ini'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Create Brief + Brief List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleCreateBrief} className="lg:col-span-4 rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4">
          <h2 className="text-base font-bold text-[#0F1B3D]">Buat Brief Produksi Baru</h2>
          <div>
            <label htmlFor="brief-channel" className="block text-xs font-semibold text-[#0F1B3D] mb-1">
              Pilih Kanal Konten
            </label>
            <select
              id="brief-channel"
              value={channelId}
              onChange={(e) => setChannelId(e.target.value)}
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-sm"
            >
              {state.channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="brief-title" className="block text-xs font-semibold text-[#0F1B3D] mb-1">
              Judul Brief
            </label>
            <input
              id="brief-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Eps 12 Tektonik Lempeng Nusantara"
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="brief-obj" className="block text-xs font-semibold text-[#0F1B3D] mb-1">
              Tujuan Kampanye / Episode
            </label>
            <textarea
              id="brief-obj"
              rows={2}
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label htmlFor="brief-msg" className="block text-xs font-semibold text-[#0F1B3D] mb-1">
              Pesan Utama
            </label>
            <input
              id="brief-msg"
              value={keyMessage}
              onChange={(e) => setKeyMessage(e.target.value)}
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="brief-due" className="block text-xs font-semibold text-[#0F1B3D] mb-1">
              Target Tanggal Tayang
            </label>
            <input
              id="brief-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-sm font-mono"
            />
          </div>
          {aiError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              {aiError}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleGenerateBriefWithGemini}
              disabled={aiLoading}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#05349B] bg-[#F4F6FC] px-3 py-2.5 text-xs font-semibold text-[#05349B] hover:bg-[#05349B]/10 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {aiLoading ? 'Menyusun...' : 'Draf Brief AI'}
            </button>
            <button
              type="submit"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#05349B] px-3 py-2.5 text-xs font-semibold text-white hover:bg-[#042878]"
            >
              <Plus className="h-3.5 w-3.5" />
              Simpan Brief
            </button>
          </div>
        </form>

        <div className="lg:col-span-8 rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0F1B3D]">
              Daftar Brief Klien ({clientBriefs.length})
            </h2>
            <span className="text-xs text-slate-500">Terisolasi untuk klien aktif</span>
          </div>

          {clientBriefs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#DDE3F2] p-8 text-center text-sm text-slate-500">
              Belum ada brief untuk klien / filter kanal ini. Buat brief baru atau konversi dari Creative Direction / Social Media Studio.
            </div>
          ) : (
            <div className="divide-y divide-[#DDE3F2]">
              {clientBriefs.map((brief) => {
                const ch = state.channels.find((c) => c.id === brief.channelId);
                return (
                  <div key={brief.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-[#05349B]">{ch?.name || brief.channelId}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{brief.dueDate}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-bold text-[#0F1B3D]">{brief.status}</span>
                      </div>
                      <div className="text-sm font-bold text-[#0F1B3D]">{brief.title}</div>
                      <p className="text-xs text-slate-600">{brief.keyMessage}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSendBriefToStudio(brief)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-[#05349B] bg-white px-3 py-2 text-xs font-semibold text-[#05349B] hover:bg-[#05349B] hover:text-white whitespace-nowrap shrink-0"
                    >
                      <Clapperboard className="h-3.5 w-3.5" />
                      Buka di Studio Board
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
