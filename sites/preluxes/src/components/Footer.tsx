import { useStore } from '../context/StoreContext.tsx';
import { PreluxesWordmark } from './PreluxesWordmark.tsx';

export function Footer() {
  const { navigate, settings, isAdmin, t } = useStore();

  const linkClass =
    'text-sm text-[#30302E]/75 hover:text-[#30302E] hover:underline underline-offset-4 transition-colors block py-0.5';

  return (
    <footer className="bg-[#FAF7F2] border-t border-[#30302E]/15 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
        <div className="space-y-3">
          <div className="text-[26px] text-[#30302E]">
            <PreluxesWordmark />
          </div>
          <p className="font-serif italic text-sm text-[#30302E]/80">
            {settings.tagline}
          </p>
          <p className="text-xs text-[#30302E]/65 leading-relaxed">
            {t.footer.description}
          </p>
        </div>

        <div>
          <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-[#30302E] mb-3">
            {t.footer.colServices}
          </h3>
          <a href="/shop" onClick={(e) => { e.preventDefault(); navigate('/shop'); }} className={linkClass}>
            {t.footer.allCollections}
          </a>
          <a href="/new-arrivals" onClick={(e) => { e.preventDefault(); navigate('/new-arrivals'); }} className={linkClass}>
            {t.footer.newArrivals}
          </a>
          <a href="/sale" onClick={(e) => { e.preventDefault(); navigate('/sale'); }} className={linkClass}>
            {t.footer.salePicks}
          </a>
          <a href="/faq" onClick={(e) => { e.preventDefault(); navigate('/faq'); }} className={linkClass}>
            {t.footer.faqAndGrades}
          </a>
        </div>

        <div>
          <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-[#30302E] mb-3">
            {t.footer.colAbout}
          </h3>
          <a href="/about" onClick={(e) => { e.preventDefault(); navigate('/about'); }} className={linkClass}>
            {t.footer.aboutUs}
          </a>
          <a href="/contact" onClick={(e) => { e.preventDefault(); navigate('/contact'); }} className={linkClass}>
            {t.footer.contactUs}
          </a>
          <a href="/policies/shipping" onClick={(e) => { e.preventDefault(); navigate('/policies/shipping'); }} className={linkClass}>
            {t.footer.shippingPackaging}
          </a>
          <a href="/policies/returns" onClick={(e) => { e.preventDefault(); navigate('/policies/returns'); }} className={linkClass}>
            {t.footer.returnsPolicy}
          </a>
          <a href="/policies/privacy" onClick={(e) => { e.preventDefault(); navigate('/policies/privacy'); }} className={linkClass}>
            {t.footer.privacyTerms}
          </a>
        </div>

        <div>
          <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-[#30302E] mb-3">
            {t.footer.colStoreInfo}
          </h3>
          <p className="text-xs text-[#30302E]/75 mb-1">Email: {settings.contactEmail}</p>
          <p className="text-xs text-[#30302E]/75 mb-1">WhatsApp: {settings.contactWhatsapp}</p>
          <p className="text-xs text-[#30302E]/75 mb-3">
            {t.footer.timezoneLabel}: {settings.timezone} (IDR)
          </p>
          <div className="space-y-1.5">
            <a
              href="/brand-kit"
              onClick={(e) => {
                e.preventDefault();
                navigate('/brand-kit');
              }}
              className="block text-xs font-medium text-[#30302E] underline underline-offset-4"
            >
              {t.footer.brandKit}
            </a>
            <a
              href={isAdmin ? '/admin/dashboard' : '/admin/login'}
              onClick={(e) => {
                e.preventDefault();
                navigate(isAdmin ? '/admin/dashboard' : '/admin/login');
              }}
              className="block text-xs font-medium text-[#30302E]/80 underline underline-offset-4"
            >
              {t.footer.adminPortal}
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-[#30302E]/15 bg-[#E9BBAA]/45">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#30302E]/80">
          <span>© {new Date().getFullYear()} preluxes. {t.footer.copyright}</span>
          <span>{t.footer.currencyNote}</span>
        </div>
      </div>
    </footer>
  );
}
