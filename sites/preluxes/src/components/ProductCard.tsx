import { useState } from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import type { Product } from '../types/store.ts';
import { formatIDR, getAvailableQuantity } from '../utils/commerce.ts';
import { useStore } from '../context/StoreContext.tsx';

export function ProductCard({ product }: { product: Product }) {
  const { navigate, addToCart, wishlistIds, toggleWishlist, t } = useStore();
  const [imgFailed, setImgFailed] = useState(false);

  const available = getAvailableQuantity(product);
  const isSaved = wishlistIds.includes(product.id);
  const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.sellingPrice);

  return (
    <article className="group flex flex-col bg-white border border-[#30302E]/10 transition-transform duration-200 hover:-translate-y-0.5">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4EFE8]">
        <a
          href={`/product/${product.slug}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/product/${product.slug}`);
          }}
          className="block w-full h-full"
          aria-label={product.name}
        >
          {!imgFailed && product.primaryImageUrl ? (
            <img
              src={product.primaryImageUrl}
              alt={product.images?.[0]?.altText || product.name}
              referrerPolicy="no-referrer"
              onError={() => setImgFailed(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#FAF7F2] to-[#E9BBAA]/40">
              <ShoppingBag className="w-7 h-7 text-[#30302E]/40 mb-2" strokeWidth={1.5} />
              <span className="text-xs font-medium text-[#30302E]/70 line-clamp-2">{product.name}</span>
            </div>
          )}
        </a>

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={isSaved ? `${t.product.removeWishlist}: ${product.name}` : `${t.product.saveWishlist}: ${product.name}`}
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center bg-[#FAF7F2]/90 border border-[#30302E]/15 text-[#30302E] hover:bg-white transition-colors"
        >
          <Heart className={`w-4 h-4 ${isSaved ? 'fill-[#30302E]' : ''}`} strokeWidth={1.6} />
        </button>

        {available === 0 && (
          <div className="absolute inset-x-0 bottom-0 bg-[#30302E]/85 text-[#FAF7F2] px-3 py-1.5 text-xs tracking-wide text-center">
            {product.reservedQuantity > 0 ? t.product.reserved : t.product.sold}
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 p-5 gap-2">
        <div className="flex items-center gap-1.5 text-[12px] text-[#30302E]/65 tracking-wide uppercase">
          <span className="truncate">{product.categoryName}</span>
          <span aria-hidden="true">·</span>
          <span>Grade {product.conditionGrade}</span>
          <span aria-hidden="true">·</span>
          <span>{product.sizeLabel}</span>
          {product.isDemo && (
            <>
              <span aria-hidden="true">·</span>
              <span className="text-[#30302E]/80 font-medium">{t.product.demoBadge}</span>
            </>
          )}
        </div>

        <a
          href={`/product/${product.slug}`}
          onClick={(e) => {
            e.preventDefault();
            navigate(`/product/${product.slug}`);
          }}
          className="font-serif text-[17px] leading-snug text-[#30302E] hover:underline underline-offset-4 line-clamp-2"
        >
          {product.name}
        </a>

        <p className="text-xs text-[#30302E]/70 line-clamp-2 leading-relaxed">
          {product.conditionNotes}
        </p>

        <div className="mt-auto pt-3 border-t border-[#30302E]/10 flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="font-mono text-[15px] font-medium text-[#30302E] tabular-nums">
              {formatIDR(product.sellingPrice)}
            </span>
            {hasDiscount && (
              <span className="font-mono text-xs text-[#30302E]/50 line-through tabular-nums">
                {formatIDR(product.originalPrice!)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={available === 0}
            onClick={() => addToCart(product)}
            aria-label={`${t.product.addToCart}: ${product.name}`}
            className={`px-3.5 py-2 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
              available > 0
                ? 'bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 hover:bg-[#DFA691]'
                : 'bg-[#30302E]/10 text-[#30302E]/40 cursor-not-allowed'
            }`}
          >
            {available > 0 ? t.product.addToCart : t.product.outOfStock}
          </button>
        </div>
      </div>
    </article>
  );
}
