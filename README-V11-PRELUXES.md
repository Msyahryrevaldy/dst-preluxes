# Studio DST V11 — Gabungan dengan Preluxes

Paket ini = **Studio DST V10+ (tidak diubah isinya, hanya ditambah)** + **Preluxes** sebagai klien baru + **source website Preluxes** di `sites/preluxes`.

## Yang ditambahkan

| Area | Isi |
| --- | --- |
| Klien Preluxes | Client `preluxes`, Brand Workspace, Brand Guideline V1 berstatus APPROVED (6 warna, 3 font, 4 logo, 4 bukti dari brand tokens), channel konten, 2 aset |
| Platform | Preluxes hanya IG, Facebook, TikTok (LinkedIn tidak muncul untuk Preluxes; klien lain tidak berubah). Dijaga juga di server (`/api/brand/content/generate`) |
| Tab **Website** | Pratinjau live storefront (desktop/mobile, 9 halaman), tabel katalog, checklist kesiapan tayang, simpan URL website (Admin) |
| Jadwal konten | Tombol "Buat jadwal" membuat draft IG/FB/TikTok dari katalog: Sel/Kam/Sab, 7/14/30 hari. IG = carousel 5 slide, TikTok = naskah + 4 scene, Facebook = gambar + link produk. Semua DRAFT, ID deterministik (klik ulang tidak menggandakan) |
| Server | `GET /api/preluxes/info`, `GET /api/preluxes/catalog` (live, fallback ke katalog bawaan), `POST /api/preluxes/config` (Admin) |
| Data lama | Pengguna Studio DST yang sudah punya data tersimpan otomatis mendapat klien Preluxes tanpa ada data yang ditimpa |
| Website | `sites/preluxes` = source Preluxes utuh (port 3001). `sites/preluxes/brand-kit-archive` = arsip brand kit dari paket asli (feeds, logo, tokens, handoff; foto produk sudah ada di `sites/preluxes/src/assets/images`) |

## Menjalankan

```bash
npm install
npm run install:site
cp .env.example .env        # isi GEMINI_API_KEY dan FLOW_WEBHOOK_SECRET
npm run dev:all             # Studio DST :3000 + Preluxes :3001
```

Buka http://localhost:3000 → pilih klien **PLX · Preluxes** → menu **Website**.
Setelah website di-deploy, isi `PRELUXES_SITE_URL` (atau lewat kolom URL di tab Website).

## Sebelum website dan konten tayang

Tab Website menandai ini otomatis: semua 6 produk masih **DEMO**, nomor WhatsApp masih placeholder `+62 812-0000-0000`, dan link produk masih `localhost`. Handle Instagram dan email di brand kit juga masih bertanda "(Konsep)" / "(Placeholder)". Ganti sebelum posting.

## Catatan teknis

- `esbuild` dinaikkan ke `^0.28.0` di kedua proyek karena `^0.25` bentrok dengan peer dependency `vite@8.3` (`npm install` sebelumnya gagal ERESOLVE).
- Port HMR website dipisah (24679) supaya dua dev server tidak bentrok.
- Posting otomatis ke platform (Meta Graph API / TikTok) belum disambungkan di paket ini. Jadwal berhenti di status DRAFT → review di Social Media Studio.
- Tes: `npm test` (Studio DST, 21 tes) dan `npm --prefix sites/preluxes test` (website, 11 tes).
