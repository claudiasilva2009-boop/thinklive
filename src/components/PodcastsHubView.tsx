import {
  Bookmark,
  Clock,
  ExternalLink,
  Headphones,
  Heart,
  Loader2,
  Mic,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Search,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  PodcastEpisode,
  PodcastGenre,
  PodcastProgressEntry,
  PostWithAuthor,
  UserPodcastState,
  UserPublic,
} from '../types/thinklive';
import { useAmbientSound } from './AmbientSoundContext';
import { BotanicalDivider } from './CreativeStickers';
import { ImageWithFallback } from './ImageWithFallback';
import { PostCard } from './PostCard';
import { TabEditorialHero } from './TabEditorialHero';

interface PodcastsHubViewProps {
  currentUser: UserPublic | null;
  relatedPosts: PostWithAuthor[];
  onOpenPost: (post: PostWithAuthor) => void;
  onOpenAuthor: (username: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleFavorite: (postId: string) => void;
  onShare: (post: PostWithAuthor) => void;
  onRequireAuth: () => void;
  onOpenPublish?: () => void;
  onNotify?: (msg: string) => void;
}

const GUEST_STORAGE_KEY = 'thinklive_guest_podcast_state_v1';

interface GuestPodcastState {
  favoriteGenres: PodcastGenre[];
  favoriteEpisodes: PodcastEpisode[];
  progressMap: Record<string, PodcastProgressEntry>;
}

function loadGuestPodcastState(): GuestPodcastState {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<GuestPodcastState>;
      return {
        favoriteGenres: Array.isArray(parsed.favoriteGenres) ? parsed.favoriteGenres : [],
        favoriteEpisodes: Array.isArray(parsed.favoriteEpisodes) ? parsed.favoriteEpisodes : [],
        progressMap: parsed.progressMap && typeof parsed.progressMap === 'object' ? parsed.progressMap : {},
      };
    }
  } catch {
    // ignore
  }
  return { favoriteGenres: [], favoriteEpisodes: [], progressMap: {} };
}

function saveGuestPodcastState(state: GuestPodcastState) {
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function formatClock(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const total = Math.floor(sec);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function PodcastsHubView({
  currentUser,
  relatedPosts,
  onOpenPost,
  onOpenAuthor,
  onToggleLike,
  onToggleFavorite,
  onShare,
  onOpenPublish,
  onNotify,
}: PodcastsHubViewProps) {
  const { stopGlobal, stopPoemAtmosphere } = useAmbientSound();

  const [genres, setGenres] = useState<PodcastGenre[]>([]);
  const [selectedGenre, setSelectedGenre] = useState<'Todos' | PodcastGenre>('Todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [sectionTab, setSectionTab] = useState<'explorar' | 'recentes' | 'favoritos'>('explorar');

  const [items, setItems] = useState<PodcastEpisode[]>([]);
  const [recentEpisodes, setRecentEpisodes] = useState<PodcastEpisode[]>([]);
  const [serverRecommended, setServerRecommended] = useState<PodcastEpisode[]>([]);
  const [userState, setUserState] = useState<UserPodcastState | null>(null);
  const [guestState, setGuestState] = useState<GuestPodcastState>(() => loadGuestPodcastState());
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentEpisode, setCurrentEpisode] = useState<PodcastEpisode | null>(null);
  const [usingProxyStream, setUsingProxyStream] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<1 | 1.25 | 1.5>(1);
  const pendingResumeSecRef = useRef<number | null>(null);
  const lastSavedSyncRef = useRef<number>(0);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.getPodcastCatalog({
        genre: selectedGenre === 'Todos' ? undefined : selectedGenre,
        q: activeSearch || undefined,
      });
      setGenres(res.genres);
      setItems(res.items);
      setRecentEpisodes(res.recent);
      setServerRecommended(res.recommended);
      setUserState(res.userState);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Não foi possível carregar os podcasts.');
    } finally {
      setLoading(false);
    }
  }, [selectedGenre, activeSearch]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const effectiveFavoriteGenres = useMemo<PodcastGenre[]>(() => {
    if (currentUser && userState) return userState.favoriteGenres;
    return guestState.favoriteGenres;
  }, [currentUser, userState, guestState.favoriteGenres]);

  const effectiveFavoriteIds = useMemo<Set<string>>(() => {
    if (currentUser && userState) return new Set(userState.favoriteEpisodeIds);
    return new Set(guestState.favoriteEpisodes.map((e) => e.id));
  }, [currentUser, userState, guestState.favoriteEpisodes]);

  const effectiveFavoriteEpisodes = useMemo<PodcastEpisode[]>(() => {
    if (currentUser && userState) return userState.favoriteEpisodes;
    return guestState.favoriteEpisodes;
  }, [currentUser, userState, guestState.favoriteEpisodes]);

  const effectiveProgressMap = useMemo<Record<string, PodcastProgressEntry>>(() => {
    if (currentUser && userState) return userState.progressMap;
    return guestState.progressMap;
  }, [currentUser, userState, guestState.progressMap]);

  const recommendedEpisodes = useMemo<PodcastEpisode[]>(() => {
    if (effectiveFavoriteGenres.length === 0) {
      return serverRecommended.length > 0 ? serverRecommended : recentEpisodes.slice(0, 6);
    }
    const prefSet = new Set(effectiveFavoriteGenres);
    const pool = [...items, ...recentEpisodes];
    const seen = new Set<string>();
    const matched: PodcastEpisode[] = [];
    for (const ep of pool) {
      if (!seen.has(ep.id) && prefSet.has(ep.genre)) {
        seen.add(ep.id);
        matched.push(ep);
      }
    }
    return matched.length > 0 ? matched.slice(0, 8) : serverRecommended.slice(0, 8);
  }, [effectiveFavoriteGenres, items, recentEpisodes, serverRecommended]);

  const continueListeningList = useMemo<PodcastProgressEntry[]>(() => {
    return Object.values(effectiveProgressMap)
      .filter((entry) => entry.positionSec >= 5 && entry.episodeSnapshot)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6);
  }, [effectiveProgressMap]);

  const persistProgress = useCallback(
    async (episode: PodcastEpisode, pos: number, dur: number) => {
      const safePos = Math.max(0, Math.floor(pos));
      const safeDur = Math.max(safePos, Math.floor(dur || episode.durationSec || 0));
      const entry: PodcastProgressEntry = {
        episodeId: episode.id,
        positionSec: safePos,
        durationSec: safeDur,
        updatedAt: new Date().toISOString(),
        episodeSnapshot: episode,
      };
      if (currentUser) {
        setUserState((prev) =>
          prev
            ? { ...prev, progressMap: { ...prev.progressMap, [episode.id]: entry } }
            : prev
        );
        try {
          const res = await api.savePodcastProgress({
            episodeId: episode.id,
            positionSec: safePos,
            durationSec: safeDur,
            episodeSnapshot: episode,
          });
          setUserState(res.userState);
        } catch {
          // ignore network hiccup on background sync
        }
      } else {
        setGuestState((prev) => {
          const next: GuestPodcastState = {
            ...prev,
            progressMap: { ...prev.progressMap, [episode.id]: entry },
          };
          saveGuestPodcastState(next);
          return next;
        });
      }
    },
    [currentUser]
  );

  async function handleToggleGenrePreference(genre: PodcastGenre) {
    const exists = effectiveFavoriteGenres.includes(genre);
    const nextGenres = exists
      ? effectiveFavoriteGenres.filter((g) => g !== genre)
      : [...effectiveFavoriteGenres, genre];

    if (currentUser) {
      setUserState((prev) => (prev ? { ...prev, favoriteGenres: nextGenres } : prev));
      try {
        const res = await api.savePodcastPreferences(nextGenres);
        setUserState(res.userState);
        onNotify?.('Preferências de podcast atualizadas.');
      } catch {
        onNotify?.('Não foi possível salvar preferências.');
      }
    } else {
      setGuestState((prev) => {
        const next: GuestPodcastState = { ...prev, favoriteGenres: nextGenres };
        saveGuestPodcastState(next);
        return next;
      });
    }
  }

  async function handleToggleEpisodeFavorite(ep: PodcastEpisode) {
    if (currentUser) {
      try {
        const res = await api.togglePodcastFavorite(ep);
        setUserState(res.userState);
        onNotify?.(res.isFavorite ? 'Episódio salvo nos favoritos.' : 'Episódio removido dos favoritos.');
      } catch {
        onNotify?.('Erro ao atualizar favoritos.');
      }
    } else {
      setGuestState((prev) => {
        const exists = prev.favoriteEpisodes.some((f) => f.id === ep.id);
        const favoriteEpisodes = exists
          ? prev.favoriteEpisodes.filter((f) => f.id !== ep.id)
          : [ep, ...prev.favoriteEpisodes];
        const next: GuestPodcastState = { ...prev, favoriteEpisodes };
        saveGuestPodcastState(next);
        onNotify?.(exists ? 'Removido dos favoritos locais.' : 'Salvo nos favoritos locais.');
        return next;
      });
    }
  }

  function startPlayback(ep: PodcastEpisode, resumeFromSec?: number) {
    stopGlobal();
    stopPoemAtmosphere();

    const audio = audioRef.current;
    if (currentEpisode?.id === ep.id && audio) {
      if (typeof resumeFromSec === 'number') {
        audio.currentTime = resumeFromSec;
      }
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(() => {
          setAudioError('Clique novamente para iniciar o áudio ou tente a fonte alternativa.');
        });
      }
      return;
    }

    const saved = effectiveProgressMap[ep.id];
    const startSec =
      typeof resumeFromSec === 'number'
        ? resumeFromSec
        : saved && saved.positionSec > 5 && saved.positionSec < (saved.durationSec || ep.durationSec || 999999) - 10
        ? saved.positionSec
        : 0;

    pendingResumeSecRef.current = startSec;
    lastSavedSyncRef.current = 0;
    setCurrentEpisode(ep);
    setUsingProxyStream(false);
    setAudioError(null);
    setAudioLoading(true);
    setCurrentTime(startSec);
    setDuration(ep.durationSec || 0);
    setIsPlaying(true);
  }

  // Trigger audio element load whenever episode or proxy fallback changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentEpisode) return;
    const src = usingProxyStream
      ? `/api/podcasts/stream?url=${encodeURIComponent(currentEpisode.audioUrl)}`
      : currentEpisode.audioUrl;
    audio.src = src;
    audio.volume = muted ? 0 : volume;
    audio.playbackRate = playbackRate;
    audio.load();
    audio.play().catch(() => {
      // Autoplay might wait on ready event; onCanPlay handles play
    });
  }, [currentEpisode, usingProxyStream]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = muted ? 0 : volume;
  }, [volume, muted]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.playbackRate = playbackRate;
  }, [playbackRate]);

  function handleAudioSeek(newTime: number) {
    const audio = audioRef.current;
    if (!audio || !currentEpisode) return;
    const clamped = Math.max(0, Math.min(duration || audio.duration || 0, newTime));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
    persistProgress(currentEpisode, clamped, duration || audio.duration || currentEpisode.durationSec);
  }

  function handleSkip(delta: number) {
    handleAudioSeek(currentTime + delta);
  }

  const displayedCatalog = useMemo(() => {
    if (sectionTab === 'favoritos') return effectiveFavoriteEpisodes;
    if (sectionTab === 'recentes') return recentEpisodes;
    return items;
  }, [sectionTab, effectiveFavoriteEpisodes, recentEpisodes, items]);

  function renderEpisodeCard(ep: PodcastEpisode) {
    const isCurrent = currentEpisode?.id === ep.id;
    const isFav = effectiveFavoriteIds.has(ep.id);
    const saved = effectiveProgressMap[ep.id];
    const totalDur = saved?.durationSec || ep.durationSec || 0;
    const pct = saved && totalDur > 0 ? Math.min(100, Math.round((saved.positionSec / totalDur) * 100)) : 0;

    return (
      <article
        key={ep.id}
        className={`rounded-2xl bg-tl-creme border p-4 flex flex-col sm:flex-row gap-4 transition-all ${
          isCurrent
            ? 'border-tl-terracota/55 ring-1 ring-tl-terracota/25 bg-tl-creme'
            : 'border-tl-marrom/14 hover:border-tl-marrom/30'
        }`}
      >
        <div className="relative w-full sm:w-28 h-44 sm:h-28 rounded-xl overflow-hidden bg-tl-bege shrink-0 border border-tl-marrom/12">
          <ImageWithFallback
            src={ep.coverUrl}
            alt={ep.title}
            className="w-full h-full object-cover"
            fallbackLabel={ep.showTitle}
          />
          <button
            type="button"
            onClick={() => startPlayback(ep)}
            aria-label={isCurrent && isPlaying ? `Pausar ${ep.title}` : `Reproduzir ${ep.title}`}
            className="absolute inset-0 flex items-center justify-center bg-tl-marrom/35 hover:bg-tl-marrom/50 text-tl-creme transition-colors cursor-pointer"
          >
            <span className="w-11 h-11 rounded-full bg-tl-terracota text-tl-creme flex items-center justify-center shadow-md">
              {isCurrent && isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5 translate-x-0.5" />
              )}
            </span>
          </button>
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-wider text-tl-terracota font-semibold">
              <span className="truncate">{ep.genre} · {ep.showTitle}</span>
              <span className="inline-flex items-center gap-1 text-tl-marrom-suave font-normal">
                <Clock className="w-3 h-3" />
                {ep.durationLabel}
              </span>
            </div>

            <h3 className="font-editorial text-lg font-semibold text-tl-marrom leading-snug mt-1 line-clamp-2">
              {ep.title}
            </h3>

            <p className="text-xs sm:text-sm text-tl-marrom-suave line-clamp-2 mt-1 leading-relaxed">
              {ep.description}
            </p>
          </div>

          {saved && saved.positionSec > 5 && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[11px] text-tl-marrom-suave mb-1">
                <span>Parou em {formatClock(saved.positionSec)}</span>
                <span>{pct}% ouvido</span>
              </div>
              <div className="h-1.5 rounded-full bg-tl-bege overflow-hidden">
                <div
                  className="h-full bg-tl-terracota rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-tl-areia/65">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => startPlayback(ep)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                  isCurrent && isPlaying
                    ? 'bg-tl-terracota text-tl-creme'
                    : 'bg-tl-marrom text-tl-creme hover:bg-tl-terracota'
                }`}
              >
                {isCurrent && isPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    Pausar
                  </>
                ) : saved && saved.positionSec > 5 ? (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Continuar ({formatClock(saved.positionSec)})
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    Ouvir agora
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleToggleEpisodeFavorite(ep)}
                aria-label={isFav ? 'Remover dos favoritos' : 'Salvar nos favoritos'}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs border transition-colors cursor-pointer ${
                  isFav
                    ? 'bg-tl-terracota/12 border-tl-terracota text-tl-terracota font-medium'
                    : 'border-tl-marrom/15 text-tl-marrom-suave hover:text-tl-marrom hover:bg-tl-bege/60'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                {isFav ? 'Favorito' : 'Favoritar'}
              </button>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-tl-marrom-suave">
              <span>{ep.sourceName}</span>
              {ep.sourceUrl && (
                <a
                  href={ep.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-tl-terracota hover:underline"
                >
                  Fonte
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-28 space-y-8">
      {/* Hidden real HTML5 Audio Element */}
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadStart={() => setAudioLoading(true)}
        onCanPlay={() => {
          setAudioLoading(false);
          const audio = audioRef.current;
          if (!audio) return;
          if (pendingResumeSecRef.current !== null && pendingResumeSecRef.current > 0) {
            audio.currentTime = pendingResumeSecRef.current;
            pendingResumeSecRef.current = null;
          }
          if (isPlaying && audio.paused) {
            audio.play().catch(() => {});
          }
        }}
        onLoadedMetadata={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            setDuration(audio.duration);
          }
          if (pendingResumeSecRef.current !== null && pendingResumeSecRef.current > 0) {
            audio.currentTime = Math.min(
              pendingResumeSecRef.current,
              audio.duration ? Math.max(0, audio.duration - 2) : pendingResumeSecRef.current
            );
            pendingResumeSecRef.current = null;
          }
        }}
        onTimeUpdate={() => {
          const audio = audioRef.current;
          if (!audio || !currentEpisode) return;
          setCurrentTime(audio.currentTime);
          if (Number.isFinite(audio.duration) && audio.duration > 0) {
            setDuration(audio.duration);
          }
          const now = Date.now();
          if (now - lastSavedSyncRef.current > 5000) {
            lastSavedSyncRef.current = now;
            persistProgress(
              currentEpisode,
              audio.currentTime,
              audio.duration || currentEpisode.durationSec
            );
          }
        }}
        onPlay={() => {
          setIsPlaying(true);
          setAudioLoading(false);
          setAudioError(null);
        }}
        onPause={() => {
          setIsPlaying(false);
          const audio = audioRef.current;
          if (audio && currentEpisode) {
            persistProgress(
              currentEpisode,
              audio.currentTime,
              audio.duration || currentEpisode.durationSec
            );
          }
        }}
        onEnded={() => {
          setIsPlaying(false);
          const audio = audioRef.current;
          if (audio && currentEpisode) {
            persistProgress(
              currentEpisode,
              audio.duration || duration,
              audio.duration || duration
            );
          }
        }}
        onError={() => {
          if (currentEpisode && !usingProxyStream) {
            setUsingProxyStream(true);
            setAudioError(null);
          } else {
            setAudioLoading(false);
            setIsPlaying(false);
            setAudioError(
              'O servidor deste episódio recusou a transmissão direta. Tente outro episódio ou acesse a fonte original.'
            );
          }
        }}
      />

      {/* Editorial Podcasts Hero */}
      <header className="space-y-6">
        <TabEditorialHero
          imageUrl="/src/assets/images/podcasts_top_hero_1795044946262.jpg"
          imageAlt="Estúdio literário de áudio com microfone vintage, luminária âmbar e estantes de livros"
          objectPositionClass="object-[center_35%]"
          kickerIcon={<Headphones className="w-3.5 h-3.5 text-[#F2B880]" />}
          kicker="Universo de Vozes · Thinklive"
          title="Podcasts & Conversas Reais"
          phrase="“Conversas demoradas sobre literatura, filosofia e cultura para escutar sem pressa.”"
          metaText={`${items.length} episódios no catálogo`}
        />

        <div className="rounded-2xl bg-tl-creme border border-tl-marrom/14 p-4 sm:p-5 editorial-shadow space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setActiveSearch(searchQuery.trim());
            }}
            className="flex items-center gap-2 w-full"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-tl-marrom-suave absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value.trim()) setActiveSearch('');
                }}
                placeholder="Buscar episódio, tema ou programa..."
                className="w-full pl-9 pr-3 py-2 rounded-full bg-tl-papel border border-tl-marrom/18 text-sm text-tl-marrom focus:outline-none focus:border-tl-terracota"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2 rounded-full bg-tl-marrom text-tl-creme text-xs font-medium hover:bg-tl-terracota transition-colors cursor-pointer shrink-0"
            >
              Buscar
            </button>
          </form>

          {/* Favorite Genres Selector */}
          {genres.length > 0 && (
            <div className="pt-3 border-t border-tl-areia/70 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-tl-marrom flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-tl-terracota" />
                Seus gêneros favoritos (personaliza recomendações):
              </span>
              {effectiveFavoriteGenres.length > 0 && (
                <span className="text-[11px] text-tl-marrom-suave">
                  {effectiveFavoriteGenres.length} selecionado(s)
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {genres.map((g) => {
                const active = effectiveFavoriteGenres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => handleToggleGenrePreference(g)}
                    className={`px-3 py-1 rounded-full text-xs border transition-all cursor-pointer ${
                      active
                        ? 'bg-tl-terracota text-tl-creme border-tl-terracota font-medium shadow-xs'
                        : 'bg-tl-papel text-tl-marrom-suave border-tl-marrom/15 hover:border-tl-marrom/35 hover:text-tl-marrom'
                    }`}
                  >
                    {active ? '✓ ' : '+ '}
                    {g}
                  </button>
                );
              })}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Active Persistent Audio Player Bar */}
      {currentEpisode && (
        <section
          aria-label="Player de áudio do podcast"
          className="rounded-2xl bg-tl-marrom text-tl-creme p-4 sm:p-5 editorial-shadow border border-tl-areia/25 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-tl-papel/15 shrink-0 border border-tl-creme/20">
                <ImageWithFallback
                  src={currentEpisode.coverUrl}
                  alt={currentEpisode.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-widest text-tl-areia font-semibold truncate">
                  {currentEpisode.genre} · {currentEpisode.showTitle}
                </div>
                <div className="font-editorial text-lg font-semibold leading-tight truncate">
                  {currentEpisode.title}
                </div>
                <div className="text-[11px] text-tl-creme/75 mt-0.5 flex items-center gap-2">
                  <span>{currentEpisode.sourceName}</span>
                  {audioLoading && (
                    <span className="inline-flex items-center gap-1 text-tl-areia">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Carregando áudio...
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSkip(-15)}
                title="Voltar 15 segundos"
                className="p-2 rounded-full bg-tl-creme/10 hover:bg-tl-creme/20 text-tl-creme transition-colors cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => startPlayback(currentEpisode)}
                aria-label={isPlaying ? 'Pausar episódio' : 'Reproduzir episódio'}
                className="w-11 h-11 rounded-full bg-tl-terracota hover:bg-tl-terracota/90 text-tl-creme flex items-center justify-center shadow-md cursor-pointer"
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 translate-x-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSkip(15)}
                title="Avançar 15 segundos"
                className="p-2 rounded-full bg-tl-creme/10 hover:bg-tl-creme/20 text-tl-creme transition-colors cursor-pointer"
              >
                <RotateCw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() =>
                  setPlaybackRate((r) => (r === 1 ? 1.25 : r === 1.25 ? 1.5 : 1))
                }
                className="px-2.5 py-1 rounded-full bg-tl-creme/10 hover:bg-tl-creme/20 text-xs font-medium cursor-pointer"
              >
                {playbackRate}x
              </button>
            </div>
          </div>

          {/* Scrubber & Volume */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 flex items-center gap-2.5 text-xs tabular-nums">
              <span className="w-12 text-right text-tl-creme/85">{formatClock(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || currentEpisode.durationSec || 100}
                value={Math.min(currentTime, duration || currentEpisode.durationSec || 100)}
                onChange={(e) => handleAudioSeek(Number(e.target.value))}
                aria-label="Progresso do episódio"
                className="flex-1 accent-tl-terracota cursor-pointer"
              />
              <span className="w-12 text-tl-creme/85">
                {formatClock(duration || currentEpisode.durationSec)}
              </span>
            </div>

            <div className="flex items-center gap-2 sm:w-36">
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? 'Ativar áudio' : 'Silenciar áudio'}
                className="text-tl-creme/85 hover:text-tl-creme cursor-pointer"
              >
                {muted || volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setMuted(false);
                  setVolume(Number(e.target.value));
                }}
                aria-label="Volume do podcast"
                className="w-full accent-tl-terracota cursor-pointer"
              />
            </div>
          </div>

          {audioError && (
            <div className="text-xs text-tl-areia bg-tl-creme/10 rounded-xl px-3 py-2 flex items-center justify-between gap-2">
              <span>{audioError}</span>
              {currentEpisode.sourceUrl && (
                <a
                  href={currentEpisode.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline font-medium shrink-0"
                >
                  Abrir fonte
                </a>
              )}
            </div>
          )}
        </section>
      )}

      {/* Continuar Ouvindo */}
      {continueListeningList.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-editorial text-xl font-semibold text-tl-marrom flex items-center gap-2">
              <Mic className="w-4 h-4 text-tl-terracota" />
              Continuar ouvindo
            </h2>
            <span className="text-xs text-tl-marrom-suave">Retome de onde parou</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {continueListeningList.map((entry) => {
              const ep = entry.episodeSnapshot!;
              const pct =
                entry.durationSec > 0
                  ? Math.min(100, Math.round((entry.positionSec / entry.durationSec) * 100))
                  : 0;
              return (
                <button
                  key={ep.id}
                  type="button"
                  onClick={() => startPlayback(ep, entry.positionSec)}
                  className="text-left rounded-xl bg-tl-creme border border-tl-marrom/14 hover:border-tl-terracota/45 p-3 flex items-center gap-3 transition-all cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-tl-bege shrink-0">
                    <ImageWithFallback
                      src={ep.coverUrl}
                      alt={ep.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-wider text-tl-terracota font-semibold truncate">
                      {ep.showTitle}
                    </div>
                    <div className="font-editorial text-sm font-semibold text-tl-marrom truncate">
                      {ep.title}
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-tl-marrom-suave mt-1">
                      <span>{formatClock(entry.positionSec)} / {formatClock(entry.durationSec)}</span>
                      <span>{pct}%</span>
                    </div>
                    <div className="h-1 rounded-full bg-tl-bege overflow-hidden mt-1">
                      <div className="h-full bg-tl-terracota" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Recomendados para Você */}
      {!activeSearch && recommendedEpisodes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
                Recomendados para você
              </h2>
              <p className="text-xs text-tl-marrom-suave">
                {effectiveFavoriteGenres.length > 0
                  ? `Com base nos seus interesses: ${effectiveFavoriteGenres.join(', ')}`
                  : 'Selecione seus gêneros favoritos acima para afinar esta curadoria.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recommendedEpisodes.slice(0, 4).map(renderEpisodeCard)}
          </div>
        </section>
      )}

      <BotanicalDivider />

      {/* Section Tabs + Genre Filter */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-full bg-tl-bege/75 p-1 border border-tl-marrom/12">
            <button
              type="button"
              onClick={() => setSectionTab('explorar')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                sectionTab === 'explorar'
                  ? 'bg-tl-marrom text-tl-creme'
                  : 'text-tl-marrom-suave hover:text-tl-marrom'
              }`}
            >
              Catálogo por gênero
            </button>
            <button
              type="button"
              onClick={() => setSectionTab('recentes')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                sectionTab === 'recentes'
                  ? 'bg-tl-marrom text-tl-creme'
                  : 'text-tl-marrom-suave hover:text-tl-marrom'
              }`}
            >
              Episódios recentes ({recentEpisodes.length})
            </button>
            <button
              type="button"
              onClick={() => setSectionTab('favoritos')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                sectionTab === 'favoritos'
                  ? 'bg-tl-marrom text-tl-creme'
                  : 'text-tl-marrom-suave hover:text-tl-marrom'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              Favoritos ({effectiveFavoriteEpisodes.length})
            </button>
          </div>

          {activeSearch && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveSearch('');
              }}
              className="text-xs text-tl-terracota hover:underline cursor-pointer"
            >
              Limpar busca “{activeSearch}”
            </button>
          )}
        </div>

        {sectionTab === 'explorar' && genres.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {(['Todos', ...genres] as const).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setSelectedGenre(g)}
                className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors cursor-pointer border ${
                  selectedGenre === g
                    ? 'bg-tl-marrom text-tl-creme border-tl-marrom font-medium'
                    : 'bg-tl-creme text-tl-marrom-suave border-tl-marrom/14 hover:border-tl-marrom/35'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-14 flex flex-col items-center justify-center gap-2 text-tl-marrom-suave">
            <Loader2 className="w-6 h-6 animate-spin text-tl-terracota" />
            <span className="text-sm">Sincronizando episódios reais via RSS...</span>
          </div>
        ) : errorMsg ? (
          <div className="rounded-2xl bg-tl-creme border border-tl-terracota/30 p-6 text-center space-y-2">
            <p className="text-sm text-tl-terracota">{errorMsg}</p>
            <button
              type="button"
              onClick={loadCatalog}
              className="px-4 py-1.5 rounded-full bg-tl-marrom text-tl-creme text-xs font-medium cursor-pointer"
            >
              Tentar novamente
            </button>
          </div>
        ) : displayedCatalog.length === 0 ? (
          <div className="rounded-2xl bg-tl-creme border border-tl-marrom/12 p-10 text-center space-y-2">
            <p className="font-editorial text-xl text-tl-marrom">
              {sectionTab === 'favoritos'
                ? 'Nenhum episódio favoritado ainda'
                : 'Nenhum episódio encontrado para este filtro'}
            </p>
            <p className="text-xs text-tl-marrom-suave">
              {sectionTab === 'favoritos'
                ? 'Clique em "Favoritar" em qualquer episódio para guardá-lo aqui.'
                : 'Experimente selecionar outro gênero ou limpar o campo de busca.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayedCatalog.map(renderEpisodeCard)}
          </div>
        )}
      </section>

      {/* Community Discussions */}
      {relatedPosts.length > 0 && (
        <section className="space-y-4 pt-4 border-t border-tl-areia/75">
          <div className="flex items-center justify-between">
            <h2 className="font-editorial text-2xl font-semibold text-tl-marrom">
              Recomendações e notas da comunidade
            </h2>
            {onOpenPublish && (
              <button
                type="button"
                onClick={onOpenPublish}
                className="text-xs font-medium text-tl-terracota hover:underline cursor-pointer"
              >
                Compartilhar nota sobre podcast
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
