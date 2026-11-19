import {
  Bookmark,
  Check,
  Film,
  Heart,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Tv,
  X,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  CatalogWork,
  MediaReviewEnriched,
  MediaShelfEntry,
  MovieShelfStatus,
  PostWithAuthor,
  UserPublic,
} from '../types/thinklive';
import { AgeRatingBadge, CatalogCover, workToSnapshot } from './CatalogCover';
import { BotanicalDivider } from './CreativeStickers';
import { PostCard } from './PostCard';
import { TabEditorialHero } from './TabEditorialHero';

type MoviesSubTab =
  | 'catalogo'
  | 'quero_assistir'
  | 'ja_assistido'
  | 'favoritos'
  | 'minhas_avaliacoes';

interface MoviesSeriesHubViewProps {
  currentUser: UserPublic | null;
  relatedPosts: PostWithAuthor[];
  onOpenWork: (workId: string) => void;
  onOpenPost: (post: PostWithAuthor) => void;
  onOpenAuthor: (username: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleFavorite: (postId: string) => void;
  onShare: (post: PostWithAuthor) => void;
  onRequireAuth: () => void;
  onNotify?: (msg: string) => void;
  libraryRefreshSignal?: number;
}

const GENRE_OPTIONS = [
  'Todos',
  'Drama',
  'Comédia',
  'Suspense',
  'Romance',
  'Ficção Científica',
  'Fantasia',
  'Aventura',
  'Ação',
  'Crime',
  'Mistério',
  'Animação',
  'Terror',
  'Documentário',
  'História',
];

const YEAR_OPTIONS = [
  { value: 'Todos', label: 'Todos os anos' },
  { value: 'recentes', label: 'Lançamentos recentes' },
  { value: '2020s', label: 'Anos 2020' },
  { value: '2010s', label: 'Anos 2010' },
  { value: 'classicos', label: 'Clássicos (antes de 2010)' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Mais populares' },
  { value: 'recent', label: 'Mais recentes' },
  { value: 'rating', label: 'Melhor avaliados' },
];

export function MoviesSeriesHubView({
  currentUser,
  relatedPosts,
  onOpenWork,
  onOpenPost,
  onOpenAuthor,
  onToggleLike,
  onToggleFavorite,
  onShare,
  onRequireAuth,
  onNotify,
  libraryRefreshSignal = 0,
}: MoviesSeriesHubViewProps) {
  const [activeTab, setActiveTab] = useState<MoviesSubTab>('catalogo');

  // Catalog state
  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'todos' | 'filme' | 'serie'>('todos');
  const [genreFilter, setGenreFilter] = useState('Todos');
  const [yearFilter, setYearFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState('popular');

  const [featuredReleases, setFeaturedReleases] = useState<CatalogWork[]>([]);
  const [suggestions, setSuggestions] = useState<CatalogWork[]>([]);
  const [items, setItems] = useState<CatalogWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User library state
  const [myReviews, setMyReviews] = useState<MediaReviewEnriched[]>([]);
  const [myShelves, setMyShelves] = useState<MediaShelfEntry[]>([]);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMoviesCatalog({
        kind: kindFilter,
        genre: genreFilter,
        year: yearFilter,
        sort: sortBy,
        q: appliedQuery,
      });
      setFeaturedReleases(res.featuredReleases || []);
      setSuggestions(res.suggestions || []);
      setItems(res.items || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar o catálogo de filmes e séries.'
      );
    } finally {
      setLoading(false);
    }
  }, [kindFilter, genreFilter, yearFilter, sortBy, appliedQuery]);

  const loadMyLibrary = useCallback(async () => {
    if (!currentUser) {
      setMyReviews([]);
      setMyShelves([]);
      return;
    }
    try {
      const lib = await api.getMyMediaLibrary();
      setMyReviews(lib.reviews.filter((r) => r.mediaKind === 'filme' || r.mediaKind === 'serie'));
      setMyShelves(
        lib.shelfEntries.filter((s) => s.mediaKind === 'filme' || s.mediaKind === 'serie')
      );
    } catch {
      // ignore
    }
  }, [currentUser]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    loadMyLibrary();
  }, [loadMyLibrary, libraryRefreshSignal]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    setActiveTab('catalogo');
    setAppliedQuery(searchInput.trim());
  }

  function handleClearSearch() {
    setSearchInput('');
    setAppliedQuery('');
  }

  function getShelfEntry(workId: string): MediaShelfEntry | undefined {
    return myShelves.find((s) => s.workId === workId);
  }

  function getMyReview(workId: string): MediaReviewEnriched | undefined {
    return myReviews.find((r) => r.workId === workId);
  }

  async function quickUpdateShelf(
    work: CatalogWork,
    patch: { status?: MovieShelfStatus | null; isFavorite?: boolean }
  ) {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    const existing = getShelfEntry(work.id);
    const nextStatus =
      patch.status !== undefined
        ? existing?.status === patch.status
          ? null
          : patch.status
        : existing?.status ?? null;
    const nextFavorite =
      patch.isFavorite !== undefined ? patch.isFavorite : existing?.isFavorite ?? false;

    try {
      const res = await api.updateWorkShelf(work.id, {
        status: nextStatus,
        isFavorite: nextFavorite,
        workSnapshot: workToSnapshot(work),
      });
      setMyShelves((prev) => {
        const filtered = prev.filter((s) => s.workId !== work.id);
        return res.myShelf ? [res.myShelf, ...filtered] : filtered;
      });
      onNotify?.('Lista de filmes e séries atualizada.');
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Erro ao atualizar lista.');
    }
  }

  const wantToWatch = myShelves.filter((s) => s.status === 'quero_assistir');
  const watched = myShelves.filter((s) => s.status === 'ja_assistido');
  const favorites = myShelves.filter((s) => s.isFavorite);

  function renderWorkCard(work: CatalogWork) {
    const shelf = getShelfEntry(work.id);
    const rev = getMyReview(work.id);

    return (
      <article
        key={work.id}
        className="autumn-glow-card group rounded-3xl bg-tl-creme border border-tl-marrom/14 overflow-hidden flex flex-col justify-between editorial-shadow editorial-card-lift"
      >
        <div>
          <div
            onClick={() => onOpenWork(work.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onOpenWork(work.id)}
            className="autumn-glow-image relative aspect-[2/3] w-full overflow-hidden bg-tl-bege border-b border-tl-marrom/12 cursor-pointer"
          >
            <CatalogCover
              src={work.coverUrl}
              title={work.title}
              creator={work.creator}
              year={work.year}
              mediaKind={work.mediaKind}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />

            <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-tl-creme/92 text-tl-marrom border border-tl-marrom/15 backdrop-blur-xs">
                {work.mediaKind === 'serie' ? 'Série' : 'Filme'}
              </span>
            </div>

            <div className="absolute top-2.5 right-2.5">
              <AgeRatingBadge rating={work.ageRating} />
            </div>

            {(work.communityAverage !== null || rev) && (
              <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-tl-marrom/88 text-tl-creme text-[11px] font-bold flex items-center gap-1 backdrop-blur-xs tabular-nums">
                <Star className="w-3 h-3 fill-current text-tl-laranja" />
                <span>
                  {rev
                    ? `Sua nota: ${rev.rating.toFixed(1)}`
                    : `${work.communityAverage!.toFixed(1)} / 10`}
                </span>
              </div>
            )}
          </div>

          <div
            onClick={() => onOpenWork(work.id)}
            className="p-4 space-y-2 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-editorial text-lg font-semibold text-tl-marrom leading-snug line-clamp-2 group-hover:text-tl-terracota">
                {work.title}
              </h3>
            </div>

            <div className="text-xs text-tl-marrom-suave flex flex-wrap items-center gap-1.5">
              {work.year && <span className="font-semibold text-tl-marrom">{work.year}</span>}
              {work.genres.length > 0 && (
                <>
                  {work.year && <span aria-hidden="true">·</span>}
                  <span className="line-clamp-1">{work.genres.slice(0, 2).join(', ')}</span>
                </>
              )}
            </div>

            <p className="text-xs text-tl-marrom-suave leading-relaxed line-clamp-3">
              {work.synopsis}
            </p>
          </div>
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-tl-marrom/10 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => quickUpdateShelf(work, { status: 'quero_assistir' })}
              title="Quero assistir"
              className={`p-2 rounded-full border text-xs cursor-pointer transition-colors ${
                shelf?.status === 'quero_assistir'
                  ? 'bg-tl-laranja text-tl-creme border-tl-terracota'
                  : 'bg-tl-bege/65 text-tl-marrom border-tl-marrom/14 hover:border-tl-laranja'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => quickUpdateShelf(work, { status: 'ja_assistido' })}
              title="Já assisti"
              className={`p-2 rounded-full border text-xs cursor-pointer transition-colors ${
                shelf?.status === 'ja_assistido'
                  ? 'bg-tl-laranja text-tl-creme border-tl-terracota'
                  : 'bg-tl-bege/65 text-tl-marrom border-tl-marrom/14 hover:border-tl-laranja'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() =>
                quickUpdateShelf(work, { isFavorite: !(shelf?.isFavorite ?? false) })
              }
              title="Favoritar"
              className={`p-2 rounded-full border text-xs cursor-pointer transition-colors ${
                shelf?.isFavorite
                  ? 'bg-tl-terracota text-tl-creme border-tl-terracota'
                  : 'bg-tl-bege/65 text-tl-marrom border-tl-marrom/14 hover:border-tl-terracota'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${shelf?.isFavorite ? 'fill-current' : ''}`} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenWork(work.id)}
            className="autumn-glow-link text-xs font-semibold text-tl-terracota hover:underline cursor-pointer px-2 py-1"
          >
            Avaliar / Ver ficha
          </button>
        </div>
      </article>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-28 space-y-8">
      {/* Header */}
      <header className="space-y-6">
        <TabEditorialHero
          imageUrl="/assets/aistudio/cf481f0ad9f02b6f32fe7746bcb9dc0c_c9f4610b.jpg"
          imageAlt="Caixa de costura hexagonal com botões pretos e agulha"
          objectPositionClass="object-[center_45%]"
          kickerIcon={<Film className="w-3.5 h-3.5 text-[#F2B880]" />}
          kicker="Catálogo Cinematográfico · Thinklive"
          title="Filmes & Séries"
          phrase="“Histórias em tela grande, memórias de sessão noturna e cadernos pessoais de cinema.”"
          metaText={
            currentUser
              ? `${wantToWatch.length + watched.length} obras na sua lista`
              : `${items.length} títulos no catálogo`
          }
        />

        {/* Sub-navigation Tabs (Catalog + Personal Organization) */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'catalogo' as MoviesSubTab, label: 'Explorar catálogo' },
            {
              id: 'quero_assistir' as MoviesSubTab,
              label: `Quero assistir${currentUser ? ` (${wantToWatch.length})` : ''}`,
            },
            {
              id: 'ja_assistido' as MoviesSubTab,
              label: `Já assisti${currentUser ? ` (${watched.length})` : ''}`,
            },
            {
              id: 'favoritos' as MoviesSubTab,
              label: `Favoritos${currentUser ? ` (${favorites.length})` : ''}`,
            },
            {
              id: 'minhas_avaliacoes' as MoviesSubTab,
              label: `Minha avaliação${currentUser ? ` (${myReviews.length})` : ''}`,
            },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                  active
                    ? 'autumn-glow-btn bg-tl-laranja text-tl-creme border-tl-terracota/30'
                    : 'autumn-glow-surface bg-tl-creme text-tl-marrom border-tl-marrom/15 hover:border-tl-laranja/50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Catalog Tab */}
      {activeTab === 'catalogo' && (
        <div className="space-y-8">
          {/* Search & Filters Card */}
          <section className="rounded-3xl bg-tl-creme border border-tl-marrom/15 p-5 space-y-4 editorial-shadow">
            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-tl-marrom-suave absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Pesquisar filme ou série por título (ex.: Ainda Estou Aqui, Severance, Interestelar)…"
                  className="w-full rounded-full bg-tl-bege/55 border border-tl-marrom/18 pl-10 pr-10 py-2.5 text-sm text-tl-marrom placeholder:text-tl-marrom-suave/70 focus:outline-none focus:border-tl-laranja"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    title="Limpar busca"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-tl-marrom-suave hover:text-tl-marrom cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="autumn-glow-btn px-6 py-2.5 rounded-full bg-tl-laranja text-tl-creme text-xs font-semibold hover:bg-tl-terracota cursor-pointer"
              >
                Pesquisar
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {/* Media kind filter */}
              <div className="flex items-center gap-1.5 bg-tl-bege/50 p-1 rounded-full border border-tl-marrom/14">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'filme', label: 'Filmes', icon: Film },
                  { id: 'serie', label: 'Séries', icon: Tv },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setKindFilter(opt.id as 'todos' | 'filme' | 'serie')}
                    className={`flex-1 py-1.5 px-3 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                      kindFilter === opt.id
                        ? 'bg-tl-marrom text-tl-creme'
                        : 'text-tl-marrom-suave hover:text-tl-marrom'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Genre Filter */}
              <select
                aria-label="Filtrar por gênero"
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="rounded-full bg-tl-bege/55 border border-tl-marrom/18 px-4 py-2 text-xs font-medium text-tl-marrom cursor-pointer"
              >
                {GENRE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g === 'Todos' ? 'Gênero: Todos' : g}
                  </option>
                ))}
              </select>

              {/* Year Filter */}
              <select
                aria-label="Filtrar por ano"
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="rounded-full bg-tl-bege/55 border border-tl-marrom/18 px-4 py-2 text-xs font-medium text-tl-marrom cursor-pointer"
              >
                {YEAR_OPTIONS.map((y) => (
                  <option key={y.value} value={y.value}>
                    {y.label}
                  </option>
                ))}
              </select>

              {/* Popularity / Sort */}
              <select
                aria-label="Ordenar por popularidade ou lançamento"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="rounded-full bg-tl-bege/55 border border-tl-marrom/18 px-4 py-2 text-xs font-medium text-tl-marrom cursor-pointer"
              >
                {SORT_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    Ordenar: {s.label}
                  </option>
                ))}
              </select>
            </div>
          </section>

          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-3xl bg-tl-creme border border-tl-marrom/12 overflow-hidden animate-pulse"
                >
                  <div className="aspect-[2/3] bg-tl-bege" />
                  <div className="p-4 space-y-2">
                    <div className="h-4 w-3/4 bg-tl-bege rounded" />
                    <div className="h-3 w-1/2 bg-tl-bege rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="rounded-3xl bg-tl-creme border border-tl-marrom/18 p-8 text-center space-y-4 editorial-shadow">
              <p className="text-sm text-tl-marrom">{error}</p>
              <button
                type="button"
                onClick={loadCatalog}
                className="autumn-glow-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-tl-laranja text-tl-creme text-xs font-medium cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tentar novamente</span>
              </button>
            </div>
          ) : (
            <>
              {/* Featured Releases & Suggestions when browsing without search */}
              {!appliedQuery &&
                kindFilter === 'todos' &&
                genreFilter === 'Todos' &&
                yearFilter === 'Todos' && (
                  <>
                    {featuredReleases.length > 0 && (
                      <section className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-editorial text-2xl md:text-3xl font-semibold text-tl-marrom flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-tl-laranja" />
                            <span>Lançamentos recentes</span>
                          </h2>
                          <span className="text-xs text-tl-marrom-suave">
                            Destaques contemporâneos
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                          {featuredReleases.slice(0, 4).map(renderWorkCard)}
                        </div>
                      </section>
                    )}

                    {suggestions.length > 0 && (
                      <section className="space-y-4">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-editorial text-2xl md:text-3xl font-semibold text-tl-marrom">
                            Sugestões para sua lista
                          </h2>
                          <span className="text-xs text-tl-marrom-suave">
                            Populares no cinema e séries
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                          {suggestions.slice(0, 4).map(renderWorkCard)}
                        </div>
                      </section>
                    )}
                  </>
                )}

              {/* Filtered / Search Grid */}
              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-editorial text-2xl md:text-3xl font-semibold text-tl-marrom">
                    {appliedQuery
                      ? `Resultados para “${appliedQuery}”`
                      : 'Catálogo completo'}
                  </h2>
                  <span className="text-xs text-tl-marrom-suave tabular-nums">
                    {items.length} {items.length === 1 ? 'obra encontrada' : 'obras encontradas'}
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-3xl bg-tl-creme border border-tl-marrom/14 p-10 text-center space-y-3">
                    <p className="text-sm text-tl-marrom">
                      Nenhum filme ou série corresponde aos filtros selecionados.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        handleClearSearch();
                        setKindFilter('todos');
                        setGenreFilter('Todos');
                        setYearFilter('Todos');
                      }}
                      className="autumn-glow-surface px-4 py-2 rounded-full bg-tl-bege text-xs font-medium text-tl-marrom border border-tl-marrom/15 cursor-pointer"
                    >
                      Limpar filtros
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {items.map(renderWorkCard)}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* Personal Organization Tabs */}
      {activeTab !== 'catalogo' && (
        <section className="space-y-5">
          {!currentUser ? (
            <div className="rounded-3xl bg-tl-creme border border-tl-marrom/16 p-8 text-center space-y-4 editorial-shadow">
              <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
                Organize seus filmes e séries
              </h2>
              <p className="text-sm text-tl-marrom-suave max-w-md mx-auto">
                Entre na sua conta Thinklive para manter suas listas de Quero assistir, Já assisti,
                Favoritos e histórico de avaliações de 0 a 10.
              </p>
              <button
                type="button"
                onClick={onRequireAuth}
                className="autumn-glow-btn px-6 py-2.5 rounded-full bg-tl-laranja text-tl-creme text-xs font-semibold cursor-pointer"
              >
                Entrar na minha conta
              </button>
            </div>
          ) : activeTab === 'minhas_avaliacoes' ? (
            myReviews.length === 0 ? (
              <div className="rounded-3xl bg-tl-creme border border-tl-marrom/14 p-10 text-center space-y-3">
                <p className="text-sm text-tl-marrom-suave">
                  Você ainda não avaliou nenhum filme ou série. Abra qualquer obra do catálogo para
                  dar sua nota de 0 a 10.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('catalogo')}
                  className="autumn-glow-btn px-5 py-2 rounded-full bg-tl-laranja text-tl-creme text-xs font-medium cursor-pointer"
                >
                  Explorar catálogo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myReviews.map((rev) => (
                  <article
                    key={rev.id}
                    onClick={() => onOpenWork(rev.workId)}
                    className="autumn-glow-card rounded-3xl bg-tl-creme border border-tl-marrom/15 p-4 flex gap-4 cursor-pointer editorial-shadow editorial-card-lift"
                  >
                    <div className="w-20 aspect-[2/3] rounded-xl overflow-hidden shrink-0 border border-tl-marrom/15 bg-tl-bege">
                      <CatalogCover
                        src={rev.workSnapshot.coverUrl}
                        title={rev.workSnapshot.title}
                        creator={rev.workSnapshot.creator}
                        year={rev.workSnapshot.year}
                        mediaKind={rev.workSnapshot.mediaKind}
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-editorial text-xl font-semibold text-tl-marrom truncate">
                          {rev.workSnapshot.title}
                        </h3>
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tl-laranja text-tl-creme text-xs font-bold shrink-0 tabular-nums">
                          <Star className="w-3 h-3 fill-current" />
                          {rev.rating.toFixed(1)}/10
                        </span>
                      </div>
                      <p className="text-xs text-tl-marrom-suave">
                        {rev.workSnapshot.year || 'Ano n/i'} · {rev.workSnapshot.genres.join(', ')}
                      </p>
                      {rev.review ? (
                        <p className="text-xs text-tl-marrom leading-relaxed line-clamp-3">
                          {rev.review}
                        </p>
                      ) : (
                        <p className="text-xs italic text-tl-marrom-suave">
                          Nota registrada sem texto. Clique para editar ou comentar.
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )
          ) : (
            (() => {
              const list =
                activeTab === 'quero_assistir'
                  ? wantToWatch
                  : activeTab === 'ja_assistido'
                  ? watched
                  : favorites;
              if (list.length === 0) {
                return (
                  <div className="rounded-3xl bg-tl-creme border border-tl-marrom/14 p-10 text-center space-y-3">
                    <p className="text-sm text-tl-marrom-suave">
                      Nenhum título adicionado nesta lista ainda.
                    </p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('catalogo')}
                      className="autumn-glow-btn px-5 py-2 rounded-full bg-tl-laranja text-tl-creme text-xs font-medium cursor-pointer"
                    >
                      Explorar catálogo
                    </button>
                  </div>
                );
              }
              return (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                  {list.map((entry) => {
                    const rev = getMyReview(entry.workId);
                    return (
                      <article
                        key={entry.id}
                        onClick={() => onOpenWork(entry.workId)}
                        className="autumn-glow-card group rounded-3xl bg-tl-creme border border-tl-marrom/14 overflow-hidden cursor-pointer editorial-shadow editorial-card-lift"
                      >
                        <div className="autumn-glow-image relative aspect-[2/3] bg-tl-bege border-b border-tl-marrom/10">
                          <CatalogCover
                            src={entry.workSnapshot.coverUrl}
                            title={entry.workSnapshot.title}
                            creator={entry.workSnapshot.creator}
                            year={entry.workSnapshot.year}
                            mediaKind={entry.workSnapshot.mediaKind}
                          />
                          {rev && (
                            <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-tl-marrom/88 text-tl-creme text-[11px] font-bold flex items-center gap-1 tabular-nums">
                              <Star className="w-3 h-3 fill-current text-tl-laranja" />
                              {rev.rating.toFixed(1)}/10
                            </div>
                          )}
                        </div>
                        <div className="p-4 space-y-1">
                          <h3 className="font-editorial text-lg font-semibold text-tl-marrom line-clamp-2 group-hover:text-tl-terracota">
                            {entry.workSnapshot.title}
                          </h3>
                          <p className="text-xs text-tl-marrom-suave">
                            {entry.workSnapshot.year}
                            {entry.workSnapshot.genres[0]
                              ? ` · ${entry.workSnapshot.genres[0]}`
                              : ''}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              );
            })()
          )}
        </section>
      )}

      {/* Community Editorial Essays in Filmes & Séries */}
      {relatedPosts.length > 0 && (
        <section className="pt-4 border-t border-tl-marrom/14 space-y-5">
          <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
            Ensaios e crônicas da comunidade em Filmes & Séries
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedPosts.slice(0, 6).map((p) => (
              <PostCard
                key={p.id}
                post={p}
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
      )}
    </div>
  );
}
