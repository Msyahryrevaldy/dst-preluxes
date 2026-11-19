import React, { useState } from 'react';
import { CheckCircle2, XCircle, Send, Plus, History, ShieldCheck } from 'lucide-react';
import type {
  BrandGuideline,
  BrandGuidelineVersion,
  BrandSwatch,
  GuidelineStatus,
  StudioStoreState,
  UserAccount,
} from '../types/studio';
import {
  canTransitionGuidelineState,
  getApprovedGuidelineVersion,
  hasRolePermission,
} from '../utils/brandLogic';
import { apiRequest } from '../services/apiClient';

interface BrandGuidelinesViewProps {
  state: StudioStoreState;
  activeUser: UserAccount;
  onUpdateGuideline: (brandId: string, guideline: BrandGuideline) => void;
}

export const BrandGuidelinesView: React.FC<BrandGuidelinesViewProps> = ({
  state,
  activeUser,
  onUpdateGuideline,
}) => {
  const activeWorkspace = state.workspaces.find((w) => w.clientId === state.activeClientId);
  const guideline: BrandGuideline | undefined = activeWorkspace
    ? state.guidelines[activeWorkspace.id]
    : undefined;

  const versions = guideline?.versions ?? [];
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    guideline?.activeVersionId || versions[0]?.id || ''
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectionInput, setRejectionInput] = useState('');

  const activeVersion =
    versions.find((v) => v.id === selectedVersionId) ?? versions[versions.length - 1] ?? null;

  const canEdit = hasRolePermission(
    activeUser.role,
    'EDIT_GUIDELINE',
    state.activeClientId,
    activeUser.assignedClientIds
  );
  const canApprove = hasRolePermission(
    activeUser.role,
    'APPROVE_GUIDELINE',
    state.activeClientId,
    activeUser.assignedClientIds
  );

  const approvedActive = getApprovedGuidelineVersion(guideline);

  const handleCreateNewVersion = () => {
    if (!activeWorkspace) return;
    const nextNum = versions.length > 0 ? Math.max(...versions.map((v) => v.versionNumber)) + 1 : 1;
    const base = activeVersion;
    const newVer: BrandGuidelineVersion = base
      ? {
          ...structuredClone(base),
          id: `gl-${activeWorkspace.clientId}-v${nextNum}-${Date.now().toString(36)}`,
          versionNumber: nextNum,
          status: 'DRAFT',
          changeSummary: `Versi draft v${nextNum}`,
          createdBy: activeUser.name,
          createdAt: new Date().toISOString(),
          approvedBy: undefined,
          approvedAt: undefined,
        }
      : {
          id: `gl-${activeWorkspace.clientId}-v1-${Date.now().toString(36)}`,
          brandId: activeWorkspace.id,
          clientId: activeWorkspace.clientId,
          versionNumber: 1,
          status: 'DRAFT',
          sections: {
            brandIdentity: activeWorkspace.companyProfile,
            logoSystem: 'NOT VERIFIED — Unggah pedoman logo resmi terlebih dahulu.',
            colorSystem: 'Tambahkan swatch HEX resmi.',
            typography: 'Tambahkan hierarki font resmi.',
            photography: 'NOT VERIFIED',
            illustration: 'NOT VERIFIED',
            composition: 'Grid rapi dengan margin bersih.',
            toneOfVoice: 'Jelas dan profesional.',
            messaging: activeWorkspace.uvp,
            dosList: ['Gunakan hanya aset terverifikasi.'],
            dontsList: ['Jangan ubah rasio logo.'],
          },
          swatches: [
            {
              id: `sw-${Date.now().toString(36)}`,
              name: 'Primary Swatch',
              hex: activeWorkspace.primaryColorPreview || '#05349B',
              role: 'PRIMARY',
              usageRule: 'Warna utama',
              verified: false,
            },
          ],
          fonts: [
            {
              id: `fn-${Date.now().toString(36)}`,
              tier: 'DISPLAY',
              fontFamily: 'Plus Jakarta Sans',
              weights: '700',
              usageNote: 'Judul utama',
              verified: false,
            },
          ],
          logoGallery: [],
          referenceGallery: [],
          evidences: [],
          changeSummary: 'Draft pedoman awal',
          createdBy: activeUser.name,
          createdAt: new Date().toISOString(),
        };

    const nextGuideline: BrandGuideline = {
      brandId: activeWorkspace.id,
      clientId: activeWorkspace.clientId,
      activeVersionId: guideline?.activeVersionId ?? null,
      versions: [...versions, newVer],
    };
    onUpdateGuideline(activeWorkspace.id, nextGuideline);
    setSelectedVersionId(newVer.id);
    setFeedback(`Draft v${nextNum} berhasil dibuat.`);
  };

  const handlePatchActiveVersion = (patch: Partial<BrandGuidelineVersion>) => {
    if (!activeWorkspace || !guideline || !activeVersion || !canEdit) return;
    const nextVersions = guideline.versions.map((v) =>
      v.id === activeVersion.id ? { ...v, ...patch } : v
    );
    onUpdateGuideline(activeWorkspace.id, { ...guideline, versions: nextVersions });
  };

  const handleTransitionStatus = async (nextStatus: GuidelineStatus) => {
    if (!activeWorkspace || !activeVersion) return;
    setError(null);
    setFeedback(null);

    if (nextStatus === 'APPROVED' || nextStatus === 'ARCHIVED') {
      try {
        const res = await apiRequest<{ ok: boolean; guideline: BrandGuideline }>(
          '/api/brand/guidelines/approve',
          activeUser,
          {
            body: {
              brandId: activeWorkspace.id,
              clientId: activeWorkspace.clientId,
              versionId: activeVersion.id,
              nextStatus,
              rejectionReason: rejectionInput || undefined,
              versionPayload: activeVersion,
            },
          }
        );
        onUpdateGuideline(activeWorkspace.id, res.guideline);
        setFeedback(`Guideline v${activeVersion.versionNumber} sekarang berstatus ${nextStatus}.`);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Gagal memperbarui status guideline.');
      }
      return;
    }

    if (!canTransitionGuidelineState(activeVersion.status, nextStatus, activeUser.role)) {
      setError(`Transisi dari ${activeVersion.status} ke ${nextStatus} tidak diizinkan untuk peran ${activeUser.role}.`);
      return;
    }
    handlePatchActiveVersion({
      status: nextStatus,
      rejectionReason: nextStatus === 'DRAFT' ? rejectionInput || 'Perlu revisi' : undefined,
    });
    setFeedback(`Status diperbarui ke ${nextStatus}.`);
  };

  const handleAddSwatch = () => {
    if (!activeVersion || !canEdit) return;
    const newSwatch: BrandSwatch = {
      id: `sw-${Date.now().toString(36)}`,
      name: 'New Brand Color',
      hex: '#05349B',
      role: 'ACCENT',
      usageRule: 'Aturan penggunaan',
      verified: false,
    };
    handlePatchActiveVersion({ swatches: [...activeVersion.swatches, newSwatch] });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">
            Brand Guidelines · {activeWorkspace?.brandName}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Hanya pedoman berstatus <strong>APPROVED</strong> yang digunakan sebagai instruksi resmi oleh Creative Direction, Social Studio, dan Brand Lock.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {approvedActive ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Authoritative Active: v{approvedActive.versionNumber}
            </span>
          ) : (
            <span className="text-xs font-semibold text-amber-700">
              Belum ada versi APPROVED aktif
            </span>
          )}
          {canEdit && (
            <button
              type="button"
              onClick={handleCreateNewVersion}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#05349B] px-3.5 py-2 text-xs font-semibold text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Versi Draft Baru
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs font-medium text-red-700">
          {error}
        </div>
      )}
      {feedback && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-800">
          {feedback}
        </div>
      )}

      {!activeVersion ? (
        <div className="rounded-xl border border-dashed border-[#DDE3F2] bg-white p-10 text-center space-y-3">
          <div className="text-sm font-semibold text-[#0F1B3D]">
            Belum ada Brand Guideline untuk {activeWorkspace?.brandName}.
          </div>
          {canEdit && (
            <button
              type="button"
              onClick={handleCreateNewVersion}
              className="inline-flex items-center gap-2 rounded-lg bg-[#05349B] px-4 py-2 text-xs font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Buat Pedoman v1
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Version History & Approval Controls */}
          <aside className="lg:col-span-4 space-y-4">
            <div className="rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4">
              <div className="flex items-center gap-2 text-sm font-bold text-[#0F1B3D]">
                <History className="h-4 w-4 text-[#05349B]" />
                Riwayat Versi ({versions.length})
              </div>
              <div className="space-y-2">
                {versions.map((ver) => (
                  <button
                    key={ver.id}
                    type="button"
                    onClick={() => setSelectedVersionId(ver.id)}
                    className={`w-full text-left rounded-lg border p-3 text-xs ${
                      ver.id === activeVersion.id
                        ? 'border-[#05349B] bg-[#05349B]/5'
                        : 'border-[#DDE3F2]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0F1B3D]">Versi {ver.versionNumber}</span>
                      <span
                        className={`font-mono font-bold ${
                          ver.status === 'APPROVED'
                            ? 'text-emerald-700'
                            : ver.status === 'REVIEW'
                            ? 'text-amber-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {ver.status}
                      </span>
                    </div>
                    <div className="mt-1 text-slate-600">{ver.changeSummary}</div>
                  </button>
                ))}
              </div>

              {/* Workflow Actions */}
              <div className="pt-3 border-t border-[#DDE3F2] space-y-2">
                <div className="text-xs font-bold text-[#0F1B3D]">
                  Alur Persetujuan (Status: {activeVersion.status})
                </div>

                {activeVersion.status === 'DRAFT' && canEdit && (
                  <button
                    type="button"
                    onClick={() => handleTransitionStatus('REVIEW')}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[#05349B] bg-white py-2 text-xs font-semibold text-[#05349B] hover:bg-[#F4F6FC]"
                  >
                    <Send className="h-3.5 w-3.5" />
                    Ajukan untuk Review
                  </button>
                )}

                {(activeVersion.status === 'DRAFT' || activeVersion.status === 'REVIEW') && (
                  <>
                    <button
                      type="button"
                      disabled={!canApprove}
                      onClick={() => handleTransitionStatus('APPROVED')}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#05349B] py-2 text-xs font-semibold text-white hover:bg-[#042878] disabled:opacity-40"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Setujui Pedoman (Approve)
                    </button>
                    {activeVersion.status === 'REVIEW' && canApprove && (
                      <div className="space-y-1.5 pt-1">
                        <input
                          value={rejectionInput}
                          onChange={(e) => setRejectionInput(e.target.value)}
                          placeholder="Alasan penolakan (opsional)..."
                          className="w-full rounded-lg border border-[#DDE3F2] px-2.5 py-1.5 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => handleTransitionStatus('DRAFT')}
                          className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 py-1.5 text-xs font-semibold text-red-700"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Kembalikan ke Draft
                        </button>
                      </div>
                    )}
                  </>
                )}

                {activeVersion.status === 'APPROVED' && canApprove && (
                  <button
                    type="button"
                    onClick={() => handleTransitionStatus('ARCHIVED')}
                    className="w-full rounded-lg border border-[#DDE3F2] py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Arsipkan Versi Ini
                  </button>
                )}
              </div>
            </div>

            {/* Swatch System */}
            <div className="rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0F1B3D]">3. Color System (HEX Swatches)</h3>
                {canEdit && (
                  <button
                    type="button"
                    onClick={handleAddSwatch}
                    className="text-xs font-semibold text-[#05349B] hover:underline"
                  >
                    + Swatch
                  </button>
                )}
              </div>
              <div className="space-y-2.5">
                {activeVersion.swatches.map((sw) => (
                  <div key={sw.id} className="rounded-lg border border-[#DDE3F2] p-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="color"
                        aria-label={`Color picker ${sw.name}`}
                        disabled={!canEdit}
                        value={/^#[0-9A-Fa-f]{6}$/.test(sw.hex) ? sw.hex : '#05349B'}
                        onChange={(e) =>
                          handlePatchActiveVersion({
                            swatches: activeVersion.swatches.map((item) =>
                              item.id === sw.id ? { ...item, hex: e.target.value.toUpperCase() } : item
                            ),
                          })
                        }
                        className="h-7 w-9 rounded border border-[#DDE3F2] cursor-pointer"
                      />
                      <input
                        disabled={!canEdit}
                        value={sw.name}
                        onChange={(e) =>
                          handlePatchActiveVersion({
                            swatches: activeVersion.swatches.map((item) =>
                              item.id === sw.id ? { ...item, name: e.target.value } : item
                            ),
                          })
                        }
                        className="flex-1 font-bold text-[#0F1B3D] outline-none"
                      />
                      <span className="font-mono text-[11px] font-semibold text-slate-600">{sw.hex}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>{sw.role} · {sw.usageRule}</span>
                      <span className={sw.verified ? 'text-emerald-700 font-bold' : 'text-amber-700 font-bold'}>
                        {sw.verified ? 'VERIFIED' : 'UNVERIFIED'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>

          {/* 10-Section Visual Guideline Editor */}
          <div className="lg:col-span-8 rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-5">
            <h2 className="text-base font-bold text-[#0F1B3D] border-b border-[#DDE3F2] pb-3">
              Editor Pedoman 10 Bagian — Versi {activeVersion.versionNumber}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(
                [
                  { key: 'brandIdentity', label: '1. Brand Identity' },
                  { key: 'logoSystem', label: '2. Logo System' },
                  { key: 'colorSystem', label: '3. Color System Rules' },
                  { key: 'typography', label: '4. Typography Rules' },
                  { key: 'photography', label: '5. Photography Direction' },
                  { key: 'illustration', label: '6. Illustration Style' },
                  { key: 'composition', label: '7. Composition & Layout' },
                  { key: 'toneOfVoice', label: '8. Tone of Voice' },
                  { key: 'messaging', label: '9. Messaging & Tagline' },
                ] as const
              ).map((sec) => (
                <div key={sec.key}>
                  <label className="block text-xs font-bold text-[#0F1B3D] mb-1">{sec.label}</label>
                  <textarea
                    rows={3}
                    disabled={!canEdit}
                    value={activeVersion.sections[sec.key]}
                    onChange={(e) =>
                      handlePatchActiveVersion({
                        sections: { ...activeVersion.sections, [sec.key]: e.target.value },
                      })
                    }
                    className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs leading-relaxed"
                  />
                </div>
              ))}
            </div>

            {/* Section 10: DOs & DON'Ts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#DDE3F2]">
              <div>
                <label className="block text-xs font-bold text-emerald-700 mb-1">
                  10A. Brand DOs (satu aturan per baris)
                </label>
                <textarea
                  rows={4}
                  disabled={!canEdit}
                  value={activeVersion.sections.dosList.join('\n')}
                  onChange={(e) =>
                    handlePatchActiveVersion({
                      sections: {
                        ...activeVersion.sections,
                        dosList: e.target.value.split('\n').filter(Boolean),
                      },
                    })
                  }
                  className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-red-700 mb-1">
                  10B. Brand DON&apos;Ts (satu larangan per baris)
                </label>
                <textarea
                  rows={4}
                  disabled={!canEdit}
                  value={activeVersion.sections.dontsList.join('\n')}
                  onChange={(e) =>
                    handlePatchActiveVersion({
                      sections: {
                        ...activeVersion.sections,
                        dontsList: e.target.value.split('\n').filter(Boolean),
                      },
                    })
                  }
                  className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
                />
              </div>
            </div>

            {/* Typography Hierarchy & Reference Gallery */}
            <div className="pt-3 border-t border-[#DDE3F2] grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-xs font-bold text-[#0F1B3D] mb-2">Hierarki Tipografi</h3>
                <div className="space-y-2">
                  {activeVersion.fonts.map((f) => (
                    <div key={f.id} className="rounded-lg border border-[#DDE3F2] p-2.5 text-xs">
                      <div className="flex items-center justify-between font-bold text-[#0F1B3D]">
                        <span>
                          {f.tier}: {f.fontFamily}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">{f.weights}</span>
                      </div>
                      <div className="text-slate-600 mt-0.5">{f.usageNote}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-[#0F1B3D] mb-2">Galeri Referensi Visual & Logo</h3>
                {activeVersion.referenceGallery.length === 0 && activeVersion.logoGallery.length === 0 ? (
                  <p className="text-xs text-slate-500">Belum ada gambar referensi tertaut pada versi ini.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {[...activeVersion.logoGallery, ...activeVersion.referenceGallery].map((img) => (
                      <div key={img.id} className="rounded-lg border border-[#DDE3F2] overflow-hidden">
                        <img
                          src={img.url}
                          alt={img.label}
                          referrerPolicy="no-referrer"
                          className="h-24 w-full object-cover"
                        />
                        <div className="p-2 text-[11px] font-semibold text-[#0F1B3D] truncate">
                          {img.label}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
