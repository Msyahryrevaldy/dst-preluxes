import type {
  BrandAsset,
  BrandGuideline,
  BrandWorkspace,
  ClientRecord,
  ContentChannel,
  SocialPlatform,
} from '../types/studio';

/**
 * Preluxes — klien baru Studio DST (v11).
 * Sumber: Preluxes Master Package (AGENCY_MASTER_HANDOFF.md + preluxes-brand-tokens.json).
 * Semua nilai warna/tipografi/logo di bawah disalin dari brand kit resmi Preluxes.
 */

export const PRELUXES_CLIENT_ID = 'preluxes';
export const PRELUXES_WORKSPACE_ID = 'ws-preluxes';
export const PRELUXES_GUIDELINE_ID = 'gl-preluxes-v1';
export const PRELUXES_CHANNEL_ID = 'ch-preluxes-social';

/** Preluxes hanya dijadwalkan ke 3 platform. LinkedIn sengaja tidak dipakai. */
export const PRELUXES_PLATFORMS: SocialPlatform[] = ['Instagram', 'Facebook', 'TikTok'];

export const ALL_SOCIAL_PLATFORMS: SocialPlatform[] = ['Instagram', 'TikTok', 'Facebook', 'LinkedIn'];

export function getAllowedPlatforms(clientId: string | undefined | null): SocialPlatform[] {
  return clientId === PRELUXES_CLIENT_ID ? PRELUXES_PLATFORMS : ALL_SOCIAL_PLATFORMS;
}

export const PRELUXES_CLIENT: ClientRecord = {
  id: PRELUXES_CLIENT_ID,
  name: 'Preluxes',
  code: 'PLX',
  industry: 'Curated Secondhand Fashion Marketplace',
  active: true,
  monthlyVideoTarget: 12,
  monthlyVideoCompleted: 0,
  defaultChannelId: PRELUXES_CHANNEL_ID,
};

export const PRELUXES_CHANNEL: ContentChannel = {
  id: PRELUXES_CHANNEL_ID,
  name: 'Preluxes Social (IG · Facebook · TikTok)',
  clientId: PRELUXES_CLIENT_ID,
  platform: 'Instagram, Facebook & TikTok (4:5 / 1:1 / 9:16)',
  visualStyle:
    'Editorial hangat dan tenang: foto produk pada latar warm ivory #FAF7F2, cahaya natural lembut, aksen peach #E9BBAA, detail bahan dan jahitan terlihat jelas',
  characterLockPreset:
    'Tanpa karakter tetap. Fokus pada satu produk unik per konten; model (jika ada) berpose natural, tanpa ekspresi berlebihan',
  sceneStructure:
    'Produk (0-3s) -> Ukuran cm aktual (3-8s) -> Catatan kondisi jujur (8-14s) -> Harga & cara reservasi (14-20s)',
  safeZoneSpec: 'Sisakan 22% bawah dan 14% kanan untuk caption dan action bar TikTok/Reels; margin luar 8% untuk feed 4:5',
  negativeDirectives:
    'Jangan memakai klaim berlebihan ("luxury steal", "harga terbaik"), jangan menyembunyikan cacat produk, jangan mengubah warna asli barang lewat filter berat',
  targetMonthly: 12,
  producedMonthly: 0,
};

export const PRELUXES_WORKSPACE: BrandWorkspace = {
  id: PRELUXES_WORKSPACE_ID,
  clientId: PRELUXES_CLIENT_ID,
  brandName: 'Preluxes',
  companyProfile:
    'Marketplace fashion secondhand terkurasi dengan satu pemilik (single-owner): tas, pakaian, alas kaki, dan aksesori. Setiap barang unik (1 unit), dilengkapi grade kondisi A–D, ukuran cm aktual, dan catatan cacat yang jujur.',
  industry: 'Curated Secondhand Fashion Marketplace',
  targetAudience:
    'Pembeli fashion sadar kualitas di Indonesia yang menghargai barang berkarakter, transparansi kondisi, dan pembelian yang lebih berkelanjutan.',
  productsServices:
    'Tas, pakaian, alas kaki, dan aksesori secondhand terkurasi; checkout via website atau konfirmasi pembayaran lewat WhatsApp Admin.',
  mission:
    'Membuat barang berkualitas menemukan pemilik berikutnya dengan informasi yang jujur: bentuk, bahan, ukuran cm, dan kondisi aktual.',
  vision: 'Menjadi rujukan fashion secondhand terkurasi yang dipercaya karena transparansinya.',
  positioning: 'Secondhand terkurasi yang tenang, transparan, dan praktis, bukan "thrift murah", tetapi pilihan yang dirawat.',
  uvp: 'Grade kondisi A–D, ukuran cm aktual, dan catatan cacat terbuka di setiap barang unik.',
  brandLibraryFolderName: 'Studio DST - Brand Library / Preluxes',
  primaryColorPreview: '#E9BBAA',
  secondaryColorPreview: '#30302E',
  createdAt: '2026-11-18T10:00:00.000Z',
  updatedAt: '2026-11-18T10:00:00.000Z',
};

export const PRELUXES_GUIDELINE: BrandGuideline = {
  brandId: PRELUXES_WORKSPACE_ID,
  clientId: PRELUXES_CLIENT_ID,
  activeVersionId: PRELUXES_GUIDELINE_ID,
  versions: [
    {
      id: PRELUXES_GUIDELINE_ID,
      brandId: PRELUXES_WORKSPACE_ID,
      clientId: PRELUXES_CLIENT_ID,
      versionNumber: 1,
      status: 'APPROVED',
      sections: {
        brandIdentity:
          'Preluxes — "Temukan yang berharga. Rawat lebih lama." Marketplace fashion secondhand terkurasi (single-owner) dengan barang unik 1-of-1.',
        logoSystem:
          'Wordmark serif huruf kecil "preluxes" dengan lengkung khas di atas "x-es". Selalu pakai ink charcoal #30302E di atas latar ivory #FAF7F2 atau peach #E9BBAA. Varian: wordmark charcoal, kartu banner peach, dan badge avatar ivory 400×400.',
        colorSystem:
          'Peach #E9BBAA sebagai aksen utama (CTA, announcement bar, badge aktif); hover #DFA691; kanvas ivory #FAF7F2; kartu putih #FFFFFF; teks dan garis #30302E; aksen sekunder Pale Sky #BCD2DF untuk badge kondisi dan perawatan.',
        typography:
          'Libre Baskerville (serif) untuk wordmark, judul, dan cerita editorial; Plus Jakarta Sans untuk navigasi, spesifikasi, dan tombol; JetBrains Mono (tabular) untuk harga, SKU, ukuran cm, dan nomor pesanan.',
        photography:
          'Foto produk editorial hangat pada latar ivory, cahaya natural lembut. Tampilkan bentuk, bahan, jahitan, dan tanda pemakaian secara apa adanya; sertakan foto detail untuk setiap cacat yang dicatat.',
        illustration: 'Tidak ada gaya ilustrasi resmi. Gunakan foto produk; elemen grafis cukup garis tipis (hairline) charcoal dan blok peach.',
        composition:
          'Feed 4:5 dengan margin luar minimal 8%. Satu produk per frame, ruang negatif lega, teks harga dan grade dalam JetBrains Mono. Untuk Reels/TikTok sisakan safe zone bawah 22% dan kanan 14%.',
        toneOfVoice:
          'Hangat, tenang, transparan, halus, dan praktis. Tidak pernah melebih-lebihkan ("luxury steal!", "harga terbaik!"). Selalu sebut bentuk, bahan, ukuran cm aktual, dan catatan kondisi yang jujur.',
        messaging:
          'Tagline: "Temukan yang berharga. Rawat lebih lama." (EN: "Find what endures. Care for it longer."). Pesan inti: barang unik, kondisi jujur, ukuran jelas, reservasi mudah via website atau WhatsApp Admin.',
        dosList: [
          'Cantumkan Grade kondisi (A/B/C/D), ukuran cm aktual, material, dan catatan cacat di setiap konten produk.',
          'Tulis harga dalam format Rp dan sebutkan stok "1 unit unik".',
          'Gunakan teks charcoal #30302E di atas ivory/peach agar kontras tetap tinggi.',
          'Arahkan CTA ke website atau chat WhatsApp Admin untuk reservasi.',
        ],
        dontsList: [
          'Jangan memakai klaim berlebihan atau urgensi palsu (mis. "luxury steal", "best price ever").',
          'Jangan menyembunyikan atau memperhalus cacat produk.',
          'Jangan mengubah warna asli barang dengan filter berat.',
          'Jangan mengubah proporsi, warna, atau lengkung logo wordmark.',
        ],
      },
      swatches: [
        { id: 'sw-plx-1', name: 'Main Peach', hex: '#E9BBAA', role: 'PRIMARY', usageRule: 'CTA utama, announcement bar, badge aktif, kartu aksen brand', verified: true },
        { id: 'sw-plx-2', name: 'Peach Hover', hex: '#DFA691', role: 'ACCENT', usageRule: 'Status hover/pressed untuk elemen peach', verified: true },
        { id: 'sw-plx-3', name: 'Charcoal Ink', hex: '#30302E', role: 'SECONDARY', usageRule: 'Teks utama, judul, garis tipis, wordmark', verified: true },
        { id: 'sw-plx-4', name: 'Warm Ivory', hex: '#FAF7F2', role: 'NEUTRAL', usageRule: 'Latar halaman dan kanvas editorial', verified: true },
        { id: 'sw-plx-5', name: 'Pale Sky', hex: '#BCD2DF', role: 'ACCENT', usageRule: 'Badge sekunder dan sorotan kondisi/perawatan', verified: true },
        { id: 'sw-plx-6', name: 'Pure White', hex: '#FFFFFF', role: 'NEUTRAL', usageRule: 'Kartu produk, form, dan modal', verified: true },
      ],
      fonts: [
        { id: 'fn-plx-1', tier: 'DISPLAY', fontFamily: 'Libre Baskerville', weights: '400, 700, italic', usageNote: 'Wordmark, judul halaman, cerita editorial', verified: true },
        { id: 'fn-plx-2', tier: 'BODY', fontFamily: 'Plus Jakarta Sans', weights: '400, 500, 600, 700', usageNote: 'Navigasi, filter, spesifikasi produk, tombol', verified: true },
        { id: 'fn-plx-3', tier: 'MONO', fontFamily: 'JetBrains Mono', weights: '400, 500', usageNote: 'Harga IDR, SKU, ukuran cm, nomor pesanan', verified: true },
      ],
      logoGallery: [
        { id: 'lg-plx-1', label: 'Wordmark Charcoal', url: '/src/assets/images/preluxes_logo_charcoal.svg', variant: 'Wordmark' },
        { id: 'lg-plx-2', label: 'Banner Card Peach', url: '/src/assets/images/preluxes_logo_peach_card.svg', variant: 'Social Header' },
        { id: 'lg-plx-3', label: 'Avatar Badge Ivory', url: '/src/assets/images/preluxes_logo_ivory_badge.svg', variant: 'Profile Avatar 400×400' },
        { id: 'lg-plx-4', label: 'Logo Asli (PNG)', url: '/src/assets/images/preluxes_logo_original.png', variant: 'Original High-Res' },
      ],
      referenceGallery: [
        { id: 'rg-plx-1', label: 'Hero Editorial Preluxes', url: '/src/assets/images/preluxes_hero_editorial.jpg', note: 'Referensi cahaya, latar ivory, dan komposisi editorial' },
      ],
      evidences: [
        {
          id: 'ev-plx-1',
          categoryCode: 'H_COLORS',
          label: 'Palet Brand',
          extractedValue: 'Peach #E9BBAA, Peach Hover #DFA691, Ivory #FAF7F2, Charcoal #30302E, Pale Sky #BCD2DF',
          sourceDocument: 'AGENCY_MASTER_HANDOFF.md / preluxes-brand-tokens.json',
          pageReference: 'Bagian 1 — Visual Identity',
          confidence: 0.99,
          status: 'VERIFIED',
          approvedBy: 'Aldy Pratama',
          approvedAt: '2026-11-18T10:00:00.000Z',
        },
        {
          id: 'ev-plx-2',
          categoryCode: 'I_TYPOGRAPHY',
          label: 'Tipografi',
          extractedValue: 'Libre Baskerville (judul), Plus Jakarta Sans (UI), JetBrains Mono (harga/SKU/ukuran)',
          sourceDocument: 'AGENCY_MASTER_HANDOFF.md / preluxes-brand-tokens.json',
          pageReference: 'Bagian 1 — Typography',
          confidence: 0.99,
          status: 'VERIFIED',
          approvedBy: 'Aldy Pratama',
          approvedAt: '2026-11-18T10:00:00.000Z',
        },
        {
          id: 'ev-plx-3',
          categoryCode: 'L_TONE',
          label: 'Brand Voice',
          extractedValue: 'Hangat, tenang, transparan, halus, praktis. Tanpa klaim berlebihan.',
          sourceDocument: 'AGENCY_MASTER_HANDOFF.md',
          pageReference: 'Bagian 4 — Brand Voice',
          confidence: 0.97,
          status: 'VERIFIED',
          approvedBy: 'Aldy Pratama',
          approvedAt: '2026-11-18T10:00:00.000Z',
        },
        {
          id: 'ev-plx-4',
          categoryCode: 'M_TAGLINE_MESSAGING',
          label: 'Tagline',
          extractedValue: 'Temukan yang berharga. Rawat lebih lama.',
          sourceDocument: 'preluxes-brand-tokens.json',
          pageReference: 'brand.tagline',
          confidence: 0.99,
          status: 'VERIFIED',
          approvedBy: 'Aldy Pratama',
          approvedAt: '2026-11-18T10:00:00.000Z',
        },
      ],
      changeSummary: 'Diimpor dari Preluxes Master Package (brand tokens + handoff) saat penggabungan Studio DST v11.',
      createdBy: 'Aldy Pratama',
      createdAt: '2026-11-18T10:00:00.000Z',
      approvedBy: 'Aldy Pratama',
      approvedAt: '2026-11-18T10:00:00.000Z',
    },
  ],
};

export const PRELUXES_ASSETS: BrandAsset[] = [
  {
    id: 'asset-plx-1',
    brandId: PRELUXES_WORKSPACE_ID,
    clientId: PRELUXES_CLIENT_ID,
    name: 'preluxes_logo_original.png',
    category: 'LOGO',
    mimeType: 'image/png',
    sizeBytes: 70352,
    url: '/src/assets/images/preluxes_logo_original.png',
    driveStorageMode: 'LOCAL_CACHE',
    uploadedBy: 'Aldy Pratama',
    uploadedAt: '2026-11-18T10:05:00.000Z',
    notes: 'Logo asli resolusi tinggi dari Preluxes Master Package',
  },
  {
    id: 'asset-plx-2',
    brandId: PRELUXES_WORKSPACE_ID,
    clientId: PRELUXES_CLIENT_ID,
    name: 'preluxes_hero_editorial.jpg',
    category: 'KEY_VISUAL',
    mimeType: 'image/jpeg',
    sizeBytes: 757083,
    url: '/src/assets/images/preluxes_hero_editorial.jpg',
    driveStorageMode: 'LOCAL_CACHE',
    uploadedBy: 'Aldy Pratama',
    uploadedAt: '2026-11-18T10:05:00.000Z',
    notes: 'Hero editorial untuk referensi gaya foto',
  },
];

/** Halaman storefront yang bisa dipratinjau dari tab Website. */
export const PRELUXES_SITE_PAGES: Array<{ path: string; label: string; note: string }> = [
  { path: '/', label: 'Beranda', note: 'Hero editorial, kategori, produk pilihan' },
  { path: '/shop', label: 'Shop', note: 'Katalog dengan filter grade, ukuran, ketersediaan' },
  { path: '/new-arrivals', label: 'New Arrivals', note: 'Barang terbaru' },
  { path: '/sale', label: 'Sale', note: 'Barang dengan harga turun' },
  { path: '/about', label: 'About', note: 'Cerita brand' },
  { path: '/faq', label: 'FAQ', note: 'Panduan grade kondisi & kebijakan' },
  { path: '/contact', label: 'Contact', note: 'Kontak & WhatsApp Admin' },
  { path: '/brand-kit', label: 'Brand Kit', note: 'Brand kit publik & hub media sosial' },
  { path: '/admin/dashboard', label: 'Admin Console', note: 'Khusus pemilik: produk, stok, pesanan, kupon, CMS' },
];
