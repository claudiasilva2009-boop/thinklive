import { Bell, ChevronDown, Compass, Headphones, Search, User as UserIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { TopCategory, UserPublic } from '../types/thinklive';
import { useAmbientSound } from './AmbientSoundContext';
import { ThinkliveBrandMark } from './CreativeStickers';
import { UserAvatar } from './ImageWithFallback';

export const PRIMARY_CATEGORIES: TopCategory[] = [
  'Início',
  'Poemas',
  'Notícias',
  'Filmes & Séries',
  'Artigos',
  'Livros',
];

export const MORE_CATEGORIES: TopCategory[] = [
  'Fotografia',
  'Arte e cultura',
  'Podcasts',
  'Diários',
];

interface TopBarProps {
  activeCategory: TopCategory;
  onSelectCategory: (cat: TopCategory) => void;
  onOpenSearch: () => void;
  onOpenExplore: () => void;
  onOpenActivity: () => void;
  unreadNotifications: number;
  onOpenAuth: () => void;
  onOpenOwnProfile: () => void;
  currentUser: UserPublic | null;
  isExploreActive: boolean;
  isActivityActive?: boolean;
  transparentHome?: boolean;
}

export function TopBar({
  activeCategory,
  onSelectCategory,
  onOpenSearch,
  onOpenExplore,
  onOpenActivity,
  unreadNotifications,
  onOpenAuth,
  onOpenOwnProfile,
  currentUser,
  isExploreActive,
  isActivityActive = false,
  transparentHome = false,
}: TopBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { globalPlaying, panelOpen, togglePanelOpen } = useAmbientSound();

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, []);

  const isMoreCategoryActive = MORE_CATEGORIES.includes(activeCategory);
  const useMinimalGlass = transparentHome && !scrolled;

  return (
    <header
      className={`w-full sticky top-0 z-40 transition-colors duration-300 ${
        useMinimalGlass
          ? 'bg-tl-creme/72 backdrop-blur-md border-b border-tl-marrom/10'
          : 'bg-tl-creme/92 backdrop-blur-md border-b border-tl-marrom/14'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-14 md:h-16 flex items-center justify-between gap-3 md:gap-6">
        {/* Zone 1: Literary Wordmark */}
        <button
          type="button"
          onClick={() => onSelectCategory('Início')}
          className="autumn-glow-link whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tl-laranja rounded-md px-1 active:scale-[0.98]"
        >
          <ThinkliveBrandMark />
        </button>

        {/* Zone 2: Editorial Single-Line Category Links (desktop) */}
        <nav aria-label="Categorias principais" className="hidden lg:flex items-center gap-5 min-w-0 py-1">
          <div className="flex items-center gap-5 overflow-x-auto no-scrollbar min-w-0">
            {PRIMARY_CATEGORIES.map((cat) => {
              const active = !isExploreActive && !isActivityActive && activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onSelectCategory(cat)}
                  className={`autumn-glow-link relative py-2 text-[13px] whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'text-tl-marrom font-semibold'
                      : 'text-tl-marrom-suave hover:text-tl-terracota font-medium'
                  }`}
                >
                  {cat}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0.5 left-0 right-0 h-[2px] bg-tl-laranja rounded-full"
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              className={`autumn-glow-link relative flex items-center gap-1 py-2 text-[13px] whitespace-nowrap shrink-0 cursor-pointer ${
                isMoreCategoryActive && !isExploreActive && !isActivityActive
                  ? 'text-tl-marrom font-semibold'
                  : 'text-tl-marrom-suave hover:text-tl-terracota font-medium'
              }`}
            >
              <span>{isMoreCategoryActive && !isExploreActive ? activeCategory : 'Mais'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`}
                strokeWidth={1.8}
              />
              {isMoreCategoryActive && !isExploreActive && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0.5 left-0 right-0 h-[2px] bg-tl-laranja rounded-full"
                />
              )}
            </button>

            {moreOpen && (
              <div
                role="menu"
                aria-label="Mais categorias"
                className="absolute left-0 top-full mt-2 w-56 bg-tl-creme border border-tl-marrom/18 editorial-shadow rounded-2xl p-1.5 z-50 max-h-[70vh] overflow-y-auto"
              >
                {MORE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelectCategory(cat);
                      setMoreOpen(false);
                    }}
                    className={`autumn-glow-surface w-full text-left px-3.5 py-2 rounded-xl text-[13px] cursor-pointer ${
                      activeCategory === cat
                        ? 'bg-tl-bege text-tl-terracota font-semibold'
                        : 'text-tl-marrom hover:bg-tl-bege/65 hover:text-tl-terracota'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenExplore}
            className={`autumn-glow-link relative inline-flex items-center gap-1.5 py-2 text-[13px] whitespace-nowrap shrink-0 cursor-pointer ${
              isExploreActive
                ? 'text-tl-marrom font-semibold'
                : 'text-tl-marrom-suave hover:text-tl-terracota font-medium'
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-tl-laranja" strokeWidth={1.8} />
            <span>Explorar</span>
            {isExploreActive && (
              <span
                aria-hidden="true"
                className="absolute bottom-0.5 left-0 right-0 h-[2px] bg-tl-laranja rounded-full"
              />
            )}
          </button>
        </nav>

        {/* Zone 3: Ambient Sound, Search, Notifications & Account */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={togglePanelOpen}
            aria-expanded={panelOpen}
            aria-label="Som ambiente"
            title="Som ambiente do site"
            className={`autumn-glow-surface min-h-[40px] px-2.5 sm:px-3.5 flex items-center justify-center gap-1.5 rounded-full border text-xs font-medium active:scale-95 cursor-pointer transition-colors ${
              globalPlaying
                ? 'bg-tl-marrom text-tl-creme border-tl-terracota/30'
                : panelOpen
                ? 'bg-tl-areia/65 text-tl-terracota border-tl-laranja'
                : 'bg-tl-bege/70 border-tl-marrom/15 text-tl-marrom hover:bg-tl-areia/65 hover:text-tl-terracota'
            }`}
          >
            <Headphones className={`w-4 h-4 ${globalPlaying ? 'text-tl-laranja' : ''}`} strokeWidth={1.8} />
            <span className="hidden sm:inline whitespace-nowrap">
              {globalPlaying ? 'Som ativo' : 'Som ambiente'}
            </span>
          </button>

          <button
            type="button"
            onClick={onOpenSearch}
            aria-label="Pesquisa global"
            title="Pesquisa global"
            className="autumn-glow-surface min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-tl-bege/70 border border-tl-marrom/15 text-tl-marrom hover:bg-tl-areia/65 hover:text-tl-terracota active:scale-95 cursor-pointer"
          >
            <Search className="w-[17px] h-[17px]" strokeWidth={1.8} />
          </button>

          <button
            type="button"
            onClick={onOpenActivity}
            aria-label="Atividade e notificações"
            title="Atividade e notificações"
            className={`autumn-glow-surface relative min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full border active:scale-95 cursor-pointer ${
              isActivityActive
                ? 'bg-tl-areia/75 border-tl-laranja text-tl-terracota'
                : 'bg-tl-bege/70 border-tl-marrom/15 text-tl-marrom hover:bg-tl-areia/65 hover:text-tl-terracota'
            }`}
          >
            <Bell className="w-[17px] h-[17px]" strokeWidth={1.8} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 rounded-full bg-tl-terracota text-tl-creme text-[10px] font-semibold tabular-nums flex items-center justify-center">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>

          {currentUser ? (
            <button
              type="button"
              onClick={onOpenOwnProfile}
              className="autumn-glow-surface flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-tl-bege/70 border border-tl-marrom/15 hover:bg-tl-areia/60 active:scale-[0.98] cursor-pointer"
              title={`Perfil de ${currentUser.displayName}`}
            >
              <UserAvatar src={currentUser.avatarUrl} name={currentUser.displayName} size="sm" />
              <span className="hidden sm:inline text-xs font-medium text-tl-marrom max-w-[110px] truncate">
                {currentUser.displayName}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenAuth}
              className="autumn-glow-btn flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-tl-laranja text-tl-creme border border-tl-terracota/20 rounded-full hover:bg-tl-terracota active:scale-95 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5" strokeWidth={1.8} />
              <span>Entrar</span>
            </button>
          )}
        </div>
      </div>

      {/* Horizontal scrollable editorial categories strip for mobile & tablet (< lg) */}
      <div className="lg:hidden border-t border-tl-marrom/10 bg-tl-bege/75">
        <div className="flex items-center gap-4 px-4 h-10 overflow-x-auto no-scrollbar">
          {[...PRIMARY_CATEGORIES, ...MORE_CATEGORIES].map((cat) => {
            const active = !isExploreActive && !isActivityActive && activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectCategory(cat)}
                className={`autumn-glow-link relative py-1.5 text-xs whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'text-tl-marrom font-semibold'
                    : 'text-tl-marrom-suave hover:text-tl-terracota'
                }`}
              >
                {cat}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-tl-laranja rounded-full"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
