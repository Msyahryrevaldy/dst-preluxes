import { useMemo, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  Image as ImageIcon,
  Layers,
  Palette,
  Share2,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import type { LanguageCode, Product } from '../types/store.ts';
import { formatIDR, getAvailableQuantity } from '../utils/commerce.ts';
import { LANGUAGE_OPTIONS } from '../i18n/translations.ts';

const TARGET_STUDIO_URL =
  'https://aistudio.google.com/apps/c6e048f9-6f7c-443c-a9fb-de31247fbd13?showPreview=true&showAssistant=true&fullscreenApplet=true';

const COLOR_TOKENS = [
  { name: 'Primary Peach', hex: '#E9BBAA', role: 'Main Accent, CTA Fill, Announcement Bar', darkText: true },
  { name: 'Peach Hover', hex: '#DFA691', role: 'Button Hover & Pressed State', darkText: true },
  { name: 'Warm Ivory', hex: '#FAF7F2', role: 'Editorial Canvas & Page Surface', darkText: true },
  { name: 'Pure White', hex: '#FFFFFF', role: 'Product Cards, Modals, Admin UI', darkText: true },
  { name: 'Charcoal Ink', hex: '#30302E', role: 'Primary Text, Serif Wordmark, Borders', darkText: false },
  { name: 'Pale Sky', hex: '#BCD2DF', role: 'Condition Badges & Care Accents', darkText: true },
];

const LOGO_ASSETS = [
  {
    id: 'png-original',
    title: 'Original Brand Logo (PNG)',
    subtitle: 'Transparent serif wordmark with arched flourish',
    src: '/assets/aistudio/preluxes_52ad05c5.png',
    downloadName: 'preluxes-logo-original.png',
    bgClass: 'bg-[#FAF7F2]',
  },
  {
    id: 'svg-charcoal',
    title: 'Vector Wordmark (SVG)',
    subtitle: 'Scalable charcoal #30302E vector for web & print',
    src: '/brand-kit/preluxes-logo-charcoal.svg',
    downloadName: 'preluxes-logo-charcoal.svg',
    bgClass: 'bg-white',
  },
  {
    id: 'svg-peach-card',
    title: 'Peach Brand Header Card (SVG)',
    subtitle: 'Signature #E9BBAA lockup with tagline',
    src: '/brand-kit/preluxes-logo-peach-card.svg',
    downloadName: 'preluxes-logo-peach-card.svg',
    bgClass: 'bg-[#E9BBAA]/30',
  },
  {
    id: 'svg-avatar',
    title: 'Social Profile Avatar Badge (SVG)',
    subtitle: '400×400 square lockup for IG & WhatsApp Business',
    src: '/brand-kit/preluxes-logo-ivory-badge.svg',
    downloadName: 'preluxes-logo-ivory-badge.svg',
    bgClass: 'bg-[#FAF7F2]',
  },
];

const PHOTO_ASSETS = [
  {
    id: 'hero',
    title: 'Editorial Hero Campaign Banner',
    sku: 'CAMPAIGN-HERO',
    src: '/src/assets/images/hero_preluxes_editorial_1794946984633.jpg',
    fileName: 'preluxes-hero-editorial.jpg',
  },
  {
    id: 'blazer',
    title: 'Blazer Tailored Wol-Linen Olive',
    sku: 'PLX-DEMO-001',
    src: '/src/assets/images/item_linen_blazer_1794946984670.jpg',
    fileName: 'preluxes-linen-blazer.jpg',
  },
  {
    id: 'tote',
    title: 'Tas Kulit Terstruktur Espresso Clasp',
    sku: 'PLX-DEMO-002',
    src: '/src/assets/images/item_leather_tote_1794946985545.jpg',
    fileName: 'preluxes-leather-tote.jpg',
  },
  {
    id: 'dress',
    title: 'Gaun Midi Sutra Bias-Cut Ivory',
    sku: 'PLX-DEMO-003',
    src: '/src/assets/images/item_silk_dress_1794946985939.jpg',
    fileName: 'preluxes-silk-dress.jpg',
  },
  {
    id: 'trench',
    title: 'Trench Coat Gabardine Sand Classic',
    sku: 'PLX-DEMO-004',
    src: '/src/assets/images/item_trench_coat_1794946986088.jpg',
    fileName: 'preluxes-trench-coat.jpg',
  },
  {
    id: 'loafers',
    title: 'Penny Loafers Kulit Espresso',
    sku: 'PLX-DEMO-005',
    src: '/src/assets/images/item_leather_loafers_1794947344379.jpg',
    fileName: 'preluxes-leather-loafers.jpg',
  },
  {
    id: 'necklace',
    title: 'Kalung Rantai Liontin Sculptural Brushed Gold',
    sku: 'PLX-DEMO-006',
    src: '/src/assets/images/item_gold_necklace_1794947344193.jpg',
    fileName: 'preluxes-gold-necklace.jpg',
  },
];

function buildCaptionForLang(product: Product, langCode: LanguageCode, origin: string): string {
  const url = `${origin}/product/${product.slug}`;
  const price = formatIDR(product.sellingPrice);
  const avail = getAvailableQuantity(product);
  const measureParts: string[] = [];
  if (product.measurements.chestWidthCm) measureParts.push(`LD ${product.measurements.chestWidthCm} cm`);
  if (product.measurements.lengthCm) measureParts.push(`P ${product.measurements.lengthCm} cm`);
  if (product.measurements.bagWidthCm || product.measurements.bagHeightCm) {
    measureParts.push(`${product.measurements.bagWidthCm || '?'}×${product.measurements.bagHeightCm || '?'} cm`);
  }
  if (product.measurements.shoeSizeEu) measureParts.push(product.measurements.shoeSizeEu);
  const dims = measureParts.join(' · ') || product.sizeLabel;

  const map: Record<LanguageCode, string> = {
    id: [
      `${product.name} · Grade ${product.conditionGrade}`,
      `Ukuran: ${product.sizeLabel} (${dims}) | Material: ${product.material || 'Terkurasi'}`,
      `Kondisi: ${product.conditionNotes}`,
      product.defectNotes ? `Info transparan: ${product.defectNotes}` : '',
      `Harga: ${price} · Stok tersedia: ${avail} unit unik`,
      `Order / WhatsApp Admin: ${url}`,
      `Temukan yang berharga. Rawat lebih lama. #preluxes #curatedsecondhand`,
    ]
      .filter(Boolean)
      .join('\n'),
    en: [
      `${product.name} · Condition Grade ${product.conditionGrade}`,
      `Size: ${product.sizeLabel} (${dims}) | Material: ${product.material || 'Curated'}`,
      `Condition note: ${product.conditionNotes}`,
      `Price: ${price} · ${avail} unique piece available`,
      `Shop / Reserve via WhatsApp: ${url}`,
      `Find what endures. Care for it longer. #preluxes`,
    ]
      .filter(Boolean)
      .join('\n'),
    de: [
      `${product.name} · Zustand Note ${product.conditionGrade}`,
      `Größe: ${product.sizeLabel} (${dims}) | Material: ${product.material || 'Kuratiert'}`,
      `Hinweis: ${product.conditionNotes}`,
      `Preis: ${price} · ${avail} Einzelstück verfügbar`,
      `Reservieren via Shop oder WhatsApp: ${url}`,
      `Wertvolles entdecken. Länger pflegen. #preluxes`,
    ]
      .filter(Boolean)
      .join('\n'),
    fr: [
      `${product.name} · État Grade ${product.conditionGrade}`,
      `Taille : ${product.sizeLabel} (${dims}) | Matière : ${product.material || 'Sélectionnée'}`,
      `Note d’état : ${product.conditionNotes}`,
      `Prix : ${price} · ${avail} pièce unique disponible`,
      `Commander ou réserver via WhatsApp : ${url}`,
      `Trouver ce qui dure. En prendre soin plus longtemps. #preluxes`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
  return map[langCode];
}

export function MasterPackagePanel({ inAdmin: _inAdmin = false }: { inAdmin?: boolean }) {
  const { products, notify, lang } = useStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [captionLang, setCaptionLang] = useState<LanguageCode>(lang);
  const [selectedProductId, setSelectedProductId] = useState<string>(products[0]?.id || '');

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://preluxes.example';

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) || products[0],
    [products, selectedProductId]
  );

  const socialCaption = useMemo(() => {
    if (!selectedProduct) return '';
    return buildCaptionForLang(selectedProduct, captionLang, origin);
  }, [selectedProduct, captionLang, origin]);

  const studioIntegrationPrompt = useMemo(
    () =>
      `Integrate Preluxes Curated Secondhand Fashion Store into this Agency Social Media & Website Studio App:
1. Live Brand Kit JSON (colors, Libre Baskerville & Plus Jakarta Sans fonts, SVG/PNG logo URLs, 4-language copy):
   GET ${origin}/api/integration/brand-kit.json
2. Live Catalog Feed JSON (published products in IDR, cm measurements, Condition Grade A-D, WhatsApp inquiry links, ID/EN/DE/FR captions):
   GET ${origin}/api/integration/catalog-feed.json
3. Brand Design Tokens:
   - Main Peach: #E9BBAA (Hover #DFA691)
   - Warm Ivory Canvas: #FAF7F2
   - Charcoal Ink: #30302E
   - Pale Sky Accent: #BCD2DF
   - Wordmark: lowercase "preluxes" with Libre Baskerville + arched swoosh over x-es
   - Tagline: "Temukan yang berharga. Rawat lebih lama."
4. Payment & Social CTAs always route customers to WhatsApp Admin confirmation or canonical storefront product URLs under ${origin}/product/<slug>.`,
    [origin]
  );

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 2000);
    } catch {
      notify('Gagal menyalin teks ke clipboard.', 'error');
    }
  };

  return (
    <div className="space-y-10">
      {/* Header / Quick Action Banner */}
      <section className="bg-[#E9BBAA]/35 border border-[#30302E]/20 p-6 sm:p-8 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#30302E]/75">
              Preluxes Master Package · Folder Download Lengkap
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl text-[#30302E] leading-tight">
              Paket Lengkap Aset Brand, Kode Website, & Integrasi Studio Apps
            </h1>
            <p className="text-xs sm:text-sm text-[#30302E]/80 leading-relaxed">
              Unduh langsung ke folder Download komputer Anda dalam satu arsip <code className="font-mono">.zip</code>{' '}
              berisi logo PNG/SVG, warna peach <code className="font-mono">#E9BBAA</code>, 7 foto editorial & produk,
              kamus 4 bahasa (ID/EN/DE/FR), kode lengkap website, serta skema Firestore.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-2.5 shrink-0">
            <a
              href="/download/preluxes-master-package.zip"
              download="preluxes-master-package.zip"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-[#E9BBAA] hover:bg-[#DFA691] text-[#30302E] border border-[#30302E]/35 text-xs font-semibold transition-colors"
            >
              <Code2 className="w-4 h-4" />
              <span>Unduh Master Package Lengkap (.ZIP)</span>
            </a>

            <a
              href="/download/preluxes-brand-assets.zip"
              download="preluxes-brand-assets.zip"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#30302E] hover:bg-[#30302E]/90 text-[#FAF7F2] text-xs font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Brand & Visual Assets Saja (.ZIP)</span>
            </a>

            <a
              href={TARGET_STUDIO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-[#FAF7F2] text-[#30302E] border border-[#30302E]/25 text-xs font-medium transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Buka Agency AI Studio App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* 1. Direct Integration Endpoints & Studio App Prompt */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#30302E]/15 p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#30302E]">
            <Layers className="w-4 h-4" />
            <h2 className="font-serif text-lg">Live API Feeds (CORS-Enabled untuk Agency App)</h2>
          </div>
          <p className="text-xs text-[#30302E]/75 leading-relaxed">
            Hubungkan Studio App <code className="font-mono">c6e048f9-6f7c-443c-a9fb-de31247fbd13</code> langsung ke
            endpoint JSON berikut untuk menarik produk, stok, harga IDR, & caption sosial media secara real-time (tanpa
            data pribadi pelanggan).
          </p>

          <div className="space-y-2.5 text-xs">
            {[
              {
                id: 'feed-catalog',
                label: 'Live Catalog & Social Feed JSON',
                url: `${origin}/api/integration/catalog-feed.json`,
                icon: FileJson,
              },
              {
                id: 'feed-brand',
                label: 'Live Brand Kit & Copy JSON',
                url: `${origin}/api/integration/brand-kit.json`,
                icon: Palette,
              },
              {
                id: 'file-tokens',
                label: 'Static Brand Tokens JSON',
                url: `${origin}/brand-kit/preluxes-brand-tokens.json`,
                icon: FileJson,
              },
              {
                id: 'file-handoff',
                label: 'Agency Master Handoff (Markdown)',
                url: `${origin}/brand-kit/AGENCY_MASTER_HANDOFF.md`,
                icon: FileText,
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-[#FAF7F2] border border-[#30302E]/12"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 font-medium text-[#30302E]">
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    <p className="font-mono text-[11px] text-[#30302E]/70 truncate mt-0.5">{item.url}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(item.id, item.url)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white border border-[#30302E]/20 text-[11px] font-medium hover:bg-[#E9BBAA]/40"
                    >
                      {copiedId === item.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedId === item.id ? 'Disalin' : 'Salin URL'}</span>
                    </button>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#30302E] text-[#FAF7F2] text-[11px] font-medium"
                    >
                      <span>Buka</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-[#30302E]/15 p-6 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[#30302E]">
                <Sparkles className="w-4 h-4" />
                <h2 className="font-serif text-lg">Prompt Integrasi Siap Tempel ke Studio App</h2>
              </div>
              <button
                type="button"
                onClick={() => handleCopy('studio-prompt', studioIntegrationPrompt)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E9BBAA] hover:bg-[#DFA691] text-[#30302E] border border-[#30302E]/25 text-xs font-semibold shrink-0 whitespace-nowrap"
              >
                {copiedId === 'studio-prompt' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedId === 'studio-prompt' ? 'Prompt Disalin' : 'Salin Prompt'}</span>
              </button>
            </div>
            <p className="text-xs text-[#30302E]/75">
              Salin instruksi di bawah dan tempelkan ke asisten AI di{' '}
              <span className="font-mono text-[11px]">aistudio.google.com/apps/c6e048f9...</span> agar agency app
              langsung tersinkronisasi dengan warna, logo, dan katalog Preluxes.
            </p>
            <pre className="p-3.5 bg-[#FAF7F2] border border-[#30302E]/12 font-mono text-[11px] leading-relaxed text-[#30302E]/85 whitespace-pre-wrap overflow-x-auto max-h-60">
              {studioIntegrationPrompt}
            </pre>
          </div>
        </div>
      </section>

      {/* 2. Brand Logo Files */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#30302E]/12 pb-3">
          <div>
            <h2 className="font-serif text-2xl text-[#30302E]">Logo Resmi & Variasi Lockup</h2>
            <p className="text-xs text-[#30302E]/70">
              Format PNG asli dan vektor SVG siap cetak/digital untuk kebutuhan website, watermark Instagram, dan WhatsApp.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {LOGO_ASSETS.map((logo) => (
            <div key={logo.id} className="bg-white border border-[#30302E]/15 flex flex-col justify-between">
              <div className={`h-40 p-5 flex items-center justify-center border-b border-[#30302E]/10 ${logo.bgClass}`}>
                <img
                  src={logo.src}
                  alt={logo.title}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-serif text-sm text-[#30302E]">{logo.title}</h3>
                  <p className="text-[11px] text-[#30302E]/70 mt-0.5">{logo.subtitle}</p>
                </div>
                <a
                  href={logo.src}
                  download={logo.downloadName}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-2 bg-[#FAF7F2] hover:bg-[#E9BBAA]/60 border border-[#30302E]/20 text-xs font-medium text-[#30302E] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh {logo.downloadName.split('.').pop()?.toUpperCase()}</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. Color Palette & Typography */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#30302E]/15 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#30302E]" />
            <h2 className="font-serif text-xl text-[#30302E]">Palet Warna Utama (Brand Tokens)</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {COLOR_TOKENS.map((swatch) => (
              <button
                key={swatch.hex}
                type="button"
                onClick={() => handleCopy(`hex-${swatch.hex}`, swatch.hex)}
                className="text-left border border-[#30302E]/15 hover:border-[#30302E] transition-colors group"
              >
                <div
                  className="h-20 p-3 flex items-end justify-between border-b border-[#30302E]/10"
                  style={{ backgroundColor: swatch.hex }}
                >
                  <span
                    className={`font-mono text-xs font-semibold ${
                      swatch.darkText ? 'text-[#30302E]' : 'text-[#FAF7F2]'
                    }`}
                  >
                    {swatch.hex}
                  </span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 border ${
                      swatch.darkText
                        ? 'border-[#30302E]/30 text-[#30302E] bg-white/60'
                        : 'border-white/30 text-[#FAF7F2] bg-black/20'
                    }`}
                  >
                    {copiedId === `hex-${swatch.hex}` ? 'Disalin' : 'Salin'}
                  </span>
                </div>
                <div className="p-3 bg-white">
                  <p className="text-xs font-semibold text-[#30302E]">{swatch.name}</p>
                  <p className="text-[11px] text-[#30302E]/70 mt-0.5 leading-snug">{swatch.role}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#30302E]/15 p-6 space-y-5">
          <h2 className="font-serif text-xl text-[#30302E]">Sistem Tipografi</h2>
          <div className="space-y-4 divide-y divide-[#30302E]/10">
            <div className="pt-1">
              <p className="text-[11px] uppercase tracking-wider text-[#30302E]/60">Display & Editorial</p>
              <p className="font-serif text-2xl text-[#30302E] mt-1">Libre Baskerville</p>
              <p className="font-serif italic text-xs text-[#30302E]/75 mt-1">
                “Temukan yang berharga. Rawat lebih lama.”
              </p>
            </div>
            <div className="pt-4">
              <p className="text-[11px] uppercase tracking-wider text-[#30302E]/60">UI, Navigasi & Keterangan</p>
              <p className="font-sans text-lg font-semibold text-[#30302E] mt-1">Plus Jakarta Sans</p>
              <p className="text-xs text-[#30302E]/75 mt-1">
                Digunakan untuk tombol, tabel ukuran, filter, dan navigasi 4 bahasa.
              </p>
            </div>
            <div className="pt-4">
              <p className="text-[11px] uppercase tracking-wider text-[#30302E]/60">Harga, SKU & Ukuran CM</p>
              <p className="font-mono text-base font-medium text-[#30302E] mt-1">JetBrains Mono</p>
              <p className="font-mono text-xs text-[#30302E]/75 mt-1 tabular-nums">
                Rp 485.000 · PLX-DEMO-001 · LD 54 cm
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Curated Photography Library */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#30302E]/12 pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-[#30302E]" />
            <div>
              <h2 className="font-serif text-2xl text-[#30302E]">Perpustakaan Foto Editorial & Produk (7 Aset)</h2>
              <p className="text-xs text-[#30302E]/70">
                Foto kampanye editorial dan katalog demonstrasi beresolusi penuh dalam format JPG.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PHOTO_ASSETS.map((photo) => (
            <div key={photo.id} className="bg-white border border-[#30302E]/15 flex flex-col justify-between">
              <div className="aspect-[4/3] bg-[#F4EFE8] overflow-hidden border-b border-[#30302E]/10">
                <img
                  src={photo.src}
                  alt={photo.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-3.5 space-y-2.5">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#30302E]/65">
                    {photo.sku}
                  </span>
                  <h3 className="font-serif text-sm text-[#30302E] line-clamp-1">{photo.title}</h3>
                </div>
                <a
                  href={photo.src}
                  download={photo.fileName}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 bg-[#FAF7F2] hover:bg-[#E9BBAA]/60 border border-[#30302E]/20 text-xs font-medium text-[#30302E] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh JPG</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 5. 4-Language Social Media Caption Studio */}
      {selectedProduct && (
        <section className="bg-white border border-[#30302E]/15 p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#30302E]/12 pb-4">
            <div className="flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#30302E]" />
              <div>
                <h2 className="font-serif text-xl text-[#30302E]">
                  Generator Caption Sosial Media (4 Bahasa)
                </h2>
                <p className="text-xs text-[#30302E]/70">
                  Pilih produk katalog & bahasa untuk langsung dipakai tim sosial media di Instagram, Reels, atau WhatsApp Broadcast.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {LANGUAGE_OPTIONS.map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => setCaptionLang(opt.code)}
                  className={`px-3 py-1.5 text-xs font-semibold border transition-colors ${
                    captionLang === opt.code
                      ? 'bg-[#E9BBAA] text-[#30302E] border-[#30302E]/35'
                      : 'bg-[#FAF7F2] text-[#30302E]/75 border-[#30302E]/15 hover:bg-white'
                  }`}
                >
                  {opt.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="space-y-3">
              <label htmlFor="caption-product-select" className="block text-xs font-medium text-[#30302E]">
                Pilih Produk dari Katalog Aktif
              </label>
              <select
                id="caption-product-select"
                value={selectedProduct.id}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full px-3 py-2 bg-[#FAF7F2] border border-[#30302E]/20 text-xs text-[#30302E]"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.name}
                  </option>
                ))}
              </select>

              <div className="flex gap-3 p-3 bg-[#FAF7F2] border border-[#30302E]/12">
                <img
                  src={selectedProduct.primaryImageUrl}
                  alt={selectedProduct.name}
                  className="w-16 h-20 object-cover bg-white shrink-0"
                />
                <div className="min-w-0 text-xs space-y-1">
                  <p className="font-serif font-medium text-[#30302E] line-clamp-2">{selectedProduct.name}</p>
                  <p className="font-mono text-[#30302E]/80">{formatIDR(selectedProduct.sellingPrice)}</p>
                  <p className="text-[11px] text-[#30302E]/65">
                    Grade {selectedProduct.conditionGrade} · {selectedProduct.sizeLabel}
                  </p>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#30302E]">
                  Preview Caption ({LANGUAGE_OPTIONS.find((l) => l.code === captionLang)?.label})
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy('social-caption', socialCaption)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#E9BBAA] hover:bg-[#DFA691] text-[#30302E] border border-[#30302E]/25 text-xs font-semibold"
                >
                  {copiedId === 'social-caption' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedId === 'social-caption' ? 'Caption Disalin' : 'Salin Caption'}</span>
                </button>
              </div>
              <pre className="p-4 bg-[#FAF7F2] border border-[#30302E]/15 text-xs font-sans leading-relaxed whitespace-pre-wrap text-[#30302E]">
                {socialCaption}
              </pre>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
