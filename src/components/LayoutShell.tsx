import React, { useState } from 'react';
import {
  LayoutDashboard,
  Wallet,
  FileText,
  Clapperboard,
  Video,
  HelpCircle,
  Settings,
  Briefcase,
  Sparkles,
  BookOpen,
  Compass,
  CalendarDays,
  ScanEye,
  BarChart3,
  Menu,
  X,
  LogOut,
  FolderCheck,
  Globe,
} from 'lucide-react';
import type { ActiveRoute, ClientRecord, Language, UserAccount } from '../types/studio';
import { TRANSLATIONS } from '../i18n/translations';

interface LayoutShellProps {
  activeRoute: ActiveRoute;
  onSelectRoute: (route: ActiveRoute) => void;
  language: Language;
  onChangeLanguage: (lang: Language) => void;
  activeUser: UserAccount;
  users: UserAccount[];
  onSwitchUser: (userId: string) => void;
  activeClientId: string;
  clients: ClientRecord[];
  onSwitchClient: (clientId: string) => void;
  driveConnected: boolean;
  driveUserEmail?: string | null;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
  children: React.ReactNode;
}

export const LayoutShell: React.FC<LayoutShellProps> = ({
  activeRoute,
  onSelectRoute,
  language,
  onChangeLanguage,
  activeUser,
  users,
  onSwitchUser,
  activeClientId,
  clients,
  onSwitchClient,
  driveConnected,
  driveUserEmail,
  onGoogleSignIn,
  onGoogleSignOut,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = TRANSLATIONS[language];

  const visibleClients =
    activeUser.role === 'ADMIN' || activeUser.assignedClientIds.length === 0
      ? clients
      : clients.filter((c) => activeUser.assignedClientIds.includes(c.id));

  const coreNav: Array<{ id: ActiveRoute; label: string; icon: React.ReactNode }> = [
    { id: 'workshop', label: t.nav.workshop, icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'dompet', label: t.nav.dompet, icon: <Wallet className="h-4 w-4" /> },
    { id: 'brief', label: t.nav.brief, icon: <FileText className="h-4 w-4" /> },
    { id: 'studio', label: t.nav.studio, icon: <Clapperboard className="h-4 w-4" /> },
    { id: 'video', label: t.nav.video, icon: <Video className="h-4 w-4" /> },
    { id: 'bantuan', label: t.nav.bantuan, icon: <HelpCircle className="h-4 w-4" /> },
    { id: 'admin', label: t.nav.admin, icon: <Settings className="h-4 w-4" /> },
  ];

  const brandNav: Array<{ id: ActiveRoute; label: string; icon: React.ReactNode }> = [
    { id: 'brand-workspace', label: t.nav.brandWorkspace, icon: <Briefcase className="h-4 w-4" /> },
    { id: 'brand-intelligence', label: t.nav.brandIntelligence, icon: <Sparkles className="h-4 w-4" /> },
    { id: 'brand-guidelines', label: t.nav.brandGuidelines, icon: <BookOpen className="h-4 w-4" /> },
    { id: 'creative-direction', label: t.nav.creativeDirection, icon: <Compass className="h-4 w-4" /> },
    { id: 'social-studio', label: t.nav.socialStudio, icon: <CalendarDays className="h-4 w-4" /> },
    { id: 'visual-checker', label: t.nav.visualChecker, icon: <ScanEye className="h-4 w-4" /> },
    { id: 'brand-reports', label: t.nav.brandReports, icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'website', label: t.nav.website, icon: <Globe className="h-4 w-4" /> },
  ];

  const allNavItems = [...coreNav, ...brandNav];
  const currentLabel = allNavItems.find((item) => item.id === activeRoute)?.label ?? t.nav.workshop;

  const handleNavClick = (id: ActiveRoute) => {
    onSelectRoute(id);
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white border-r border-[#DDE3F2]">
      {/* Authentic DST Logo Lockup */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#DDE3F2]">
        <div className="flex items-center gap-3">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#05349B] text-white font-extrabold text-sm tracking-tight">
            DST
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 h-3 w-3 rounded-sm bg-[#FDCB02] border-2 border-white"
            />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight text-[#0F1B3D] whitespace-nowrap">
              {t.appTitle}
            </div>
            <div className="text-[11px] font-medium text-slate-500 whitespace-nowrap">
              {t.appSubtitle}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Close navigation"
          className="lg:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation Sections */}
      <nav aria-label="Primary Sidebar" className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <div className="px-3 mb-2 text-[11px] font-bold tracking-wider text-slate-400">
            {t.coreSection}
          </div>
          <ul className="space-y-1">
            {coreNav.map((item) => {
              const active = activeRoute === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors text-left ${
                      active
                        ? 'bg-[#05349B] text-white'
                        : 'text-[#0F1B3D] hover:bg-[#F4F6FC]'
                    }`}
                  >
                    <span className={active ? 'text-[#FDCB02]' : 'text-slate-500'}>{item.icon}</span>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="pt-2 border-t border-[#DDE3F2]">
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[11px] font-bold tracking-wider text-[#05349B]">
              {t.brandSection}
            </span>
          </div>
          <ul className="space-y-1">
            {brandNav.map((item) => {
              const active = activeRoute === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors text-left ${
                      active
                        ? 'bg-[#05349B] text-white'
                        : 'text-[#0F1B3D] hover:bg-[#F4F6FC]'
                    }`}
                  >
                    <span className={active ? 'text-[#FDCB02]' : 'text-[#05349B]'}>{item.icon}</span>
                    <span className="whitespace-nowrap">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      {/* Active User Footer */}
      <div className="border-t border-[#DDE3F2] p-3 bg-[#F4F6FC]/60">
        <div className="flex items-center gap-2.5">
          <img
            src={activeUser.avatarUrl}
            alt={activeUser.name}
            referrerPolicy="no-referrer"
            className="h-9 w-9 rounded-lg object-cover border border-[#DDE3F2] shrink-0"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-bold text-[#0F1B3D]">{activeUser.name}</div>
            <div className="truncate text-[11px] text-slate-500">{activeUser.role}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F4F6FC] text-[#0F1B3D]">
      {/* Sticky 240px Desktop Sidebar */}
      <aside className="hidden lg:block w-[240px] shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#0F1B3D]/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-[240px] h-full z-10">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="lg:sticky lg:top-0 z-30 bg-white border-b border-[#DDE3F2] px-4 lg:px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Zone 1: Menu toggle + Breadcrumb */}
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(true)}
                aria-label="Open navigation menu"
                className="lg:hidden rounded-lg border border-[#DDE3F2] p-2 text-[#0F1B3D] hover:bg-[#F4F6FC]"
              >
                <Menu className="h-4 w-4" />
              </button>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 whitespace-nowrap">
                  Studio DST V11 / <span className="font-semibold text-[#05349B]">{currentLabel}</span>
                </div>
              </div>
            </div>

            {/* Zone 2 & 3: Client Isolation Context, Language Toggle, Role Switch, Google Drive Auth */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                <label htmlFor="header-client-select" className="sr-only">
                  {t.header.activeClient}
                </label>
                <select
                  id="header-client-select"
                  value={activeClientId}
                  onChange={(e) => onSwitchClient(e.target.value)}
                  className="rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] px-2.5 py-1.5 text-xs font-semibold text-[#0F1B3D] max-w-[200px]"
                >
                  {visibleClients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.code} · {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-[#DDE3F2] bg-[#F4F6FC] p-0.5">
                <button
                  type="button"
                  onClick={() => onChangeLanguage('id')}
                  className={`px-2 py-1 text-xs font-bold rounded-md whitespace-nowrap ${
                    language === 'id' ? 'bg-[#05349B] text-white' : 'text-slate-600 hover:text-[#0F1B3D]'
                  }`}
                >
                  ID
                </button>
                <button
                  type="button"
                  onClick={() => onChangeLanguage('en')}
                  className={`px-2 py-1 text-xs font-bold rounded-md whitespace-nowrap ${
                    language === 'en' ? 'bg-[#05349B] text-white' : 'text-slate-600 hover:text-[#0F1B3D]'
                  }`}
                >
                  EN
                </button>
              </div>

              <div>
                <label htmlFor="header-role-select" className="sr-only">
                  {t.header.roleLabel}
                </label>
                <select
                  id="header-role-select"
                  value={activeUser.id}
                  onChange={(e) => onSwitchUser(e.target.value)}
                  className="rounded-lg border border-[#DDE3F2] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#0F1B3D]"
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.role} · {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {driveConnected ? (
                <div className="flex items-center gap-2">
                  <span className="hidden xl:inline text-xs font-medium text-emerald-700">
                    <FolderCheck className="inline h-3.5 w-3.5 mr-1" />
                    {driveUserEmail || t.header.driveConnected}
                  </span>
                  <button
                    type="button"
                    onClick={onGoogleSignOut}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE3F2] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F1B3D] hover:bg-slate-50 whitespace-nowrap"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {t.header.driveDisconnect}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onGoogleSignIn}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#DDE3F2] bg-white px-3 py-1.5 text-xs font-semibold text-[#0F1B3D] hover:bg-[#F4F6FC] whitespace-nowrap shrink-0"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                  </svg>
                  {t.header.driveSignIn}
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};
