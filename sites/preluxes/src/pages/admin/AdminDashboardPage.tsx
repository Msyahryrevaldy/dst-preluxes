import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive,
  BarChart3,
  Boxes,
  Copy,
  CreditCard,
  Database,
  FileText,
  LayoutDashboard,
  Lock,
  PackageCheck,
  Plus,
  Settings,
  ShoppingBag,
  Sparkles,
  Tag,
  Tags,
  Users,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext.tsx';
import { MasterPackagePanel } from '../../components/MasterPackagePanel.tsx';
import {
  fetchAllCustomersAdmin,
  fetchAllOrdersAdmin,
  fetchAllPaymentsAdmin,
  fetchAllProductsAdmin,
  fetchCouponsAdmin,
  fetchInventoryLogsAdmin,
  getAuthHeader,
  saveProductAdmin,
} from '../../lib/firestoreApi.ts';
import type {
  Coupon,
  InventoryLog,
  Order,
  PaymentRecord,
  Product,
  UserProfile,
} from '../../types/store.ts';
import { computeSalesMetrics, formatIDR, formatJakartaDate, getAvailableQuantity } from '../../utils/commerce.ts';
import { AdminProductEditor } from './AdminProductEditor.tsx';
import {
  AdminCategoriesAndBrands,
  AdminCmsPanel,
  AdminCouponsPanel,
  AdminCustomersPanel,
  AdminInventoryPanel,
  AdminOrdersPanel,
  AdminPaymentsPanel,
  AdminReportsAndSettings,
} from './AdminOperationsPanels.tsx';

type AdminTab =
  | 'dashboard'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'orders'
  | 'payments'
  | 'customers'
  | 'discounts'
  | 'content'
  | 'agency'
  | 'reports'
  | 'settings';

function pathToAdminTab(path: string): AdminTab {
  if (path.includes('/admin/products')) return 'products';
  if (path.includes('/admin/categories') || path.includes('/admin/brands')) return 'categories';
  if (path.includes('/admin/inventory')) return 'inventory';
  if (path.includes('/admin/orders') || path.includes('/admin/shipping')) return 'orders';
  if (path.includes('/admin/payments')) return 'payments';
  if (path.includes('/admin/customers')) return 'customers';
  if (path.includes('/admin/discounts')) return 'discounts';
  if (path.includes('/admin/content')) return 'content';
  if (path.includes('/admin/master-package') || path.includes('/admin/agency')) return 'agency';
  if (path.includes('/admin/reports')) return 'reports';
  if (path.includes('/admin/settings')) return 'settings';
  return 'dashboard';
}

export function AdminDashboardPage() {
  const {
    currentPath,
    navigate,
    authReady,
    firebaseUser,
    isAdmin,
    signIn,
    categories,
    brands,
    cms,
    settings,
    refreshStorefront,
    notify,
  } = useStore();

  const activeTab = pathToAdminTab(currentPath);
  const [dateRange, setDateRange] = useState<'all' | 'today' | '7d' | '30d' | '90d'>('all');
  const [adminProducts, setAdminProducts] = useState<Product[]>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [adminPayments, setAdminPayments] = useState<PaymentRecord[]>([]);
  const [adminCustomers, setAdminCustomers] = useState<UserProfile[]>([]);
  const [adminCoupons, setAdminCoupons] = useState<Coupon[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined);
  const [productSearch, setProductSearch] = useState('');

  const loadAdminData = useCallback(async () => {
    if (!firebaseUser || !isAdmin) return;
    setLoading(true);
    try {
      const [prods, ords, pays, custs, coups, logs] = await Promise.all([
        fetchAllProductsAdmin().catch(() => []),
        fetchAllOrdersAdmin().catch(() => []),
        fetchAllPaymentsAdmin().catch(() => []),
        fetchAllCustomersAdmin().catch(() => []),
        fetchCouponsAdmin().catch(() => []),
        fetchInventoryLogsAdmin().catch(() => []),
      ]);
      setAdminProducts(prods);
      setAdminOrders(ords);
      setAdminPayments(pays);
      setAdminCustomers(custs);
      setAdminCoupons(coups);
      setInventoryLogs(logs);
    } finally {
      setLoading(false);
    }
  }, [firebaseUser, isAdmin]);

  useEffect(() => {
    loadAdminData();
  }, [loadAdminData]);

  const filteredOrders = useMemo(() => {
    if (dateRange === 'all') return adminOrders;
    const now = Date.now();
    const daysMap = { today: 1, '7d': 7, '30d': 30, '90d': 90 };
    const cutoff = now - daysMap[dateRange] * 86400000;
    return adminOrders.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
  }, [adminOrders, dateRange]);

  const metrics = useMemo(() => computeSalesMetrics(filteredOrders), [filteredOrders]);

  if (!authReady) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-20 text-center text-sm text-[#30302E]/70">
        Memeriksa sesi administrator...
      </main>
    );
  }

  if (!firebaseUser || !isAdmin) {
    return (
      <main className="max-w-md mx-auto px-4 py-20">
        <div className="bg-white border border-[#30302E]/15 p-8 text-center space-y-4">
          <Lock className="w-8 h-8 mx-auto text-[#30302E]/60" />
          <h1 className="font-serif text-2xl text-[#30302E]">Akses Admin Terbatas</h1>
          <p className="text-sm text-[#30302E]/75">
            {!firebaseUser
              ? 'Masuk dengan akun pemilik toko atau administrator terotorisasi.'
              : `Akun ${firebaseUser.email} tidak memiliki izin administrator Preluxes.`}
          </p>
          {!firebaseUser ? (
            <button
              type="button"
              onClick={signIn}
              className="w-full py-2.5 bg-[#30302E] text-[#FAF7F2] text-sm font-medium"
            >
              Masuk dengan Google
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="w-full py-2.5 border border-[#30302E]/25 text-sm font-medium"
            >
              Kembali ke Storefront
            </button>
          )}
        </div>
      </main>
    );
  }

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/admin/seed-demo', {
        method: 'POST',
        headers,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Seed gagal');
      notify(json.data.message, 'success');
      await Promise.all([loadAdminData(), refreshStorefront()]);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal seed data demonstrasi.', 'error');
    } finally {
      setSeeding(false);
    }
  };

  const handleArchiveProduct = async (p: Product) => {
    await saveProductAdmin({
      ...p,
      status: p.status === 'archived' ? 'draft' : 'archived',
      isNew: false,
    });
    notify('Status produk diperbarui.', 'info');
    await Promise.all([loadAdminData(), refreshStorefront()]);
  };

  const navItems: { key: AdminTab; label: string; path: string; icon: typeof LayoutDashboard }[] = [
    { key: 'dashboard', label: 'Ringkasan', path: '/admin/dashboard', icon: LayoutDashboard },
    { key: 'products', label: 'Produk', path: '/admin/products', icon: ShoppingBag },
    { key: 'categories', label: 'Kategori & Merek', path: '/admin/categories', icon: Tags },
    { key: 'inventory', label: 'Inventaris', path: '/admin/inventory', icon: Boxes },
    { key: 'orders', label: 'Pesanan & Resi', path: '/admin/orders', icon: PackageCheck },
    { key: 'payments', label: 'Pembayaran', path: '/admin/payments', icon: CreditCard },
    { key: 'customers', label: 'Pelanggan', path: '/admin/customers', icon: Users },
    { key: 'discounts', label: 'Kupon Diskon', path: '/admin/discounts', icon: Tag },
    { key: 'content', label: 'Konten CMS', path: '/admin/content', icon: FileText },
    { key: 'agency', label: 'Master Package & Agency', path: '/admin/master-package', icon: Sparkles },
    { key: 'reports', label: 'Laporan', path: '/admin/reports', icon: BarChart3 },
    { key: 'settings', label: 'Pengaturan', path: '/admin/settings', icon: Settings },
  ];

  const visibleProducts = adminProducts.filter((p) => {
    if (!productSearch.trim()) return true;
    const q = productSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Sidebar */}
        <aside className="w-full lg:w-64 shrink-0 bg-white border border-[#30302E]/12 p-4 space-y-1">
          <div className="px-3 py-2 border-b border-[#30302E]/10 mb-2">
            <p className="text-[11px] uppercase tracking-wider text-[#30302E]/60">Single-Owner Store</p>
            <p className="font-serif text-lg text-[#30302E]">Admin Preluxes</p>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left transition-colors ${
                  active ? 'bg-[#30302E] text-[#FAF7F2]' : 'text-[#30302E]/80 hover:bg-[#FAF7F2]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Main Admin Workspace */}
        <section className="flex-1 min-w-0 w-full space-y-6">
          <div className="bg-white border border-[#30302E]/12 p-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs text-[#30302E]/60">
                Admin / {navItems.find((n) => n.key === activeTab)?.label}
              </p>
              <h1 className="font-serif text-2xl text-[#30302E]">
                {navItems.find((n) => n.key === activeTab)?.label}
              </h1>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={seeding}
                onClick={handleSeedDemo}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#30302E]/25 text-xs font-medium hover:bg-[#FAF7F2]"
              >
                <Database className="w-3.5 h-3.5" />
                <span>{seeding ? 'Menyimpan...' : 'Seed Data Demonstrasi ke Firestore'}</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#30302E] text-[#FAF7F2] text-xs font-medium"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Produk</span>
              </button>
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#30302E]/70">
                  Pendapatan hanya menghitung pesanan berstatus pembayaran <strong>paid</strong>.
                </p>
                <div className="flex gap-1.5">
                  {(['all', 'today', '7d', '30d', '90d'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setDateRange(r)}
                      className={`px-3 py-1.5 text-xs font-medium ${
                        dateRange === r ? 'bg-[#30302E] text-[#FAF7F2]' : 'bg-white border border-[#30302E]/15'
                      }`}
                    >
                      {r === 'all' ? 'Semua' : r === 'today' ? 'Hari Ini' : r.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white border border-[#30302E]/12 p-5">
                  <p className="text-xs text-[#30302E]/65">Pendapatan Lunas</p>
                  <p className="font-mono text-xl font-semibold mt-1 tabular-nums">{formatIDR(metrics.grossPaidRevenue)}</p>
                </div>
                <div className="bg-white border border-[#30302E]/12 p-5">
                  <p className="text-xs text-[#30302E]/65">Pesanan Lunas / Menunggu Kirim</p>
                  <p className="font-mono text-xl font-semibold mt-1 tabular-nums">
                    {metrics.paidOrdersCount} / {metrics.pendingFulfilmentCount}
                  </p>
                </div>
                <div className="bg-white border border-[#30302E]/12 p-5">
                  <p className="text-xs text-[#30302E]/65">Produk Aktif / Terjual</p>
                  <p className="font-mono text-xl font-semibold mt-1 tabular-nums">
                    {adminProducts.filter((p) => p.status === 'published' && getAvailableQuantity(p) > 0).length} /{' '}
                    {adminProducts.filter((p) => p.quantity === 0).length}
                  </p>
                </div>
                <div className="bg-white border border-[#30302E]/12 p-5">
                  <p className="text-xs text-[#30302E]/65">Rata-Rata Nilai Pesanan</p>
                  <p className="font-mono text-xl font-semibold mt-1 tabular-nums">{formatIDR(metrics.averageOrderValue)}</p>
                </div>
              </div>

              <AdminOrdersPanel orders={filteredOrders.slice(0, 5)} onRefresh={loadAdminData} />
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-3 items-center justify-between">
                <input
                  type="search"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Cari nama atau SKU produk..."
                  className="px-3.5 py-2 text-xs bg-white border border-[#30302E]/15 w-full sm:w-72"
                />
                <span className="text-xs text-[#30302E]/65 tabular-nums">{visibleProducts.length} produk di Firestore</span>
              </div>

              <div className="bg-white border border-[#30302E]/12 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#FAF7F2] border-b border-[#30302E]/12 uppercase text-[#30302E]/70">
                    <tr>
                      <th className="px-4 py-3">Produk</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Kategori</th>
                      <th className="px-4 py-3">Kondisi</th>
                      <th className="px-4 py-3 text-right">Harga Jual</th>
                      <th className="px-4 py-3 text-right">Tersedia</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30302E]/10">
                    {loading ? (
                      <tr><td colSpan={8} className="px-4 py-8 text-center">Memuat data Firestore...</td></tr>
                    ) : visibleProducts.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-[#30302E]/65">
                          Belum ada produk di Firestore. Klik <strong>Seed Data Demonstrasi</strong> atau <strong>Tambah Produk</strong>.
                        </td>
                      </tr>
                    ) : (
                      visibleProducts.map((p) => (
                        <tr key={p.id} className="hover:bg-[#FAF7F2]/60">
                          <td className="px-4 py-3 font-medium flex items-center gap-2.5">
                            <img src={p.primaryImageUrl} alt={p.name} className="w-9 h-10 object-cover bg-[#F4EFE8] shrink-0" />
                            <span className="line-clamp-1">{p.name}</span>
                          </td>
                          <td className="px-4 py-3 font-mono">{p.sku}</td>
                          <td className="px-4 py-3">{p.categoryName}</td>
                          <td className="px-4 py-3">Grade {p.conditionGrade}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">{formatIDR(p.sellingPrice)}</td>
                          <td className="px-4 py-3 text-right font-mono tabular-nums">{getAvailableQuantity(p)}</td>
                          <td className="px-4 py-3 uppercase">{p.status}</td>
                          <td className="px-4 py-3 text-right whitespace-nowrap space-x-1.5">
                            <button type="button" onClick={() => setEditingProduct(p)} className="px-2.5 py-1 border border-[#30302E]/20">
                              Edit
                            </button>
                            <button
                              type="button"
                              title="Duplikat"
                              onClick={() =>
                                setEditingProduct({
                                  ...p,
                                  id: `copy-${Date.now()}`,
                                  sku: `${p.sku}-COPY`,
                                  slug: `${p.slug}-copy`,
                                  status: 'draft',
                                })
                              }
                              className="p-1.5 border border-[#30302E]/20 inline-flex align-middle"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Arsipkan / Pulihkan"
                              onClick={() => handleArchiveProduct(p)}
                              className="p-1.5 border border-[#30302E]/20 inline-flex align-middle"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <AdminCategoriesAndBrands categories={categories} brands={brands} onRefresh={refreshStorefront} />
          )}

          {activeTab === 'inventory' && (
            <AdminInventoryPanel products={adminProducts} logs={inventoryLogs} onRefresh={loadAdminData} />
          )}

          {activeTab === 'orders' && (
            <AdminOrdersPanel orders={adminOrders} onRefresh={loadAdminData} />
          )}

          {activeTab === 'payments' && <AdminPaymentsPanel payments={adminPayments} />}

          {activeTab === 'customers' && (
            <AdminCustomersPanel customers={adminCustomers} orders={adminOrders} />
          )}

          {activeTab === 'discounts' && (
            <AdminCouponsPanel coupons={adminCoupons} onRefresh={loadAdminData} />
          )}

          {activeTab === 'content' && (
            <AdminCmsPanel cms={cms} onRefresh={refreshStorefront} />
          )}

          {activeTab === 'agency' && <MasterPackagePanel inAdmin={true} />}

          {(activeTab === 'reports' || activeTab === 'settings') && (
            <AdminReportsAndSettings
              tab={activeTab}
              orders={adminOrders}
              products={adminProducts}
              settings={settings}
              onRefresh={refreshStorefront}
            />
          )}
        </section>
      </div>

      {editingProduct !== undefined && (
        <AdminProductEditor
          initialProduct={editingProduct}
          categories={categories}
          brands={brands}
          onClose={() => setEditingProduct(undefined)}
          onSaved={async () => {
            await Promise.all([loadAdminData(), refreshStorefront()]);
          }}
        />
      )}
    </div>
  );
}
