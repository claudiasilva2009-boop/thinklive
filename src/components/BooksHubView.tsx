import {
  ArrowRightLeft,
  Bookmark,
  BookmarkX,
  BookOpen,
  Check,
  Heart,
  Library,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import {
  BOOK_SHELF_LABELS,
  BOOK_SHELF_ORDER,
  deduplicateBookShelves,
  isSameBookEntry,
  readGuestBookShelves,
  syncGuestBookShelvesToAccount,
  upsertGuestBookShelf,
} from '../lib/bookLibrary';
import {
  BookShelfStatus,
  CatalogWork,
  CatalogWorkSnapshot,
  MediaReviewEnriched,
  MediaShelfEntry,
  PostWithAuthor,
  UserPublic,
} from '../types/thinklive';
import { CatalogCover, workToSnapshot } from './CatalogCover';
import { BotanicalDivider } from './CreativeStickers';
import { PostCard } from './PostCard';
import { TabEditorialHero } from './TabEditorialHero';

type BooksSubTab =
  | 'catalogo'
  | 'quero_ler'
  | 'lendo'
  | 'ja_li'
  | 'abandonado'
  | 'favoritos'
  | 'minhas_avaliacoes';

interface BooksHubViewProps {
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

const BOOK_GENRE_OPTIONS = [
  'Todos',
  'Literatura Brasileira',
  'Ficção Literária',
  'Romance',
  'Mistério & Suspense',
  'Ficção Científica',
  'Fantasia',
  'Poesia',
  'Clássicos',
  'Filosofia',
  'História',
  'Biografias',
];

const SORT_OPTIONS = [
  { value: 'popular', label: 'Mais populares' },
  { value: 'recent', label: 'Publicações recentes' },
  { value: 'rating', label: 'Melhor avaliados' },
  { value: 'title', label: 'Ordem alfabética' },
];

const CATEGORY_EMPTY_MESSAGES: Record<
  Exclude<BooksSubTab, 'catalogo' | 'minhas_avaliacoes'>,
  string
> = {
  quero_ler:
    'Sua lista Quero Ler está vazia. Adicione livros do catálogo para planejar suas próximas leituras.',
  lendo:
    'Você não está lendo nenhum livro no momento. Clique em “Iniciar leitura” em qualquer obra para começar.',
  ja_li:
    'Nenhum livro finalizado ainda. Quando concluir uma leitura, clique em “Finalizar leitura”.',
  abandonado:
    'Nenhum livro marcado como abandonado.',
  favoritos:
    'Você ainda não favoritou nenhum livro. Clique no coração de qualquer obra para adicioná-la aqui.',
};

export function BooksHubView({
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
}: BooksHubViewProps) {
  const [activeTab, setActiveTab] = useState<BooksSubTab>('catalogo');

  // Catalog state
  const [searchInput, setSearchInput] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'all' | 'title' | 'author'>('all');
  const [genreFilter, setGenreFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState('popular');

  const [featured, setFeatured] = useState<CatalogWork[]>([]);
  const [items, setItems] = useState<CatalogWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // User bookshelf state (DB when logged in, localStorage when browsing as guest)
  const [myReviews, setMyReviews] = useState<MediaReviewEnriched[]>([]);
  const [myShelves, setMyShelves] = useState<MediaShelfEntry[]>(() =>
    currentUser ? [] : readGuestBookShelves()
  );
  const [busyWorkIds, setBusyWorkIds] = useState<Record<string, boolean>>({});

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getBooksCatalog({
        genre: genreFilter,
        sort: sortBy,
        q: appliedQuery,
        mode: searchMode,
      });
      setFeatured(res.featured || []);
      setItems(res.items || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar o catálogo da biblioteca.'
      );
    } finally {
      setLoading(false);
    }
  }, [genreFilter, sortBy, appliedQuery, searchMode]);

  const loadMyLibrary = useCallback(async () => {
    if (!currentUser) {
      setMyReviews([]);
      setMyShelves(readGuestBookShelves());
      return;
    }
    try {
      const lib = await api.getMyMediaLibrary();
      const dbReviews = lib.reviews.filter((r) => r.mediaKind === 'livro');
      const dbBookShelves = lib.shelfEntries.filter((s) => s.mediaKind === 'livro');
      const syncedShelves = await syncGuestBookShelvesToAccount(dbBookShelves);
      setMyReviews(dbReviews);
      setMyShelves(deduplicateBookShelves(syncedShelves));
    } catch {
      // Keep current shelves on transient error
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

  function findShelfEntry(
    workId: string,
    title?: string,
    creator?: string
  ): MediaShelfEntry | undefined {
    return myShelves.find((s) =>
      isSameBookEntry(s, { workId, title, creator, mediaKind: 'livro' })
    );
  }

  function getMyReview(workId: string): MediaReviewEnriched | undefined {
    return myReviews.find((r) => r.workId === workId);
  }

  async function applyShelfChange(
    target: {
      workId: string;
      snapshot: CatalogWorkSnapshot;
    },
    patch: { status?: BookShelfStatus | null; isFavorite?: boolean },
    feedbackMessage?: string
  ) {
    const existing = findShelfEntry(
      target.workId,
      target.snapshot.title,
      target.snapshot.creator
    );
    const effectiveWorkId = existing?.workId || target.workId;

    if (busyWorkIds[effectiveWorkId]) return;

    // Prevent redundant duplicate write if book is already in the requested status
    if (
      patch.status !== undefined &&
      patch.isFavorite === undefined &&
      existing?.status === patch.status
    ) {
      if (patch.status) {
        onNotify?.(
          `“${target.snapshot.title}” já está em ${BOOK_SHELF_LABELS[patch.status]}.`
        );
      }
      return;
    }

    const nextStatus =
      patch.status !== undefined
        ? patch.status
        : ((existing?.status as BookShelfStatus | null) ?? null);
    const nextFavorite =
      patch.isFavorite !== undefined
        ? patch.isFavorite
        : (existing?.isFavorite ?? false);

    if (!currentUser) {
      const { entries } = upsertGuestBookShelf(effectiveWorkId, target.snapshot, {
        status: nextStatus,
        isFavorite: nextFavorite,
      });
      setMyShelves(entries);
      if (feedbackMessage) {
        onNotify?.(feedbackMessage);
      }
      return;
    }

    setBusyWorkIds((prev) => ({ ...prev, [effectiveWorkId]: true }));
    try {
      const res = await api.updateWorkShelf(effectiveWorkId, {
        status: nextStatus,
        isFavorite: nextFavorite,
        workSnapshot: target.snapshot,
      });
      setMyShelves((prev) => {
        const remaining = prev.filter(
          (s) =>
            !isSameBookEntry(s, {
              workId: effectiveWorkId,
              title: target.snapshot.title,
              creator: target.snapshot.creator,
              mediaKind: 'livro',
            })
        );
        return deduplicateBookShelves(
          res.myShelf ? [res.myShelf, ...remaining] : remaining
        );
      });
      if (feedbackMessage) {
        onNotify?.(feedbackMessage);
      }
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Erro ao atualizar estante.');
    } finally {
      setBusyWorkIds((prev) => {
        const copy = { ...prev };
        delete copy[effectiveWorkId];
        return copy;
      });
    }
  }

  function handleSetBookCategory(
    workId: string,
    snapshot: CatalogWorkSnapshot,
    nextStatus: BookShelfStatus | null
  ) {
    const label = nextStatus ? BOOK_SHELF_LABELS[nextStatus] : null;
    const message = nextStatus
      ? `“${snapshot.title}” movido para ${label}.`
      : `“${snapshot.title}” removido desta prateleira.`;
    return applyShelfChange({ workId, snapshot }, { status: nextStatus }, message);
  }

  function handleToggleBookFavorite(
    workId: string,
    snapshot: CatalogWorkSnapshot,
    currentFavorite: boolean
  ) {
    const nextFav = !currentFavorite;
    const message = nextFav
      ? `“${snapshot.title}” adicionado aos Favoritos.`
      : `“${snapshot.title}” removido dos Favoritos.`;
    return applyShelfChange({ workId, snapshot }, { isFavorite: nextFav }, message);
  }

  const dedupedShelves = useMemo(() => deduplicateBookShelves(myShelves), [myShelves]);
  const wantToRead = useMemo(
    () => dedupedShelves.filter((s) => s.status === 'quero_ler'),
    [dedupedShelves]
  );
  const readingNow = useMemo(
    () => dedupedShelves.filter((s) => s.status === 'lendo'),
    [dedupedShelves]
  );
  const finished = useMemo(
    () => dedupedShelves.filter((s) => s.status === 'ja_li'),
    [dedupedShelves]
  );
  const abandoned = useMemo(
    () => dedupedShelves.filter((s) => s.status === 'abandonado'),
    [dedupedShelves]
  );
  const favorites = useMemo(
    () => dedupedShelves.filter((s) => s.isFavorite),
    [dedupedShelves]
  );

  function renderBookCard(book: CatalogWork) {
    const shelf = findShelfEntry(book.id, book.title, book.creator);
    const rev = getMyReview(book.id);
    const snapshot = workToSnapshot(book);
    const currentStatus = (shelf?.status as BookShelfStatus | null) ?? null;
    const isFavorited = shelf?.isFavorite ?? false;
    const isBusy = Boolean(busyWorkIds[shelf?.workId || book.id]);

    return (
      <article
        key={book.id}
        className="autumn-glow-card group rounded-3xl bg-tl-creme border border-tl-marrom/14 overflow-hidden flex flex-col justify-between editorial-shadow editorial-card-lift"
      >
        <div>
          <div
            onClick={() => onOpenWork(book.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onOpenWork(book.id)}
            className="autumn-glow-image relative aspect-[2/3] w-full overflow-hidden bg-tl-bege border-b border-tl-marrom/12 cursor-pointer"
          >
            <CatalogCover
              src={book.coverUrl}
              title={book.title}
              creator={book.creator}
              year={book.year}
              mediaKind="livro"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />

            {currentStatus && (
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-tl-creme/92 text-tl-terracota border border-tl-marrom/15 text-[10px] font-semibold backdrop-blur-xs">
                {BOOK_SHELF_LABELS[currentStatus]}
              </div>
            )}

            {(book.communityAverage !== null || rev) && (
              <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-tl-marrom/88 text-tl-creme text-[11px] font-bold flex items-center gap-1 backdrop-blur-xs tabular-nums">
                <Star className="w-3 h-3 fill-current text-tl-laranja" />
                <span>
                  {rev
                    ? `Sua nota: ${rev.rating.toFixed(1)}`
                    : `${book.communityAverage!.toFixed(1)} / 10`}
                </span>
              </div>
            )}
          </div>

          <div
            onClick={() => onOpenWork(book.id)}
            className="p-4 space-y-1.5 cursor-pointer"
          >
            <h3 className="font-editorial text-lg font-semibold text-tl-marrom leading-snug line-clamp-2 group-hover:text-tl-terracota">
              {book.title}
            </h3>
            <p className="text-xs font-medium text-tl-marrom-suave line-clamp-1">
              {book.creator}
            </p>
            <div className="text-[11px] text-tl-marrom-suave/90 flex flex-wrap items-center gap-1.5">
              {book.year && <span className="font-semibold text-tl-marrom">{book.year}</span>}
              {book.genres.length > 0 && (
                <>
                  {book.year && <span aria-hidden="true">·</span>}
                  <span className="line-clamp-1">{book.genres[0]}</span>
                </>
              )}
            </div>
            <p className="text-xs text-tl-marrom-suave leading-relaxed line-clamp-2 pt-0.5">
              {book.synopsis}
            </p>
          </div>
        </div>

        <div className="px-4 pb-4 pt-2.5 border-t border-tl-marrom/10 space-y-2.5">
          {/* Quick progression CTA */}
          <div className="flex items-center justify-between gap-1.5">
            {currentStatus === 'lendo' ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetBookCategory(book.id, snapshot, 'ja_li');
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-tl-terracota text-tl-creme text-[11px] font-semibold hover:bg-tl-marrom transition-colors cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3 h-3" />
                <span>Finalizar leitura</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetBookCategory(book.id, snapshot, 'lendo');
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full bg-tl-laranja text-tl-creme text-[11px] font-semibold hover:bg-tl-terracota transition-colors cursor-pointer disabled:opacity-50"
              >
                <BookOpen className="w-3 h-3" />
                <span>Iniciar leitura</span>
              </button>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenWork(book.id);
              }}
              className="autumn-glow-link text-[11px] font-semibold text-tl-terracota hover:underline cursor-pointer px-2 py-1 shrink-0"
            >
              Ler / Avaliar
            </button>
          </div>

          {/* All category toggles + Favorite */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                disabled={isBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetBookCategory(book.id, snapshot, 'quero_ler');
                }}
                title="Quero Ler"
                aria-label="Adicionar em Quero Ler"
                className={`p-2 rounded-full border text-xs cursor-pointer transition-colors disabled:opacity-50 ${
                  currentStatus === 'quero_ler'
                    ? 'bg-tl-laranja text-tl-creme border-tl-terracota'
                    : 'bg-tl-bege/65 text-tl-marrom border-tl-marrom/14 hover:border-tl-laranja'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetBookCategory(book.id, snapshot, 'lendo');
                }}
                title="Lendo Atualmente"
                aria-label="Mover para Lendo Atualmente"
                className={`p-2 rounded-full border text-xs cursor-pointer transition-colors disabled:opacity-50 ${
                  currentStatus === 'lendo'
                    ? 'bg-tl-laranja text-tl-creme border-tl-terracota'
                    : 'bg-tl-bege/65 text-tl-marrom border-tl-marrom/14 hover:border-tl-laranja'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetBookCategory(book.id, snapshot, 'ja_li');
                }}
                title="Já Li"
                aria-label="Mover para Já Li"
                className={`p-2 rounded-full border text-xs cursor-pointer transition-colors disabled:opacity-50 ${
                  currentStatus === 'ja_li'
                    ? 'bg-tl-laranja text-tl-creme border-tl-terracota'
                    : 'bg-tl-bege/65 text-tl-marrom border-tl-marrom/14 hover:border-tl-laranja'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetBookCategory(book.id, snapshot, 'abandonado');
                }}
                title="Abandonados"
                aria-label="Mover para Abandonados"
                className={`p-2 rounded-full border text-xs cursor-pointer transition-colors disabled:opacity-50 ${
                  currentStatus === 'abandonado'
                    ? 'bg-tl-marrom text-tl-creme border-tl-marrom'
                    : 'bg-tl-bege/65 text-tl-marrom border-tl-marrom/14 hover:border-tl-marrom/40'
                }`}
              >
                <BookmarkX className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              disabled={isBusy}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleBookFavorite(book.id, snapshot, isFavorited);
              }}
              title={isFavorited ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
              aria-label={isFavorited ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
              className={`p-2 rounded-full border text-xs cursor-pointer transition-colors disabled:opacity-50 ${
                isFavorited
                  ? 'bg-tl-terracota text-tl-creme border-tl-terracota'
                  : 'bg-tl-bege/65 text-tl-marrom border-tl-marrom/14 hover:border-tl-terracota'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>
      </article>
    );
  }

  function renderShelfCard(entry: MediaShelfEntry) {
    const rev = getMyReview(entry.workId);
    const currentStatus = (entry.status as BookShelfStatus | null) ?? null;
    const isBusy = Boolean(busyWorkIds[entry.workId]);
    const snapshot = entry.workSnapshot;

    return (
      <article
        key={entry.id}
        className="autumn-glow-card group rounded-3xl bg-tl-creme border border-tl-marrom/14 overflow-hidden flex flex-col justify-between editorial-shadow editorial-card-lift"
      >
        <div>
          <div
            onClick={() => onOpenWork(entry.workId)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onOpenWork(entry.workId)}
            className="autumn-glow-image relative aspect-[2/3] bg-tl-bege border-b border-tl-marrom/10 cursor-pointer"
          >
            <CatalogCover
              src={snapshot.coverUrl}
              title={snapshot.title}
              creator={snapshot.creator}
              year={snapshot.year}
              mediaKind="livro"
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />

            {currentStatus && (
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-full bg-tl-creme/92 text-tl-terracota border border-tl-marrom/15 text-[10px] font-semibold backdrop-blur-xs">
                {BOOK_SHELF_LABELS[currentStatus]}
              </div>
            )}

            {rev && (
              <div className="absolute bottom-2.5 left-2.5 px-2.5 py-1 rounded-full bg-tl-marrom/88 text-tl-creme text-[11px] font-bold flex items-center gap-1 tabular-nums">
                <Star className="w-3 h-3 fill-current text-tl-laranja" />
                {rev.rating.toFixed(1)}/10
              </div>
            )}
          </div>

          <div
            onClick={() => onOpenWork(entry.workId)}
            className="p-4 space-y-1 cursor-pointer"
          >
            <h3 className="font-editorial text-lg font-semibold text-tl-marrom line-clamp-2 group-hover:text-tl-terracota">
              {snapshot.title}
            </h3>
            <p className="text-xs text-tl-marrom-suave truncate">{snapshot.creator}</p>
            {snapshot.year && (
              <p className="text-[11px] text-tl-marrom-suave/80">{snapshot.year}</p>
            )}
          </div>
        </div>

        <div className="px-4 pb-4 pt-2.5 border-t border-tl-marrom/10 space-y-2.5">
          {/* Primary reading progression action */}
          {currentStatus === 'lendo' ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={(e) => {
                e.stopPropagation();
                handleSetBookCategory(entry.workId, snapshot, 'ja_li');
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-tl-terracota text-tl-creme text-xs font-semibold hover:bg-tl-marrom transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Finalizar leitura</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={isBusy}
              onClick={(e) => {
                e.stopPropagation();
                handleSetBookCategory(entry.workId, snapshot, 'lendo');
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full bg-tl-laranja text-tl-creme text-xs font-semibold hover:bg-tl-terracota transition-colors cursor-pointer disabled:opacity-50"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Iniciar leitura</span>
            </button>
          )}

          {/* Transfer between all categories */}
          <div className="flex items-center gap-1.5">
            <div className="relative flex-1 min-w-0">
              <ArrowRightLeft className="w-3 h-3 text-tl-marrom-suave absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                aria-label={`Transferir ${snapshot.title} de categoria`}
                disabled={isBusy}
                value={currentStatus || ''}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    handleSetBookCategory(entry.workId, snapshot, null);
                  } else {
                    handleSetBookCategory(
                      entry.workId,
                      snapshot,
                      val as BookShelfStatus
                    );
                  }
                }}
                className="w-full rounded-full bg-tl-bege/65 border border-tl-marrom/16 pl-7 pr-2.5 py-1.5 text-[11px] font-medium text-tl-marrom cursor-pointer focus:outline-none focus:border-tl-laranja disabled:opacity-50"
              >
                {!currentStatus && (
                  <option value="">Mover para categoria…</option>
                )}
                {BOOK_SHELF_ORDER.map((statusKey) => (
                  <option key={statusKey} value={statusKey}>
                    {BOOK_SHELF_LABELS[statusKey]}
                  </option>
                ))}
                {currentStatus && <option value="">Remover da estante</option>}
              </select>
            </div>

            <button
              type="button"
              disabled={isBusy}
              onClick={(e) => {
                e.stopPropagation();
                handleToggleBookFavorite(entry.workId, snapshot, entry.isFavorite);
              }}
              title={entry.isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'}
              aria-label={
                entry.isFavorite ? 'Remover dos Favoritos' : 'Adicionar aos Favoritos'
              }
              className={`p-1.5 rounded-full border cursor-pointer transition-colors shrink-0 disabled:opacity-50 ${
                entry.isFavorite
                  ? 'bg-tl-terracota text-tl-creme border-tl-terracota'
                  : 'bg-tl-bege/65 text-tl-marrom border-tl-marrom/16 hover:border-tl-terracota'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${entry.isFavorite ? 'fill-current' : ''}`} />
            </button>

            {currentStatus && activeTab !== 'favoritos' && (
              <button
                type="button"
                disabled={isBusy}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSetBookCategory(entry.workId, snapshot, null);
                }}
                title="Remover desta categoria"
                aria-label="Remover desta categoria"
                className="p-1.5 rounded-full border bg-tl-bege/65 text-tl-marrom-suave border-tl-marrom/16 hover:text-tl-terracota hover:border-tl-terracota/40 cursor-pointer transition-colors shrink-0 disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 pt-6 pb-28 space-y-8">
      {/* Header */}
      <header className="space-y-6">
        <TabEditorialHero
          imageUrl="/assets/aistudio/5abfe0b2a2030793bd9721d11ce82ae6_7e075b5d.jpg"
          imageAlt="Estante aconchegante com pilhas de livros clássicos e romances"
          objectPositionClass="object-center"
          kickerIcon={<Library className="w-3.5 h-3.5 text-[#F2B880]" />}
          kicker="Biblioteca Literária · Thinklive"
          title="Livros"
          phrase="“Páginas sublinhadas, estantes vivas e histórias que acompanham cada estação do ano.”"
          metaText={`${dedupedShelves.length} ${dedupedShelves.length === 1 ? 'livro na estante' : 'livros na estante'}`}
        />

        {/* Shelf & Catalog Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'catalogo' as BooksSubTab, label: 'Explorar biblioteca' },
            {
              id: 'quero_ler' as BooksSubTab,
              label: `Quero Ler (${wantToRead.length})`,
            },
            {
              id: 'lendo' as BooksSubTab,
              label: `Lendo Atualmente (${readingNow.length})`,
            },
            {
              id: 'ja_li' as BooksSubTab,
              label: `Já Li (${finished.length})`,
            },
            {
              id: 'abandonado' as BooksSubTab,
              label: `Abandonados (${abandoned.length})`,
            },
            {
              id: 'favoritos' as BooksSubTab,
              label: `Favoritos (${favorites.length})`,
            },
            {
              id: 'minhas_avaliacoes' as BooksSubTab,
              label: `Minhas avaliações${currentUser ? ` (${myReviews.length})` : ''}`,
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
          {/* Search by Title & Author + Genre/Popularity Filters */}
          <section className="rounded-3xl bg-tl-creme border border-tl-marrom/15 p-5 space-y-4 editorial-shadow">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-tl-marrom-suave absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={
                    searchMode === 'author'
                      ? 'Pesquisar por autor (ex.: Clarice Lispector, Machado de Assis, Elena Ferrante)…'
                      : searchMode === 'title'
                      ? 'Pesquisar por título do livro (ex.: Dom Casmurro, Torto Arado, Duna)…'
                      : 'Pesquisar livro por título ou autor…'
                  }
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

              <select
                aria-label="Modo de pesquisa"
                value={searchMode}
                onChange={(e) => setSearchMode(e.target.value as 'all' | 'title' | 'author')}
                className="rounded-full bg-tl-bege/55 border border-tl-marrom/18 px-4 py-2.5 text-xs font-medium text-tl-marrom cursor-pointer"
              >
                <option value="all">Título ou autor</option>
                <option value="title">Somente título</option>
                <option value="author">Somente autor</option>
              </select>

              <button
                type="submit"
                className="autumn-glow-btn px-6 py-2.5 rounded-full bg-tl-laranja text-tl-creme text-xs font-semibold hover:bg-tl-terracota cursor-pointer"
              >
                Buscar livro
              </button>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <select
                aria-label="Filtrar por gênero literário"
                value={genreFilter}
                onChange={(e) => setGenreFilter(e.target.value)}
                className="rounded-full bg-tl-bege/55 border border-tl-marrom/18 px-4 py-2 text-xs font-medium text-tl-marrom cursor-pointer"
              >
                {BOOK_GENRE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g === 'Todos' ? 'Gênero: Todos os gêneros' : g}
                  </option>
                ))}
              </select>

              <select
                aria-label="Ordenar livros"
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
              {!appliedQuery && genreFilter === 'Todos' && featured.length > 0 && (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-editorial text-2xl md:text-3xl font-semibold text-tl-marrom flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-tl-laranja" />
                      <span>Destaques da estante</span>
                    </h2>
                    <span className="text-xs text-tl-marrom-suave">Leituras populares</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {featured.slice(0, 4).map(renderBookCard)}
                  </div>
                </section>
              )}

              <section className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-editorial text-2xl md:text-3xl font-semibold text-tl-marrom">
                    {appliedQuery
                      ? `Resultados para “${appliedQuery}”`
                      : genreFilter === 'Todos'
                      ? 'Acervo literário'
                      : genreFilter}
                  </h2>
                  <span className="text-xs text-tl-marrom-suave tabular-nums">
                    {items.length} {items.length === 1 ? 'livro encontrado' : 'livros encontrados'}
                  </span>
                </div>

                {items.length === 0 ? (
                  <div className="rounded-3xl bg-tl-creme border border-tl-marrom/14 p-10 text-center space-y-3">
                    <p className="text-sm text-tl-marrom">
                      Nenhum livro encontrado para esta busca ou filtro.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        handleClearSearch();
                        setGenreFilter('Todos');
                      }}
                      className="autumn-glow-surface px-4 py-2 rounded-full bg-tl-bege text-xs font-medium text-tl-marrom border border-tl-marrom/15 cursor-pointer"
                    >
                      Mostrar acervo completo
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                    {items.map(renderBookCard)}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* Personal Bookshelf Tabs */}
      {activeTab !== 'catalogo' && (
        <section className="space-y-5">
          {activeTab === 'minhas_avaliacoes' ? (
            !currentUser ? (
              <div className="rounded-3xl bg-tl-creme border border-tl-marrom/16 p-8 text-center space-y-4 editorial-shadow">
                <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
                  Suas avaliações literárias
                </h2>
                <p className="text-sm text-tl-marrom-suave max-w-md mx-auto">
                  Entre na sua conta Thinklive para registrar avaliações de 0 a 10 e resenhas
                  pessoais em seu perfil.
                </p>
                <button
                  type="button"
                  onClick={onRequireAuth}
                  className="autumn-glow-btn px-6 py-2.5 rounded-full bg-tl-laranja text-tl-creme text-xs font-semibold cursor-pointer"
                >
                  Entrar na minha conta
                </button>
              </div>
            ) : myReviews.length === 0 ? (
              <div className="rounded-3xl bg-tl-creme border border-tl-marrom/14 p-10 text-center space-y-3">
                <p className="text-sm text-tl-marrom-suave">
                  Você ainda não avaliou nenhum livro. Abra qualquer obra do acervo para registrar
                  sua nota de 0 a 10 e resenha pessoal.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('catalogo')}
                  className="autumn-glow-btn px-5 py-2 rounded-full bg-tl-laranja text-tl-creme text-xs font-medium cursor-pointer"
                >
                  Explorar biblioteca
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
                        mediaKind="livro"
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
                        {rev.workSnapshot.creator}
                        {rev.workSnapshot.year ? ` · ${rev.workSnapshot.year}` : ''}
                      </p>
                      {rev.review ? (
                        <p className="text-xs text-tl-marrom leading-relaxed line-clamp-3">
                          {rev.review}
                        </p>
                      ) : (
                        <p className="text-xs italic text-tl-marrom-suave">
                          Nota registrada sem texto. Clique para escrever sua resenha.
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
                activeTab === 'quero_ler'
                  ? wantToRead
                  : activeTab === 'lendo'
                  ? readingNow
                  : activeTab === 'ja_li'
                  ? finished
                  : activeTab === 'abandonado'
                  ? abandoned
                  : favorites;

              const sectionTitle =
                activeTab === 'favoritos'
                  ? 'Favoritos'
                  : BOOK_SHELF_LABELS[activeTab as BookShelfStatus];

              return (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-editorial text-2xl md:text-3xl font-semibold text-tl-marrom">
                        {sectionTitle}
                      </h2>
                      <p className="text-xs text-tl-marrom-suave">
                        {list.length}{' '}
                        {list.length === 1 ? 'livro nesta categoria' : 'livros nesta categoria'}
                      </p>
                    </div>

                    {!currentUser && (
                      <button
                        type="button"
                        onClick={onRequireAuth}
                        className="autumn-glow-surface px-4 py-1.5 rounded-full bg-tl-bege/80 border border-tl-marrom/15 text-[11px] font-medium text-tl-marrom hover:border-tl-laranja cursor-pointer"
                      >
                        Salvo neste navegador · Entrar para sincronizar na conta
                      </button>
                    )}
                  </div>

                  {list.length === 0 ? (
                    <div className="rounded-3xl bg-tl-creme border border-tl-marrom/14 p-10 text-center space-y-3">
                      <p className="text-sm text-tl-marrom-suave">
                        {
                          CATEGORY_EMPTY_MESSAGES[
                            activeTab as Exclude<BooksSubTab, 'catalogo' | 'minhas_avaliacoes'>
                          ]
                        }
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('catalogo')}
                        className="autumn-glow-btn px-5 py-2 rounded-full bg-tl-laranja text-tl-creme text-xs font-medium cursor-pointer"
                      >
                        Explorar biblioteca
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                      {list.map(renderShelfCard)}
                    </div>
                  )}
                </div>
              );
            })()
          )}
        </section>
      )}

      {/* Community Literary Posts */}
      {relatedPosts.length > 0 && (
        <section className="pt-4 border-t border-tl-marrom/14 space-y-5">
          <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
            Resenhas e textos da comunidade em Livros
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
