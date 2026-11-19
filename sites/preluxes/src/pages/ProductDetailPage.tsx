import { useState } from 'react';
import { ArrowLeft, Heart, Info, Ruler, ShieldCheck, ShoppingBag } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { formatIDR, getAvailableQuantity } from '../utils/commerce.ts';

export function ProductDetailPage({ slug }: { slug: string }) {
  const { products, navigate, addToCart, wishlistIds, toggleWishlist, t } = useStore();
  const product = products.find((p) => p.slug === slug || p.id === slug);
  const [activeImgIdx, setActiveImgIdx] = useState(0);

  if (!product) {
    return (
      <main className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="font-serif text-3xl text-[#30302E] mb-3">{t.product.notFoundTitle}</h1>
        <p className="text-sm text-[#30302E]/70 mb-6">
          {t.product.notFoundBody}
        </p>
        <button
          type="button"
          onClick={() => navigate('/shop')}
          className="px-5 py-2.5 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-sm font-semibold hover:bg-[#DFA691]"
        >
          {t.product.backToCollection}
        </button>
      </main>
    );
  }

  const images =
    product.images && product.images.length > 0
      ? product.images
      : [{ url: product.primaryImageUrl, altText: product.name, imageType: 'front' as const, isPrimary: true, sortOrder: 0 }];
  const activeImage = images[activeImgIdx] || images[0];
  const available = getAvailableQuantity(product);
  const isSaved = wishlistIds.includes(product.id);
  const cond = t.product.grades[product.conditionGrade];
  const m = product.measurements || {};

  const measurementEntries: [string, string][] = [];
  if (m.chestWidthCm) measurementEntries.push([t.product.chestWidth, `${m.chestWidthCm} cm`]);
  if (m.lengthCm) measurementEntries.push([t.product.length, `${m.lengthCm} cm`]);
  if (m.shoulderWidthCm) measurementEntries.push([t.product.shoulderWidth, `${m.shoulderWidthCm} cm`]);
  if (m.sleeveLengthCm) measurementEntries.push([t.product.sleeveLength, `${m.sleeveLengthCm} cm`]);
  if (m.waistCm) measurementEntries.push([t.product.waist, `${m.waistCm} cm`]);
  if (m.inseamCm) measurementEntries.push([t.product.inseam, `${m.inseamCm} cm`]);
  if (m.bagWidthCm) measurementEntries.push([t.product.bagWidth, `${m.bagWidthCm} cm`]);
  if (m.bagHeightCm) measurementEntries.push([t.product.bagHeight, `${m.bagHeightCm} cm`]);
  if (m.shoeSizeEu) measurementEntries.push([t.product.shoeSize, m.shoeSizeEu]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 pb-28 lg:pb-16">
      <button
        type="button"
        onClick={() => navigate('/shop')}
        className="inline-flex items-center gap-2 text-xs font-medium text-[#30302E]/75 hover:text-[#30302E] mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t.product.backToCollection}</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Sticky Gallery Left */}
        <div className="lg:col-span-7 space-y-4 lg:sticky lg:top-24">
          <div className="aspect-[4/3] w-full bg-[#F4EFE8] border border-[#30302E]/12 overflow-hidden relative">
            <img
              src={activeImage.url}
              alt={activeImage.altText || product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-3 left-3 bg-[#FAF7F2]/90 px-3 py-1 text-xs text-[#30302E] border border-[#30302E]/10">
              {t.product.viewLabel}: {t.product.imageTypes[activeImage.imageType] || activeImage.imageType}
            </div>
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
              {images.map((img, idx) => (
                <button
                  key={`${img.url}-${idx}`}
                  type="button"
                  onClick={() => setActiveImgIdx(idx)}
                  aria-label={`${t.product.viewLabel} ${idx + 1} (${t.product.imageTypes[img.imageType] || img.imageType})`}
                  className={`aspect-[4/3] border overflow-hidden ${
                    idx === activeImgIdx ? 'border-[#30302E] ring-1 ring-[#30302E]' : 'border-[#30302E]/15 opacity-75 hover:opacity-100'
                  }`}
                >
                  <img src={img.url} alt={img.altText || product.name} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Contiguous Purchase Module Right */}
        <div className="lg:col-span-5 space-y-6 bg-white border border-[#30302E]/12 p-6 sm:p-8">
          <div className="space-y-2 border-b border-[#30302E]/10 pb-5">
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-[#30302E]/65">
              <span>{product.categoryName}</span>
              <span aria-hidden="true">·</span>
              <span>{product.brandName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{product.sku}</span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl text-[#30302E] leading-snug">
              {product.name}
            </h1>

            {product.isDemo && (
              <p className="text-xs bg-[#E9BBAA]/40 text-[#30302E] px-3 py-1.5 border border-[#30302E]/15">
                {t.product.demoBanner}
              </p>
            )}

            <div className="pt-2 flex items-baseline gap-3">
              <span className="font-mono text-2xl font-semibold text-[#30302E] tabular-nums">
                {formatIDR(product.sellingPrice)}
              </span>
              {product.originalPrice && product.originalPrice > product.sellingPrice && (
                <span className="font-mono text-sm text-[#30302E]/50 line-through tabular-nums">
                  {formatIDR(product.originalPrice)}
                </span>
              )}
            </div>

            <p className="text-xs font-medium text-[#30302E]/80 pt-1">
              {t.product.availabilityLabel}:{' '}
              {available > 0 ? (
                <span className="text-[#14362B] font-semibold">{t.product.availableUnits(available)}</span>
              ) : product.reservedQuantity > 0 ? (
                <span className="text-amber-800 font-semibold">{t.product.reserved}</span>
              ) : (
                <span className="text-[#30302E]/60 font-semibold">{t.product.sold}</span>
              )}
            </p>
          </div>

          {/* Primary Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              disabled={available === 0}
              onClick={() => addToCart(product)}
              className="flex-1 py-3.5 px-5 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#DFA691] disabled:opacity-45 disabled:cursor-not-allowed transition-colors"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>{available > 0 ? t.product.addToCart : t.product.outOfStock}</span>
            </button>
            <button
              type="button"
              onClick={() => toggleWishlist(product.id)}
              aria-label={isSaved ? t.product.removeWishlist : t.product.saveWishlist}
              className="px-4 py-3.5 border border-[#30302E]/25 text-[#30302E] hover:bg-[#E9BBAA]/20 transition-colors"
            >
              <Heart className={`w-4 h-4 ${isSaved ? 'fill-[#30302E]' : ''}`} />
            </button>
          </div>

          {/* Condition Disclosure */}
          <div className="bg-[#FAF7F2] border border-[#30302E]/12 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#30302E]">
              <ShieldCheck className="w-4 h-4" />
              <span>{cond.title}</span>
            </div>
            <p className="text-xs text-[#30302E]/75 leading-relaxed">{product.conditionNotes}</p>
            {product.defectNotes && (
              <div className="pt-2 border-t border-[#30302E]/10">
                <p className="text-xs font-medium text-[#30302E]">{t.product.openDefectTitle}</p>
                <p className="text-xs text-[#30302E]/80 mt-0.5 leading-relaxed">{product.defectNotes}</p>
              </div>
            )}
          </div>

          {/* Specs & Measurements */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#30302E]">
              <Ruler className="w-4 h-4" />
              <span>{t.product.measurementsTitle}</span>
            </div>
            <dl className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-xs border-t border-[#30302E]/10 pt-3">
              <div>
                <dt className="text-[#30302E]/60">{t.product.sizeLabel}</dt>
                <dd className="font-medium text-[#30302E] mt-0.5">{product.sizeLabel}</dd>
              </div>
              <div>
                <dt className="text-[#30302E]/60">{t.product.styleLabel}</dt>
                <dd className="font-medium text-[#30302E] mt-0.5">{product.gender}</dd>
              </div>
              <div>
                <dt className="text-[#30302E]/60">{t.product.colorLabel}</dt>
                <dd className="font-medium text-[#30302E] mt-0.5">{product.color || '—'}</dd>
              </div>
              <div>
                <dt className="text-[#30302E]/60">{t.product.materialLabel}</dt>
                <dd className="font-medium text-[#30302E] mt-0.5">{product.material || t.product.materialFallback}</dd>
              </div>
              {measurementEntries.map(([label, val]) => (
                <div key={label}>
                  <dt className="text-[#30302E]/60">{label}</dt>
                  <dd className="font-mono font-medium text-[#30302E] mt-0.5 tabular-nums">{val}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Description */}
          {product.description && (
            <div className="pt-4 border-t border-[#30302E]/10 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#30302E]">
                <Info className="w-4 h-4" />
                <span>{t.product.curationNotes}</span>
              </div>
              <p className="text-sm text-[#30302E]/80 leading-relaxed">{product.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Sticky Purchase Bar */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#FAF7F2]/95 backdrop-blur-sm border-t border-[#30302E]/15 px-4 py-3 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-[#30302E]/70 truncate">{product.name}</p>
          <p className="font-mono text-sm font-semibold text-[#30302E] tabular-nums">
            {formatIDR(product.sellingPrice)}
          </p>
        </div>
        <button
          type="button"
          disabled={available === 0}
          onClick={() => addToCart(product)}
          className="px-4 py-2.5 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-xs font-semibold whitespace-nowrap shrink-0 disabled:opacity-45"
        >
          {available > 0 ? t.product.addToCart : t.product.outOfStock}
        </button>
      </div>
    </main>
  );
}
