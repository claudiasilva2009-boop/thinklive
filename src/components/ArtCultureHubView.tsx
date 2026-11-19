import {
  BookmarkPlus,
  BookOpen,
  Check,
  ExternalLink,
  Landmark,
  Loader2,
  Palette,
  PenLine,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  ArtCultureItem,
  ArtCultureTheme,
  PostWithAuthor,
  UserPublic,
} from '../types/thinklive';
import { BotanicalDivider } from './CreativeStickers';
import { ImageWithFallback } from './ImageWithFallback';
import { PostCard } from './PostCard';
import { TabEditorialHero } from './TabEditorialHero';

interface ArtCultureHubViewProps {
  currentUser: UserPublic | null;
  relatedPosts: PostWithAuthor[];
  onOpenPost: (post: PostWithAuthor) => void;
  onOpenAuthor: (username: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleFavorite: (postId: string) => void;
  onShare: (post: PostWithAuthor) => void;
  onRequireAuth: () => void;
  onOpenPublish?: () => void;
  onShelfUpdated?: () => void;
  onNotify?: (msg: string) => void;
}

export function ArtCultureHubView({
  currentUser,
  relatedPosts,
  onOpenPost,
  onOpenAuthor,
  onToggleLike,
  onToggleFavorite,
  onShare,
  onRequireAuth,
  onOpenPublish,
  onShelfUpdated,
  onNotify,
}: ArtCultureHubViewProps) {
  const [themes, setThemes] = useState<ArtCultureTheme[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<'Todos' | ArtCultureTheme>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [items, setItems] = useState<ArtCultureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<ArtCultureItem | null>(null);
  const [savingToShelf, setSavingToShelf] = useState(false);
  const [savedItemIds, setSavedItemIds] = useState<Record<string, boolean>>({});

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getArtCulture({
        theme: selectedTheme === 'Todos' ? undefined : selectedTheme,
        q: activeSearch || undefined,
      });
      setThemes(res.themes);
      setItems(res.items);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao carregar acervo cultural.');
    } finally {
      setLoading(false);
    }
  }, [selectedTheme, activeSearch]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  async function handleSaveToShelf(item: ArtCultureItem) {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    setSavingToShelf(true);
    try {
      const { shelves } = await api.getShelves(currentUser.id);
      let targetShelf =
        shelves.find((s) => /arte|cultura|acervo|inspiração/i.test(s.title)) || shelves[0];

      if (!targetShelf) {
        const created = await api.createShelf({
          title: 'Acervo de Arte & Cultura',
          category: 'Arte e cultura',
          description: 'Obras, pinturas, fotografias e leituras de inspiração.',
          isPublic: true,
        });
        targetShelf = created.shelf;
      }

      const already = targetShelf.items.some((i) => i.refId === item.id || i.title === item.title);
      if (already) {
        setSavedItemIds((prev) => ({ ...prev, [item.id]: true }));
        onNotify?.(`“${item.title}” já está guardada na estante ${targetShelf.title}.`);
        return;
      }

      await api.addShelfItem(targetShelf.id, {
        title: item.title,
        subtitle: `${item.artistOrAuthor} (${item.year})`,
        kind: item.theme === 'Fotografias artísticas' ? 'fotografia' : 'outro',
        coverUrl: item.imageUrl,
        refId: item.id,
        note: `${item.theme} · ${item.sourceName}`,
      });
      setSavedItemIds((prev) => ({ ...prev, [item.id]: true }));
      onShelfUpdated?.();
      onNotify?.(`Obra guardada na estante “${targetShelf.title}”.`);
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Não foi possível guardar na estante.');
    } finally {
      setSavingToShelf(false);
    }
  }

  const featuredLead = items[0] || null;
  const gridItems = items.length > 1 ? items.slice(1) : [];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-5 pb-24 space-y-8">
      {/* Institutional Curatorial Hero */}
      <header className="space-y-6">
        <TabEditorialHero
          imageUrl="/src/assets/images/art_culture_top_hero_1795044945914.jpg"
          imageAlt="Galeria clássica de museu com esculturas em mármore e pinturas emolduradas sob claraboia"
          objectPositionClass="object-[center_45%]"
          kickerIcon={<Landmark className="w-3.5 h-3.5 text-[#F2B880]" />}
          kicker="Espaço de Inspiração · Thinklive"
          title="Arte, Cultura & Domínio Público"
          phrase="“Pinturas, arquitetura, gestos históricos e obras em diálogo com o tempo.”"
          actions={
            onOpenPublish ? (
              <button
                type="button"
                onClick={onOpenPublish}
                className="autumn-glow-btn px-5 py-2.5 rounded-full bg-tl-laranja text-tl-creme border border-[#F2B880]/30 text-xs md:text-sm font-medium hover:bg-tl-terracota active:scale-95 inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
              >
                <PenLine className="w-4 h-4" />
                <span>Escrever reflexão</span>
              </button>
            ) : undefined
          }
        />

        {/* Search & Theme Navigator */}
        <div className="rounded-2xl bg-tl-creme border border-tl-marrom/14 p-4 sm:p-5 editorial-shadow space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setActiveSearch(searchQuery.trim());
            }}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-tl-marrom-suave absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim()) setActiveSearch('');
                }}
                placeholder="Artista, obra, movimento..."
                className="w-full pl-9 pr-3 py-2 rounded-full bg-tl-papel border border-tl-marrom/18 text-sm text-tl-marrom focus:outline-none focus:border-tl-terracota"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-tl-marrom text-tl-creme text-xs font-medium hover:bg-tl-terracota transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Filtrar acervo
            </button>
          </form>

          {themes.length > 0 && (
            <nav
              aria-label="Temas de arte e cultura"
              className="pt-3 border-t border-tl-areia/75 flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar"
            >
              {(['Todos', ...themes] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTheme(t)}
                  className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors cursor-pointer border ${
                    selectedTheme === t
                      ? 'bg-tl-marrom text-tl-creme border-tl-marrom font-medium'
                      : 'bg-tl-papel text-tl-marrom-suave border-tl-marrom/14 hover:border-tl-marrom/35 hover:text-tl-marrom'
                  }`}
                >
                  {t}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* Catalog Gallery */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-tl-marrom-suave">
          <Loader2 className="w-6 h-6 animate-spin text-tl-terracota" />
          <span className="text-sm">Consultando acervos museológicos e domínio público...</span>
        </div>
      ) : errorMsg ? (
        <div className="rounded-2xl bg-tl-creme border border-tl-terracota/30 p-6 text-center space-y-2">
          <p className="text-sm text-tl-terracota">{errorMsg}</p>
          <button
            type="button"
            onClick={loadCatalog}
            className="px-4 py-1.5 rounded-full bg-tl-marrom text-tl-creme text-xs font-medium cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl bg-tl-creme border border-tl-marrom/12 p-12 text-center space-y-2">
          <p className="font-editorial text-2xl text-tl-marrom">Nenhuma obra encontrada neste recorte</p>
          <p className="text-sm text-tl-marrom-suave">
            Selecione outro tema acima ou limpe sua busca para explorar todo o acervo.
          </p>
          {(selectedTheme !== 'Todos' || activeSearch) && (
            <button
              type="button"
              onClick={() => {
                setSelectedTheme('Todos');
                setSearchQuery('');
                setActiveSearch('');
              }}
              className="mt-2 px-4 py-1.5 rounded-full bg-tl-marrom text-tl-creme text-xs font-medium cursor-pointer"
            >
              Ver todo o acervo
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Curatorial Lead Plate */}
          {featuredLead && (
            <article className="rounded-2xl bg-tl-creme border border-tl-marrom/16 overflow-hidden editorial-shadow grid grid-cols-1 lg:grid-cols-12">
              <div
                onClick={() => setSelectedItem(featuredLead)}
                className="lg:col-span-7 bg-tl-bege/60 relative min-h-[280px] sm:min-h-[380px] overflow-hidden cursor-pointer group"
              >
                <ImageWithFallback
                  src={featuredLead.imageUrl}
                  alt={`${featuredLead.title} — ${featuredLead.artistOrAuthor}`}
                  className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
                  fallbackLabel={featuredLead.title}
                />
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-[11px] bg-tl-marrom/75 text-tl-creme px-3 py-1.5 rounded-lg backdrop-blur-xs">
                  <span className="truncate">{featuredLead.sourceName}</span>
                  <span className="shrink-0 opacity-90">{featuredLead.license}</span>
                </div>
              </div>

              <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="text-[11px] uppercase tracking-[0.18em] text-tl-terracota font-semibold">
                    {featuredLead.theme}
                  </div>
                  <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-tl-marrom leading-tight">
                    {featuredLead.title}
                  </h2>
                  <p className="text-sm font-medium text-tl-marrom-suave">
                    {featuredLead.artistOrAuthor} · {featuredLead.year}
                  </p>
                  <p className="text-xs text-tl-marrom-suave/90">{featuredLead.mediumOrOrigin}</p>
                  <p className="text-sm text-tl-marrom leading-relaxed pt-1">{featuredLead.summary}</p>
                  <blockquote className="border-l-2 border-tl-terracota/60 pl-3.5 py-1 text-xs sm:text-sm italic text-tl-marrom-suave leading-relaxed">
                    {featuredLead.curiosityOrExcerpt}
                  </blockquote>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-tl-areia/70">
                  <button
                    type="button"
                    onClick={() => setSelectedItem(featuredLead)}
                    className="px-4 py-2 rounded-full bg-tl-marrom text-tl-creme text-xs font-medium hover:bg-tl-terracota transition-colors cursor-pointer"
                  >
                    Examinar obra & contexto
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveToShelf(featuredLead)}
                    disabled={savingToShelf}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-tl-marrom/20 text-xs font-medium text-tl-marrom hover:bg-tl-bege transition-colors cursor-pointer"
                  >
                    {savedItemIds[featuredLead.id] ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-tl-terracota" />
                        Na estante
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        Guardar na estante
                      </>
                    )}
                  </button>
                </div>
              </div>
            </article>
          )}

          {/* Museum Archival Grid */}
          {gridItems.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gridItems.map((item) => (
                <article
                  key={item.id}
                  className="rounded-2xl bg-tl-creme border border-tl-marrom/14 overflow-hidden flex flex-col hover:border-tl-marrom/32 transition-all group"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedItem(item)}
                    className="relative aspect-[4/3] w-full bg-tl-bege overflow-hidden cursor-pointer text-left"
                  >
                    <ImageWithFallback
                      src={item.imageUrl}
                      alt={`${item.title} — ${item.artistOrAuthor}`}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      fallbackLabel={item.title}
                    />
                  </button>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-tl-terracota font-semibold">
                        {item.theme}
                      </div>
                      <h3
                        onClick={() => setSelectedItem(item)}
                        className="font-editorial text-xl font-semibold text-tl-marrom leading-snug cursor-pointer hover:text-tl-terracota transition-colors"
                      >
                        {item.title}
                      </h3>
                      <p className="text-xs font-medium text-tl-marrom-suave">
                        {item.artistOrAuthor} · {item.year}
                      </p>
                      <p className="text-xs text-tl-marrom/85 line-clamp-3 leading-relaxed pt-1">
                        {item.summary}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-tl-areia/65 flex items-center justify-between gap-2 text-[11px]">
                      <span className="text-tl-marrom-suave truncate">{item.sourceName}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedItem(item)}
                        className="font-medium text-tl-terracota hover:underline shrink-0 cursor-pointer"
                      >
                        Ver detalhes
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Community Reflections */}
      {relatedPosts.length > 0 && (
        <>
          <BotanicalDivider />
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-editorial text-2xl font-semibold text-tl-marrom flex items-center gap-2">
                <Palette className="w-5 h-5 text-tl-terracota" />
                Ensaios e reflexões da comunidade
              </h2>
              {onOpenPublish && (
                <button
                  type="button"
                  onClick={onOpenPublish}
                  className="text-xs font-medium text-tl-terracota hover:underline cursor-pointer"
                >
                  Publicar texto cultural
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUser={currentUser}
                  onOpenPost={onOpenPost}
                  onOpenAuthor={onOpenAuthor}
                  onToggleLike={onToggleLike}
                  onToggleFavorite={onToggleFavorite}
                  onShare={onShare}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Curatorial Inspection Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-tl-marrom/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
          onClick={() => setSelectedItem(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedItem.title}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl rounded-2xl bg-tl-creme border border-tl-marrom/20 editorial-shadow overflow-hidden my-auto max-h-[92vh] flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-tl-areia/70 bg-tl-papel">
              <div className="text-[11px] uppercase tracking-[0.18em] text-tl-terracota font-semibold truncate">
                {selectedItem.theme}
                {selectedItem.movementOrContext ? ` · ${selectedItem.movementOrContext}` : ''}
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                aria-label="Fechar janela da obra"
                className="p-1.5 rounded-full hover:bg-tl-bege text-tl-marrom-suave cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto grid grid-cols-1 md:grid-cols-12">
              <div className="md:col-span-6 bg-tl-marrom/95 flex items-center justify-center p-4 sm:p-6 min-h-[260px]">
                <ImageWithFallback
                  src={selectedItem.imageUrl}
                  alt={selectedItem.title}
                  className="max-h-[60vh] w-auto object-contain rounded-lg shadow-lg"
                />
              </div>

              <div className="md:col-span-6 p-6 space-y-4">
                <div>
                  <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-tl-marrom leading-tight">
                    {selectedItem.title}
                  </h2>
                  <p className="text-sm font-medium text-tl-terracota mt-1">
                    {selectedItem.artistOrAuthor} · {selectedItem.year}
                  </p>
                  <p className="text-xs text-tl-marrom-suave mt-1">{selectedItem.mediumOrOrigin}</p>
                </div>

                <div className="space-y-2 text-sm text-tl-marrom leading-relaxed">
                  <p>{selectedItem.summary}</p>
                </div>

                <div className="rounded-xl bg-tl-papel border border-tl-marrom/14 p-4 space-y-1.5">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-tl-terracota flex items-center gap-1.5">
                    {selectedItem.theme === 'Literatura e domínio público' ? (
                      <>
                        <BookOpen className="w-3.5 h-3.5" />
                        Trecho em domínio público
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Curiosidade & Leitura curatorial
                      </>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-tl-marrom/90 italic leading-relaxed">
                    {selectedItem.curiosityOrExcerpt}
                  </p>
                </div>

                <div className="text-xs text-tl-marrom-suave space-y-1 pt-2 border-t border-tl-areia/70">
                  <div>
                    <strong className="text-tl-marrom">Fonte:</strong> {selectedItem.sourceName}
                  </div>
                  <div>
                    <strong className="text-tl-marrom">Licença / Direitos:</strong> {selectedItem.license}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => handleSaveToShelf(selectedItem)}
                    disabled={savingToShelf}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-tl-marrom text-tl-creme text-xs font-medium hover:bg-tl-terracota transition-colors cursor-pointer"
                  >
                    {savedItemIds[selectedItem.id] ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Guardado na estante
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        Guardar na estante
                      </>
                    )}
                  </button>

                  {selectedItem.sourceUrl && (
                    <a
                      href={selectedItem.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-tl-marrom/20 text-xs font-medium text-tl-marrom hover:bg-tl-bege transition-colors"
                    >
                      Acervo oficial
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
