import { useEffect, useState } from 'react';
import { Download, Printer } from 'lucide-react';
import { useStore } from '../../context/StoreContext.tsx';
import {
  adjustProductStockAdmin,
  getAuthHeader,
  saveBrandAdmin,
  saveCategoryAdmin,
  saveCmsContentAdmin,
  saveCouponAdmin,
  saveStoreSettingsAdmin,
} from '../../lib/firestoreApi.ts';
import type {
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
} from '../../types/store.ts';
import {
  computeSalesMetrics,
  formatIDR,
  formatJakartaDate,
  getAvailableQuantity,
  slugify,
} from '../../utils/commerce.ts';

export function AdminInventoryPanel({
  products,
  logs,
  onRefresh,
}: {
  products: Product[];
  logs: InventoryLog[];
  onRefresh: () => Promise<void>;
}) {
  const { firebaseUser, notify } = useStore();
  const [selectedProd, setSelectedProd] = useState<Product | null>(null);
  const [newQty, setNewQty] = useState('1');
  const [reason, setReason] = useState('');

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProd || !firebaseUser || !reason.trim()) return;
    try {
      await adjustProductStockAdmin({
        product: selectedProd,
        newQuantity: Number(newQty),
        reason: reason.trim(),
        actorUid: firebaseUser.uid,
        actorEmail: firebaseUser.email || '',
      });
      notify('Stok berhasil disesuaikan dan dicatat dalam audit log.', 'success');
      setSelectedProd(null);
      setReason('');
      await onRefresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyesuaikan stok.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#30302E]/12 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF7F2] border-b border-[#30302E]/12 text-[#30302E]/70 uppercase">
            <tr>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Produk</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Direservasi</th>
              <th className="px-4 py-3 text-right">Tersedia (Terhitung)</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30302E]/10">
            {products.map((p) => {
              const avail = getAvailableQuantity(p);
              return (
                <tr key={p.id} className="hover:bg-[#FAF7F2]/60">
                  <td className="px-4 py-3 font-mono">{p.sku}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{p.quantity}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{p.reservedQuantity}</td>
                  <td className="px-4 py-3 text-right font-mono font-semibold tabular-nums">{avail}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProd(p);
                        setNewQty(String(p.quantity));
                      }}
                      className="px-3 py-1.5 border border-[#30302E]/25 hover:bg-[#FAF7F2]"
                    >
                      Sesuaikan Stok
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedProd && (
        <form onSubmit={handleAdjust} className="bg-white border border-[#30302E]/20 p-5 space-y-4 max-w-lg">
          <h3 className="font-serif text-lg">Penyesuaian Stok: {selectedProd.name}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="adj-qty" className="block text-xs font-medium mb-1">Total Stok Baru</label>
              <input
                id="adj-qty"
                type="number"
                min={selectedProd.reservedQuantity}
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#30302E]/20"
              />
            </div>
            <div>
              <label htmlFor="adj-reason" className="block text-xs font-medium mb-1">Alasan Penyesuaian *</label>
              <input
                id="adj-reason"
                required
                minLength={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="mis. Stok opname / barang dikembalikan"
                className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-[#30302E] text-[#FAF7F2] text-xs font-medium">Simpan</button>
            <button type="button" onClick={() => setSelectedProd(null)} className="px-4 py-2 border border-[#30302E]/25 text-xs">Batal</button>
          </div>
        </form>
      )}

      <div className="bg-white border border-[#30302E]/12 p-5">
        <h3 className="font-serif text-lg mb-3">Riwayat Pergerakan Stok (Audit Log)</h3>
        {logs.length === 0 ? (
          <p className="text-xs text-[#30302E]/65">Belum ada pergerakan stok tercatat di Firestore.</p>
        ) : (
          <div className="space-y-2 text-xs">
            {logs.slice(0, 20).map((log) => (
              <div key={log.id} className="flex flex-wrap justify-between gap-2 py-2 border-b border-[#30302E]/10">
                <div>
                  <span className="font-mono font-medium mr-2">{log.productSku || log.productId}</span>
                  <span>{log.type}</span>
                  <span className="text-[#30302E]/70 ml-2">— {log.reason}</span>
                </div>
                <span className="font-mono text-[#30302E]/65">{formatJakartaDate(log.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AdminOrdersPanel({
  orders,
  onRefresh,
}: {
  orders: Order[];
  onRefresh: () => Promise<void>;
}) {
  const { notify } = useStore();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [fulfilment, setFulfilment] = useState<Order['fulfilmentStatus']>('processing');
  const [tracking, setTracking] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const openOrder = (o: Order) => {
    setSelectedOrder(o);
    setFulfilment(o.fulfilmentStatus);
    setTracking(o.trackingNumber || '');
    setNotes(o.adminNotes || '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSaving(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch(`/api/admin/orders/${selectedOrder.id}/fulfilment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          fulfilmentStatus: fulfilment,
          trackingNumber: tracking,
          adminNotes: notes,
        }),
      });
      if (!res.ok) throw new Error('Gagal memperbarui pesanan');
      notify('Status pengiriman dan resi berhasil diperbarui.', 'success');
      await onRefresh();
      setSelectedOrder(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal memperbarui pesanan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const [confirmingPay, setConfirmingPay] = useState(false);

  const handlePaymentDecision = async (outcome: 'settlement' | 'cancel') => {
    if (!selectedOrder) return;
    setConfirmingPay(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/payments/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          orderId: selectedOrder.id,
          simulatedOutcome: outcome,
          paymentMethod: outcome === 'settlement' ? 'whatsapp_bank_transfer' : 'admin_cancelled',
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Gagal memperbarui pembayaran');
      const updated = json.data.order as Order;
      setSelectedOrder(updated);
      setFulfilment(updated.fulfilmentStatus);
      notify(
        outcome === 'settlement'
          ? 'Pembayaran WhatsApp dikonfirmasi lunas dan stok unik berkurang otomatis.'
          : 'Pesanan dibatalkan dan reservasi stok dilepaskan.',
        outcome === 'settlement' ? 'success' : 'info'
      );
      await onRefresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal memperbarui status pembayaran.', 'error');
    } finally {
      setConfirmingPay(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-[#30302E]/12 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF7F2] border-b border-[#30302E]/12 text-[#30302E]/70 uppercase">
            <tr>
              <th className="px-4 py-3">No. Pesanan</th>
              <th className="px-4 py-3">Pelanggan</th>
              <th className="px-4 py-3">Tanggal (WIB)</th>
              <th className="px-4 py-3">Pembayaran</th>
              <th className="px-4 py-3">Fulfilment</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30302E]/10">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#30302E]/65">
                  Belum ada pesanan tercatat.
                </td>
              </tr>
            ) : (
              orders.map((o) => (
                <tr key={o.id} className="hover:bg-[#FAF7F2]/60">
                  <td className="px-4 py-3 font-mono font-medium">{o.orderNumber}</td>
                  <td className="px-4 py-3">{o.customerName}</td>
                  <td className="px-4 py-3 font-mono">{formatJakartaDate(o.createdAt)}</td>
                  <td className="px-4 py-3 uppercase font-medium">{o.paymentStatus}</td>
                  <td className="px-4 py-3 uppercase">{o.fulfilmentStatus}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{formatIDR(o.grandTotal)}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openOrder(o)} className="px-3 py-1.5 border border-[#30302E]/25 hover:bg-[#FAF7F2]">
                      Kelola
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="bg-white border border-[#30302E]/20 p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#30302E]/10 pb-3">
            <div>
              <h3 className="font-serif text-xl">Detail Pesanan {selectedOrder.orderNumber}</h3>
              <p className="text-xs text-[#30302E]/70">
                {selectedOrder.customerName} · {selectedOrder.customerEmail} · {selectedOrder.customerPhone}
              </p>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#30302E]/25 text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Packing Slip</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-1">
              <p className="font-semibold uppercase">Alamat Snapshot</p>
              <p>{selectedOrder.shippingAddressSnapshot.recipientName} ({selectedOrder.shippingAddressSnapshot.phone})</p>
              <p>{selectedOrder.shippingAddressSnapshot.addressLine}</p>
              <p>{selectedOrder.shippingAddressSnapshot.city}, {selectedOrder.shippingAddressSnapshot.province} {selectedOrder.shippingAddressSnapshot.postalCode}</p>
              <p className="pt-1">Kurir: {selectedOrder.courierService}</p>
            </div>
            <div className="space-y-1">
              <p className="font-semibold uppercase">Item Snapshot</p>
              {selectedOrder.items.map((item) => (
                <p key={item.productId} className="font-mono">
                  {item.sku} — {item.name} ({item.sizeLabel}) × {item.quantity} = {formatIDR(item.lineTotal)}
                </p>
              ))}
            </div>
          </div>

          {selectedOrder.paymentStatus === 'pending' && (
            <div className="bg-[#E9BBAA]/25 border border-[#30302E]/20 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-[#30302E]">
                <p className="font-semibold">Menunggu Konfirmasi Pembayaran WhatsApp</p>
                <p className="text-[#30302E]/75 mt-0.5">
                  Verifikasi bukti transfer/QRIS pelanggan di WhatsApp sebelum menandai lunas.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={confirmingPay}
                  onClick={() => handlePaymentDecision('settlement')}
                  className="px-4 py-2 bg-[#14362B] text-[#FAF7F2] text-xs font-medium hover:bg-[#14362B]/90 disabled:opacity-50"
                >
                  {confirmingPay ? 'Memproses...' : 'Konfirmasi Lunas (WhatsApp Transfer)'}
                </button>
                <button
                  type="button"
                  disabled={confirmingPay}
                  onClick={() => handlePaymentDecision('cancel')}
                  className="px-3.5 py-2 border border-red-300 bg-white text-red-800 text-xs font-medium hover:bg-red-50 disabled:opacity-50"
                >
                  Batalkan & Lepas Stok
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleUpdate} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-[#30302E]/10">
            <div>
              <label htmlFor="ord-ful" className="block text-xs font-medium mb-1">Status Pengiriman</label>
              <select
                id="ord-ful"
                value={fulfilment}
                onChange={(e) => setFulfilment(e.target.value as Order['fulfilmentStatus'])}
                className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20"
              >
                <option value="unfulfilled">Unfulfilled</option>
                <option value="processing">Processing</option>
                <option value="packed">Packed</option>
                <option value="shipped">Shipped</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <label htmlFor="ord-resi" className="block text-xs font-medium mb-1">Nomor Resi</label>
              <input
                id="ord-resi"
                value={tracking}
                onChange={(e) => setTracking(e.target.value)}
                placeholder="Masukkan nomor resi kurir"
                className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#30302E]/20"
              />
            </div>
            <div>
              <label htmlFor="ord-notes" className="block text-xs font-medium mb-1">Catatan Internal Admin</label>
              <input
                id="ord-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20"
              />
            </div>
            <div className="sm:col-span-3 flex gap-3">
              <button type="submit" disabled={saving} className="px-5 py-2 bg-[#30302E] text-[#FAF7F2] text-xs font-medium">
                {saving ? 'Menyimpan...' : 'Perbarui Fulfilment'}
              </button>
              <button type="button" onClick={() => setSelectedOrder(null)} className="px-4 py-2 border border-[#30302E]/25 text-xs">
                Tutup
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export function AdminPaymentsPanel({ payments }: { payments: PaymentRecord[] }) {
  return (
    <div className="space-y-4">
      <p className="text-xs bg-[#E9BBAA]/25 border border-[#30302E]/15 p-3 text-[#30302E]">
        Pembayaran menggunakan konfirmasi langsung melalui WhatsApp Chat Admin. Pelunasan & pelepasan reservasi stok diverifikasi oleh Admin pada tab Pesanan.
      </p>
      <div className="bg-white border border-[#30302E]/12 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF7F2] border-b border-[#30302E]/12 uppercase text-[#30302E]/70">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Metode</th>
              <th className="px-4 py-3">Referensi</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Nominal</th>
              <th className="px-4 py-3">Waktu (WIB)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30302E]/10">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#30302E]/65">Belum ada transaksi pembayaran.</td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 font-mono font-medium">{p.orderNumber}</td>
                  <td className="px-4 py-3">{p.provider}</td>
                  <td className="px-4 py-3">{p.paymentMethod || '—'}</td>
                  <td className="px-4 py-3 font-mono">{p.providerReference || '—'}</td>
                  <td className="px-4 py-3 uppercase font-medium">{p.status}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{formatIDR(p.amount)}</td>
                  <td className="px-4 py-3 font-mono">{formatJakartaDate(p.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminCategoriesAndBrands({
  categories,
  brands,
  onRefresh,
}: {
  categories: Category[];
  brands: Brand[];
  onRefresh: () => Promise<void>;
}) {
  const { notify } = useStore();
  const [catName, setCatName] = useState('');
  const [brandName, setBrandName] = useState('');

  const addCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      const slug = slugify(catName);
      await saveCategoryAdmin(
        {
          id: `cat-${slug}`,
          name: catName.trim(),
          slug,
          description: '',
          imageUrl: '/src/assets/images/item_linen_blazer_1794946984670.jpg',
          isActive: true,
          sortOrder: categories.length + 1,
        },
        true
      );
      setCatName('');
      notify('Kategori ditambahkan.', 'success');
      await onRefresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menambah kategori.', 'error');
    }
  };

  const addBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) return;
    try {
      const slug = slugify(brandName);
      await saveBrandAdmin(
        { id: `brand-${slug}`, name: brandName.trim(), slug, description: '' },
        true
      );
      setBrandName('');
      notify('Merek ditambahkan.', 'success');
      await onRefresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menambah merek.', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white border border-[#30302E]/12 p-5 space-y-4">
        <h3 className="font-serif text-lg">Kategori</h3>
        <form onSubmit={addCat} className="flex gap-2">
          <input value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Nama kategori baru" className="flex-1 px-3 py-2 text-xs bg-[#FAF7F2] border border-[#30302E]/20" />
          <button type="submit" className="px-4 py-2 bg-[#30302E] text-[#FAF7F2] text-xs font-medium">Tambah</button>
        </form>
        <ul className="divide-y divide-[#30302E]/10 text-xs">
          {categories.map((c) => (
            <li key={c.id} className="py-2.5 flex justify-between">
              <span className="font-medium">{c.name}</span>
              <span className="font-mono text-[#30302E]/60">/{c.slug}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white border border-[#30302E]/12 p-5 space-y-4">
        <h3 className="font-serif text-lg">Merek / Label</h3>
        <form onSubmit={addBrand} className="flex gap-2">
          <input value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="Nama merek baru" className="flex-1 px-3 py-2 text-xs bg-[#FAF7F2] border border-[#30302E]/20" />
          <button type="submit" className="px-4 py-2 bg-[#30302E] text-[#FAF7F2] text-xs font-medium">Tambah</button>
        </form>
        <ul className="divide-y divide-[#30302E]/10 text-xs">
          {brands.map((b) => (
            <li key={b.id} className="py-2.5 flex justify-between">
              <span className="font-medium">{b.name}</span>
              <span className="font-mono text-[#30302E]/60">{b.slug}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function AdminCouponsPanel({
  coupons,
  onRefresh,
}: {
  coupons: Coupon[];
  onRefresh: () => Promise<void>;
}) {
  const { notify } = useStore();
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('10');
  const [minimumOrder, setMinimumOrder] = useState('300000');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    try {
      const upper = code.trim().toUpperCase();
      await saveCouponAdmin(
        {
          id: `coupon-${slugify(upper)}`,
          code: upper,
          discountType,
          discountValue: Number(discountValue),
          minimumOrder: Number(minimumOrder) || 0,
          maximumDiscount: discountType === 'percentage' ? 100000 : null,
          usageLimit: 100,
          usageCount: 0,
          isActive: true,
          startsAt: null,
          endsAt: null,
        },
        true
      );
      setCode('');
      notify('Kupon diskon berhasil dibuat.', 'success');
      await onRefresh();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal membuat kupon diskon.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="bg-white border border-[#30302E]/12 p-5 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
        <div>
          <label htmlFor="cp-code" className="block text-xs font-medium mb-1">Kode Kupon</label>
          <input id="cp-code" required value={code} onChange={(e) => setCode(e.target.value)} placeholder="PRELUXES10" className="w-full px-3 py-2 text-xs font-mono bg-[#FAF7F2] border border-[#30302E]/20 uppercase" />
        </div>
        <div>
          <label htmlFor="cp-type" className="block text-xs font-medium mb-1">Tipe</label>
          <select id="cp-type" value={discountType} onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')} className="w-full px-3 py-2 text-xs bg-[#FAF7F2] border border-[#30302E]/20">
            <option value="percentage">Persentase (%)</option>
            <option value="fixed">Potongan Tetap (IDR)</option>
          </select>
        </div>
        <div>
          <label htmlFor="cp-val" className="block text-xs font-medium mb-1">Nilai</label>
          <input id="cp-val" type="number" required min={1} value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} className="w-full px-3 py-2 text-xs font-mono bg-[#FAF7F2] border border-[#30302E]/20" />
        </div>
        <div>
          <label htmlFor="cp-min" className="block text-xs font-medium mb-1">Min. Belanja (IDR)</label>
          <input id="cp-min" type="number" min={0} value={minimumOrder} onChange={(e) => setMinimumOrder(e.target.value)} className="w-full px-3 py-2 text-xs font-mono bg-[#FAF7F2] border border-[#30302E]/20" />
        </div>
        <button type="submit" className="px-4 py-2 bg-[#30302E] text-[#FAF7F2] text-xs font-medium">Simpan Kupon</button>
      </form>

      <div className="bg-white border border-[#30302E]/12 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAF7F2] border-b border-[#30302E]/12 uppercase text-[#30302E]/70">
            <tr>
              <th className="px-4 py-3">Kode</th>
              <th className="px-4 py-3">Diskon</th>
              <th className="px-4 py-3">Min. Order</th>
              <th className="px-4 py-3">Dipakai</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#30302E]/10">
            {coupons.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-mono font-semibold">{c.code}</td>
                <td className="px-4 py-3 font-mono">{c.discountType === 'percentage' ? `${c.discountValue}%` : formatIDR(c.discountValue)}</td>
                <td className="px-4 py-3 font-mono">{formatIDR(c.minimumOrder)}</td>
                <td className="px-4 py-3 font-mono">{c.usageCount}</td>
                <td className="px-4 py-3">{c.isActive ? 'Aktif' : 'Nonaktif'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminCustomersPanel({ customers, orders }: { customers: UserProfile[]; orders: Order[] }) {
  return (
    <div className="bg-white border border-[#30302E]/12 overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-[#FAF7F2] border-b border-[#30302E]/12 uppercase text-[#30302E]/70">
          <tr>
            <th className="px-4 py-3">Nama</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Peran</th>
            <th className="px-4 py-3 text-right">Pesanan</th>
            <th className="px-4 py-3">Terdaftar (WIB)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#30302E]/10">
          {customers.map((c) => (
            <tr key={c.uid}>
              <td className="px-4 py-3 font-medium">{c.fullName}</td>
              <td className="px-4 py-3">{c.email}</td>
              <td className="px-4 py-3 uppercase">{c.role}</td>
              <td className="px-4 py-3 text-right font-mono tabular-nums">
                {orders.filter((o) => o.userId === c.uid).length}
              </td>
              <td className="px-4 py-3 font-mono">{formatJakartaDate(c.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminCmsPanel({ cms, onRefresh }: { cms: CmsContent; onRefresh: () => Promise<void> }) {
  const { notify } = useStore();
  const [form, setForm] = useState(cms);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(cms);
  }, [cms]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveCmsContentAdmin(form);
      await onRefresh();
      notify('Konten CMS beranda berhasil diperbarui.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan CMS.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-white border border-[#30302E]/12 p-6 space-y-4 max-w-3xl">
      <h3 className="font-serif text-xl">Konten Beranda & Editorial (CMS)</h3>
      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
        <input type="checkbox" checked={form.announcementEnabled} onChange={(e) => setForm({ ...form, announcementEnabled: e.target.checked })} className="accent-[#30302E]" />
        <span>Tampilkan Announcement Bar di bagian atas</span>
      </label>
      <div>
        <label htmlFor="cms-ann" className="block text-xs font-medium mb-1">Teks Announcement Bar</label>
        <input id="cms-ann" value={form.announcementText} onChange={(e) => setForm({ ...form, announcementText: e.target.value })} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
      </div>
      <div>
        <label htmlFor="cms-ht" className="block text-xs font-medium mb-1">Judul Hero</label>
        <input id="cms-ht" required value={form.heroTitle} onChange={(e) => setForm({ ...form, heroTitle: e.target.value })} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
      </div>
      <div>
        <label htmlFor="cms-hs" className="block text-xs font-medium mb-1">Subjudul Hero</label>
        <textarea id="cms-hs" required rows={2} value={form.heroSubtitle} onChange={(e) => setForm({ ...form, heroSubtitle: e.target.value })} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
      </div>
      <div>
        <label htmlFor="cms-ab" className="block text-xs font-medium mb-1">Cerita Tentang Preluxes</label>
        <textarea id="cms-ab" rows={3} value={form.aboutBody} onChange={(e) => setForm({ ...form, aboutBody: e.target.value })} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
      </div>
      <button type="submit" disabled={saving} className="px-5 py-2.5 bg-[#30302E] text-[#FAF7F2] text-xs font-medium">
        {saving ? 'Menyimpan...' : 'Simpan Konten CMS'}
      </button>
    </form>
  );
}

export function AdminReportsAndSettings({
  tab,
  orders,
  products,
  settings,
  onRefresh,
}: {
  tab: 'reports' | 'settings';
  orders: Order[];
  products: Product[];
  settings: StoreSettings;
  onRefresh: () => Promise<void>;
}) {
  const { gatewayConfig, notify } = useStore();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(settings);
  }, [settings]);

  const metrics = computeSalesMetrics(orders);

  const handleExportCsv = async () => {
    const headers = await getAuthHeader();
    const res = await fetch('/api/admin/reports/export.csv', { headers });
    if (!res.ok) {
      notify('Gagal mengunduh CSV.', 'error');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'preluxes-orders-report.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (tab === 'reports') {
    const byCategory = products.reduce<Record<string, number>>((acc, p) => {
      acc[p.categoryName] = (acc[p.categoryName] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="font-serif text-xl">Laporan Penjualan & Inventaris</h3>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#30302E] text-[#FAF7F2] text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor CSV Pesanan</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#30302E]/12 p-5">
            <p className="text-xs text-[#30302E]/65">Pendapatan Lunas (Bruto)</p>
            <p className="font-mono text-2xl font-semibold mt-1 tabular-nums">{formatIDR(metrics.grossPaidRevenue)}</p>
          </div>
          <div className="bg-white border border-[#30302E]/12 p-5">
            <p className="text-xs text-[#30302E]/65">Rata-Rata Nilai Pesanan</p>
            <p className="font-mono text-2xl font-semibold mt-1 tabular-nums">{formatIDR(metrics.averageOrderValue)}</p>
          </div>
          <div className="bg-white border border-[#30302E]/12 p-5">
            <p className="text-xs text-[#30302E]/65">Pesanan Lunas</p>
            <p className="font-mono text-2xl font-semibold mt-1 tabular-nums">{metrics.paidOrdersCount}</p>
          </div>
        </div>

        <div className="bg-white border border-[#30302E]/12 p-5">
          <h4 className="font-serif text-base mb-3">Distribusi Produk per Kategori</h4>
          <div className="space-y-2 text-xs">
            {Object.entries(byCategory).map(([cat, count]) => (
              <div key={cat} className="flex justify-between py-1.5 border-b border-[#30302E]/10">
                <span>{cat}</span>
                <span className="font-mono font-semibold tabular-nums">{count} SKU</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveStoreSettingsAdmin(form);
      await onRefresh();
      notify('Pengaturan toko disimpan.', 'success');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveSettings} className="bg-white border border-[#30302E]/12 p-6 space-y-5 max-w-3xl">
      <h3 className="font-serif text-xl">Pengaturan Toko & Gateway</h3>
      <div className="bg-[#E9BBAA]/25 border border-[#30302E]/20 p-4 text-xs space-y-1">
        <p className="font-semibold">Metode Pembayaran Aktif: WhatsApp Chat Confirmation</p>
        <p>
          Mode aktif:{' '}
          <strong>
            {gatewayConfig.paymentMode === 'whatsapp_chat'
              ? 'WhatsApp Chat Admin (Verifikasi Pelunasan di Dashboard Admin)'
              : 'WhatsApp Chat & Server Reconciliation'}
          </strong>
        </p>
        <p className="text-[#30302E]/75">
          Pastikan nomor WhatsApp Layanan di bawah menggunakan format aktif (+62...) agar tombol Checkout & popup Chat Admin mengarah ke nomor toko Anda.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="st-email" className="block text-xs font-medium mb-1">Email Kontak Toko</label>
          <input id="st-email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
        </div>
        <div>
          <label htmlFor="st-wa" className="block text-xs font-medium mb-1">WhatsApp Layanan</label>
          <input id="st-wa" value={form.contactWhatsapp} onChange={(e) => setForm({ ...form, contactWhatsapp: e.target.value })} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
        </div>
        <div>
          <label htmlFor="st-res" className="block text-xs font-medium mb-1">Batas Reservasi Checkout (Menit)</label>
          <input id="st-res" type="number" min={5} max={120} value={form.reservationMinutes} onChange={(e) => setForm({ ...form, reservationMinutes: Number(e.target.value) })} className="w-full px-3 py-2 text-sm font-mono bg-[#FAF7F2] border border-[#30302E]/20" />
        </div>
        <div>
          <label htmlFor="st-hand" className="block text-xs font-medium mb-1">Waktu Pengemasan</label>
          <input id="st-hand" value={form.handlingTimeText} onChange={(e) => setForm({ ...form, handlingTimeText: e.target.value })} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
        </div>
      </div>
      <div>
        <label htmlFor="st-ret" className="block text-xs font-medium mb-1">Teks Kebijakan Pengembalian</label>
        <textarea id="st-ret" rows={3} value={form.returnPolicyText} onChange={(e) => setForm({ ...form, returnPolicyText: e.target.value })} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
      </div>
      <button type="submit" disabled={saving} className="px-5 py-2.5 bg-[#30302E] text-[#FAF7F2] text-xs font-medium">
        {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
      </button>
    </form>
  );
}
