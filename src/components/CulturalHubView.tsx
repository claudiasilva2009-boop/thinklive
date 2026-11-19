import { BookOpen, Film, Heart, ListPlus, Music, Plus, Star, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { CulturalItem, PostWithAuthor, UserPublic } from '../types/thinklive';
import { BotanicalDivider } from './CreativeStickers';
import { ImageWithFallback } from './ImageWithFallback';
import { PostCard } from './PostCard';
import { TabEditorialHero } from './TabEditorialHero';

interface CulturalHubViewProps {
  area: 'filmes' | 'livros' | 'musicas';
  currentUser: UserPublic | null;
  relatedPosts: PostWithAuthor[];
  onOpenPost: (post: PostWithAuthor) => void;
  onOpenAuthor: (username: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleFavorite: (postId: string) => void;
  onShare: (post: PostWithAuthor) => void;
  onRequireAuth: () => void;
}

export function CulturalHubView({
  area,
  currentUser,
  relatedPosts,
  onOpenPost,
  onOpenAuthor,
  onToggleLike,
  onToggleFavorite,
  onShare,
  onRequireAuth,
}: CulturalHubViewProps) {
  const [items, setItems] = useState<(CulturalItem & { ownerName?: string; ownerUsername?: string })[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [scope, setScope] = useState<'comunidade' | 'meu'>('comunidade');
  const [showAddForm, setShowAddForm] = useState(false);

  const [mediaType, setMediaType] = useState<'filme' | 'serie' | 'livro' | 'musica'>(
    area === 'filmes' ? 'filme' : area === 'livros' ? 'livro' : 'musica'
  );
  const [subType, setSubType] = useState<'album' | 'artista' | 'playlist' | 'obra'>(
    area === 'musicas' ? 'album' : 'obra'
  );
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [year, setYear] = useState('');
  const [status, setStatus] = useState<'completed' | 'in_progress' | 'planned' | 'favorite'>('completed');
  const [rating, setRating] = useState(4.5);
  const [review, setReview] = useState('');
  const [listName, setListName] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    setMediaType(area === 'filmes' ? 'filme' : area === 'livros' ? 'livro' : 'musica');
    setSubType(area === 'musicas' ? 'album' : 'obra');
    loadItems();
  }, [area, scope, currentUser]);

  async function loadItems() {
    try {
      if (area === 'filmes') {
        const [fRes, sRes] = await Promise.all([
          api.getCultural({ mediaType: 'filme', userId: scope === 'meu' && currentUser ? currentUser.id : undefined }),
          api.getCultural({ mediaType: 'serie', userId: scope === 'meu' && currentUser ? currentUser.id : undefined }),
        ]);
        setItems([...fRes.items, ...sRes.items]);
      } else if (area === 'livros') {
        const res = await api.getCultural({
          mediaType: 'livro',
          userId: scope === 'meu' && currentUser ? currentUser.id : undefined,
        });
        setItems(res.items);
      } else {
        const res = await api.getCultural({
          mediaType: 'musica',
          userId: scope === 'meu' && currentUser ? currentUser.id : undefined,
        });
        setItems(res.items);
      }
    } catch {
      // ignore
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!title.trim()) return;
    const res = await api.addCultural({
      mediaType,
      subType,
      title: title.trim(),
      creator: creator.trim(),
      year: year.trim(),
      status,
      rating: status === 'planned' ? 0 : rating,
      review: review.trim(),
      listName: listName.trim(),
      isFavorite,
    });
    setItems((prev) => [{ ...res.item, ownerName: currentUser.displayName, ownerUsername: currentUser.username }, ...prev]);
    setTitle('');
    setCreator('');
    setYear('');
    setReview('');
    setListName('');
    setShowAddForm(false);
  }

  async function handleToggleFavorite(item: CulturalItem) {
    if (!currentUser || item.userId !== currentUser.id) return;
    const res = await api.updateCultural(item.id, { isFavorite: !item.isFavorite });
    setItems((prev) => prev.map((it) => (it.id === item.id ? { ...it, isFavorite: res.item.isFavorite } : it)));
  }

  async function handleDelete(id: string) {
    await api.deleteCultural(id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  const areaConfig = {
    filmes: {
      title: 'Filmes & Séries',
      subtitle: 'Diário cinematográfico: obras assistidas, notas, listas temáticas e fila do que assistir.',
      icon: Film,
      completedLabel: 'Assistidos',
      inProgressLabel: 'Assistindo',
      plannedLabel: 'Quero assistir',
    },
    livros: {
      title: 'Livros & Leituras',
      subtitle: 'Caderno de leituras: livros lidos, leituras em andamento, avaliações e listas literárias.',
      icon: BookOpen,
      completedLabel: 'Lidos',
      inProgressLabel: 'Lendo atualmente',
      plannedLabel: 'Quero ler',
    },
    musicas: {
      title: 'Acervo Musical',
      subtitle: 'Álbuns comentados, artistas favoritos, playlists pessoais e resenhas sonoras.',
      icon: Music,
      completedLabel: 'Álbuns ouvidos',
      inProgressLabel: 'Em rotação',
      plannedLabel: 'Quero ouvir',
    },
  }[area];

  const Icon = areaConfig.icon;

  const filteredItems = items.filter((item) => {
    if (statusFilter === 'favoritos') return item.isFavorite;
    if (statusFilter !== 'todos') return item.status === statusFilter;
    return true;
  });

  const uniqueLists = Array.from(new Set(items.map((i) => i.listName).filter(Boolean)));

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-7 md:py-10 pb-28 space-y-8">
      {/* Editorial Cultural Hero */}
      <TabEditorialHero
        imageUrl={
          area === 'musicas'
            ? '/src/assets/images/autumn_cinema_vinyl_1794870056332.jpg'
            : area === 'livros'
            ? '/src/assets/images/autumn_library_hero_1794870054293.jpg'
            : '/src/assets/images/cinema_projector_night_1794866429083.jpg'
        }
        imageAlt={areaConfig.title}
        kickerIcon={<Icon className="w-3.5 h-3.5 text-[#F2B880]" />}
        kicker="Acervo Cultural · Thinklive"
        title={areaConfig.title}
        phrase={`“${areaConfig.subtitle}”`}
        actions={
          <button
            type="button"
            onClick={() => {
              if (!currentUser) onRequireAuth();
              else setShowAddForm((v) => !v);
            }}
            className="autumn-glow-btn px-5 py-2.5 text-xs md:text-sm font-medium bg-tl-laranja text-tl-creme border border-[#F2B880]/30 rounded-full hover:bg-tl-terracota active:scale-95 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar obra</span>
          </button>
        }
      />

      {/* Add Form */}
      {showAddForm && currentUser && (
        <form onSubmit={handleAdd} className="p-6 rounded-3xl bg-tl-creme border border-tl-marrom/14 editorial-shadow space-y-4">
          <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">Adicionar ao diário cultural</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {area === 'filmes' && (
              <div>
                <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Formato</label>
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value as 'filme' | 'serie')}
                  className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
                >
                  <option value="filme">Filme</option>
                  <option value="serie">Série</option>
                </select>
              </div>
            )}

            {area === 'musicas' && (
              <div>
                <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Categoria musical</label>
                <select
                  value={subType}
                  onChange={(e) => setSubType(e.target.value as 'album' | 'artista' | 'playlist')}
                  className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
                >
                  <option value="album">Álbum</option>
                  <option value="artista">Artista favorito</option>
                  <option value="playlist">Playlist / Coleção</option>
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Título</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={area === 'livros' ? 'Nome do livro' : area === 'musicas' ? 'Álbum, artista ou playlist' : 'Nome do filme ou série'}
                className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-tl-marrom-suave mb-1">
                {area === 'livros' ? 'Autor(a)' : area === 'musicas' ? 'Artista / Curadoria' : 'Direção / Criação'}
              </label>
              <input
                type="text"
                value={creator}
                onChange={(e) => setCreator(e.target.value)}
                className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Ano</label>
              <input
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Ex.: 2024"
                className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Situação</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as typeof status)}
                className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
              >
                <option value="completed">{areaConfig.completedLabel}</option>
                <option value="in_progress">{areaConfig.inProgressLabel}</option>
                <option value="planned">{areaConfig.plannedLabel}</option>
                <option value="favorite">Favorito</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Lista / Coleção (opcional)</label>
              <input
                type="text"
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="Ex.: Clássicos de Outono"
                className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3 py-2 text-sm text-tl-marrom"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Nota ({rating.toFixed(1)} / 5)</label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full accent-tl-laranja mt-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-tl-marrom-suave mb-1">Resenha ou anotações pessoais</label>
            <textarea
              rows={3}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Suas impressões sobre a obra…"
              className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 p-3 text-sm text-tl-marrom"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-xs text-tl-marrom cursor-pointer">
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                className="accent-tl-laranja"
              />
              <span>Marcar como obra favorita no perfil</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-xs text-tl-marrom-suave hover:text-tl-marrom cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="autumn-glow-btn px-5 py-2 text-xs font-medium bg-tl-marrom text-tl-creme border border-tl-terracota/20 rounded-full hover:bg-tl-terracota active:scale-95 cursor-pointer"
              >
                Salvar registro
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Scope & Status Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-tl-marrom/12 pb-3">
        <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">
          {[
            { id: 'todos', label: 'Todos' },
            { id: 'completed', label: areaConfig.completedLabel },
            { id: 'in_progress', label: areaConfig.inProgressLabel },
            { id: 'planned', label: areaConfig.plannedLabel },
            { id: 'favoritos', label: 'Favoritos' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setStatusFilter(f.id)}
              className={`autumn-glow-link relative py-1.5 text-xs whitespace-nowrap cursor-pointer ${
                statusFilter === f.id
                  ? 'text-tl-terracota font-semibold'
                  : 'text-tl-marrom-suave hover:text-tl-marrom'
              }`}
            >
              {f.label}
              {statusFilter === f.id && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-tl-laranja" />
              )}
            </button>
          ))}
        </div>

        {currentUser && (
          <div className="flex items-center gap-1 p-1 bg-tl-creme border border-tl-marrom/14 rounded-full">
            <button
              type="button"
              onClick={() => setScope('comunidade')}
              className={`px-3.5 py-1 text-xs rounded-full cursor-pointer transition-colors ${
                scope === 'comunidade' ? 'bg-tl-marrom text-tl-creme font-medium' : 'text-tl-marrom-suave'
              }`}
            >
              Comunidade
            </button>
            <button
              type="button"
              onClick={() => setScope('meu')}
              className={`px-3.5 py-1 text-xs rounded-full cursor-pointer transition-colors ${
                scope === 'meu' ? 'bg-tl-marrom text-tl-creme font-medium' : 'text-tl-marrom-suave'
              }`}
            >
              Meu diário
            </button>
          </div>
        )}
      </div>

      {/* Lists bar */}
      {uniqueLists.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar text-xs text-tl-marrom-suave">
          <span className="flex items-center gap-1 font-semibold text-tl-marrom shrink-0">
            <ListPlus className="w-3.5 h-3.5 text-tl-laranja" />
            Listas:
          </span>
          {uniqueLists.map((l) => (
            <span key={l} className="px-3 py-1 rounded-full bg-tl-creme border border-tl-marrom/12 shrink-0">
              {l}
            </span>
          ))}
        </div>
      )}

      {/* Cultural Entries Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item) => {
          const isMine = currentUser?.id === item.userId;
          return (
            <div
              key={item.id}
              className="autumn-glow-card group bg-tl-creme border border-tl-marrom/14 rounded-2xl overflow-hidden flex flex-col justify-between editorial-shadow editorial-card-lift"
            >
              {item.coverUrl && (
                <div className="autumn-glow-image aspect-[16/9] bg-tl-bege overflow-hidden">
                  <ImageWithFallback
                    src={item.coverUrl}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                </div>
              )}
              <div className="relative z-[2] p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2 text-[11px] text-tl-marrom-suave mb-2">
                    <span className="uppercase tracking-wider text-tl-terracota font-semibold">
                      {item.status === 'completed'
                        ? areaConfig.completedLabel
                        : item.status === 'in_progress'
                        ? areaConfig.inProgressLabel
                        : item.status === 'planned'
                        ? areaConfig.plannedLabel
                        : 'Favorito'}
                      {item.listName ? ` · ${item.listName}` : ''}
                    </span>
                    {item.rating > 0 && (
                      <span className="inline-flex items-center gap-1 font-semibold text-tl-terracota tabular-nums">
                        <Star className="w-3 h-3 fill-tl-laranja text-tl-laranja" />
                        {item.rating.toFixed(1)}
                      </span>
                    )}
                  </div>

                  <h3 className="font-editorial text-2xl font-semibold text-tl-marrom leading-snug">{item.title}</h3>
                  <p className="text-xs text-tl-marrom-suave mt-0.5">
                    {item.creator} {item.year ? `· ${item.year}` : ''}
                  </p>
                  {item.review && (
                    <p className="text-sm text-tl-marrom/90 mt-3 leading-relaxed font-literary">{item.review}</p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-tl-areia/65 flex items-center justify-between text-xs text-tl-marrom-suave">
                  <button
                    type="button"
                    onClick={() => item.ownerUsername && onOpenAuthor(item.ownerUsername)}
                    className="autumn-glow-link hover:text-tl-terracota font-medium cursor-pointer"
                  >
                    Por {item.ownerName || 'Membro'}
                  </button>

                  {isMine && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleFavorite(item)}
                        className="autumn-glow-surface p-1.5 rounded-full border border-transparent hover:text-tl-terracota active:scale-90 cursor-pointer"
                        title="Favorito"
                      >
                        <Heart className={`w-4 h-4 ${item.isFavorite ? 'fill-tl-laranja text-tl-laranja' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="autumn-glow-surface p-1.5 rounded-full border border-transparent hover:text-tl-terracota cursor-pointer"
                        title="Excluir registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Related Editorial Reviews & Posts */}
      {relatedPosts.length > 0 && (
        <section className="pt-8 border-t border-tl-marrom/14 space-y-5">
          <h2 className="font-editorial text-3xl font-semibold text-tl-marrom">
            Resenhas e textos da comunidade em {areaConfig.title}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
      )}
    </div>
  );
}
