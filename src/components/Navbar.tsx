import { useState } from 'react';
import { Globe, Menu, Plus, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { WORLD_LANGUAGES } from '../lib/i18n';

export type AppTab = 'explore' | 'converter' | 'messages' | 'activity' | 'account';

interface NavbarProps {
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  unreadMessagesCount: number;
  onOpenCreateListing: () => void;
}

export function Navbar({
  activeTab,
  onSelectTab,
  unreadMessagesCount,
  onOpenCreateListing,
}: NavbarProps) {
  const { user } = useAuth();
  const { languageCode, setLanguageCode, t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: AppTab; label: string }[] = [
    { id: 'explore', label: t.navExplore },
    { id: 'converter', label: t.navConverter },
    {
      id: 'messages',
      label:
        unreadMessagesCount > 0
          ? `${t.navMessages} (${unreadMessagesCount})`
          : t.navMessages,
    },
    { id: 'activity', label: t.navActivity },
    { id: 'account', label: user ? t.navAccount : t.navSignIn },
  ];

  const handleNavClick = (tab: AppTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#F7F7F5]/95 backdrop-blur-sm border-b border-[#E4E4E0]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => handleNavClick('explore')}
          className="font-display text-xl font-semibold tracking-tight text-[#141413] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F5132]"
        >
          Dilservice
        </button>

        {/* Zone 2: 5 concise single-line nav links */}
        <nav
          aria-label="Navigation principale"
          className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-[#575752]"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0F5132] ${
                  isActive
                    ? 'text-[#141413] font-semibold'
                    : 'text-[#575752] hover:text-[#141413]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-[21px] h-[2px] bg-[#0F5132]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: World language selector + 1 primary action + mobile menu trigger */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#E4E4E0] bg-white text-xs text-[#141413]">
            <Globe className="w-3.5 h-3.5 text-[#0F5132] shrink-0" />
            <select
              aria-label="Langue de l'interface"
              value={languageCode}
              onChange={(e) => setLanguageCode(e.target.value)}
              className="bg-transparent text-xs font-medium text-[#141413] focus:outline-none cursor-pointer max-w-[96px]"
            >
              {WORLD_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.nativeName}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onOpenCreateListing}
            className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#0F5132] rounded-lg hover:bg-[#0B3D26] transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[40px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0F5132]"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden sm:inline">{t.navCreateListing}</span>
            <span className="sm:hidden">Vendre</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#E4E4E0] bg-white text-[#141413] cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <nav
          aria-label="Menu mobile"
          className="md:hidden border-t border-[#E4E4E0] bg-white px-4 py-3 flex flex-col gap-1"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#0F5132]/10 text-[#0F5132] font-semibold'
                    : 'text-[#575752] hover:bg-[#F7F7F5]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
}
