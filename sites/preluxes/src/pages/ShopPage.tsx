import { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import { isProductPurchasable } from '../utils/commerce.ts';

export function ShopPage({
  mode = 'all',
  categorySlug,
}: {
  mode?: 'all' | 'category' | 'new-arrivals' | 'sale';
  categorySlug?: string;
}) {
  const { products, categories, loadingStorefront, navigate, t } = useStore();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(categorySlug || 'all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc'>('newest');

  const activeCategorySlug = mode === 'category' && categorySlug ? categorySlug : selectedCategory;

  const filtered = useMemo(() => {
    let list = products.filter((p) => p.status === 'published');

    if (mode === 'sale') {
      list = list.filter((p) => p.originalPrice && p.originalPrice > p.sellingPrice);
    }

    if (activeCategorySlug !== 'all') {
      const cat = categories.find((c) => c.slug === activeCategorySlug || c.id === activeCategorySlug);
      if (cat) {
        list = list.filter((p) => p.categoryId === cat.id);
      }
    }

    if (selectedCondition !== 'all') {
      list = list.filter((p) => p.conditionGrade === selectedCondition);
    }

    if (selectedGender !== 'all') {
      list = list.filter((p) => p.gender === selectedGender);
    }

    if (onlyAvailable) {
      list = list.filter((p) => isProductPurchasable(p));
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.brandName.toLowerCase().includes(q) ||
          p.material.toLowerCase().includes(q) ||
          p.color.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'price_asc') return a.sellingPrice - b.sellingPrice;
      if (sortBy === 'price_desc') return b.sellingPrice - a.sellingPrice;
      return new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime();
    });
  }, [products, categories, mode, activeCategorySlug, selectedCondition, selectedGender, onlyAvailable, search, sortBy]);

  const pageTitle =
    mode === 'new-arrivals'
      ? t.shop.titleNew
      : mode === 'sale'
      ? t.shop.titleSale
      : mode === 'category' && categorySlug
      ? categories.find((c) => c.slug === categorySlug)?.name || t.shop.titleCategoryFallback
      : t.shop.titleAll;

  const resetFilters = () => {
    setSearch('');
    setSelectedCategory('all');
    setSelectedCondition('all');
    setSelectedGender('all');
    setOnlyAvailable(false);
    setSortBy('newest');
    if (mode === 'category') navigate('/shop');
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="border-b border-[#30302E]/12 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#30302E]/60 mb-1">
            {t.shop.kicker}
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#30302E]">{pageTitle}</h1>
        </div>
        <p className="text-xs text-[#30302E]/70 tabular-nums">
          {t.shop.showingCount(filtered.length)}
        </p>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-[#30302E]/12 p-4 sm:p-5 mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <label htmlFor="catalog-search" className="sr-only">
              {t.nav.searchAria}
            </label>
            <Search className="w-4 h-4 text-[#30302E]/45 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="catalog-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.shop.searchPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#FAF7F2] border border-[#30302E]/15 text-[#30302E] placeholder:text-[#30302E]/45"
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="filter-condition" className="sr-only">
              {t.shop.allConditions}
            </label>
            <select
              id="filter-condition"
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-[#FAF7F2] border border-[#30302E]/15 text-[#30302E]"
            >
              <option value="all">{t.shop.allConditions}</option>
              <option value="A">{t.product.grades.A.title}</option>
              <option value="B">{t.product.grades.B.title}</option>
              <option value="C">{t.product.grades.C.title}</option>
              <option value="D">{t.product.grades.D.title}</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="filter-gender" className="sr-only">
              {t.shop.allStyles}
            </label>
            <select
              id="filter-gender"
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-[#FAF7F2] border border-[#30302E]/15 text-[#30302E]"
            >
              <option value="all">{t.shop.allStyles}</option>
              <option value="Women">Women</option>
              <option value="Men">Men</option>
              <option value="Unisex">Unisex</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="sort-products" className="sr-only">
              {t.shop.sortNewest}
            </label>
            <select
              id="sort-products"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'price_asc' | 'price_desc')}
              className="w-full px-3 py-2.5 text-sm bg-[#FAF7F2] border border-[#30302E]/15 text-[#30302E]"
            >
              <option value="newest">{t.shop.sortNewest}</option>
              <option value="price_asc">{t.shop.sortPriceAsc}</option>
              <option value="price_desc">{t.shop.sortPriceDesc}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#30302E]/10">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter kategori">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('all');
                if (mode === 'category') navigate('/shop');
              }}
              className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeCategorySlug === 'all'
                  ? 'bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 font-semibold'
                  : 'bg-[#FAF7F2] text-[#30302E]/80 hover:bg-[#E9BBAA]/30'
              }`}
            >
              {t.shop.allFilter}
            </button>
            {categories.filter((c) => c.isActive).map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setSelectedCategory(cat.slug);
                  if (mode === 'category') navigate(`/category/${cat.slug}`);
                }}
                className={`px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  activeCategorySlug === cat.slug
                    ? 'bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 font-semibold'
                    : 'bg-[#FAF7F2] text-[#30302E]/80 hover:bg-[#E9BBAA]/30'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs text-[#30302E] cursor-pointer">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="accent-[#30302E]"
              />
              <span>{t.shop.onlyAvailable}</span>
            </label>

            {(search || activeCategorySlug !== 'all' || selectedCondition !== 'all' || selectedGender !== 'all' || onlyAvailable) && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-xs text-[#30302E]/75 hover:text-[#30302E]"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t.shop.reset}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {loadingStorefront && products.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-[#30302E]/10 h-96 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#30302E]/12 py-16 px-6 text-center">
          <SlidersHorizontal className="w-8 h-8 text-[#30302E]/35 mx-auto mb-3" />
          <h2 className="font-serif text-xl text-[#30302E] mb-2">{t.shop.emptyTitle}</h2>
          <p className="text-sm text-[#30302E]/70 max-w-md mx-auto mb-6">
            {t.shop.emptyBody}
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="px-5 py-2.5 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-sm font-semibold hover:bg-[#DFA691]"
          >
            {t.shop.emptyCta}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </main>
  );
}
