import React, { useState } from 'react';
import { Upload, Sparkles, CheckCircle2, AlertTriangle, CloudUpload, FileText } from 'lucide-react';
import type {
  BrandAsset,
  BrandEvidence,
  BrandGuidelineVersion,
  BrandSwatch,
  BrandFontRule,
  StudioStoreState,
  UserAccount,
} from '../types/studio';
import { apiRequest } from '../services/apiClient';
import { hasRolePermission, isolateByClient } from '../utils/brandLogic';
import {
  findOrCreateBrandLibraryFolder,
  uploadFileToBrandLibraryDrive,
} from '../services/driveAuth';
import { ConfirmDriveModal } from './ConfirmDriveModal';

interface BrandIntelligenceViewProps {
  state: StudioStoreState;
  activeUser: UserAccount;
  driveConnected: boolean;
  onAddAsset: (asset: BrandAsset) => void;
  onCreateGuidelineDraftFromExtraction: (
    brandId: string,
    clientId: string,
    evidences: BrandEvidence[],
    swatches: BrandSwatch[],
    fonts: BrandFontRule[],
    sourceFileName: string
  ) => void;
  onGoogleSignIn: () => void;
}

interface ExtractionApiResponse {
  ok: boolean;
  model: string;
  extraction: {
    summary: string;
    evidences: Array<Omit<BrandEvidence, 'id'>>;
    suggestedSwatches: Array<Omit<BrandSwatch, 'id'>>;
    suggestedFonts: Array<Omit<BrandFontRule, 'id'>>;
  };
}

export const BrandIntelligenceView: React.FC<BrandIntelligenceViewProps> = ({
  state,
  activeUser,
  driveConnected,
  onAddAsset,
  onCreateGuidelineDraftFromExtraction,
  onGoogleSignIn,
}) => {
  const activeWorkspace = state.workspaces.find((w) => w.clientId === state.activeClientId);
  const activeClient = state.clients.find((c) => c.id === state.activeClientId);
  const clientAssets = isolateByClient(state.assets, state.activeClientId);

  const canExtract = hasRolePermission(
    activeUser.role,
    'RUN_EXTRACTION',
    state.activeClientId,
    activeUser.assignedClientIds
  );

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractionSummary, setExtractionSummary] = useState<string | null>(null);
  const [evidences, setEvidences] = useState<BrandEvidence[]>([]);
  const [swatches, setSwatches] = useState<BrandSwatch[]>([]);
  const [fonts, setFonts] = useState<BrandFontRule[]>([]);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const [confirmDriveOpen, setConfirmDriveOpen] = useState(false);
  const [pendingDriveFile, setPendingDriveFile] = useState<File | null>(null);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = String(reader.result || '');
        const idx = res.indexOf(',');
        resolve(idx >= 0 ? res.slice(idx + 1) : res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleAnalyzeDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspace || !canExtract) return;
    if (!selectedFile && !pastedText.trim()) {
      setError('Pilih file dokumen (PDF, DOCX, TXT, PNG, JPG, SVG) atau tempel teks pedoman brand.');
      return;
    }

    setLoading(true);
    setError(null);
    setStatusNotice(null);

    try {
      const fileName = selectedFile?.name || `${activeWorkspace.brandName}_Brief_Text.txt`;
      const mimeType = selectedFile?.type || 'text/plain';
      const base64Data = selectedFile ? await fileToBase64(selectedFile) : undefined;

      const res = await apiRequest<ExtractionApiResponse>('/api/brand/extract', activeUser, {
        body: {
          clientId: activeWorkspace.clientId,
          brandId: activeWorkspace.id,
          brandName: activeWorkspace.brandName,
          fileName,
          mimeType,
          base64Data,
          textContent: pastedText.trim() || undefined,
        },
      });

      const mappedEvidences: BrandEvidence[] = res.extraction.evidences.map((ev, idx) => ({
        ...ev,
        id: `ev-${Date.now().toString(36)}-${idx}`,
      }));
      const mappedSwatches: BrandSwatch[] = res.extraction.suggestedSwatches.map((s, idx) => ({
        ...s,
        id: `sw-${Date.now().toString(36)}-${idx}`,
      }));
      const mappedFonts: BrandFontRule[] = res.extraction.suggestedFonts.map((f, idx) => ({
        ...f,
        id: `fn-${Date.now().toString(36)}-${idx}`,
      }));

      setExtractionSummary(res.extraction.summary);
      setEvidences(mappedEvidences);
      setSwatches(mappedSwatches);
      setFonts(mappedFonts);
      setApprovedIds(
        new Set(
          mappedEvidences
            .filter((ev) => ev.status === 'VERIFIED' || ev.status === 'AI_SUGGESTION')
            .map((ev) => ev.id)
        )
      );

      // Register asset locally in client workspace
      onAddAsset({
        id: `ast-${Date.now().toString(36)}`,
        brandId: activeWorkspace.id,
        clientId: activeWorkspace.clientId,
        name: fileName,
        category: mimeType.startsWith('image/') ? 'KEY_VISUAL' : 'DOCUMENT',
        mimeType,
        sizeBytes: selectedFile?.size ?? pastedText.length,
        url:
          selectedFile && mimeType.startsWith('image/')
            ? URL.createObjectURL(selectedFile)
            : '/src/assets/images/dst_brand_kit_showcase_1794849279824.jpg',
        driveStorageMode: 'LOCAL_CACHE',
        uploadedBy: activeUser.name,
        uploadedAt: new Date().toISOString(),
        notes: `Diekstrak dengan ${res.model}`,
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengekstrak dokumen brand.');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestDriveUpload = () => {
    if (!selectedFile) {
      setError('Pilih file terlebih dahulu untuk diunggah ke Brand Library Google Drive.');
      return;
    }
    if (!driveConnected) {
      onGoogleSignIn();
      return;
    }
    setPendingDriveFile(selectedFile);
    setConfirmDriveOpen(true);
  };

  const handleConfirmDriveUpload = async () => {
    setConfirmDriveOpen(false);
    if (!pendingDriveFile || !activeWorkspace || !activeClient) return;
    setLoading(true);
    setError(null);
    try {
      const { clientFolderId } = await findOrCreateBrandLibraryFolder(
        state.systemConfig.brandLibraryRootFolderName,
        activeClient.name
      );
      const uploaded = await uploadFileToBrandLibraryDrive({
        folderId: clientFolderId,
        fileName: pendingDriveFile.name,
        mimeType: pendingDriveFile.type || 'application/octet-stream',
        fileBlob: pendingDriveFile,
      });

      onAddAsset({
        id: `ast-drv-${Date.now().toString(36)}`,
        brandId: activeWorkspace.id,
        clientId: activeWorkspace.clientId,
        name: uploaded.name,
        category: 'DOCUMENT',
        mimeType: pendingDriveFile.type || 'application/octet-stream',
        sizeBytes: pendingDriveFile.size,
        url: uploaded.webViewLink || '/src/assets/images/dst_brand_kit_showcase_1794849279824.jpg',
        driveFileId: uploaded.id,
        driveFolderId: clientFolderId,
        driveStorageMode: 'GOOGLE_DRIVE',
        uploadedBy: activeUser.name,
        uploadedAt: new Date().toISOString(),
        notes: 'Disimpan di folder terpisah Brand Library Google Drive',
      });
      setStatusNotice(`Berhasil mengunggah "${uploaded.name}" ke Brand Library Google Drive (terpisah dari Ready To Post).`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Gagal mengunggah ke Google Drive.');
    } finally {
      setLoading(false);
      setPendingDriveFile(null);
    }
  };

  const handlePushToGuidelines = () => {
    if (!activeWorkspace) return;
    const selectedEvidences = evidences.filter((ev) => approvedIds.has(ev.id));
    onCreateGuidelineDraftFromExtraction(
      activeWorkspace.id,
      activeWorkspace.clientId,
      selectedEvidences,
      swatches,
      fonts,
      selectedFile?.name || 'Extracted Document'
    );
    setStatusNotice('Hasil ekstraksi terverifikasi telah dikirim ke editor Brand Guidelines sebagai versi DRAFT baru.');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1B3D]">Brand Library & Document Intelligence</h1>
        <p className="text-sm text-slate-600 mt-1">
          Unggah PDF, DOCX, TXT, atau gambar pedoman brand untuk ekstraksi A–N berbasis bukti tanpa halusinasi HEX atau font.
        </p>
      </div>

      {!canExtract && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900">
          Peran {activeUser.role} hanya dapat membaca aset. Pengunggahan & ekstraksi dokumen memerlukan peran ADMIN atau PM.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upload & Analyze Form */}
        <form
          onSubmit={handleAnalyzeDocument}
          className="lg:col-span-5 rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4"
        >
          <h2 className="text-base font-bold text-[#0F1B3D]">
            Unggah Dokumen · {activeWorkspace?.brandName}
          </h2>

          <label className="block rounded-xl border-2 border-dashed border-[#DDE3F2] bg-[#F4F6FC] p-5 text-center cursor-pointer hover:border-[#05349B]">
            <Upload className="mx-auto h-6 w-6 text-[#05349B]" />
            <div className="mt-2 text-xs font-bold text-[#0F1B3D]">
              {selectedFile ? selectedFile.name : 'Pilih PDF, DOCX, TXT, PNG, JPG, JPEG, atau SVG'}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {selectedFile ? `${Math.round(selectedFile.size / 1024)} KB` : 'Klik untuk memilih file dari perangkat'}
            </div>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.svg"
              disabled={!canExtract}
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
          </label>

          <div>
            <label htmlFor="brand-doc-text" className="block text-xs font-semibold text-[#0F1B3D] mb-1">
              Atau Tempel Teks Pedoman Brand (Opsional)
            </label>
            <textarea
              id="brand-doc-text"
              rows={4}
              disabled={!canExtract}
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Tempel ringkasan brand book, visi misi, kode HEX resmi, aturan logo, dan DO/DON'T..."
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {error}
            </div>
          )}
          {statusNotice && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              {statusNotice}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!canExtract || loading}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#05349B] px-4 py-2.5 text-xs font-semibold text-white hover:bg-[#042878] disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              {loading ? 'Menganalisis Dokumen...' : 'Ekstrak A–N (Gemini)'}
            </button>
            <button
              type="button"
              disabled={!canExtract || !selectedFile || loading}
              onClick={handleRequestDriveUpload}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3F2] bg-white px-3.5 py-2.5 text-xs font-semibold text-[#0F1B3D] hover:bg-[#F4F6FC] disabled:opacity-50"
            >
              <CloudUpload className="h-4 w-4 text-[#05349B]" />
              Simpan ke Brand Library Drive
            </button>
          </div>

          {/* Client Asset Library */}
          <div className="pt-3 border-t border-[#DDE3F2]">
            <h3 className="text-xs font-bold text-[#0F1B3D] mb-2">
              Dokumen & Aset Tersimpan ({clientAssets.length})
            </h3>
            <ul className="space-y-2 max-h-56 overflow-y-auto">
              {clientAssets.map((ast) => (
                <li
                  key={ast.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-[#DDE3F2] p-2.5 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-[#05349B] shrink-0" />
                    <div className="min-w-0">
                      <div className="font-semibold text-[#0F1B3D] truncate">{ast.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {ast.category} · {ast.driveStorageMode}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </form>

        {/* Extracted Evidence Review Panel */}
        <div className="lg:col-span-7 rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDE3F2] pb-3">
            <div>
              <h2 className="text-base font-bold text-[#0F1B3D]">
                Bukti Ekstraksi Terstruktur (Kategori A–N)
              </h2>
              <p className="text-xs text-slate-500">
                Edit nilai, periksa sumber & halaman, dan pilih aturan yang akan dimasukkan ke Brand Guidelines.
              </p>
            </div>
            {evidences.length > 0 && canExtract && (
              <button
                type="button"
                onClick={handlePushToGuidelines}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#05349B] px-3.5 py-2 text-xs font-semibold text-white whitespace-nowrap"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Buat Draft Guideline ({approvedIds.size})
              </button>
            )}
          </div>

          {extractionSummary && (
            <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3 text-xs text-[#0F1B3D]">
              <strong>Ringkasan Analis:</strong> {extractionSummary}
            </div>
          )}

          {evidences.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[#DDE3F2] p-10 text-center text-xs text-slate-500">
              Unggah dokumen brand atau tempel teks brief lalu klik &ldquo;Ekstrak A–N (Gemini)&rdquo; untuk melihat bukti aturan terstruktur.
            </div>
          ) : (
            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
              {evidences.map((ev) => {
                const checked = approvedIds.has(ev.id);
                const statusColor =
                  ev.status === 'VERIFIED'
                    ? 'text-emerald-700'
                    : ev.status === 'CONFLICT'
                    ? 'text-red-700'
                    : ev.status === 'AI_SUGGESTION'
                    ? 'text-amber-700'
                    : 'text-slate-500';

                return (
                  <div key={ev.id} className="rounded-lg border border-[#DDE3F2] p-3.5 space-y-2 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label className="flex items-center gap-2 font-bold text-[#0F1B3D] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const next = new Set(approvedIds);
                            if (checked) next.delete(ev.id);
                            else next.add(ev.id);
                            setApprovedIds(next);
                          }}
                          className="h-4 w-4 accent-[#05349B]"
                        />
                        <span>
                          {ev.categoryCode} · {ev.label}
                        </span>
                      </label>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className={`font-bold ${statusColor}`}>{ev.status}</span>
                        <span className="text-slate-400">·</span>
                        <span className="tabular-nums text-slate-600">
                          Conf: {Math.round(ev.confidence * 100)}%
                        </span>
                      </div>
                    </div>

                    <textarea
                      rows={2}
                      value={ev.extractedValue}
                      onChange={(e) =>
                        setEvidences((prev) =>
                          prev.map((item) =>
                            item.id === ev.id ? { ...item, extractedValue: e.target.value } : item
                          )
                        )
                      }
                      className="w-full rounded-md border border-[#DDE3F2] px-2.5 py-1.5 text-xs text-[#0F1B3D]"
                    />

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                      <span>
                        Sumber: <strong className="text-[#0F1B3D]">{ev.sourceDocument}</strong> ·{' '}
                        {ev.pageReference}
                      </span>
                      {ev.status === 'CONFLICT' && ev.conflictingSources && (
                        <span className="inline-flex items-center gap-1 text-red-700 font-semibold">
                          <AlertTriangle className="h-3 w-3" />
                          Konflik: {ev.conflictingSources.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmDriveModal
        open={confirmDriveOpen}
        title="Unggah Dokumen ke Brand Library Google Drive"
        description={`Dokumen "${pendingDriveFile?.name}" akan disimpan ke folder terpisah "${state.systemConfig.brandLibraryRootFolderName} / ${activeClient?.name}". Folder Ready To Post tidak akan diubah.`}
        targetFolderLabel={`${state.systemConfig.brandLibraryRootFolderName} / ${activeClient?.name}`}
        affectedFiles={pendingDriveFile ? [pendingDriveFile.name] : []}
        confirmLabel="Konfirmasi & Unggah"
        cancelLabel="Batal"
        onConfirm={handleConfirmDriveUpload}
        onCancel={() => {
          setConfirmDriveOpen(false);
          setPendingDriveFile(null);
        }}
      />
    </div>
  );
};
