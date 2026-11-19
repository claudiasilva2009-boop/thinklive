import {
  Bookmark,
  CornerDownRight,
  Flag,
  Headphones,
  Heart,
  Pause,
  Share2,
  Star,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { AMBIENT_SOUND_OPTIONS } from '../lib/ambientAudio';
import { api, formatRelativeDate } from '../lib/api';
import { AmbientSoundId, CommentWithAuthor, PostWithAuthor, Shelf, UserPublic } from '../types/thinklive';
import { useAmbientSound } from './AmbientSoundContext';
import { BotanicalDivider } from './CreativeStickers';
import { ImageWithFallback, UserAvatar } from './ImageWithFallback';
import { SpotifyItemEmbed } from './SpotifyItemEmbed';

interface PostDetailModalProps {
  postId: string | null;
  currentUser: UserPublic | null;
  onClose: () => void;
  onOpenAuthor: (username: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleFavorite: (postId: string) => void;
  onShare: (post: PostWithAuthor) => void;
  onRequireAuth: () => void;
  onReport: (targetType: 'post' | 'comment', targetId: string, label: string) => void;
  onShelfUpdated?: () => void;
}

export function PostDetailModal({
  postId,
  currentUser,
  onClose,
  onOpenAuthor,
  onToggleLike,
  onToggleFavorite,
  onShare,
  onRequireAuth,
  onReport,
  onShelfUpdated,
}: PostDetailModalProps) {
  const [post, setPost] = useState<PostWithAuthor | null>(null);
  const [comments, setComments] = useState<CommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<CommentWithAuthor | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [myShelves, setMyShelves] = useState<Shelf[]>([]);
  const [shelfAddedMsg, setShelfAddedMsg] = useState('');
  const [likeAnim, setLikeAnim] = useState(false);
  const [saveAnim, setSaveAnim] = useState(false);
  const [poemSoundDrawerOpen, setPoemSoundDrawerOpen] = useState(false);

  const {
    poemPlaying,
    poemSoundId,
    poemVolume,
    togglePoemAtmosphere,
    selectPoemSound,
    setPoemVolume,
    stopPoemAtmosphere,
  } = useAmbientSound();

  useEffect(() => {
    if (!postId) {
      stopPoemAtmosphere();
      setPoemSoundDrawerOpen(false);
      return;
    }
    setLoading(true);
    api
      .getPost(postId)
      .then((res) => {
        setPost(res.post);
        setComments(res.comments);
        if (res.post.type !== 'poema') {
          stopPoemAtmosphere();
        } else if (res.post.ambientSoundId) {
          selectPoemSound(res.post.ambientSoundId);
        }
      })
      .finally(() => setLoading(false));

    if (currentUser) {
      api.getShelves(currentUser.id).then((res) => setMyShelves(res.shelves)).catch(() => {});
    }
  }, [postId, currentUser, stopPoemAtmosphere, selectPoemSound]);

  useEffect(() => {
    return () => {
      stopPoemAtmosphere();
    };
  }, [stopPoemAtmosphere]);

  if (!postId) return null;

  async function handleCommentSubmit(e: FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!newComment.trim() || !post) return;
    setSubmitting(true);
    try {
      const res = await api.addComment(post.id, newComment, replyTo?.id || null);
      setComments(res.comments);
      setNewComment('');
      setReplyTo(null);
      setPost((prev) => (prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : prev));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      const res = await api.deleteComment(commentId);
      setComments(res.comments);
    } catch {
      // ignore
    }
  }

  async function handleAddToShelf(shelfId: string) {
    if (!post) return;
    try {
      await api.addShelfItem(shelfId, {
        title: post.title,
        subtitle: `${post.author.displayName} · ${post.category}`,
        kind:
          post.type === 'poema'
            ? 'poema'
            : post.type === 'artigo' || post.type === 'cronica'
            ? 'artigo'
            : post.type === 'fotografia'
            ? 'fotografia'
            : post.reviewMeta?.mediaType === 'livro'
            ? 'livro'
            : post.reviewMeta?.mediaType === 'filme'
            ? 'filme'
            : post.reviewMeta?.mediaType === 'album'
            ? 'musica'
            : 'publicacao',
        coverUrl: post.coverImage || '',
        refId: post.id,
      });
      onShelfUpdated?.();
      setShelfAddedMsg('Adicionado à sua estante.');
      setTimeout(() => setShelfAddedMsg(''), 2500);
    } catch {
      // ignore
    }
  }

  async function handleLocalLike() {
    if (!post) return;
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 320);
    onToggleLike(post.id);
    setPost((prev) =>
      prev
        ? {
            ...prev,
            isLiked: !prev.isLiked,
            likesCount: prev.isLiked ? prev.likesCount - 1 : prev.likesCount + 1,
          }
        : prev
    );
  }

  async function handleLocalFav() {
    if (!post) return;
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    setSaveAnim(true);
    setTimeout(() => setSaveAnim(false), 320);
    onToggleFavorite(post.id);
    setPost((prev) => (prev ? { ...prev, isSaved: !prev.isSaved } : prev));
  }

  function renderComment(cmt: CommentWithAuthor, depth = 0) {
    const canDelete = currentUser && (currentUser.id === cmt.authorId || currentUser.id === post?.authorId);
    return (
      <div key={cmt.id} className={depth > 0 ? 'ml-6 md:ml-9 mt-3 pt-3 border-t border-tl-areia/60' : 'py-3.5 border-b border-tl-areia/60'}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserAvatar src={cmt.author.avatarUrl} name={cmt.author.displayName} size="sm" />
            <div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAuthor(cmt.author.username);
                }}
                className="text-xs font-semibold text-tl-marrom hover:text-tl-terracota cursor-pointer"
              >
                {cmt.author.displayName}
              </button>
              <span className="text-[11px] text-tl-marrom-suave ml-2">{formatRelativeDate(cmt.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setReplyTo(cmt)}
              className="text-[11px] text-tl-marrom-suave hover:text-tl-terracota flex items-center gap-1 cursor-pointer"
            >
              <CornerDownRight className="w-3 h-3" />
              Responder
            </button>
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDeleteComment(cmt.id)}
                className="text-[11px] text-tl-terracota hover:underline cursor-pointer"
                title="Excluir comentário"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        <p className="font-literary text-sm text-tl-marrom/90 mt-1.5 leading-relaxed pl-9">{cmt.content}</p>
        {cmt.replies.map((reply) => renderComment(reply, depth + 1))}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-tl-marrom/55 backdrop-blur-sm flex items-center justify-center p-0 md:p-6">
      <div className="bg-tl-creme w-full max-w-3xl h-full md:h-auto md:max-h-[90vh] md:rounded-3xl border border-tl-marrom/18 editorial-shadow flex flex-col overflow-hidden">
        <div className="px-5 py-3.5 border-b border-tl-areia/70 flex items-center justify-between bg-tl-bege/70">
          <span className="text-xs font-semibold uppercase tracking-widest text-tl-terracota">
            {post ? post.category : 'Leitura'}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar leitura"
            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-tl-marrom hover:bg-tl-areia/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 md:px-10 py-6 md:py-8">
          {loading || !post ? (
            <div className="py-16 text-center text-sm text-tl-marrom-suave">Abrindo leitura…</div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="flex items-center justify-between gap-4 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthor(post.author.username);
                  }}
                  className="flex items-center gap-3 text-left cursor-pointer group"
                >
                  <UserAvatar src={post.author.avatarUrl} name={post.author.displayName} size="lg" />
                  <div>
                    <div className="font-editorial text-lg font-semibold text-tl-marrom group-hover:text-tl-terracota">
                      {post.author.displayName}
                    </div>
                    <div className="text-xs text-tl-marrom-suave">
                      @{post.author.username} · {new Date(post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </button>

                {currentUser && currentUser.id !== post.authorId && (
                  <button
                    type="button"
                    onClick={() => onReport('post', post.id, post.title)}
                    className="text-xs text-tl-marrom-suave hover:text-tl-terracota flex items-center gap-1 cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    Denunciar
                  </button>
                )}
              </div>

              {post.reviewMeta && (
                <div className="mb-5 p-4 rounded-2xl bg-tl-bege/65 border border-tl-marrom/14 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-widest text-tl-terracota">Obra avaliada</div>
                    <div className="font-editorial text-xl font-semibold text-tl-marrom">
                      {post.reviewMeta.workTitle}
                    </div>
                    <div className="text-xs text-tl-marrom-suave">
                      {post.reviewMeta.creator} {post.reviewMeta.year ? `· ${post.reviewMeta.year}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-base font-semibold text-tl-terracota tabular-nums">
                    <Star className="w-4 h-4 fill-tl-laranja text-tl-laranja" />
                    <span>{post.reviewMeta.rating.toFixed(1)} / 5</span>
                  </div>
                </div>
              )}

              <h1 className="font-editorial text-3xl md:text-4xl font-semibold text-tl-marrom leading-tight mb-2 text-balance">
                {post.title}
              </h1>
              <BotanicalDivider className="w-24 h-3 text-tl-laranja mb-3" />
              {post.subtitle && (
                <p className="font-literary text-base md:text-lg text-tl-marrom-suave leading-relaxed mb-6">{post.subtitle}</p>
              )}

              {post.coverImage && (
                <figure className="my-6">
                  <div className="autumn-glow-image rounded-2xl overflow-hidden border border-tl-marrom/14">
                    <ImageWithFallback
                      src={post.coverImage}
                      alt={post.title}
                      fallbackLabel={post.title}
                      className="w-full max-h-[420px] object-cover"
                    />
                  </div>
                  {post.imageCaption && (
                    <figcaption className="text-xs italic text-tl-marrom-suave mt-2">
                      {post.imageCaption}
                    </figcaption>
                  )}
                </figure>
              )}

              {post.type === 'poema' && (
                <div className="mt-5 rounded-2xl bg-tl-bege/70 border border-tl-marrom/14 p-3.5 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          togglePoemAtmosphere();
                          if (!poemPlaying) setPoemSoundDrawerOpen(true);
                        }}
                        className={`px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-2 cursor-pointer transition-colors ${
                          poemPlaying
                            ? 'bg-tl-laranja text-tl-creme hover:bg-tl-terracota'
                            : 'bg-tl-marrom text-tl-creme hover:bg-tl-terracota'
                        }`}
                      >
                        {poemPlaying ? <Pause className="w-3.5 h-3.5" /> : <Headphones className="w-3.5 h-3.5" />}
                        <span>{poemPlaying ? 'Pausar atmosfera' : 'Ouvir com atmosfera'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPoemSoundDrawerOpen((v) => !v)}
                        className="px-3 py-1.5 rounded-full text-xs font-medium bg-tl-creme border border-tl-marrom/15 text-tl-marrom hover:border-tl-laranja cursor-pointer"
                      >
                        {AMBIENT_SOUND_OPTIONS.find((o) => o.id === poemSoundId)?.label || 'Escolher som'}
                      </button>

                      {poemPlaying && (
                        <button
                          type="button"
                          onClick={stopPoemAtmosphere}
                          className="px-2.5 py-1.5 rounded-full text-[11px] font-medium text-tl-terracota hover:bg-tl-creme cursor-pointer"
                        >
                          Desligar
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2 min-w-[130px]">
                      {poemVolume === 0 || !poemPlaying ? (
                        <VolumeX className="w-3.5 h-3.5 text-tl-marrom-suave shrink-0" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5 text-tl-laranja shrink-0" />
                      )}
                      <input
                        type="range"
                        aria-label="Volume da atmosfera do poema"
                        min={0}
                        max={1}
                        step={0.02}
                        value={poemVolume}
                        onChange={(e) => setPoemVolume(Number(e.target.value))}
                        className="w-24 sm:w-28 accent-tl-laranja cursor-pointer"
                      />
                    </div>
                  </div>

                  {poemSoundDrawerOpen && (
                    <div className="pt-2 border-t border-tl-areia/70 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {AMBIENT_SOUND_OPTIONS.map((opt) => {
                        const active = poemSoundId === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => selectPoemSound(opt.id as AmbientSoundId)}
                            className={`px-2.5 py-1.5 rounded-xl border text-[11px] text-left cursor-pointer transition-colors ${
                              active
                                ? 'bg-tl-creme border-tl-laranja text-tl-terracota font-semibold'
                                : 'bg-tl-creme/60 border-tl-marrom/10 text-tl-marrom-suave hover:text-tl-marrom'
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div
                className={`mt-6 text-tl-marrom leading-[1.82] space-y-4 ${
                  post.type === 'poema'
                    ? 'font-literary italic text-lg whitespace-pre-line text-center py-7 px-6 bg-tl-bege/55 border border-tl-areia rounded-2xl'
                    : 'font-literary text-base md:text-[17px] editorial-dropcap whitespace-pre-line'
                }`}
              >
                {post.content}
              </div>

              {post.spotifyItem && (
                <div className="mt-6">
                  <SpotifyItemEmbed item={post.spotifyItem} />
                </div>
              )}

              <div className="mt-8 py-4 border-y border-tl-areia/70 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleLocalLike}
                    className={`autumn-glow-surface px-3 py-1.5 rounded-full border border-transparent flex items-center gap-1.5 text-sm active:scale-90 cursor-pointer ${
                      post.isLiked ? 'bg-tl-bege text-tl-terracota font-semibold' : 'text-tl-marrom-suave hover:bg-tl-bege/65'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${post.isLiked ? 'fill-tl-laranja text-tl-laranja' : ''} ${likeAnim ? 'animate-tap-pop' : ''}`} />
                    <span className="tabular-nums">{post.likesCount} curtidas</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLocalFav}
                    className={`autumn-glow-surface px-3 py-1.5 rounded-full border border-transparent flex items-center gap-1.5 text-sm active:scale-90 cursor-pointer ${
                      post.isSaved ? 'bg-tl-areia/60 text-tl-terracota font-semibold' : 'text-tl-marrom-suave hover:bg-tl-bege/65'
                    }`}
                  >
                    <Bookmark className={`w-4 h-4 ${post.isSaved ? 'fill-tl-laranja text-tl-laranja' : ''} ${saveAnim ? 'animate-tap-pop' : ''}`} />
                    <span>{post.isSaved ? 'Salvo nos favoritos' : 'Favoritar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onShare(post)}
                    className="autumn-glow-surface px-3 py-1.5 rounded-full border border-transparent flex items-center gap-1.5 text-sm text-tl-marrom-suave hover:bg-tl-bege/65 active:scale-95 cursor-pointer"
                  >
                    <Share2 className="w-4 h-4" />
                    <span>Compartilhar</span>
                  </button>
                </div>

                {currentUser && myShelves.length > 0 && (
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Adicionar à minha estante"
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddToShelf(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className="text-xs bg-tl-bege border border-tl-marrom/18 rounded-full px-3 py-1.5 text-tl-marrom font-medium"
                    >
                      <option value="" disabled>
                        + Guardar na estante…
                      </option>
                      {myShelves.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                    {shelfAddedMsg && <span className="text-xs font-semibold text-tl-terracota">{shelfAddedMsg}</span>}
                  </div>
                )}
              </div>

              <section className="mt-8">
                <h2 className="font-editorial text-2xl font-semibold text-tl-marrom mb-4">
                  Diálogo e comentários ({comments.length})
                </h2>

                <form onSubmit={handleCommentSubmit} className="mb-6">
                  {replyTo && (
                    <div className="mb-2 flex items-center justify-between text-xs bg-tl-bege px-3.5 py-1.5 rounded-full">
                      <span>
                        Respondendo a <strong>{replyTo.author.displayName}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setReplyTo(null)}
                        className="text-tl-marrom-suave hover:text-tl-terracota cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={
                      currentUser
                        ? 'Compartilhe uma reflexão ou comentário…'
                        : 'Entre na sua conta para comentar e responder…'
                    }
                    rows={3}
                    className="w-full rounded-2xl bg-tl-bege/55 border border-tl-marrom/16 p-3.5 text-sm text-tl-marrom placeholder:text-tl-marrom-suave/65 focus:outline-none focus:border-tl-laranja"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={submitting || !newComment.trim()}
                      className="autumn-glow-btn px-5 py-2 text-xs font-medium bg-tl-laranja text-tl-creme border border-tl-terracota/20 rounded-full hover:bg-tl-terracota disabled:opacity-40 cursor-pointer"
                    >
                      {submitting ? 'Enviando…' : replyTo ? 'Enviar resposta' : 'Comentar'}
                    </button>
                  </div>
                </form>

                {comments.length === 0 ? (
                  <p className="text-sm text-tl-marrom-suave py-6 text-center">
                    Ainda não há comentários nesta publicação. Inicie a conversa.
                  </p>
                ) : (
                  <div>{comments.map((c) => renderComment(c))}</div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
