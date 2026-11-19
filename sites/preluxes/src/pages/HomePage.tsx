import { ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import { isProductPurchasable } from '../utils/commerce.ts';

export function HomePage() {
  const { cms, categories, products, navigate, seededInFirestore, lang, t } = useStore();

  const publishedProducts = products.filter((p) => p.status === 'published');
  const featured = publishedProducts.filter((p) => p.isFeatured && isProductPurchasable(p)).slice(0, 3);
  const displayProducts =
    featured.length >= 3
      ? featured
      : publishedProducts.slice(0, 6);

  const heroTitle = lang === 'id' ? cms.heroTitle || t.hero.defaultTitle : t.hero.defaultTitle;
  const heroSubtitle = lang === 'id' ? cms.heroSubtitle || t.hero.defaultSubtitle : t.hero.defaultSubtitle;
  const heroCtaLabel = lang === 'id' ? cms.heroCtaLabel || t.hero.defaultCta : t.hero.defaultCta;
  const featuredHeading = lang === 'id' ? cms.featuredHeading || t.hero.defaultFeatured : t.hero.defaultFeatured;
  const aboutTitle = lang === 'id' ? cms.aboutTitle || t.hero.defaultAboutTitle : t.hero.defaultAboutTitle;
  const aboutBody = lang === 'id' ? cms.aboutBody || t.hero.defaultAboutBody : t.hero.defaultAboutBody;

  return (
    <main>
      {/* Section 1: Editorial Hero Split */}
      <section className="border-b border-[#30302E]/12 bg-[#FAF7F2]">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 px-6 sm:px-10 lg:px-14 py-8 sm:py-12 lg:py-20 flex flex-col justify-center bg-[#FAF7F2]">
            <p className="text-xs uppercase tracking-[0.2em] text-[#30302E]/65 mb-3 sm:mb-4">
              {t.hero.kicker}
            </p>
            <h1 className="font-serif text-3xl sm:text-5xl text-[#30302E] leading-[1.15] text-balance mb-4 sm:mb-5">
              {heroTitle}
            </h1>
            <p className="text-sm sm:text-base text-[#30302E]/80 leading-relaxed max-w-xl mb-6 sm:mb-8">
              {heroSubtitle}
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={() => navigate('/shop')}
                className="px-6 py-3 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-sm font-semibold inline-flex items-center gap-2 hover:bg-[#DFA691] transition-colors whitespace-nowrap shrink-0"
              >
                <span>{heroCtaLabel}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/about')}
                className="px-5 py-3 border border-[#30302E]/25 text-sm font-medium text-[#30302E] hover:bg-[#E9BBAA]/25 transition-colors whitespace-nowrap shrink-0"
              >
                {t.hero.curationCta}
              </button>
            </div>

            {!seededInFirestore && (
              <p className="mt-6 text-xs text-[#30302E]/65 border-t border-[#30302E]/10 pt-4">
                {t.hero.demoNote}
              </p>
            )}
          </div>

          <div className="lg:col-span-6 relative min-h-[320px] lg:min-h-[540px] bg-[#E9BBAA]/35">
            <img
              src={cms.heroImageUrl}
              alt="Kurasi Preluxes — Blazer, syal sutra, dan tas kulit secondhand"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover lg:absolute lg:inset-0"
            />
          </div>
        </div>
      </section>

      {/* Section 2: 4 Core Categories + Featured Curated Collection */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#30302E]/60 mb-1.5">
              {t.hero.categoryKicker}
            </p>
            <h2 className="font-serif text-2xl sm:text-3xl text-[#30302E]">
              {featuredHeading}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/shop')}
            className="text-sm font-medium text-[#30302E] underline underline-offset-4 decoration-[#E9BBAA] decoration-2 hover:text-[#30302E]/75 self-start sm:self-auto whitespace-nowrap"
          >
            {t.hero.viewAll}
          </button>
        </div>

        {/* Category Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {categories.filter((c) => c.isActive).map((cat) => (
            <a
              key={cat.id}
              href={`/category/${cat.slug}`}
              onClick={(e) => {
                e.preventDefault();
                navigate(`/category/${cat.slug}`);
              }}
              className="group relative overflow-hidden border border-[#30302E]/12 bg-white flex items-center gap-4 p-3 hover:border-[#E9BBAA] hover:bg-[#E9BBAA]/15 transition-colors"
            >
              <img
                src={cat.imageUrl || '/src/assets/images/item_linen_blazer_1794946984670.jpg'}
                alt={cat.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 object-cover bg-[#F4EFE8] shrink-0"
              />
              <div className="min-w-0">
                <h3 className="font-serif text-base text-[#30302E] group-hover:underline underline-offset-4">
                  {cat.name}
                </h3>
                <p className="text-xs text-[#30302E]/65 truncate">
                  {t.hero.itemsCount(products.filter((p) => p.status === 'published' && p.categoryId === cat.id).length)}
                </p>
              </div>
            </a>
          ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {displayProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Section 3: Brand Story & Conscious Selection */}
      <section className="border-t border-b border-[#30302E]/12 bg-[#E9BBAA]/35">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[#30302E]/70 mb-2">
              {t.hero.storyKicker}
            </p>
            <h2 className="font-serif text-3xl text-[#30302E] leading-snug mb-4 text-balance">
              {aboutTitle}
            </h2>
            <p className="text-sm text-[#30302E]/85 leading-relaxed mb-6">
              {aboutBody}
            </p>
            <p className="font-serif italic text-sm text-[#30302E]/90">
              {t.hero.quote}
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {t.hero.pillars.map((pillar) => (
              <div key={pillar.code} className="bg-[#FAF7F2] border border-[#30302E]/12 p-6">
                <p className="font-mono text-xs text-[#30302E]/65 mb-2">{pillar.code}</p>
                <h3 className="font-serif text-lg text-[#30302E] mb-2">{pillar.title}</h3>
                <p className="text-xs text-[#30302E]/75 leading-relaxed">{pillar.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
