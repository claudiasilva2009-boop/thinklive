import { BookMarked, Compass, Search, Star, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CulturalItem, PostWithAuthor, Shelf, UserPublic } from '../types/thinklive';
import { BotanicalDivider } from './CreativeStickers';
import { UserAvatar } from './ImageWithFallback';
import { PostCard } from './PostCard';

interface ExploreSearchViewProps {
  initialMode: 'explore' | 'search';
  initialQuery?: string;
  currentUser: UserPublic | null;
  onOpenPost: (post: PostWithAuthor) => void;
  onOpenAuthor: (username: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleFavorite: (postId: string) => void;
  onToggleFollow: (userId: string) => void;
  onShare: (post: PostWithAuthor) => void;
}

export function ExploreSearchView({
  initialMode,
  initialQuery = '',
  currentUser,
  onOpenPost,
  onOpenAuthor,
  onToggleLike,
  onToggleFavorite,
  onToggleFollow,
  onShare,
}: ExploreSearchViewProps) {
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);

  const [popularPosts, setPopularPosts] = useState<PostWithAuthor[]>([]);
  const [recommendedAuthors, setRecommendedAuthors] = useState<UserPublic[]>([]);
  const [publicShelves, setPublicShelves] = useState<(Shelf & { ownerName: string; ownerUsername: string })[]>([]);
  const [culturalHighlights, setCulturalHighlights] = useState<CulturalItem[]>([]);

  const [searchResults, setSearchResults] = useState<{
    users: UserPublic[];
    posts: PostWithAuthor[];
    cultural: CulturalItem[];
    shelves: (Shelf & { ownerName: string; ownerUsername: string })[];
  } | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    api.explore().then((res) => {
      setPopularPosts(res.popularPosts);
      setRecommendedAuthors(res.recommendedAuthors);
      setPublicShelves(res.publicShelves);
      setCulturalHighlights(res.culturalHighlights);
    });
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      setLoading(true);
      api
        .search(trimmed)
        .then((res) => setSearchResults(res))
        .finally(() => setLoading(false));
    }, 220);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-7 md:py-10 pb-28 space-y-10">
      <section className="rounded-3xl bg-tl-creme border border-tl-marrom/14 p-6 md:p-9 editorial-shadow space-y-3">
        <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-terracota">
          <Compass className="w-3.5 h-3.5 text-tl-laranja" />
          <span>{initialMode === 'search' ? 'Pesquisa Global' : 'Explorar & Descobrir'}</span>
        </div>
        <h1 className="font-editorial text-4xl md:text-5xl font-semibold text-tl-marrom">
          {query.trim() ? `Resultados para “${query.trim()}”` : 'Descubra vozes, obras e estantes'}
        </h1>
        <BotanicalDivider className="w-28 h-3.5 text-tl-laranja" />

        <div className="relative pt-2 max-w-3xl">
          <Search className="w-4 h-4 text-tl-marrom-suave absolute left-4 top-1/2 -translate-y-1/2 mt-1" />
          <input
            type="text"
            autoFocus={initialMode === 'search'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Busque por usuários, poemas, artigos, livros, filmes, séries, músicas, fotografias ou coleções…"
            className="w-full pl-11 pr-10 py-3.5 rounded-full bg-tl-bege/65 border border-tl-marrom/18 text-sm text-tl-marrom placeholder:text-tl-marrom-suave/75 focus:outline-none focus:border-tl-laranja focus:bg-tl-creme transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 mt-1 p-1 text-tl-marrom-suave hover:text-tl-terracota cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </section>

      {searchResults ? (
        <div className="space-y-10">
          {loading && <p className="text-xs text-tl-marrom-suave">Consultando acervo…</p>}

          <section className="space-y-3">
            <h2 className="font-editorial text-3xl font-semibold text-tl-marrom">
              Autores e leitores ({searchResults.users.length})
            </h2>
            {searchResults.users.length === 0 ? (
              <p className="text-xs text-tl-marrom-suave">Nenhum usuário encontrado.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResults.users.map((u) => (
                  <div
                    key={u.id}
                    className="autumn-glow-card p-4 rounded-2xl bg-tl-creme border border-tl-marrom/14 flex items-center justify-between gap-3 editorial-shadow editorial-card-lift"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenAuthor(u.username)}
                      className="autumn-glow-link relative z-[2] flex items-center gap-3 text-left min-w-0 cursor-pointer"
                    >
                      <UserAvatar src={u.avatarUrl} name={u.displayName} size="md" />
                      <div className="min-w-0">
                        <div className="font-editorial text-base font-semibold text-tl-marrom truncate hover:text-tl-terracota">{u.displayName}</div>
                        <div className="text-xs text-tl-marrom-suave truncate">@{u.username}</div>
                      </div>
                    </button>
                    {currentUser?.id !== u.id && (
                      <button
                        type="button"
                        onClick={() => onToggleFollow(u.id)}
                        className={`relative z-[2] px-3.5 py-1.5 text-xs font-medium rounded-full cursor-pointer shrink-0 active:scale-95 ${
                          u.isFollowing
                            ? 'autumn-glow-surface bg-tl-bege text-tl-marrom border border-tl-marrom/20'
                            : 'autumn-glow-btn bg-tl-laranja text-tl-creme border border-tl-terracota/20 hover:bg-tl-terracota'
                        }`}
                      >
                        {u.isFollowing ? 'Seguindo' : 'Seguir'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <h2 className="font-editorial text-3xl font-semibold text-tl-marrom">
              Publicações, poemas, artigos e fotografias ({searchResults.posts.length})
            </h2>
            {searchResults.posts.length === 0 ? (
              <p className="text-xs text-tl-marrom-suave">Nenhuma publicação correspondente.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {searchResults.posts.map((p) => (
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
            )}
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <section className="space-y-3">
              <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
                Filmes, séries, livros e músicas ({searchResults.cultural.length})
              </h2>
              {searchResults.cultural.map((c) => (
                <div key={c.id} className="autumn-glow-card p-4 rounded-2xl bg-tl-creme border border-tl-marrom/14">
                  <div className="text-[11px] uppercase font-semibold text-tl-terracota">{c.mediaType}</div>
                  <div className="font-editorial text-xl font-semibold text-tl-marrom">{c.title}</div>
                  <div className="text-xs text-tl-marrom-suave">
                    {c.creator} {c.year ? `· ${c.year}` : ''}
                  </div>
                </div>
              ))}
            </section>

            <section className="space-y-3">
              <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
                Estantes e coleções ({searchResults.shelves.length})
              </h2>
              {searchResults.shelves.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onOpenAuthor(s.ownerUsername)}
                  className="autumn-glow-card w-full text-left p-4 rounded-2xl bg-tl-creme border border-tl-marrom/14 cursor-pointer"
                >
                  <div className="font-editorial text-xl font-semibold text-tl-marrom">{s.title}</div>
                  <div className="text-xs text-tl-marrom-suave">
                    Por {s.ownerName} · {s.items.length} itens
                  </div>
                </button>
              ))}
            </section>
          </div>
        </div>
      ) : (
        <div className="space-y-12">
          <section className="space-y-4">
            <h2 className="font-editorial text-3xl font-semibold text-tl-marrom">
              Autores e espaços recomendados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {recommendedAuthors.map((author) => (
                <div
                  key={author.id}
                  className="autumn-glow-card p-6 rounded-2xl bg-tl-creme border border-tl-marrom/14 flex flex-col justify-between gap-4 editorial-shadow editorial-card-lift"
                >
                  <div className="relative z-[2]">
                    <div className="flex items-center gap-3 mb-3">
                      <UserAvatar src={author.avatarUrl} name={author.displayName} size="lg" />
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => onOpenAuthor(author.username)}
                          className="autumn-glow-link font-editorial text-2xl font-semibold text-tl-marrom hover:text-tl-terracota truncate block cursor-pointer"
                        >
                          {author.displayName}
                        </button>
                        <div className="text-xs text-tl-marrom-suave">
                          @{author.username} · {author.followersCount} seguidores
                        </div>
                      </div>
                    </div>
                    <p className="font-literary text-xs text-tl-marrom-suave leading-relaxed line-clamp-3">{author.bio}</p>
                  </div>

                  <div className="relative z-[2] flex items-center justify-between pt-3 border-t border-tl-areia/65">
                    <button
                      type="button"
                      onClick={() => onOpenAuthor(author.username)}
                      className="autumn-glow-link text-xs font-medium text-tl-laranja hover:text-tl-terracota hover:underline cursor-pointer"
                    >
                      Visitar espaço
                    </button>
                    {currentUser?.id !== author.id && (
                      <button
                        type="button"
                        onClick={() => onToggleFollow(author.id)}
                        className={`px-4 py-1.5 text-xs font-medium rounded-full active:scale-95 cursor-pointer ${
                          author.isFollowing
                            ? 'autumn-glow-surface bg-tl-bege text-tl-marrom border border-tl-marrom/20'
                            : 'autumn-glow-btn bg-tl-laranja text-tl-creme border border-tl-terracota/20 hover:bg-tl-terracota'
                        }`}
                      >
                        {author.isFollowing ? 'Seguindo' : 'Seguir'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {publicShelves.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-editorial text-3xl font-semibold text-tl-marrom flex items-center gap-2">
                <BookMarked className="w-5 h-5 text-tl-laranja" strokeWidth={1.7} />
                <span>Estantes da comunidade</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {publicShelves.map((shelf) => (
                  <button
                    key={shelf.id}
                    type="button"
                    onClick={() => onOpenAuthor(shelf.ownerUsername)}
                    className="autumn-glow-card text-left p-5 rounded-2xl bg-tl-creme border border-tl-marrom/14 cursor-pointer editorial-shadow editorial-card-lift"
                  >
                    <div className="relative z-[2]">
                      <div className="text-xs text-tl-marrom-suave mb-1">Estante de {shelf.ownerName}</div>
                      <h3 className="autumn-glow-link font-editorial text-2xl font-semibold text-tl-marrom">{shelf.title}</h3>
                      <p className="text-xs text-tl-marrom-suave mt-1 line-clamp-2">{shelf.description}</p>
                      <div className="mt-3 text-xs font-semibold text-tl-terracota">
                        {shelf.items.length} {shelf.items.length === 1 ? 'item guardado' : 'itens guardados'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {culturalHighlights.length > 0 && (
            <section className="space-y-4">
              <h2 className="font-editorial text-3xl font-semibold text-tl-marrom">
                Obras bem avaliadas
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {culturalHighlights.map((item) => (
                  <div key={item.id} className="autumn-glow-card p-5 rounded-2xl bg-tl-creme border border-tl-marrom/14 editorial-shadow editorial-card-lift">
                    <div className="flex items-center justify-between text-[11px] text-tl-marrom-suave">
                      <span className="uppercase font-semibold text-tl-terracota">{item.mediaType}</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-tl-terracota tabular-nums">
                        <Star className="w-3 h-3 fill-tl-laranja text-tl-laranja" />
                        {item.rating.toFixed(1)}
                      </span>
                    </div>
                    <div className="font-editorial text-xl font-semibold text-tl-marrom mt-1">{item.title}</div>
                    <div className="text-xs text-tl-marrom-suave">
                      {item.creator} {item.year ? `· ${item.year}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="space-y-4">
            <h2 className="font-editorial text-3xl font-semibold text-tl-marrom">
              Leituras populares
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {popularPosts.map((post) => (
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
        </div>
      )}
    </div>
  );
}
