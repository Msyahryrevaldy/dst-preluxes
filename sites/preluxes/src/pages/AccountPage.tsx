import { useEffect, useState } from 'react';
import { Heart, LogOut, MapPin, Package, Plus, Trash2, User } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import {
  deleteAddress,
  saveAddress,
  updateUserProfile,
} from '../lib/firestoreApi.ts';
import { formatIDR, formatJakartaDate } from '../utils/commerce.ts';
import { ProductCard } from '../components/ProductCard.tsx';

export function AccountPage({
  section = 'overview',
}: {
  section?: 'overview' | 'profile' | 'addresses' | 'orders' | 'wishlist';
}) {
  const {
    firebaseUser,
    profile,
    signIn,
    signOut,
    refreshProfile,
    addresses,
    refreshAddresses,
    orders,
    wishlistIds,
    products,
    navigate,
    notify,
  } = useStore();

  const [fullName, setFullName] = useState(profile?.fullName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [profileSynced, setProfileSynced] = useState(Boolean(profile));
  const [savingProfile, setSavingProfile] = useState(false);

  const [showAddrForm, setShowAddrForm] = useState(false);
  const [addrLabel, setAddrLabel] = useState('Rumah');
  const [addrRecipient, setAddrRecipient] = useState(profile?.fullName || '');
  const [addrPhone, setAddrPhone] = useState(profile?.phone || '');
  const [addrLine, setAddrLine] = useState('');
  const [addrProvince, setAddrProvince] = useState('DKI Jakarta');
  const [addrCity, setAddrCity] = useState('Jakarta Selatan');
  const [addrDistrict, setAddrDistrict] = useState('');
  const [addrPostal, setAddrPostal] = useState('');

  useEffect(() => {
    if (profile && !profileSynced) {
      setFullName(profile.fullName || '');
      setPhone(profile.phone || '');
      if (!addrRecipient) setAddrRecipient(profile.fullName || '');
      if (!addrPhone) setAddrPhone(profile.phone || '');
      setProfileSynced(true);
    }
  }, [profile, profileSynced, addrRecipient, addrPhone]);

  if (!firebaseUser) {
    return (
      <main className="max-w-md mx-auto px-4 py-20 text-center space-y-5">
        <h1 className="font-serif text-3xl text-[#30302E]">Akun Saya</h1>
        <p className="text-sm text-[#30302E]/75">
          Masuk dengan akun Google Anda untuk mengakses riwayat pesanan, alamat tersimpan, dan wishlist.
        </p>
        <button
          type="button"
          onClick={signIn}
          className="px-6 py-3 bg-[#30302E] text-[#FAF7F2] text-sm font-medium"
        >
          Masuk dengan Google
        </button>
      </main>
    );
  }

  const tabs = [
    { key: 'overview', label: 'Ringkasan', path: '/account', icon: User },
    { key: 'orders', label: 'Pesanan', path: '/account/orders', icon: Package },
    { key: 'addresses', label: 'Alamat', path: '/account/addresses', icon: MapPin },
    { key: 'wishlist', label: 'Wishlist', path: '/account/wishlist', icon: Heart },
  ] as const;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      notify('Nama lengkap wajib diisi.', 'error');
      return;
    }
    setSavingProfile(true);
    try {
      await updateUserProfile(firebaseUser.uid, {
        fullName: fullName.trim(),
        phone: phone.trim(),
      });
      await refreshProfile();
      notify('Profil berhasil diperbarui.', 'success');
    } catch {
      notify('Gagal memperbarui profil.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const id = `addr-${Date.now()}`;
      await saveAddress(
        firebaseUser.uid,
        {
          id,
          userId: firebaseUser.uid,
          label: addrLabel.trim() || 'Rumah',
          recipientName: addrRecipient.trim(),
          phone: addrPhone.trim(),
          addressLine: addrLine.trim(),
          province: addrProvince.trim(),
          city: addrCity.trim(),
          district: addrDistrict.trim(),
          postalCode: addrPostal.trim(),
          notes: '',
          isDefault: addresses.length === 0,
        },
        true
      );
      await refreshAddresses();
      setShowAddrForm(false);
      setAddrLine('');
      setAddrPostal('');
      notify('Alamat tersimpan.', 'success');
    } catch {
      notify('Gagal menyimpan alamat.', 'error');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await deleteAddress(firebaseUser.uid, id);
      await refreshAddresses();
      notify('Alamat dihapus.', 'info');
    } catch {
      notify('Gagal menghapus alamat.', 'error');
    }
  };

  const savedProducts = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#30302E]/12 pb-6 mb-8">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#30302E]/60">Akun Pelanggan</p>
          <h1 className="font-serif text-3xl text-[#30302E] mt-1">
            {profile?.fullName || firebaseUser.displayName}
          </h1>
          <p className="text-xs text-[#30302E]/65 mt-0.5">{firebaseUser.email}</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex items-center gap-2 px-4 py-2 border border-[#30302E]/25 text-xs font-medium text-[#30302E] hover:bg-white self-start"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Keluar</span>
        </button>
      </div>

      {/* Sub-navigation tabs */}
      <nav aria-label="Menu Akun" className="flex flex-wrap gap-2 mb-8">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.key || (section === 'profile' && tab.key === 'overview');
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => navigate(tab.path)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#30302E] text-[#FAF7F2]'
                  : 'bg-white border border-[#30302E]/15 text-[#30302E] hover:bg-[#E9BBAA]/25'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Overview / Profile */}
      {(section === 'overview' || section === 'profile') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <form onSubmit={handleSaveProfile} className="lg:col-span-6 bg-white border border-[#30302E]/12 p-6 space-y-4">
            <h2 className="font-serif text-xl text-[#30302E]">Profil Saya</h2>
            <div>
              <label htmlFor="prof-name" className="block text-xs font-medium mb-1">Nama Lengkap</label>
              <input
                id="prof-name"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20"
              />
            </div>
            <div>
              <label htmlFor="prof-phone" className="block text-xs font-medium mb-1">Nomor Telepon / WhatsApp</label>
              <input
                id="prof-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812..."
                className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20"
              />
            </div>
            <button
              type="submit"
              disabled={savingProfile}
              className="px-5 py-2.5 bg-[#30302E] text-[#FAF7F2] text-xs font-medium"
            >
              {savingProfile ? 'Menyimpan...' : 'Simpan Profil'}
            </button>
          </form>

          <div className="lg:col-span-6 bg-white border border-[#30302E]/12 p-6 space-y-4">
            <h2 className="font-serif text-xl text-[#30302E]">Ringkasan Aktivitas</h2>
            <div className="grid grid-cols-3 gap-4 pt-2">
              <div className="border border-[#30302E]/10 p-4 bg-[#FAF7F2]">
                <p className="text-xs text-[#30302E]/65">Total Pesanan</p>
                <p className="font-mono text-2xl font-semibold mt-1 tabular-nums">{orders.length}</p>
              </div>
              <div className="border border-[#30302E]/10 p-4 bg-[#FAF7F2]">
                <p className="text-xs text-[#30302E]/65">Alamat</p>
                <p className="font-mono text-2xl font-semibold mt-1 tabular-nums">{addresses.length}</p>
              </div>
              <div className="border border-[#30302E]/10 p-4 bg-[#FAF7F2]">
                <p className="text-xs text-[#30302E]/65">Wishlist</p>
                <p className="font-mono text-2xl font-semibold mt-1 tabular-nums">{wishlistIds.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Orders */}
      {section === 'orders' && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white border border-[#30302E]/12 p-12 text-center">
              <p className="font-serif text-xl text-[#30302E] mb-2">Belum ada pesanan</p>
              <p className="text-sm text-[#30302E]/70 mb-5">
                Pesanan Anda akan muncul di sini beserta status pembayaran dan nomor resi.
              </p>
              <button
                type="button"
                onClick={() => navigate('/shop')}
                className="px-5 py-2.5 bg-[#30302E] text-[#FAF7F2] text-xs font-medium"
              >
                Jelajahi Koleksi
              </button>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="bg-white border border-[#30302E]/12 p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#30302E]/10 pb-3">
                  <div>
                    <span className="font-mono text-base font-semibold text-[#30302E]">{order.orderNumber}</span>
                    <span className="text-xs text-[#30302E]/65 ml-3">
                      {formatJakartaDate(order.createdAt)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span>Bayar: <strong>{order.paymentStatus}</strong></span>
                    <span>·</span>
                    <span>Kirim: <strong>{order.fulfilmentStatus}</strong></span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="text-xs text-[#30302E]/75">
                    {order.items.map((i) => `${i.name} (${i.sizeLabel})`).join(', ')}
                    {order.trackingNumber && (
                      <p className="font-mono text-[#30302E] font-medium mt-1">
                        Resi ({order.courierService}): {order.trackingNumber}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm font-semibold tabular-nums">
                      {formatIDR(order.grandTotal)}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/order/${order.orderNumber}`)}
                      className="px-4 py-2 border border-[#30302E]/25 text-xs font-medium hover:bg-[#FAF7F2]"
                    >
                      Detail
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Addresses */}
      {section === 'addresses' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="font-serif text-xl text-[#30302E]">Buku Alamat</h2>
            <button
              type="button"
              onClick={() => setShowAddrForm((v) => !v)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#30302E] text-[#FAF7F2] text-xs font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Alamat</span>
            </button>
          </div>

          {showAddrForm && (
            <form onSubmit={handleSaveAddress} className="bg-white border border-[#30302E]/15 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="a-label" className="block text-xs font-medium mb-1">Label Alamat</label>
                <input id="a-label" required value={addrLabel} onChange={(e) => setAddrLabel(e.target.value)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
              </div>
              <div>
                <label htmlFor="a-rec" className="block text-xs font-medium mb-1">Nama Penerima *</label>
                <input id="a-rec" required value={addrRecipient} onChange={(e) => setAddrRecipient(e.target.value)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
              </div>
              <div>
                <label htmlFor="a-ph" className="block text-xs font-medium mb-1">Nomor Telepon *</label>
                <input id="a-ph" required value={addrPhone} onChange={(e) => setAddrPhone(e.target.value)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
              </div>
              <div>
                <label htmlFor="a-zip" className="block text-xs font-medium mb-1">Kode Pos *</label>
                <input id="a-zip" required value={addrPostal} onChange={(e) => setAddrPostal(e.target.value)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="a-line" className="block text-xs font-medium mb-1">Alamat Lengkap *</label>
                <textarea id="a-line" required rows={2} value={addrLine} onChange={(e) => setAddrLine(e.target.value)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
              </div>
              <div>
                <label htmlFor="a-city" className="block text-xs font-medium mb-1">Kota *</label>
                <input id="a-city" required value={addrCity} onChange={(e) => setAddrCity(e.target.value)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
              </div>
              <div>
                <label htmlFor="a-prov" className="block text-xs font-medium mb-1">Provinsi *</label>
                <input id="a-prov" required value={addrProvince} onChange={(e) => setAddrProvince(e.target.value)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
              </div>
              <div>
                <label htmlFor="a-dist" className="block text-xs font-medium mb-1">Kecamatan</label>
                <input id="a-dist" value={addrDistrict} onChange={(e) => setAddrDistrict(e.target.value)} className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20" />
              </div>
              <div className="sm:col-span-2 flex gap-3">
                <button type="submit" className="px-5 py-2.5 bg-[#30302E] text-[#FAF7F2] text-xs font-medium">
                  Simpan Alamat
                </button>
                <button type="button" onClick={() => setShowAddrForm(false)} className="px-4 py-2.5 border border-[#30302E]/25 text-xs font-medium">
                  Batal
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {addresses.map((addr) => (
              <div key={addr.id} className="bg-white border border-[#30302E]/12 p-5 flex justify-between gap-4">
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-sm text-[#30302E]">{addr.label}</p>
                  <p className="font-medium">{addr.recipientName} · {addr.phone}</p>
                  <p className="text-[#30302E]/75">{addr.addressLine}</p>
                  <p className="text-[#30302E]/75">{addr.city}, {addr.province} {addr.postalCode}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteAddress(addr.id)}
                  aria-label={`Hapus alamat ${addr.label}`}
                  className="p-2 text-[#30302E]/50 hover:text-red-700 self-start"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wishlist */}
      {section === 'wishlist' && (
        <div>
          {savedProducts.length === 0 ? (
            <div className="bg-white border border-[#30302E]/12 p-12 text-center">
              <p className="font-serif text-xl text-[#30302E] mb-2">Wishlist masih kosong</p>
              <button
                type="button"
                onClick={() => navigate('/shop')}
                className="mt-3 px-5 py-2.5 bg-[#30302E] text-[#FAF7F2] text-xs font-medium"
              >
                Jelajahi Koleksi
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
