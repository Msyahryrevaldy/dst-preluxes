import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  Lock,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { getAuthHeader } from '../lib/firestoreApi.ts';
import {
  buildWhatsappChatUrl,
  formatIDR,
  formatJakartaDate,
  formatOrderWhatsappMessage,
} from '../utils/commerce.ts';
import type { Order } from '../types/store.ts';

export function CheckoutPage({
  mode = 'checkout',
  orderNumberParam,
}: {
  mode?: 'checkout' | 'result' | 'order';
  orderNumberParam?: string;
}) {
  const {
    firebaseUser,
    profile,
    signIn,
    cart,
    products,
    addresses,
    settings,
    clearCart,
    orders,
    refreshOrders,
    refreshStorefront,
    lastCheckoutResult,
    setLastCheckoutResult,
    seededInFirestore,
    navigate,
    notify,
    lang,
    t,
  } = useStore();

  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');
  const [recipientName, setRecipientName] = useState(profile?.fullName || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [addressLine, setAddressLine] = useState('');
  const [province, setProvince] = useState('DKI Jakarta');
  const [city, setCity] = useState('Jakarta Selatan');
  const [district, setDistrict] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');
  const [courierCode, setCourierCode] = useState(settings.shippingOptions[0]?.code || 'jne_reg');
  const [couponCode, setCouponCode] = useState('');
  const [validatedDiscount, setValidatedDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [copiedWa, setCopiedWa] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (addresses.length > 0 && selectedAddressId === 'new') {
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddressId(def.id);
    }
  }, [addresses, selectedAddressId]);

  useEffect(() => {
    if (profile && !recipientName) {
      setRecipientName(profile.fullName);
      if (profile.phone) setPhone(profile.phone);
    }
  }, [profile, recipientName]);

  const activeOrder: Order | null =
    lastCheckoutResult?.order ||
    (orderNumberParam
      ? orders.find((o) => o.orderNumber === orderNumberParam || o.id === orderNumberParam) || null
      : null);

  const handleApplyCoupon = async () => {
    if (!firebaseUser || !couponCode.trim()) return;
    setErrorMsg('');
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/checkout/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          items: cart,
          courierCode,
          couponCode: couponCode.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || 'Kupon tidak dapat digunakan.');
        return;
      }
      if (json.data.discountAmount > 0) {
        setValidatedDiscount(json.data.discountAmount);
        setAppliedCoupon(json.data.couponApplied);
        notify(`Kupon ${json.data.couponApplied} diterapkan.`, 'success');
      } else {
        setValidatedDiscount(0);
        setAppliedCoupon(null);
        notify('Kupon tidak memenuhi syarat minimum atau tidak aktif.', 'info');
      }
    } catch {
      notify('Gagal memeriksa kupon.', 'error');
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseUser) {
      await signIn();
      return;
    }

    setErrorMsg('');
    const chosenAddr = addresses.find((a) => a.id === selectedAddressId);
    const shippingAddress = chosenAddr
      ? {
          label: chosenAddr.label,
          recipientName: chosenAddr.recipientName,
          phone: chosenAddr.phone,
          addressLine: chosenAddr.addressLine,
          province: chosenAddr.province,
          city: chosenAddr.city,
          district: chosenAddr.district || '',
          postalCode: chosenAddr.postalCode,
          notes: chosenAddr.notes || '',
        }
      : {
          label: 'Alamat Pengiriman',
          recipientName: recipientName.trim(),
          phone: phone.trim(),
          addressLine: addressLine.trim(),
          province: province.trim(),
          city: city.trim(),
          district: district.trim(),
          postalCode: postalCode.trim(),
          notes: notes.trim(),
        };

    if (
      !shippingAddress.recipientName ||
      !shippingAddress.phone ||
      !shippingAddress.addressLine ||
      !shippingAddress.city ||
      !shippingAddress.postalCode
    ) {
      setErrorMsg('Lengkapi nama penerima, nomor telepon, alamat, kota, dan kode pos.');
      return;
    }

    setSubmitting(true);
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/checkout/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          items: cart,
          shippingAddress,
          courierCode,
          couponCode: appliedCoupon || couponCode.trim() || undefined,
          customerPhone: shippingAddress.phone,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || 'Gagal membuat pesanan.');
        return;
      }

      const result = {
        order: json.data.order as Order,
        snapToken: '',
        mode: json.data.mode || 'whatsapp_chat',
      };
      setLastCheckoutResult(result);
      clearCart();
      await Promise.all([refreshOrders(), refreshStorefront()]);
      navigate(`/order/${result.order.orderNumber}`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan saat checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    setReconciling(true);
    setErrorMsg('');
    try {
      const headers = await getAuthHeader();
      const res = await fetch('/api/payments/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          orderId,
          simulatedOutcome: 'cancel',
          paymentMethod: 'whatsapp_customer_cancelled',
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || 'Gagal membatalkan pesanan.');
        return;
      }
      const updated = json.data.order as Order;
      setLastCheckoutResult({
        order: updated,
        snapToken: '',
        mode: 'whatsapp_chat',
      });
      await Promise.all([refreshOrders(), refreshStorefront()]);
      notify('Pesanan dibatalkan dan reservasi stok dilepaskan.', 'info');
    } catch {
      setErrorMsg('Gagal membatalkan pesanan.');
    } finally {
      setReconciling(false);
    }
  };

  // Order Confirmation & WhatsApp Payment Step View
  if (mode === 'order' || mode === 'result') {
    if (!firebaseUser) {
      return (
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          <Lock className="w-8 h-8 mx-auto text-[#30302E]/45 mb-3" />
          <h1 className="font-serif text-2xl text-[#30302E] mb-2">{t.checkout.orderLoginTitle}</h1>
          <p className="text-sm text-[#30302E]/70 mb-6">
            {t.checkout.orderLoginBody}
          </p>
          <button
            type="button"
            onClick={signIn}
            className="px-6 py-3 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-sm font-semibold hover:bg-[#DFA691]"
          >
            {t.checkout.signInGoogle}
          </button>
        </main>
      );
    }

    if (!activeOrder) {
      return (
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          <h1 className="font-serif text-2xl text-[#30302E] mb-2">{t.checkout.orderNotFound}</h1>
          <button
            type="button"
            onClick={() => navigate('/account/orders')}
            className="mt-4 px-5 py-2.5 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-sm font-semibold hover:bg-[#DFA691]"
          >
            {t.checkout.viewOrderHistory}
          </button>
        </main>
      );
    }

    const waMessage = formatOrderWhatsappMessage(activeOrder, lang);
    const waUrl = buildWhatsappChatUrl(settings.contactWhatsapp, waMessage);

    const handleCopyWa = async () => {
      try {
        await navigator.clipboard.writeText(waMessage);
        setCopiedWa(true);
        setTimeout(() => setCopiedWa(false), 2000);
      } catch {
        notify('Clipboard tidak tersedia.', 'info');
      }
    };

    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <div className="bg-white border border-[#30302E]/15 p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#30302E]/10 pb-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#30302E]/60">
                {t.checkout.orderNumberLabel}
              </p>
              <h1 className="font-mono text-2xl font-semibold text-[#30302E] mt-1">
                {activeOrder.orderNumber}
              </h1>
              <p className="text-xs text-[#30302E]/65 mt-1">
                {t.checkout.createdAt} {formatJakartaDate(activeOrder.createdAt)}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 border border-[#30302E]/20 bg-[#FAF7F2]">
                {activeOrder.paymentStatus === 'paid' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#14362B]" />
                ) : activeOrder.paymentStatus === 'pending' ? (
                  <Clock className="w-4 h-4 text-amber-700" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-700" />
                )}
                <span>
                  {t.checkout.paymentLabel}: {activeOrder.paymentStatus.toUpperCase()}
                </span>
              </span>
              <p className="text-xs text-[#30302E]/70 mt-1.5">
                {t.checkout.fulfilmentLabel}:{' '}
                <strong className="uppercase">{activeOrder.fulfilmentStatus}</strong>
              </p>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-800">{errorMsg}</div>
          )}

          {/* WhatsApp Chat Payment Box */}
          {activeOrder.paymentStatus === 'pending' && (
            <div className="bg-[#E9BBAA]/25 border border-[#30302E]/25 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-[#30302E] shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-serif text-lg text-[#30302E]">{t.checkout.waBoxTitle}</h2>
                  <p className="text-xs text-[#30302E]/85 mt-1 leading-relaxed">
                    {t.checkout.waBoxDesc(formatJakartaDate(activeOrder.paymentDeadline))}
                  </p>
                  <p className="text-[11px] font-mono text-[#30302E]/75 mt-1">
                    WhatsApp Admin: {settings.contactWhatsapp}
                  </p>
                </div>
              </div>

              <pre className="bg-white border border-[#30302E]/15 p-3.5 text-[11px] font-mono text-[#30302E]/85 whitespace-pre-wrap leading-relaxed">
                {waMessage}
              </pre>

              <div className="flex flex-wrap gap-2.5">
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/30 text-xs font-semibold inline-flex items-center gap-2 hover:bg-[#DFA691] transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{t.checkout.waPayButton}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={handleCopyWa}
                  className="px-4 py-2.5 bg-white border border-[#30302E]/25 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-[#FAF7F2]"
                >
                  {copiedWa ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedWa ? t.checkout.copiedMessage : t.checkout.copyMessage}</span>
                </button>
                <button
                  type="button"
                  disabled={reconciling}
                  onClick={() => handleCancelOrder(activeOrder.id)}
                  className="px-4 py-2.5 bg-white border border-red-300 text-red-800 text-xs font-medium hover:bg-red-50 disabled:opacity-50"
                >
                  {reconciling ? t.checkout.cancelling : t.checkout.cancelOrder}
                </button>
              </div>
            </div>
          )}

          {activeOrder.paymentStatus === 'paid' && (
            <div className="bg-[#14362B]/10 border border-[#14362B]/25 p-4 text-xs text-[#14362B] flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{t.checkout.waPaidNotice}</span>
            </div>
          )}

          {/* Item Snapshots */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#30302E]">
              {t.checkout.itemsSummary}
            </h3>
            {activeOrder.items.map((item) => (
              <div
                key={item.productId}
                className="flex items-center justify-between gap-4 py-2 border-b border-[#30302E]/10 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-14 object-cover bg-[#F4EFE8] shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-[#30302E] truncate">{item.name}</p>
                    <p className="text-xs text-[#30302E]/65">
                      {item.sku} · {item.sizeLabel} · Grade {item.conditionGrade} · Qty {item.quantity}
                    </p>
                  </div>
                </div>
                <span className="font-mono text-sm tabular-nums shrink-0">{formatIDR(item.lineTotal)}</span>
              </div>
            ))}
          </div>

          {/* Totals & Shipping */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 text-xs">
            <div className="space-y-1 text-[#30302E]/80">
              <p className="font-semibold uppercase tracking-wider text-[#30302E] mb-1">
                {t.checkout.shippingAddressTitle}
              </p>
              <p className="font-medium">{activeOrder.shippingAddressSnapshot.recipientName}</p>
              <p>{activeOrder.shippingAddressSnapshot.phone}</p>
              <p>{activeOrder.shippingAddressSnapshot.addressLine}</p>
              <p>
                {activeOrder.shippingAddressSnapshot.city}, {activeOrder.shippingAddressSnapshot.province}{' '}
                {activeOrder.shippingAddressSnapshot.postalCode}
              </p>
              <p className="pt-1">
                {t.checkout.courierLabel}: {activeOrder.courierService}
              </p>
              {activeOrder.trackingNumber && (
                <p className="font-mono font-semibold text-[#30302E]">
                  {t.checkout.trackingLabel}: {activeOrder.trackingNumber}
                </p>
              )}
            </div>

            <div className="space-y-2 border-t sm:border-t-0 sm:border-l border-[#30302E]/10 pt-4 sm:pt-0 sm:pl-6">
              <div className="flex justify-between">
                <span>{t.cart.subtotal}</span>
                <span className="font-mono tabular-nums">{formatIDR(activeOrder.subtotal)}</span>
              </div>
              {activeOrder.discountAmount > 0 && (
                <div className="flex justify-between text-[#14362B]">
                  <span>
                    {t.checkout.discount} ({activeOrder.couponCode})
                  </span>
                  <span className="font-mono tabular-nums">-{formatIDR(activeOrder.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>{t.checkout.shipping}</span>
                <span className="font-mono tabular-nums">{formatIDR(activeOrder.shippingAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-[#30302E] pt-2 border-t border-[#30302E]/10">
                <span>{t.checkout.total}</span>
                <span className="font-mono tabular-nums">{formatIDR(activeOrder.grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#30302E]/10 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => navigate('/account/orders')}
              className="px-5 py-2.5 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-xs font-semibold hover:bg-[#DFA691]"
            >
              {t.checkout.viewAllOrders}
            </button>
            <button
              type="button"
              onClick={() => navigate('/shop')}
              className="px-5 py-2.5 border border-[#30302E]/25 text-xs font-medium hover:bg-[#FAF7F2]"
            >
              {t.checkout.continueShopping}
            </button>
          </div>
        </div>
      </main>
    );
  }

  // Standard Checkout Form
  const resolvedCart = cart
    .map((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      return p ? { ...item, product: p } : null;
    })
    .filter(Boolean) as { productId: string; quantity: number; product: (typeof products)[number] }[];

  if (resolvedCart.length === 0) {
    return (
      <main className="max-w-xl mx-auto px-4 py-16 text-center">
        <h1 className="font-serif text-2xl text-[#30302E] mb-2">{t.checkout.emptyTitle}</h1>
        <p className="text-sm text-[#30302E]/70 mb-6">{t.checkout.emptyBody}</p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-5 py-2.5 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-sm font-semibold hover:bg-[#DFA691]"
        >
          {t.cart.viewCollection}
        </button>
      </main>
    );
  }

  const subtotal = resolvedCart.reduce((sum, i) => sum + i.product.sellingPrice * i.quantity, 0);
  const selectedShipping =
    settings.shippingOptions.find((s) => s.code === courierCode) || settings.shippingOptions[0];
  const estimatedGrandTotal = Math.max(0, subtotal - validatedDiscount + (selectedShipping?.cost || 0));

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="border-b border-[#30302E]/12 pb-5 mb-8">
        <p className="text-xs uppercase tracking-[0.18em] text-[#30302E]/60 mb-1">
          {t.checkout.kicker}
        </p>
        <h1 className="font-serif text-3xl text-[#30302E]">{t.checkout.heading}</h1>
      </div>

      {!firebaseUser ? (
        <div className="bg-white border border-[#30302E]/15 p-8 max-w-lg mx-auto text-center space-y-4">
          <ShieldCheck className="w-8 h-8 text-[#30302E] mx-auto" />
          <h2 className="font-serif text-2xl text-[#30302E]">{t.checkout.signInPromptTitle}</h2>
          <p className="text-sm text-[#30302E]/75">{t.checkout.signInPromptBody}</p>
          <button
            type="button"
            onClick={signIn}
            className="px-6 py-3 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-sm font-semibold hover:bg-[#DFA691]"
          >
            {t.checkout.signInGoogle}
          </button>
        </div>
      ) : (
        <form onSubmit={handleCreateOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            {!seededInFirestore && (
              <div className="bg-[#E9BBAA]/35 border border-[#30302E]/15 p-4 text-xs text-[#30302E] leading-relaxed">
                {t.checkout.demoNotice}
              </div>
            )}

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 p-4 text-xs text-red-800">{errorMsg}</div>
            )}

            {/* Saved Addresses */}
            <section className="bg-white border border-[#30302E]/12 p-6 space-y-4">
              <h2 className="font-serif text-xl text-[#30302E]">{t.checkout.addressSection}</h2>
              {addresses.length > 0 && (
                <div className="space-y-2">
                  {addresses.map((addr) => (
                    <label
                      key={addr.id}
                      className={`block p-4 border cursor-pointer text-xs space-y-1 ${
                        selectedAddressId === addr.id
                          ? 'border-[#30302E] bg-[#FAF7F2]'
                          : 'border-[#30302E]/15'
                      }`}
                    >
                      <div className="flex items-center gap-2 font-medium text-sm text-[#30302E]">
                        <input
                          type="radio"
                          name="addressSelection"
                          checked={selectedAddressId === addr.id}
                          onChange={() => setSelectedAddressId(addr.id)}
                          className="accent-[#30302E]"
                        />
                        <span>
                          {addr.label} — {addr.recipientName}
                        </span>
                      </div>
                      <p className="pl-5 text-[#30302E]/75">
                        {addr.addressLine}, {addr.city}, {addr.province} {addr.postalCode} · {addr.phone}
                      </p>
                    </label>
                  ))}
                  <label className="flex items-center gap-2 text-xs font-medium text-[#30302E] pt-1 cursor-pointer">
                    <input
                      type="radio"
                      name="addressSelection"
                      checked={selectedAddressId === 'new'}
                      onChange={() => setSelectedAddressId('new')}
                      className="accent-[#30302E]"
                    />
                    <span>{t.checkout.useNewAddress}</span>
                  </label>
                </div>
              )}

              {selectedAddressId === 'new' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label htmlFor="chk-name" className="block text-xs font-medium mb-1">
                      {t.checkout.recipientName}
                    </label>
                    <input
                      id="chk-name"
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="chk-phone" className="block text-xs font-medium mb-1">
                      {t.checkout.phone}
                    </label>
                    <input
                      id="chk-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0812..."
                      className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="chk-line" className="block text-xs font-medium mb-1">
                      {t.checkout.addressLine}
                    </label>
                    <textarea
                      id="chk-line"
                      required
                      rows={2}
                      value={addressLine}
                      onChange={(e) => setAddressLine(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="chk-city" className="block text-xs font-medium mb-1">
                      {t.checkout.city}
                    </label>
                    <input
                      id="chk-city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="chk-prov" className="block text-xs font-medium mb-1">
                      {t.checkout.province}
                    </label>
                    <input
                      id="chk-prov"
                      type="text"
                      required
                      value={province}
                      onChange={(e) => setProvince(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="chk-dist" className="block text-xs font-medium mb-1">
                      {t.checkout.district}
                    </label>
                    <input
                      id="chk-dist"
                      type="text"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="chk-zip" className="block text-xs font-medium mb-1">
                      {t.checkout.postalCode}
                    </label>
                    <input
                      id="chk-zip"
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label htmlFor="chk-notes" className="block text-xs font-medium mb-1">
                      {t.checkout.notes}
                    </label>
                    <input
                      id="chk-notes"
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#FAF7F2] border border-[#30302E]/20"
                    />
                  </div>
                </div>
              )}
            </section>

            {/* Courier Selection */}
            <section className="bg-white border border-[#30302E]/12 p-6 space-y-4">
              <h2 className="font-serif text-xl text-[#30302E]">{t.checkout.courierSection}</h2>
              <div className="space-y-2.5">
                {settings.shippingOptions.map((opt) => (
                  <label
                    key={opt.code}
                    className={`flex items-center justify-between gap-4 p-4 border cursor-pointer ${
                      courierCode === opt.code ? 'border-[#30302E] bg-[#FAF7F2]' : 'border-[#30302E]/15'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="courierOption"
                        checked={courierCode === opt.code}
                        onChange={() => setCourierCode(opt.code)}
                        className="accent-[#30302E]"
                      />
                      <div>
                        <p className="text-sm font-medium text-[#30302E]">{opt.name}</p>
                        <p className="text-xs text-[#30302E]/65">
                          {t.checkout.estPrefix} {opt.estimatedDays}
                        </p>
                      </div>
                    </div>
                    <span className="font-mono text-sm font-medium tabular-nums">
                      {formatIDR(opt.cost)}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          {/* Order Summary Sidebar */}
          <aside className="lg:col-span-5 bg-white border border-[#30302E]/12 p-6 space-y-5 lg:sticky lg:top-24">
            <h2 className="font-serif text-xl text-[#30302E]">{t.checkout.summaryTitle}</h2>
            <div className="space-y-3 border-b border-[#30302E]/10 pb-4">
              {resolvedCart.map(({ product, quantity }) => (
                <div key={product.id} className="flex justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-[#30302E] truncate">{product.name}</p>
                    <p className="text-xs text-[#30302E]/65">
                      {product.sizeLabel} · Grade {product.conditionGrade} · {t.cart.qtyShort} {quantity}
                    </p>
                  </div>
                  <span className="font-mono text-sm tabular-nums shrink-0">
                    {formatIDR(product.sellingPrice * quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Coupon */}
            <div className="flex gap-2">
              <label htmlFor="coupon-input" className="sr-only">
                Coupon
              </label>
              <input
                id="coupon-input"
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder={t.checkout.couponPlaceholder}
                className="flex-1 px-3 py-2 text-xs bg-[#FAF7F2] border border-[#30302E]/20 uppercase"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="px-4 py-2 border border-[#30302E]/25 text-xs font-medium hover:bg-[#FAF7F2]"
              >
                {t.checkout.apply}
              </button>
            </div>

            <div className="space-y-2 text-sm pt-2 border-t border-[#30302E]/10">
              <div className="flex justify-between">
                <span className="text-[#30302E]/75">{t.cart.subtotal}</span>
                <span className="font-mono tabular-nums">{formatIDR(subtotal)}</span>
              </div>
              {validatedDiscount > 0 && (
                <div className="flex justify-between text-[#14362B]">
                  <span>
                    {t.checkout.discount} ({appliedCoupon})
                  </span>
                  <span className="font-mono tabular-nums">-{formatIDR(validatedDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#30302E]/75">{t.checkout.shipping}</span>
                <span className="font-mono tabular-nums">{formatIDR(selectedShipping?.cost || 0)}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-[#30302E] pt-3 border-t border-[#30302E]/10">
                <span>{t.checkout.total}</span>
                <span className="font-mono tabular-nums">{formatIDR(estimatedGrandTotal)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#DFA691] disabled:opacity-50 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>{submitting ? t.checkout.submittingOrder : t.checkout.submitOrder}</span>
            </button>
            <p className="text-[11px] text-[#30302E]/65 leading-relaxed">
              {t.checkout.waCheckoutNote(settings.reservationMinutes)}
            </p>
          </aside>
        </form>
      )}
    </main>
  );
}
