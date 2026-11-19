import React, { useState } from 'react';
import { CheckCircle2, Clock, Plus, Video as VideoIcon } from 'lucide-react';
import type { StudioStoreState, UserAccount, VideoDeliverable } from '../types/studio';
import { isolateByClient } from '../utils/brandLogic';

interface VideoReviewViewProps {
  state: StudioStoreState;
  activeUser: UserAccount;
  onUpdateVideo: (video: VideoDeliverable) => void;
  onAddVideo: (video: VideoDeliverable) => void;
}

export const VideoReviewView: React.FC<VideoReviewViewProps> = ({
  state,
  activeUser,
  onUpdateVideo,
  onAddVideo,
}) => {
  const clientVideos = isolateByClient(state.videos, state.activeClientId);
  const [selectedVideoId, setSelectedVideoId] = useState<string>(clientVideos[0]?.id ?? '');
  const [timecode, setTimecode] = useState('00:12');
  const [comment, setComment] = useState('');
  const [newVersionLabel, setNewVersionLabel] = useState('');
  const [newVersionNotes, setNewVersionNotes] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');

  const activeVideo = clientVideos.find((v) => v.id === selectedVideoId) ?? clientVideos[0] ?? null;

  const handleAddFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVideo || !comment.trim()) return;
    const parts = timecode.split(':').map((n) => Number(n) || 0);
    const seconds = (parts[0] || 0) * 60 + (parts[1] || 0);

    onUpdateVideo({
      ...activeVideo,
      feedback: [
        ...activeVideo.feedback,
        {
          id: `fb-${Date.now().toString(36)}`,
          timecode,
          seconds,
          author: activeUser.name,
          comment: comment.trim(),
          resolved: false,
          createdAt: new Date().toISOString(),
        },
      ],
    });
    setComment('');
  };

  const handleToggleResolved = (feedbackId: string) => {
    if (!activeVideo) return;
    onUpdateVideo({
      ...activeVideo,
      feedback: activeVideo.feedback.map((f) =>
        f.id === feedbackId ? { ...f, resolved: !f.resolved } : f
      ),
    });
  };

  const handleAddVersion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVideo || !newVersionLabel.trim()) return;
    const verId = `vv-${Date.now().toString(36)}`;
    onUpdateVideo({
      ...activeVideo,
      activeVersionId: verId,
      versions: [
        ...activeVideo.versions,
        {
          id: verId,
          versionLabel: newVersionLabel.trim(),
          url: activeVideo.versions[0]?.url || '/src/assets/images/dst_brand_kit_showcase_1794849279824.jpg',
          uploadedAt: new Date().toISOString(),
          notes: newVersionNotes.trim() || 'Pembaruan revisi video',
          durationLabel: '00:35',
        },
      ],
    });
    setNewVersionLabel('');
    setNewVersionNotes('');
  };

  const handleCreateVideo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVideoTitle.trim()) return;
    const ws = state.workspaces.find((w) => w.clientId === state.activeClientId);
    const ch = state.channels.find((c) => c.clientId === state.activeClientId) ?? state.channels[0];
    const verId = `vv-${Date.now().toString(36)}`;
    const vid: VideoDeliverable = {
      id: `vid-${Date.now().toString(36)}`,
      clientId: state.activeClientId,
      brandId: ws?.id || `ws-${state.activeClientId}`,
      channelId: ch.id,
      title: newVideoTitle.trim(),
      status: 'REVIEW',
      driveReadyToPostFolderId: state.systemConfig.readyToPostFolderId,
      activeVersionId: verId,
      versions: [
        {
          id: verId,
          versionLabel: 'v1.0 First Cut',
          url: '/src/assets/images/edumax_studio_reference_1794849281222.jpg',
          uploadedAt: new Date().toISOString(),
          notes: 'Draft awal untuk review tim',
          durationLabel: '00:40',
        },
      ],
      feedback: [],
    };
    onAddVideo(vid);
    setSelectedVideoId(vid.id);
    setNewVideoTitle('');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">Video Delivery, Versioning & Timestamp Review</h1>
          <p className="text-sm text-slate-600 mt-1">
            Review revisi video per versi dan catatan timecode sebelum dikirim ke folder Ready To Post.
          </p>
        </div>

        <form onSubmit={handleCreateVideo} className="flex items-center gap-2">
          <input
            value={newVideoTitle}
            onChange={(e) => setNewVideoTitle(e.target.value)}
            placeholder="Nama file deliverable baru (.mp4)"
            className="rounded-lg border border-[#DDE3F2] bg-white px-3 py-2 text-xs"
          />
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#05349B] px-3 py-2 text-xs font-semibold text-white whitespace-nowrap"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah Deliverable
          </button>
        </form>
      </div>

      {clientVideos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#DDE3F2] bg-white p-10 text-center text-sm text-slate-500">
          Belum ada deliverable video untuk klien ini. Tambahkan deliverable baru di atas.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Deliverable List */}
          <div className="lg:col-span-4 space-y-3">
            {clientVideos.map((vid) => (
              <button
                key={vid.id}
                type="button"
                onClick={() => setSelectedVideoId(vid.id)}
                className={`w-full text-left rounded-xl border p-4 bg-white transition-colors ${
                  activeVideo?.id === vid.id ? 'border-[#05349B] ring-1 ring-[#05349B]' : 'border-[#DDE3F2]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#05349B]">
                    <VideoIcon className="h-3.5 w-3.5" />
                    {vid.status}
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                    {vid.versions.length} versi
                  </span>
                </div>
                <div className="mt-1.5 text-sm font-bold text-[#0F1B3D] truncate">{vid.title}</div>
                <div className="mt-1 text-xs text-slate-500 tabular-nums">
                  {vid.feedback.filter((f) => !f.resolved).length} catatan terbuka
                </div>
              </button>
            ))}
          </div>

          {/* Active Video Review Workbench */}
          {activeVideo && (
            <div className="lg:col-span-8 space-y-5">
              <div className="rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-[#0F1B3D]">{activeVideo.title}</h2>
                    <div className="font-mono text-xs text-slate-500">
                      Ready To Post Folder: {activeVideo.driveReadyToPostFolderId}
                    </div>
                  </div>
                  <select
                    aria-label="Status deliverable video"
                    value={activeVideo.status}
                    onChange={(e) =>
                      onUpdateVideo({
                        ...activeVideo,
                        status: e.target.value as VideoDeliverable['status'],
                      })
                    }
                    className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] px-3 py-1.5 text-xs font-bold text-[#0F1B3D]"
                  >
                    <option value="REVIEW">REVIEW</option>
                    <option value="REVISION">REVISION</option>
                    <option value="READY_TO_POST">READY_TO_POST</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                  </select>
                </div>

                {/* Preview Frame */}
                <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-[#DDE3F2] bg-[#0F1B3D]">
                  <img
                    src={
                      activeVideo.versions.find((v) => v.id === activeVideo.activeVersionId)?.url ||
                      '/src/assets/images/dst_brand_kit_showcase_1794849279824.jpg'
                    }
                    alt={activeVideo.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover opacity-90"
                  />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg bg-[#0F1B3D]/85 px-3 py-2 text-xs text-white">
                    <span className="font-semibold">
                      {activeVideo.versions.find((v) => v.id === activeVideo.activeVersionId)?.versionLabel}
                    </span>
                    <span className="font-mono tabular-nums">
                      Durasi: {activeVideo.versions.find((v) => v.id === activeVideo.activeVersionId)?.durationLabel}
                    </span>
                  </div>
                </div>

                {/* Version Selector + Add Version */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#DDE3F2]">
                  <div>
                    <h3 className="text-xs font-bold text-[#0F1B3D] mb-2">Riwayat Versi</h3>
                    <div className="space-y-2">
                      {activeVideo.versions.map((ver) => (
                        <button
                          key={ver.id}
                          type="button"
                          onClick={() => onUpdateVideo({ ...activeVideo, activeVersionId: ver.id })}
                          className={`w-full text-left rounded-lg border p-2.5 text-xs ${
                            ver.id === activeVideo.activeVersionId
                              ? 'border-[#05349B] bg-[#05349B]/5'
                              : 'border-[#DDE3F2]'
                          }`}
                        >
                          <div className="font-bold text-[#0F1B3D]">{ver.versionLabel}</div>
                          <div className="text-slate-500 mt-0.5">{ver.notes}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleAddVersion} className="space-y-2">
                    <h3 className="text-xs font-bold text-[#0F1B3D]">Unggah / Catat Versi Baru</h3>
                    <input
                      value={newVersionLabel}
                      onChange={(e) => setNewVersionLabel(e.target.value)}
                      placeholder="Contoh: v3.0 Final Color Grade"
                      className="w-full rounded-lg border border-[#DDE3F2] px-3 py-1.5 text-xs"
                      required
                    />
                    <input
                      value={newVersionNotes}
                      onChange={(e) => setNewVersionNotes(e.target.value)}
                      placeholder="Catatan perubahan..."
                      className="w-full rounded-lg border border-[#DDE3F2] px-3 py-1.5 text-xs"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-[#05349B] px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      Simpan Versi Baru
                    </button>
                  </form>
                </div>
              </div>

              {/* Timestamp Feedback */}
              <div className="rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#0F1B3D]">Catatan Timestamp Video</h3>
                <form onSubmit={handleAddFeedback} className="flex flex-wrap gap-2">
                  <input
                    value={timecode}
                    onChange={(e) => setTimecode(e.target.value)}
                    placeholder="00:15"
                    aria-label="Timecode"
                    className="w-24 rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs font-mono"
                    required
                  />
                  <input
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tulis feedback revisi pada timecode ini..."
                    className="flex-1 min-w-[200px] rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
                    required
                  />
                  <button
                    type="submit"
                    className="rounded-lg bg-[#05349B] px-4 py-2 text-xs font-semibold text-white whitespace-nowrap"
                  >
                    Tambah Catatan
                  </button>
                </form>

                <div className="divide-y divide-[#DDE3F2]">
                  {activeVideo.feedback.map((fb) => (
                    <div key={fb.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 font-mono font-bold text-[#05349B]">
                            <Clock className="h-3 w-3" />
                            {fb.timecode}
                          </span>
                          <span className="font-semibold text-[#0F1B3D]">{fb.author}</span>
                          <span className={fb.resolved ? 'text-emerald-700 font-semibold' : 'text-amber-700 font-semibold'}>
                            {fb.resolved ? 'SELESAI' : 'TERBUKA'}
                          </span>
                        </div>
                        <p className="text-slate-700">{fb.comment}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleResolved(fb.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-[#DDE3F2] px-2.5 py-1 text-[11px] font-semibold text-[#0F1B3D] hover:bg-[#F4F6FC] shrink-0"
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        {fb.resolved ? 'Buka Ulang' : 'Tandai Selesai'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
