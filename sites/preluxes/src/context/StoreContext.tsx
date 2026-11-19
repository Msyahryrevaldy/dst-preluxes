import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  auth,
  signInWithGooglePopup,
  signOutUser,
  testConnection,
} from '../lib/firebase.ts';
import {
  fetchAddresses,
  fetchCustomerOrders,
  fetchWishlistIds,
  subscribePublishedProducts,
  syncUserProfile,
  toggleWishlistItem,
} from '../lib/firestoreApi.ts';
import {
  DEFAULT_CMS_CONTENT,
  DEFAULT_STORE_SETTINGS,
  DEMO_BRANDS,
  DEMO_CATEGORIES,
  DEMO_PRODUCTS,
} from '../data/demoSeed.ts';
import type {
  Address,
  Brand,
  CartItem,
  Category,
  CmsContent,
  LanguageCode,
  Order,
  Product,
  StoreSettings,
  UserProfile,
} from '../types/store.ts';
import { getAvailableQuantity } from '../utils/commerce.ts';
import { TRANSLATIONS, type TranslationBundle } from '../i18n/translations.ts';

export interface PublicGatewayConfig {
  paymentMode?: 'whatsapp_chat' | 'midtrans_snap';
  whatsappConfigured?: boolean;
  midtransConfigured: boolean;
  midtransClientKey: string;
  midtransIsProduction: boolean;
  timezone: string;
  currency: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  text: string;
}

interface StoreContextValue {
  currentPath: string;
  navigate: (to: string) => void;
  authReady: boolean;
  firebaseUser: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;

  loadingStorefront: boolean;
  seededInFirestore: boolean;
  products: Product[];
  categories: Category[];
  brands: Brand[];
  cms: CmsContent;
  settings: StoreSettings;
  gatewayConfig: PublicGatewayConfig;
  refreshStorefront: () => Promise<void>;

  cart: CartItem[];
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;

  wishlistIds: string[];
  toggleWishlist: (productId: string) => Promise<void>;
  addresses: Address[];
  refreshAddresses: () => Promise<void>;
  orders: Order[];
  refreshOrders: () => Promise<void>;

  lastCheckoutResult: { order: Order; snapToken: string; mode: string } | null;
  setLastCheckoutResult: (res: { order: Order; snapToken: string; mode: string } | null) => void;

  toasts: ToastMessage[];
  notify: (text: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;

  lang: LanguageCode;
  setLang: (lang: LanguageCode) => void;
  t: TranslationBundle;
}

const StoreContext = createContext<StoreContextValue | null>(null);
const CART_STORAGE_KEY = 'preluxes_cart_v1';
const LANG_STORAGE_KEY = 'preluxes_lang_v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');
  const [authReady, setAuthReady] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [loadingStorefront, setLoadingStorefront] = useState(true);
  const [seededInFirestore, setSeededInFirestore] = useState(false);
  const [products, setProducts] = useState<Product[]>(DEMO_PRODUCTS);
  const [categories, setCategories] = useState<Category[]>(DEMO_CATEGORIES);
  const [brands, setBrands] = useState<Brand[]>(DEMO_BRANDS);
  const [cms, setCms] = useState<CmsContent>(DEFAULT_CMS_CONTENT);
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_STORE_SETTINGS);
  const [gatewayConfig, setGatewayConfig] = useState<PublicGatewayConfig>({
    paymentMode: 'whatsapp_chat',
    whatsappConfigured: true,
    midtransConfigured: false,
    midtransClientKey: '',
    midtransIsProduction: false,
    timezone: 'Asia/Jakarta',
    currency: 'IDR',
  });

  const [lang, setLangState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY) as LanguageCode | null;
      if (saved && saved in TRANSLATIONS) return saved;
    } catch {
      // ignore storage errors
    }
    return 'id';
  });

  const setLang = useCallback((next: LanguageCode) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      // ignore storage quota errors
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const t = TRANSLATIONS[lang];

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) return JSON.parse(saved) as CartItem[];
    } catch {
      // ignore storage errors
    }
    return [];
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [lastCheckoutResult, setLastCheckoutResult] = useState<{
    order: Order;
    snapToken: string;
    mode: string;
  } | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (text: string, type: ToastMessage['type'] = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, text }]);
      setTimeout(() => {
        dismissToast(id);
      }, 4500);
    },
    [dismissToast]
  );

  const navigate = useCallback((to: string) => {
    if (to === window.location.pathname + window.location.search) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.history.pushState({}, '', to);
    setCurrentPath(to.split('?')[0] || '/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const onPop = () => setCurrentPath(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  const refreshStorefront = useCallback(async () => {
    setLoadingStorefront(true);
    try {
      const [bootRes, cfgRes] = await Promise.all([
        fetch('/api/storefront/bootstrap'),
        fetch('/api/config/public'),
      ]);
      if (bootRes.ok) {
        const bootJson = (await bootRes.json()) as {
          data: {
            seededInFirestore: boolean;
            products: Product[];
            categories: Category[];
            brands: Brand[];
            cms: CmsContent;
            settings: StoreSettings;
          };
        };
        setSeededInFirestore(bootJson.data.seededInFirestore);
        if (bootJson.data.products.length > 0) setProducts(bootJson.data.products);
        if (bootJson.data.categories.length > 0) setCategories(bootJson.data.categories);
        if (bootJson.data.brands.length > 0) setBrands(bootJson.data.brands);
        if (bootJson.data.cms) setCms(bootJson.data.cms);
        if (bootJson.data.settings) setSettings(bootJson.data.settings);
      }
      if (cfgRes.ok) {
        const cfgJson = (await cfgRes.json()) as { data: PublicGatewayConfig };
        setGatewayConfig(cfgJson.data);
      }
    } catch {
      // keep demonstration fallback data
    } finally {
      setLoadingStorefront(false);
    }
  }, []);

  useEffect(() => {
    testConnection();
    refreshStorefront();

    const unsubProducts = subscribePublishedProducts(
      (liveProducts) => {
        if (liveProducts.length > 0) {
          setProducts(liveProducts);
          setSeededInFirestore(true);
        }
      },
      () => {
        // Fallback to bootstrap API if offline/rules restricted
      }
    );

    return () => unsubProducts();
  }, [refreshStorefront]);

  const loadCustomerData = useCallback(async (uid: string) => {
    try {
      const [addrList, wishList, orderList] = await Promise.all([
        fetchAddresses(uid),
        fetchWishlistIds(uid),
        fetchCustomerOrders(uid),
      ]);
      setAddresses(addrList);
      setWishlistIds(wishList);
      setOrders(orderList);
    } catch {
      // handled silently if initial profile is fresh
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const synced = await syncUserProfile(user);
          setProfile(synced);
          await loadCustomerData(user.uid);
        } catch {
          setProfile({
            uid: user.uid,
            email: user.email || '',
            fullName: user.displayName || 'Pengguna Preluxes',
            role: user.emailVerified && user.email === 'hahspace@gmail.com' ? 'admin' : 'customer',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      } else {
        setProfile(null);
        setAddresses([]);
        setWishlistIds([]);
        setOrders([]);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [loadCustomerData]);

  const signIn = useCallback(async () => {
    try {
      await signInWithGooglePopup();
      notify('Berhasil masuk dengan akun Google.', 'success');
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Gagal masuk.';
      if (!msg.includes('popup-closed-by-user')) {
        notify('Gagal masuk. Izinkan popup login Google di browser Anda.', 'error');
      }
    }
  }, [notify]);

  const signOut = useCallback(async () => {
    await signOutUser();
    notify('Anda telah keluar dari akun.', 'info');
    if (currentPath.startsWith('/admin') || currentPath.startsWith('/account')) {
      navigate('/');
    }
  }, [currentPath, navigate, notify]);

  const refreshProfile = useCallback(async () => {
    if (!firebaseUser) return;
    const synced = await syncUserProfile(firebaseUser);
    setProfile(synced);
  }, [firebaseUser]);

  const refreshAddresses = useCallback(async () => {
    if (!firebaseUser) return;
    const addrList = await fetchAddresses(firebaseUser.uid);
    setAddresses(addrList);
  }, [firebaseUser]);

  const refreshOrders = useCallback(async () => {
    if (!firebaseUser) return;
    const orderList = await fetchCustomerOrders(firebaseUser.uid);
    setOrders(orderList);
  }, [firebaseUser]);

  const addToCart = useCallback(
    (product: Product) => {
      const avail = getAvailableQuantity(product);
      if (avail <= 0) {
        notify('Maaf, barang ini sedang dipesan atau sudah terjual.', 'error');
        return;
      }
      setCart((prev) => {
        const existing = prev.find((c) => c.productId === product.id);
        if (existing) {
          if (existing.quantity >= avail) {
            notify(`Maksimal stok tersedia untuk ${product.name} (${avail} unit).`, 'info');
            return prev;
          }
          return prev.map((c) =>
            c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c
          );
        }
        return [...prev, { productId: product.id, quantity: 1 }];
      });
      setCartOpen(true);
      notify(`${product.name} → ${t.nav.cart}.`, 'success');
    },
    [notify, t.nav.cart]
  );

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (!firebaseUser) {
        notify('Masuk terlebih dahulu untuk menyimpan ke wishlist.', 'info');
        await signIn();
        return;
      }
      if (!seededInFirestore) {
        notify('Wishlist tersimpan setelah katalog aktif di Firestore (klik Seed di Admin).', 'info');
        return;
      }
      const isSaved = wishlistIds.includes(productId);
      await toggleWishlistItem(firebaseUser.uid, productId, isSaved);
      setWishlistIds((prev) =>
        isSaved ? prev.filter((id) => id !== productId) : [...prev, productId]
      );
      notify(isSaved ? 'Dihapus dari wishlist.' : 'Disimpan ke wishlist.', 'success');
    },
    [firebaseUser, notify, seededInFirestore, signIn, wishlistIds]
  );

  const isAdmin = Boolean(
    profile?.role === 'admin' ||
      (firebaseUser?.emailVerified && firebaseUser.email === 'hahspace@gmail.com')
  );

  return (
    <StoreContext.Provider
      value={{
        currentPath,
        navigate,
        authReady,
        firebaseUser,
        profile,
        isAdmin,
        signIn,
        signOut,
        refreshProfile,
        loadingStorefront,
        seededInFirestore,
        products,
        categories,
        brands,
        cms,
        settings,
        gatewayConfig,
        refreshStorefront,
        cart,
        cartOpen,
        setCartOpen,
        addToCart,
        removeFromCart,
        clearCart,
        wishlistIds,
        toggleWishlist,
        addresses,
        refreshAddresses,
        orders,
        refreshOrders,
        lastCheckoutResult,
        setLastCheckoutResult,
        toasts,
        notify,
        dismissToast,
        lang,
        setLang,
        t,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
