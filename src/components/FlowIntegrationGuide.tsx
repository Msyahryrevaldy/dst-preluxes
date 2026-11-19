import React, { useState } from 'react';
import { BookOpen, Copy, Check, ArrowRight, ShieldAlert, Server, KeyRound, Workflow } from 'lucide-react';

interface FlowIntegrationGuideProps {
  projectId: string;
  webhookUrl: string;
}

export const FlowIntegrationGuide: React.FC<FlowIntegrationGuideProps> = ({
  projectId,
  webhookUrl,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const samplePayload = JSON.stringify(
    {
      projectId,
      prompt: 'Buat konsep visual & arahan produksi untuk kampanye Studio DST sesuai Brand Lock aktif.',
    },
    null,
    2
  );

  const sampleHeaders = `Content-Type: application/json
Authorization: Bearer YOUR_FLOW_WEBHOOK_SECRET`;

  const copySnippet = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <section
      id="flow-integration-guide"
      className="rounded-xl border border-[#DDE3F2] bg-white p-6 space-y-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#DDE3F2] pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#05349B]">
            <BookOpen className="h-4 w-4" />
            Panduan Integrasi Resmi Studio DST V10+
          </div>
          <h2 className="text-lg font-bold text-[#0F1B3D]">
            HOW TO CONNECT GOOGLE FLOW DISPATCH TO GOOGLE AI STUDIO
          </h2>
          <p className="text-xs text-slate-600 max-w-3xl leading-relaxed">
            Panduan langkah demi langkah menghubungkan Google Flow Dispatch (Project ID:{' '}
            <span className="font-mono font-semibold text-[#0F1B3D]">{projectId}</span>) ke engine
            Gemini melalui backend Node.js/Express Studio DST yang berjalan di Google Cloud Run.
          </p>
        </div>
      </div>

      {/* Mengapa AI Studio butuh Backend */}
      <div className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-4 space-y-3">
        <h3 className="text-sm font-bold text-[#0F1B3D] flex items-center gap-2">
          <Server className="h-4 w-4 text-[#05349B]" />
          1. Mengapa Google AI Studio Tidak Dapat Menjadi Penerima Webhook Langsung
        </h3>
        <p className="text-xs text-slate-700 leading-relaxed">
          Google AI Studio (<span className="font-mono">aistudio.google.com</span>) adalah workspace
          prototyping prompt dan manajemen API Key—bukan server publik yang menerima request HTTP{' '}
          <span className="font-mono">POST</span> dari Google Flow Dispatch. Untuk menjalankan
          automasi aman, Google Flow harus memanggil backend perantara (Express server Studio DST
          di Cloud Run) yang memverifikasi Bearer Token, memvalidasi Project ID, lalu memanggil{' '}
          <span className="font-mono">@google/genai</span> di sisi server menggunakan{' '}
          <span className="font-mono">GEMINI_API_KEY</span>.
        </p>

        {/* Architecture Diagram */}
        <div className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center pt-1 text-xs">
          <div className="md:col-span-2 rounded-lg border border-[#DDE3F2] bg-white p-3">
            <div className="font-bold text-[#0F1B3D]">Google Flow Dispatch</div>
            <div className="font-mono text-[11px] text-slate-500 mt-0.5 break-all">
              Project: {projectId}
            </div>
          </div>
          <div className="hidden md:flex justify-center text-[#05349B]">
            <ArrowRight className="h-4 w-4" />
          </div>
          <div className="md:col-span-2 rounded-lg border border-[#05349B] bg-white p-3">
            <div className="font-bold text-[#05349B]">Studio DST Cloud Run</div>
            <div className="font-mono text-[11px] text-slate-600 mt-0.5">
              POST /generate (+ Bearer Auth)
            </div>
          </div>
          <div className="hidden md:flex justify-center text-[#05349B]">
            <ArrowRight className="h-4 w-4" />
          </div>
          <div className="md:col-span-1 rounded-lg border border-[#DDE3F2] bg-white p-3">
            <div className="font-bold text-[#0F1B3D]">Gemini API</div>
            <div className="font-mono text-[11px] text-slate-500 mt-0.5">@google/genai</div>
          </div>
        </div>
      </div>

      {/* Option A vs Option B */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-[#DDE3F2] bg-white p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Workflow className="h-4 w-4 text-slate-500" />
              Opsi A: Otomasi Webhook (n8n / Make)
            </span>
            <span className="text-[11px] font-semibold text-slate-500">Alternatif Eksternal</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Cocok bila tim menggunakan workflow eksternal (n8n atau Make.com) untuk merutekan output
            Flow ke platform lain (Slack, Notion, atau Spreadsheet) sebelum atau sesudah memanggil
            Gemini HTTP API. Memerlukan pengelolaan skenario & kredensial terpisah di luar Studio DST.
          </p>
        </div>

        <div className="rounded-lg border-2 border-[#05349B] bg-[#F4F6FC]/60 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#05349B] flex items-center gap-1.5">
              <KeyRound className="h-4 w-4 text-[#05349B]" />
              Opsi B: Backend Studio DST (Cloud Run Express)
            </span>
            <span className="rounded bg-[#FDCB02] px-2 py-0.5 text-[10px] font-extrabold text-[#0F1B3D]">
              DIREKOMENDASIKAN
            </span>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            Menggunakan endpoint native <span className="font-mono font-semibold">POST /generate</span>{' '}
            (alias <span className="font-mono">/api/flow-webhook</span>) milik Studio DST sendiri.
            Otomatis memakai model Gemini yang dipilih Admin, mewarisi keamanan Secret Manager,
            rate limiting per IP, validasi constant-time Bearer Token, dan logging telemetri live.
          </p>
        </div>
      </div>

      {/* Exact Steps 1 - 5 */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-[#0F1B3D]">
          2. Langkah Pengaturan Detail (Langkah 1 – 5)
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg border border-[#DDE3F2] p-4 space-y-2">
            <div className="font-bold text-[#05349B]">Langkah 1 · Ambil Gemini API Key</div>
            <p className="text-slate-600 leading-relaxed">
              Buka <span className="font-mono text-[#0F1B3D]">https://aistudio.google.com/apikey</span>{' '}
              dan buat atau salin API key untuk project Google Cloud Anda.{' '}
              <strong className="text-[#0F1B3D]">Jangan pernah</strong> menempelkan API key ini ke
              kode frontend, browser localStorage, atau payload Google Flow.
            </p>
          </div>

          <div className="rounded-lg border border-[#DDE3F2] p-4 space-y-2">
            <div className="font-bold text-[#05349B]">
              Langkah 2 · Simpan Secret di Google Cloud Secret Manager
            </div>
            <p className="text-slate-600 leading-relaxed">
              Pada layanan Cloud Run Studio DST, pasang dua environment variable dari Secret Manager:
            </p>
            <ul className="list-disc pl-4 space-y-1 font-mono text-[11px] text-[#0F1B3D]">
              <li>GEMINI_API_KEY = API Key dari Google AI Studio</li>
              <li>FLOW_WEBHOOK_SECRET = Token acak rahasia 32+ karakter (misal: openssl rand -hex 32)</li>
            </ul>
          </div>

          <div className="rounded-lg border border-[#DDE3F2] p-4 space-y-2">
            <div className="font-bold text-[#05349B]">
              Langkah 3 · Atur Model & Endpoint di Admin Studio DST
            </div>
            <p className="text-slate-600 leading-relaxed">
              Di panel <strong>AI & Flow Integration</strong> di atas, pilih model Gemini aktif,
              pastikan URL endpoint mengarah ke deployment Cloud Run{' '}
              <span className="font-mono text-[#0F1B3D]">/generate</span>, simpan konfigurasi, lalu
              klik <strong>TEST GEMINI CONNECTION</strong> hingga status menunjukkan{' '}
              <span className="font-mono font-bold text-emerald-700">CONNECTED</span>.
            </p>
          </div>

          <div className="rounded-lg border border-[#DDE3F2] p-4 space-y-2">
            <div className="font-bold text-[#05349B]">
              Langkah 5 · Deploy Cloud Run & Verifikasi Live
            </div>
            <p className="text-slate-600 leading-relaxed">
              Deploy ulang layanan Cloud Run dengan <span className="font-mono">npm run build</span>{' '}
              dan secret terpasang. Lalu klik <strong>Test Flow Endpoint</strong> di panel Admin atau
              uji <span className="font-mono">GET {webhookUrl}</span> (harus merespons HTTP 200{' '}
              <span className="font-mono">Studio DST AI Engine Ready</span>).
            </p>
          </div>
        </div>

        {/* Step 4 Exact HTTP Payload Block */}
        <div className="rounded-lg border border-[#DDE3F2] bg-[#0F1B3D] text-slate-100 p-4 space-y-3 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-[#FDCB02]">
              Langkah 4 · Konfigurasi HTTP Request di Google Flow Dispatch
            </div>
            <span className="font-mono text-[11px] text-slate-300">Method: POST</span>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>Webhook Endpoint URL</span>
              <button
                type="button"
                onClick={() => copySnippet('url', webhookUrl)}
                className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[11px] text-white hover:bg-white/20"
              >
                {copiedId === 'url' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copiedId === 'url' ? 'Tersalin' : 'Salin URL'}
              </button>
            </div>
            <pre className="rounded bg-black/30 p-2.5 font-mono text-[11px] overflow-x-auto text-emerald-300">
              POST {webhookUrl}
            </pre>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>HTTP Headers</span>
                <button
                  type="button"
                  onClick={() => copySnippet('headers', sampleHeaders)}
                  className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[11px] text-white hover:bg-white/20"
                >
                  {copiedId === 'headers' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedId === 'headers' ? 'Tersalin' : 'Salin Headers'}
                </button>
              </div>
              <pre className="rounded bg-black/30 p-2.5 font-mono text-[11px] overflow-x-auto">
                {sampleHeaders}
              </pre>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>JSON Request Body</span>
                <button
                  type="button"
                  onClick={() => copySnippet('body', samplePayload)}
                  className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 text-[11px] text-white hover:bg-white/20"
                >
                  {copiedId === 'body' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {copiedId === 'body' ? 'Tersalin' : 'Salin JSON'}
                </button>
              </div>
              <pre className="rounded bg-black/30 p-2.5 font-mono text-[11px] overflow-x-auto">
                {samplePayload}
              </pre>
            </div>
          </div>
        </div>
      </div>

      {/* Troubleshooting Table */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-[#0F1B3D] flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-[#05349B]" />
          3. Troubleshooting Kode Error & Kendala Deployment
        </h3>
        <div className="overflow-x-auto rounded-lg border border-[#DDE3F2]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F4F6FC] border-b border-[#DDE3F2] text-[#0F1B3D]">
              <tr>
                <th className="py-2.5 px-3 font-bold">Error / Kondisi</th>
                <th className="py-2.5 px-3 font-bold">Penyebab Utama</th>
                <th className="py-2.5 px-3 font-bold">Solusi Cepat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDE3F2] text-slate-700">
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-red-700">HTTP 401</td>
                <td className="py-2.5 px-3">
                  Header <span className="font-mono">Authorization: Bearer ...</span> tidak ada, salah,
                  atau <span className="font-mono">FLOW_WEBHOOK_SECRET</span> belum diset di Cloud Run.
                </td>
                <td className="py-2.5 px-3">
                  Pastikan secret <span className="font-mono">FLOW_WEBHOOK_SECRET</span> terpasang di
                  Cloud Run dan sama persis dengan token di Google Flow Dispatch.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-red-700">HTTP 403</td>
                <td className="py-2.5 px-3">
                  Field <span className="font-mono">projectId</span> pada body JSON tidak cocok dengan{' '}
                  <span className="font-mono">{projectId}</span>.
                </td>
                <td className="py-2.5 px-3">
                  Perbaiki <span className="font-mono">projectId</span> di JSON Flow Dispatch agar sama
                  persis dengan Project ID terdaftar.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-amber-700">HTTP 404</td>
                <td className="py-2.5 px-3">
                  URL webhook salah path atau deployment Cloud Run masih menjalankan versi lama tanpa
                  route <span className="font-mono">POST /generate</span>.
                </td>
                <td className="py-2.5 px-3">
                  Pastikan URL berakhiran <span className="font-mono">/generate</span> (atau{' '}
                  <span className="font-mono">/api/flow-webhook</span>) dan deploy ulang revisi terbaru.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-mono font-bold text-red-700">HTTP 500</td>
                <td className="py-2.5 px-3">
                  Kegagalan eksekusi internal Gemini API, timeout jaringan, atau payload response tidak valid.
                </td>
                <td className="py-2.5 px-3">
                  Jalankan <strong>TEST GEMINI CONNECTION</strong> di Admin untuk melihat pesan diagnosa
                  langsung dari server tanpa mengekspos secret.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-[#0F1B3D]">API Key Tidak Valid</td>
                <td className="py-2.5 px-3">
                  <span className="font-mono">GEMINI_API_KEY</span> kosong, kadaluwarsa, atau dibatasi
                  izin API-nya.
                </td>
                <td className="py-2.5 px-3">
                  Buat key baru di Google AI Studio, perbarui Secret Manager, lalu restart revisi Cloud Run.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-[#0F1B3D]">Model Tidak Tersedia</td>
                <td className="py-2.5 px-3">
                  Model Gemini yang dipilih belum aktif di region/tier API key saat ini.
                </td>
                <td className="py-2.5 px-3">
                  Ganti model aktif di Admin (mis. ke <span className="font-mono">gemini-4-hydrogen</span>{' '}
                  atau <span className="font-mono">gemini-3.1-flash-lite</span>) lalu simpan & test ulang.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-semibold text-[#0F1B3D]">Kendala Deployment Cloud Run</td>
                <td className="py-2.5 px-3">
                  Build production gagal, port bukan 3000/PORT env, atau ingress Cloud Run memblokir trafik publik.
                </td>
                <td className="py-2.5 px-3">
                  Pastikan <span className="font-mono">npm run build</span> sukses, start script{' '}
                  <span className="font-mono">node server.ts</span> / tsx aktif, dan Allow unauthenticated
                  invocations aktif (karena auth dijaga Bearer Token).
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
