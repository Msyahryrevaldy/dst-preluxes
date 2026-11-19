import type { SocialContent, SocialPlatform } from '../types/studio';
import {
  PRELUXES_CLIENT_ID,
  PRELUXES_GUIDELINE_ID,
  PRELUXES_PLATFORMS,
  PRELUXES_WORKSPACE_ID,
} from '../data/preluxesSeed';

/** Subset dari Preluxes catalog-feed.json (GET /api/integration/catalog-feed.json). */
export interface PreluxesFeedItem {
  id: string;
  sku: string;
  slug: string;
  name: string;
  description?: string;
  categoryName?: string;
  sizeLabel?: string;
  color?: string;
  material?: string;
  conditionGrade: 'A' | 'B' | 'C' | 'D' | string;
  conditionNotes?: string;
  defectNotes?: string;
  sellingPrice: number;
  sellingPriceFormatted?: string;
  availableQuantity: number;
  isPurchasable: boolean;
  isDemo?: boolean;
  primaryImageUrl?: string;
  productUrl: string;
  whatsappInquiryUrl?: string;
  socialCaptions?: Partial<Record<'id' | 'en' | 'de' | 'fr', string>>;
}

export interface PreluxesFeed {
  brand: string;
  tagline: string;
  generatedAt: string;
  totalItems: number;
  items: PreluxesFeedItem[];
}

export interface ScheduleOptions {
  startDate: string; // YYYY-MM-DD (WIB)
  horizonDays: 7 | 14 | 30;
  platforms: SocialPlatform[];
  includeDemo: boolean;
  /** Hari posting dalam seminggu (0=Min .. 6=Sab). Default Selasa, Kamis, Sabtu. */
  postingWeekdays?: number[];
}

export interface ScheduleResult {
  campaignId: string;
  campaignName: string;
  contentPillars: string[];
  strategySummary: string;
  items: SocialContent[];
  skippedReasons: string[];
}

const PILLARS = [
  'Curated Piece of the Week',
  'Condition Transparency',
  'Ukuran & Fit (cm aktual)',
  'Care & Longevity',
];

const BASE_TAGS = ['#preluxes', '#curatedsecondhand', '#secondhandfashion', '#prelovedindonesia'];

const POST_TIME_NOTE = 'Jam tayang disarankan 19:00 WIB.';

/** Platform yang diizinkan untuk Preluxes; sisanya dibuang. */
export function sanitizePreluxesPlatforms(platforms: SocialPlatform[]): SocialPlatform[] {
  const allowed = platforms.filter((p) => PRELUXES_PLATFORMS.includes(p));
  return allowed.length > 0 ? allowed : [...PRELUXES_PLATFORMS];
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

function weekdayOf(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function formatIdr(n: number): string {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}

function priceOf(item: PreluxesFeedItem): string {
  return item.sellingPriceFormatted || formatIdr(item.sellingPrice);
}

/** Hapus baris "Lihat detail & reservasi: <url>" dari caption bawaan (link tidak bisa diklik di IG/TikTok). */
function stripUrlLine(caption: string): string {
  return caption
    .split('\n')
    .filter((line) => !/^\s*(Lihat detail & reservasi|Reserve online or via WhatsApp Admin)\s*:/i.test(line))
    .join('\n')
    .trim();
}

function baseCaption(item: PreluxesFeedItem): string {
  const fromFeed = item.socialCaptions?.id;
  if (fromFeed && fromFeed.trim()) return fromFeed;
  return [
    `${item.name} · Grade ${item.conditionGrade}`,
    item.sizeLabel ? `Ukuran: ${item.sizeLabel}` : '',
    item.material ? `Material: ${item.material}` : '',
    item.conditionNotes ? `Catatan kondisi: ${item.conditionNotes}` : '',
    item.defectNotes ? `Info transparan: ${item.defectNotes}` : '',
    `Harga: ${priceOf(item)} · Stok tersedia: ${item.availableQuantity} unit unik`,
    `Lihat detail & reservasi: ${item.productUrl}`,
    '— Temukan yang berharga. Rawat lebih lama.',
  ]
    .filter(Boolean)
    .join('\n');
}

function captionFor(item: PreluxesFeedItem, platform: SocialPlatform): string {
  const full = baseCaption(item);
  if (platform === 'Facebook') return full; // link produk aktif di Facebook
  const withoutUrl = stripUrlLine(full);
  if (platform === 'Instagram') {
    return `${withoutUrl}\nReservasi: link di bio atau chat Admin WhatsApp.`;
  }
  // TikTok: ringkas
  return [
    `${item.name} · Grade ${item.conditionGrade}`,
    item.sizeLabel ? `Ukuran ${item.sizeLabel}` : '',
    `${priceOf(item)} · 1 unit unik`,
    item.defectNotes ? `Info transparan: ${item.defectNotes}` : '',
    'Reservasi lewat link di bio atau chat Admin WhatsApp.',
    '— Temukan yang berharga. Rawat lebih lama.',
  ]
    .filter(Boolean)
    .join('\n');
}

function formatFor(platform: SocialPlatform): SocialContent['format'] {
  if (platform === 'Instagram') return 'Carousel';
  if (platform === 'TikTok') return 'Reels / Short Video';
  return 'Single Image';
}

function slidesFor(item: PreluxesFeedItem): string[] {
  return [
    `Slide 1: Foto utama ${item.name} · Grade ${item.conditionGrade}`,
    `Slide 2: Ukuran cm aktual${item.sizeLabel ? ` (${item.sizeLabel})` : ''} dengan foto pengukuran`,
    `Slide 3: Detail bahan${item.material ? ` — ${item.material}` : ''} dan jahitan (close-up)`,
    `Slide 4: Catatan kondisi jujur${item.defectNotes ? ` — ${item.defectNotes}` : ''}`,
    `Slide 5: ${priceOf(item)} · 1 unit unik · cara reservasi`,
  ];
}

function scriptFor(item: PreluxesFeedItem): { script: string; scenes: string[] } {
  return {
    script: `VO (0-3s): ${item.name}, Grade ${item.conditionGrade}. (3-8s): Ukuran aktual${item.sizeLabel ? ` ${item.sizeLabel}` : ''}, kami ukur langsung dalam cm. (8-14s): ${item.conditionNotes || 'Kondisi dijelaskan apa adanya.'} ${item.defectNotes ? `Catatan: ${item.defectNotes}` : ''} (14-20s): ${priceOf(item)}, hanya 1 unit. Reservasi lewat link di bio.`,
    scenes: [
      `Scene 1 (0-3s): Produk utuh pada latar warm ivory, cahaya natural lembut, gerakan kamera pelan.`,
      `Scene 2 (3-8s): Pita ukur menempel di produk, teks ukuran cm muncul di area aman atas.`,
      `Scene 3 (8-14s): Close-up bahan, jahitan, dan area yang dicatat sebagai tanda pemakaian.`,
      `Scene 4 (14-20s): Frame penutup peach #E9BBAA dengan harga dan cara reservasi (safe zone bawah 22% kosong).`,
    ],
  };
}

function visualPromptFor(item: PreluxesFeedItem, platform: SocialPlatform): string {
  const frame = platform === 'TikTok' ? '9:16 vertical' : platform === 'Facebook' ? '1:1 square' : '4:5 portrait';
  return `Editorial product photography of ${item.name}${item.color ? ` (${item.color})` : ''}, ${frame}, warm ivory #FAF7F2 background, soft natural window light, honest texture and stitching detail, calm negative space, no baked-in text, no heavy filters`;
}

function hashtagsFor(item: PreluxesFeedItem, platform: SocialPlatform): string[] {
  const cat = item.categoryName ? `#${item.categoryName.replace(/[^A-Za-z0-9]/g, '').toLowerCase()}` : '';
  const extra = platform === 'TikTok' ? ['#fyp', '#thriftindonesia'] : [];
  return [...BASE_TAGS, cat, ...extra].filter(Boolean);
}

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Membuat jadwal konten Preluxes dari katalog live/bundled.
 * - Hanya Instagram, Facebook, TikTok.
 * - Semua hasil berstatus DRAFT (tidak ada auto-publish).
 * - ID deterministik → sinkron ulang tidak membuat duplikat.
 */
export function buildPreluxesSchedule(feed: PreluxesFeed, options: ScheduleOptions): ScheduleResult {
  const platforms = sanitizePreluxesPlatforms(options.platforms);
  const weekdays = options.postingWeekdays && options.postingWeekdays.length > 0 ? options.postingWeekdays : [2, 4, 6];
  const skippedReasons: string[] = [];

  const eligible = feed.items.filter((it) => {
    if (!it.isPurchasable || it.availableQuantity <= 0) {
      skippedReasons.push(`${it.sku}: stok habis / tidak bisa dibeli`);
      return false;
    }
    if (it.isDemo && !options.includeDemo) {
      skippedReasons.push(`${it.sku}: item demo dilewati`);
      return false;
    }
    return true;
  });

  const campaignId = `cmp-plx-${options.startDate}-${options.horizonDays}d`;
  const campaignName = `Preluxes · Curated Drop ${options.startDate}`;

  if (eligible.length === 0) {
    return {
      campaignId,
      campaignName,
      contentPillars: PILLARS,
      strategySummary: 'Tidak ada produk yang memenuhi syarat untuk dijadwalkan.',
      items: [],
      skippedReasons,
    };
  }

  const items: SocialContent[] = [];
  let postingIndex = 0;

  for (let offset = 0; offset < options.horizonDays; offset++) {
    const date = addDays(options.startDate, offset);
    if (!weekdays.includes(weekdayOf(date))) continue;

    platforms.forEach((platform, platformIdx) => {
      // Setiap platform memakai produk berbeda pada hari yang sama agar feed tidak identik.
      const product = eligible[(postingIndex + platformIdx) % eligible.length];
      const pillar = PILLARS[(postingIndex + platformIdx) % PILLARS.length];
      const { script, scenes } =
        platform === 'TikTok' ? scriptFor(product) : { script: '', scenes: [] as string[] };

      const notes = [
        `Sumber katalog: ${product.sku} (${product.productUrl}).`,
        product.primaryImageUrl ? `Foto utama: ${product.primaryImageUrl}.` : '',
        POST_TIME_NOTE,
        product.isDemo ? 'PERINGATAN: ini item DEMO — ganti dengan produk nyata sebelum tayang.' : '',
      ]
        .filter(Boolean)
        .join(' ');

      items.push({
        id: `soc-plx-${date.replace(/-/g, '')}-${slug(platform)}-${slug(product.sku)}`,
        clientId: PRELUXES_CLIENT_ID,
        brandId: PRELUXES_WORKSPACE_ID,
        guidelineVersionId: PRELUXES_GUIDELINE_ID,
        campaignId,
        campaignName,
        contentPillar: pillar,
        platform,
        format: formatFor(platform),
        scheduledDate: date,
        status: 'DRAFT',
        hook: `${product.name} · Grade ${product.conditionGrade}: ${product.defectNotes ? 'lengkap dengan catatan kondisi jujur' : 'kondisi terawat'}.`,
        headline: product.name,
        caption: captionFor(product, platform),
        hashtags: hashtagsFor(product, platform),
        cta:
          platform === 'Facebook'
            ? 'Lihat detail & reservasi lewat tautan produk'
            : 'Reservasi lewat link di bio atau chat Admin WhatsApp',
        carouselSlides: platform === 'Instagram' ? slidesFor(product) : [],
        videoScript: script,
        sceneBreakdown: scenes,
        visualPrompt: visualPromptFor(product, platform),
        editorialNotes: notes,
      });
    });
    postingIndex += 1;
  }

  const postingDays = postingIndex;
  return {
    campaignId,
    campaignName,
    contentPillars: PILLARS,
    strategySummary: `Jadwal ${options.horizonDays} hari untuk ${platforms.join(', ')}: ${postingDays} hari tayang (Sel/Kam/Sab), satu produk unik per platform per hari tayang, dirotasi dari ${eligible.length} produk katalog. Semua berstatus DRAFT untuk di-review sebelum tayang.`,
    items,
    skippedReasons,
  };
}

/** Pemeriksaan kesiapan tayang website berdasarkan feed. */
export interface ReadinessCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

export function checkSiteReadiness(feed: PreluxesFeed | null, source: 'live' | 'bundled' | 'none'): ReadinessCheck[] {
  const items = feed?.items ?? [];
  const demoCount = items.filter((i) => i.isDemo).length;
  const placeholderWa = items.some((i) => (i.whatsappInquiryUrl || '').includes('6281200000000'));
  const localhostUrls = items.some((i) => /localhost|127\.0\.0\.1/.test(i.productUrl));
  return [
    {
      id: 'live',
      label: 'Website terhubung (feed live)',
      ok: source === 'live',
      detail: source === 'live' ? 'Feed katalog dibaca langsung dari website.' : 'Memakai katalog bawaan paket. Jalankan website (npm run dev:all) atau isi URL website.',
    },
    {
      id: 'real-products',
      label: 'Produk nyata sudah dipublikasikan',
      ok: items.length > 0 && demoCount === 0,
      detail: demoCount > 0 ? `${demoCount} dari ${items.length} item masih DEMO.` : items.length === 0 ? 'Katalog kosong.' : 'Semua item bukan demo.',
    },
    {
      id: 'whatsapp',
      label: 'Nomor WhatsApp Admin sudah asli',
      ok: items.length > 0 && !placeholderWa,
      detail: placeholderWa ? 'Masih memakai nomor placeholder +62 812-0000-0000.' : 'Tidak ada nomor placeholder terdeteksi.',
    },
    {
      id: 'public-url',
      label: 'URL produk bukan localhost',
      ok: items.length > 0 && !localhostUrls,
      detail: localhostUrls ? 'Link produk masih menunjuk localhost. Isi APP_URL website dengan domain publik.' : 'Link produk memakai domain publik.',
    },
  ];
}
