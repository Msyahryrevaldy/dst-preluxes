export type LanguageCode = 'id' | 'en' | 'de' | 'fr';
export type UserRole = 'customer' | 'admin';
export type ProductStatus = 'draft' | 'published' | 'archived';
export type ConditionGrade = 'A' | 'B' | 'C' | 'D';
export type GenderStyle = 'Women' | 'Men' | 'Unisex';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'expired' | 'refunded';
export type FulfilmentStatus = 'unfulfilled' | 'processing' | 'packed' | 'shipped' | 'completed' | 'cancelled';

export interface ProductMeasurements {
  chestWidthCm?: number;
  lengthCm?: number;
  shoulderWidthCm?: number;
  sleeveLengthCm?: number;
  waistCm?: number;
  inseamCm?: number;
  bagWidthCm?: number;
  bagHeightCm?: number;
  shoeSizeEu?: string;
}

export interface ProductImage {
  url: string;
  altText: string;
  imageType: 'front' | 'back' | 'label' | 'detail' | 'defect';
  isPrimary: boolean;
  sortOrder: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  categoryId: string;
  categoryName: string;
  brandId?: string;
  brandName: string;
  gender: GenderStyle;
  sizeLabel: string;
  color: string;
  material: string;
  conditionGrade: ConditionGrade;
  conditionNotes: string;
  defectNotes?: string;
  measurements: ProductMeasurements;
  originalPrice?: number | null;
  sellingPrice: number;
  images: ProductImage[];
  primaryImageUrl: string;
  quantity: number;
  reservedQuantity: number;
  status: ProductStatus;
  isFeatured: boolean;
  isDemo: boolean;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  province: string;
  city: string;
  district?: string;
  postalCode: string;
  notes?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export interface OrderItemSnapshot {
  productId: string;
  name: string;
  sku: string;
  slug: string;
  imageUrl: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  conditionGrade: ConditionGrade;
  sizeLabel: string;
}

export interface ShippingOption {
  code: string;
  name: string;
  service: string;
  estimatedDays: string;
  cost: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddressSnapshot: {
    label?: string;
    recipientName: string;
    phone: string;
    addressLine: string;
    province: string;
    city: string;
    district?: string;
    postalCode: string;
    notes?: string;
  };
  courierCode: string;
  courierService: string;
  trackingNumber?: string;
  items: OrderItemSnapshot[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string | null;
  shippingAmount: number;
  grandTotal: number;
  paymentStatus: PaymentStatus;
  fulfilmentStatus: FulfilmentStatus;
  paymentProvider: string;
  paymentMethod?: string;
  paymentReference?: string;
  snapToken?: string;
  paymentDeadline: string;
  paidAt?: string | null;
  shippedAt?: string | null;
  completedAt?: string | null;
  adminNotes?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  provider: string;
  providerReference?: string;
  paymentMethod?: string;
  amount: number;
  status: PaymentStatus;
  snapToken?: string;
  webhookEventId?: string;
  rawStatusCode?: string;
  paidAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumOrder: number;
  maximumDiscount?: number | null;
  usageLimit?: number | null;
  usageCount: number;
  isActive: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryLog {
  id: string;
  productId: string;
  productSku?: string;
  type: 'stock_adjustment' | 'price_change' | 'reservation' | 'commit' | 'release';
  deltaQuantity?: number;
  previousQuantity?: number;
  newQuantity?: number;
  oldPrice?: number;
  newPrice?: number;
  reason: string;
  actorUid: string;
  actorEmail?: string;
  createdAt: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

export interface CmsContent {
  id: string;
  announcementEnabled: boolean;
  announcementText: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCtaLabel: string;
  heroImageUrl: string;
  featuredHeading: string;
  newArrivalsHeading: string;
  aboutTitle: string;
  aboutBody: string;
  carePromiseTitle: string;
  carePromiseBody: string;
  faqs: FaqItem[];
  updatedAt: string;
}

export interface StoreSettings {
  id: string;
  storeName: string;
  tagline: string;
  contactEmail: string;
  contactWhatsapp: string;
  instagramHandle: string;
  timezone: string;
  currency: string;
  reservationMinutes: number;
  handlingTimeText: string;
  shippingOptions: ShippingOption[];
  shippingPolicyText: string;
  returnPolicyText: string;
  cancellationPolicyText: string;
  privacyPolicyText: string;
  termsPolicyText: string;
  updatedAt: string;
}
