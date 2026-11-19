import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { NewsArticle, NewsCategory, NewsSourceName, NewsSourceStatus } from '../src/types/thinklive';

interface FeedDefinition {
  source: NewsSourceName;
  url: string;
  defaultCategory?: NewsCategory;
}

const FEED_DEFINITIONS: FeedDefinition[] = [
  { source: 'G1', url: 'https://g1.globo.com/rss/g1/' },
  { source: 'G1', url: 'https://g1.globo.com/rss/g1/brasil/', defaultCategory: 'Brasil' },
  { source: 'G1', url: 'https://g1.globo.com/rss/g1/mundo/', defaultCategory: 'Mundo' },
  { source: 'G1', url: 'https://g1.globo.com/rss/g1/politica/', defaultCategory: 'Política' },
  { source: 'G1', url: 'https://g1.globo.com/rss/g1/educacao/', defaultCategory: 'Educação' },
  { source: 'G1', url: 'https://g1.globo.com/rss/g1/tecnologia/', defaultCategory: 'Tecnologia' },
  { source: 'G1', url: 'https://g1.globo.com/rss/g1/economia/', defaultCategory: 'Economia' },
  { source: 'G1', url: 'https://g1.globo.com/rss/g1/ciencia-e-saude/', defaultCategory: 'Ciência' },
  { source: 'G1', url: 'https://g1.globo.com/rss/g1/pop-arte/', defaultCategory: 'Cultura' },
  { source: 'UOL Notícias', url: 'https://rss.uol.com.br/feed/noticias.xml' },
  { source: 'CNN Brasil', url: 'https://www.cnnbrasil.com.br/feed/' },
  { source: 'BBC News Brasil', url: 'https://feeds.bbci.co.uk/portuguese/rss.xml' },
  { source: 'Agência Brasil', url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml' },
];

const ALL_SOURCES: NewsSourceName[] = [
  'G1',
  'UOL Notícias',
  'CNN Brasil',
  'BBC News Brasil',
  'Agência Brasil',
];

const NEWS_CACHE_FILE = path.resolve(process.cwd(), 'data', 'news-cache.json');
const SYNC_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  aacute: 'á',
  agrave: 'à',
  acirc: 'â',
  atilde: 'ã',
  auml: 'ä',
  eacute: 'é',
  egrave: 'è',
  ecirc: 'ê',
  iacute: 'í',
  oacute: 'ó',
  ocirc: 'ô',
  otilde: 'õ',
  uacute: 'ú',
  uuml: 'ü',
  ccedil: 'ç',
  Aacute: 'Á',
  Agrave: 'À',
  Acirc: 'Â',
  Atilde: 'Ã',
  Eacute: 'É',
  Ecirc: 'Ê',
  Iacute: 'Í',
  Oacute: 'Ó',
  Ocirc: 'Ô',
  Otilde: 'Õ',
  Uacute: 'Ú',
  Ccedil: 'Ç',
  ndash: '–',
  mdash: '—',
  laquo: '«',
  raquo: '»',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
};

function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (full, name) => NAMED_ENTITIES[name] ?? full);
}

function stripCdata(val: string): string {
  return val.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
}

function stripHtml(val: string): string {
  return decodeEntities(
    stripCdata(val)
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function extractTag(block: string, tag: string): string {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = block.match(regex);
  return match ? match[1] : '';
}

function extractAllTags(block: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(block)) !== null) {
    results.push(stripHtml(match[1]));
  }
  return results;
}

function extractImageUrl(itemBlock: string, rawDescription: string): string {
  const mediaMatch =
    itemBlock.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*>/i) ||
    itemBlock.match(/<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*>/i) ||
    itemBlock.match(/<enclosure[^>]+type=["']image\/[^"']+["'][^>]+url=["']([^"']+)["']/i) ||
    itemBlock.match(/<enclosure[^>]+url=["']([^"']+\.(?:jpg|jpeg|png|webp)(?:\?[^"']*)?)["']/i);
  if (mediaMatch && mediaMatch[1]) {
    return decodeEntities(mediaMatch[1].trim());
  }
  const imgMatch = stripCdata(rawDescription).match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch && imgMatch[1] && !imgMatch[1].endsWith('.gif')) {
    return decodeEntities(imgMatch[1].trim());
  }
  return '';
}

function classifyCategory(
  link: string,
  title: string,
  rawCategories: string[],
  defaultCategory?: NewsCategory
): NewsCategory {
  if (defaultCategory) return defaultCategory;
  const hay = `${rawCategories.join(' ')} ${link} ${title}`.toLowerCase();

  if (/\b(pol[ií]tica|congresso|senado|c[aâ]mara|elei[cç]|stf|governo|ministro|presidente|lula|bolsonaro)\b/.test(hay)) {
    return 'Política';
  }
  if (/\b(economia|mercado|d[oó]lar|ibovespa|infla[cç][aã]o|juros|selic|banco central|pib|emprego|neg[oó]cios|finan[cç]as)\b/.test(hay)) {
    return 'Economia';
  }
  if (/\b(tecnologia|ia|intelig[eê]ncia artificial|software|internet|celular|apple|google|microsoft|meta|ciberseguran|digital|startup)\b/.test(hay)) {
    return 'Tecnologia';
  }
  if (/\b(ci[eê]ncia|espa[cç]o|nasa|pesquisa|universidade|descoberta|clima|astronomia|f[ií]sica|biologia)\b/.test(hay)) {
    return 'Ciência';
  }
  if (/\b(educa[cç][aã]o|enem|escola|ensino|mec|vestibular|professor|estudante)\b/.test(hay)) {
    return 'Educação';
  }
  if (/\b(entretenimento|bbb|novela|celebridade|streaming|netflix|festival|oscar|show|tv|pop-arte)\b/.test(hay)) {
    return 'Entretenimento';
  }
  if (/\b(cultura|cinema|filme|livro|literatura|teatro|museu|m[uú]sica|arte|exposi[cç][aã]o)\b/.test(hay)) {
    return 'Cultura';
  }
  if (/\b(mundo|internacional|eua|europa|ucr[aâ]nia|oriente m[eé]dio|china|r[uú]ssia|onu|exterior)\b/.test(hay)) {
    return 'Mundo';
  }
  return 'Brasil';
}

function canonicalizeUrl(rawUrl: string): string {
  try {
    const u = new URL(rawUrl.trim());
    u.hash = '';
    for (const key of Array.from(u.searchParams.keys())) {
      if (key.startsWith('utm_') || key === 'ref' || key === 'fbclid') {
        u.searchParams.delete(key);
      }
    }
    return u.toString().replace(/\/+$/, '');
  } catch {
    return rawUrl.trim();
  }
}

function parseRssXml(xml: string, def: FeedDefinition): NewsArticle[] {
  const items: NewsArticle[] = [];
  const itemMatches = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];

  for (const block of itemMatches.slice(0, 25)) {
    const title = stripHtml(extractTag(block, 'title'));
    const link = stripHtml(extractTag(block, 'link'));
    if (!title || !link || !link.startsWith('http')) continue;

    const rawDesc = extractTag(block, 'description') || extractTag(block, 'content:encoded');
    let summary = stripHtml(rawDesc);
    if (summary.length > 220) {
      summary = `${summary.slice(0, 217).trim()}…`;
    }

    const pubRaw = stripHtml(extractTag(block, 'pubDate') || extractTag(block, 'dc:date'));
    const parsedDate = pubRaw ? new Date(pubRaw) : new Date();
    const publishedAt = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();

    const rawCategories = extractAllTags(block, 'category');
    const author = stripHtml(extractTag(block, 'dc:creator') || extractTag(block, 'author'));
    const imageUrl = extractImageUrl(block, rawDesc);
    const category = classifyCategory(link, title, rawCategories, def.defaultCategory);

    const canonical = canonicalizeUrl(link);
    const id = `news_${crypto.createHash('sha1').update(canonical).digest('hex').slice(0, 12)}`;

    items.push({
      id,
      title,
      summary: summary || 'Leia a cobertura completa diretamente no veículo jornalístico.',
      link,
      source: def.source,
      category,
      publishedAt,
      imageUrl,
      author: author || undefined,
    });
  }
  return items;
}

async function fetchFeed(def: FeedDefinition): Promise<NewsArticle[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(def.url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8',
      },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const contentType = res.headers.get('content-type') || '';
    const buf = await res.arrayBuffer();
    const utf8Preview = Buffer.from(buf).toString('utf-8', 0, 200);
    const isLatin1 =
      /iso-8859-1|latin1/i.test(contentType) || /encoding=["']iso-8859-1["']/i.test(utf8Preview);
    const xml = new TextDecoder(isLatin1 ? 'iso-8859-1' : 'utf-8').decode(buf);
    return parseRssXml(xml, def);
  } finally {
    clearTimeout(timer);
  }
}

interface NewsState {
  articles: NewsArticle[];
  lastSyncedAt: string | null;
  sourceStatuses: NewsSourceStatus[];
  isSyncing: boolean;
}

const state: NewsState = {
  articles: [],
  lastSyncedAt: null,
  sourceStatuses: ALL_SOURCES.map((source) => ({
    source,
    feedUrl: FEED_DEFINITIONS.find((f) => f.source === source)?.url || '',
    ok: false,
    itemCount: 0,
    lastAttemptAt: null,
    lastSuccessAt: null,
    error: null,
  })),
  isSyncing: false,
};

type NewsListener = (payload: { lastSyncedAt: string | null; count: number }) => void;
const listeners = new Set<NewsListener>();

export function subscribeNewsUpdates(fn: NewsListener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function loadCachedNews() {
  try {
    if (fs.existsSync(NEWS_CACHE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(NEWS_CACHE_FILE, 'utf-8')) as {
        articles?: NewsArticle[];
        lastSyncedAt?: string | null;
        sourceStatuses?: NewsSourceStatus[];
      };
      if (Array.isArray(parsed.articles)) state.articles = parsed.articles;
      if (parsed.lastSyncedAt) state.lastSyncedAt = parsed.lastSyncedAt;
      if (Array.isArray(parsed.sourceStatuses)) state.sourceStatuses = parsed.sourceStatuses;
    }
  } catch {
    // ignore corrupt cache
  }
}

function saveCachedNews() {
  try {
    const dir = path.dirname(NEWS_CACHE_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      NEWS_CACHE_FILE,
      JSON.stringify({
        articles: state.articles,
        lastSyncedAt: state.lastSyncedAt,
        sourceStatuses: state.sourceStatuses,
      }),
      'utf-8'
    );
  } catch {
    // ignore write error
  }
}

let inFlightSyncPromise: Promise<{
  articles: NewsArticle[];
  lastSyncedAt: string | null;
  sourceStatuses: NewsSourceStatus[];
  isSyncing: boolean;
}> | null = null;

export async function syncAllNews(): Promise<{
  articles: NewsArticle[];
  lastSyncedAt: string | null;
  sourceStatuses: NewsSourceStatus[];
  isSyncing: boolean;
}> {
  if (inFlightSyncPromise) {
    return inFlightSyncPromise;
  }

  state.isSyncing = true;
  inFlightSyncPromise = (async () => {
    const attemptIso = new Date().toISOString();

    try {
      const collected: NewsArticle[] = [];
      const perSourceResults = new Map<NewsSourceName, { okCount: number; totalItems: number; errors: string[] }>();
      for (const s of ALL_SOURCES) {
        perSourceResults.set(s, { okCount: 0, totalItems: 0, errors: [] });
      }

      const settled = await Promise.allSettled(
        FEED_DEFINITIONS.map(async (def) => ({ def, items: await fetchFeed(def) }))
      );

      for (let i = 0; i < settled.length; i++) {
        const result = settled[i];
        const def = FEED_DEFINITIONS[i];
        const tracker = perSourceResults.get(def.source)!;
        if (result.status === 'fulfilled') {
          tracker.okCount += 1;
          tracker.totalItems += result.value.items.length;
          collected.push(...result.value.items);
        } else {
          tracker.errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
        }
      }

      // Deduplicate strictly by canonical URL and normalized (source + title)
      const seenUrls = new Set<string>();
      const seenTitleKeys = new Set<string>();
      const deduped: NewsArticle[] = [];

      collected.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

      for (const art of collected) {
        const urlKey = canonicalizeUrl(art.link).toLowerCase();
        const titleKey = `${art.source}:${art.title.toLowerCase().replace(/\s+/g, ' ').trim()}`;
        if (seenUrls.has(urlKey) || seenTitleKeys.has(titleKey)) continue;
        seenUrls.add(urlKey);
        seenTitleKeys.add(titleKey);
        deduped.push(art);
      }

      if (deduped.length > 0) {
        state.articles = deduped.slice(0, 350);
      }

      state.lastSyncedAt = attemptIso;
      state.sourceStatuses = ALL_SOURCES.map((source) => {
        const prev = state.sourceStatuses.find((s) => s.source === source);
        const tracker = perSourceResults.get(source)!;
        const ok = tracker.okCount > 0;
        return {
          source,
          feedUrl: FEED_DEFINITIONS.find((f) => f.source === source)?.url || '',
          ok,
          itemCount: state.articles.filter((a) => a.source === source).length,
          lastAttemptAt: attemptIso,
          lastSuccessAt: ok ? attemptIso : prev?.lastSuccessAt || null,
          error: ok ? null : tracker.errors[0] || 'Fonte temporariamente indisponível',
        };
      });

      saveCachedNews();
      for (const fn of listeners) {
        fn({ lastSyncedAt: state.lastSyncedAt, count: state.articles.length });
      }
    } finally {
      state.isSyncing = false;
      inFlightSyncPromise = null;
    }

    return getNewsSnapshot();
  })();

  return inFlightSyncPromise;
}

export function getNewsSnapshot(filters?: { source?: string; category?: string; q?: string }) {
  let list = state.articles;
  if (filters?.source && filters.source !== 'Todos') {
    list = list.filter((a) => a.source === filters.source);
  }
  if (filters?.category && filters.category !== 'Todas') {
    list = list.filter((a) => a.category === filters.category);
  }
  if (filters?.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    list = list.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q)
    );
  }

  return {
    articles: list,
    lastSyncedAt: state.lastSyncedAt,
    sourceStatuses: state.sourceStatuses,
    isSyncing: state.isSyncing,
  };
}

let schedulerStarted = false;
export function startNewsScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;
  loadCachedNews();
  // Initial background sync
  syncAllNews().catch((err) => {
    console.error('Initial news sync error:', err);
  });
  // Recurring 30-minute server sync
  setInterval(() => {
    syncAllNews().catch((err) => {
      console.error('Scheduled 30m news sync error:', err);
    });
  }, SYNC_INTERVAL_MS);
}
