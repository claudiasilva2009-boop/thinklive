import { CatalogMediaKind, CatalogWork } from '../src/types/thinklive';
import { getWorkCommunityStats } from './db';

const CACHE_TTL_MS = 15 * 60 * 1000;
const DETAIL_CACHE_TTL_MS = 60 * 60 * 1000;

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const queryCache = new Map<string, CacheEntry<unknown>>();
const workCache = new Map<string, CacheEntry<CatalogWork>>();

function getCached<T>(key: string): T | null {
  const entry = queryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    queryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCached<T>(key: string, value: T, ttl = CACHE_TTL_MS): T {
  queryCache.set(key, { value, expiresAt: Date.now() + ttl });
  return value;
}

function cacheWork(work: CatalogWork): CatalogWork {
  workCache.set(work.id, { value: work, expiresAt: Date.now() + DETAIL_CACHE_TTL_MS });
  return work;
}

function getCachedWork(workId: string): CatalogWork | null {
  const entry = workCache.get(workId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    workCache.delete(workId);
    return null;
  }
  return entry.value;
}

function withCommunityStats(work: CatalogWork): CatalogWork {
  const stats = getWorkCommunityStats(work.id);
  return {
    ...work,
    communityAverage: stats.average,
    communityReviewCount: stats.count,
  };
}

async function fetchJson<T>(url: string, headers: Record<string, string> = {}, timeoutMs = 8000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'ThinkliveEditorial/1.0 (+https://thinklive.app)',
        Accept: 'application/json',
        ...headers,
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ao consultar ${url}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

function stripHtml(html?: string | null): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

const GENRE_TRANSLATIONS: Record<string, string> = {
  drama: 'Drama',
  comedy: 'Comédia',
  crime: 'Crime',
  thriller: 'Suspense',
  mystery: 'Mistério',
  'science-fiction': 'Ficção Científica',
  'sci-fi': 'Ficção Científica',
  'science fiction': 'Ficção Científica',
  'sci-fi & fantasy': 'Ficção e Fantasia',
  fantasy: 'Fantasia',
  romance: 'Romance',
  adventure: 'Aventura',
  horror: 'Terror',
  action: 'Ação',
  'action & adventure': 'Ação e Aventura',
  animation: 'Animação',
  anime: 'Animação',
  family: 'Família',
  documentary: 'Documentário',
  history: 'História',
  historical: 'História',
  biography: 'Biografia',
  music: 'Música',
  musical: 'Musical',
  war: 'Guerra',
  western: 'Faroeste',
  supernatural: 'Sobrenatural',
  espionage: 'Espionagem',
  medical: 'Drama Médico',
  legal: 'Drama Jurídico',
  fiction: 'Ficção',
  'literary fiction': 'Ficção Literária',
  classics: 'Clássicos',
  poetry: 'Poesia',
  philosophy: 'Filosofia',
  psychology: 'Psicologia',
  art: 'Arte',
  literature: 'Literatura',
  'brazilian literature': 'Literatura Brasileira',
  'short stories': 'Contos',
  essays: 'Ensaios',
  'young adult': 'Jovem Adulto',
};

function translateGenre(raw: string): string {
  const clean = raw.trim();
  if (!clean) return '';
  const lower = clean.toLowerCase();
  if (GENRE_TRANSLATIONS[lower]) return GENRE_TRANSLATIONS[lower];
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function normalizeAgeRating(raw?: string | null): string {
  if (!raw) return 'Não informada';
  const val = raw.trim().toUpperCase();
  if (!val) return 'Não informada';
  if (val === 'L' || val === 'LIVRE' || val === 'G' || val === 'TV-G' || val === 'TV-Y' || val === 'AA' || val === 'A') return 'Livre';
  if (val === '10' || val === 'PG' || val === 'TV-Y7' || val === 'TV-PG') return '10';
  if (val === '12' || val === 'PG-13' || val === 'B') return '12';
  if (val === '14' || val === 'TV-14' || val === 'B15') return '14';
  if (val === '16' || val === 'R') return '16';
  if (val === '18' || val === 'NC-17' || val === 'TV-MA' || val === 'X' || val === 'C' || val === 'D') return '18';
  const numMatch = val.match(/\b(10|12|14|16|18)\b/);
  if (numMatch) return numMatch[1];
  return 'Não informada';
}

// ============================================================================
// MOVIES & SERIES CATALOG (TMDB when configured + IMDb Suggest / TVMaze / Wikidata fallback)
// ============================================================================

export const MOVIE_GENRES = [
  'Todos',
  'Drama',
  'Comédia',
  'Suspense',
  'Romance',
  'Ficção Científica',
  'Fantasia',
  'Aventura',
  'Ação',
  'Crime',
  'Mistério',
  'Animação',
  'Terror',
  'Documentário',
  'História',
];

const TMDB_MOVIE_GENRE_IDS: Record<string, number> = {
  Ação: 28,
  Aventura: 12,
  Animação: 16,
  Comédia: 35,
  Crime: 80,
  Documentário: 99,
  Drama: 18,
  Família: 10751,
  Fantasia: 14,
  História: 36,
  Terror: 27,
  Mistério: 9648,
  Romance: 10749,
  'Ficção Científica': 878,
  Suspense: 53,
};

const TMDB_TV_GENRE_IDS: Record<string, number> = {
  'Ação': 10759,
  Aventura: 10759,
  Animação: 16,
  Comédia: 35,
  Crime: 80,
  Documentário: 99,
  Drama: 18,
  Família: 10751,
  Fantasia: 10765,
  Mistério: 9648,
  'Ficção Científica': 10765,
};

const CURATED_DISCOVERY_QUERIES = [
  // Blockbusters, clássicos mundiais, cinema brasileiro e séries famosas
  'Ainda Estou Aqui',
  'Duna Parte Dois',
  'Oppenheimer',
  'Divertida Mente 2',
  'Barbie 2023',
  'Tudo em Todo o Lugar ao Mesmo Tempo',
  'Pobres Criaturas',
  'Anatomia de uma Queda',
  'Vidas Passadas',
  'Conclave',
  'Interestelar',
  'Inception 2010',
  'Titanic 1997',
  'O Poderoso Chefao',
  'The Shawshank Redemption',
  'The Dark Knight 2008',
  'Pulp Fiction',
  'Forrest Gump',
  'Matrix 1999',
  'Clube da Luta',
  'Parasita',
  'Joker 2019',
  'Harry Potter e a Pedra Filosofal',
  'O Senhor dos Aneis A Sociedade do Anel',
  'Avengers Endgame',
  'Spider Man Into the Spider Verse',
  'La La Land',
  'The Lion King 1994',
  'Toy Story 1995',
  'Spirited Away',
  'Brilho Eterno de uma Mente sem Lembranças',
  'Blade Runner 2049',
  'Cidade de Deus',
  'Central do Brasil',
  'O Auto da Compadecida',
  'Tropa de Elite',
  'Bacurau',
  'Que Horas Ela Volta',
  'Aftersun',
  // Séries famosas
  'Stranger Things',
  'Breaking Bad',
  'The Last of Us',
  'Squid Game',
  'Wednesday 2022',
  'Dark 2017',
  'Peaky Blinders',
  'Severance',
  'The Bear',
  'Succession',
  'Euphoria 2019',
];

interface ImdbSuggestItem {
  id: string;
  l: string;
  q?: string; // feature, TV series, TV mini series
  qid?: string;
  y?: number;
  yr?: string;
  rank?: number;
  s?: string;
  i?: { imageUrl: string; width: number; height: number };
}

interface WikidataFilmMeta {
  imdbId: string;
  titlePt?: string;
  genres: string[];
  directors: string[];
  ageRating?: string;
  wpPtTitle?: string;
  wpEnTitle?: string;
  descriptionPt?: string;
}

async function fetchWikidataByImdbIds(imdbIds: string[]): Promise<Map<string, WikidataFilmMeta>> {
  const result = new Map<string, WikidataFilmMeta>();
  const allCleanIds = Array.from(new Set(imdbIds.filter((id) => /^tt\d+$/.test(id))));
  if (allCleanIds.length === 0) return result;

  // Chunk in groups of 25 so all curated titles receive Portuguese labels and ClassInd
  if (allCleanIds.length > 25) {
    const chunks: string[][] = [];
    for (let i = 0; i < allCleanIds.length; i += 25) {
      chunks.push(allCleanIds.slice(i, i + 25));
    }
    const maps = await Promise.all(chunks.map((c) => fetchWikidataByImdbIds(c)));
    for (const m of maps) {
      for (const [k, v] of m.entries()) result.set(k, v);
    }
    return result;
  }

  const cleanIds = allCleanIds;
  const cacheKey = `wd_imdb:${cleanIds.slice().sort().join(',')}`;
  const cached = getCached<[string, WikidataFilmMeta][]>(cacheKey);
  if (cached) return new Map(cached);

  const values = cleanIds.map((id) => `"${id}"`).join(' ');
  const sparql = `
SELECT ?imdb ?itemLabel ?itemDescription ?genreLabel ?directorLabel ?brClassLabel ?mpaaLabel ?rtcLabel ?wpPt ?wpEn WHERE {
  VALUES ?imdb { ${values} }
  ?item wdt:P345 ?imdb .
  OPTIONAL { ?item wdt:P136 ?genre . }
  OPTIONAL { ?item wdt:P57 ?director . }
  OPTIONAL { ?item wdt:P5152 ?brClass . }
  OPTIONAL { ?item wdt:P1657 ?mpaa . }
  OPTIONAL { ?item wdt:P3834 ?rtc . }
  OPTIONAL {
    ?wpPtArticle schema:about ?item ;
                 schema:isPartOf <https://pt.wikipedia.org/> ;
                 schema:name ?wpPt .
  }
  OPTIONAL {
    ?wpEnArticle schema:about ?item ;
                 schema:isPartOf <https://en.wikipedia.org/> ;
                 schema:name ?wpEn .
  }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt-br,pt,en". }
}`;

  try {
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(sparql)}`;
    const data = await fetchJson<{
      results?: {
        bindings?: Record<string, { value: string }>[];
      };
    }>(url, {}, 7000);

    for (const row of data.results?.bindings || []) {
      const imdbId = row.imdb?.value;
      if (!imdbId) continue;
      let meta = result.get(imdbId);
      if (!meta) {
        meta = { imdbId, genres: [], directors: [] };
        result.set(imdbId, meta);
      }
      if (row.itemLabel?.value && !/^Q\d+$/.test(row.itemLabel.value)) {
        meta.titlePt = row.itemLabel.value;
      }
      if (row.itemDescription?.value) {
        meta.descriptionPt = row.itemDescription.value;
      }
      if (row.genreLabel?.value && !/^Q\d+$/.test(row.genreLabel.value)) {
        const g = translateGenre(row.genreLabel.value);
        if (g && !meta.genres.includes(g)) meta.genres.push(g);
      }
      if (row.directorLabel?.value && !/^Q\d+$/.test(row.directorLabel.value)) {
        if (!meta.directors.includes(row.directorLabel.value)) meta.directors.push(row.directorLabel.value);
      }
      if (row.brClassLabel?.value) {
        meta.ageRating = normalizeAgeRating(row.brClassLabel.value);
      } else if (!meta.ageRating && row.mpaaLabel?.value) {
        meta.ageRating = normalizeAgeRating(row.mpaaLabel.value);
      } else if (!meta.ageRating && row.rtcLabel?.value) {
        meta.ageRating = normalizeAgeRating(row.rtcLabel.value);
      }
      if (row.wpPt?.value) meta.wpPtTitle = row.wpPt.value;
      if (row.wpEn?.value) meta.wpEnTitle = row.wpEn.value;
    }

    setCached(cacheKey, Array.from(result.entries()), DETAIL_CACHE_TTL_MS);
  } catch {
    // non-fatal; continue with IMDb data
  }

  return result;
}

async function fetchWikipediaSummary(title: string, lang: 'pt' | 'en'): Promise<string> {
  const cleanTitle = title.trim();
  if (!cleanTitle) return '';
  const cacheKey = `wp_sum:${lang}:${cleanTitle}`;
  const cached = getCached<string>(cacheKey);
  if (cached !== null) return cached;

  try {
    const url = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle.replace(/ /g, '_'))}`;
    const data = await fetchJson<{ extract?: string; type?: string }>(url, {}, 5000);
    const extract = data.type === 'disambiguation' ? '' : (data.extract || '').trim();
    return setCached(cacheKey, extract, DETAIL_CACHE_TTL_MS);
  } catch {
    return setCached(cacheKey, '', CACHE_TTL_MS);
  }
}

async function queryImdbSuggest(query: string): Promise<ImdbSuggestItem[]> {
  const clean = query
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
  if (!clean) return [];
  const firstChar = clean.replace(/[^a-z0-9]/g, '').charAt(0) || 'a';
  const slug = clean.replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '').slice(0, 48);
  if (!slug) return [];

  const cacheKey = `imdb_suggest:${slug}`;
  const cached = getCached<ImdbSuggestItem[]>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://v3.sg.media-imdb.com/suggestion/${firstChar}/${encodeURIComponent(slug)}.json`;
    const data = await fetchJson<{ d?: ImdbSuggestItem[] }>(url, {}, 6000);
    const items = (data.d || []).filter(
      (item) =>
        item.id?.startsWith('tt') &&
        item.l &&
        ['feature', 'TV series', 'TV mini series', 'TV movie', 'movie', 'tvSeries', 'tvMiniSeries'].includes(
          item.q || item.qid || ''
        )
    );
    return setCached(cacheKey, items, CACHE_TTL_MS);
  } catch {
    return [];
  }
}

function imdbItemToCatalogWork(item: ImdbSuggestItem, wd?: WikidataFilmMeta): CatalogWork {
  const isSeries =
    item.qid === 'tvSeries' ||
    item.qid === 'tvMiniSeries' ||
    item.q === 'TV series' ||
    item.q === 'TV mini series';
  const yearNum = item.y || (item.yr ? parseInt(item.yr.slice(0, 4), 10) : 0);
  const yearStr = yearNum ? String(yearNum) : '';
  const currentYear = new Date().getFullYear();

  const rawPoster = item.i?.imageUrl || '';
  const posterUrl = rawPoster ? rawPoster.replace(/\._V1_.*\.jpg$/i, '._V1_SX600.jpg') : '';

  const genres = wd?.genres && wd.genres.length > 0 ? wd.genres.slice(0, 3) : [isSeries ? 'Série' : 'Cinema'];
  const creator =
    wd?.directors && wd.directors.length > 0
      ? wd.directors.slice(0, 2).join(', ')
      : item.s
      ? item.s.split(',').slice(0, 2).join(', ').trim()
      : 'Direção não informada';

  const synopsis =
    wd?.descriptionPt && wd.descriptionPt.length > 20
      ? wd.descriptionPt
      : `Obra ${isSeries ? 'seriada' : 'cinematográfica'} ${yearStr ? `de ${yearStr}` : ''}${
          item.s ? `, com ${item.s}` : ''
        }. Clique para ler a ficha completa.`;

  const popularity = item.rank ? Math.max(10, 10000 - item.rank) : 100;

  return cacheWork({
    id: `imdb_${item.id}`,
    mediaKind: isSeries ? 'serie' : 'filme',
    sourceProvider: 'imdb_tvmaze',
    title: wd?.titlePt || item.l,
    originalTitle: item.l,
    creator,
    year: yearStr,
    coverUrl: posterUrl,
    genres,
    ageRating: wd?.ageRating || 'Não informada',
    synopsis,
    popularityScore: popularity,
    externalRating: null,
    castOrDetails: item.s || '',
    isNewRelease: yearNum >= currentYear - 2,
    communityAverage: null,
    communityReviewCount: 0,
  });
}

interface TvMazeShow {
  id: number;
  name: string;
  genres?: string[];
  premiered?: string | null;
  rating?: { average?: number | null };
  weight?: number;
  image?: { medium?: string; original?: string } | null;
  summary?: string | null;
  network?: { name?: string } | null;
  webChannel?: { name?: string } | null;
  externals?: { imdb?: string | null };
}

function tvMazeShowToCatalogWork(show: TvMazeShow): CatalogWork {
  const yearNum = show.premiered ? parseInt(show.premiered.slice(0, 4), 10) : 0;
  const yearStr = yearNum ? String(yearNum) : '';
  const currentYear = new Date().getFullYear();
  const genres = (show.genres || []).map(translateGenre).filter(Boolean).slice(0, 3);
  const channel = show.network?.name || show.webChannel?.name || 'Série de TV / Streaming';

  return cacheWork({
    id: `tvmaze_${show.id}`,
    mediaKind: 'serie',
    sourceProvider: 'imdb_tvmaze',
    title: show.name,
    originalTitle: show.name,
    creator: channel,
    year: yearStr,
    coverUrl: show.image?.original || show.image?.medium || '',
    genres: genres.length > 0 ? genres : ['Drama'],
    ageRating: genres.includes('Animação') || genres.includes('Família') ? '10' : '14',
    synopsis: stripHtml(show.summary) || 'Série disponível no catálogo TVMaze.',
    popularityScore: (show.weight || 50) + (show.rating?.average || 6) * 20,
    externalRating: show.rating?.average ?? null,
    castOrDetails: channel,
    isNewRelease: yearNum >= currentYear - 2,
    communityAverage: null,
    communityReviewCount: 0,
  });
}

async function getFallbackMoviesAndSeriesBase(): Promise<CatalogWork[]> {
  const cacheKey = 'fallback_movies_series_base_v1';
  const cached = getCached<CatalogWork[]>(cacheKey);
  if (cached) return cached;

  // Fetch IMDb suggestions for curated titles + TVMaze shows in parallel
  const [imdbResponses, tvMazeShows] = await Promise.all([
    Promise.all(CURATED_DISCOVERY_QUERIES.map((q) => queryImdbSuggest(q).then((r) => r[0] || null))),
    fetchJson<TvMazeShow[]>('https://api.tvmaze.com/shows?page=0', {}, 8000).catch(() => [] as TvMazeShow[]),
  ]);

  const topImdb = imdbResponses.filter((x): x is ImdbSuggestItem => Boolean(x));
  const wdMap = await fetchWikidataByImdbIds(topImdb.map((i) => i.id));

  const movieWorks = topImdb.map((item) => imdbItemToCatalogWork(item, wdMap.get(item.id)));

  // Pick top 24 popular / diverse TVMaze series (including recent ones & classics)
  const sortedTv = tvMazeShows
    .filter((s) => Boolean(s.image?.medium || s.image?.original))
    .sort((a, b) => (b.weight || 0) - (a.weight || 0))
    .slice(0, 24)
    .map(tvMazeShowToCatalogWork);

  const combinedMap = new Map<string, CatalogWork>();
  for (const w of [...movieWorks, ...sortedTv]) {
    if (!combinedMap.has(w.id)) combinedMap.set(w.id, w);
  }

  return setCached(cacheKey, Array.from(combinedMap.values()), CACHE_TTL_MS);
}

// TMDB Integration (when TMDB_API_KEY is configured)
interface TmdbResultItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  popularity?: number;
  vote_average?: number;
  media_type?: 'movie' | 'tv';
}

const TMDB_ID_TO_NAME: Record<number, string> = {
  28: 'Ação',
  12: 'Aventura',
  16: 'Animação',
  35: 'Comédia',
  80: 'Crime',
  99: 'Documentário',
  18: 'Drama',
  10751: 'Família',
  14: 'Fantasia',
  36: 'História',
  27: 'Terror',
  10402: 'Música',
  9648: 'Mistério',
  10749: 'Romance',
  878: 'Ficção Científica',
  53: 'Suspense',
  10752: 'Guerra',
  37: 'Faroeste',
  10759: 'Ação e Aventura',
  10765: 'Ficção e Fantasia',
};

function tmdbItemToCatalogWork(item: TmdbResultItem, forceKind?: 'filme' | 'serie'): CatalogWork {
  const kind: 'filme' | 'serie' =
    forceKind || (item.media_type === 'tv' || (!item.title && Boolean(item.name)) ? 'serie' : 'filme');
  const dateStr = item.release_date || item.first_air_date || '';
  const yearNum = dateStr ? parseInt(dateStr.slice(0, 4), 10) : 0;
  const currentYear = new Date().getFullYear();

  return cacheWork({
    id: `tmdb_${kind === 'serie' ? 'tv' : 'movie'}_${item.id}`,
    mediaKind: kind,
    sourceProvider: 'tmdb',
    title: item.title || item.name || 'Sem título',
    originalTitle: item.original_title || item.original_name,
    creator: kind === 'serie' ? 'Série (TMDB)' : 'Cinema (TMDB)',
    year: yearNum ? String(yearNum) : '',
    coverUrl: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : '',
    backdropUrl: item.backdrop_path ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}` : undefined,
    genres: (item.genre_ids || []).map((id) => TMDB_ID_TO_NAME[id]).filter(Boolean).slice(0, 3),
    ageRating: 'Ver detalhes',
    synopsis: (item.overview || '').trim() || 'Sinopse disponível na página da obra.',
    popularityScore: item.popularity || 0,
    externalRating: item.vote_average ? Number(item.vote_average.toFixed(1)) : null,
    isNewRelease: yearNum >= currentYear - 1,
    communityAverage: null,
    communityReviewCount: 0,
  });
}

function applyMovieFilters(
  items: CatalogWork[],
  params: { kind?: string; genre?: string; year?: string; sort?: string }
): CatalogWork[] {
  let list = [...items];
  if (params.kind === 'filme' || params.kind === 'serie') {
    list = list.filter((w) => w.mediaKind === params.kind);
  }
  if (params.genre && params.genre !== 'Todos') {
    const gLower = params.genre.toLowerCase();
    list = list.filter((w) => w.genres.some((g) => g.toLowerCase().includes(gLower)));
  }
  if (params.year && params.year !== 'Todos') {
    if (params.year === 'recentes') {
      list = list.filter((w) => Number(w.year) >= new Date().getFullYear() - 3);
    } else if (params.year === '2020s') {
      list = list.filter((w) => Number(w.year) >= 2020);
    } else if (params.year === '2010s') {
      list = list.filter((w) => Number(w.year) >= 2010 && Number(w.year) <= 2019);
    } else if (params.year === 'classicos') {
      list = list.filter((w) => Number(w.year) > 0 && Number(w.year) < 2010);
    } else {
      list = list.filter((w) => w.year === params.year);
    }
  }

  if (params.sort === 'recent') {
    list.sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
  } else if (params.sort === 'rating') {
    list.sort(
      (a, b) =>
        (b.communityAverage ?? b.externalRating ?? 0) - (a.communityAverage ?? a.externalRating ?? 0)
    );
  } else {
    list.sort((a, b) => b.popularityScore - a.popularityScore);
  }
  return list.map(withCommunityStats);
}

export async function discoverMoviesSeries(params: {
  kind?: string;
  genre?: string;
  year?: string;
  sort?: string;
}): Promise<{
  provider: 'tmdb' | 'imdb_tvmaze';
  featuredReleases: CatalogWork[];
  suggestions: CatalogWork[];
  items: CatalogWork[];
  genres: string[];
}> {
  const tmdbKey = process.env.TMDB_API_KEY?.trim();

  if (tmdbKey) {
    try {
      const sortParam = params.sort === 'recent' ? 'primary_release_date.desc' : 'popularity.desc';
      const genreIdMovie = params.genre && TMDB_MOVIE_GENRE_IDS[params.genre];
      const genreIdTv = params.genre && TMDB_TV_GENRE_IDS[params.genre];

      const yearQsMovie =
        params.year && /^\d{4}$/.test(params.year)
          ? `&primary_release_year=${params.year}`
          : params.year === '2020s'
          ? '&primary_release_date.gte=2020-01-01'
          : params.year === '2010s'
          ? '&primary_release_date.gte=2010-01-01&primary_release_date.lte=2019-12-31'
          : params.year === 'classicos'
          ? '&primary_release_date.lte=2009-12-31'
          : '';

      const [trendingRes, nowPlayingRes, discoverMoviesRes, discoverTvRes] = await Promise.all([
        fetchJson<{ results: TmdbResultItem[] }>(
          `https://api.themoviedb.org/3/trending/all/week?api_key=${tmdbKey}&language=pt-BR`
        ),
        fetchJson<{ results: TmdbResultItem[] }>(
          `https://api.themoviedb.org/3/movie/now_playing?api_key=${tmdbKey}&language=pt-BR&region=BR`
        ),
        params.kind === 'serie'
          ? Promise.resolve({ results: [] as TmdbResultItem[] })
          : fetchJson<{ results: TmdbResultItem[] }>(
              `https://api.themoviedb.org/3/discover/movie?api_key=${tmdbKey}&language=pt-BR&region=BR&sort_by=${sortParam}${
                genreIdMovie ? `&with_genres=${genreIdMovie}` : ''
              }${yearQsMovie}`
            ),
        params.kind === 'filme'
          ? Promise.resolve({ results: [] as TmdbResultItem[] })
          : fetchJson<{ results: TmdbResultItem[] }>(
              `https://api.themoviedb.org/3/discover/tv?api_key=${tmdbKey}&language=pt-BR&sort_by=popularity.desc${
                genreIdTv ? `&with_genres=${genreIdTv}` : ''
              }`
            ),
      ]);

      const featuredReleases = nowPlayingRes.results
        .slice(0, 8)
        .map((r) => withCommunityStats(tmdbItemToCatalogWork(r, 'filme')));
      const suggestions = trendingRes.results
        .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
        .slice(0, 8)
        .map((r) => withCommunityStats(tmdbItemToCatalogWork(r)));

      const combined = [
        ...discoverMoviesRes.results.map((r) => tmdbItemToCatalogWork(r, 'filme')),
        ...discoverTvRes.results.map((r) => tmdbItemToCatalogWork(r, 'serie')),
      ];
      const filtered = applyMovieFilters(combined, params);

      return {
        provider: 'tmdb',
        featuredReleases,
        suggestions,
        items: filtered,
        genres: MOVIE_GENRES,
      };
    } catch {
      // Fallback gracefully if TMDB key is invalid or network fails
    }
  }

  const base = await getFallbackMoviesAndSeriesBase();
  const withStats = base.map(withCommunityStats);
  const featuredReleases = [...withStats]
    .filter((w) => Number(w.year) >= 2022)
    .sort((a, b) => Number(b.year || 0) - Number(a.year || 0) || b.popularityScore - a.popularityScore)
    .slice(0, 8);

  const suggestions = [...withStats]
    .sort((a, b) => b.popularityScore - a.popularityScore)
    .slice(0, 8);

  const filtered = applyMovieFilters(base, params);

  return {
    provider: 'imdb_tvmaze',
    featuredReleases,
    suggestions,
    items: filtered,
    genres: MOVIE_GENRES,
  };
}

export async function searchMoviesSeries(params: {
  q: string;
  kind?: string;
  genre?: string;
  year?: string;
  sort?: string;
}): Promise<{ provider: 'tmdb' | 'imdb_tvmaze'; items: CatalogWork[] }> {
  const q = params.q.trim();
  if (!q) {
    const res = await discoverMoviesSeries(params);
    return { provider: res.provider, items: res.items };
  }

  const tmdbKey = process.env.TMDB_API_KEY?.trim();
  if (tmdbKey) {
    try {
      const endpoint =
        params.kind === 'filme'
          ? 'search/movie'
          : params.kind === 'serie'
          ? 'search/tv'
          : 'search/multi';
      const data = await fetchJson<{ results: TmdbResultItem[] }>(
        `https://api.themoviedb.org/3/${endpoint}?api_key=${tmdbKey}&language=pt-BR&query=${encodeURIComponent(q)}`
      );
      const forcedKind = params.kind === 'filme' || params.kind === 'serie' ? params.kind : undefined;
      const rawItems = (data.results || [])
        .filter((r) => forcedKind || r.media_type === 'movie' || r.media_type === 'tv')
        .map((r) => tmdbItemToCatalogWork(r, forcedKind));
      return {
        provider: 'tmdb',
        items: applyMovieFilters(rawItems, params),
      };
    } catch {
      // Fallback below
    }
  }

  const [imdbItems, tvShows] = await Promise.all([
    params.kind === 'serie' ? queryImdbSuggest(q).then((l) => l.filter((i) => i.q?.includes('series'))) : queryImdbSuggest(q),
    params.kind === 'filme'
      ? Promise.resolve([])
      : fetchJson<{ show: TvMazeShow }[]>(
          `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(q)}`,
          {},
          7000
        )
          .then((res) => res.map((entry) => entry.show))
          .catch(() => [] as TvMazeShow[]),
  ]);

  const wdMap = await fetchWikidataByImdbIds(imdbItems.slice(0, 15).map((i) => i.id));
  const imdbWorks = imdbItems.slice(0, 18).map((item) => imdbItemToCatalogWork(item, wdMap.get(item.id)));
  const tvWorks = tvShows.slice(0, 12).map(tvMazeShowToCatalogWork);

  const dedup = new Map<string, CatalogWork>();
  for (const w of [...imdbWorks, ...tvWorks]) {
    if (!dedup.has(w.id)) dedup.set(w.id, w);
  }

  return {
    provider: 'imdb_tvmaze',
    items: applyMovieFilters(Array.from(dedup.values()), params),
  };
}

export async function getMovieSeriesDetail(workId: string): Promise<CatalogWork | null> {
  const cached = getCachedWork(workId);
  const tmdbKey = process.env.TMDB_API_KEY?.trim();

  if (workId.startsWith('tmdb_')) {
    const [, mediaType, numericId] = workId.split('_');
    if (tmdbKey && numericId) {
      try {
        const isTv = mediaType === 'tv';
        const append = isTv ? 'credits,content_ratings' : 'credits,release_dates';
        const data = await fetchJson<{
          id: number;
          title?: string;
          name?: string;
          original_title?: string;
          original_name?: string;
          overview?: string;
          poster_path?: string | null;
          backdrop_path?: string | null;
          release_date?: string;
          first_air_date?: string;
          genres?: { id: number; name: string }[];
          popularity?: number;
          vote_average?: number;
          credits?: {
            crew?: { job?: string; name?: string }[];
            cast?: { name?: string }[];
          };
          created_by?: { name?: string }[];
          release_dates?: { results: { iso_3166_1: string; release_dates: { certification: string }[] }[] };
          content_ratings?: { results: { iso_3166_1: string; rating: string }[] };
        }>(
          `https://api.themoviedb.org/3/${isTv ? 'tv' : 'movie'}/${numericId}?api_key=${tmdbKey}&language=pt-BR&append_to_response=${append}`
        );

        let cert = '';
        if (!isTv && data.release_dates?.results) {
          const br = data.release_dates.results.find((r) => r.iso_3166_1 === 'BR');
          const us = data.release_dates.results.find((r) => r.iso_3166_1 === 'US');
          cert =
            br?.release_dates.find((d) => d.certification)?.certification ||
            us?.release_dates.find((d) => d.certification)?.certification ||
            '';
        } else if (isTv && data.content_ratings?.results) {
          const br = data.content_ratings.results.find((r) => r.iso_3166_1 === 'BR');
          const us = data.content_ratings.results.find((r) => r.iso_3166_1 === 'US');
          cert = br?.rating || us?.rating || '';
        }

        const directors = isTv
          ? (data.created_by || []).map((c) => c.name).filter(Boolean)
          : (data.credits?.crew || []).filter((c) => c.job === 'Director').map((c) => c.name).filter(Boolean);
        const cast = (data.credits?.cast || []).slice(0, 5).map((c) => c.name).filter(Boolean).join(', ');
        const dateStr = data.release_date || data.first_air_date || '';

        const work = cacheWork({
          id: workId,
          mediaKind: isTv ? 'serie' : 'filme',
          sourceProvider: 'tmdb',
          title: data.title || data.name || 'Sem título',
          originalTitle: data.original_title || data.original_name,
          creator: directors.join(', ') || (isTv ? 'Série (TMDB)' : 'Direção não informada'),
          year: dateStr ? dateStr.slice(0, 4) : '',
          coverUrl: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
          backdropUrl: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : undefined,
          genres: (data.genres || []).map((g) => g.name).slice(0, 4),
          ageRating: normalizeAgeRating(cert),
          synopsis: (data.overview || '').trim() || 'Sinopse oficial indisponível.',
          popularityScore: data.popularity || 0,
          externalRating: data.vote_average ? Number(data.vote_average.toFixed(1)) : null,
          castOrDetails: cast,
          isNewRelease: Number(dateStr.slice(0, 4)) >= new Date().getFullYear() - 1,
          communityAverage: null,
          communityReviewCount: 0,
        });
        return withCommunityStats(work);
      } catch {
        // fallback to cached
      }
    }
  }

  if (workId.startsWith('tvmaze_')) {
    const numId = workId.replace('tvmaze_', '');
    try {
      const show = await fetchJson<
        TvMazeShow & { _embedded?: { cast?: { person?: { name?: string } }[] } }
      >(`https://api.tvmaze.com/shows/${encodeURIComponent(numId)}?embed=cast`, {}, 7000);
      const baseWork = tvMazeShowToCatalogWork(show);
      const castList = (show._embedded?.cast || [])
        .slice(0, 5)
        .map((c) => c.person?.name)
        .filter(Boolean)
        .join(', ');

      let synopsisPt = baseWork.synopsis;
      let wpPt = '';
      if (show.externals?.imdb) {
        const wdMap = await fetchWikidataByImdbIds([show.externals.imdb]);
        const wd = wdMap.get(show.externals.imdb);
        if (wd?.titlePt) baseWork.title = wd.titlePt;
        if (wd?.ageRating) baseWork.ageRating = wd.ageRating;
        if (wd?.wpPtTitle) wpPt = await fetchWikipediaSummary(wd.wpPtTitle, 'pt');
      } else {
        wpPt = await fetchWikipediaSummary(show.name, 'pt');
      }
      if (wpPt && wpPt.length > 40) synopsisPt = wpPt;

      return withCommunityStats(
        cacheWork({
          ...baseWork,
          synopsis: synopsisPt,
          castOrDetails: castList ? `${baseWork.creator} · Elenco: ${castList}` : baseWork.creator,
        })
      );
    } catch {
      if (cached) return withCommunityStats(cached);
    }
  }

  if (workId.startsWith('imdb_')) {
    const ttId = workId.replace('imdb_', '');
    // Always ensure Wikidata + Wikipedia full synopsis are loaded
    const wdMap = await fetchWikidataByImdbIds([ttId]);
    const wd = wdMap.get(ttId);
    let base = cached;

    if (!base) {
      const suggestions = await queryImdbSuggest(ttId);
      const match = suggestions.find((s) => s.id === ttId) || suggestions[0];
      if (match) {
        base = imdbItemToCatalogWork(match, wd);
      }
    }

    if (base) {
      let fullSynopsis = base.synopsis;
      if (wd?.wpPtTitle) {
        const wpPt = await fetchWikipediaSummary(wd.wpPtTitle, 'pt');
        if (wpPt) fullSynopsis = wpPt;
      } else if (wd?.wpEnTitle) {
        const wpEn = await fetchWikipediaSummary(wd.wpEnTitle, 'en');
        if (wpEn) fullSynopsis = wpEn;
      } else {
        const wpFallback = await fetchWikipediaSummary(wd?.titlePt || base.title, 'pt');
        if (wpFallback) fullSynopsis = wpFallback;
      }

      const enriched = cacheWork({
        ...base,
        title: wd?.titlePt || base.title,
        creator: wd?.directors && wd.directors.length > 0 ? wd.directors.join(', ') : base.creator,
        genres: wd?.genres && wd.genres.length > 0 ? wd.genres.slice(0, 4) : base.genres,
        ageRating: wd?.ageRating || base.ageRating || 'Não informada',
        synopsis: fullSynopsis,
      });
      return withCommunityStats(enriched);
    }
  }

  return cached ? withCommunityStats(cached) : null;
}

// ============================================================================
// BOOKS CATALOG (Google Books when API key configured + Open Library API)
// ============================================================================

export const BOOK_GENRES: { label: string; slug: string }[] = [
  { label: 'Todos', slug: 'fiction' },
  { label: 'Literatura Brasileira', slug: 'brazilian_literature' },
  { label: 'Ficção Literária', slug: 'literary_fiction' },
  { label: 'Romance', slug: 'romance' },
  { label: 'Mistério & Suspense', slug: 'mystery' },
  { label: 'Ficção Científica', slug: 'science_fiction' },
  { label: 'Fantasia', slug: 'fantasy' },
  { label: 'Poesia', slug: 'poetry' },
  { label: 'Clássicos', slug: 'classics' },
  { label: 'Filosofia', slug: 'philosophy' },
  { label: 'História', slug: 'history' },
  { label: 'Biografias', slug: 'biography' },
];

interface OpenLibrarySearchDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  subject?: string[];
  edition_count?: number;
  ratings_average?: number;
  ratings_count?: number;
  publisher?: string[];
  number_of_pages_median?: number;
}

interface OpenLibrarySubjectWork {
  key: string;
  title: string;
  authors?: { name: string }[];
  first_publish_year?: number;
  cover_id?: number;
  subject?: string[];
  edition_count?: number;
}

function mapBookGenres(subjects?: string[], fallbackGenre?: string): string[] {
  const mapped: string[] = [];
  for (const s of subjects || []) {
    const t = translateGenre(s);
    if (t && t.length <= 28 && !mapped.includes(t)) {
      mapped.push(t);
    }
    if (mapped.length >= 3) break;
  }
  if (mapped.length === 0 && fallbackGenre && fallbackGenre !== 'Todos') {
    mapped.push(fallbackGenre);
  }
  if (mapped.length === 0) mapped.push('Literatura');
  return mapped;
}

function olDocToCatalogWork(doc: OpenLibrarySearchDoc, fallbackGenre?: string): CatalogWork {
  const cleanKey = doc.key.replace(/^\/works\//, '').replace(/\//g, '');
  const yearNum = doc.first_publish_year || 0;
  return cacheWork({
    id: `ol_${cleanKey}`,
    mediaKind: 'livro',
    sourceProvider: 'open_library',
    title: doc.title,
    creator: doc.author_name?.slice(0, 2).join(', ') || 'Autor não informado',
    year: yearNum ? String(yearNum) : '',
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : '',
    genres: mapBookGenres(doc.subject, fallbackGenre),
    synopsis: 'Clique para abrir a ficha do livro, sinopse e avaliações da comunidade.',
    popularityScore: (doc.edition_count || 1) + (doc.ratings_count || 0) * 3,
    externalRating: doc.ratings_average ? Number((doc.ratings_average * 2).toFixed(1)) : null,
    pageCount: doc.number_of_pages_median ?? null,
    publisher: doc.publisher?.[0] || undefined,
    isNewRelease: yearNum >= new Date().getFullYear() - 3,
    communityAverage: null,
    communityReviewCount: 0,
  });
}

function olSubjectWorkToCatalogWork(work: OpenLibrarySubjectWork, genreLabel: string): CatalogWork {
  const cleanKey = work.key.replace(/^\/works\//, '').replace(/\//g, '');
  const yearNum = work.first_publish_year || 0;
  return cacheWork({
    id: `ol_${cleanKey}`,
    mediaKind: 'livro',
    sourceProvider: 'open_library',
    title: work.title,
    creator: work.authors?.slice(0, 2).map((a) => a.name).join(', ') || 'Autor não informado',
    year: yearNum ? String(yearNum) : '',
    coverUrl: work.cover_id ? `https://covers.openlibrary.org/b/id/${work.cover_id}-L.jpg` : '',
    genres: mapBookGenres(work.subject, genreLabel),
    synopsis: 'Clique para ler a sinopse completa e as resenhas de leitores.',
    popularityScore: work.edition_count || 10,
    externalRating: null,
    isNewRelease: yearNum >= new Date().getFullYear() - 3,
    communityAverage: null,
    communityReviewCount: 0,
  });
}

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    publishedDate?: string;
    description?: string;
    categories?: string[];
    pageCount?: number;
    publisher?: string;
    averageRating?: number;
    ratingsCount?: number;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
}

function googleVolumeToCatalogWork(vol: GoogleBooksVolume): CatalogWork {
  const info = vol.volumeInfo;
  const yearMatch = (info.publishedDate || '').match(/\d{4}/);
  const yearStr = yearMatch ? yearMatch[0] : '';
  const rawThumb = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || '';
  const coverUrl = rawThumb.replace(/^http:\/\//, 'https://').replace('&edge=curl', '');

  return cacheWork({
    id: `gb_${vol.id}`,
    mediaKind: 'livro',
    sourceProvider: 'google_books',
    title: info.title || 'Sem título',
    creator: info.authors?.slice(0, 2).join(', ') || 'Autor não informado',
    year: yearStr,
    coverUrl,
    genres: (info.categories || ['Literatura']).map(translateGenre).slice(0, 3),
    synopsis: stripHtml(info.description) || 'Sinopse não informada nesta edição.',
    popularityScore: (info.ratingsCount || 1) * 5 + (info.averageRating || 3) * 10,
    externalRating: info.averageRating ? Number((info.averageRating * 2).toFixed(1)) : null,
    pageCount: info.pageCount ?? null,
    publisher: info.publisher,
    isNewRelease: Number(yearStr) >= new Date().getFullYear() - 3,
    communityAverage: null,
    communityReviewCount: 0,
  });
}

function applyBookFilters(items: CatalogWork[], params: { genre?: string; sort?: string }): CatalogWork[] {
  let list = [...items];
  if (params.genre && params.genre !== 'Todos') {
    const gLower = params.genre.toLowerCase();
    const filtered = list.filter((w) =>
      w.genres.some((g) => g.toLowerCase().includes(gLower) || gLower.includes(g.toLowerCase()))
    );
    if (filtered.length > 0) list = filtered;
  }

  if (params.sort === 'recent') {
    list.sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
  } else if (params.sort === 'rating') {
    list.sort(
      (a, b) =>
        (b.communityAverage ?? b.externalRating ?? 0) - (a.communityAverage ?? a.externalRating ?? 0)
    );
  } else if (params.sort === 'title') {
    list.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
  } else {
    list.sort((a, b) => b.popularityScore - a.popularityScore);
  }
  return list.map(withCommunityStats);
}

interface AppleBookItem {
  trackId: number;
  trackName?: string;
  artistName?: string;
  releaseDate?: string;
  description?: string;
  genres?: string[];
  artworkUrl100?: string;
  artworkUrl60?: string;
  averageUserRating?: number;
  userRatingCount?: number;
}

const CURATED_FAMOUS_BOOK_QUERIES: { q: string; genreHint?: string }[] = [
  { q: 'Harry Potter e a Pedra Filosofal', genreHint: 'Fantasia' },
  { q: 'O Pequeno Principe Saint Exupery', genreHint: 'Clássicos' },
  { q: '1984 George Orwell', genreHint: 'Ficção Científica' },
  { q: 'O Senhor dos Aneis Tolkien', genreHint: 'Fantasia' },
  { q: 'O Hobbit Tolkien', genreHint: 'Fantasia' },
  { q: 'O Alquimista Paulo Coelho', genreHint: 'Literatura Brasileira' },
  { q: 'Dom Casmurro Machado de Assis', genreHint: 'Literatura Brasileira' },
  { q: 'A Hora da Estrela Clarice Lispector', genreHint: 'Literatura Brasileira' },
  { q: 'Torto Arado Itamar Vieira Junior', genreHint: 'Literatura Brasileira' },
  { q: 'A Biblioteca da Meia Noite Matt Haig', genreHint: 'Ficção Literária' },
  { q: 'Os Sete Maridos de Evelyn Hugo', genreHint: 'Romance' },
  { q: 'A Menina que Roubava Livros', genreHint: 'Ficção Literária' },
  { q: 'Jogos Vorazes Suzanne Collins', genreHint: 'Ficção Científica' },
  { q: 'A Culpa e das Estrelas John Green', genreHint: 'Romance' },
  { q: 'E Assim Que Acaba Colleen Hoover', genreHint: 'Romance' },
  { q: 'Percy Jackson e o Ladrao de Raios', genreHint: 'Fantasia' },
  { q: 'Cem Anos de Solidao Gabriel Garcia Marquez', genreHint: 'Clássicos' },
  { q: 'A Metamorfose Franz Kafka', genreHint: 'Clássicos' },
  { q: 'Crime e Castigo Dostoievski', genreHint: 'Clássicos' },
  { q: 'Capitaes da Areia Jorge Amado', genreHint: 'Literatura Brasileira' },
  { q: 'Vidas Secas Graciliano Ramos', genreHint: 'Literatura Brasileira' },
  { q: 'A Revolucao dos Bichos George Orwell', genreHint: 'Clássicos' },
  { q: 'Duna Frank Herbert', genreHint: 'Ficção Científica' },
  { q: 'Orgulho e Preconceito Jane Austen', genreHint: 'Romance' },
  { q: 'O Retrato de Dorian Gray Oscar Wilde', genreHint: 'Clássicos' },
];

const APPLE_BOOK_GENRE_MAP: Record<string, string> = {
  'ficção e literatura': 'Ficção Literária',
  'ficção científica e fantasia': 'Ficção Científica',
  'ficção científica': 'Ficção Científica',
  fantasia: 'Fantasia',
  'juvenil: fantasia': 'Fantasia',
  'romance': 'Romance',
  'mistério e suspense': 'Mistério & Suspense',
  'suspense': 'Mistério & Suspense',
  'clássicos': 'Clássicos',
  'poesia': 'Poesia',
  'história': 'História',
  'filosofia': 'Filosofia',
  'biografias e memórias': 'Biografias',
  'biografia': 'Biografias',
};

function isBookStudyGuide(title: string): boolean {
  return /\b(resumo|fichamento|guia de estudo|an[aá]lise de livro|summary|study guide)\b/i.test(title);
}

function appleBookToCatalogWork(
  item: AppleBookItem,
  options?: { popularityBoost?: number; genreHint?: string }
): CatalogWork {
  const rawGenres = (item.genres || [])
    .map((g) => {
      const lower = g.toLowerCase();
      if (lower === 'livros' || lower === 'books' || lower === 'ebooks') return '';
      if (APPLE_BOOK_GENRE_MAP[lower]) return APPLE_BOOK_GENRE_MAP[lower];
      if (lower.includes('fantasia')) return 'Fantasia';
      if (lower.includes('ficção científica') || lower.includes('sci-fi')) return 'Ficção Científica';
      if (lower.includes('romance')) return 'Romance';
      if (lower.includes('mistério') || lower.includes('suspense') || lower.includes('policial'))
        return 'Mistério & Suspense';
      if (lower.includes('clássic')) return 'Clássicos';
      if (lower.includes('poesia')) return 'Poesia';
      if (lower.includes('filosofia')) return 'Filosofia';
      if (lower.includes('história')) return 'História';
      if (lower.includes('biograf')) return 'Biografias';
      if (lower.includes('ficção')) return 'Ficção Literária';
      return '';
    })
    .filter(Boolean);

  const uniqueGenres = Array.from(new Set(rawGenres));
  if (options?.genreHint && !uniqueGenres.includes(options.genreHint)) {
    uniqueGenres.unshift(options.genreHint);
  }
  if (uniqueGenres.length === 0) uniqueGenres.push('Literatura');

  const rawCover = item.artworkUrl100 || item.artworkUrl60 || '';
  const coverUrl = rawCover.replace(/\/\d+x\d+bb\./i, '/500x750bb.');
  const yearStr = item.releaseDate ? item.releaseDate.slice(0, 4) : '';
  const ratingCount = item.userRatingCount || 0;
  const ratingAvg = item.averageUserRating ? Number((item.averageUserRating * 2).toFixed(1)) : null;

  return cacheWork({
    id: `ib_${item.trackId}`,
    mediaKind: 'livro',
    sourceProvider: 'apple_books',
    title: item.trackName || 'Sem título',
    creator: item.artistName || 'Autor não informado',
    year: yearStr,
    coverUrl,
    genres: uniqueGenres.slice(0, 3),
    synopsis: stripHtml(item.description) || 'Sinopse disponível na ficha do livro.',
    popularityScore: (options?.popularityBoost ?? 0) + ratingCount * 2 + (ratingAvg || 7) * 5,
    externalRating: ratingAvg,
    isNewRelease: Number(yearStr) >= new Date().getFullYear() - 3,
    communityAverage: null,
    communityReviewCount: 0,
  });
}

async function queryAppleBooksBR(term: string, limit = 12): Promise<AppleBookItem[]> {
  try {
    const data = await fetchJson<{ results?: AppleBookItem[] }>(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=ebook&country=br&limit=${limit}`,
      {},
      6000
    );
    return (data.results || []).filter(
      (item) => item.trackId && item.trackName && !isBookStudyGuide(item.trackName)
    );
  } catch {
    return [];
  }
}

async function getCuratedFamousBooks(): Promise<CatalogWork[]> {
  const cacheKey = 'curated_famous_books_br_v1';
  const cached = getCached<CatalogWork[]>(cacheKey);
  if (cached) return cached;

  const hits = await Promise.all(
    CURATED_FAMOUS_BOOK_QUERIES.map(async (entry, idx) => {
      const list = await queryAppleBooksBR(entry.q, 3);
      const best = list.find((x) => Boolean(x.artworkUrl100)) || list[0];
      if (!best) return null;
      return appleBookToCatalogWork(best, {
        popularityBoost: 8000 - idx * 120,
        genreHint: entry.genreHint,
      });
    })
  );

  const dedup = new Map<string, CatalogWork>();
  for (const w of hits) {
    if (w && !dedup.has(w.id)) dedup.set(w.id, w);
  }
  return setCached(cacheKey, Array.from(dedup.values()), DETAIL_CACHE_TTL_MS);
}

export async function discoverBooks(params: {
  genre?: string;
  sort?: string;
}): Promise<{
  provider: 'google_books' | 'open_library' | 'apple_books';
  featured: CatalogWork[];
  items: CatalogWork[];
  genres: string[];
}> {
  const genreConfig = BOOK_GENRES.find((g) => g.label === params.genre) || BOOK_GENRES[0];
  const gbKey = process.env.GOOGLE_BOOKS_API_KEY?.trim();

  if (gbKey) {
    try {
      const q =
        genreConfig.label === 'Todos'
          ? 'subject:fiction'
          : `subject:${genreConfig.slug.replace(/_/g, '+')}`;
      const orderBy = params.sort === 'recent' ? 'newest' : 'relevance';
      const data = await fetchJson<{ items?: GoogleBooksVolume[] }>(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&langRestrict=pt&orderBy=${orderBy}&maxResults=24&key=${gbKey}`
      );
      const works = (data.items || []).map(googleVolumeToCatalogWork);
      if (works.length > 0) {
        const sorted = applyBookFilters(works, params);
        return {
          provider: 'google_books',
          featured: sorted.slice(0, 6),
          items: sorted,
          genres: BOOK_GENRES.map((g) => g.label),
        };
      }
    } catch {
      // Fallback below
    }
  }

  const cacheKey = `books_discover_v2:${genreConfig.slug}`;
  let baseWorks = getCached<CatalogWork[]>(cacheKey);

  if (!baseWorks) {
    const famousBooks = await getCuratedFamousBooks();

    if (genreConfig.label === 'Todos') {
      const [olTrending, olLit] = await Promise.all([
        fetchJson<{ works?: OpenLibrarySubjectWork[] }>(
          'https://openlibrary.org/trending/yearly.json?limit=16',
          {},
          4500
        ).catch(() => ({ works: [] })),
        fetchJson<{ works?: OpenLibrarySubjectWork[] }>(
          'https://openlibrary.org/subjects/fiction.json?limit=16',
          {},
          4500
        ).catch(() => ({ works: [] })),
      ]);

      const olWorks = [...(olTrending.works || []), ...(olLit.works || [])]
        .filter((w) => w.key && w.title)
        .map((w) => olSubjectWorkToCatalogWork(w, 'Ficção Literária'));

      const merged = new Map<string, CatalogWork>();
      for (const w of [...famousBooks, ...olWorks]) {
        if (!merged.has(w.id)) merged.set(w.id, w);
      }
      baseWorks = setCached(cacheKey, Array.from(merged.values()), CACHE_TTL_MS);
    } else {
      const matchingFamous = famousBooks.filter((b) =>
        b.genres.some((g) => g.toLowerCase().includes(genreConfig.label.toLowerCase()))
      );
      const [appleGenreHits, olSub] = await Promise.all([
        queryAppleBooksBR(genreConfig.label, 14),
        genreConfig.slug === 'brazilian_literature'
          ? fetchJson<{ docs?: OpenLibrarySearchDoc[] }>(
              'https://openlibrary.org/search.json?subject=Brazilian+literature&limit=18&fields=key,title,author_name,first_publish_year,cover_i,subject,edition_count,ratings_average,ratings_count,publisher,number_of_pages_median',
              {},
              4500
            )
              .then((r) => (r.docs || []).map((d) => olDocToCatalogWork(d, 'Literatura Brasileira')))
              .catch(() => [] as CatalogWork[])
          : fetchJson<{ works?: OpenLibrarySubjectWork[] }>(
              `https://openlibrary.org/subjects/${genreConfig.slug}.json?limit=18`,
              {},
              4500
            )
              .then((r) =>
                (r.works || []).map((w) => olSubjectWorkToCatalogWork(w, genreConfig.label))
              )
              .catch(() => [] as CatalogWork[]),
      ]);

      const appleGenreWorks = appleGenreHits.map((item) =>
        appleBookToCatalogWork(item, { popularityBoost: 1500, genreHint: genreConfig.label })
      );

      const merged = new Map<string, CatalogWork>();
      for (const w of [...matchingFamous, ...appleGenreWorks, ...olSub]) {
        if (!merged.has(w.id)) merged.set(w.id, w);
      }
      baseWorks = setCached(cacheKey, Array.from(merged.values()), CACHE_TTL_MS);
    }
  }

  const sorted = applyBookFilters(baseWorks, { sort: params.sort });
  return {
    provider: 'apple_books',
    featured: [...sorted].sort((a, b) => b.popularityScore - a.popularityScore).slice(0, 6),
    items: sorted,
    genres: BOOK_GENRES.map((g) => g.label),
  };
}

export async function searchBooks(params: {
  q: string;
  mode?: 'all' | 'title' | 'author';
  genre?: string;
  sort?: string;
}): Promise<{ provider: 'google_books' | 'open_library' | 'apple_books'; items: CatalogWork[] }> {
  const q = params.q.trim();
  if (!q) {
    const res = await discoverBooks(params);
    return { provider: res.provider, items: res.items };
  }

  const gbKey = process.env.GOOGLE_BOOKS_API_KEY?.trim();
  if (gbKey) {
    try {
      const gbQuery =
        params.mode === 'title' ? `intitle:${q}` : params.mode === 'author' ? `inauthor:${q}` : q;
      const data = await fetchJson<{ items?: GoogleBooksVolume[] }>(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(gbQuery)}&maxResults=24&key=${gbKey}`
      );
      const works = (data.items || []).map(googleVolumeToCatalogWork);
      if (works.length > 0) {
        return {
          provider: 'google_books',
          items: applyBookFilters(works, params),
        };
      }
    } catch {
      // Fallback below
    }
  }

  const paramName = params.mode === 'title' ? 'title' : params.mode === 'author' ? 'author' : 'q';
  const olUrl = `https://openlibrary.org/search.json?${paramName}=${encodeURIComponent(
    q
  )}&limit=20&fields=key,title,author_name,first_publish_year,cover_i,subject,edition_count,ratings_average,ratings_count,publisher,number_of_pages_median`;

  const [appleItems, olDocs] = await Promise.all([
    queryAppleBooksBR(q, 18),
    fetchJson<{ docs?: OpenLibrarySearchDoc[] }>(olUrl, {}, 5000)
      .then((d) => d.docs || [])
      .catch(() => [] as OpenLibrarySearchDoc[]),
  ]);

  const qLower = q.toLowerCase();
  const appleWorks = appleItems
    .filter((item) => {
      if (params.mode === 'author') {
        return (item.artistName || '').toLowerCase().includes(qLower);
      }
      if (params.mode === 'title') {
        return (item.trackName || '').toLowerCase().includes(qLower);
      }
      return true;
    })
    .map((item, idx) => appleBookToCatalogWork(item, { popularityBoost: 1000 - idx * 20 }));

  const olWorks = olDocs
    .filter((d) => d.key && d.title)
    .map((d) => olDocToCatalogWork(d));

  const merged = new Map<string, CatalogWork>();
  for (const w of [...appleWorks, ...olWorks]) {
    if (!merged.has(w.id)) merged.set(w.id, w);
  }

  return {
    provider: appleWorks.length > 0 ? 'apple_books' : 'open_library',
    items: applyBookFilters(Array.from(merged.values()), params),
  };
}

export async function getBookDetail(workId: string): Promise<CatalogWork | null> {
  const cached = getCachedWork(workId);

  if (workId.startsWith('ib_')) {
    if (cached && cached.synopsis.length > 40) {
      return withCommunityStats(cached);
    }
    const trackId = workId.replace('ib_', '');
    try {
      const data = await fetchJson<{ results?: AppleBookItem[] }>(
        `https://itunes.apple.com/lookup?id=${encodeURIComponent(trackId)}&country=br`,
        {},
        6000
      );
      const item = data.results?.[0];
      if (item && item.trackId) {
        return withCommunityStats(appleBookToCatalogWork(item));
      }
    } catch {
      if (cached) return withCommunityStats(cached);
    }
  }

  if (workId.startsWith('gb_')) {
    const volId = workId.replace('gb_', '');
    const gbKey = process.env.GOOGLE_BOOKS_API_KEY?.trim();
    if (gbKey) {
      try {
        const vol = await fetchJson<GoogleBooksVolume>(
          `https://www.googleapis.com/books/v1/volumes/${encodeURIComponent(volId)}?key=${gbKey}`
        );
        return withCommunityStats(googleVolumeToCatalogWork(vol));
      } catch {
        if (cached) return withCommunityStats(cached);
      }
    }
  }

  if (workId.startsWith('ol_')) {
    const olKey = workId.replace('ol_', '');
    try {
      const workData = await fetchJson<{
        key: string;
        title?: string;
        description?: string | { value?: string };
        subjects?: string[];
        covers?: number[];
        first_publish_date?: string;
        authors?: { author?: { key?: string } }[];
      }>(`https://openlibrary.org/works/${encodeURIComponent(olKey)}.json`, {}, 6000);

      let descriptionText =
        typeof workData.description === 'string'
          ? workData.description
          : workData.description?.value || '';
      descriptionText = stripHtml(descriptionText);

      // Resolve author names if not already cached
      let creator = cached?.creator || '';
      if (!creator || creator === 'Autor não informado') {
        const firstAuthorKey = workData.authors?.[0]?.author?.key;
        if (firstAuthorKey) {
          try {
            const authorObj = await fetchJson<{ name?: string }>(
              `https://openlibrary.org${firstAuthorKey}.json`,
              {},
              4000
            );
            if (authorObj.name) creator = authorObj.name;
          } catch {
            // ignore
          }
        }
      }

      const title = workData.title || cached?.title || 'Sem título';

      // If Open Library has no synopsis, try Wikipedia PT then EN by book title
      if (!descriptionText || descriptionText.length < 30) {
        const wpPt = await fetchWikipediaSummary(title, 'pt');
        if (wpPt && wpPt.length > 35) {
          descriptionText = wpPt;
        } else {
          const wpEn = await fetchWikipediaSummary(title, 'en');
          if (wpEn && wpEn.length > 35) descriptionText = wpEn;
        }
      }

      const yearMatch = (workData.first_publish_date || cached?.year || '').match(/\d{4}/);
      const validCoverId = (workData.covers || []).find((id) => id > 0);
      const coverUrl =
        cached?.coverUrl ||
        (validCoverId ? `https://covers.openlibrary.org/b/id/${validCoverId}-L.jpg` : '');

      const enriched = cacheWork({
        id: workId,
        mediaKind: 'livro',
        sourceProvider: 'open_library',
        title,
        creator: creator || 'Autor não informado',
        year: yearMatch ? yearMatch[0] : '',
        coverUrl,
        genres: mapBookGenres(workData.subjects, cached?.genres?.[0]),
        synopsis:
          descriptionText ||
          'Sinopse oficial ainda não cadastrada para esta obra na Open Library.',
        popularityScore: cached?.popularityScore || 20,
        externalRating: cached?.externalRating ?? null,
        pageCount: cached?.pageCount ?? null,
        publisher: cached?.publisher,
        isNewRelease: cached?.isNewRelease ?? false,
        communityAverage: null,
        communityReviewCount: 0,
      });
      return withCommunityStats(enriched);
    } catch {
      if (cached) return withCommunityStats(cached);
    }
  }

  return cached ? withCommunityStats(cached) : null;
}

export async function resolveCatalogWork(workId: string): Promise<CatalogWork | null> {
  if (workId.startsWith('ib_') || workId.startsWith('ol_') || workId.startsWith('gb_')) {
    return getBookDetail(workId);
  }
  if (workId.startsWith('tmdb_') || workId.startsWith('imdb_') || workId.startsWith('tvmaze_')) {
    return getMovieSeriesDetail(workId);
  }
  const cached = getCachedWork(workId);
  return cached ? withCommunityStats(cached) : null;
}

export function inferMediaKindFromWorkId(workId: string, fallback?: CatalogMediaKind): CatalogMediaKind {
  if (workId.startsWith('ib_') || workId.startsWith('ol_') || workId.startsWith('gb_')) return 'livro';
  if (workId.startsWith('tvmaze_') || workId.startsWith('tmdb_tv_')) return 'serie';
  if (workId.startsWith('tmdb_movie_')) return 'filme';
  return fallback || 'filme';
}
