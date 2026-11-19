import fs from 'node:fs';
import path from 'node:path';
import type { Brand, Category, CmsContent, Product, StoreSettings } from '../src/types/store.ts';
import {
  buildWhatsappChatUrl,
  formatIDR,
  getAvailableQuantity,
  isProductPurchasable,
} from '../src/utils/commerce.ts';
import type { ZipEntryInput } from './zipBuilder.ts';

export const TARGET_STUDIO_APP_URL =
  'https://aistudio.google.com/apps/c6e048f9-6f7c-443c-a9fb-de31247fbd13?showPreview=true&showAssistant=true&fullscreenApplet=true';

function toAbsoluteUrl(origin: string, relOrAbs: string): string {
  if (!relOrAbs) return '';
  if (/^https?:\/\//i.test(relOrAbs)) return relOrAbs;
  const cleanOrigin = origin.replace(/\/+$/, '');
  const cleanPath = relOrAbs.startsWith('/') ? relOrAbs : `/${relOrAbs}`;
  return `${cleanOrigin}${cleanPath}`;
}

function summarizeMeasurements(m: Product['measurements']): string {
  const parts: string[] = [];
  if (m.chestWidthCm) parts.push(`LD/Chest ${m.chestWidthCm} cm`);
  if (m.lengthCm) parts.push(`P/Length ${m.lengthCm} cm`);
  if (m.shoulderWidthCm) parts.push(`Bahu/Shoulder ${m.shoulderWidthCm} cm`);
  if (m.sleeveLengthCm) parts.push(`Lengan/Sleeve ${m.sleeveLengthCm} cm`);
  if (m.waistCm) parts.push(`Pinggang/Waist ${m.waistCm} cm`);
  if (m.inseamCm) parts.push(`Inseam ${m.inseamCm} cm`);
  if (m.bagWidthCm || m.bagHeightCm) {
    parts.push(`${m.bagWidthCm || '?'} × ${m.bagHeightCm || '?'} cm`);
  }
  if (m.shoeSizeEu) parts.push(m.shoeSizeEu);
  return parts.join(' · ') || 'Lihat detail produk';
}

export function buildSocialCaptions(product: Product, productUrl: string): Record<'id' | 'en' | 'de' | 'fr', string> {
  const price = formatIDR(product.sellingPrice);
  const measureText = summarizeMeasurements(product.measurements);
  const material = product.material || 'Sesuai label / terkurasi';
  const avail = getAvailableQuantity(product);

  return {
    id: [
      `${product.name} · Grade ${product.conditionGrade}`,
      `Ukuran: ${product.sizeLabel} (${measureText})`,
      `Material: ${material}`,
      `Catatan kondisi: ${product.conditionNotes}`,
      product.defectNotes ? `Info transparan: ${product.defectNotes}` : '',
      `Harga: ${price} · Stok tersedia: ${avail} unit unik`,
      `Lihat detail & reservasi: ${productUrl}`,
      `— Temukan yang berharga. Rawat lebih lama. #preluxes #curatedsecondhand`,
    ]
      .filter(Boolean)
      .join('\n'),
    en: [
      `${product.name} · Condition Grade ${product.conditionGrade}`,
      `Size: ${product.sizeLabel} (${measureText})`,
      `Material: ${material}`,
      `Condition note: ${product.conditionNotes}`,
      `Price: ${price} · ${avail} unique piece(s) available`,
      `Reserve online or via WhatsApp Admin: ${productUrl}`,
      `— Find what endures. Care for it longer. #preluxes`,
    ]
      .filter(Boolean)
      .join('\n'),
    de: [
      `${product.name} · Zustand Note ${product.conditionGrade}`,
      `Größe: ${product.sizeLabel} (${measureText})`,
      `Material: ${material}`,
      `Zustandshinweis: ${product.conditionNotes}`,
      `Preis: ${price} · ${avail} Einzelstück(e) verfügbar`,
      `Online reservieren oder per WhatsApp anfragen: ${productUrl}`,
      `— Wertvolles entdecken. Länger pflegen. #preluxes`,
    ]
      .filter(Boolean)
      .join('\n'),
    fr: [
      `${product.name} · État Grade ${product.conditionGrade}`,
      `Taille : ${product.sizeLabel} (${measureText})`,
      `Matière : ${material}`,
      `Note d’état : ${product.conditionNotes}`,
      `Prix : ${price} · ${avail} pièce(s) unique(s) disponible(s)`,
      `Réserver en ligne ou via WhatsApp Admin : ${productUrl}`,
      `— Trouver ce qui dure. En prendre soin plus longtemps. #preluxes`,
    ]
      .filter(Boolean)
      .join('\n'),
  };
}

export function buildCatalogFeedPayload(params: {
  origin: string;
  seededInFirestore: boolean;
  products: Product[];
  categories: Category[];
  brands: Brand[];
  settings: StoreSettings;
}) {
  const { origin, seededInFirestore, products, categories, brands, settings } = params;

  return {
    schemaVersion: '1.0.0',
    generatedAt: new Date().toISOString(),
    brand: 'Preluxes',
    tagline: settings.tagline,
    currency: 'IDR',
    timezone: settings.timezone || 'Asia/Jakarta',
    paymentMode: 'whatsapp_chat',
    targetStudioAppUrl: TARGET_STUDIO_APP_URL,
    seededInFirestore,
    totalItems: products.length,
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      imageUrl: toAbsoluteUrl(origin, c.imageUrl || ''),
      url: toAbsoluteUrl(origin, `/category/${c.slug}`),
    })),
    brands: brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
    })),
    items: products.map((p) => {
      const productUrl = toAbsoluteUrl(origin, `/product/${p.slug}`);
      const primaryImg = toAbsoluteUrl(origin, p.primaryImageUrl);
      const waPrompt = `Halo Admin Preluxes, saya tertarik dengan ${p.name} (${p.sku}) seharga ${formatIDR(p.sellingPrice)}. Link: ${productUrl}`;
      return {
        id: p.id,
        sku: p.sku,
        slug: p.slug,
        name: p.name,
        description: p.description,
        categoryId: p.categoryId,
        categoryName: p.categoryName,
        brandName: p.brandName,
        gender: p.gender,
        sizeLabel: p.sizeLabel,
        color: p.color,
        material: p.material,
        conditionGrade: p.conditionGrade,
        conditionNotes: p.conditionNotes,
        defectNotes: p.defectNotes,
        measurements: p.measurements,
        originalPrice: p.originalPrice,
        sellingPrice: p.sellingPrice,
        sellingPriceFormatted: formatIDR(p.sellingPrice),
        availableQuantity: getAvailableQuantity(p),
        isPurchasable: isProductPurchasable(p),
        isFeatured: p.isFeatured,
        isDemo: p.isDemo,
        primaryImageUrl: primaryImg,
        images: p.images.map((img) => ({
          ...img,
          url: toAbsoluteUrl(origin, img.url),
        })),
        productUrl,
        whatsappInquiryUrl: buildWhatsappChatUrl(settings.contactWhatsapp, waPrompt),
        socialCaptions: buildSocialCaptions(p, productUrl),
      };
    }),
  };
}

export function buildBrandKitPayload(params: {
  origin: string;
  cms: CmsContent;
  settings: StoreSettings;
}) {
  const { origin, cms, settings } = params;
  const tokensPath = path.resolve(process.cwd(), 'public/brand-kit/preluxes-brand-tokens.json');
  let baseTokens: Record<string, unknown> = {};
  if (fs.existsSync(tokensPath)) {
    baseTokens = JSON.parse(fs.readFileSync(tokensPath, 'utf8')) as Record<string, unknown>;
  }

  return {
    ...baseTokens,
    generatedAt: new Date().toISOString(),
    storefrontUrl: origin,
    storeProfile: {
      storeName: settings.storeName,
      tagline: settings.tagline,
      instagramHandle: settings.instagramHandle,
      contactEmail: settings.contactEmail,
      contactWhatsapp: settings.contactWhatsapp,
      timezone: settings.timezone,
      currency: settings.currency,
      reservationMinutes: settings.reservationMinutes,
      handlingTimeText: settings.handlingTimeText,
    },
    cmsCopy: {
      heroTitle: cms.heroTitle,
      heroSubtitle: cms.heroSubtitle,
      heroImageUrl: toAbsoluteUrl(origin, cms.heroImageUrl),
      aboutTitle: cms.aboutTitle,
      aboutBody: cms.aboutBody,
      carePromiseTitle: cms.carePromiseTitle,
      carePromiseBody: cms.carePromiseBody,
    },
    resolvedAssets: {
      uploadedOriginalLogoPng: toAbsoluteUrl(origin, '/assets/aistudio/preluxes_52ad05c5.png'),
      charcoalWordmarkSvg: toAbsoluteUrl(origin, '/brand-kit/preluxes-logo-charcoal.svg'),
      peachBrandCardSvg: toAbsoluteUrl(origin, '/brand-kit/preluxes-logo-peach-card.svg'),
      ivoryAvatarBadgeSvg: toAbsoluteUrl(origin, '/brand-kit/preluxes-logo-ivory-badge.svg'),
      brandTokensJson: toAbsoluteUrl(origin, '/brand-kit/preluxes-brand-tokens.json'),
      agencyHandoffMarkdown: toAbsoluteUrl(origin, '/brand-kit/AGENCY_MASTER_HANDOFF.md'),
      catalogFeedJson: toAbsoluteUrl(origin, '/api/integration/catalog-feed.json'),
      brandKitJson: toAbsoluteUrl(origin, '/api/integration/brand-kit.json'),
      brandAssetsZip: toAbsoluteUrl(origin, '/api/integration/brand-assets.zip'),
    },
  };
}

function readFilesRecursively(
  dirPath: string,
  archivePrefix: string,
  excludeDirs = new Set(['node_modules', 'dist', '.git', '.playwright-cli', 'download', '.aistudio'])
): ZipEntryInput[] {
  if (!fs.existsSync(dirPath)) return [];
  const results: ZipEntryInput[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.env') && entry.name !== '.env.example') continue;
    if (excludeDirs.has(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    const zipName = `${archivePrefix}/${entry.name}`;
    if (entry.isDirectory()) {
      results.push(...readFilesRecursively(fullPath, zipName, excludeDirs));
    } else if (entry.isFile()) {
      const stat = fs.statSync(fullPath);
      results.push({
        name: zipName,
        content: fs.readFileSync(fullPath),
        mtime: stat.mtime,
      });
    }
  }
  return results;
}

export function collectBrandAssetsZipEntries(params: {
  catalogFeed: unknown;
  brandKit: unknown;
}): ZipEntryInput[] {
  const root = process.cwd();
  const entries: ZipEntryInput[] = [];

  // 1. Brand Logos (Uploaded PNG + SVGs)
  const uploadedLogo = path.join(root, 'public/assets/aistudio/preluxes_52ad05c5.png');
  if (fs.existsSync(uploadedLogo)) {
    entries.push({
      name: 'preluxes-brand-kit/logos/preluxes_original_logo.png',
      content: fs.readFileSync(uploadedLogo),
    });
  }

  for (const fileName of [
    'preluxes-logo-charcoal.svg',
    'preluxes-logo-peach-card.svg',
    'preluxes-logo-ivory-badge.svg',
    'preluxes-brand-tokens.json',
    'AGENCY_MASTER_HANDOFF.md',
  ]) {
    const filePath = path.join(root, 'public/brand-kit', fileName);
    if (fs.existsSync(filePath)) {
      const folder = fileName.endsWith('.svg')
        ? 'logos'
        : fileName.endsWith('.json')
        ? 'tokens'
        : 'docs';
      entries.push({
        name: `preluxes-brand-kit/${folder}/${fileName}`,
        content: fs.readFileSync(filePath),
      });
    }
  }

  // 2. Editorial & Curated Product Photography
  entries.push(
    ...readFilesRecursively(path.join(root, 'src/assets/images'), 'preluxes-brand-kit/images')
  );

  // 3. 4-Language Translations Dictionary
  const translationsPath = path.join(root, 'src/i18n/translations.ts');
  if (fs.existsSync(translationsPath)) {
    entries.push({
      name: 'preluxes-brand-kit/i18n/translations.ts',
      content: fs.readFileSync(translationsPath),
    });
  }

  // 4. Live Feed Snapshots
  entries.push({
    name: 'preluxes-brand-kit/feeds/catalog-feed.json',
    content: JSON.stringify(params.catalogFeed, null, 2),
  });
  entries.push({
    name: 'preluxes-brand-kit/feeds/brand-kit.json',
    content: JSON.stringify(params.brandKit, null, 2),
  });

  return entries;
}

export function collectMasterPackageZipEntries(params: {
  catalogFeed: unknown;
  brandKit: unknown;
}): ZipEntryInput[] {
  const root = process.cwd();
  const entries: ZipEntryInput[] = [];

  // Include all Brand Kit visual assets & feeds
  entries.push(...collectBrandAssetsZipEntries(params));

  // Include clean website & server source code
  entries.push(...readFilesRecursively(path.join(root, 'src'), 'preluxes-website-source/src'));
  entries.push(...readFilesRecursively(path.join(root, 'server'), 'preluxes-website-source/server'));
  entries.push(...readFilesRecursively(path.join(root, 'public'), 'preluxes-website-source/public'));

  const rootFiles = [
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'index.html',
    'metadata.json',
    'server.ts',
    'firebase-blueprint.json',
    'firebase-applet-config.json',
    'firestore.rules',
    'firestore.rules.test.ts',
    'security_spec.md',
    '.env.example',
  ];

  for (const fileName of rootFiles) {
    const filePath = path.join(root, fileName);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      entries.push({
        name: `preluxes-website-source/${fileName}`,
        content: fs.readFileSync(filePath),
        mtime: stat.mtime,
      });
    }
  }

  return entries;
}
