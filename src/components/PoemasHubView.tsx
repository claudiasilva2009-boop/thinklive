import {
  Bookmark,
  Feather,
  Flag,
  Heart,
  MessageCircle,
  MoreHorizontal,
  Music,
  Pause,
  Pencil,
  Play,
  Plus,
  Share2,
  ShieldBan,
  SlidersHorizontal,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AMBIENT_SOUND_OPTIONS } from '../lib/ambientAudio';
import { formatRelativeDate } from '../lib/api';
import { AmbientSoundId, PostWithAuthor, UserPublic } from '../types/thinklive';
import { useAmbientSound } from './AmbientSoundContext';
import { AutumnLeafAccent, BotanicalDivider } from './CreativeStickers';
import { ImageWithFallback, UserAvatar } from './ImageWithFallback';
import { useSiteConfig } from './SiteConfigContext';
import { SpotifyItemEmbed } from './SpotifyItemEmbed';

interface PoemasHubViewProps {
  poems: PostWithAuthor[];
  currentUser: UserPublic | null;
  loading: boolean;
  onOpenPost: (post: PostWithAuthor) => void;
  onOpenAuthor: (username: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleFavorite: (postId: string) => void;
  onShare: (post: PostWithAuthor) => void;
  onEditPost: (post: PostWithAuthor) => void;
  onDeletePost: (postId: string) => void;
  onReport: (targetType: 'post' | 'user', targetId: string, label: string) => void;
  onBlockUser: (userId: string, name: string) => void;
  onOpenPublishPoem: () => void;
}

type PoemFilter = 'todos' | 'populares' | 'musicais' | 'chuva_silencio' | 'seguindo';

const POEMAS_HERO_IMAGE = '/assets/aistudio/3c4946ff9e2c1861744b49ecd8ef4e21_69bb03f8.jpg';
const MUSICAL_IDS = new Set<AmbientSoundId>(['piano', 'violao', 'cordas']);
const RAIN_SILENCE_IDS = new Set<AmbientSoundId>(['chuva_janela', 'chuva', 'biblioteca', 'vento', 'mar']);

function getDefaultSoundForPoem(post: PostWithAuthor): AmbientSoundId {
  return post.ambientSoundId || 'piano';
}

interface PoemImagePlateProps {
  post: PostWithAuthor;
  onClick: () => void;
  tall?: boolean;
}

function PoemImagePlate({ post, onClick, tall = false }: PoemImagePlateProps) {
  const firstLine =
    post.content
      .split('\n')
      .map((l) => l.trim())
      .find(Boolean) || post.title;

  if (post.coverImage) {
    return (
      <div
        onClick={onClick}
        className={`autumn-glow-image relative overflow-hidden bg-tl-bege cursor-pointer group/img ${
          tall ? 'h-full min-h-[280px] md:min-h-[380px]' : 'aspect-[4/3]'
        }`}
      >
        <ImageWithFallback
          src={post.coverImage}
          alt={post.title}
          fallbackLabel={post.title}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover/img:scale-[1.035]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#24140d]/35 via-transparent to-transparent pointer-events-none"
        />
      </div>
    );
  }

  // Artisanal archival parchment visual plate when an author publishes without an uploaded cover
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden cursor-pointer flex flex-col items-center justify-center p-7 text-center bg-gradient-to-br from-[#F7EFE4] via-[#EFE1CF] to-[#E2CEB6] border-b lg:border-b-0 lg:border-r border-tl-marrom/10 group/img ${
        tall ? 'h-full min-h-[280px] md:min-h-[380px]' : 'aspect-[4/3]'
      }`}
    >
      <div
        aria-hidden="true"
        className="absolute inset-4 border border-tl-marrom/12 pointer-events-none"
      />
      <AutumnLeafAccent className="w-6 h-6 text-tl-terracota/70 mb-3 transition-transform duration-500 group-hover/img:scale-110" />
      <p className="font-editorial italic text-xl md:text-2xl text-tl-marrom/85 max-w-xs leading-snug line-clamp-3">
        “{firstLine}”
      </p>
      <span className="mt-3 text-[11px] uppercase tracking-[0.2em] text-tl-marrom-suave">
        Caderno de versos
      </span>
    </div>
  );
}

interface PoemMusicBarProps {
  post: PostWithAuthor;
}

function PoemMusicBar({ post }: PoemMusicBarProps) {
  const {
    poemPlaying,
    poemSoundId,
    poemVolume,
    activePoemPostId,
    playPoemTrack,
    selectPoemSound,
    setPoemVolume,
  } = useAmbientSound();

  const [customTrackId, setCustomTrackId] = useState<AmbientSoundId>(() => getDefaultSoundForPoem(post));
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (post.ambientSoundId) {
      setCustomTrackId(post.ambientSoundId);
    }
  }, [post.ambientSoundId]);

  const isThisPoemPlaying = poemPlaying && activePoemPostId === post.id;
  const displayTrackId = isThisPoemPlaying ? poemSoundId : customTrackId;
  const trackMeta =
    AMBIENT_SOUND_OPTIONS.find((opt) => opt.id === displayTrackId) || AMBIENT_SOUND_OPTIONS[0];

  function handlePlayPause() {
    playPoemTrack(post.id, displayTrackId);
  }

  function handleSelectTrack(id: AmbientSoundId) {
    setCustomTrackId(id);
    if (isThisPoemPlaying) {
      selectPoemSound(id);
    } else {
      playPoemTrack(post.id, id);
    }
    setPickerOpen(false);
  }

  return (
    <div className="pt-4 border-t border-tl-areia/75 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handlePlayPause}
            aria-label={isThisPoemPlaying ? `Pausar música ${trackMeta.label}` : `Tocar música ${trackMeta.label}`}
            className={`min-h-[40px] min-w-[40px] px-3.5 rounded-full inline-flex items-center gap-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer active:scale-95 ${
              isThisPoemPlaying
                ? 'bg-tl-laranja text-tl-creme hover:bg-tl-terracota'
                : 'bg-tl-marrom text-tl-creme hover:bg-tl-terracota'
            }`}
          >
            {isThisPoemPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pausar</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Ouvir</span>
              </>
            )}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-tl-terracota font-semibold">
              <Music className="w-3 h-3 shrink-0" />
              <span className="truncate">Música do poema</span>
            </div>
            <div className="text-xs md:text-sm font-medium text-tl-marrom truncate">
              {trackMeta.label}
              <span className="text-tl-marrom-suave font-normal hidden sm:inline"> · {trackMeta.description}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isThisPoemPlaying && (
            <div className="hidden sm:flex items-center gap-1.5">
              {poemVolume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-tl-marrom-suave" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-tl-laranja" />
              )}
              <input
                type="range"
                aria-label="Volume da música do poema"
                min={0}
                max={1}
                step={0.02}
                value={poemVolume}
                onChange={(e) => setPoemVolume(Number(e.target.value))}
                className="w-16 accent-tl-laranja cursor-pointer"
              />
            </div>
          )}

          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            className="min-h-[36px] px-2.5 rounded-full border border-tl-marrom/15 bg-tl-bege/65 text-[11px] font-medium text-tl-marrom hover:border-tl-laranja inline-flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
            title="Escolher outra música ou som ambiente"
          >
            <SlidersHorizontal className="w-3 h-3 text-tl-terracota" />
            <span>Trocar som</span>
          </button>
        </div>
      </div>

      {pickerOpen && (
        <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {AMBIENT_SOUND_OPTIONS.map((opt) => {
            const active = displayTrackId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelectTrack(opt.id)}
                className={`px-2.5 py-1.5 rounded-xl border text-[11px] text-left truncate cursor-pointer transition-colors ${
                  active
                    ? 'bg-tl-marrom text-tl-creme border-tl-marrom font-medium'
                    : 'bg-tl-bege/60 border-tl-marrom/12 text-tl-marrom hover:border-tl-laranja'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      )}

      {post.spotifyItem && (
        <div className="pt-1">
          <SpotifyItemEmbed item={post.spotifyItem} compact />
        </div>
      )}
    </div>
  );
}

interface PoemFolioCardProps {
  post: PostWithAuthor;
  currentUser: UserPublic | null;
  featured?: boolean;
  onOpenPost: (post: PostWithAuthor) => void;
  onOpenAuthor: (username: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleFavorite: (postId: string) => void;
  onShare: (post: PostWithAuthor) => void;
  onEdit: (post: PostWithAuthor) => void;
  onDelete: (postId: string) => void;
  onReport: (targetType: 'post' | 'user', targetId: string, label: string) => void;
  onBlockUser: (userId: string, name: string) => void;
}

function PoemFolioCard({
  post,
  currentUser,
  featured = false,
  onOpenPost,
  onOpenAuthor,
  onToggleLike,
  onToggleFavorite,
  onShare,
  onEdit,
  onDelete,
  onReport,
  onBlockUser,
}: PoemFolioCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [likeAnim, setLikeAnim] = useState(false);
  const [saveAnim, setSaveAnim] = useState(false);

  const isOwner = currentUser?.id === post.authorId;
  const lines = post.content.split('\n');
  const maxLines = featured ? 16 : 11;
  const isTruncated = lines.length > maxLines;
  const displayedVerses = isTruncated ? `${lines.slice(0, maxLines).join('\n')}\n…` : post.content;

  return (
    <article
      className={`autumn-glow-card relative bg-tl-creme border border-tl-marrom/14 rounded-3xl editorial-shadow overflow-hidden flex flex-col ${
        featured ? 'lg:grid lg:grid-cols-12 lg:items-stretch' : 'h-full'
      }`}
    >
      {/* 1. IMAGEM DO POEMA */}
      <div className={featured ? 'lg:col-span-5 flex flex-col' : 'flex flex-col'}>
        <PoemImagePlate post={post} onClick={() => onOpenPost(post)} tall={featured} />
        {post.imageCaption && (
          <div className="px-5 py-2 bg-tl-bege/55 border-b border-tl-marrom/10 text-[11px] font-literary italic text-tl-marrom-suave">
            {post.imageCaption}
          </div>
        )}
      </div>

      {/* 2. O POEMA + 3. MÚSICA + INTERAÇÕES */}
      <div
        className={`flex-1 flex flex-col justify-between p-6 md:p-8 ${
          featured ? 'lg:col-span-7 lg:p-9' : ''
        }`}
      >
        <div className="space-y-5">
          {/* Author + Context Menu */}
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => onOpenAuthor(post.author.username)}
              className="autumn-glow-link flex items-center gap-2.5 text-left min-w-0 cursor-pointer group/author"
            >
              <UserAvatar src={post.author.avatarUrl} name={post.author.displayName} size="md" />
              <div className="min-w-0">
                <div className="font-editorial text-[17px] font-semibold text-tl-marrom group-hover/author:text-tl-terracota transition-colors truncate">
                  {post.author.displayName}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-tl-marrom-suave">
                  <span>@{post.author.username}</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatRelativeDate(post.createdAt)}</span>
                </div>
              </div>
            </button>

            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Opções do poema"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-tl-marrom-suave hover:bg-tl-bege hover:text-tl-marrom cursor-pointer"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-tl-creme border border-tl-marrom/18 editorial-shadow rounded-2xl py-1.5 z-30">
                  {isOwner ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onEdit(post);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs text-tl-marrom hover:bg-tl-bege/75 flex items-center gap-2 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5 text-tl-laranja" />
                        <span>Editar poema</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete(post.id);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs text-tl-terracota hover:bg-tl-bege/75 flex items-center gap-2 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir poema</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          onReport('post', post.id, post.title);
                        }}
                        className="w-full px-3.5 py-2 text-left text-xs text-tl-marrom hover:bg-tl-bege/75 flex items-center gap-2 cursor-pointer"
                      >
                        <Flag className="w-3.5 h-3.5 text-tl-laranja" />
                        <span>Denunciar poema</span>
                      </button>
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
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Poem Title & Verses */}
          <div onClick={() => onOpenPost(post)} className="cursor-pointer group/poem space-y-3">
            <div>
              <h2
                className={`font-editorial font-semibold text-tl-marrom leading-[1.12] group-hover/poem:text-tl-terracota transition-colors text-balance ${
                  featured ? 'text-3xl md:text-4xl' : 'text-2xl md:text-[28px]'
                }`}
              >
                {post.title}
              </h2>
              {post.subtitle && (
                <p className="mt-1.5 font-literary italic text-sm text-tl-marrom-suave">
                  {post.subtitle}
                </p>
              )}
            </div>

            <BotanicalDivider className="w-20 h-3 text-tl-laranja/85" />

            <div
              className={`font-literary italic text-tl-marrom/92 whitespace-pre-line max-w-prose ${
                featured ? 'text-[16px] md:text-[18px] leading-[1.85]' : 'text-[15px] md:text-[16px] leading-[1.8]'
              }`}
            >
              {displayedVerses}
            </div>

            {isTruncated && (
              <span className="inline-block text-xs font-medium text-tl-terracota underline underline-offset-4">
                Continuar leitura do poema
              </span>
            )}
          </div>
        </div>

        {/* Música + Interações */}
        <div className="mt-7 space-y-4">
          <PoemMusicBar post={post} />

          <div className="pt-3 border-t border-tl-areia/65 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setLikeAnim(true);
                  setTimeout(() => setLikeAnim(false), 320);
                  onToggleLike(post.id);
                }}
                className={`autumn-glow-surface min-h-[38px] px-2.5 rounded-full border border-transparent flex items-center gap-1.5 text-xs active:scale-90 cursor-pointer ${
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
                className="autumn-glow-surface min-h-[38px] px-2.5 rounded-full border border-transparent flex items-center gap-1.5 text-xs text-tl-marrom-suave hover:text-tl-marrom hover:bg-tl-bege/60 active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" strokeWidth={1.7} />
                <span className="tabular-nums">{post.commentsCount}</span>
              </button>

              <button
                type="button"
                onClick={() => onShare(post)}
                className="autumn-glow-surface min-h-[38px] px-2.5 rounded-full border border-transparent flex items-center gap-1.5 text-xs text-tl-marrom-suave hover:text-tl-marrom hover:bg-tl-bege/60 active:scale-95 cursor-pointer"
              >
                <Share2 className="w-4 h-4" strokeWidth={1.7} />
                <span className="tabular-nums">{post.sharesCount}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setSaveAnim(true);
                setTimeout(() => setSaveAnim(false), 320);
                onToggleFavorite(post.id);
              }}
              aria-label={post.isSaved ? 'Remover dos favoritos' : 'Salvar poema nos favoritos'}
              className={`autumn-glow-surface min-h-[38px] px-3 border border-transparent flex items-center gap-1.5 text-xs rounded-full active:scale-90 cursor-pointer ${
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
              <span className="hidden sm:inline">{post.isSaved ? 'Salvo' : 'Guardar'}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

export function PoemasHubView({
  poems,
  currentUser,
  loading,
  onOpenPost,
  onOpenAuthor,
  onToggleLike,
  onToggleFavorite,
  onShare,
  onEditPost,
  onDeletePost,
  onReport,
  onBlockUser,
  onOpenPublishPoem,
}: PoemasHubViewProps) {
  const [filter, setFilter] = useState<PoemFilter>('todos');
  const { poemPlaying, poemSoundId, stopPoemAtmosphere } = useAmbientSound();
  const { siteConfig } = useSiteConfig();
  const poemHeroOverride = siteConfig.tabHeroes?.Poemas;
  const heroImageUrl = poemHeroOverride?.imageUrl?.trim() || POEMAS_HERO_IMAGE;
  const heroKicker = poemHeroOverride?.kicker?.trim() || 'Antologia Poética · Thinklive';
  const heroTitle = poemHeroOverride?.title?.trim() || 'Poemas';
  const heroPhrase =
    poemHeroOverride?.phrase?.trim() ||
    '“Onde o silêncio encontra ritmo, e cada verso pede uma imagem e uma música para permanecer.”';

  const filteredPoems = poems
    .filter((p) => {
      if (filter === 'musicais') {
        return MUSICAL_IDS.has(getDefaultSoundForPoem(p)) || Boolean(p.spotifyItem);
      }
      if (filter === 'chuva_silencio') {
        return RAIN_SILENCE_IDS.has(getDefaultSoundForPoem(p));
      }
      if (filter === 'seguindo' && currentUser) {
        return p.author.isFollowing || p.authorId === currentUser.id;
      }
      return true;
    })
    .sort((a, b) => {
      if (filter === 'populares') {
        return b.likesCount + b.commentsCount * 2 - (a.likesCount + a.commentsCount * 2);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const leadPoem = filteredPoems[0] || null;
  const anthologyPoems = filteredPoems.slice(1);
  const activeTrackLabel = AMBIENT_SOUND_OPTIONS.find((o) => o.id === poemSoundId)?.label;

  return (
    <div className="pb-28 space-y-10">
      {/* 1. TOP POETIC HERO: Imagem no topo + Título "Poemas" + Frase embaixo */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-6">
        <div className="relative rounded-3xl overflow-hidden min-h-[340px] md:min-h-[430px] flex items-end border border-tl-marrom/14 editorial-shadow">
          <img
            src={heroImageUrl}
            alt="Lírios dourados iluminados em claro-escuro noturno no topo da antologia de poemas"
            referrerPolicy="no-referrer"
            className="absolute inset-0 w-full h-full object-cover object-[center_42%]"
          />

          {/* Measured literary scrim for crisp WCAG AA legibility while preserving chiaroscuro lilies */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[#160d09]/92 via-[#1d110b]/45 to-transparent"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(232,175,114,0.18),transparent_55%)]"
          />

          <div className="relative z-10 w-full p-7 sm:p-10 md:p-14 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#EAD2B5]">
                <Feather className="w-3.5 h-3.5 text-[#F2B880]" />
                <span>{heroKicker}</span>
              </div>

              <h1 className="font-editorial text-5xl sm:text-6xl md:text-[72px] font-semibold text-[#FAF5EC] leading-[0.98] tracking-tight text-balance">
                {heroTitle}
              </h1>

              <p className="font-editorial italic text-lg sm:text-xl md:text-2xl text-[#F5E3CC] leading-relaxed max-w-xl">
                {heroPhrase}
              </p>
            </div>

            <div className="flex flex-col items-start md:items-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={onOpenPublishPoem}
                className="autumn-glow-btn px-5 py-2.5 rounded-full bg-tl-laranja text-tl-creme border border-[#F2B880]/30 text-xs md:text-sm font-medium hover:bg-tl-terracota active:scale-95 inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Escrever poema</span>
              </button>
              <span className="text-xs text-[#EAD2B5]/90 tabular-nums">
                {poems.length} {poems.length === 1 ? 'poema na antologia' : 'poemas na antologia'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FILTER STRIP + NOW PLAYING BAR */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-8">
        <div className="border-b border-tl-marrom/14 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'todos', label: 'Todos os poemas' },
                { id: 'populares', label: 'Mais lidos' },
                { id: 'musicais', label: 'Piano, violão & cordas' },
                { id: 'chuva_silencio', label: 'Chuva & silêncio' },
                ...(currentUser ? [{ id: 'seguindo', label: 'Seguindo' }] : []),
              ] as { id: PoemFilter; label: string }[]
            ).map((tab) => {
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`autumn-glow-link relative py-3 text-xs md:text-sm whitespace-nowrap shrink-0 cursor-pointer ${
                    active ? 'text-tl-marrom font-semibold' : 'text-tl-marrom-suave hover:text-tl-terracota'
                  }`}
                >
                  {tab.label}
                  {active && (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-tl-laranja"
                    />
                  )}
                </button>
              );
            })}
          </div>

          {poemPlaying && activeTrackLabel && (
            <div className="pb-2 md:pb-0 flex items-center gap-2.5 text-xs text-tl-terracota">
              <Music className="w-3.5 h-3.5 shrink-0" />
              <span className="font-medium truncate max-w-[180px]">Tocando: {activeTrackLabel}</span>
              <button
                type="button"
                onClick={stopPoemAtmosphere}
                className="px-2.5 py-1 rounded-full bg-tl-creme border border-tl-marrom/15 text-[11px] font-medium text-tl-marrom hover:border-tl-laranja whitespace-nowrap shrink-0 cursor-pointer"
              >
                Pausar som
              </button>
            </div>
          )}
        </div>

        {/* 3. ANTHOLOGY STREAM: Imagem do poema · O poema · Música */}
        {loading ? (
          <div className="space-y-6">
            <div className="h-80 rounded-3xl bg-tl-creme border border-tl-marrom/12 animate-pulse" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-96 rounded-3xl bg-tl-creme border border-tl-marrom/12 animate-pulse" />
              <div className="h-96 rounded-3xl bg-tl-creme border border-tl-marrom/12 animate-pulse" />
            </div>
          </div>
        ) : filteredPoems.length === 0 ? (
          <div className="p-12 rounded-3xl bg-tl-creme border border-tl-marrom/14 text-center space-y-3 editorial-shadow">
            <p className="font-editorial text-2xl font-semibold text-tl-marrom">
              Nenhum poema encontrado neste recorte
            </p>
            <p className="text-sm text-tl-marrom-suave max-w-md mx-auto">
              Publique um novo poema escolhendo uma imagem e uma música ambiente para estrear esta seleção.
            </p>
            <button
              type="button"
              onClick={onOpenPublishPoem}
              className="autumn-glow-btn px-5 py-2.5 text-xs font-medium bg-tl-laranja text-tl-creme rounded-full hover:bg-tl-terracota cursor-pointer"
            >
              Escrever primeiro poema
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {leadPoem && (
              <PoemFolioCard
                post={leadPoem}
                currentUser={currentUser}
                featured
                onOpenPost={onOpenPost}
                onOpenAuthor={onOpenAuthor}
                onToggleLike={onToggleLike}
                onToggleFavorite={onToggleFavorite}
                onShare={onShare}
                onEdit={onEditPost}
                onDelete={onDeletePost}
                onReport={onReport}
                onBlockUser={onBlockUser}
              />
            )}

            {anthologyPoems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-7 items-stretch">
                {anthologyPoems.map((poem) => (
                  <PoemFolioCard
                    key={poem.id}
                    post={poem}
                    currentUser={currentUser}
                    onOpenPost={onOpenPost}
                    onOpenAuthor={onOpenAuthor}
                    onToggleLike={onToggleLike}
                    onToggleFavorite={onToggleFavorite}
                    onShare={onShare}
                    onEdit={onEditPost}
                    onDelete={onDeletePost}
                    onReport={onReport}
                    onBlockUser={onBlockUser}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
