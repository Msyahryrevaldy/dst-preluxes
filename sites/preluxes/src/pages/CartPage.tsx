import { ArrowRight, ShoppingBag, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { formatIDR, getAvailableQuantity } from '../utils/commerce.ts';

export function CartPage() {
  const { cart, products, removeFromCart, navigate, t } = useStore();

  const resolved = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product ? { ...item, product } : null;
    })
    .filter(Boolean) as { productId: string; quantity: number; product: (typeof products)[number] }[];

  const subtotal = resolved.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  const hasConflict = resolved.some((i) => getAvailableQuantity(i.product) < i.quantity);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="font-serif text-3xl text-[#30302E] mb-8 border-b border-[#30302E]/12 pb-4">
        {t.cart.title}
      </h1>

      {resolved.length === 0 ? (
        <div className="bg-white border border-[#30302E]/12 p-12 text-center">
          <ShoppingBag className="w-10 h-10 text-[#30302E]/35 mx-auto mb-3" strokeWidth={1.4} />
          <h2 className="font-serif text-xl text-[#30302E] mb-2">{t.cart.emptyTitle}</h2>
          <p className="text-sm text-[#30302E]/70 mb-6">
            {t.cart.emptyBody}
          </p>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="px-6 py-3 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-sm font-semibold hover:bg-[#DFA691]"
          >
            {t.cart.viewCollection}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-4">
            {resolved.map(({ product, quantity }) => {
              const avail = getAvailableQuantity(product);
              return (
                <div
                  key={product.id}
                  className="bg-white border border-[#30302E]/12 p-4 sm:p-5 flex gap-4 sm:gap-6 items-start"
                >
                  <img
                    src={product.primaryImageUrl}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-24 h-28 object-cover bg-[#F4EFE8] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-[#30302E]/60">
                          {product.categoryName} · {product.sku}
                        </p>
                        <a
                          href={`/product/${product.slug}`}
                          onClick={(e) => {
                            e.preventDefault();
                            navigate(`/product/${product.slug}`);
                          }}
                          className="font-serif text-lg text-[#30302E] hover:underline mt-0.5 block"
                        >
                          {product.name}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        aria-label={product.name}
                        className="p-2 text-[#30302E]/55 hover:text-[#30302E]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-[#30302E]/70 mt-1">
                      {t.cart.sizeShort} {product.sizeLabel} · Grade {product.conditionGrade} · {t.cart.qtyShort} {quantity}
                    </p>
                    {avail < quantity && (
                      <p className="text-xs text-red-700 font-medium mt-2">
                        {t.cart.insufficientStock(avail)}
                      </p>
                    )}
                    <p className="font-mono text-base font-semibold text-[#30302E] mt-3 tabular-nums">
                      {formatIDR(product.sellingPrice * quantity)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="lg:col-span-4 bg-white border border-[#30302E]/12 p-6 space-y-4">
            <h2 className="font-serif text-xl text-[#30302E]">{t.checkout.summaryTitle}</h2>
            <div className="flex justify-between text-sm pt-2 border-t border-[#30302E]/10">
              <span className="text-[#30302E]/75">{t.cart.subtotal}</span>
              <span className="font-mono font-semibold text-[#30302E] tabular-nums">
                {formatIDR(subtotal)}
              </span>
            </div>
            <p className="text-xs text-[#30302E]/65 leading-relaxed">
              {t.cart.serverNote}
            </p>
            <button
              type="button"
              disabled={hasConflict}
              onClick={() => navigate('/checkout')}
              className="w-full py-3 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#DFA691] disabled:opacity-45"
            >
              <span>{t.cart.proceedCheckout}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </aside>
        </div>
      )}
    </main>
  );
}
