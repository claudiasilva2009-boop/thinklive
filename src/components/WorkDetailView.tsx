import {
  ArrowLeft,
  Bookmark,
  BookmarkX,
  BookOpen,
  Calendar,
  Check,
  Clock,
  Edit3,
  Heart,
  MessageSquare,
  RefreshCw,
  Send,
  Star,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api, formatRelativeDate } from '../lib/api';
import {
  isSameBookEntry,
  readGuestBookShelves,
  upsertGuestBookShelf,
} from '../lib/bookLibrary';
import {
  BookShelfStatus,
  CatalogWork,
  MediaCommentEnriched,
  MediaReviewEnriched,
  MediaShelfEntry,
  MediaShelfStatus,
  MovieShelfStatus,
  UserPublic,
} from '../types/thinklive';
import { AgeRatingBadge, CatalogCover, mediaKindLabel, workToSnapshot } from './CatalogCover';
import { UserAvatar } from './ImageWithFallback';

interface WorkDetailViewProps {
  workId: string;
  backLabel?: string;
  currentUser: UserPublic | null;
  onBack: () => void;
  onOpenAuthor: (username: string) => void;
  onRequireAuth: () => void;
  onNotify?: (message: string) => void;
  onLibraryChanged?: () => void;
}

const MOVIE_SHELF_OPTIONS: { id: MovieShelfStatus; label: string; icon: typeof Clock }[] = [
  { id: 'quero_assistir', label: 'Quero assistir', icon: Bookmark },
  { id: 'ja_assistido', label: 'Já assisti', icon: Check },
];

const BOOK_SHELF_OPTIONS: { id: BookShelfStatus; label: string; icon: typeof Clock }[] = [
  { id: 'quero_ler', label: 'Quero Ler', icon: Bookmark },
  { id: 'lendo', label: 'Lendo Atualmente', icon: BookOpen },
  { id: 'ja_li', label: 'Já Li', icon: Check },
  { id: 'abandonado', label: 'Abandonados', icon: BookmarkX },
];

export function WorkDetailView({
  workId,
  backLabel = 'Voltar ao catálogo',
  currentUser,
  onBack,
  onOpenAuthor,
  onRequireAuth,
  onNotify,
  onLibraryChanged,
}: WorkDetailViewProps) {
  const [work, setWork] = useState<CatalogWork | null>(null);
  const [reviews, setReviews] = useState<MediaReviewEnriched[]>([]);
  const [comments, setComments] = useState<MediaCommentEnriched[]>([]);
  const [myReview, setMyReview] = useState<MediaReviewEnriched | null>(null);
  const [myShelf, setMyShelf] = useState<MediaShelfEntry | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review editor state
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [ratingInput, setRatingInput] = useState<number>(8);
  const [reviewText, setReviewText] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [savingShelf, setSavingShelf] = useState(false);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const loadWork = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCatalogWork(workId);
      setWork(res.work);
      setReviews(res.reviews);
      setComments(res.comments);
      setMyReview(res.myReview);
      if (currentUser) {
        setMyShelf(res.myShelf);
      } else if (res.work.mediaKind === 'livro') {
        const guestMatch =
          readGuestBookShelves().find((entry) =>
            isSameBookEntry(entry, {
              workId: res.work.id,
              title: res.work.title,
              creator: res.work.creator,
              mediaKind: 'livro',
            })
          ) || null;
        setMyShelf(guestMatch);
      } else {
        setMyShelf(null);
      }
      if (res.myReview) {
        setRatingInput(res.myReview.rating);
        setReviewText(res.myReview.review);
        setIsEditingReview(false);
      } else {
        setRatingInput(8);
        setReviewText('');
        setIsEditingReview(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível carregar os detalhes desta obra.');
    } finally {
      setLoading(false);
    }
  }, [workId, currentUser]);

  useEffect(() => {
    loadWork();
  }, [loadWork, currentUser?.id]);

  async function handleSelectShelfStatus(nextStatus: MediaShelfStatus, forceSet = false) {
    if (!work) return;
    if (!currentUser) {
      if (work.mediaKind !== 'livro') {
        onRequireAuth();
        return;
      }
      const next = forceSet
        ? (nextStatus as BookShelfStatus)
        : myShelf?.status === nextStatus
        ? null
        : (nextStatus as BookShelfStatus);
      const { myShelf: updatedGuest } = upsertGuestBookShelf(work.id, workToSnapshot(work), {
        status: next,
      });
      setMyShelf(updatedGuest);
      onLibraryChanged?.();
      onNotify?.(next ? 'Categoria da estante atualizada.' : 'Livro removido desta categoria.');
      return;
    }

    setSavingShelf(true);
    try {
      const targetStatus = forceSet
        ? nextStatus
        : myShelf?.status === nextStatus
        ? null
        : nextStatus;
      const res = await api.updateWorkShelf(work.id, {
        status: targetStatus,
        workSnapshot: workToSnapshot(work),
      });
      setMyShelf(res.myShelf);
      onLibraryChanged?.();
      onNotify?.(targetStatus ? 'Organização pessoal atualizada.' : 'Removido desta lista.');
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Erro ao atualizar lista.');
    } finally {
      setSavingShelf(false);
    }
  }

  async function handleToggleFavorite() {
    if (!work) return;
    if (!currentUser) {
      if (work.mediaKind !== 'livro') {
        onRequireAuth();
        return;
      }
      const nextFav = !(myShelf?.isFavorite ?? false);
      const { myShelf: updatedGuest } = upsertGuestBookShelf(work.id, workToSnapshot(work), {
        isFavorite: nextFav,
      });
      setMyShelf(updatedGuest);
      onLibraryChanged?.();
      onNotify?.(nextFav ? 'Adicionado aos seus Favoritos.' : 'Removido dos Favoritos.');
      return;
    }

    setSavingShelf(true);
    try {
      const nextFav = !(myShelf?.isFavorite ?? false);
      const res = await api.updateWorkShelf(work.id, {
        isFavorite: nextFav,
        workSnapshot: workToSnapshot(work),
      });
      setMyShelf(res.myShelf);
      onLibraryChanged?.();
      onNotify?.(nextFav ? 'Adicionado aos seus Favoritos.' : 'Removido dos Favoritos.');
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Erro ao atualizar favoritos.');
    } finally {
      setSavingShelf(false);
    }
  }

  async function handleSaveReview(e: FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!work) return;
    setSavingReview(true);
    try {
      const res = await api.saveWorkReview(work.id, {
        rating: ratingInput,
        review: reviewText,
        workSnapshot: workToSnapshot(work),
      });
      setReviews(res.reviews);
      setMyReview(res.myReview);
      setWork((prev) =>
        prev
          ? {
              ...prev,
              communityAverage: res.communityAverage,
              communityReviewCount: res.communityReviewCount,
            }
          : prev
      );
      setIsEditingReview(false);
      onLibraryChanged?.();
      onNotify?.(myReview ? 'Avaliação atualizada com sucesso.' : 'Avaliação salva no seu perfil!');
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Erro ao salvar avaliação.');
    } finally {
      setSavingReview(false);
    }
  }

  async function handleDeleteReview() {
    if (!currentUser || !work) return;
    setSavingReview(true);
    try {
      const res = await api.deleteWorkReview(work.id);
      setReviews(res.reviews);
      setMyReview(null);
      setRatingInput(8);
      setReviewText('');
      setIsEditingReview(true);
      setWork((prev) =>
        prev
          ? {
              ...prev,
              communityAverage: res.communityAverage,
              communityReviewCount: res.communityReviewCount,
            }
          : prev
      );
      onLibraryChanged?.();
      onNotify?.('Sua avaliação foi excluída.');
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Erro ao excluir avaliação.');
    } finally {
      setSavingReview(false);
    }
  }

  async function handlePostComment(e: FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!work || !commentText.trim()) return;
    setPostingComment(true);
    try {
      const res = await api.addWorkComment(work.id, commentText.trim(), work.mediaKind);
      setComments(res.comments);
      setCommentText('');
      onNotify?.('Comentário publicado.');
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Erro ao enviar comentário.');
    } finally {
      setPostingComment(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!currentUser) return;
    try {
      const res = await api.deleteWorkComment(commentId);
      setComments(res.comments);
      onNotify?.('Comentário removido.');
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Erro ao remover comentário.');
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6 pb-28 space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-medium text-tl-marrom-suave hover:text-tl-terracota cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backLabel}</span>
        </button>
        <div className="rounded-3xl bg-tl-creme border border-tl-marrom/14 p-8 animate-pulse grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8">
          <div className="aspect-[2/3] rounded-2xl bg-tl-bege" />
          <div className="space-y-4">
            <div className="h-4 w-28 bg-tl-bege rounded" />
            <div className="h-9 w-3/4 bg-tl-bege rounded" />
            <div className="h-4 w-1/2 bg-tl-bege rounded" />
            <div className="h-28 w-full bg-tl-bege rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !work) {
    return (
      <div className="max-w-3xl mx-auto px-4 md:px-8 pt-8 pb-28 space-y-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-medium text-tl-marrom-suave hover:text-tl-terracota cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backLabel}</span>
        </button>
        <div className="rounded-3xl bg-tl-creme border border-tl-marrom/18 p-8 text-center space-y-4 editorial-shadow">
          <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
            Não foi possível abrir esta obra
          </h2>
          <p className="text-sm text-tl-marrom-suave">{error || 'Obra não encontrada.'}</p>
          <button
            type="button"
            onClick={loadWork}
            className="autumn-glow-btn inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-tl-laranja text-tl-creme text-xs font-medium cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Tentar novamente</span>
          </button>
        </div>
      </div>
    );
  }

  const shelfOptions = work.mediaKind === 'livro' ? BOOK_SHELF_OPTIONS : MOVIE_SHELF_OPTIONS;
  const isFavorited = myShelf?.isFavorite ?? false;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 pt-6 pb-28 space-y-8">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="autumn-glow-surface inline-flex items-center gap-2 px-4 py-2 rounded-full bg-tl-creme border border-tl-marrom/15 text-xs font-medium text-tl-marrom hover:text-tl-terracota cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>{backLabel}</span>
        </button>

        <span className="text-[11px] uppercase tracking-[0.14em] text-tl-marrom-suave font-medium">
          {mediaKindLabel(work.mediaKind)} · Ficha completa
        </span>
      </div>

      {/* Main Editorial Hero Card */}
      <article className="rounded-3xl bg-tl-creme border border-tl-marrom/15 overflow-hidden editorial-shadow">
        {work.backdropUrl && (
          <div className="h-36 md:h-48 w-full relative overflow-hidden border-b border-tl-marrom/12">
            <img
              src={work.backdropUrl}
              alt=""
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-tl-creme via-tl-creme/30 to-transparent" />
          </div>
        )}

        <div className={`p-6 md:p-8 grid grid-cols-1 md:grid-cols-[240px_1fr] gap-7 ${work.backdropUrl ? '-mt-16 relative z-10' : ''}`}>
          {/* Poster / Cover */}
          <div className="space-y-3">
            <div className="autumn-glow-image aspect-[2/3] w-48 md:w-full mx-auto rounded-2xl overflow-hidden border border-tl-marrom/20 editorial-shadow bg-tl-bege">
              <CatalogCover
                src={work.coverUrl}
                title={work.title}
                creator={work.creator}
                year={work.year}
                mediaKind={work.mediaKind}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Community & External Score */}
            <div className="rounded-2xl bg-tl-bege/75 border border-tl-marrom/14 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-tl-marrom-suave">
                  Média Thinklive
                </span>
                {work.communityAverage !== null ? (
                  <span className="inline-flex items-center gap-1 font-editorial text-xl font-bold text-tl-terracota tabular-nums">
                    <Star className="w-4 h-4 fill-current text-tl-laranja" />
                    {work.communityAverage.toFixed(1)}
                    <span className="text-xs font-normal text-tl-marrom-suave">/ 10</span>
                  </span>
                ) : (
                  <span className="text-xs text-tl-marrom-suave">Sem notas</span>
                )}
              </div>
              <div className="text-[11px] text-tl-marrom-suave flex items-center justify-between">
                <span>
                  {work.communityReviewCount === 0
                    ? 'Seja o primeiro a avaliar'
                    : `${work.communityReviewCount} ${
                        work.communityReviewCount === 1 ? 'avaliação' : 'avaliações'
                      }`}
                </span>
                {work.externalRating ? (
                  <span className="tabular-nums">Ref. externa: {work.externalRating}/10</span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Metadata, Synopsis & Personal Shelves */}
          <div className="space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-tl-bege text-tl-terracota border border-tl-marrom/14">
                  {mediaKindLabel(work.mediaKind)}
                </span>
                {work.year && (
                  <span className="inline-flex items-center gap-1 text-xs text-tl-marrom-suave font-medium">
                    <Calendar className="w-3.5 h-3.5 text-tl-laranja" />
                    {work.year}
                  </span>
                )}
                {work.mediaKind !== 'livro' && <AgeRatingBadge rating={work.ageRating} />}
              </div>

              <h1 className="font-editorial text-3xl md:text-4xl font-semibold text-tl-marrom leading-tight">
                {work.title}
              </h1>
              {work.originalTitle && work.originalTitle.toLowerCase() !== work.title.toLowerCase() && (
                <p className="text-xs italic text-tl-marrom-suave mt-1">
                  Título original: {work.originalTitle}
                </p>
              )}

              <p className="text-sm text-tl-marrom font-medium mt-2 flex items-center gap-1.5">
                <UserIcon className="w-3.5 h-3.5 text-tl-laranja shrink-0" />
                <span>
                  {work.mediaKind === 'livro' ? 'Autoria: ' : work.mediaKind === 'serie' ? 'Produção / Canal: ' : 'Direção / Equipe: '}
                  {work.creator}
                </span>
              </p>

              {(work.publisher || work.pageCount || work.castOrDetails) && (
                <p className="text-xs text-tl-marrom-suave mt-1.5">
                  {[
                    work.publisher ? `Editora: ${work.publisher}` : '',
                    work.pageCount ? `${work.pageCount} páginas` : '',
                    work.castOrDetails ? work.castOrDetails : '',
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>

            {/* Genres */}
            {work.genres.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {work.genres.map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 rounded-full text-xs bg-tl-bege/85 text-tl-marrom border border-tl-marrom/14"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}

            {/* Personal Organization Buttons */}
            <div className="pt-1 space-y-2">
              <div className="text-[11px] uppercase tracking-wider font-semibold text-tl-marrom-suave">
                Organização pessoal
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {shelfOptions.map((opt) => {
                  const active = myShelf?.status === opt.id;
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={savingShelf}
                      onClick={() => handleSelectShelfStatus(opt.id)}
                      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border transition-colors cursor-pointer disabled:opacity-60 ${
                        active
                          ? 'autumn-glow-btn bg-tl-laranja text-tl-creme border-tl-terracota/30'
                          : 'autumn-glow-surface bg-tl-bege/65 text-tl-marrom border-tl-marrom/18 hover:border-tl-laranja/50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}

                <button
                  type="button"
                  disabled={savingShelf}
                  onClick={handleToggleFavorite}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border transition-colors cursor-pointer disabled:opacity-60 ${
                    isFavorited
                      ? 'autumn-glow-btn bg-tl-terracota text-tl-creme border-tl-terracota'
                      : 'autumn-glow-surface bg-tl-bege/65 text-tl-marrom border-tl-marrom/18 hover:border-tl-terracota/50'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${isFavorited ? 'fill-current' : ''}`} />
                  <span>{isFavorited ? 'Nos Favoritos' : 'Favoritos'}</span>
                </button>
              </div>

              {work.mediaKind === 'livro' && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {myShelf?.status !== 'lendo' ? (
                    <button
                      type="button"
                      disabled={savingShelf}
                      onClick={() => handleSelectShelfStatus('lendo', true)}
                      className="autumn-glow-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-tl-laranja text-tl-creme text-xs font-semibold hover:bg-tl-terracota cursor-pointer disabled:opacity-60"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Iniciar leitura</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={savingShelf}
                      onClick={() => handleSelectShelfStatus('ja_li', true)}
                      className="autumn-glow-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-tl-terracota text-tl-creme text-xs font-semibold hover:bg-tl-marrom cursor-pointer disabled:opacity-60"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Finalizar leitura</span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Synopsis */}
            <div className="pt-2 border-t border-tl-marrom/12 space-y-1.5">
              <h2 className="font-editorial text-xl font-semibold text-tl-marrom">Sinopse</h2>
              <p className="text-sm leading-relaxed text-tl-marrom/90 whitespace-pre-line">
                {work.synopsis}
              </p>
            </div>
          </div>
        </div>
      </article>

      {/* Personal Rating (0-10) & Review Editor */}
      <section className="rounded-3xl bg-tl-creme border border-tl-marrom/15 p-6 md:p-7 space-y-5 editorial-shadow">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
              Minha avaliação e resenha
            </h2>
            <p className="text-xs text-tl-marrom-suave mt-0.5">
              Atribua uma nota de 0 a 10 e salve no seu perfil Thinklive.
            </p>
          </div>
          {myReview && !isEditingReview && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditingReview(true)}
                className="autumn-glow-surface inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-tl-bege text-tl-marrom border border-tl-marrom/18 text-xs font-medium cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>
              <button
                type="button"
                disabled={savingReview}
                onClick={handleDeleteReview}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-tl-bege/60 text-tl-terracota border border-tl-terracota/25 text-xs font-medium hover:bg-tl-terracota/10 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir</span>
              </button>
            </div>
          )}
        </div>

        {!currentUser ? (
          <div className="rounded-2xl bg-tl-bege/60 border border-tl-marrom/12 p-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-tl-marrom">
              Entre na sua conta para avaliar de 0 a 10, escrever sua resenha e salvar em suas listas.
            </p>
            <button
              type="button"
              onClick={onRequireAuth}
              className="autumn-glow-btn px-5 py-2 rounded-full bg-tl-laranja text-tl-creme text-xs font-medium cursor-pointer"
            >
              Entrar para avaliar
            </button>
          </div>
        ) : myReview && !isEditingReview ? (
          <div className="rounded-2xl bg-tl-bege/55 border border-tl-marrom/14 p-5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tl-laranja text-tl-creme text-sm font-bold tabular-nums">
                <Star className="w-3.5 h-3.5 fill-current" />
                {myReview.rating.toFixed(1)} / 10
              </span>
              <span className="text-[11px] text-tl-marrom-suave">
                Atualizada {formatRelativeDate(myReview.updatedAt)}
              </span>
            </div>
            {myReview.review ? (
              <p className="text-sm leading-relaxed text-tl-marrom whitespace-pre-line">
                {myReview.review}
              </p>
            ) : (
              <p className="text-xs italic text-tl-marrom-suave">
                Você registrou a nota sem texto de resenha. Clique em “Editar” para escrever suas impressões.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={handleSaveReview} className="space-y-4">
            <div className="rounded-2xl bg-tl-bege/55 border border-tl-marrom/14 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="rating-slider" className="text-xs font-semibold text-tl-marrom uppercase tracking-wider">
                  Sua nota (0 a 10)
                </label>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-tl-laranja text-tl-creme text-sm font-bold tabular-nums">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  {ratingInput.toFixed(1)} / 10
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRatingInput(val)}
                    className={`min-w-[34px] h-8 px-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                      Math.round(ratingInput) === val
                        ? 'bg-tl-laranja text-tl-creme border-tl-terracota'
                        : 'bg-tl-creme text-tl-marrom border-tl-marrom/18 hover:border-tl-laranja'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>

              <input
                id="rating-slider"
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={ratingInput}
                onChange={(e) => setRatingInput(Number(e.target.value))}
                className="w-full accent-tl-laranja cursor-pointer"
              />
            </div>

            <div>
              <label htmlFor="personal-review-textarea" className="block text-xs font-semibold text-tl-marrom mb-1.5">
                Resenha pessoal (opcional)
              </label>
              <textarea
                id="personal-review-textarea"
                rows={4}
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Compartilhe o que achou da direção, narrativa, ritmo ou passagens marcantes…"
                className="w-full rounded-2xl bg-tl-bege/45 border border-tl-marrom/18 px-4 py-3 text-sm text-tl-marrom placeholder:text-tl-marrom-suave/65 focus:outline-none focus:border-tl-laranja"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              {myReview && (
                <button
                  type="button"
                  onClick={() => {
                    setRatingInput(myReview.rating);
                    setReviewText(myReview.review);
                    setIsEditingReview(false);
                  }}
                  className="px-4 py-2 rounded-full text-xs font-medium text-tl-marrom-suave hover:text-tl-marrom cursor-pointer"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={savingReview}
                className="autumn-glow-btn px-5 py-2.5 rounded-full bg-tl-laranja text-tl-creme text-xs font-semibold hover:bg-tl-terracota cursor-pointer disabled:opacity-60"
              >
                {savingReview ? 'Salvando…' : myReview ? 'Atualizar avaliação' : 'Salvar avaliação'}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Individual Community Reviews */}
      <section className="rounded-3xl bg-tl-creme border border-tl-marrom/15 p-6 md:p-7 space-y-5 editorial-shadow">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
            Avaliações da comunidade ({reviews.length})
          </h2>
          {work.communityAverage !== null && (
            <span className="text-xs font-semibold text-tl-terracota tabular-nums">
              Média geral: {work.communityAverage.toFixed(1)} / 10
            </span>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="text-sm text-tl-marrom-suave">
            Nenhuma avaliação registrada por usuários ainda. Sua nota aparecerá aqui e no seu perfil.
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((rev) => (
              <div
                key={rev.id}
                className="rounded-2xl bg-tl-bege/45 border border-tl-marrom/12 p-4 space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenAuthor(rev.author.username)}
                    className="autumn-glow-link flex items-center gap-2.5 text-left cursor-pointer"
                  >
                    <UserAvatar src={rev.author.avatarUrl} name={rev.author.displayName} size="sm" />
                    <div>
                      <div className="text-xs font-semibold text-tl-marrom hover:text-tl-terracota">
                        {rev.author.displayName}
                      </div>
                      <div className="text-[11px] text-tl-marrom-suave">
                        @{rev.author.username} · {formatRelativeDate(rev.updatedAt)}
                      </div>
                    </div>
                  </button>

                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-tl-creme border border-tl-marrom/15 text-xs font-bold text-tl-terracota tabular-nums">
                    <Star className="w-3 h-3 fill-current text-tl-laranja" />
                    {rev.rating.toFixed(1)} / 10
                  </span>
                </div>
                {rev.review && (
                  <p className="text-sm leading-relaxed text-tl-marrom whitespace-pre-line pt-1">
                    {rev.review}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Work Comments */}
      <section className="rounded-3xl bg-tl-creme border border-tl-marrom/15 p-6 md:p-7 space-y-5 editorial-shadow">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-tl-laranja" />
          <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
            Comentários ({comments.length})
          </h2>
        </div>

        <form onSubmit={handlePostComment} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder={
              currentUser
                ? 'Escreva um comentário ou observação sobre esta obra…'
                : 'Entre na sua conta para deixar um comentário…'
            }
            onFocus={() => {
              if (!currentUser) onRequireAuth();
            }}
            className="flex-1 rounded-full bg-tl-bege/50 border border-tl-marrom/18 px-4 py-2.5 text-sm text-tl-marrom placeholder:text-tl-marrom-suave/70 focus:outline-none focus:border-tl-laranja"
          />
          <button
            type="submit"
            disabled={postingComment || !commentText.trim()}
            className="autumn-glow-btn inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-tl-laranja text-tl-creme text-xs font-semibold hover:bg-tl-terracota cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{postingComment ? 'Enviando…' : 'Comentar'}</span>
          </button>
        </form>

        {comments.length === 0 ? (
          <p className="text-xs text-tl-marrom-suave">
            Nenhum comentário publicado nesta página ainda.
          </p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl bg-tl-bege/40 border border-tl-marrom/10 p-3.5 flex items-start justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenAuthor(c.author.username)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <UserAvatar src={c.author.avatarUrl} name={c.author.displayName} size="sm" />
                      <span className="text-xs font-semibold text-tl-marrom hover:text-tl-terracota">
                        {c.author.displayName}
                      </span>
                    </button>
                    <span className="text-[11px] text-tl-marrom-suave">
                      {formatRelativeDate(c.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm text-tl-marrom leading-relaxed break-words">{c.content}</p>
                </div>

                {currentUser?.id === c.userId && (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(c.id)}
                    title="Excluir comentário"
                    className="p-1.5 rounded-lg text-tl-marrom-suave hover:text-tl-terracota hover:bg-tl-bege cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
