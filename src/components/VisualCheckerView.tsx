import React, { useState } from 'react';
import { ScanEye, Upload, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { StudioStoreState, UserAccount, VisualAudit } from '../types/studio';
import {
  getApprovedGuidelineVersion,
  hasRolePermission,
  isolateByClient,
} from '../utils/brandLogic';
import { apiRequest } from '../services/apiClient';

interface VisualCheckerViewProps {
  state: StudioStoreState;
  activeUser: UserAccount;
  onAddVisualAudit: (audit: VisualAudit) => void;
}

export const VisualCheckerView: React.FC<VisualCheckerViewProps> = ({
  state,
  activeUser,
  onAddVisualAudit,
}) => {
  const activeWorkspace = state.workspaces.find((w) => w.clientId === state.activeClientId);
  const approvedGuideline = activeWorkspace
    ? getApprovedGuidelineVersion(state.guidelines[activeWorkspace.id])
    : null;
  const clientAudits = isolateByClient(state.visualAudits, state.activeClientId);

  const canCheck = hasRolePermission(
    activeUser.role,
    'RUN_VISUAL_AUDIT',
    state.activeClientId,
    activeUser.assignedClientIds
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>(
    '/src/assets/images/dst_brand_kit_showcase_1794849279824.jpg'
  );
  const [sampleImagePath, setSampleImagePath] = useState<string>(
    '/src/assets/images/dst_brand_kit_showcase_1794849279824.jpg'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedAuditId, setSelectedAuditId] = useState<string>(clientAudits[0]?.id ?? '');
  const [compareAuditId, setCompareAuditId] = useState<string>('');

  const activeAudit = clientAudits.find((a) => a.id === selectedAuditId) ?? clientAudits[0] ?? null;
  const compareAudit = clientAudits.find((a) => a.id === compareAuditId) ?? null;

  const blobToBase64 = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        const idx = res.indexOf(',');
        resolve(idx >= 0 ? res.slice(idx + 1) : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  const handleRunAudit = async () => {
    if (!activeWorkspace || !approvedGuideline || !canCheck) return;
    setLoading(true);
    setError(null);
    try {
      let imageBase64 = '';
      let mimeType = 'image/jpeg';
      let assetName = 'Submitted_Asset.jpg';

      if (selectedFile) {
        imageBase64 = await blobToBase64(selectedFile);
        mimeType = selectedFile.type || 'image/jpeg';
        assetName = selectedFile.name;
      } else {
        const resp = await fetch(sampleImagePath);
        const blob = await resp.blob();
        imageBase64 = await blobToBase64(blob);
        mimeType = blob.type || 'image/jpeg';
        assetName = sampleImagePath.split('/').pop() || 'Reference_Sample.jpg';
      }

      const res = await apiRequest<{ ok: boolean; audit: VisualAudit }>(
        '/api/brand/visual/check',
        activeUser,
        {
          body: {
            clientId: activeWorkspace.clientId,
            brandId: activeWorkspace.id,
            brandName: activeWorkspace.brandName,
            assetName,
            mimeType,
            imageBase64,
            approvedGuideline,
            language: state.language,
          },
        }
      );

      onAddVisualAudit(res.audit);
      setSelectedAuditId(res.audit.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal menjalankan audit visual.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = (audit: VisualAudit) => {
    const lines = [
      `# Visual Consistency Audit Report — ${audit.assetName}`,
      `Verdict: ${audit.verdict} (${audit.overallScore}/100)`,
      `Audited By: ${audit.auditedBy} on ${audit.auditedAt}`,
      '',
      '## Category Breakdown',
      ...audit.categories.map((c) =>
        c.assessable
          ? `- ${c.label}: ${c.earnedPoints}/${c.maxPoints}`
          : `- ${c.label}: NOT ASSESSABLE (${c.reason || 'Element not present'})`
      ),
      '',
      '## Passed Rules',
      ...audit.passedRules.map((r) => `- ${r}`),
      '',
      '## Violations & Recommendations',
      ...audit.violations.map(
        (v) => `- [${v.severity}] ${v.category}: ${v.rule} | Evidence: ${v.evidence} | Fix: ${v.recommendation}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visual-audit-${audit.assetName}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">
            Visual Consistency Checker · {activeWorkspace?.brandName}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Audit gambar pemasaran dengan Gemini Vision terhadap pedoman APPROVED (skor proporsional otomatis jika ada elemen NOT ASSESSABLE).
          </p>
        </div>
      </div>

      {!approvedGuideline && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900">
          Klien ini belum memiliki Brand Guideline berstatus APPROVED. Setujui pedoman di modul Brand Guidelines untuk menjalankan audit visual.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload & Audit Controls */}
        <div className="lg:col-span-5 rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4">
          <h2 className="text-base font-bold text-[#0F1B3D] flex items-center gap-2">
            <ScanEye className="h-4 w-4 text-[#05349B]" />
            Unggah Desain untuk Diaudit
          </h2>

          <label className="block rounded-xl border-2 border-dashed border-[#DDE3F2] bg-[#F4F6FC] p-4 text-center cursor-pointer hover:border-[#05349B]">
            <Upload className="mx-auto h-5 w-5 text-[#05349B]" />
            <div className="mt-1.5 text-xs font-bold text-[#0F1B3D]">
              {selectedFile ? selectedFile.name : 'Pilih File PNG / JPG / WEBP'}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setSelectedFile(file);
                if (file) setPreviewUrl(URL.createObjectURL(file));
              }}
              className="sr-only"
            />
          </label>

          <div>
            <label htmlFor="sample-asset-select" className="block text-xs font-semibold text-[#0F1B3D] mb-1">
              Atau Uji dengan Sampel Aset Studio
            </label>
            <select
              id="sample-asset-select"
              value={sampleImagePath}
              onChange={(e) => {
                setSelectedFile(null);
                setSampleImagePath(e.target.value);
                setPreviewUrl(e.target.value);
              }}
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
            >
              <option value="/src/assets/images/dst_brand_kit_showcase_1794849279824.jpg">
                DST Brand Kit Showcase (4:3)
              </option>
              <option value="/src/assets/images/edumax_studio_reference_1794849281222.jpg">
                Edumax 3D Earth Diorama (16:9)
              </option>
              <option value="/src/assets/images/antikorupsi_campaign_poster_1794849280203.jpg">
                Antikorupsi Daylight Poster (3:4)
              </option>
            </select>
          </div>

          <div className="overflow-hidden rounded-lg border border-[#DDE3F2]">
            <img
              src={previewUrl}
              alt="Pratinjau aset audit"
              referrerPolicy="no-referrer"
              className="h-48 w-full object-cover"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            disabled={!approvedGuideline || !canCheck || loading}
            onClick={handleRunAudit}
            className="w-full rounded-lg bg-[#05349B] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#042878] disabled:opacity-50"
          >
            {loading ? 'Mengaudit Kepatuhan Visual...' : 'Jalankan Visual Consistency Audit'}
          </button>

          {/* Audit History */}
          {clientAudits.length > 0 && (
            <div className="pt-3 border-t border-[#DDE3F2] space-y-2">
              <div className="text-xs font-bold text-[#0F1B3D]">Riwayat Audit ({clientAudits.length})</div>
              {clientAudits.map((aud) => (
                <button
                  key={aud.id}
                  type="button"
                  onClick={() => setSelectedAuditId(aud.id)}
                  className={`w-full text-left rounded-lg border p-2.5 text-xs flex items-center justify-between gap-2 ${
                    activeAudit?.id === aud.id ? 'border-[#05349B] bg-[#05349B]/5' : 'border-[#DDE3F2]'
                  }`}
                >
                  <span className="truncate font-semibold text-[#0F1B3D]">{aud.assetName}</span>
                  <span className="font-mono font-bold tabular-nums text-[#05349B] shrink-0">
                    {aud.overallScore}/100 · {aud.verdict}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Audit Result & Comparison */}
        <div className="lg:col-span-7 space-y-4">
          {!activeAudit ? (
            <div className="rounded-xl border border-dashed border-[#DDE3F2] bg-white p-10 text-center text-sm text-slate-500">
              Belum ada hasil audit visual untuk klien ini. Jalankan audit untuk melihat rincian skor 100 poin.
            </div>
          ) : (
            <div className="rounded-xl border border-[#DDE3F2] bg-white p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#DDE3F2] pb-4">
                <div>
                  <div className="text-xs font-semibold text-slate-500">{activeAudit.assetName}</div>
                  <div className="mt-1 flex items-baseline gap-3">
                    <span className="text-3xl font-extrabold text-[#05349B] tabular-nums">
                      {activeAudit.overallScore}/100
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        activeAudit.verdict === 'ON BRAND'
                          ? 'text-emerald-700'
                          : activeAudit.verdict === 'NEEDS REVISION'
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }`}
                    >
                      {activeAudit.verdict}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {clientAudits.length > 1 && (
                    <select
                      aria-label="Bandingkan dengan audit lain"
                      value={compareAuditId}
                      onChange={(e) => setCompareAuditId(e.target.value)}
                      className="rounded-lg border border-[#DDE3F2] px-2.5 py-1.5 text-xs"
                    >
                      <option value="">Bandingkan riwayat...</option>
                      {clientAudits
                        .filter((a) => a.id !== activeAudit.id)
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            vs {a.assetName} ({a.overallScore}/100)
                          </option>
                        ))}
                    </select>
                  )}
                  <button
                    type="button"
                    onClick={() => handleExportReport(activeAudit)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3F2] px-3 py-1.5 text-xs font-semibold text-[#0F1B3D] hover:bg-[#F4F6FC]"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Ekspor Laporan
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">{activeAudit.summary}</p>

              {/* Category Rubric Table */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeAudit.categories.map((cat) => (
                  <div key={cat.key} className="rounded-lg border border-[#DDE3F2] p-3 text-xs">
                    <div className="flex items-center justify-between font-bold text-[#0F1B3D]">
                      <span>{cat.label}</span>
                      <span className="font-mono tabular-nums text-[#05349B]">
                        {cat.assessable ? `${cat.earnedPoints}/${cat.maxPoints}` : 'NOT ASSESSABLE'}
                      </span>
                    </div>
                    {!cat.assessable && cat.reason && (
                      <div className="mt-1 text-[11px] text-slate-500">{cat.reason}</div>
                    )}
                  </div>
                ))}
              </div>

              {compareAudit && (
                <div className="rounded-lg border border-[#05349B]/30 bg-[#F4F6FC] p-3.5 text-xs">
                  <div className="font-bold text-[#05349B]">
                    Perbandingan: {activeAudit.assetName} ({activeAudit.overallScore}) vs{' '}
                    {compareAudit.assetName} ({compareAudit.overallScore})
                  </div>
                  <div className="mt-1 text-slate-700 tabular-nums">
                    Selisih Skor:{' '}
                    <strong>
                      {activeAudit.overallScore - compareAudit.overallScore >= 0 ? '+' : ''}
                      {activeAudit.overallScore - compareAudit.overallScore} poin
                    </strong>
                  </div>
                </div>
              )}

              {/* Passed Rules */}
              <div>
                <h3 className="text-xs font-bold text-emerald-700 mb-2">Aturan Terpenuhi</h3>
                <ul className="space-y-1 text-xs text-slate-700">
                  {activeAudit.passedRules.map((r, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Violations */}
              <div>
                <h3 className="text-xs font-bold text-[#0F1B3D] mb-2">
                  Temuan & Rekomendasi Perbaikan ({activeAudit.violations.length})
                </h3>
                {activeAudit.violations.length === 0 ? (
                  <p className="text-xs text-slate-500">Tidak ada pelanggaran terdeteksi.</p>
                ) : (
                  <div className="space-y-2.5">
                    {activeAudit.violations.map((v) => (
                      <div key={v.id} className="rounded-lg border border-[#DDE3F2] p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#0F1B3D] flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                            {v.category}: {v.rule}
                          </span>
                          <span
                            className={`font-mono text-[11px] font-bold ${
                              v.severity === 'CRITICAL'
                                ? 'text-red-700'
                                : v.severity === 'MAJOR'
                                ? 'text-amber-700'
                                : 'text-slate-600'
                            }`}
                          >
                            {v.severity}
                          </span>
                        </div>
                        <div className="text-slate-600">
                          <strong>Bukti:</strong> {v.evidence}
                        </div>
                        <div className="text-[#05349B]">
                          <strong>Rekomendasi:</strong> {v.recommendation}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
