import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import type { User } from 'firebase/auth';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  storage,
} from './firebase.ts';
import type {
  Address,
  Brand,
  Category,
  CmsContent,
  Coupon,
  InventoryLog,
  Order,
  PaymentRecord,
  Product,
  StoreSettings,
  UserProfile,
} from '../types/store.ts';

function toIso(val: unknown): string {
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

function normalizeDoc<T>(id: string, raw: Record<string, unknown>): T {
  const out: Record<string, unknown> = { ...raw, id };
  for (const key of ['createdAt', 'updatedAt', 'publishedAt', 'paymentDeadline', 'paidAt', 'shippedAt', 'completedAt', 'expiresAt', 'addedAt']) {
    if (out[key] instanceof Timestamp) {
      out[key] = (out[key] as Timestamp).toDate().toISOString();
    }
  }
  return out as T;
}

export async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export async function syncUserProfile(user: User): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const snap = await getDoc(userRef);
    const isOwnerEmail = Boolean(user.emailVerified && user.email === 'hahspace@gmail.com');

    if (!snap.exists()) {
      const payload = {
        uid: user.uid,
        email: user.email || '',
        fullName: user.displayName || user.email?.split('@')[0] || 'Pengguna Preluxes',
        phone: '',
        avatarUrl: user.photoURL || '',
        role: 'customer' as const,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, payload);
      return {
        uid: user.uid,
        email: payload.email,
        fullName: payload.fullName,
        phone: '',
        avatarUrl: payload.avatarUrl,
        role: isOwnerEmail ? 'admin' : 'customer',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    const data = snap.data() as Record<string, unknown>;
    let isAdmin = data.role === 'admin' || isOwnerEmail;
    if (!isAdmin) {
      try {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid));
        isAdmin = adminSnap.exists();
      } catch {
        isAdmin = false;
      }
    }
    return {
      uid: user.uid,
      email: String(data.email || user.email || ''),
      fullName: String(data.fullName || user.displayName || 'Pengguna Preluxes'),
      phone: String(data.phone || ''),
      avatarUrl: String(data.avatarUrl || user.photoURL || ''),
      role: isAdmin ? 'admin' : 'customer',
      createdAt: toIso(data.createdAt),
      updatedAt: toIso(data.updatedAt),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserProfile(uid: string, patch: { fullName: string; phone: string }) {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      fullName: patch.fullName.trim().slice(0, 120),
      phone: patch.phone.trim().slice(0, 30),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribePublishedProducts(
  onData: (products: Product[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  const path = 'products';
  const q = query(collection(db, path), where('status', '==', 'published'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => normalizeDoc<Product>(d.id, d.data()));
      onData(items);
    },
    (error) => {
      if (onError) onError(error);
      else handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function fetchAllProductsAdmin(): Promise<Product[]> {
  const path = 'products';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => normalizeDoc<Product>(d.id, d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveProductAdmin(
  product: Omit<Product, 'createdAt' | 'updatedAt' | 'publishedAt'> & { isNew?: boolean }
) {
  const path = `products/${product.id}`;
  try {
    const { isNew, ...rest } = product;
    const refDoc = doc(db, 'products', product.id);
    if (isNew) {
      await setDoc(refDoc, {
        ...rest,
        publishedAt: rest.status === 'published' ? serverTimestamp() : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(refDoc, {
        ...rest,
        publishedAt: rest.status === 'published' ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function adjustProductStockAdmin(params: {
  product: Product;
  newQuantity: number;
  reason: string;
  actorUid: string;
  actorEmail: string;
}) {
  const prodPath = `products/${params.product.id}`;
  try {
    const safeQty = Math.max(params.product.reservedQuantity || 0, Math.floor(params.newQuantity));
    await updateDoc(doc(db, 'products', params.product.id), {
      quantity: safeQty,
      updatedAt: serverTimestamp(),
    });
    const logId = `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await setDoc(doc(db, 'inventory_logs', logId), {
      id: logId,
      productId: params.product.id,
      productSku: params.product.sku,
      type: 'stock_adjustment',
      deltaQuantity: safeQty - params.product.quantity,
      previousQuantity: params.product.quantity,
      newQuantity: safeQty,
      reason: params.reason.trim().slice(0, 300),
      actorUid: params.actorUid,
      actorEmail: params.actorEmail,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, prodPath);
  }
}

export async function deleteProductAdmin(productId: string) {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchInventoryLogsAdmin(): Promise<InventoryLog[]> {
  const path = 'inventory_logs';
  try {
    const snap = await getDocs(query(collection(db, path), orderBy('createdAt', 'desc')));
    return snap.docs.map((d) => normalizeDoc<InventoryLog>(d.id, d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveCategoryAdmin(category: Omit<Category, 'createdAt' | 'updatedAt'>, isNew: boolean) {
  const path = `categories/${category.id}`;
  try {
    if (isNew) {
      await setDoc(doc(db, 'categories', category.id), {
        ...category,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'categories', category.id), {
        ...category,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveBrandAdmin(brand: Omit<Brand, 'createdAt' | 'updatedAt'>, isNew: boolean) {
  const path = `brands/${brand.id}`;
  try {
    if (isNew) {
      await setDoc(doc(db, 'brands', brand.id), {
        ...brand,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'brands', brand.id), {
        ...brand,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchAddresses(uid: string): Promise<Address[]> {
  const path = `users/${uid}/addresses`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => normalizeDoc<Address>(d.id, d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveAddress(uid: string, addr: Omit<Address, 'createdAt' | 'updatedAt'>, isNew: boolean) {
  const path = `users/${uid}/addresses/${addr.id}`;
  try {
    if (isNew) {
      await setDoc(doc(db, 'users', uid, 'addresses', addr.id), {
        ...addr,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'users', uid, 'addresses', addr.id), {
        ...addr,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteAddress(uid: string, addressId: string) {
  const path = `users/${uid}/addresses/${addressId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'addresses', addressId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function fetchWishlistIds(uid: string): Promise<string[]> {
  const path = `users/${uid}/wishlist`;
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => d.id);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function toggleWishlistItem(uid: string, productId: string, currentlySaved: boolean) {
  const path = `users/${uid}/wishlist/${productId}`;
  try {
    if (currentlySaved) {
      await deleteDoc(doc(db, 'users', uid, 'wishlist', productId));
    } else {
      await setDoc(doc(db, 'users', uid, 'wishlist', productId), {
        productId,
        userId: uid,
        addedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchCustomerOrders(uid: string): Promise<Order[]> {
  const path = 'orders';
  try {
    const q = query(collection(db, path), where('userId', '==', uid));
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => normalizeDoc<Order>(d.id, d.data()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllOrdersAdmin(): Promise<Order[]> {
  const path = 'orders';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs
      .map((d) => normalizeDoc<Order>(d.id, d.data()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllPaymentsAdmin(): Promise<PaymentRecord[]> {
  const path = 'payments';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs
      .map((d) => normalizeDoc<PaymentRecord>(d.id, d.data()))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchAllCustomersAdmin(): Promise<UserProfile[]> {
  const path = 'users';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => normalizeDoc<UserProfile>(d.id, d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchCouponsAdmin(): Promise<Coupon[]> {
  const path = 'coupons';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => normalizeDoc<Coupon>(d.id, d.data()));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function saveCouponAdmin(coupon: Omit<Coupon, 'createdAt' | 'updatedAt'>, isNew: boolean) {
  const path = `coupons/${coupon.id}`;
  try {
    if (isNew) {
      await setDoc(doc(db, 'coupons', coupon.id), {
        ...coupon,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'coupons', coupon.id), {
        ...coupon,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCmsContentAdmin(content: Omit<CmsContent, 'updatedAt'>) {
  const path = 'cms_content/storefront';
  try {
    await setDoc(doc(db, 'cms_content', 'storefront'), {
      ...content,
      id: 'storefront',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveStoreSettingsAdmin(settings: Omit<StoreSettings, 'updatedAt'>) {
  const path = 'store_settings/general';
  try {
    await setDoc(doc(db, 'store_settings', 'general'), {
      ...settings,
      id: 'general',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function compressImageFile(file: File, maxDim = 1200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context unavailable'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Gagal memproses gambar'));
        },
        'image/webp',
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Format gambar tidak valid'));
    };
    img.src = url;
  });
}

export async function uploadProductImage(file: File, productId: string): Promise<string> {
  const compressed = await compressImageFile(file);
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;
  const storageRef = ref(storage, `products/${productId}/${safeName}`);
  await uploadBytes(storageRef, compressed, { contentType: 'image/webp' });
  return getDownloadURL(storageRef);
}
