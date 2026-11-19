import {
  ArrowDown,
  ArrowRight,
  BookOpen,
  Camera,
  Feather,
  Film,
  Landmark,
  Newspaper,
  Plus,
  Search,
} from 'lucide-react';
import { FormEvent, useRef, useState } from 'react';
import { getSeasonTheme } from '../lib/themes';
import { PostWithAuthor, SeasonId, TopCategory, UserPublic } from '../types/thinklive';
import { AutumnLeafAccent, BotanicalDivider } from './CreativeStickers';
import { UserAvatar } from './ImageWithFallback';
import { PostCard } from './PostCard';
import { TabEditorialHero } from './TabEditorialHero';

interface FeedViewProps {
  category: TopCategory;
  activeSeason?: SeasonId;
  posts: PostWithAuthor[];
  authors: UserPublic[];
  currentUser: UserPublic | null;
  loading: boolean;
  onOpenPost: (post: PostWithAuthor) => void;
  onOpenAuthor: (username: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleFavorite: (postId: string) => void;
  onToggleFollow: (userId: string) => void;
  onShare: (post: PostWithAuthor) => void;
  onEditPost: (post: PostWithAuthor) => void;
  onDeletePost: (postId: string) => void;
  onReport: (targetType: 'post' | 'user', targetId: string, label: string) => void;
  onBlockUser: (userId: string, name: string) => void;
  onOpenPublish: () => void;
  onNavigateCategory: (cat: TopCategory) => void;
  onSearchSubmit: (query: string) => void;
}

type FeedFilter =
  | 'recentes'
  | 'fotografias'
  | 'poemas'
  | 'textos'
  | 'diarios'
  | 'resenhas_filmes'
  | 'resenhas_livros'
  | 'arte_cultura'
  | 'seguindo'
  | 'populares';

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export function FeedView({
  category,
  activeSeason = 'outono',
  posts,
  authors,
  currentUser,
  loading,
  onOpenPost,
  onOpenAuthor,
  onToggleLike,
  onToggleFavorite,
  onToggleFollow,
  onShare,
  onEditPost,
  onDeletePost,
  onReport,
  onBlockUser,
  onOpenPublish,
  onNavigateCategory,
  onSearchSubmit,
}: FeedViewProps) {
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('recentes');
  const [heroQuery, setHeroQuery] = useState('');
  const feedSectionRef = useRef<HTMLDivElement>(null);

  const filteredPosts = posts
    .filter((p) => {
      if (category !== 'Início' && p.category !== category) return false;
      if (feedFilter === 'fotografias') return p.type === 'fotografia';
      if (feedFilter === 'poemas') return p.type === 'poema';
      if (feedFilter === 'textos') return p.type === 'artigo' || p.type === 'cronica' || p.type === 'noticia';
      if (feedFilter === 'diarios') return p.type === 'diario';
      if (feedFilter === 'resenhas_filmes') {
        return p.category === 'Filmes & Séries' || p.reviewMeta?.mediaType === 'filme' || p.reviewMeta?.mediaType === 'serie';
      }
      if (feedFilter === 'resenhas_livros') {
        return p.category === 'Livros' || p.reviewMeta?.mediaType === 'livro';
      }
      if (feedFilter === 'arte_cultura') return p.type === 'arte_cultura' || p.category === 'Arte e cultura';
      if (feedFilter === 'seguindo' && currentUser) {
        return p.author.isFollowing || p.authorId === currentUser.id;
      }
      return true;
    })
    .sort((a, b) => {
      if (feedFilter === 'populares') {
        return b.likesCount + b.commentsCount * 2 - (a.likesCount + a.commentsCount * 2);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  function handleHeroSearch(e: FormEvent) {
    e.preventDefault();
    onSearchSubmit(heroQuery.trim());
  }

  function scrollToMasonryFeed() {
    feedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="pb-28 space-y-10">
      {/* 1. LUXURY EDITORIAL FULL-BLEED OPENING (NO boxy square image grids) */}
      {category === 'Início' ? (
        <section className="relative w-full min-h-[470px] md:min-h-[540px] flex items-center overflow-hidden border-b border-tl-marrom/14">
          {/* Full-screen cinematic literary backdrop */}
          <img
            src="/assets/aistudio/9fd160e7c0d4a8752b0bcf5efb0368d5_6320ae24.jpg"
            alt="Cisne branco deslizando em lago escuro cercado por árvores outonais douradas"
            className="absolute inset-0 w-full h-full object-cover object-[center_68%] scale-[1.02] transition-transform duration-1000"
          />

          {/* Layered atmospheric scrim & warm golden-hour depth glow */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-r from-[#2b1a12]/90 via-[#3c2419]/72 to-[#2b1a12]/48"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[radial-gradient(circle_at_78%_30%,rgba(243,205,148,0.22),transparent_55%)]"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-tl-bege via-tl-bege/35 to-transparent"
          />

          {/* Delicate floating literary motes */}
          <span
            aria-hidden="true"
            className="hidden md:block absolute top-16 right-[18%] w-2.5 h-2.5 rounded-full bg-[#F3EBDD]/40 blur-[1px] animate-pulse"
          />
          <span
            aria-hidden="true"
            className="hidden md:block absolute bottom-24 right-[30%] w-1.5 h-1.5 rounded-full bg-[#E5A96D]/55 animate-pulse"
          />

          {/* Editorial Overlay Content */}
          <div className="relative z-10 max-w-6xl mx-auto w-full px-5 md:px-10 py-12 md:py-16">
            <div className="max-w-2xl space-y-5 animate-page-enter">
              <div className="flex items-center gap-2 text-xs font-medium tracking-[0.2em] uppercase text-[#EAD2B5]">
                <AutumnLeafAccent className="w-4 h-4 text-[#DF9457]" />
                <span>
                  {currentUser
                    ? `${getTimeGreeting()}, ${currentUser.displayName.split(' ')[0]} · ${getSeasonTheme(activeSeason).editionLabel}`
                    : `${getTimeGreeting()} · ${getSeasonTheme(activeSeason).editionLabel}`}
                </span>
              </div>

              <h1 className="font-editorial text-4xl sm:text-5xl md:text-[58px] font-semibold text-[#FAF5EC] leading-[1.06] tracking-tight text-balance">
                Palavras guardadas com calma para ler,{' '}
                <span className="italic text-[#F2B880]">escutar e lembrar</span>.
              </h1>

              <p className="font-literary text-[15px] md:text-[17px] text-[#F3EBDD]/90 leading-[1.7] max-w-xl">
                Uma revista social e refúgio editorial para reunir poemas, fotografias autorais, crônicas de cinema, estantes literárias e cadernos pessoais sem a pressa das redes comuns.
              </p>

              <p className="font-editorial italic text-base md:text-lg text-[#EAD2B5]/95">
                “Ler devagar é devolver ao tempo a sua espessura.”
              </p>

              {/* Search & Primary Exploration Controls */}
              <div className="pt-2 space-y-4">
                <form onSubmit={handleHeroSearch} className="relative max-w-md">
                  <Search className="w-4 h-4 text-tl-marrom-suave absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={heroQuery}
                    onChange={(e) => setHeroQuery(e.target.value)}
                    placeholder="Buscar poemas, livros, filmes ou autores…"
                    className="w-full pl-10 pr-24 py-2.5 rounded-full bg-[#FAF5EC]/95 border border-[#FAF5EC]/40 text-xs md:text-sm text-[#3E271C] placeholder:text-[#765A49] focus:outline-none focus:ring-2 focus:ring-[#DF9457]"
                  />
                  <button
                    type="submit"
                    className="autumn-glow-btn absolute right-1.5 top-1/2 -translate-y-1/2 z-10 px-4 py-1.5 rounded-full bg-tl-laranja text-tl-creme text-xs font-medium hover:bg-tl-terracota active:scale-95 cursor-pointer"
                  >
                    Buscar
                  </button>
                </form>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={scrollToMasonryFeed}
                    className="autumn-glow-btn px-6 py-2.5 text-xs md:text-sm font-medium bg-tl-laranja text-tl-creme border border-[#F2B880]/30 rounded-full hover:bg-tl-terracota active:scale-95 inline-flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <span>Explorar universo literário</span>
                    <ArrowDown className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={onOpenPublish}
                    className="px-5 py-2.5 text-xs md:text-sm font-medium bg-[#FAF5EC]/14 backdrop-blur-sm text-[#FAF5EC] border border-[#FAF5EC]/35 rounded-full hover:bg-[#FAF5EC]/24 active:scale-95 inline-flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Criar publicação</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Category Editorial Hero Banner (Artigos & outros cadernos) */
        <div className="max-w-6xl mx-auto px-4 md:px-8 pt-6">
          <TabEditorialHero
            imageUrl="/assets/aistudio/1dcb9dbf398dde09947570b2fd7fbd6b_3d5a5165.jpg"
            imageAlt="Caderno aberto manuscrito com caneta, fones de ouvido e xícara de chá sobre mesa de madeira"
            objectPositionClass="object-center"
            kickerIcon={<AutumnLeafAccent className="w-3.5 h-3.5 text-[#F2B880]" />}
            kicker="Caderno Editorial · Thinklive"
            title={category}
            phrase="“Ensaios, crônicas e ideias escritas com fôlego longo para pensar sem pressa.”"
            actions={
              <button
                type="button"
                onClick={onOpenPublish}
                className="autumn-glow-btn px-5 py-2.5 text-xs md:text-sm font-medium bg-tl-laranja text-tl-creme border border-[#F2B880]/30 rounded-full hover:bg-tl-terracota active:scale-95 inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Escrever nesta seção</span>
              </button>
            }
          />
        </div>
      )}

      {/* 2. TWO-COLUMN PINTEREST / TUMBLR EDITORIAL MASONRY FEED */}
      <div ref={feedSectionRef} className="max-w-6xl mx-auto px-4 md:px-8 space-y-7 scroll-mt-20">
        {/* Format & Discovery Filter Strip */}
        <div className="border-b border-tl-marrom/14 flex items-center gap-5 overflow-x-auto no-scrollbar">
          {(
            [
              { id: 'recentes', label: 'Tudo no mural' },
              { id: 'fotografias', label: 'Fotografias' },
              { id: 'poemas', label: 'Poemas' },
              { id: 'textos', label: 'Textos & crônicas' },
              { id: 'diarios', label: 'Diários' },
              { id: 'resenhas_filmes', label: 'Filmes & séries' },
              { id: 'resenhas_livros', label: 'Livros' },
              { id: 'arte_cultura', label: 'Arte & cultura' },
              ...(currentUser ? [{ id: 'seguindo', label: 'Seguindo' }] : []),
              { id: 'populares', label: 'Mais lidos' },
            ] as { id: FeedFilter; label: string }[]
          ).map((tab) => {
            const active = feedFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFeedFilter(tab.id)}
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

        {/* True Two-Column Masonry Stream */}
        {loading ? (
          <div className="columns-1 sm:columns-2 gap-5 md:gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="break-inside-avoid mb-5 md:mb-6 rounded-2xl bg-tl-creme border border-tl-marrom/12 p-6 space-y-3 animate-pulse"
              >
                <div className={`w-full rounded-xl bg-tl-bege ${n % 2 === 0 ? 'h-40' : 'h-56'}`} />
                <div className="h-5 w-3/4 rounded bg-tl-bege" />
                <div className="h-3.5 w-full rounded bg-tl-bege/80" />
                <div className="h-3.5 w-2/3 rounded bg-tl-bege/70" />
              </div>
            ))}
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-10 rounded-2xl bg-tl-creme border border-tl-marrom/14 text-center space-y-3 editorial-shadow">
            <p className="font-editorial text-2xl font-semibold text-tl-marrom">
              Ainda não há textos nesta seleção
            </p>
            <p className="text-sm text-tl-marrom-suave">
              Inicie este caderno compartilhando um poema, ensaio, diário ou fotografia.
            </p>
            <button
              type="button"
              onClick={onOpenPublish}
              className="autumn-glow-btn px-5 py-2.5 text-xs font-medium bg-tl-laranja text-tl-creme border border-tl-terracota/20 rounded-full hover:bg-tl-terracota active:scale-95 cursor-pointer"
            >
              Publicar agora
            </button>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 gap-5 md:gap-6">
            {filteredPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
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
                masonry
              />
            ))}
          </div>
        )}

        <BotanicalDivider />

        {/* 3. Editorial Quick Shortcuts & Featured Community Authors */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 rounded-3xl bg-tl-creme border border-tl-marrom/14 p-6 editorial-shadow space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
                Explorar cadernos da Thinklive
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {(
                [
                  { cat: 'Poemas', label: 'Poemas', icon: Feather },
                  { cat: 'Notícias', label: 'Notícias', icon: Newspaper },
                  { cat: 'Filmes & Séries', label: 'Filmes & Séries', icon: Film },
                  { cat: 'Livros', label: 'Livros', icon: BookOpen },
                  { cat: 'Fotografia', label: 'Fotografia', icon: Camera },
                  { cat: 'Arte e cultura', label: 'Arte & Cultura', icon: Landmark },
                ] as { cat: TopCategory; label: string; icon: typeof Feather }[]
              ).map(({ cat, label, icon: Icon }) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => onNavigateCategory(cat)}
                  className="autumn-glow-surface flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-tl-bege/65 border border-tl-marrom/12 text-xs font-medium text-tl-marrom hover:border-tl-laranja hover:text-tl-terracota cursor-pointer"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Icon className="w-3.5 h-3.5 text-tl-laranja shrink-0" />
                    <span className="truncate">{label}</span>
                  </span>
                  <ArrowRight className="w-3 h-3 opacity-60 shrink-0" />
                </button>
              ))}
            </div>
          </div>

          {authors.length > 0 && (
            <div className="lg:col-span-6 rounded-3xl bg-tl-creme border border-tl-marrom/14 p-6 editorial-shadow space-y-4">
              <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
                Autores em destaque
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {authors.slice(0, 4).map((author) => (
                  <div
                    key={author.id}
                    className="flex items-center justify-between gap-2.5 p-2.5 rounded-2xl bg-tl-bege/45 border border-tl-marrom/10"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenAuthor(author.username)}
                      className="autumn-glow-link group flex items-center gap-2.5 text-left min-w-0 cursor-pointer"
                    >
                      <UserAvatar src={author.avatarUrl} name={author.displayName} size="md" />
                      <div className="min-w-0">
                        <div className="font-editorial text-base font-semibold text-tl-marrom group-hover:text-tl-terracota truncate transition-colors">
                          {author.displayName}
                        </div>
                        <div className="text-[11px] text-tl-marrom-suave truncate">
                          @{author.username} · {author.followersCount} seg.
                        </div>
                      </div>
                    </button>
                    {currentUser?.id !== author.id && (
                      <button
                        type="button"
                        onClick={() => onToggleFollow(author.id)}
                        className={`px-3 py-1 text-[11px] font-medium rounded-full shrink-0 active:scale-95 cursor-pointer ${
                          author.isFollowing
                            ? 'autumn-glow-surface bg-tl-creme text-tl-marrom border border-tl-marrom/20'
                            : 'autumn-glow-btn bg-tl-laranja text-tl-creme border border-tl-terracota/20 hover:bg-tl-terracota'
                        }`}
                      >
                        {author.isFollowing ? 'Seguindo' : 'Seguir'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
