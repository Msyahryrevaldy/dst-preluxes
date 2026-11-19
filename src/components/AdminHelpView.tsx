import React, { useEffect, useState } from 'react';
import {
  Download,
  Upload,
  Shield,
  Activity,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  BookOpen,
  Zap,
  RefreshCw,
} from 'lucide-react';
import type { Role, StudioStoreState, SystemConfig, UserAccount } from '../types/studio';
import { apiRequest } from '../services/apiClient';
import { hasRolePermission } from '../utils/brandLogic';
import { ROLLBACK_STORAGE_KEY } from '../utils/storageMigration';
import { FlowIntegrationGuide } from './FlowIntegrationGuide';

interface AdminHelpViewProps {
  mode: 'bantuan' | 'admin';
  state: StudioStoreState;
  activeUser: UserAccount;
  onUpdateConfig: (cfg: SystemConfig) => void;
  onUpdateUserRole: (userId: string, role: Role, assignedClientIds: string[]) => void;
  onRestoreBackup: (nextState: StudioStoreState) => void;
}

interface AiFlowTelemetry {
  geminiStatus: 'UNKNOWN' | 'UNCHECKED' | 'CONNECTED' | 'ERROR' | 'KEY_MISSING';
  lastSuccessfulTestAt: string | null;
  lastTestMessage: string | null;
  lastTestLatencyMs: number | null;
  lastRequestTimestamp: string | null;
  requestSuccessCount: number;
  requestFailureCount: number;
}

interface FlowConfigApiResponse {
  ok: boolean;
  googleFlowProjectId: string;
  googleFlowEndpointUrl: string;
  readyToPostFolderId: string;
  geminiModel: SystemConfig['geminiModel'];
  geminiKeyConfigured: boolean;
  webhookSecretConfigured: boolean;
  telemetry: AiFlowTelemetry;
}

export const AdminHelpView: React.FC<AdminHelpViewProps> = ({
  mode,
  state,
  activeUser,
  onUpdateConfig,
  onUpdateUserRole,
  onRestoreBackup,
}) => {
  const [flowEndpoint, setFlowEndpoint] = useState(state.systemConfig.googleFlowEndpointUrl);
  const [geminiModel, setGeminiModel] = useState(state.systemConfig.geminiModel);
  const [pingResult, setPingResult] = useState<string | null>(null);
  const [pingOk, setPingOk] = useState<boolean | null>(null);
  const [testingTarget, setTestingTarget] = useState<'gemini' | 'flow' | null>(null);
  const [backupNotice, setBackupNotice] = useState<string | null>(null);
  const [helpQuery, setHelpQuery] = useState('');
  const [showGuide, setShowGuide] = useState(true);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  const [serverConfig, setServerConfig] = useState<FlowConfigApiResponse | null>(null);
  const [masterPkgInfo, setMasterPkgInfo] = useState<{
    filename: string;
    sizeBytes: number;
    fileCount: number;
    downloadPath: string;
    downloadUrl: string;
  } | null>(null);

  const isAdmin = hasRolePermission(activeUser.role, 'MANAGE_ADMIN');

  const fetchFlowStatus = async () => {
    try {
      const [flowResp, pkgResp] = await Promise.all([
        fetch('/api/flow/config'),
        fetch('/api/master-package/info'),
      ]);
      if (flowResp.ok) {
        const data = (await flowResp.json()) as FlowConfigApiResponse;
        setServerConfig(data);
      }
      if (pkgResp.ok) {
        const pkgData = await pkgResp.json();
        if (pkgData.ok) {
          setMasterPkgInfo(pkgData);
        }
      }
    } catch {
      // Ignore transient load error; displayed cleanly in panel
    }
  };

  useEffect(() => {
    if (mode === 'admin') {
      void fetchFlowStatus();
    }
  }, [mode]);

  if (mode === 'bantuan') {
    const faqs = [
      {
        title: 'Bagaimana cara kerja Brand Lock di Studio DST V10+?',
        body: 'Brand Lock hanya menyuntikkan Brand Guideline berstatus APPROVED ke prompt Studio dan Google Flow. Pedoman berstatus DRAFT atau REVIEW tidak akan dipakai otomatis.',
      },
      {
        title: 'Apa perbedaan folder Ready To Post dan Brand Library di Google Drive?',
        body: 'Folder Ready To Post (1aEn3k_aXdmohkJN545ygm4HGhLbA-5qY) dipertahankan utuh untuk pengiriman video siap tayang, sedangkan dokumen pedoman klien diunggah ke folder terpisah Studio DST - Brand Library.',
      },
      {
        title: 'Mengapa Visual Consistency Checker menandai kategori sebagai NOT ASSESSABLE?',
        body: 'Jika gambar tidak memuat elemen tertentu (misalnya foto tanpa logo atau tanpa teks headline), AI menandainya NOT ASSESSABLE dan menghitung ulang skor 0–100 secara proporsional tanpa menebak nama file font.',
      },
      {
        title: 'Bagaimana menghubungkan Google Flow Dispatch ke Backend Studio DST?',
        body: 'Google Flow Dispatch memanggil endpoint POST /generate pada backend Express Cloud Run Studio DST dengan header Authorization: Bearer FLOW_WEBHOOK_SECRET dan Project ID 0803359d-dab1-41ef-b3bf-398167349e36. Panduan lengkap tersedia di halaman Admin → AI & Flow Integration.',
      },
      {
        title: 'Matriks Hak Akses Peran (ADMIN, PM, VISUAL_MAKER, VIDEO_MAKER)',
        body: 'ADMIN mengelola seluruh brand, peran, model AI, dan cadangan data. PM mengelola brand yang ditugaskan serta menyetujui pedoman. VISUAL_MAKER dan VIDEO_MAKER membaca pedoman APPROVED, membuat aset/scene, dan menjalankan cek visual.',
      },
    ].filter((f) =>
      `${f.title} ${f.body}`.toLowerCase().includes(helpQuery.trim().toLowerCase())
    );

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">Pusat Bantuan Studio DST V10+</h1>
          <p className="text-sm text-slate-600 mt-1">
            Panduan operasional Brand Intelligence Studio, @Lock, Google Drive, Google Flow, dan tata kelola peran.
          </p>
        </div>

        <div className="rounded-xl border border-[#DDE3F2] bg-white p-4">
          <label htmlFor="help-search" className="sr-only">
            Cari panduan
          </label>
          <input
            id="help-search"
            value={helpQuery}
            onChange={(e) => setHelpQuery(e.target.value)}
            placeholder="Cari panduan (contoh: Brand Lock, Ready To Post, Google Flow, NOT ASSESSABLE)..."
            className="w-full rounded-lg border border-[#DDE3F2] px-3.5 py-2 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqs.map((item, idx) => (
            <div key={idx} className="rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-2">
              <div className="flex items-start gap-2.5">
                <HelpCircle className="h-4 w-4 text-[#05349B] mt-0.5 shrink-0" />
                <h2 className="text-sm font-bold text-[#0F1B3D]">{item.title}</h2>
              </div>
              <p className="text-xs leading-relaxed text-slate-600">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const webhookTargetUrl =
    flowEndpoint.trim() ||
    (typeof window !== 'undefined' ? `${window.location.origin}/generate` : '/generate');

  const handleSaveSystemConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      const updated = await apiRequest<FlowConfigApiResponse & { systemConfig: SystemConfig }>(
        '/api/flow/config',
        activeUser,
        {
          body: {
            geminiModel,
            googleFlowProjectId: state.systemConfig.googleFlowProjectId,
            googleFlowEndpointUrl: flowEndpoint,
          },
        }
      );
      onUpdateConfig({
        ...state.systemConfig,
        geminiModel,
        googleFlowEndpointUrl: flowEndpoint,
      });
      setServerConfig((prev) => ({
        ok: true,
        googleFlowProjectId: state.systemConfig.googleFlowProjectId,
        googleFlowEndpointUrl: flowEndpoint,
        readyToPostFolderId: state.systemConfig.readyToPostFolderId,
        geminiModel,
        geminiKeyConfigured: updated.geminiKeyConfigured ?? prev?.geminiKeyConfigured ?? false,
        webhookSecretConfigured: updated.webhookSecretConfigured ?? prev?.webhookSecretConfigured ?? false,
        telemetry: updated.telemetry ?? prev?.telemetry ?? {
          geminiStatus: 'UNCHECKED',
          lastSuccessfulTestAt: null,
          lastTestMessage: null,
          lastTestLatencyMs: null,
          lastRequestTimestamp: null,
          requestSuccessCount: 0,
          requestFailureCount: 0,
        },
      }));
      setPingOk(true);
      setPingResult('Konfigurasi model Gemini & Google Flow berhasil disimpan di server.');
    } catch (err: unknown) {
      setPingOk(false);
      setPingResult(err instanceof Error ? err.message : 'Gagal menyimpan konfigurasi.');
    }
  };

  const handleTestGeminiConnection = async () => {
    setTestingTarget('gemini');
    setPingOk(null);
    setPingResult('Menguji koneksi langsung ke Gemini API di server...');
    try {
      const res = await fetch('/api/flow/test-ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'gemini', model: geminiModel }),
      });
      const data = await res.json();
      setPingOk(Boolean(data.ok));
      setPingResult(data.message || JSON.stringify(data));
      if (data.telemetry) {
        setServerConfig((prev) => ({
          ok: true,
          googleFlowProjectId: data.projectId || state.systemConfig.googleFlowProjectId,
          googleFlowEndpointUrl: prev?.googleFlowEndpointUrl || flowEndpoint,
          readyToPostFolderId: prev?.readyToPostFolderId || state.systemConfig.readyToPostFolderId,
          geminiModel: data.model || geminiModel,
          geminiKeyConfigured: Boolean(data.geminiKeyConfigured),
          webhookSecretConfigured: Boolean(data.webhookSecretConfigured),
          telemetry: data.telemetry,
        }));
      }
    } catch (err: unknown) {
      setPingOk(false);
      setPingResult(err instanceof Error ? err.message : 'Gagal menguji koneksi Gemini.');
    } finally {
      setTestingTarget(null);
    }
  };

  const handleTestFlowEndpoint = async () => {
    setTestingTarget('flow');
    setPingOk(null);
    setPingResult('Memeriksa jangkauan & respons endpoint Google Flow...');
    try {
      const res = await fetch('/api/flow/test-ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: 'flow', endpointUrl: flowEndpoint }),
      });
      const data = await res.json();
      setPingOk(Boolean(data.ok));
      setPingResult(data.message || JSON.stringify(data));
      if (data.telemetry) {
        setServerConfig((prev) =>
          prev
            ? {
                ...prev,
                geminiKeyConfigured: Boolean(data.geminiKeyConfigured),
                webhookSecretConfigured: Boolean(data.webhookSecretConfigured),
                telemetry: data.telemetry,
              }
            : prev
        );
      }
    } catch (err: unknown) {
      setPingOk(false);
      setPingResult(err instanceof Error ? err.message : 'Ping endpoint Flow gagal.');
    } finally {
      setTestingTarget(null);
    }
  };

  const handleCopyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookTargetUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } catch {
      setPingOk(false);
      setPingResult(`Salin URL secara manual: ${webhookTargetUrl}`);
    }
  };

  const handleViewGuide = () => {
    setShowGuide(true);
    setTimeout(() => {
      document.getElementById('flow-integration-guide')?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  };

  const handleDownloadBackup = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `studio-dst-v10-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupNotice('File cadangan JSON berhasil diunduh.');
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as StudioStoreState;
      if (!Array.isArray(parsed.clients) || !Array.isArray(parsed.workspaces)) {
        throw new Error('Format JSON backup tidak valid.');
      }
      await apiRequest('/api/restore', activeUser, { body: { state: parsed } });
      onRestoreBackup(parsed);
      setBackupNotice('Data Studio DST berhasil dipulihkan dari file backup.');
    } catch (err: unknown) {
      setBackupNotice(err instanceof Error ? err.message : 'Gagal memulihkan backup.');
    }
  };

  const hasRollback =
    typeof window !== 'undefined' && Boolean(window.localStorage.getItem(ROLLBACK_STORAGE_KEY));

  const telemetry = serverConfig?.telemetry;
  const geminiStatus = telemetry?.geminiStatus ?? 'UNCHECKED';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#0F1B3D]">Admin, AI Engine, Flow & Peran</h1>
        <p className="text-sm text-slate-600 mt-1">
          Kelola model Gemini server-side, integrasi Google Flow Dispatch, RBAC tim, serta cadangan data.
        </p>
      </div>

      {!isAdmin && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs font-semibold text-amber-900">
          Anda masuk sebagai {activeUser.role}. Pengaturan Admin hanya dapat diubah oleh peran ADMIN (penegakan aktif di frontend dan backend).
        </div>
      )}

      {/* AI & Flow Integration Status Telemetry Panel */}
      <section
        aria-labelledby="ai-flow-panel-heading"
        className="rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDE3F2] pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#05349B]" />
            <h2 id="ai-flow-panel-heading" className="text-base font-bold text-[#0F1B3D]">
              AI & Flow Integration
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTestGeminiConnection}
              disabled={testingTarget !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#05349B] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#042878] disabled:opacity-50"
            >
              {testingTarget === 'gemini' ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Activity className="h-3.5 w-3.5" />
              )}
              TEST GEMINI CONNECTION
            </button>
            <button
              type="button"
              onClick={handleTestFlowEndpoint}
              disabled={testingTarget !== null}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3F2] bg-white px-3.5 py-2 text-xs font-semibold text-[#0F1B3D] hover:border-[#05349B] disabled:opacity-50"
            >
              {testingTarget === 'flow' && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              Test Flow Endpoint
            </button>
            <button
              type="button"
              onClick={handleCopyWebhookUrl}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] px-3.5 py-2 text-xs font-semibold text-[#0F1B3D] hover:border-[#05349B]"
            >
              {copiedWebhook ? <Check className="h-3.5 w-3.5 text-emerald-700" /> : <Copy className="h-3.5 w-3.5" />}
              {copiedWebhook ? 'Webhook URL Tersalin' : 'Copy Webhook URL'}
            </button>
            <button
              type="button"
              onClick={handleViewGuide}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#05349B] bg-white px-3.5 py-2 text-xs font-semibold text-[#05349B] hover:bg-[#F4F6FC]"
            >
              <BookOpen className="h-3.5 w-3.5" />
              View Integration Guide
            </button>
          </div>
        </div>

        {/* 9 Telemetry Indicators */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3">
            <div className="text-slate-500 font-semibold">1. Status Koneksi Gemini API</div>
            <div className="mt-1 flex items-center gap-1.5 font-mono font-bold">
              {geminiStatus === 'CONNECTED' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span className="text-emerald-700">CONNECTED</span>
                </>
              ) : geminiStatus === 'UNCHECKED' || geminiStatus === 'UNKNOWN' ? (
                <span className="text-[#05349B]">SIAP DIUJI (Klik TEST GEMINI CONNECTION)</span>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-red-700">{geminiStatus}</span>
                </>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3">
            <div className="text-slate-500 font-semibold">2. Model Gemini Aktif</div>
            <div className="mt-1 font-mono font-bold text-[#0F1B3D]">
              {serverConfig?.geminiModel || geminiModel}
            </div>
          </div>

          <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3">
            <div className="text-slate-500 font-semibold">3. Flow Project ID</div>
            <div className="mt-1 font-mono text-[11px] font-bold text-[#0F1B3D] break-all">
              {serverConfig?.googleFlowProjectId || state.systemConfig.googleFlowProjectId}
            </div>
          </div>

          <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3 sm:col-span-2 lg:col-span-1">
            <div className="text-slate-500 font-semibold">4. Flow Endpoint URL (Cloud Run)</div>
            <div className="mt-1 font-mono text-[11px] text-[#0F1B3D] break-all">
              {webhookTargetUrl}
            </div>
          </div>

          <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3">
            <div className="text-slate-500 font-semibold">5. Webhook Auth (FLOW_WEBHOOK_SECRET)</div>
            <div
              className={`mt-1 font-mono font-bold ${
                serverConfig?.webhookSecretConfigured ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {serverConfig ? (serverConfig.webhookSecretConfigured ? 'Configured' : 'Not Configured') : 'Checking...'}
            </div>
          </div>

          <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3">
            <div className="text-slate-500 font-semibold">6. Gemini API Key (Secret Manager)</div>
            <div
              className={`mt-1 font-mono font-bold ${
                serverConfig?.geminiKeyConfigured ? 'text-emerald-700' : 'text-red-700'
              }`}
            >
              {serverConfig ? (serverConfig.geminiKeyConfigured ? 'Configured' : 'Not Configured') : 'Checking...'}
            </div>
          </div>

          <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3">
            <div className="text-slate-500 font-semibold">7. Pengujian Sukses Terakhir</div>
            <div className="mt-1 font-mono text-[11px] text-[#0F1B3D]">
              {telemetry?.lastSuccessfulTestAt
                ? `${new Date(telemetry.lastSuccessfulTestAt).toLocaleString('id-ID')} (${telemetry.lastTestLatencyMs ?? 0}ms)`
                : 'Belum diuji pada sesi server ini'}
            </div>
          </div>

          <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3">
            <div className="text-slate-500 font-semibold">8. Request AI Terakhir</div>
            <div className="mt-1 font-mono text-[11px] text-[#0F1B3D]">
              {telemetry?.lastRequestTimestamp
                ? new Date(telemetry.lastRequestTimestamp).toLocaleString('id-ID')
                : 'Belum ada eksekusi'}
            </div>
          </div>

          <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3">
            <div className="text-slate-500 font-semibold">9. Jumlah Request AI (Sukses / Gagal)</div>
            <div className="mt-1 font-mono font-bold text-[#0F1B3D] tabular-nums">
              <span className="text-emerald-700">{telemetry?.requestSuccessCount ?? 0} Sukses</span>
              <span className="mx-1.5 text-slate-400">/</span>
              <span className="text-red-700">{telemetry?.requestFailureCount ?? 0} Gagal</span>
            </div>
          </div>
        </div>

        {pingResult && (
          <div
            className={`rounded-lg border p-3 text-xs font-medium ${
              pingOk === true
                ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                : pingOk === false
                ? 'border-red-200 bg-red-50 text-red-900'
                : 'border-[#DDE3F2] bg-[#F4F6FC] text-[#0F1B3D]'
            }`}
          >
            {pingResult}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Model & Flow Config Form */}
        <form
          onSubmit={handleSaveSystemConfig}
          className="lg:col-span-6 rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4"
        >
          <div className="flex items-center gap-2 text-base font-bold text-[#0F1B3D]">
            <Activity className="h-4 w-4 text-[#05349B]" />
            Konfigurasi Gemini & Google Flow
          </div>

          <div>
            <label htmlFor="admin-gemini-model" className="block text-xs font-semibold text-[#0F1B3D] mb-1">
              Model Gemini Aktif (Server-Side)
            </label>
            <select
              id="admin-gemini-model"
              disabled={!isAdmin}
              value={geminiModel}
              onChange={(e) => setGeminiModel(e.target.value as SystemConfig['geminiModel'])}
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-sm font-mono"
            >
              <option value="gemini-4-hydrogen">gemini-4-hydrogen (Default Cepat & Multimodal)</option>
              <option value="gemini-4-argon">gemini-4-argon (Analisis Kompleks)</option>
              <option value="gemini-4-carbon">gemini-4-carbon (Deep Reasoning)</option>
              <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Ringan)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#0F1B3D] mb-1">
              Google Flow Project ID (Terjaga)
            </label>
            <input
              readOnly
              value={state.systemConfig.googleFlowProjectId}
              className="w-full rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] px-3 py-2 text-xs font-mono text-slate-600"
            />
          </div>

          <div>
            <label htmlFor="flow-endpoint" className="block text-xs font-semibold text-[#0F1B3D] mb-1">
              Google Flow Provider Endpoint URL (Cloud Run Webhook)
            </label>
            <input
              id="flow-endpoint"
              disabled={!isAdmin}
              value={flowEndpoint}
              onChange={(e) => setFlowEndpoint(e.target.value)}
              placeholder="https://ais-pre-...run.app/generate"
              className="w-full rounded-lg border border-[#DDE3F2] px-3 py-2 text-xs font-mono"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3">
              <div className="font-semibold text-[#0F1B3D]">Ready To Post Folder ID</div>
              <div className="mt-1 font-mono text-[11px] text-slate-600 break-all">
                {state.systemConfig.readyToPostFolderId}
              </div>
            </div>
            <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3">
              <div className="font-semibold text-[#0F1B3D]">Brand Library Root</div>
              <div className="mt-1 font-mono text-[11px] text-slate-600">
                {state.systemConfig.brandLibraryRootFolderName}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={!isAdmin}
              className="rounded-lg bg-[#05349B] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              Simpan Konfigurasi
            </button>
          </div>
        </form>

        {/* Backup & Restore */}
        <div className="lg:col-span-6 rounded-xl border border-[#DDE3F2] bg-white p-5 space-y-4">
          <div className="flex items-center gap-2 text-base font-bold text-[#0F1B3D]">
            <Shield className="h-4 w-4 text-[#05349B]" />
            Cadangan, Pemulihan & Migrasi Aman
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            Skema penyimpanan lokal saat ini berada pada Versi {state.schemaVersion}. Ekspor JSON cadangan sebelum pembaruan besar atau pulihkan data kapan saja.
          </p>

          <div className="flex flex-wrap gap-3">
            <a
              href="/api/master-package/download?refresh=1"
              download="studio-dst-v10-master-package.zip"
              className="inline-flex items-center gap-2 rounded-lg bg-[#FDCB02] px-4 py-2 text-xs font-extrabold text-[#0F1B3D] hover:brightness-95"
            >
              <Download className="h-3.5 w-3.5" />
              Unduh Master Package Website (.zip)
            </a>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="inline-flex items-center gap-2 rounded-lg bg-[#05349B] px-4 py-2 text-xs font-semibold text-white"
            >
              <Download className="h-3.5 w-3.5" />
              Unduh Backup JSON
            </button>
            <label className="inline-flex items-center gap-2 rounded-lg border border-[#DDE3F2] bg-white px-4 py-2 text-xs font-semibold text-[#0F1B3D] cursor-pointer hover:bg-[#F4F6FC]">
              <Upload className="h-3.5 w-3.5" />
              Pulihkan dari JSON
              <input
                type="file"
                accept=".json,application/json"
                disabled={!isAdmin}
                onChange={handleRestoreFile}
                className="sr-only"
              />
            </label>
          </div>

          {masterPkgInfo && (
            <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3 text-xs text-slate-700 space-y-1">
              <div className="font-bold text-[#0F1B3D]">
                Master Package Tersedia: <span className="font-mono">{masterPkgInfo.filename}</span>
              </div>
              <div className="font-mono text-[11px] text-slate-600">
                Lokasi folder workspace: {masterPkgInfo.downloadPath} · {masterPkgInfo.fileCount} file ·{' '}
                {(masterPkgInfo.sizeBytes / 1024).toFixed(1)} KB (tanpa secret)
              </div>
            </div>
          )}

          {backupNotice && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
              {backupNotice}
            </div>
          )}

          <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-3 text-xs text-slate-600">
            Status Rollback Lokal: {hasRollback ? 'Snapshot V9 tersimpan aman' : 'Siap (Skema V10 aktif)'}
          </div>

          {/* Role Management Table */}
          <div className="pt-3 border-t border-[#DDE3F2]">
            <h3 className="text-xs font-bold text-[#0F1B3D] mb-2">Manajemen Peran Tim</h3>
            <div className="space-y-2">
              {state.users.map((u) => (
                <div
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#DDE3F2] p-2.5 text-xs"
                >
                  <div>
                    <div className="font-bold text-[#0F1B3D]">{u.name}</div>
                    <div className="text-slate-500">{u.email}</div>
                  </div>
                  <select
                    aria-label={`Peran untuk ${u.name}`}
                    disabled={!isAdmin}
                    value={u.role}
                    onChange={(e) => onUpdateUserRole(u.id, e.target.value as Role, u.assignedClientIds)}
                    className="rounded-md border border-[#DDE3F2] px-2 py-1 text-xs font-semibold"
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="PM">PM</option>
                    <option value="VISUAL_MAKER">VISUAL_MAKER</option>
                    <option value="VIDEO_MAKER">VIDEO_MAKER</option>
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Step-by-Step Google Flow Dispatch + Google AI Studio Integration Guide */}
      {showGuide && (
        <FlowIntegrationGuide
          projectId={state.systemConfig.googleFlowProjectId}
          webhookUrl={webhookTargetUrl}
        />
      )}
    </div>
  );
};

