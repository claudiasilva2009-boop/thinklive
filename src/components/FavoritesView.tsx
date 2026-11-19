import { Bookmark, FolderLock, FolderPlus, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { FavoriteCategory, FavoriteCollection, PostWithAuthor, SavedItemEnriched, UserPublic } from '../types/thinklive';
import { BotanicalDivider } from './CreativeStickers';
import { PostCard } from './PostCard';

const FAVORITE_CATEGORIES: ('Todas' | FavoriteCategory)[] = [
  'Todas',
  'Poemas',
  'Artigos',
  'Fotografias',
  'Livros',
  'Filmes',
  'Outros',
];

interface FavoritesViewProps {
  currentUser: UserPublic | null;
  onOpenPost: (post: PostWithAuthor) => void;
  onOpenAuthor: (username: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleFavorite: (postId: string) => void;
  onShare: (post: PostWithAuthor) => void;
  onRequireAuth: () => void;
}

export function FavoritesView({
  currentUser,
  onOpenPost,
  onOpenAuthor,
  onToggleLike,
  onToggleFavorite,
  onShare,
  onRequireAuth,
}: FavoritesViewProps) {
  const [items, setItems] = useState<SavedItemEnriched[]>([]);
  const [collections, setCollections] = useState<FavoriteCollection[]>([]);
  const [activeCategory, setActiveCategory] = useState<'Todas' | FavoriteCategory>('Todas');
  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [newColName, setNewColName] = useState('');
  const [newColDesc, setNewColDesc] = useState('');
  const [showNewCol, setShowNewCol] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    loadFavorites();
  }, [currentUser]);

  async function loadFavorites() {
    const res = await api.getFavorites();
    setItems(res.items);
    setCollections(res.collections);
  }

  if (!currentUser) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-tl-creme border border-tl-marrom/15 text-tl-terracota flex items-center justify-center">
          <Bookmark className="w-7 h-7" strokeWidth={1.6} />
        </div>
        <h1 className="font-editorial text-4xl font-semibold text-tl-marrom">Seus favoritos e coleções</h1>
        <p className="font-literary text-sm text-tl-marrom-suave">
          Entre na sua conta para salvar poemas, artigos, resenhas e organizar coleções privadas de leitura.
        </p>
        <button
          type="button"
          onClick={onRequireAuth}
          className="autumn-glow-btn px-6 py-2.5 text-xs font-medium bg-tl-laranja text-tl-creme border border-tl-terracota/20 rounded-full hover:bg-tl-terracota active:scale-95 cursor-pointer"
        >
          Entrar ou cadastrar
        </button>
      </div>
    );
  }

  async function handleCreateCollection(e: FormEvent) {
    e.preventDefault();
    if (!newColName.trim()) return;
    const res = await api.createCollection({
      name: newColName.trim(),
      description: newColDesc.trim(),
      isPrivate: true,
    });
    setCollections((prev) => [...prev, res.collection]);
    setNewColName('');
    setNewColDesc('');
    setShowNewCol(false);
  }

  async function handleDeleteCollection(id: string) {
    await api.deleteCollection(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
    if (activeCollectionId === id) setActiveCollectionId(null);
  }

  async function handleAssign(savedId: string, collectionId: string | null) {
    const res = await api.assignFavorite(savedId, { collectionId });
    setItems(res.items);
  }

  const filtered = items.filter((it) => {
    if (activeCollectionId) return it.collectionId === activeCollectionId;
    if (activeCategory !== 'Todas') return it.category === activeCategory;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-7 md:py-10 pb-28 space-y-8">
      <section className="rounded-3xl bg-tl-creme border border-tl-marrom/14 p-6 md:p-9 editorial-shadow flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-tl-terracota block mb-1.5">
            Arquivo Pessoal
          </span>
          <h1 className="font-editorial text-4xl md:text-5xl font-semibold text-tl-marrom">Favoritos</h1>
          <BotanicalDivider className="w-24 h-3 text-tl-laranja mt-1.5 mb-2" />
          <p className="font-literary text-sm text-tl-marrom-suave">
            Organize leituras e referências salvas por categoria ou em coleções privadas.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewCol((v) => !v)}
          className="autumn-glow-btn self-start md:self-auto px-5 py-2.5 text-xs font-medium bg-tl-laranja text-tl-creme border border-tl-terracota/20 rounded-full hover:bg-tl-terracota active:scale-95 flex items-center gap-1.5 cursor-pointer"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Nova coleção privada</span>
        </button>
      </section>

      {showNewCol && (
        <form onSubmit={handleCreateCollection} className="p-6 rounded-3xl bg-tl-creme border border-tl-marrom/14 editorial-shadow space-y-3 max-w-xl">
          <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">Criar coleção privada</h2>
          <input
            type="text"
            required
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            placeholder="Nome da coleção"
            className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3.5 py-2.5 text-sm text-tl-marrom"
          />
          <input
            type="text"
            value={newColDesc}
            onChange={(e) => setNewColDesc(e.target.value)}
            placeholder="Descrição breve (opcional)"
            className="w-full rounded-xl bg-tl-bege/65 border border-tl-marrom/15 px-3.5 py-2.5 text-sm text-tl-marrom"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowNewCol(false)} className="px-3 py-1.5 text-xs text-tl-marrom-suave cursor-pointer">
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-1.5 text-xs font-medium bg-tl-marrom text-tl-creme rounded-full hover:bg-tl-terracota cursor-pointer"
            >
              Criar coleção
            </button>
          </div>
        </form>
      )}

      {collections.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-tl-marrom-suave flex items-center gap-1 mr-1">
            <FolderLock className="w-3.5 h-3.5 text-tl-laranja" />
            Coleções privadas:
          </span>
          {collections.map((col) => (
            <div
              key={col.id}
              className={`autumn-glow-surface inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs border ${
                activeCollectionId === col.id
                  ? 'bg-tl-marrom text-tl-creme border-tl-marrom'
                  : 'bg-tl-creme text-tl-marrom border-tl-marrom/15'
              }`}
            >
              <button
                type="button"
                onClick={() => setActiveCollectionId(activeCollectionId === col.id ? null : col.id)}
                className="cursor-pointer font-medium"
              >
                {col.name}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCollection(col.id)}
                className="opacity-70 hover:text-tl-laranja cursor-pointer"
                title="Excluir coleção"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-5 overflow-x-auto no-scrollbar border-b border-tl-marrom/12 pb-2">
        {FAVORITE_CATEGORIES.map((cat) => {
          const active = !activeCollectionId && activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setActiveCollectionId(null);
                setActiveCategory(cat);
              }}
              className={`autumn-glow-link relative py-1.5 text-xs whitespace-nowrap cursor-pointer ${
                active ? 'text-tl-terracota font-semibold' : 'text-tl-marrom-suave hover:text-tl-marrom'
              }`}
            >
              {cat}
              {active && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-tl-laranja" />}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="p-10 rounded-3xl bg-tl-creme border border-tl-marrom/14 text-center text-sm text-tl-marrom-suave">
          Nenhum conteúdo salvo nesta visualização. Toque em “Salvar” em qualquer publicação para guardá-la aqui.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((item) => (
            <div key={item.id} className="space-y-2">
              <PostCard
                post={item.post}
                currentUser={currentUser}
                onOpenPost={onOpenPost}
                onOpenAuthor={onOpenAuthor}
                onToggleLike={onToggleLike}
                onToggleFavorite={async (postId) => {
                  await onToggleFavorite(postId);
                  loadFavorites();
                }}
                onShare={onShare}
              />
              {collections.length > 0 && (
                <div className="flex items-center justify-end gap-2 px-1 text-xs text-tl-marrom-suave">
                  <span>Coleção:</span>
                  <select
                    value={item.collectionId || ''}
                    onChange={(e) => handleAssign(item.id, e.target.value || null)}
                    className="bg-tl-creme border border-tl-marrom/15 rounded-full px-3 py-1 text-xs text-tl-marrom"
                  >
                    <option value="">Sem coleção</option>
                    {collections.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
