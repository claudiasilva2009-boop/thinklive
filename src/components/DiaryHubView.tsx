import {
  BookHeart,
  Calendar,
  Globe,
  Heart,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { DiaryEntryEnriched, DiaryVisibility, UserPublic } from '../types/thinklive';
import { BotanicalDivider } from './CreativeStickers';
import { UserAvatar } from './ImageWithFallback';
import { TabEditorialHero } from './TabEditorialHero';

interface DiaryHubViewProps {
  currentUser: UserPublic | null;
  onOpenAuthor: (username: string) => void;
  onRequireAuth: () => void;
  onNotify?: (msg: string) => void;
}

const MOOD_SUGGESTIONS = ['Serenidade', 'Melancolia', 'Esperança', 'Reflexão', 'Gratidão', 'Silêncio'];

export function DiaryHubView({
  currentUser,
  onOpenAuthor,
  onRequireAuth,
  onNotify,
}: DiaryHubViewProps) {
  const [activeTab, setActiveTab] = useState<'mine' | 'public'>(currentUser ? 'mine' : 'public');
  const [myEntries, setMyEntries] = useState<DiaryEntryEnriched[]>([]);
  const [publicEntries, setPublicEntries] = useState<DiaryEntryEnriched[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Date Organization
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | DiaryVisibility>('all');
  const [monthFilter, setMonthFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Composer / Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<DiaryEntryEnriched | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [visibility, setVisibility] = useState<DiaryVisibility>('private');
  const [mood, setMood] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser && activeTab === 'mine') {
      setActiveTab('public');
    }
  }, [currentUser, activeTab]);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const [pubRes, mineRes] = await Promise.all([
        api.getPublicDiary({ sort: sortOrder, q: searchQuery, month: monthFilter }),
        currentUser
          ? api.getMyDiary({
              sort: sortOrder,
              visibility: visibilityFilter,
              q: searchQuery,
              month: monthFilter,
            })
          : Promise.resolve({ entries: [] }),
      ]);
      setPublicEntries(pubRes.entries);
      setMyEntries(mineRes.entries);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [currentUser, sortOrder, visibilityFilter, searchQuery, monthFilter]);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadEntries();
    }, 120);
    return () => clearTimeout(t);
  }, [loadEntries]);

  function openNewEntry() {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    setEditingEntry(null);
    setTitle('');
    setContent('');
    setVisibility('private');
    setMood('');
    setFormError('');
    setEditorOpen(true);
  }

  function openEditEntry(entry: DiaryEntryEnriched) {
    setEditingEntry(entry);
    setTitle(entry.title);
    setContent(entry.content);
    setVisibility(entry.visibility);
    setMood(entry.mood || '');
    setFormError('');
    setEditorOpen(true);
  }

  async function handleSaveEntry(e: FormEvent) {
    e.preventDefault();
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    if (!title.trim() && !content.trim()) {
      setFormError('Escreva um título ou texto para guardar este registro.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      if (editingEntry) {
        await api.updateDiaryEntry(editingEntry.id, {
          title: title.trim() || 'Pensamento do dia',
          content: content.trim(),
          visibility,
          mood: mood.trim(),
        });
        onNotify?.('Registro do diário atualizado.');
      } else {
        await api.createDiaryEntry({
          title: title.trim() || 'Pensamento do dia',
          content: content.trim(),
          visibility,
          mood: mood.trim(),
        });
        onNotify?.(
          visibility === 'private'
            ? 'Pensamento salvo em privado no seu diário.'
            : 'Pensamento publicado na página pública do diário.'
        );
      }
      setEditorOpen(false);
      await loadEntries();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Não foi possível salvar no diário.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteEntry(id: string) {
    try {
      await api.deleteDiaryEntry(id);
      setMyEntries((prev) => prev.filter((e) => e.id !== id));
      setPublicEntries((prev) => prev.filter((e) => e.id !== id));
      setConfirmDeleteId(null);
      onNotify?.('Registro excluído do diário.');
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : 'Erro ao excluir registro.');
    }
  }

  async function handleToggleLike(entryId: string) {
    if (!currentUser) {
      onRequireAuth();
      return;
    }
    const res = await api.toggleDiaryLike(entryId);
    setPublicEntries((prev) => prev.map((e) => (e.id === entryId ? res.entry : e)));
    setMyEntries((prev) => prev.map((e) => (e.id === entryId ? res.entry : e)));
  }

  const displayedList = activeTab === 'mine' ? myEntries : publicEntries;

  // Group entries cleanly by Month/Year for intuitive chronological browsing
  const availableMonths = useMemo(() => {
    const all = [...myEntries, ...publicEntries];
    const keys = Array.from(new Set(all.map((e) => e.createdAt.slice(0, 7)))).sort().reverse();
    return keys;
  }, [myEntries, publicEntries]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, DiaryEntryEnriched[]>();
    for (const entry of displayedList) {
      const label = new Date(entry.createdAt).toLocaleDateString('pt-BR', {
        month: 'long',
        year: 'numeric',
      });
      const cap = label.charAt(0).toUpperCase() + label.slice(1);
      if (!map.has(cap)) map.set(cap, []);
      map.get(cap)!.push(entry);
    }
    return Array.from(map.entries());
  }, [displayedList]);

  const todayFormatted = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-7 md:py-10 pb-28 space-y-8">
      {/* Diary Editorial Hero */}
      <TabEditorialHero
        imageUrl="/src/assets/images/diary_top_hero_1795044945871.jpg"
        imageAlt="Caderno de diário aberto sobre mesa de madeira com pena de latão, vela acesa e flores secas"
        objectPositionClass="object-[center_55%]"
        kickerIcon={<BookHeart className="w-3.5 h-3.5 text-[#F2B880]" />}
        kicker="Pensamentos & Sentimentos · Thinklive"
        title="Diário"
        phrase="“Um caderno íntimo para guardar dias, silêncios, cartas soltas e pequenos desvios.”"
        actions={
          <button
            type="button"
            onClick={openNewEntry}
            className="autumn-glow-btn px-5 py-2.5 text-xs md:text-sm font-medium bg-tl-laranja text-tl-creme border border-[#F2B880]/30 rounded-full hover:bg-tl-terracota active:scale-95 inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Escrever no diário</span>
          </button>
        }
      />

      {/* Navigation Tabs + Date & Visibility Controls */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-tl-marrom/14 pb-3">
          <div className="flex items-center gap-2">
            {currentUser && (
              <button
                type="button"
                onClick={() => setActiveTab('mine')}
                className={`px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  activeTab === 'mine'
                    ? 'bg-tl-marrom text-tl-creme'
                    : 'bg-tl-bege/65 text-tl-marrom-suave hover:text-tl-marrom'
                }`}
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Meu diário ({myEntries.length})</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveTab('public')}
              className={`px-4 py-2 rounded-full text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'public'
                  ? 'bg-tl-marrom text-tl-creme'
                  : 'bg-tl-bege/65 text-tl-marrom-suave hover:text-tl-marrom'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Pensamentos públicos ({publicEntries.length})</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'mine' && currentUser && (
              <select
                aria-label="Filtrar por visibilidade"
                value={visibilityFilter}
                onChange={(e) => setVisibilityFilter(e.target.value as typeof visibilityFilter)}
                className="rounded-full bg-tl-creme border border-tl-marrom/15 px-3 py-1.5 text-xs text-tl-marrom"
              >
                <option value="all">Privados e públicos</option>
                <option value="private">Somente privados</option>
                <option value="public">Somente públicos</option>
              </select>
            )}

            <select
              aria-label="Filtrar por mês"
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="rounded-full bg-tl-creme border border-tl-marrom/15 px-3 py-1.5 text-xs text-tl-marrom"
            >
              <option value="">Todas as datas</option>
              {availableMonths.map((ym) => {
                const [y, m] = ym.split('-');
                const label = new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('pt-BR', {
                  month: 'long',
                  year: 'numeric',
                });
                return (
                  <option key={ym} value={ym}>
                    {label.charAt(0).toUpperCase() + label.slice(1)}
                  </option>
                );
              })}
            </select>

            <select
              aria-label="Ordenar por data"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="rounded-full bg-tl-creme border border-tl-marrom/15 px-3 py-1.5 text-xs text-tl-marrom"
            >
              <option value="newest">Mais recentes</option>
              <option value="oldest">Mais antigos</option>
            </select>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-tl-marrom-suave absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por palavra, título ou sentimento…"
            className="w-full pl-10 pr-4 py-2 rounded-full bg-tl-creme border border-tl-marrom/15 text-xs text-tl-marrom placeholder:text-tl-marrom-suave/70 focus:outline-none focus:border-tl-laranja"
          />
        </div>
      </section>

      {!currentUser && activeTab === 'public' && (
        <div className="p-4 rounded-2xl bg-tl-bege/65 border border-tl-marrom/14 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-tl-marrom">
            Você está lendo pensamentos públicos. Entre na sua conta para escrever seu diário privado ou compartilhar reflexões.
          </p>
          <button
            type="button"
            onClick={onRequireAuth}
            className="px-4 py-1.5 rounded-full text-xs font-medium bg-tl-marrom text-tl-creme hover:bg-tl-terracota cursor-pointer"
          >
            Entrar para escrever
          </button>
        </div>
      )}

      {/* Chronological Entries */}
      {loading ? (
        <div className="py-14 text-center text-sm text-tl-marrom-suave bg-tl-creme rounded-3xl border border-tl-marrom/12">
          Abrindo páginas do diário…
        </div>
      ) : groupedByDate.length === 0 ? (
        <div className="rounded-3xl bg-tl-creme border border-tl-marrom/14 p-12 text-center space-y-3 editorial-shadow">
          <BookHeart className="w-9 h-9 text-tl-laranja mx-auto opacity-80" strokeWidth={1.5} />
          <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
            {activeTab === 'mine'
              ? 'Nenhuma página encontrada no seu diário'
              : 'Nenhum pensamento público encontrado'}
          </h2>
          <p className="font-literary text-sm text-tl-marrom-suave max-w-md mx-auto">
            Comece hoje escrevendo uma lembrança, desabafo ou reflexão tranquila.
          </p>
          <button
            type="button"
            onClick={openNewEntry}
            className="autumn-glow-btn px-5 py-2 rounded-full text-xs font-medium bg-tl-laranja text-tl-creme hover:bg-tl-terracota cursor-pointer"
          >
            Escrever agora
          </button>
        </div>
      ) : (
        <div className="space-y-9">
          {groupedByDate.map(([monthLabel, groupEntries]) => (
            <div key={monthLabel} className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-tl-terracota">
                <Calendar className="w-3.5 h-3.5 text-tl-laranja" />
                <span>{monthLabel}</span>
              </div>

              <div className="space-y-5">
                {groupEntries.map((entry) => {
                  const isOwner = currentUser?.id === entry.userId;
                  const formattedDate = new Date(entry.createdAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  });
                  return (
                    <article
                      key={entry.id}
                      className="rounded-3xl bg-tl-creme border border-tl-marrom/14 p-6 md:p-8 editorial-shadow space-y-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-xs text-tl-marrom-suave">
                          {activeTab === 'public' && (
                            <>
                              <button
                                type="button"
                                onClick={() => onOpenAuthor(entry.author.username)}
                                className="inline-flex items-center gap-2 text-tl-marrom font-medium hover:text-tl-terracota cursor-pointer"
                              >
                                <UserAvatar
                                  src={entry.author.avatarUrl}
                                  name={entry.author.displayName}
                                  size="sm"
                                />
                                <span>{entry.author.displayName}</span>
                              </button>
                              <span aria-hidden="true">·</span>
                            </>
                          )}
                          <span>{formattedDate}</span>
                          {entry.mood && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="italic text-tl-terracota">{entry.mood}</span>
                            </>
                          )}
                          <span aria-hidden="true">·</span>
                          <span className="inline-flex items-center gap-1 font-medium text-tl-marrom">
                            {entry.visibility === 'private' ? (
                              <>
                                <Lock className="w-3 h-3 text-tl-terracota" />
                                <span>Privado</span>
                              </>
                            ) : (
                              <>
                                <Globe className="w-3 h-3 text-tl-laranja" />
                                <span>Público</span>
                              </>
                            )}
                          </span>
                        </div>

                        {isOwner && (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditEntry(entry)}
                              className="px-3 py-1 rounded-full text-xs bg-tl-bege/75 text-tl-marrom hover:text-tl-terracota inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Editar</span>
                            </button>
                            {confirmDeleteId === entry.id ? (
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="px-3 py-1 rounded-full text-xs bg-tl-terracota text-tl-creme font-semibold cursor-pointer"
                              >
                                Confirmar exclusão
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(entry.id)}
                                className="px-3 py-1 rounded-full text-xs text-tl-terracota hover:bg-tl-bege/75 inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Excluir</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <h2 className="font-editorial text-2xl md:text-3xl font-semibold text-tl-marrom leading-snug">
                        {entry.title}
                      </h2>

                      <p className="font-literary text-[15px] md:text-base text-tl-marrom/90 leading-[1.8] whitespace-pre-line max-w-3xl">
                        {entry.content}
                      </p>

                      {entry.visibility === 'public' && (
                        <div className="pt-3 border-t border-tl-areia/65 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => handleToggleLike(entry.id)}
                            className={`px-3 py-1.5 rounded-full text-xs inline-flex items-center gap-1.5 cursor-pointer ${
                              entry.isLiked
                                ? 'bg-tl-bege text-tl-terracota font-semibold'
                                : 'text-tl-marrom-suave hover:bg-tl-bege/65'
                            }`}
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${entry.isLiked ? 'fill-tl-laranja text-tl-laranja' : ''}`}
                            />
                            <span className="tabular-nums">
                              {entry.likesCount} {entry.likesCount === 1 ? 'abraço' : 'abraços'}
                            </span>
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Composer / Edit Modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-tl-marrom/55 backdrop-blur-sm flex items-center justify-center p-0 md:p-6">
          <div className="bg-tl-creme w-full max-w-2xl h-full md:h-auto md:max-h-[90vh] md:rounded-3xl border border-tl-marrom/18 editorial-shadow flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-tl-bege/75 border-b border-tl-marrom/14 flex items-center justify-between">
              <div>
                <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
                  {editingEntry ? 'Editar página do diário' : 'Nova página do diário'}
                </h2>
                <p className="text-xs text-tl-marrom-suave capitalize">
                  {editingEntry
                    ? new Date(editingEntry.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })
                    : todayFormatted}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                aria-label="Fechar"
                className="p-2 rounded-full text-tl-marrom hover:bg-tl-areia/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="flex-1 overflow-y-auto p-5 md:p-7 space-y-5">
              {/* Visibility toggle */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-tl-marrom-suave">
                  Privacidade deste pensamento
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setVisibility('private')}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-colors ${
                      visibility === 'private'
                        ? 'bg-tl-bege border-tl-laranja text-tl-marrom'
                        : 'bg-tl-bege/35 border-tl-marrom/14 text-tl-marrom-suave hover:text-tl-marrom'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Lock className="w-3.5 h-3.5 text-tl-terracota" />
                      <span>Privado</span>
                    </div>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      Somente você visualiza, protegido pela sua conta.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVisibility('public')}
                    className={`p-3 rounded-2xl border text-left cursor-pointer transition-colors ${
                      visibility === 'public'
                        ? 'bg-tl-bege border-tl-laranja text-tl-marrom'
                        : 'bg-tl-bege/35 border-tl-marrom/14 text-tl-marrom-suave hover:text-tl-marrom'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <Globe className="w-3.5 h-3.5 text-tl-laranja" />
                      <span>Público</span>
                    </div>
                    <p className="text-[11px] opacity-80 mt-0.5">
                      Outros leitores podem ler na página de pensamentos públicos.
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título do pensamento ou dia…"
                  className="w-full font-editorial text-2xl font-semibold bg-transparent border-b border-tl-marrom/20 pb-2 text-tl-marrom placeholder:text-tl-marrom-suave/55 focus:outline-none focus:border-tl-laranja"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-tl-marrom-suave mr-1">Sentimento (opcional):</span>
                  {MOOD_SUGGESTIONS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMood(mood === m ? '' : m)}
                      className={`px-2.5 py-1 rounded-full text-[11px] border cursor-pointer ${
                        mood === m
                          ? 'bg-tl-marrom text-tl-creme border-tl-marrom'
                          : 'bg-tl-bege/55 text-tl-marrom-suave border-tl-marrom/14 hover:text-tl-marrom'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <textarea
                  rows={9}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Escreva livremente seus pensamentos, sentimentos, memórias ou desabafos…"
                  className="w-full rounded-2xl bg-tl-bege/45 border border-tl-marrom/15 p-4 font-literary text-base text-tl-marrom placeholder:text-tl-marrom-suave/55 focus:outline-none focus:border-tl-laranja leading-relaxed"
                />
              </div>

              {formError && <p className="text-xs font-semibold text-tl-terracota">{formError}</p>}

              <div className="flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 rounded-full text-xs text-tl-marrom-suave hover:text-tl-marrom cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="autumn-glow-btn px-5 py-2.5 rounded-full text-xs font-medium bg-tl-laranja text-tl-creme hover:bg-tl-terracota disabled:opacity-45 cursor-pointer"
                >
                  {saving ? 'Salvando…' : editingEntry ? 'Salvar alterações' : 'Guardar página'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
