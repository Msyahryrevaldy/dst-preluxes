import type {
  ConditionGrade,
  Coupon,
  FulfilmentStatus,
  Order,
  OrderItemSnapshot,
  PaymentStatus,
  Product,
} from '../types/store.ts';

export const CONDITION_LABELS: Record<ConditionGrade, { title: string; summary: string }> = {
  A: {
    title: 'Grade A — Seperti Baru',
    summary: 'Hampir tidak tampak tanda pemakaian; detail dan struktur sangat terjaga.',
  },
  B: {
    title: 'Grade B — Sangat Baik',
    summary: 'Tanda pemakaian ringan dan wajar, terawat rapi tanpa kekurangan fungsional.',
  },
  C: {
    title: 'Grade C — Baik',
    summary: 'Tanda pemakaian terlihat jelas dan dicatat secara terbuka pada deskripsi.',
  },
  D: {
    title: 'Grade D — Layak Pakai',
    summary: 'Memiliki keausan atau kekurangan spesifik yang didokumentasikan dengan foto.',
  },
};

export function formatIDR(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `Rp ${safe.toLocaleString('id-ID')}`;
}

export function formatJakartaDate(isoDate?: string | null, withTime = true): string {
  if (!isoDate) return '—';
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return '—';
  const formatter = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  });
  return withTime ? `${formatter.format(date)} WIB` : formatter.format(date);
}

export function getAvailableQuantity(product: Pick<Product, 'quantity' | 'reservedQuantity'>): number {
  const q = Math.max(0, Math.floor(product.quantity || 0));
  const r = Math.max(0, Math.floor(product.reservedQuantity || 0));
  return Math.max(0, q - r);
}

export function isProductPurchasable(product: Pick<Product, 'status' | 'quantity' | 'reservedQuantity'>): boolean {
  return product.status === 'published' && getAvailableQuantity(product) > 0;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function calculateDiscountAmount(subtotal: number, coupon: Coupon | null, nowIso?: string): number {
  if (!coupon || !coupon.isActive || subtotal <= 0) return 0;
  if (subtotal < coupon.minimumOrder) return 0;
  if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) return 0;

  const nowMs = nowIso ? new Date(nowIso).getTime() : Date.now();
  if (coupon.startsAt && nowMs < new Date(coupon.startsAt).getTime()) return 0;
  if (coupon.endsAt && nowMs > new Date(coupon.endsAt).getTime()) return 0;

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = Math.round((subtotal * coupon.discountValue) / 100);
    if (coupon.maximumDiscount != null && coupon.maximumDiscount > 0) {
      discount = Math.min(discount, coupon.maximumDiscount);
    }
  } else {
    discount = Math.round(coupon.discountValue);
  }
  return Math.max(0, Math.min(subtotal, discount));
}

export function computeCheckoutTotals(params: {
  products: Product[];
  requestedItems: { productId: string; quantity: number }[];
  shippingCost: number;
  coupon?: Coupon | null;
  nowIso?: string;
}): {
  items: OrderItemSnapshot[];
  subtotal: number;
  discountAmount: number;
  shippingAmount: number;
  grandTotal: number;
  errors: string[];
} {
  const errors: string[] = [];
  const productMap = new Map(params.products.map((p) => [p.id, p]));
  const items: OrderItemSnapshot[] = [];

  for (const req of params.requestedItems) {
    const qty = Math.floor(req.quantity);
    if (qty <= 0) {
      errors.push(`Jumlah produk ${req.productId} tidak valid.`);
      continue;
    }
    const product = productMap.get(req.productId);
    if (!product) {
      errors.push('Salah satu produk tidak ditemukan.');
      continue;
    }
    if (product.status !== 'published') {
      errors.push(`${product.name} sudah tidak tersedia di katalog.`);
      continue;
    }
    const available = getAvailableQuantity(product);
    if (available < qty) {
      errors.push(
        available === 0
          ? `${product.name} sedang dipesan pembeli lain atau sudah terjual.`
          : `Stok ${product.name} tersisa ${available} unit.`
      );
      continue;
    }
    const unitPrice = Math.round(product.sellingPrice);
    const lineTotal = unitPrice * qty;
    items.push({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      slug: product.slug,
      imageUrl: product.primaryImageUrl,
      unitPrice,
      quantity: qty,
      lineTotal,
      conditionGrade: product.conditionGrade,
      sizeLabel: product.sizeLabel,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const discountAmount = calculateDiscountAmount(subtotal, params.coupon || null, params.nowIso);
  const shippingAmount = Math.max(0, Math.round(params.shippingCost || 0));
  const grandTotal = Math.max(0, subtotal - discountAmount + shippingAmount);

  return {
    items,
    subtotal,
    discountAmount,
    shippingAmount,
    grandTotal,
    errors,
  };
}

export function mapMidtransStatus(
  transactionStatus: string,
  fraudStatus?: string
): { paymentStatus: PaymentStatus; fulfilmentStatus: FulfilmentStatus; inventoryAction: 'none' | 'commit' | 'release' } {
  const tx = transactionStatus.toLowerCase();
  if (tx === 'capture') {
    if (fraudStatus === 'challenge') {
      return { paymentStatus: 'pending', fulfilmentStatus: 'unfulfilled', inventoryAction: 'none' };
    }
    return { paymentStatus: 'paid', fulfilmentStatus: 'processing', inventoryAction: 'commit' };
  }
  if (tx === 'settlement') {
    return { paymentStatus: 'paid', fulfilmentStatus: 'processing', inventoryAction: 'commit' };
  }
  if (tx === 'pending') {
    return { paymentStatus: 'pending', fulfilmentStatus: 'unfulfilled', inventoryAction: 'none' };
  }
  if (tx === 'expire') {
    return { paymentStatus: 'expired', fulfilmentStatus: 'cancelled', inventoryAction: 'release' };
  }
  if (tx === 'cancel' || tx === 'deny') {
    return { paymentStatus: 'failed', fulfilmentStatus: 'cancelled', inventoryAction: 'release' };
  }
  if (tx === 'refund' || tx === 'partial_refund') {
    return { paymentStatus: 'refunded', fulfilmentStatus: 'cancelled', inventoryAction: 'none' };
  }
  return { paymentStatus: 'pending', fulfilmentStatus: 'unfulfilled', inventoryAction: 'none' };
}

export function isReservationExpired(order: Pick<Order, 'paymentStatus' | 'paymentDeadline'>, nowIso?: string): boolean {
  if (order.paymentStatus !== 'pending') return false;
  const deadlineMs = new Date(order.paymentDeadline).getTime();
  if (Number.isNaN(deadlineMs)) return false;
  const nowMs = nowIso ? new Date(nowIso).getTime() : Date.now();
  return nowMs > deadlineMs;
}

export function computeSalesMetrics(orders: Order[]): {
  grossPaidRevenue: number;
  paidOrdersCount: number;
  averageOrderValue: number;
  pendingFulfilmentCount: number;
} {
  const paidOrders = orders.filter((o) => o.paymentStatus === 'paid');
  const grossPaidRevenue = paidOrders.reduce((sum, o) => sum + o.grandTotal, 0);
  const paidOrdersCount = paidOrders.length;
  const averageOrderValue = paidOrdersCount > 0 ? Math.round(grossPaidRevenue / paidOrdersCount) : 0;
  const pendingFulfilmentCount = paidOrders.filter(
    (o) => o.fulfilmentStatus === 'unfulfilled' || o.fulfilmentStatus === 'processing' || o.fulfilmentStatus === 'packed'
  ).length;
  return {
    grossPaidRevenue,
    paidOrdersCount,
    averageOrderValue,
    pendingFulfilmentCount,
  };
}

export function normalizeWhatsappNumber(raw: string): string {
  const cleaned = (raw || '').replace(/[^\d]/g, '');
  if (!cleaned) return '6281200000000';
  if (cleaned.startsWith('0')) return `62${cleaned.slice(1)}`;
  if (cleaned.startsWith('8')) return `62${cleaned}`;
  return cleaned;
}

export function buildWhatsappChatUrl(rawPhone: string, message: string): string {
  const digits = normalizeWhatsappNumber(rawPhone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function formatOrderWhatsappMessage(order: Order, lang: 'id' | 'en' | 'de' | 'fr' = 'id'): string {
  const itemLines = order.items
    .map((item, idx) => `${idx + 1}. ${item.name} (${item.sku}, ${item.sizeLabel}, Grade ${item.conditionGrade}) x${item.quantity} — ${formatIDR(item.lineTotal)}`)
    .join('\n');

  const addr = order.shippingAddressSnapshot;
  const addressLine = `${addr.recipientName} (${addr.phone})\n${addr.addressLine}, ${addr.city}, ${addr.province} ${addr.postalCode}`;

  const headings = {
    id: {
      intro: `Halo Admin Preluxes, saya ingin konfirmasi pembayaran pesanan:`,
      orderNo: 'No. Pesanan',
      items: 'Daftar Produk',
      courier: 'Kurir',
      total: 'Total Pembayaran',
      address: 'Alamat Pengiriman',
      deadline: 'Batas Reservasi',
      outro: 'Mohon informasi rekening/QRIS tujuan transfer. Terima kasih.',
    },
    en: {
      intro: `Hello Preluxes Admin, I would like to confirm payment for my order:`,
      orderNo: 'Order Number',
      items: 'Items',
      courier: 'Courier',
      total: 'Total Amount',
      address: 'Shipping Address',
      deadline: 'Reservation Deadline',
      outro: 'Please share the bank transfer / QRIS payment details. Thank you.',
    },
    de: {
      intro: `Hallo Preluxes Admin, ich möchte die Zahlung für meine Bestellung bestätigen:`,
      orderNo: 'Bestellnummer',
      items: 'Artikel',
      courier: 'Versandart',
      total: 'Gesamtbetrag',
      address: 'Lieferadresse',
      deadline: 'Reservierungsfrist',
      outro: 'Bitte senden Sie mir die Zahlungsdaten (Überweisung / QRIS). Vielen Dank.',
    },
    fr: {
      intro: `Bonjour Admin Preluxes, je souhaite confirmer le paiement de ma commande :`,
      orderNo: 'Numéro de commande',
      items: 'Articles',
      courier: 'Transporteur',
      total: 'Montant total',
      address: 'Adresse de livraison',
      deadline: 'Délai de réservation',
      outro: 'Merci de bien vouloir m’envoyer les coordonnées de paiement. Merci.',
    },
  }[lang];

  return [
    headings.intro,
    `${headings.orderNo}: ${order.orderNumber}`,
    '',
    `${headings.items}:`,
    itemLines,
    '',
    `${headings.courier}: ${order.courierService} (${formatIDR(order.shippingAmount)})`,
    order.discountAmount > 0 ? `Diskon (${order.couponCode || 'Promo'}): -${formatIDR(order.discountAmount)}` : '',
    `${headings.total}: ${formatIDR(order.grandTotal)}`,
    `${headings.deadline}: ${formatJakartaDate(order.paymentDeadline)}`,
    '',
    `${headings.address}:`,
    addressLine,
    '',
    headings.outro,
  ]
    .filter((line, i, arr) => !(line === '' && arr[i - 1] === ''))
    .join('\n');
}
