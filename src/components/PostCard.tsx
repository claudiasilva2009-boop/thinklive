import {
  Bookmark,
  Flag,
  Headphones,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Share2,
  ShieldBan,
  Star,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { AMBIENT_SOUND_OPTIONS } from '../lib/ambientAudio';
import { formatRelativeDate } from '../lib/api';
import { PostWithAuthor, UserPublic } from '../types/thinklive';
import { BotanicalDivider } from './CreativeStickers';
import { ImageWithFallback, UserAvatar } from './ImageWithFallback';
import { SpotifyItemEmbed } from './SpotifyItemEmbed';

const TYPE_LABELS: Record<string, string> = {
  poema: 'Poema',
  artigo: 'Artigo',
  cronica: 'Crônica',
  fotografia: 'Fotografia',
  resenha: 'Resenha',
  noticia: 'Notícia',
  diario: 'Diário',
  teatro: 'Teatro',
  arte_cultura: 'Arte & Cultura',
  podcast: 'Podcast',
};

interface PostCardProps {
  post: PostWithAuthor;
  currentUser: UserPublic | null;
  onOpenPost: (post: PostWithAuthor) => void;
  onOpenAuthor: (username: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleFavorite: (postId: string) => void;
  onShare: (post: PostWithAuthor) => void;
  onEdit?: (post: PostWithAuthor) => void;
  onDelete?: (postId: string) => void;
  onReport?: (targetType: 'post' | 'user', targetId: string, label: string) => void;
  onBlockUser?: (userId: string, name: string) => void;
  featured?: boolean;
  masonry?: boolean;
}

export function PostCard({
  post,
  currentUser,
  onOpenPost,
  onOpenAuthor,
  onToggleLike,
  onToggleFavorite,
  onShare,
  onEdit,
  onDelete,
  onReport,
  onBlockUser,
  featured = false,
  masonry = false,
}: PostCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [saveAnim, setSaveAnim] = useState(false);
  const isOwner = currentUser?.id === post.authorId;

  const isPoem = post.type === 'poema';
  const isPhoto = post.type === 'fotografia';
  const isDiary = post.type === 'diario';
  const ambientLabel = post.ambientSoundId
    ? AMBIENT_SOUND_OPTIONS.find((o) => o.id === post.ambientSoundId)?.label
    : null;

  const excerpt = isPoem
    ? post.content.split('\n').slice(0, masonry ? 7 : 6).join('\n')
    : post.content.length > (masonry ? 200 : 220)
    ? `${post.content.slice(0, masonry ? 200 : 220).trim()}…`
    : post.content;

  function triggerLike() {
    setLikeAnim(true);
    setTimeout(() => setLikeAnim(false), 320);
    onToggleLike(post.id);
  }

  function triggerSave() {
    setSaveAnim(true);
    setTimeout(() => setSaveAnim(false), 320);
    onToggleFavorite(post.id);
  }

  return (
    <article
      className={`autumn-glow-card group relative border border-tl-marrom/14 rounded-2xl editorial-shadow editorial-card-lift overflow-visible ${
        isDiary ? 'bg-tl-papel' : 'bg-tl-creme'
      } ${masonry ? 'break-inside-avoid mb-5 md:mb-6 inline-block w-full' : ''} ${
        featured ? 'md:grid md:grid-cols-12 md:items-stretch overflow-hidden' : ''
      }`}
    >
      {/* Visual Cover */}
      {post.coverImage && (
        <div
          onClick={() => onOpenPost(post)}
          className={`autumn-glow-image cursor-pointer overflow-hidden bg-tl-bege ${
            featured
              ? 'md:col-span-5 aspect-[4/3] md:aspect-auto'
              : masonry
              ? 'rounded-t-2xl'
              : isPhoto
              ? 'aspect-[4/3] rounded-t-2xl'
              : 'aspect-[16/9] rounded-t-2xl'
          }`}
        >
          <ImageWithFallback
            src={post.coverImage}
            alt={post.title}
            fallbackLabel={post.title}
            className={`w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] ${
              masonry ? 'h-auto max-h-[460px]' : 'h-full'
            }`}
          />
        </div>
      )}

      <div
        className={`relative z-[2] p-5 md:p-6 flex flex-col justify-between ${
          featured && post.coverImage ? 'md:col-span-7 md:p-7' : ''
        }`}
      >
        <div>
          {/* Author + Unboxed Typographic Metadata */}
          <div className="flex items-center justify-between gap-3 mb-3.5">
            <button
              type="button"
              onClick={() => onOpenAuthor(post.author.username)}
              className="autumn-glow-link flex items-center gap-2.5 text-left min-w-0 cursor-pointer group/author"
            >
              <UserAvatar src={post.author.avatarUrl} name={post.author.displayName} size="md" />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-editorial text-[16px] font-semibold text-tl-marrom group-hover/author:text-tl-terracota transition-colors truncate">
                    {post.author.displayName}
                  </span>
                  <span className="text-xs text-tl-marrom-suave truncate">@{post.author.username}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-tl-marrom-suave tracking-wide flex-wrap">
                  <span className="uppercase font-semibold text-tl-terracota">
                    {TYPE_LABELS[post.type] || post.category}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{formatRelativeDate(post.createdAt)}</span>
                  {ambientLabel && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-tl-laranja font-medium">
                        <Headphones className="w-3 h-3" />
                        {ambientLabel}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </button>

            {/* Context menu */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Opções da publicação"
                className="autumn-glow-surface min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-tl-marrom-suave hover:bg-tl-bege hover:text-tl-marrom active:scale-95 cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-tl-creme border border-tl-marrom/18 editorial-shadow rounded-2xl py-1.5 z-30">
                  {isOwner ? (
                    <>
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onEdit(post);
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs text-tl-marrom hover:bg-tl-bege/75 flex items-center gap-2 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5 text-tl-laranja" />
                          <span>Editar publicação</span>
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onDelete(post.id);
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs text-tl-terracota hover:bg-tl-bege/75 flex items-center gap-2 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Excluir publicação</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      {onReport && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onReport('post', post.id, post.title);
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs text-tl-marrom hover:bg-tl-bege/75 flex items-center gap-2 cursor-pointer"
                        >
                          <Flag className="w-3.5 h-3.5 text-tl-laranja" />
                          <span>Denunciar conteúdo</span>
                        </button>
                      )}
                      {onBlockUser && (
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            onBlockUser(post.authorId, post.author.displayName);
                          }}
                          className="w-full px-3.5 py-2 text-left text-xs text-tl-terracota hover:bg-tl-bege/75 flex items-center gap-2 cursor-pointer"
                        >
                          <ShieldBan className="w-3.5 h-3.5" />
                          <span>Bloquear @{post.author.username}</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Unboxed Literary Review Metadata */}
          {post.reviewMeta && (
            <div className="mb-2.5 flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-tl-marrom-suave pb-2 border-b border-tl-areia/60">
              <span className="font-semibold text-tl-marrom">{post.reviewMeta.workTitle}</span>
              {post.reviewMeta.creator && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{post.reviewMeta.creator}</span>
                </>
              )}
              {post.reviewMeta.year && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{post.reviewMeta.year}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 font-semibold text-tl-terracota tabular-nums">
                <Star className="w-3.5 h-3.5 fill-tl-laranja text-tl-laranja" />
                {post.reviewMeta.rating.toFixed(1)}
              </span>
            </div>
          )}

          {/* Photo caption cue when present */}
          {isPhoto && post.imageCaption && (
            <p className="text-[11px] italic text-tl-marrom-suave mb-2">{post.imageCaption}</p>
          )}

          {/* Title & Literary Body */}
          <div onClick={() => onOpenPost(post)} className="cursor-pointer group/title">
            <h3
              className={`autumn-glow-link font-editorial font-semibold text-tl-marrom leading-[1.18] mb-2 group-hover:text-tl-terracota text-balance ${
                featured ? 'text-2xl md:text-3xl' : masonry ? 'text-xl md:text-2xl' : 'text-xl md:text-[26px]'
              }`}
            >
              {post.title}
            </h3>

            {isPoem && <BotanicalDivider className="w-20 h-3 text-tl-laranja mb-2.5" />}

            {post.subtitle && (
              <p className="text-sm text-tl-marrom-suave mb-2.5 leading-relaxed">{post.subtitle}</p>
            )}

            <p
              className={`text-[15px] text-tl-marrom/90 leading-[1.7] ${
                isPoem
                  ? 'font-literary italic whitespace-pre-line py-3.5 px-4 rounded-xl bg-tl-bege/45 border border-tl-areia/60'
                  : isDiary
                  ? 'font-literary italic leading-[1.75] text-tl-marrom/95'
                  : 'font-literary'
              }`}
            >
              {excerpt}
            </p>
          </div>

          {post.spotifyItem && !isPoem && (
            <div className="mt-4">
              <SpotifyItemEmbed item={post.spotifyItem} compact />
            </div>
          )}
        </div>

        {/* Social Microinteraction Footer */}
        <div className="mt-5 pt-3 border-t border-tl-areia/65 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={triggerLike}
              className={`autumn-glow-surface min-h-[36px] px-2.5 rounded-full border border-transparent flex items-center gap-1.5 text-xs active:scale-90 cursor-pointer ${
                post.isLiked
                  ? 'text-tl-terracota font-semibold bg-tl-bege/80'
                  : 'text-tl-marrom-suave hover:text-tl-terracota hover:bg-tl-bege/60'
              }`}
            >
              <Heart
                className={`w-4 h-4 transition-transform ${
                  post.isLiked ? 'fill-tl-laranja text-tl-laranja' : ''
                } ${likeAnim ? 'animate-tap-pop' : ''}`}
                strokeWidth={1.7}
              />
              <span className="tabular-nums">{post.likesCount}</span>
            </button>

            <button
              type="button"
              onClick={() => onOpenPost(post)}
              className="autumn-glow-surface min-h-[36px] px-2.5 rounded-full border border-transparent flex items-center gap-1.5 text-xs text-tl-marrom-suave hover:text-tl-marrom hover:bg-tl-bege/60 active:scale-95 cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" strokeWidth={1.7} />
              <span className="tabular-nums">{post.commentsCount}</span>
            </button>

            <button
              type="button"
              onClick={() => onShare(post)}
              className="autumn-glow-surface min-h-[36px] px-2.5 rounded-full border border-transparent flex items-center gap-1.5 text-xs text-tl-marrom-suave hover:text-tl-marrom hover:bg-tl-bege/60 active:scale-95 cursor-pointer"
            >
              <Share2 className="w-4 h-4" strokeWidth={1.7} />
              <span className="tabular-nums">{post.sharesCount}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={triggerSave}
            aria-label={post.isSaved ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
            className={`autumn-glow-surface min-h-[36px] px-3 border border-transparent flex items-center gap-1.5 text-xs rounded-full active:scale-90 cursor-pointer ${
              post.isSaved
                ? 'text-tl-terracota font-semibold bg-tl-areia/55'
                : 'text-tl-marrom-suave hover:text-tl-terracota hover:bg-tl-bege/60'
            }`}
          >
            <Bookmark
              className={`w-4 h-4 transition-transform ${
                post.isSaved ? 'fill-tl-laranja text-tl-laranja' : ''
              } ${saveAnim ? 'animate-tap-pop' : ''}`}
              strokeWidth={1.7}
            />
            <span className="hidden sm:inline">{post.isSaved ? 'Salvo' : 'Salvar'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
