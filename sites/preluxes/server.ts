import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import {
  DEFAULT_CMS_CONTENT,
  DEFAULT_STORE_SETTINGS,
  DEMO_BRANDS,
  DEMO_CATEGORIES,
  DEMO_COUPONS,
  DEMO_PRODUCTS,
} from './src/data/demoSeed.ts';
import type {
  Coupon,
  Order,
  Product,
  StoreSettings,
} from './src/types/store.ts';
import {
  computeCheckoutTotals,
  isReservationExpired,
  mapMidtransStatus,
} from './src/utils/commerce.ts';
import {
  commitWrites,
  DOC_PREFIX,
  encodeFields,
  firebaseConfig,
  getDocument,
  runStructuredQuery,
  type CommitWrite,
} from './server/firestoreRest.ts';
import {
  createMidtransSnapSession,
  fetchMidtransTransactionStatus,
  getMidtransPublicConfig,
  verifyMidtransSignature,
} from './server/midtrans.ts';
import {
  buildBrandKitPayload,
  buildCatalogFeedPayload,
  collectBrandAssetsZipEntries,
  collectMasterPackageZipEntries,
} from './server/integrationFeed.ts';
import { createZipBuffer } from './server/zipBuilder.ts';

const BOOTSTRAPPED_ADMIN_EMAIL = 'hahspace@gmail.com';
const PORT = Number(process.env.PORT || 3000);
const IS_PROD = process.env.NODE_ENV === 'production';

if (getApps().length === 0) {
  initializeApp({ projectId: firebaseConfig.projectId });
}

interface AuthenticatedRequest extends Request {
  user?: DecodedIdToken;
  idToken?: string;
  isAdmin?: boolean;
}

const processedWebhookIds = new Set<string>();

function makeRequestId(): string {
  return crypto.randomUUID();
}

async function checkIsAdmin(decoded: DecodedIdToken, idToken: string): Promise<boolean> {
  if (decoded.email_verified && decoded.email === BOOTSTRAPPED_ADMIN_EMAIL) {
    return true;
  }
  try {
    const adminDoc = await getDocument(`admins/${decoded.uid}`, idToken);
    return Boolean(adminDoc && adminDoc.data && (adminDoc.data as { role?: string }).role === 'admin');
  } catch {
    return false;
  }
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const reqId = makeRequestId();
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: { code: 'UNAUTHENTICATED', message: 'Silakan masuk terlebih dahulu.' },
      meta: { requestId: reqId },
    });
    return;
  }
  const idToken = authHeader.slice(7).trim();
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    if (!decoded.email_verified) {
      res.status(403).json({
        error: { code: 'EMAIL_NOT_VERIFIED', message: 'Email akun harus terverifikasi.' },
        meta: { requestId: reqId },
      });
      return;
    }
    req.user = decoded;
    req.idToken = idToken;
    req.isAdmin = await checkIsAdmin(decoded, idToken);
    next();
  } catch {
    res.status(401).json({
      error: { code: 'INVALID_TOKEN', message: 'Sesi login tidak valid atau kedaluwarsa.' },
      meta: { requestId: reqId },
    });
  }
}

function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user || !req.isAdmin) {
    res.status(403).json({
      error: { code: 'FORBIDDEN', message: 'Akses khusus administrator toko.' },
      meta: { requestId: makeRequestId() },
    });
    return;
  }
  next();
}

function sanitizeId(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_-]/g, '');
}

async function createApp() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Public gateway & locale config (NO secrets exposed)
  app.get('/api/config/public', (_req, res) => {
    res.json({
      data: {
        paymentMode: 'whatsapp_chat',
        whatsappConfigured: true,
        midtransConfigured: false,
        midtransClientKey: '',
        midtransIsProduction: false,
        timezone: 'Asia/Jakarta',
        currency: 'IDR',
      },
      meta: { requestId: makeRequestId() },
    });
  });

  async function fetchPublicStorefrontSnapshot() {
    try {
      const [products, categories, brands, cmsDoc, settingsDoc] = await Promise.all([
        runStructuredQuery<Product>('products', { whereField: 'status', whereValue: 'published', limit: 100 }),
        runStructuredQuery('categories', { whereField: 'isActive', whereValue: true, limit: 30 }),
        runStructuredQuery('brands', { limit: 50 }),
        getDocument('cms_content/storefront'),
        getDocument('store_settings/general'),
      ]);

      return {
        seededInFirestore: products.length > 0,
        products: products.length > 0 ? products.map((d) => d.data) : DEMO_PRODUCTS,
        categories: (categories.length > 0 ? categories.map((d) => d.data) : DEMO_CATEGORIES) as typeof DEMO_CATEGORIES,
        brands: (brands.length > 0 ? brands.map((d) => d.data) : DEMO_BRANDS) as typeof DEMO_BRANDS,
        cms: (cmsDoc ? cmsDoc.data : DEFAULT_CMS_CONTENT) as typeof DEFAULT_CMS_CONTENT,
        settings: (settingsDoc ? settingsDoc.data : DEFAULT_STORE_SETTINGS) as StoreSettings,
      };
    } catch (error) {
      return {
        seededInFirestore: false,
        products: DEMO_PRODUCTS,
        categories: DEMO_CATEGORIES,
        brands: DEMO_BRANDS,
        cms: DEFAULT_CMS_CONTENT,
        settings: DEFAULT_STORE_SETTINGS,
        fallbackReason: error instanceof Error ? error.message : 'Using demonstration data',
      };
    }
  }

  function resolveRequestOrigin(req: Request): string {
    const forwardedProto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim();
    const host = req.get('host');
    if (host) {
      return `${forwardedProto || req.protocol || 'https'}://${host}`;
    }
    return (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
  }

  // Public catalog bootstrap fallback (reads Firestore published items, or returns demo info flag)
  app.get('/api/storefront/bootstrap', async (_req, res) => {
    const snapshot = await fetchPublicStorefrontSnapshot();
    res.json({
      data: snapshot,
      meta: { requestId: makeRequestId() },
    });
  });

  // Public CORS-enabled Agency Integration Catalog Feed (NO PII, published catalog only)
  app.get('/api/integration/catalog-feed.json', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=60');
    const snapshot = await fetchPublicStorefrontSnapshot();
    const payload = buildCatalogFeedPayload({
      origin: resolveRequestOrigin(req),
      seededInFirestore: snapshot.seededInFirestore,
      products: snapshot.products,
      categories: snapshot.categories,
      brands: snapshot.brands,
      settings: snapshot.settings,
    });
    res.json(payload);
  });

  // Public CORS-enabled Agency Brand Kit Feed (Colors, Fonts, Logos, Copy, Links)
  app.get('/api/integration/brand-kit.json', async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=120');
    const snapshot = await fetchPublicStorefrontSnapshot();
    const payload = buildBrandKitPayload({
      origin: resolveRequestOrigin(req),
      cms: snapshot.cms,
      settings: snapshot.settings,
    });
    res.json(payload);
  });

  // Public Brand & Visual Assets ZIP Bundle (Logos, 7 JPG Photos, Design Tokens, Feeds, Translations, Handoff Docs)
  app.get('/api/integration/brand-assets.zip', async (req, res) => {
    try {
      res.setHeader('Access-Control-Allow-Origin', '*');
      const origin = resolveRequestOrigin(req);
      const snapshot = await fetchPublicStorefrontSnapshot();
      const catalogFeed = buildCatalogFeedPayload({
        origin,
        seededInFirestore: snapshot.seededInFirestore,
        products: snapshot.products,
        categories: snapshot.categories,
        brands: snapshot.brands,
        settings: snapshot.settings,
      });
      const brandKit = buildBrandKitPayload({
        origin,
        cms: snapshot.cms,
        settings: snapshot.settings,
      });
      const entries = collectBrandAssetsZipEntries({ catalogFeed, brandKit });
      const zipBuffer = createZipBuffer(entries);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="preluxes-brand-assets.zip"');
      res.send(zipBuffer);
    } catch (error) {
      res.status(500).json({
        error: { code: 'ZIP_BUILD_ERROR', message: error instanceof Error ? error.message : 'Gagal membuat arsip Brand Kit.' },
      });
    }
  });

  // Direct Browser Download Folder Routes (/download/*.zip)
  app.get('/download/preluxes-brand-assets.zip', async (req, res) => {
    try {
      res.setHeader('Access-Control-Allow-Origin', '*');
      const origin = resolveRequestOrigin(req);
      const snapshot = await fetchPublicStorefrontSnapshot();
      const catalogFeed = buildCatalogFeedPayload({
        origin,
        seededInFirestore: snapshot.seededInFirestore,
        products: snapshot.products,
        categories: snapshot.categories,
        brands: snapshot.brands,
        settings: snapshot.settings,
      });
      const brandKit = buildBrandKitPayload({
        origin,
        cms: snapshot.cms,
        settings: snapshot.settings,
      });
      const entries = collectBrandAssetsZipEntries({ catalogFeed, brandKit });
      const zipBuffer = createZipBuffer(entries);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="preluxes-brand-assets.zip"');
      res.send(zipBuffer);
    } catch (error) {
      res.status(500).json({
        error: { code: 'ZIP_BUILD_ERROR', message: error instanceof Error ? error.message : 'Gagal membuat arsip Brand Kit.' },
      });
    }
  });

  app.get('/download/preluxes-master-package.zip', async (req, res) => {
    try {
      res.setHeader('Access-Control-Allow-Origin', '*');
      const origin = resolveRequestOrigin(req);
      const snapshot = await fetchPublicStorefrontSnapshot();
      const catalogFeed = buildCatalogFeedPayload({
        origin,
        seededInFirestore: snapshot.seededInFirestore,
        products: snapshot.products,
        categories: snapshot.categories,
        brands: snapshot.brands,
        settings: snapshot.settings,
      });
      const brandKit = buildBrandKitPayload({
        origin,
        cms: snapshot.cms,
        settings: snapshot.settings,
      });
      const entries = collectMasterPackageZipEntries({ catalogFeed, brandKit });
      const zipBuffer = createZipBuffer(entries);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="preluxes-master-package.zip"');
      res.send(zipBuffer);
    } catch (error) {
      res.status(500).json({
        error: { code: 'MASTER_ZIP_ERROR', message: error instanceof Error ? error.message : 'Gagal membuat arsip Master Package.' },
      });
    }
  });

  // Admin-Only Complete Website Master Package ZIP (Brand Kit + Full Source Code + Firestore Schema/Rules)
  app.get('/api/admin/master-package.zip', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const origin = resolveRequestOrigin(req);
      const snapshot = await fetchPublicStorefrontSnapshot();
      const catalogFeed = buildCatalogFeedPayload({
        origin,
        seededInFirestore: snapshot.seededInFirestore,
        products: snapshot.products,
        categories: snapshot.categories,
        brands: snapshot.brands,
        settings: snapshot.settings,
      });
      const brandKit = buildBrandKitPayload({
        origin,
        cms: snapshot.cms,
        settings: snapshot.settings,
      });
      const entries = collectMasterPackageZipEntries({ catalogFeed, brandKit });
      const zipBuffer = createZipBuffer(entries);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="preluxes-master-package.zip"');
      res.send(zipBuffer);
    } catch (error) {
      res.status(500).json({
        error: { code: 'MASTER_ZIP_ERROR', message: error instanceof Error ? error.message : 'Gagal membuat arsip Master Package.' },
      });
    }
  });

  // Verify user role server-side
  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    res.json({
      data: {
        uid: req.user!.uid,
        email: req.user!.email || '',
        name: req.user!.name || req.user!.email || 'Pengguna Preluxes',
        isAdmin: Boolean(req.isAdmin),
      },
      meta: { requestId: makeRequestId() },
    });
  });

  // Admin: Seed demonstration dataset into Firestore cleanly
  app.post('/api/admin/seed-demo', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    const reqId = makeRequestId();
    const idToken = req.idToken!;
    try {
      const writes: CommitWrite[] = [];

      for (const cat of DEMO_CATEGORIES) {
        writes.push({
          update: {
            name: `${DOC_PREFIX}categories/${cat.id}`,
            fields: encodeFields(cat as unknown as Record<string, unknown>, ['createdAt', 'updatedAt']),
          },
          updateTransforms: [
            { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
            { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
          ],
        });
      }

      for (const brand of DEMO_BRANDS) {
        writes.push({
          update: {
            name: `${DOC_PREFIX}brands/${brand.id}`,
            fields: encodeFields(brand as unknown as Record<string, unknown>, ['createdAt', 'updatedAt']),
          },
          updateTransforms: [
            { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
            { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
          ],
        });
      }

      for (const prod of DEMO_PRODUCTS) {
        writes.push({
          update: {
            name: `${DOC_PREFIX}products/${prod.id}`,
            fields: encodeFields(prod as unknown as Record<string, unknown>, ['publishedAt', 'createdAt', 'updatedAt']),
          },
          updateTransforms: [
            { fieldPath: 'publishedAt', setToServerValue: 'REQUEST_TIME' },
            { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
            { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
          ],
        });
      }

      for (const coupon of DEMO_COUPONS) {
        writes.push({
          update: {
            name: `${DOC_PREFIX}coupons/${coupon.id}`,
            fields: encodeFields(coupon as unknown as Record<string, unknown>, ['createdAt', 'updatedAt']),
          },
          updateTransforms: [
            { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
            { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
          ],
        });
      }

      writes.push({
        update: {
          name: `${DOC_PREFIX}cms_content/storefront`,
          fields: encodeFields(DEFAULT_CMS_CONTENT as unknown as Record<string, unknown>, ['updatedAt']),
        },
        updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
      });

      writes.push({
        update: {
          name: `${DOC_PREFIX}store_settings/general`,
          fields: encodeFields(DEFAULT_STORE_SETTINGS as unknown as Record<string, unknown>, ['updatedAt']),
        },
        updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
      });

      await commitWrites(writes, idToken);
      res.json({
        data: { seededCount: DEMO_PRODUCTS.length, message: 'Data demonstrasi Preluxes berhasil disimpan ke Firestore.' },
        meta: { requestId: reqId },
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'SEED_FAILED',
          message: error instanceof Error ? error.message : 'Gagal menyimpan data demonstrasi.',
        },
        meta: { requestId: reqId },
      });
    }
  });

  // Customer: Validate cart items & coupon against authoritative Firestore pricing & availability
  app.post('/api/checkout/validate', requireAuth, async (req: AuthenticatedRequest, res) => {
    const reqId = makeRequestId();
    const idToken = req.idToken!;
    try {
      const { items, courierCode, couponCode } = req.body as {
        items?: { productId: string; quantity: number }[];
        courierCode?: string;
        couponCode?: string;
      };
      if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
        res.status(400).json({
          error: { code: 'INVALID_CART', message: 'Keranjang belanja kosong atau melebihi batas.' },
          meta: { requestId: reqId },
        });
        return;
      }

      const productDocs = await Promise.all(
        items.map((i) => getDocument<Product>(`products/${sanitizeId(i.productId)}`, idToken))
      );
      const products = productDocs.filter(Boolean).map((d) => d!.data);
      const settingsDoc = await getDocument<StoreSettings>('store_settings/general', idToken);
      const settings = settingsDoc ? settingsDoc.data : DEFAULT_STORE_SETTINGS;
      const shippingOption =
        settings.shippingOptions.find((s) => s.code === courierCode) || settings.shippingOptions[0];

      let matchedCoupon: Coupon | null = null;
      if (couponCode && couponCode.trim().length > 0) {
        const coupons = await runStructuredQuery<Coupon>('coupons', {
          whereField: 'code',
          whereValue: couponCode.trim().toUpperCase(),
          limit: 1,
          idToken,
        });
        if (coupons.length > 0) {
          matchedCoupon = coupons[0].data;
        }
      }

      const result = computeCheckoutTotals({
        products,
        requestedItems: items,
        shippingCost: shippingOption?.cost ?? 0,
        coupon: matchedCoupon,
      });

      res.json({
        data: {
          ...result,
          couponApplied: matchedCoupon && result.discountAmount > 0 ? matchedCoupon.code : null,
          courier: shippingOption,
        },
        meta: { requestId: reqId },
      });
    } catch (error) {
      res.status(500).json({
        error: { code: 'VALIDATION_ERROR', message: error instanceof Error ? error.message : 'Gagal memvalidasi keranjang.' },
        meta: { requestId: reqId },
      });
    }
  });

  // Customer: Atomic checkout with server-calculated totals, optimistic concurrency stock reservation, and Snap token
  app.post('/api/checkout/create-order', requireAuth, async (req: AuthenticatedRequest, res) => {
    const reqId = makeRequestId();
    const idToken = req.idToken!;
    const user = req.user!;

    try {
      const { items, shippingAddress, courierCode, couponCode, customerPhone } = req.body as {
        items?: { productId: string; quantity: number }[];
        shippingAddress?: Order['shippingAddressSnapshot'];
        courierCode?: string;
        couponCode?: string;
        customerPhone?: string;
      };

      if (!Array.isArray(items) || items.length === 0 || items.length > 20) {
        res.status(400).json({
          error: { code: 'INVALID_ITEMS', message: 'Pilih minimal 1 produk untuk checkout.' },
          meta: { requestId: reqId },
        });
        return;
      }

      if (
        !shippingAddress ||
        !shippingAddress.recipientName?.trim() ||
        !shippingAddress.phone?.trim() ||
        !shippingAddress.addressLine?.trim() ||
        !shippingAddress.city?.trim() ||
        !shippingAddress.province?.trim() ||
        !shippingAddress.postalCode?.trim()
      ) {
        res.status(400).json({
          error: { code: 'INVALID_ADDRESS', message: 'Lengkapi data penerima dan alamat pengiriman.' },
          meta: { requestId: reqId },
        });
        return;
      }

      const productDocs = await Promise.all(
        items.map((i) => getDocument<Product>(`products/${sanitizeId(i.productId)}`, idToken))
      );

      if (productDocs.some((d) => !d)) {
        res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_IN_DB',
            message: 'Produk demonstrasi belum tersimpan di Firestore. Silakan masuk sebagai Admin untuk seed katalog atau tambahkan produk di Admin.',
          },
          meta: { requestId: reqId },
        });
        return;
      }

      const validDocs = productDocs as NonNullable<(typeof productDocs)[number]>[];
      const products = validDocs.map((d) => d.data);
      const settingsDoc = await getDocument<StoreSettings>('store_settings/general', idToken);
      const settings = settingsDoc ? settingsDoc.data : DEFAULT_STORE_SETTINGS;
      const shippingOption =
        settings.shippingOptions.find((s) => s.code === courierCode) || settings.shippingOptions[0];

      let matchedCouponDoc: { id: string; updateTime: string; data: Coupon } | null = null;
      if (couponCode && couponCode.trim().length > 0) {
        const found = await runStructuredQuery<Coupon>('coupons', {
          whereField: 'code',
          whereValue: couponCode.trim().toUpperCase(),
          limit: 1,
          idToken,
        });
        if (found.length > 0) {
          matchedCouponDoc = found[0];
        }
      }

      const totals = computeCheckoutTotals({
        products,
        requestedItems: items,
        shippingCost: shippingOption.cost,
        coupon: matchedCouponDoc ? matchedCouponDoc.data : null,
      });

      if (totals.errors.length > 0) {
        res.status(409).json({
          error: { code: 'STOCK_CONFLICT', message: totals.errors[0], details: totals.errors },
          meta: { requestId: reqId },
        });
        return;
      }

      const now = new Date();
      const reservationMins = settings.reservationMinutes || 15;
      const deadline = new Date(now.getTime() + reservationMins * 60 * 1000).toISOString();
      const orderId = `ord-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
      const orderNumber = `PLX-${now.getFullYear().toString().slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
      const paymentId = `pay-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

      const orderPayload: Order = {
        id: orderId,
        orderNumber,
        userId: user.uid,
        customerName: (user.name || shippingAddress.recipientName).trim(),
        customerEmail: user.email || '',
        customerPhone: (customerPhone || shippingAddress.phone).trim(),
        shippingAddressSnapshot: {
          label: shippingAddress.label || 'Alamat Utama',
          recipientName: shippingAddress.recipientName.trim(),
          phone: shippingAddress.phone.trim(),
          addressLine: shippingAddress.addressLine.trim(),
          province: shippingAddress.province.trim(),
          city: shippingAddress.city.trim(),
          district: (shippingAddress.district || '').trim(),
          postalCode: shippingAddress.postalCode.trim(),
          notes: (shippingAddress.notes || '').trim(),
        },
        courierCode: shippingOption.code,
        courierService: `${shippingOption.name} (${shippingOption.service})`,
        trackingNumber: '',
        items: totals.items,
        subtotal: totals.subtotal,
        discountAmount: totals.discountAmount,
        couponCode: matchedCouponDoc && totals.discountAmount > 0 ? matchedCouponDoc.data.code : null,
        shippingAmount: totals.shippingAmount,
        grandTotal: totals.grandTotal,
        paymentStatus: 'pending',
        fulfilmentStatus: 'unfulfilled',
        paymentProvider: 'whatsapp_chat',
        paymentMethod: 'whatsapp_chat_confirmation',
        paymentReference: orderNumber,
        snapToken: '',
        paymentDeadline: deadline,
        adminNotes: '',
        isDemo: products.some((p) => p.isDemo),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };

      const writes: CommitWrite[] = [];

      // Atomic stock reservation with optimistic concurrency updateTime precondition
      for (const reqItem of items) {
        const doc = validDocs.find((d) => d.id === reqItem.productId)!;
        const nextReserved = (doc.data.reservedQuantity || 0) + reqItem.quantity;
        writes.push({
          update: {
            name: `${DOC_PREFIX}products/${doc.id}`,
            fields: encodeFields(
              {
                ...doc.data,
                reservedQuantity: nextReserved,
                updatedAt: now.toISOString(),
              },
              ['publishedAt', 'createdAt', 'updatedAt']
            ),
          },
          updateMask: { fieldPaths: ['reservedQuantity', 'updatedAt'] },
          currentDocument: { updateTime: doc.updateTime },
          updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
        });

        const logId = `log-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        writes.push({
          update: {
            name: `${DOC_PREFIX}inventory_logs/${logId}`,
            fields: encodeFields(
              {
                id: logId,
                productId: doc.id,
                productSku: doc.data.sku,
                type: 'reservation',
                deltaQuantity: -reqItem.quantity,
                previousQuantity: doc.data.quantity,
                newQuantity: doc.data.quantity,
                reason: `Reservasi checkout ${orderNumber}`,
                actorUid: user.uid,
                actorEmail: user.email || '',
                createdAt: now.toISOString(),
              },
              ['createdAt']
            ),
          },
          currentDocument: { exists: false },
          updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
        });
      }

      if (matchedCouponDoc && totals.discountAmount > 0) {
        writes.push({
          update: {
            name: `${DOC_PREFIX}coupons/${matchedCouponDoc.id}`,
            fields: encodeFields(
              {
                ...matchedCouponDoc.data,
                usageCount: (matchedCouponDoc.data.usageCount || 0) + 1,
                updatedAt: now.toISOString(),
              },
              ['createdAt', 'updatedAt']
            ),
          },
          updateMask: { fieldPaths: ['usageCount', 'updatedAt'] },
          currentDocument: { updateTime: matchedCouponDoc.updateTime },
          updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
        });
      }

      writes.push({
        update: {
          name: `${DOC_PREFIX}orders/${orderId}`,
          fields: encodeFields(
            orderPayload as unknown as Record<string, unknown>,
            ['paymentDeadline', 'createdAt', 'updatedAt']
          ),
        },
        currentDocument: { exists: false },
        updateTransforms: [
          { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
          { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
        ],
      });

      writes.push({
        update: {
          name: `${DOC_PREFIX}payments/${paymentId}`,
          fields: encodeFields(
            {
              id: paymentId,
              orderId,
              orderNumber,
              userId: user.uid,
              provider: 'whatsapp_chat',
              providerReference: orderNumber,
              paymentMethod: 'whatsapp_chat_confirmation',
              amount: orderPayload.grandTotal,
              status: 'pending',
              snapToken: '',
              expiresAt: deadline,
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
            },
            ['expiresAt', 'createdAt', 'updatedAt']
          ),
        },
        currentDocument: { exists: false },
        updateTransforms: [
          { fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' },
          { fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' },
        ],
      });

      try {
        await commitWrites(writes, idToken);
      } catch (commitErr) {
        const status = (commitErr as Error & { status?: number }).status;
        if (status === 409 || status === 412 || (commitErr instanceof Error && commitErr.message.includes('ABORTED'))) {
          res.status(409).json({
            error: {
              code: 'CONCURRENT_RESERVATION',
              message: 'Produk baru saja dipesan oleh pembeli lain. Muat ulang keranjang untuk mengecek ketersediaan.',
            },
            meta: { requestId: reqId },
          });
          return;
        }
        throw commitErr;
      }

      res.status(201).json({
        data: {
          order: orderPayload,
          paymentId,
          snapToken: '',
          snapRedirectUrl: '',
          mode: 'whatsapp_chat',
        },
        meta: { requestId: reqId },
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'CHECKOUT_ERROR',
          message: error instanceof Error ? error.message : 'Gagal membuat pesanan.',
        },
        meta: { requestId: reqId },
      });
    }
  });

  // Reconcile payment outcome (Midtrans real status check OR sandbox simulation)
  app.post('/api/payments/reconcile', requireAuth, async (req: AuthenticatedRequest, res) => {
    const reqId = makeRequestId();
    const idToken = req.idToken!;
    const user = req.user!;

    try {
      const { orderId, simulatedOutcome, paymentMethod } = req.body as {
        orderId?: string;
        simulatedOutcome?: 'settlement' | 'pending' | 'expire' | 'cancel';
        paymentMethod?: string;
      };

      if (!orderId) {
        res.status(400).json({
          error: { code: 'MISSING_ORDER', message: 'ID pesanan diperlukan.' },
          meta: { requestId: reqId },
        });
        return;
      }

      const orderDoc = await getDocument<Order>(`orders/${sanitizeId(orderId)}`, idToken);
      if (!orderDoc) {
        res.status(404).json({
          error: { code: 'ORDER_NOT_FOUND', message: 'Pesanan tidak ditemukan.' },
          meta: { requestId: reqId },
        });
        return;
      }

      const order = orderDoc.data;
      if (order.userId !== user.uid && !req.isAdmin) {
        res.status(403).json({
          error: { code: 'FORBIDDEN', message: 'Anda tidak memiliki akses ke pesanan ini.' },
          meta: { requestId: reqId },
        });
        return;
      }

      if (order.paymentStatus !== 'pending') {
        res.json({
          data: { order, alreadyFinalized: true },
          meta: { requestId: reqId },
        });
        return;
      }

      let txStatus = 'pending';
      let fraudStatus: string | undefined;
      let resolvedMethod = paymentMethod || 'whatsapp_chat_confirmation';
      let providerRef = order.paymentReference || order.orderNumber || '';

      if (order.paymentProvider === 'whatsapp_chat') {
        if (simulatedOutcome === 'settlement' && !req.isAdmin) {
          res.status(403).json({
            error: {
              code: 'ADMIN_CONFIRMATION_REQUIRED',
              message: 'Hanya Admin Preluxes yang dapat mengonfirmasi pelunasan pembayaran WhatsApp.',
            },
            meta: { requestId: reqId },
          });
          return;
        }
        if (isReservationExpired(order) && simulatedOutcome !== 'settlement') {
          txStatus = 'expire';
        } else if (simulatedOutcome) {
          txStatus = simulatedOutcome;
        }
      } else {
        const mtConfig = getMidtransPublicConfig();
        if (mtConfig.configured && !order.snapToken?.startsWith('SIM-SNAP-')) {
          const liveStatus = await fetchMidtransTransactionStatus(order.orderNumber);
          if (liveStatus) {
            txStatus = liveStatus.transaction_status;
            fraudStatus = liveStatus.fraud_status;
            resolvedMethod = liveStatus.payment_type || resolvedMethod;
            providerRef = liveStatus.transaction_id || providerRef;
          }
        } else if (isReservationExpired(order)) {
          txStatus = 'expire';
        } else if (simulatedOutcome) {
          txStatus = simulatedOutcome;
        }
      }

      const mapped = mapMidtransStatus(txStatus, fraudStatus);
      if (mapped.paymentStatus === 'pending') {
        res.json({
          data: { order, status: 'pending' },
          meta: { requestId: reqId },
        });
        return;
      }

      const nowIso = new Date().toISOString();
      const writes: CommitWrite[] = [];

      // Update order
      writes.push({
        update: {
          name: `${DOC_PREFIX}orders/${order.id}`,
          fields: encodeFields(
            {
              ...order,
              paymentStatus: mapped.paymentStatus,
              fulfilmentStatus: mapped.fulfilmentStatus,
              paymentMethod: resolvedMethod,
              paymentReference: providerRef,
              paidAt: mapped.paymentStatus === 'paid' ? nowIso : null,
              updatedAt: nowIso,
            },
            ['paymentDeadline', 'paidAt', 'createdAt', 'updatedAt']
          ),
        },
        updateMask: {
          fieldPaths: ['paymentStatus', 'fulfilmentStatus', 'paymentMethod', 'paymentReference', 'paidAt', 'updatedAt'],
        },
        currentDocument: { updateTime: orderDoc.updateTime },
        updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
      });

      // Update payment records linked to order
      const paymentDocs = await runStructuredQuery('payments', {
        whereField: 'userId',
        whereValue: order.userId,
        limit: 50,
        idToken,
      });
      for (const pDoc of paymentDocs) {
        if ((pDoc.data as { orderId?: string }).orderId === order.id) {
          writes.push({
            update: {
              name: `${DOC_PREFIX}payments/${pDoc.id}`,
              fields: encodeFields(
                {
                  ...pDoc.data,
                  status: mapped.paymentStatus,
                  paymentMethod: resolvedMethod,
                  providerReference: providerRef,
                  paidAt: mapped.paymentStatus === 'paid' ? nowIso : null,
                  updatedAt: nowIso,
                },
                ['paidAt', 'expiresAt', 'createdAt', 'updatedAt']
              ),
            },
            updateMask: {
              fieldPaths: ['status', 'paymentMethod', 'providerReference', 'paidAt', 'updatedAt'],
            },
            currentDocument: { updateTime: pDoc.updateTime },
            updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
          });
        }
      }

      // Commit or Release Inventory atomically
      if (mapped.inventoryAction !== 'none') {
        for (const item of order.items) {
          const prodDoc = await getDocument<Product>(`products/${item.productId}`, idToken);
          if (!prodDoc) continue;
          const p = prodDoc.data;
          const nextReserved = Math.max(0, (p.reservedQuantity || 0) - item.quantity);
          const nextQty =
            mapped.inventoryAction === 'commit'
              ? Math.max(0, (p.quantity || 0) - item.quantity)
              : p.quantity;

          writes.push({
            update: {
              name: `${DOC_PREFIX}products/${p.id}`,
              fields: encodeFields(
                {
                  ...p,
                  quantity: nextQty,
                  reservedQuantity: nextReserved,
                  updatedAt: nowIso,
                },
                ['publishedAt', 'createdAt', 'updatedAt']
              ),
            },
            updateMask: { fieldPaths: ['quantity', 'reservedQuantity', 'updatedAt'] },
            currentDocument: { updateTime: prodDoc.updateTime },
            updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
          });

          const logId = `log-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
          writes.push({
            update: {
              name: `${DOC_PREFIX}inventory_logs/${logId}`,
              fields: encodeFields(
                {
                  id: logId,
                  productId: p.id,
                  productSku: p.sku,
                  type: mapped.inventoryAction === 'commit' ? 'commit' : 'release',
                  deltaQuantity: mapped.inventoryAction === 'commit' ? -item.quantity : 0,
                  previousQuantity: p.quantity,
                  newQuantity: nextQty,
                  reason:
                    mapped.inventoryAction === 'commit'
                      ? `Pembayaran terverifikasi untuk ${order.orderNumber}`
                      : `Pelepasan reservasi ${order.orderNumber} (${mapped.paymentStatus})`,
                  actorUid: user.uid,
                  actorEmail: user.email || '',
                  createdAt: nowIso,
                },
                ['createdAt']
              ),
            },
            currentDocument: { exists: false },
            updateTransforms: [{ fieldPath: 'createdAt', setToServerValue: 'REQUEST_TIME' }],
          });
        }
      }

      await commitWrites(writes, idToken);

      const updatedOrder = await getDocument<Order>(`orders/${order.id}`, idToken);
      res.json({
        data: { order: updatedOrder?.data || order },
        meta: { requestId: reqId },
      });
    } catch (error) {
      res.status(500).json({
        error: {
          code: 'RECONCILE_FAILED',
          message: error instanceof Error ? error.message : 'Gagal memperbarui status pembayaran.',
        },
        meta: { requestId: reqId },
      });
    }
  });

  // Midtrans Webhook Callback (Server-to-Server, SHA-512 signature verified, idempotent)
  app.post('/api/webhooks/payments/midtrans', async (req, res) => {
    const reqId = makeRequestId();
    const payload = req.body as {
      order_id?: string;
      status_code?: string;
      gross_amount?: string;
      signature_key?: string;
      transaction_status?: string;
      fraud_status?: string;
      transaction_id?: string;
    };

    if (!payload.order_id || !payload.status_code || !payload.gross_amount || !payload.signature_key) {
      res.status(400).json({
        error: { code: 'INVALID_WEBHOOK', message: 'Payload webhook tidak lengkap.' },
        meta: { requestId: reqId },
      });
      return;
    }

    const valid = verifyMidtransSignature({
      orderId: payload.order_id,
      statusCode: payload.status_code,
      grossAmount: payload.gross_amount,
      signatureKey: payload.signature_key,
    });

    if (!valid) {
      res.status(403).json({
        error: { code: 'INVALID_SIGNATURE', message: 'Signature Midtrans tidak valid.' },
        meta: { requestId: reqId },
      });
      return;
    }

    const eventKey = `${payload.transaction_id || payload.order_id}:${payload.transaction_status}`;
    if (processedWebhookIds.has(eventKey)) {
      res.json({ data: { status: 'idempotent_ok' }, meta: { requestId: reqId } });
      return;
    }

    processedWebhookIds.add(eventKey);
    res.json({
      data: {
        status: 'verified',
        mapped: mapMidtransStatus(payload.transaction_status || 'pending', payload.fraud_status),
      },
      meta: { requestId: reqId },
    });
  });

  // Admin: Update Order Fulfilment & Tracking Number
  app.patch('/api/admin/orders/:orderId/fulfilment', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    const reqId = makeRequestId();
    const idToken = req.idToken!;
    const orderId = sanitizeId(String(req.params.orderId || ''));

    try {
      const { fulfilmentStatus, trackingNumber, adminNotes } = req.body as {
        fulfilmentStatus?: Order['fulfilmentStatus'];
        trackingNumber?: string;
        adminNotes?: string;
      };

      const orderDoc = await getDocument<Order>(`orders/${orderId}`, idToken);
      if (!orderDoc) {
        res.status(404).json({
          error: { code: 'NOT_FOUND', message: 'Pesanan tidak ditemukan.' },
          meta: { requestId: reqId },
        });
        return;
      }

      const nowIso = new Date().toISOString();
      const nextFulfilment = fulfilmentStatus || orderDoc.data.fulfilmentStatus;
      const updatedFields: Record<string, unknown> = {
        ...orderDoc.data,
        fulfilmentStatus: nextFulfilment,
        trackingNumber: trackingNumber !== undefined ? trackingNumber.trim() : orderDoc.data.trackingNumber || '',
        adminNotes: adminNotes !== undefined ? adminNotes.trim() : orderDoc.data.adminNotes || '',
        updatedAt: nowIso,
      };
      if (nextFulfilment === 'shipped' && !orderDoc.data.shippedAt) {
        updatedFields.shippedAt = nowIso;
      }
      if (nextFulfilment === 'completed' && !orderDoc.data.completedAt) {
        updatedFields.completedAt = nowIso;
      }

      await commitWrites(
        [
          {
            update: {
              name: `${DOC_PREFIX}orders/${orderId}`,
              fields: encodeFields(updatedFields, ['paymentDeadline', 'paidAt', 'shippedAt', 'completedAt', 'createdAt', 'updatedAt']),
            },
            updateMask: {
              fieldPaths: ['fulfilmentStatus', 'trackingNumber', 'adminNotes', 'shippedAt', 'completedAt', 'updatedAt'],
            },
            currentDocument: { updateTime: orderDoc.updateTime },
            updateTransforms: [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }],
          },
        ],
        idToken
      );

      res.json({ data: { order: updatedFields }, meta: { requestId: reqId } });
    } catch (error) {
      res.status(500).json({
        error: { code: 'UPDATE_FAILED', message: error instanceof Error ? error.message : 'Gagal memperbarui pengiriman.' },
        meta: { requestId: reqId },
      });
    }
  });

  // Admin: Export CSV Sales Report
  app.get('/api/admin/reports/export.csv', requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const docs = await runStructuredQuery<Order>('orders', { limit: 250, idToken: req.idToken! });
      const header = ['Order Number', 'Created At', 'Customer', 'Payment Status', 'Fulfilment Status', 'Grand Total (IDR)', 'Courier', 'Tracking Number'];
      const rows = docs.map((d) => {
        const o = d.data;
        return [
          o.orderNumber,
          o.createdAt,
          `"${(o.customerName || '').replace(/"/g, '""')}"`,
          o.paymentStatus,
          o.fulfilmentStatus,
          String(o.grandTotal),
          `"${(o.courierService || '').replace(/"/g, '""')}"`,
          `"${(o.trackingNumber || '').replace(/"/g, '""')}"`,
        ].join(',');
      });
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="preluxes-orders-report.csv"');
      res.send([header.join(','), ...rows].join('\n'));
    } catch (error) {
      res.status(500).json({
        error: { code: 'EXPORT_ERROR', message: error instanceof Error ? error.message : 'Gagal mengekspor laporan.' },
      });
    }
  });

  // Frontend Vite middleware in dev OR dist static serving in production
  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Preluxes server listening on http://0.0.0.0:${PORT}`);
  });
}

createApp().catch((err) => {
  console.error('Failed to start Preluxes server:', err);
  process.exit(1);
});
