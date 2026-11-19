# Studio DST V10+ — Brand Intelligence Studio (Master Package)

Paket ini berisi seluruh source code frontend, backend Express + Gemini AI Engine, Google Flow Dispatch webhook, dan production build (`dist/`) Studio DST V10+ tanpa menyertakan file secret (`.env`).

## Isi Paket

- `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts`, `metadata.json`
- `src/` — Seluruh modul React + Tailwind CSS (Workshop, Dompet, Brief, Studio @Lock, Video, Bantuan, Admin, dan 7 modul Brand Intelligence Studio)
- `server.ts` & `server/` — Backend Express, `@google/genai` integration, Google Flow Webhook (`POST /generate` & `POST /api/flow-webhook`), RBAC, Zod validation, dan safe JSON persistence
- `dist/` — Bundle production hasil `npm run build`
- `.env.example` — Template environment variables
- `firebase-applet-config.json` — Konfigurasi Firebase/Drive OAuth klien

## ID & Kontrak Terjaga

- **Google Flow Project ID**: `0803359d-dab1-41ef-b3bf-398167349e36`
- **Google Drive Ready To Post Folder ID**: `1aEn3k_aXdmohkJN545ygm4HGhLbA-5qY`

## Menjalankan Secara Lokal

1. Ekstrak `studio-dst-v10-master-package.zip`
2. Salin `.env.example` menjadi `.env` lalu isi:
   - `GEMINI_API_KEY` (dari Google AI Studio)
   - `FLOW_WEBHOOK_SECRET` (token rahasia acak untuk autentikasi `Authorization: Bearer ...` pada `POST /generate`)
   - `GEMINI_MODEL` (opsional, default `gemini-4-hydrogen`)
3. Install dependencies & jalankan:
   ```bash
   npm install
   npm run build
   npm run dev
   ```
4. Untuk menjalankan mode production:
   ```bash
   NODE_ENV=production npx tsx server.ts
   ```
5. Aplikasi akan berjalan di `http://localhost:3000`.
