import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Newspaper,
  RefreshCw,
  Search,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import {
  NewsArticle,
  NewsCategory,
  NewsSourceName,
  NewsSourceStatus,
  PostWithAuthor,
  UserPublic,
} from '../types/thinklive';
import { BotanicalDivider } from './CreativeStickers';
import { ImageWithFallback } from './ImageWithFallback';
import { PostCard } from './PostCard';
import { TabEditorialHero } from './TabEditorialHero';

const NEWS_SOURCES: ('Todos' | NewsSourceName)[] = [
  'Todos',
  'G1',
  'UOL Notícias',
  'CNN Brasil',
  'BBC News Brasil',
  'Agência Brasil',
];

const NEWS_CATEGORIES: ('Todas' | NewsCategory)[] = [
  'Todas',
  'Brasil',
  'Mundo',
  'Política',
  'Educação',
  'Tecnologia',
  'Cultura',
  'Entretenimento',
  'Ciência',
  'Economia',
];

interface NewsHubViewProps {
  communityPosts: PostWithAuthor[];
  currentUser: UserPublic | null;
  onOpenPost: (post: PostWithAuthor) => void;
  onOpenAuthor: (username: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleFavorite: (postId: string) => void;
  onShare: (post: PostWithAuthor) => void;
  onEditPost: (post: PostWithAuthor) => void;
  onDeletePost: (postId: string) => void;
  onOpenPublish: () => void;
}

function formatSyncTimestamp(iso: string | null): string {
  if (!iso) return 'Aguardando primeira sincronização';
  const dt = new Date(iso);
  return dt.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatArticleDate(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function NewsHubView({
  communityPosts,
  currentUser,
  onOpenPost,
  onOpenAuthor,
  onToggleLike,
  onToggleFavorite,
  onShare,
  onEditPost,
  onDeletePost,
  onOpenPublish,
}: NewsHubViewProps) {
  const [tab, setTab] = useState<'jornalismo' | 'comunidade'>('jornalismo');
  const [sourceFilter, setSourceFilter] = useState<'Todos' | NewsSourceName>('Todos');
  const [categoryFilter, setCategoryFilter] = useState<'Todas' | NewsCategory>('Todas');
  const [searchQuery, setSearchQuery] = useState('');

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [sourceStatuses, setSourceStatuses] = useState<NewsSourceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSourceStatus, setShowSourceStatus] = useState(false);

  const fetchNews = useCallback(async () => {
    try {
      const res = await api.getNews({
        source: sourceFilter,
        category: categoryFilter,
        q: searchQuery,
      });
      setArticles(res.articles);
      setLastSyncedAt(res.lastSyncedAt);
      setSourceStatuses(res.sourceStatuses);
      setErrorMsg('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Não foi possível carregar as notícias.');
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource('/api/news/stream');
      es.addEventListener('news_synced', () => {
        fetchNews();
      });
    } catch {
      // fallback polling handles updates
    }

    const pollTimer = setInterval(() => {
      fetchNews();
    }, 60 * 1000);

    return () => {
      es?.close();
      clearInterval(pollTimer);
    };
  }, [fetchNews]);

  async function handleManualSync() {
    setSyncing(true);
    setErrorMsg('');
    try {
      await api.syncNews();
      await fetchNews();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Falha ao sincronizar feeds.');
    } finally {
      setSyncing(false);
    }
  }

  const unavailableCount = sourceStatuses.filter((s) => s.lastAttemptAt && !s.ok).length;
  const leadArticle = articles[0] || null;
  const remainingArticles = articles.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-7 md:py-10 pb-28 space-y-8">
      {/* Editorial Newspaper Hero */}
      <TabEditorialHero
        imageUrl="/assets/aistudio/85e204d77a90e601dce6d892fe8666e1_b2c33455.jpg"
        imageAlt="Xícara artesanal de café escuro vista de cima em fundo preto"
        objectPositionClass="object-center"
        kickerIcon={<Newspaper className="w-3.5 h-3.5 text-[#F2B880]" />}
        kicker="Central Editorial de Notícias · Thinklive"
        title="Notícias & Jornalismo"
        phrase="“Ler o presente com atenção crítica, fonte clara e calma para compreender o mundo.”"
        actions={
          <div className="inline-flex p-1 rounded-full bg-[#FAF5EC]/16 backdrop-blur-md border border-[#FAF5EC]/25">
            <button
              type="button"
              onClick={() => setTab('jornalismo')}
              className={`px-4 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === 'jornalismo' ? 'bg-[#FAF5EC] text-[#2A1912] font-semibold' : 'text-[#FAF5EC] hover:bg-[#FAF5EC]/15'
              }`}
            >
              Jornalismo em tempo real
            </button>
            <button
              type="button"
              onClick={() => setTab('comunidade')}
              className={`px-4 py-1.5 text-xs rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === 'comunidade' ? 'bg-[#FAF5EC] text-[#2A1912] font-semibold' : 'text-[#FAF5EC] hover:bg-[#FAF5EC]/15'
              }`}
            >
              Notas da comunidade ({communityPosts.length})
            </button>
          </div>
        }
      />

      {tab === 'jornalismo' && (
        <section className="rounded-2xl bg-tl-creme border border-tl-marrom/14 px-5 py-3.5 editorial-shadow flex flex-wrap items-center justify-between gap-3 text-xs text-tl-marrom-suave">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-tl-laranja" />
              <span>Última sincronização: {formatSyncTimestamp(lastSyncedAt)}</span>
            </span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setShowSourceStatus((v) => !v)}
              className="inline-flex items-center gap-1.5 hover:text-tl-terracota underline-offset-2 hover:underline cursor-pointer"
            >
              {unavailableCount > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5 text-tl-laranja" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-tl-marrom-suave" />
              )}
              <span>
                {unavailableCount > 0
                  ? `${unavailableCount} fonte(s) com instabilidade — ver detalhes`
                  : '5 veículos conectados (G1, UOL, CNN, BBC, Agência Brasil)'}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={syncing}
            className="autumn-glow-surface inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-tl-bege border border-tl-marrom/15 hover:border-tl-laranja text-tl-marrom font-medium active:scale-95 disabled:opacity-50 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>{syncing ? 'Sincronizando…' : 'Atualizar agora'}</span>
          </button>
        </section>
      )}

      <section className={tab === 'jornalismo' && showSourceStatus && sourceStatuses.length > 0 ? 'space-y-3' : 'hidden'}>
        {tab === 'jornalismo' && showSourceStatus && sourceStatuses.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {sourceStatuses.map((st) => (
              <div
                key={st.source}
                className="p-3 rounded-xl bg-tl-bege/65 border border-tl-marrom/14 text-xs space-y-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-tl-marrom">{st.source}</span>
                  <span className={st.ok ? 'text-tl-marrom font-semibold' : 'text-tl-terracota font-semibold'}>
                    {st.ok ? 'Ativo' : 'Indisponível'}
                  </span>
                </div>
                <div className="text-[11px] text-tl-marrom-suave tabular-nums">
                  {st.itemCount} matérias no índice
                </div>
                {st.error && <div className="text-[11px] text-tl-terracota">{st.error}</div>}
              </div>
            ))}
          </div>
        )}
      </section>

      {tab === 'jornalismo' ? (
        <>
          {/* Filter Bar */}
          <section className="space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-1">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-tl-marrom-suave shrink-0">Veículo:</span>
                {NEWS_SOURCES.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setSourceFilter(src)}
                    className={`autumn-glow-link relative py-1.5 text-xs whitespace-nowrap cursor-pointer ${
                      sourceFilter === src
                        ? 'text-tl-terracota font-semibold'
                        : 'text-tl-marrom-suave hover:text-tl-marrom'
                    }`}
                  >
                    {src}
                    {sourceFilter === src && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-tl-laranja" />
                    )}
                  </button>
                ))}
              </div>

              <div className="relative w-full lg:w-72">
                <Search className="w-4 h-4 text-tl-marrom-suave absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filtrar manchetes por assunto…"
                  className="w-full pl-10 pr-3.5 py-2 text-xs rounded-full bg-tl-creme border border-tl-marrom/15 text-tl-marrom placeholder:text-tl-marrom-suave/70 focus:outline-none focus:border-tl-laranja"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 overflow-x-auto no-scrollbar border-b border-tl-marrom/12 pb-2">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-tl-marrom-suave shrink-0">Editorias:</span>
              {NEWS_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`autumn-glow-link py-1 text-xs whitespace-nowrap cursor-pointer ${
                    categoryFilter === cat
                      ? 'text-tl-terracota font-semibold underline underline-offset-4 decoration-tl-laranja'
                      : 'text-tl-marrom-suave hover:text-tl-marrom'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </section>

          {errorMsg && (
            <div className="p-4 rounded-2xl bg-tl-creme border border-tl-laranja/50 text-xs text-tl-terracota flex items-center justify-between gap-3">
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={handleManualSync}
                className="underline font-semibold cursor-pointer"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-16 text-center text-sm text-tl-marrom-suave bg-tl-creme rounded-3xl border border-tl-marrom/12">
              Sincronizando edições dos veículos jornalísticos…
            </div>
          ) : articles.length === 0 ? (
            <div className="py-16 px-6 text-center bg-tl-creme border border-tl-marrom/14 rounded-3xl space-y-3 editorial-shadow">
              <p className="font-editorial text-2xl font-semibold text-tl-marrom">Nenhuma matéria encontrada para este filtro.</p>
              <p className="text-sm text-tl-marrom-suave">
                Tente selecionar outra editoria ou veículo, ou atualizar os feeds agora.
              </p>
              <div className="pt-2 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSourceFilter('Todos');
                    setCategoryFilter('Todas');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 text-xs font-medium bg-tl-bege text-tl-marrom rounded-full cursor-pointer"
                >
                  Limpar filtros
                </button>
                <button
                  type="button"
                  onClick={handleManualSync}
                  className="px-4 py-2 text-xs font-medium bg-tl-laranja text-tl-creme rounded-full cursor-pointer"
                >
                  Sincronizar veículos
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {leadArticle && (
                <article className="autumn-glow-card group bg-tl-creme border border-tl-marrom/14 rounded-3xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 editorial-shadow editorial-card-lift">
                  {leadArticle.imageUrl && (
                    <div className="autumn-glow-image lg:col-span-6 aspect-[16/10] lg:aspect-auto bg-tl-bege overflow-hidden">
                      <ImageWithFallback
                        src={leadArticle.imageUrl}
                        alt={leadArticle.title}
                        fallbackLabel={leadArticle.source}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                    </div>
                  )}
                  <div
                    className={`relative z-[2] p-6 md:p-8 flex flex-col justify-between ${
                      leadArticle.imageUrl ? 'lg:col-span-6' : 'lg:col-span-12'
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="uppercase tracking-wider font-semibold text-tl-terracota">
                          {leadArticle.source}
                        </span>
                        <span aria-hidden="true" className="text-tl-marrom-suave">·</span>
                        <span className="text-tl-marrom-suave font-medium">{leadArticle.category}</span>
                        <span aria-hidden="true" className="text-tl-marrom-suave">·</span>
                        <span className="text-tl-marrom-suave tabular-nums">
                          {formatArticleDate(leadArticle.publishedAt)}
                        </span>
                      </div>
                      <h2 className="autumn-glow-link font-editorial text-2xl md:text-4xl font-semibold text-tl-marrom leading-tight text-balance">
                        {leadArticle.title}
                      </h2>
                      {leadArticle.summary && (
                        <p className="font-literary text-base text-tl-marrom/90 leading-relaxed">
                          {leadArticle.summary}
                        </p>
                      )}
                    </div>

                    <div className="mt-6 pt-4 border-t border-tl-areia/70 flex flex-wrap items-center justify-between gap-3">
                      <span className="text-xs text-tl-marrom-suave">
                        Fonte original: <strong className="text-tl-marrom">{leadArticle.source}</strong>
                        {leadArticle.author ? ` · ${leadArticle.author}` : ''}
                      </span>
                      <a
                        href={leadArticle.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="autumn-glow-btn inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-tl-laranja text-tl-creme border border-tl-terracota/20 rounded-full hover:bg-tl-terracota active:scale-95"
                      >
                        <span>Ler no {leadArticle.source}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </article>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {remainingArticles.map((art) => (
                  <article
                    key={art.id}
                    className="autumn-glow-card group bg-tl-creme border border-tl-marrom/14 rounded-2xl overflow-hidden flex flex-col justify-between editorial-shadow editorial-card-lift"
                  >
                    <div className="relative z-[2]">
                      {art.imageUrl && (
                        <div className="autumn-glow-image aspect-[16/9] bg-tl-bege overflow-hidden">
                          <ImageWithFallback
                            src={art.imageUrl}
                            alt={art.title}
                            fallbackLabel={art.source}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                        </div>
                      )}
                      <div className="p-5 space-y-2.5">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-tl-marrom-suave">
                          <span className="uppercase tracking-wider font-semibold text-tl-terracota">
                            {art.source}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{art.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">{formatArticleDate(art.publishedAt)}</span>
                        </div>

                        <h3 className="autumn-glow-link font-editorial text-xl font-semibold text-tl-marrom leading-snug group-hover:text-tl-terracota">
                          {art.title}
                        </h3>

                        {art.summary && (
                          <p className="font-literary text-sm text-tl-marrom/85 leading-relaxed line-clamp-4">
                            {art.summary}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="relative z-[2] px-5 pb-5 pt-3 border-t border-tl-areia/65 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-tl-marrom-suave truncate">
                        Créditos: {art.source}
                      </span>
                      <a
                        href={art.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="autumn-glow-surface inline-flex items-center gap-1 px-3 py-1 rounded-full bg-tl-bege border border-tl-marrom/14 text-xs font-medium text-tl-marrom hover:border-tl-laranja hover:text-tl-terracota shrink-0"
                      >
                        <span>Abrir original</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </article>
                ))}
              </div>

              <p className="text-[11px] text-tl-marrom-suave border-t border-tl-marrom/14 pt-4">
                Aviso editorial: A Thinklive indexa apenas títulos, resumos públicos e metadados fornecidos pelos feeds RSS oficiais de G1, UOL Notícias, CNN Brasil, BBC News Brasil e Agência Brasil, atribuindo autoria integral e direcionando o leitor às publicações originais.
              </p>
            </div>
          )}
        </>
      ) : (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-tl-marrom-suave">
              Notas, comentários e agenda cultural compartilhados pelos autores da Thinklive.
            </p>
            <button
              type="button"
              onClick={onOpenPublish}
              className="autumn-glow-btn px-4 py-2 text-xs font-medium bg-tl-laranja text-tl-creme border border-tl-terracota/20 rounded-full hover:bg-tl-terracota inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Publicar nota cultural</span>
            </button>
          </div>

          {communityPosts.length === 0 ? (
            <p className="text-sm text-tl-marrom-suave py-12 text-center bg-tl-creme rounded-3xl border border-tl-marrom/12">
              Nenhuma publicação comunitária na categoria Notícias ainda.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {communityPosts.map((p) => (
                <PostCard
                  key={p.id}
                  post={p}
                  currentUser={currentUser}
                  onOpenPost={onOpenPost}
                  onOpenAuthor={onOpenAuthor}
                  onToggleLike={onToggleLike}
                  onToggleFavorite={onToggleFavorite}
                  onShare={onShare}
                  onEdit={onEditPost}
                  onDelete={onDeletePost}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
