import { Bookmark, Compass, Home, Plus, User } from 'lucide-react';

export type MainTab = 'inicio' | 'explorar' | 'publicar' | 'favoritos' | 'perfil';

interface BottomNavProps {
  activeTab: MainTab;
  onSelectTab: (tab: MainTab) => void;
}

export function BottomNav({ activeTab, onSelectTab }: BottomNavProps) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-40 bg-tl-creme/92 backdrop-blur-md border-t border-tl-marrom/14 shadow-[0_-6px_24px_rgba(var(--tl-shadow-rgb),0.08)]"
    >
      <div className="max-w-2xl mx-auto grid grid-cols-5 items-center h-14 md:h-16 px-2">
        {/* 1. Início */}
        <button
          type="button"
          onClick={() => onSelectTab('inicio')}
          className={`autumn-glow-link min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl active:scale-95 cursor-pointer ${
            activeTab === 'inicio'
              ? 'text-tl-terracota'
              : 'text-tl-marrom-suave hover:text-tl-marrom'
          }`}
        >
          <Home className="w-[19px] h-[19px]" strokeWidth={activeTab === 'inicio' ? 2.2 : 1.6} />
          <span className={`text-[10px] tracking-wide whitespace-nowrap ${activeTab === 'inicio' ? 'font-semibold' : 'font-medium'}`}>
            Início
          </span>
        </button>

        {/* 2. Explorar */}
        <button
          type="button"
          onClick={() => onSelectTab('explorar')}
          className={`autumn-glow-link min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl active:scale-95 cursor-pointer ${
            activeTab === 'explorar'
              ? 'text-tl-terracota'
              : 'text-tl-marrom-suave hover:text-tl-marrom'
          }`}
        >
          <Compass className="w-[19px] h-[19px]" strokeWidth={activeTab === 'explorar' ? 2.2 : 1.6} />
          <span className={`text-[10px] tracking-wide whitespace-nowrap ${activeTab === 'explorar' ? 'font-semibold' : 'font-medium'}`}>
            Explorar
          </span>
        </button>

        {/* 3. Criar publicação (+) */}
        <div className="flex flex-col items-center justify-center">
          <button
            type="button"
            onClick={() => onSelectTab('publicar')}
            aria-label="Criar publicação"
            title="Criar publicação"
            className="autumn-glow-btn group relative w-11 h-11 md:w-12 md:h-12 rounded-full bg-tl-laranja text-tl-creme hover:bg-tl-terracota hover:-translate-y-0.5 border-4 border-tl-bege hover:border-tl-areia shadow-md flex items-center justify-center active:scale-90 cursor-pointer"
          >
            <Plus
              className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90"
              strokeWidth={2.3}
            />
          </button>
        </div>

        {/* 4. Favoritos */}
        <button
          type="button"
          onClick={() => onSelectTab('favoritos')}
          className={`autumn-glow-link min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl active:scale-95 cursor-pointer ${
            activeTab === 'favoritos'
              ? 'text-tl-terracota'
              : 'text-tl-marrom-suave hover:text-tl-marrom'
          }`}
        >
          <Bookmark className="w-[19px] h-[19px]" strokeWidth={activeTab === 'favoritos' ? 2.2 : 1.6} />
          <span className={`text-[10px] tracking-wide whitespace-nowrap ${activeTab === 'favoritos' ? 'font-semibold' : 'font-medium'}`}>
            Favoritos
          </span>
        </button>

        {/* 5. Perfil */}
        <button
          type="button"
          onClick={() => onSelectTab('perfil')}
          className={`autumn-glow-link min-h-[44px] flex flex-col items-center justify-center gap-0.5 rounded-xl active:scale-95 cursor-pointer ${
            activeTab === 'perfil'
              ? 'text-tl-terracota'
              : 'text-tl-marrom-suave hover:text-tl-marrom'
          }`}
        >
          <User className="w-[19px] h-[19px]" strokeWidth={activeTab === 'perfil' ? 2.2 : 1.6} />
          <span className={`text-[10px] tracking-wide whitespace-nowrap ${activeTab === 'perfil' ? 'font-semibold' : 'font-medium'}`}>
            Perfil
          </span>
        </button>
      </div>
    </nav>
  );
}
