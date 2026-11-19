import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { LANGUAGE_OPTIONS } from '../i18n/translations.ts';
import { PreluxesWordmark } from './PreluxesWordmark.tsx';

export function Navbar() {
  const { currentPath, navigate, cart, setCartOpen, firebaseUser, isAdmin, cms, lang, setLang, t } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langMenuRef = useRef<HTMLDivElement>(null);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const navItems = [
    { label: t.nav.collection, path: '/shop' },
    { label: t.nav.newArrivals, path: '/new-arrivals' },
    { label: t.nav.sale, path: '/sale' },
    { label: t.nav.about, path: '/about' },
  ];

  const handleNav = (path: string) => {
    setMobileMenuOpen(false);
    setLangMenuOpen(false);
    navigate(path);
  };

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setLangMenuOpen(false);
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const currentLangOption = LANGUAGE_OPTIONS.find((opt) => opt.code === lang) || LANGUAGE_OPTIONS[0];

  return (
    <header className="sticky top-0 z-40 bg-[#FAF7F2]/95 backdrop-blur-sm border-b border-[#30302E]/12">
      {cms.announcementEnabled && cms.announcementText && (
        <div className="bg-[#E9BBAA] text-[#30302E] px-4 py-1.5 text-center text-[11px] sm:text-xs leading-snug tracking-wide border-b border-[#30302E]/15 font-medium">
          <p className="max-w-5xl mx-auto">{cms.announcementText}</p>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-2 sm:gap-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            handleNav('/');
          }}
          className="text-[22px] sm:text-[26px] text-[#30302E] whitespace-nowrap shrink-0"
        >
          <PreluxesWordmark />
        </a>

        {/* Zone 2: Concise Single-Line Navigation Links */}
        <nav aria-label="Navigasi Utama" className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium text-[#30302E]/80">
          {navItems.map((item) => {
            const active = currentPath === item.path;
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  handleNav(item.path);
                }}
                className={`whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#30302E] ${
                  active ? 'text-[#30302E] underline underline-offset-8 decoration-[#E9BBAA] decoration-2' : ''
                }`}
              >
                {item.label}
              </a>
            );
          })}
          {isAdmin && (
            <a
              href="/admin/dashboard"
              onClick={(e) => {
                e.preventDefault();
                handleNav('/admin/dashboard');
              }}
              className={`whitespace-nowrap shrink-0 py-1 transition-colors hover:text-[#30302E] ${
                currentPath.startsWith('/admin')
                  ? 'text-[#30302E] underline underline-offset-8 decoration-[#E9BBAA] decoration-2'
                  : 'text-[#30302E]/80'
              }`}
            >
              {t.nav.admin}
            </a>
          )}
        </nav>

        {/* Zone 3: Primary Action Cluster + Top-Right Language Switcher Icon */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleNav('/shop')}
            aria-label={t.nav.searchAria}
            className="hidden sm:flex w-10 h-10 items-center justify-center text-[#30302E]/80 hover:text-[#30302E] hover:bg-[#E9BBAA]/25 transition-colors"
          >
            <Search className="w-[18px] h-[18px]" strokeWidth={1.6} />
          </button>

          <button
            type="button"
            onClick={() => handleNav(firebaseUser ? '/account' : '/login')}
            aria-label={firebaseUser ? t.nav.account : t.nav.signIn}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#30302E] hover:bg-[#E9BBAA]/25 transition-colors whitespace-nowrap shrink-0"
          >
            <User className="w-4 h-4" strokeWidth={1.6} />
            <span>{firebaseUser ? t.nav.account : t.nav.signIn}</span>
          </button>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={t.nav.openCartAria(cartCount)}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 bg-[#E9BBAA] text-[#30302E] border border-[#30302E]/25 text-xs font-semibold hover:bg-[#DFA691] transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.7} />
            <span className="tabular-nums">
              {t.nav.cart} ({cartCount})
            </span>
          </button>

          {/* Top-right Change Language Icon & 4-Mode Dropdown */}
          <div className="relative" ref={langMenuRef}>
            <button
              type="button"
              onClick={() => setLangMenuOpen((v) => !v)}
              aria-label={t.nav.changeLangAria}
              aria-expanded={langMenuOpen}
              aria-haspopup="menu"
              data-testid="language-switcher-button"
              className="inline-flex items-center gap-1 h-9 sm:h-10 px-2 sm:px-2.5 border border-[#30302E]/20 bg-[#FAF7F2] text-[#30302E] text-xs font-medium hover:bg-[#E9BBAA]/30 transition-colors whitespace-nowrap shrink-0"
            >
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" strokeWidth={1.6} />
              <span className="font-mono uppercase">{currentLangOption.shortLabel}</span>
              <ChevronDown className="w-3 h-3 opacity-70" />
            </button>

            {langMenuOpen && (
              <div
                role="menu"
                aria-label={t.nav.changeLangAria}
                className="absolute right-0 mt-2 w-44 bg-white border border-[#30302E]/20 shadow-lg py-1 z-50"
              >
                {LANGUAGE_OPTIONS.map((opt) => {
                  const selected = lang === opt.code;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      data-testid={`lang-option-${opt.code}`}
                      onClick={() => {
                        setLang(opt.code);
                        setLangMenuOpen(false);
                      }}
                      className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between gap-2 transition-colors ${
                        selected
                          ? 'bg-[#E9BBAA]/45 text-[#30302E] font-semibold'
                          : 'text-[#30302E]/85 hover:bg-[#FAF7F2]'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#30302E]/70">
                        {opt.shortLabel}
                        {selected && <Check className="w-3.5 h-3.5 text-[#30302E]" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden w-9 h-9 flex items-center justify-center text-[#30302E]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#30302E]/10 bg-[#FAF7F2] px-4 py-4 space-y-2">
          <button
            type="button"
            onClick={() => handleNav('/shop')}
            className="flex items-center gap-2 w-full text-left px-3 py-2.5 text-sm font-medium text-[#30302E] hover:bg-[#E9BBAA]/30"
          >
            <Search className="w-4 h-4" />
            <span>{t.nav.searchAria}</span>
          </button>
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => handleNav(item.path)}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#30302E] hover:bg-[#E9BBAA]/30"
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleNav(firebaseUser ? '/account' : '/login')}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#30302E] hover:bg-[#E9BBAA]/30"
          >
            {firebaseUser ? t.nav.accountOrders : t.nav.signInOrUp}
          </button>
          {isAdmin && (
            <button
              type="button"
              onClick={() => handleNav('/admin/dashboard')}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#30302E] bg-[#E9BBAA]/40"
            >
              {t.nav.adminDashboard}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
