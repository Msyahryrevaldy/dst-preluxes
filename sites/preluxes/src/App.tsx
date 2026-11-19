import { X } from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { ChatAdminWidget } from './components/ChatAdminWidget.tsx';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ShopPage } from './pages/ShopPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { CartPage } from './pages/CartPage.tsx';
import { CheckoutPage } from './pages/CheckoutPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { AccountPage } from './pages/AccountPage.tsx';
import { InfoPage } from './pages/InfoPages.tsx';
import { MasterPackagePanel } from './components/MasterPackagePanel.tsx';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.tsx';

function ToastStack() {
  const { toasts, dismissToast } = useStore();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-24 right-4 z-50 space-y-2 max-w-sm w-full px-4 sm:px-0" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start justify-between gap-3 px-4 py-3 text-xs shadow-lg border ${
            t.type === 'error'
              ? 'bg-red-950 text-white border-red-900'
              : t.type === 'success'
              ? 'bg-[#14362B] text-[#FAF7F2] border-[#14362B]'
              : 'bg-[#30302E] text-[#FAF7F2] border-[#30302E]'
          }`}
        >
          <span className="leading-relaxed">{t.text}</span>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Tutup notifikasi"
            className="opacity-75 hover:opacity-100 shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

function AppRouter() {
  const { currentPath } = useStore();
  const clean = currentPath === '/' ? '/' : currentPath.replace(/\/+$/, '');

  let pageNode: React.ReactNode = <HomePage />;

  if (clean === '/') {
    pageNode = <HomePage />;
  } else if (clean === '/shop' || clean === '/search') {
    pageNode = <ShopPage mode="all" />;
  } else if (clean === '/new-arrivals') {
    pageNode = <ShopPage mode="new-arrivals" />;
  } else if (clean === '/sale') {
    pageNode = <ShopPage mode="sale" />;
  } else if (clean.startsWith('/category/')) {
    const slug = clean.slice('/category/'.length);
    pageNode = <ShopPage mode="category" categorySlug={slug} />;
  } else if (clean.startsWith('/product/')) {
    const slug = clean.slice('/product/'.length);
    pageNode = <ProductDetailPage slug={slug} />;
  } else if (clean === '/cart') {
    pageNode = <CartPage />;
  } else if (clean === '/checkout') {
    pageNode = <CheckoutPage mode="checkout" />;
  } else if (clean === '/checkout/result') {
    pageNode = <CheckoutPage mode="result" />;
  } else if (clean.startsWith('/order/')) {
    const orderNumber = clean.slice('/order/'.length);
    pageNode = <CheckoutPage mode="order" orderNumberParam={orderNumber} />;
  } else if (clean === '/login' || clean === '/register') {
    pageNode = <AuthPage adminPortal={false} />;
  } else if (clean === '/admin/login') {
    pageNode = <AuthPage adminPortal={true} />;
  } else if (clean.startsWith('/admin')) {
    pageNode = <AdminDashboardPage />;
  } else if (clean === '/account') {
    pageNode = <AccountPage section="overview" />;
  } else if (clean === '/account/profile') {
    pageNode = <AccountPage section="profile" />;
  } else if (clean === '/account/addresses') {
    pageNode = <AccountPage section="addresses" />;
  } else if (clean === '/account/orders' || clean.startsWith('/account/orders/')) {
    pageNode = <AccountPage section="orders" />;
  } else if (clean === '/account/wishlist') {
    pageNode = <AccountPage section="wishlist" />;
  } else if (clean === '/about') {
    pageNode = <InfoPage page="about" />;
  } else if (clean === '/contact') {
    pageNode = <InfoPage page="contact" />;
  } else if (clean === '/faq') {
    pageNode = <InfoPage page="faq" />;
  } else if (clean === '/brand-kit' || clean === '/agency-kit') {
    pageNode = (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <MasterPackagePanel />
      </main>
    );
  } else if (clean.startsWith('/policies/')) {
    const policySlug = clean.slice('/policies/'.length);
    pageNode = <InfoPage page="policy" policySlug={policySlug} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF7F2] text-[#30302E]">
      <Navbar />
      <div className="flex-1">{pageNode}</div>
      <Footer />
      <CartDrawer />
      <ChatAdminWidget />
      <ToastStack />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <AppRouter />
      </StoreProvider>
    </ErrorBoundary>
  );
}
