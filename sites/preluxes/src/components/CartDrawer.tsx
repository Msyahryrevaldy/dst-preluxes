import { ArrowRight, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { formatIDR, getAvailableQuantity } from '../utils/commerce.ts';

export function CartDrawer() {
  const { cart, cartOpen, setCartOpen, products, removeFromCart, navigate, t } = useStore();

  if (!cartOpen) return null;

  const resolved = cart
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      return product ? { ...item, product } : null;
    })
    .filter(Boolean) as { productId: string; quantity: number; product: (typeof products)[number] }[];

  const subtotal = resolved.reduce((sum, item) => sum + item.product.sellingPrice * item.quantity, 0);
  const hasUnavailable = resolved.some((item) => getAvailableQuantity(item.product) < item.quantity);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={t.cart.title}>
      <button
        type="button"
        aria-label={t.cart.title}
        onClick={() => setCartOpen(false)}
        className="fixed inset-0 bg-[#30302E]/45 transition-opacity"
      />

      <aside className="relative z-10 w-full max-w-md bg-[#FAF7F2] h-full flex flex-col border-l border-[#30302E]/15 shadow-xl">
        <div className="px-6 py-5 border-b border-[#30302E]/12 flex items-center justify-between bg-[#E9BBAA]/25">
          <div>
            <h2 className="font-serif text-xl text-[#30302E]">{t.cart.title}</h2>
            <p className="text-xs text-[#30302E]/70 mt-0.5 tabular-nums">
              {t.cart.itemCount(resolved.length)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            aria-label="Close"
            className="w-10 h-10 flex items-center justify-center text-[#30302E] hover:bg-[#30302E]/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {resolved.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag className="w-9 h-9 text-[#30302E]/35 mx-auto mb-3" strokeWidth={1.4} />
              <p className="font-serif text-lg text-[#30302E] mb-1">{t.cart.emptyTitle}</p>
              <p className="text-sm text-[#30302E]/65 mb-6">
                {t.cart.emptyBody}
              </p>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/shop');
                }}
                className="px-5 py-2.5 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-sm font-semibold hover:bg-[#DFA691]"
              >
                {t.cart.viewCollection}
              </button>
            </div>
          ) : (
            resolved.map(({ product, quantity }) => {
              const avail = getAvailableQuantity(product);
              return (
                <div key={product.id} className="flex gap-4 pb-4 border-b border-[#30302E]/10">
                  <img
                    src={product.primaryImageUrl}
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-20 h-24 object-cover bg-[#F4EFE8] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={`/product/${product.slug}`}
                        onClick={(e) => {
                          e.preventDefault();
                          setCartOpen(false);
                          navigate(`/product/${product.slug}`);
                        }}
                        className="font-serif text-sm text-[#30302E] hover:underline line-clamp-2"
                      >
                        {product.name}
                      </a>
                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        aria-label={`${product.name}`}
                        className="p-1.5 text-[#30302E]/50 hover:text-[#30302E]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-[#30302E]/65 mt-1">
                      {product.sizeLabel} · Grade {product.conditionGrade} · {t.cart.qtyShort} {quantity}
                    </p>
                    <p className="font-mono text-sm font-medium text-[#30302E] mt-2 tabular-nums">
                      {formatIDR(product.sellingPrice * quantity)}
                    </p>
                    {avail < quantity && (
                      <p className="text-xs text-red-700 mt-1">
                        {t.cart.insufficientStock(avail)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {resolved.length > 0 && (
          <div className="px-6 py-5 border-t border-[#30302E]/12 bg-white space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#30302E]/75">{t.cart.subtotal}</span>
              <span className="font-mono text-base font-semibold text-[#30302E] tabular-nums">
                {formatIDR(subtotal)}
              </span>
            </div>
            <p className="text-xs text-[#30302E]/65">
              {t.cart.serverNote}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/cart');
                }}
                className="px-4 py-2.5 border border-[#30302E]/25 text-xs font-medium text-[#30302E] hover:bg-[#FAF7F2]"
              >
                {t.cart.viewCart}
              </button>
              <button
                type="button"
                disabled={hasUnavailable}
                onClick={() => {
                  setCartOpen(false);
                  navigate('/checkout');
                }}
                className="px-4 py-2.5 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:bg-[#DFA691] disabled:opacity-50"
              >
                <span>{t.cart.checkout}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
