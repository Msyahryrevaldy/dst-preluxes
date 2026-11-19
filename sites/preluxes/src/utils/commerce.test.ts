import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWhatsappChatUrl,
  calculateDiscountAmount,
  computeCheckoutTotals,
  computeSalesMetrics,
  formatIDR,
  formatJakartaDate,
  formatOrderWhatsappMessage,
  getAvailableQuantity,
  isProductPurchasable,
  isReservationExpired,
  mapMidtransStatus,
  normalizeWhatsappNumber,
  slugify,
} from './commerce.ts';
import type { Coupon, Order, Product } from '../types/store.ts';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 'prod-1',
    name: 'Blazer Wol Linen',
    slug: 'blazer-wol-linen',
    sku: 'PLX-001',
    description: 'Detail kurasi',
    categoryId: 'cat-pakaian',
    categoryName: 'Pakaian',
    brandName: 'Contoh Kurasi',
    gender: 'Women',
    sizeLabel: 'M',
    color: 'Olive Charcoal',
    material: 'Wool & Linen',
    conditionGrade: 'B',
    conditionNotes: 'Kondisi sangat baik, kancing lengkap.',
    measurements: { chestWidthCm: 52, lengthCm: 70 },
    originalPrice: 950000,
    sellingPrice: 485000,
    images: [{ url: '/test.jpg', altText: 'Front', imageType: 'front', isPrimary: true, sortOrder: 0 }],
    primaryImageUrl: '/test.jpg',
    quantity: 1,
    reservedQuantity: 0,
    status: 'published',
    isFeatured: true,
    isDemo: true,
    createdAt: '2026-11-17T05:00:00.000Z',
    updatedAt: '2026-11-17T05:00:00.000Z',
    ...overrides,
  };
}

test('formatIDR formats integer rupiah cleanly', () => {
  assert.equal(formatIDR(485000), 'Rp 485.000');
  assert.equal(formatIDR(0), 'Rp 0');
});

test('formatJakartaDate formats Asia/Jakarta WIB time', () => {
  const formatted = formatJakartaDate('2026-11-17T05:30:00.000Z', true);
  assert.match(formatted, /12[:.]30/);
  assert.match(formatted, /WIB$/);
});

test('availability and purchasability prevent overselling', () => {
  const p = makeProduct({ quantity: 1, reservedQuantity: 0 });
  assert.equal(getAvailableQuantity(p), 1);
  assert.equal(isProductPurchasable(p), true);

  const reserved = makeProduct({ quantity: 1, reservedQuantity: 1 });
  assert.equal(getAvailableQuantity(reserved), 0);
  assert.equal(isProductPurchasable(reserved), false);

  const draft = makeProduct({ status: 'draft', quantity: 1, reservedQuantity: 0 });
  assert.equal(isProductPurchasable(draft), false);
});

test('computeCheckoutTotals ignores client price and detects stock conflicts', () => {
  const prod = makeProduct({ id: 'p1', sellingPrice: 485000, quantity: 1, reservedQuantity: 0 });
  const coupon: Coupon = {
    id: 'c1',
    code: 'PRELUXES10',
    discountType: 'percentage',
    discountValue: 10,
    minimumOrder: 300000,
    maximumDiscount: 60000,
    usageCount: 0,
    isActive: true,
    createdAt: '2026-11-17T00:00:00.000Z',
    updatedAt: '2026-11-17T00:00:00.000Z',
  };

  const res = computeCheckoutTotals({
    products: [prod],
    requestedItems: [{ productId: 'p1', quantity: 1 }],
    shippingCost: 22000,
    coupon,
  });

  assert.equal(res.errors.length, 0);
  assert.equal(res.subtotal, 485000);
  assert.equal(res.discountAmount, 48500);
  assert.equal(res.shippingAmount, 22000);
  assert.equal(res.grandTotal, 458500);

  const over = computeCheckoutTotals({
    products: [prod],
    requestedItems: [{ productId: 'p1', quantity: 2 }],
    shippingCost: 22000,
  });
  assert.equal(over.errors.length, 1);
});

test('calculateDiscountAmount respects minimumOrder and usageLimit', () => {
  const coupon: Coupon = {
    id: 'c2',
    code: 'HEMAT50',
    discountType: 'fixed',
    discountValue: 50000,
    minimumOrder: 500000,
    usageLimit: 1,
    usageCount: 1,
    isActive: true,
    createdAt: '2026-11-17T00:00:00.000Z',
    updatedAt: '2026-11-17T00:00:00.000Z',
  };
  assert.equal(calculateDiscountAmount(600000, coupon), 0);
});

test('mapMidtransStatus transitions payment, fulfilment, and inventory actions accurately', () => {
  assert.deepEqual(mapMidtransStatus('settlement'), {
    paymentStatus: 'paid',
    fulfilmentStatus: 'processing',
    inventoryAction: 'commit',
  });
  assert.deepEqual(mapMidtransStatus('expire'), {
    paymentStatus: 'expired',
    fulfilmentStatus: 'cancelled',
    inventoryAction: 'release',
  });
  assert.deepEqual(mapMidtransStatus('pending'), {
    paymentStatus: 'pending',
    fulfilmentStatus: 'unfulfilled',
    inventoryAction: 'none',
  });
});

test('isReservationExpired detects expired pending orders', () => {
  assert.equal(
    isReservationExpired(
      { paymentStatus: 'pending', paymentDeadline: '2026-11-17T10:00:00.000Z' },
      '2026-11-17T10:05:00.000Z'
    ),
    true
  );
  assert.equal(
    isReservationExpired(
      { paymentStatus: 'paid', paymentDeadline: '2026-11-17T10:00:00.000Z' },
      '2026-11-17T10:05:00.000Z'
    ),
    false
  );
});

test('computeSalesMetrics excludes pending and failed orders from revenue', () => {
  const orders = [
    { paymentStatus: 'paid', fulfilmentStatus: 'processing', grandTotal: 500000 } as Order,
    { paymentStatus: 'pending', fulfilmentStatus: 'unfulfilled', grandTotal: 999000 } as Order,
    { paymentStatus: 'paid', fulfilmentStatus: 'completed', grandTotal: 300000 } as Order,
  ];
  const metrics = computeSalesMetrics(orders);
  assert.equal(metrics.grossPaidRevenue, 800000);
  assert.equal(metrics.paidOrdersCount, 2);
  assert.equal(metrics.averageOrderValue, 400000);
  assert.equal(metrics.pendingFulfilmentCount, 1);
});

test('slugify normalizes titles cleanly', () => {
  assert.equal(slugify('Blazer Wol Linen — Olive!'), 'blazer-wol-linen-olive');
});

test('WhatsApp helpers normalize Indonesian numbers and format multilingual messages', () => {
  assert.equal(normalizeWhatsappNumber('0812-3456-7890'), '6281234567890');
  assert.equal(normalizeWhatsappNumber('+62 812-0000-0000 (Placeholder)'), '6281200000000');
  const url = buildWhatsappChatUrl('08123456789', 'Halo Admin');
  assert.equal(url, 'https://wa.me/628123456789?text=Halo%20Admin');

  const sampleOrder = {
    orderNumber: 'PLX-261117-AB12',
    items: [
      {
        productId: 'p1',
        name: 'Blazer Wol',
        sku: 'PLX-001',
        slug: 'blazer-wol',
        imageUrl: '/x.jpg',
        unitPrice: 485000,
        quantity: 1,
        lineTotal: 485000,
        conditionGrade: 'B',
        sizeLabel: 'M',
      },
    ],
    shippingAddressSnapshot: {
      recipientName: 'Sari',
      phone: '0812345678',
      addressLine: 'Jl. Kemang 1',
      city: 'Jakarta Selatan',
      province: 'DKI Jakarta',
      postalCode: '12730',
    },
    courierService: 'JNE Reguler',
    shippingAmount: 22000,
    discountAmount: 0,
    grandTotal: 507000,
    paymentDeadline: '2026-11-17T12:00:00.000Z',
  } as Order;

  assert.match(formatOrderWhatsappMessage(sampleOrder, 'id'), /PLX-261117-AB12/);
  assert.match(formatOrderWhatsappMessage(sampleOrder, 'de'), /Bestellnummer/);
  assert.match(formatOrderWhatsappMessage(sampleOrder, 'fr'), /Numéro de commande/);
});
