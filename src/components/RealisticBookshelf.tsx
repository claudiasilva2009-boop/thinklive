import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Bookmark,
  BookmarkX,
  BookOpen,
  Calendar,
  Check,
  Clock,
  ExternalLink,
  Feather,
  FileText,
  Film,
  Globe,
  Heart,
  Library,
  Lock,
  Pencil,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Star,
  Trash2,
  Tv,
  User as UserIcon,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../lib/api';
import {
  BOOK_SHELF_LABELS,
  BOOK_SHELF_ORDER,
  deduplicateBookShelves,
} from '../lib/bookLibrary';
import {
  DEFAULT_SHELF_CONFIG,
  getShelfBackdropStyle,
  getShelfWoodStyle,
} from '../lib/themes';
import {
  BookShelfStatus,
  CatalogMediaKind,
  CatalogWork,
  MediaReviewEnriched,
  MediaShelfEntry,
  MovieShelfStatus,
  PostWithAuthor,
  Shelf,
  ShelfBackdropTone,
  ShelfBookSize,
  ShelfDisplayMode,
  ShelfItem,
  ShelfSpacing,
  ShelfVisualConfig,
  ShelfWoodTone,
} from '../types/thinklive';
import { AgeRatingBadge, CatalogCover } from './CatalogCover';
import { ImageWithFallback } from './ImageWithFallback';

export type LibraryDomainTab =
  | 'livros'
  | 'filmes'
  | 'series'
  | 'animes'
  | 'favoritos'
  | 'poemas'
  | 'artigos'
  | 'todas';

type BookFilterTab = 'todas' | BookShelfStatus | 'favoritos';
type MovieFilterTab = 'todas' | MovieShelfStatus | 'favoritos';

export type ShelfDisplaySelection =
  | { source: 'media'; entry: MediaShelfEntry }
  | { source: 'shelf'; shelf: Shelf; item: ShelfItem; index: number };

interface RealisticBookshelfProps {
  entries: MediaShelfEntry[];
  reviews: MediaReviewEnriched[];
  shelves: Shelf[];
  isOwner: boolean;
  shelfConfig?: ShelfVisualConfig;
  onSaveShelfConfig?: (next: ShelfVisualConfig) => Promise<void>;
  onOpenWork?: (workId: string) => void;
  onOpenPostId?: (postId: string) => void;
  onOpenBooks?: () => void;
  onOpenMovies?: () => void;
  onUpdateMediaEntry: (
    entry: MediaShelfEntry,
    patch: { status?: BookShelfStatus | MovieShelfStatus | null; isFavorite?: boolean }
  ) => Promise<void>;
  onRemoveMediaEntry: (entry: MediaShelfEntry) => Promise<void>;
  onUpdateShelfItem?: (
    shelfId: string,
    itemId: string,
    patch: Partial<ShelfItem>
  ) => Promise<void>;
  onReorderShelfItem?: (
    shelfId: string,
    itemId: string,
    direction: -1 | 1
  ) => Promise<void>;
  onRemoveShelfItem: (shelfId: string, itemId: string) => Promise<void>;
  onTransferShelfItem: (
    fromShelfId: string,
    toShelfId: string,
    item: ShelfItem
  ) => Promise<void>;
  onQuickAddKind?: (kind: ShelfItem['kind']) => void;
}

interface SpinePalette {
  bg: string;
  accent: string;
  text: string;
  subtext: string;
  foil: string;
  band: string;
}

const SPINE_PALETTES: SpinePalette[] = [
  {
    bg: 'linear-gradient(180deg, #803C50 0%, #632B3C 58%, #491E2B 100%)',
    accent: '#F5E9E8',
    text: '#FFF9F5',
    subtext: 'rgba(255, 249, 245, 0.78)',
    foil: 'rgba(217, 184, 192, 0.58)',
    band: '#441B27',
  },
  {
    bg: 'linear-gradient(180deg, #6E2B23 0%, #531E18 58%, #3F1510 100%)',
    accent: '#D8B26E',
    text: '#F7EFE2',
    subtext: 'rgba(247, 239, 226, 0.78)',
    foil: 'rgba(216, 178, 110, 0.55)',
    band: '#3B1410',
  },
  {
    bg: 'linear-gradient(180deg, #2D4A3E 0%, #20372E 60%, #162620 100%)',
    accent: '#D5B883',
    text: '#F3ECE0',
    subtext: 'rgba(243, 236, 224, 0.78)',
    foil: 'rgba(213, 184, 131, 0.52)',
    band: '#182A23',
  },
  {
    bg: 'linear-gradient(180deg, #B65B76 0%, #94435B 58%, #743145 100%)',
    accent: '#FFF9F5',
    text: '#FFF9F5',
    subtext: 'rgba(255, 249, 245, 0.82)',
    foil: 'rgba(245, 233, 232, 0.55)',
    band: '#6A2B3E',
  },
  {
    bg: 'linear-gradient(180deg, #2B3B4E 0%, #1F2B3A 60%, #151E29 100%)',
    accent: '#DFC597',
    text: '#F2ECE2',
    subtext: 'rgba(242, 236, 226, 0.76)',
    foil: 'rgba(223, 197, 151, 0.5)',
    band: '#16202C',
  },
  {
    bg: 'linear-gradient(180deg, #E8DCC8 0%, #D9C8AE 62%, #C4AF90 100%)',
    accent: '#493039',
    text: '#3D261C',
    subtext: 'rgba(61, 38, 28, 0.75)',
    foil: 'rgba(128, 60, 80, 0.42)',
    band: '#9C7E5E',
  },
  {
    bg: 'linear-gradient(180deg, #5A3A47 0%, #442A35 60%, #311D26 100%)',
    accent: '#E2C391',
    text: '#F7EFE4',
    subtext: 'rgba(247, 239, 228, 0.78)',
    foil: 'rgba(226, 195, 145, 0.52)',
    band: '#2D1A22',
  },
  {
    bg: 'linear-gradient(180deg, #9B743D 0%, #7C5A2C 58%, #5D421F 100%)',
    accent: '#F7E5C0',
    text: '#FFF8EB',
    subtext: 'rgba(255, 248, 235, 0.8)',
    foil: 'rgba(247, 229, 192, 0.55)',
    band: '#523A1B',
  },
  {
    bg: 'linear-gradient(180deg, #D9B8C0 0%, #C69CA7 58%, #AD7F8C 100%)',
    accent: '#493039',
    text: '#493039',
    subtext: 'rgba(73, 48, 57, 0.8)',
    foil: 'rgba(73, 48, 57, 0.36)',
    band: '#8E616E',
  },
  {
    bg: 'linear-gradient(180deg, #5B4032 0%, #463025 58%, #322119 100%)',
    accent: '#DFBA81',
    text: '#F6EDE0',
    subtext: 'rgba(246, 237, 224, 0.76)',
    foil: 'rgba(223, 186, 129, 0.5)',
    band: '#2D1D16',
  },
];

const MOVIE_SHELF_LABELS: Record<MovieShelfStatus, string> = {
  quero_assistir: 'Quero assistir',
  ja_assistido: 'Já assisti',
};

const KIND_BADGE_LABELS: Record<string, string> = {
  livro: 'Livro',
  filme: 'Filme',
  serie: 'Série',
  anime: 'Anime',
  poema: 'Poema',
  artigo: 'Artigo',
  publicacao: 'Artigo',
  fotografia: 'Fotografia',
  musica: 'Música',
  outro: 'Obra',
};

function hashString(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function getVolumeMetrics(
  id: string,
  title: string,
  kind: string,
  bookSize: ShelfBookSize,
  mode: ShelfDisplayMode
) {
  const seed = hashString(`${id}::${title}::${kind}`);
  const palette = SPINE_PALETTES[seed % SPINE_PALETTES.length];
  const sizeScale = bookSize === 'compacto' ? 0.84 : bookSize === 'grande' ? 1.16 : 1;

  // Decide whether this item displays front cover + 3D spine or turned classic spine
  const isCoverMode =
    mode === 'capas_3d' ? true : mode === 'lombadas' ? false : seed % 4 !== 0;

  if (isCoverMode) {
    const baseCoverH = kind === 'filme' || kind === 'serie' || kind === 'anime' ? 156 : 150;
    const coverHeight = Math.round((baseCoverH + ((seed >> 3) % 24)) * sizeScale);
    const coverWidth = Math.round((coverHeight * 0.66) + ((seed >> 5) % 8));
    const spineThickness = Math.round((9 + ((seed >> 7) % 8)) * sizeScale);
    const tiltDeg = ((seed % 5) - 2) * 0.48; // subtle -0.96deg to +0.96deg
    return {
      isCoverMode: true,
      palette,
      height: coverHeight,
      width: coverWidth + spineThickness,
      coverWidth,
      spineThickness,
      tiltDeg,
      hasDoubleBand: (seed >> 9) % 2 === 0,
    };
  }

  const baseHeight = kind === 'filme' || kind === 'serie' || kind === 'anime' ? 164 : 156;
  const height = Math.round((baseHeight + ((seed >> 3) % 28)) * sizeScale);
  const baseWidth = kind === 'poema' ? 36 : 40;
  const width = Math.round((baseWidth + ((seed >> 6) % 14)) * sizeScale);
  const tiltDeg = ((seed % 5) - 2) * 0.4;
  return {
    isCoverMode: false,
    palette,
    height,
    width,
    coverWidth: width,
    spineThickness: width,
    tiltDeg,
    hasDoubleBand: (seed >> 9) % 2 === 0,
  };
}

function isPoemShelfItem(shelf: Shelf, item: ShelfItem): boolean {
  if (item.kind === 'poema') return true;
  const cat = `${shelf.category} ${shelf.title}`.toLowerCase();
  return cat.includes('poema') && item.kind === 'outro';
}

function isArticleShelfItem(shelf: Shelf, item: ShelfItem): boolean {
  if (item.kind === 'artigo' || item.kind === 'publicacao') return true;
  const cat = `${shelf.category} ${shelf.title}`.toLowerCase();
  return (cat.includes('artigo') || cat.includes('ensaio')) && item.kind === 'outro';
}

function isAnimeMediaEntry(entry: MediaShelfEntry): boolean {
  const genres = (entry.workSnapshot.genres || []).join(' ').toLowerCase();
  const title = entry.workSnapshot.title.toLowerCase();
  return genres.includes('anime') || genres.includes('animação') || title.includes('anime');
}

function useContainerWidth(ref: React.RefObject<HTMLDivElement | null>, fallback = 740) {
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      if (el.clientWidth > 0) setWidth(el.clientWidth);
    };
    update();
    if (typeof ResizeObserver !== 'undefined') {
      const obs = new ResizeObserver(update);
      obs.observe(el);
      return () => obs.disconnect();
    }
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [ref]);
  return width;
}

interface UnifiedSpineNode {
  id: string;
  title: string;
  author: string;
  year?: string;
  kind: string;
  coverUrl?: string;
  badgeText: string;
  statusRibbon?: boolean;
  isFavorite?: boolean;
  rating?: number;
  selection: ShelfDisplaySelection;
}

interface WoodenRow {
  id: string;
  label?: string;
  items: UnifiedSpineNode[];
}

function chunkVolumesIntoRows(
  nodes: UnifiedSpineNode[],
  containerWidth: number,
  groupId: string,
  config: ShelfVisualConfig,
  groupLabel?: string
): WoodenRow[] {
  if (nodes.length === 0) return [];
  const gapPx = config.spacing === 'junto' ? 5 : config.spacing === 'arejado' ? 16 : 10;
  const maxRowWidth = Math.max(220, containerWidth - 48);
  const rows: WoodenRow[] = [];
  let current: UnifiedSpineNode[] = [];
  let used = 0;

  nodes.forEach((node) => {
    const { width } = getVolumeMetrics(
      node.id,
      node.title,
      node.kind,
      config.bookSize,
      config.displayMode
    );
    const slot = width + gapPx;
    const hitCountLimit = config.itemsPerRow > 0 && current.length >= config.itemsPerRow;
    const hitWidthLimit = current.length > 0 && used + slot > maxRowWidth && config.itemsPerRow === 0;

    if (hitCountLimit || hitWidthLimit) {
      rows.push({
        id: `${groupId}_row_${rows.length}`,
        label: rows.length === 0 ? groupLabel : undefined,
        items: current,
      });
      current = [node];
      used = slot;
    } else {
      current.push(node);
      used += slot;
    }
  });

  if (current.length > 0) {
    rows.push({
      id: `${groupId}_row_${rows.length}`,
      label: rows.length === 0 ? groupLabel : undefined,
      items: current,
    });
  }
  return rows;
}

function PhysicalBookObject({
  node,
  config,
  onClick,
}: {
  node: UnifiedSpineNode;
  config: ShelfVisualConfig;
  onClick: () => void;
}) {
  const metrics = getVolumeMetrics(
    node.id,
    node.title,
    node.kind,
    config.bookSize,
    config.displayMode
  );
  const [imgFailed, setImgFailed] = useState(false);
  const hasRealCover = Boolean(node.coverUrl && !imgFailed);

  const microTag =
    node.kind === 'filme'
      ? 'FILME'
      : node.kind === 'serie'
      ? 'SÉRIE'
      : node.kind === 'anime'
      ? 'ANIME'
      : node.kind === 'poema'
      ? 'POEMA'
      : node.kind === 'artigo' || node.kind === 'publicacao'
      ? 'ARTIGO'
      : '';

  if (metrics.isCoverMode) {
    return (
      <button
        type="button"
        onClick={onClick}
        title={`${node.title}${node.author ? ` — ${node.author}` : ''}`}
        aria-label={`Abrir detalhes de ${node.title}`}
        className="group relative shrink-0 snap-start flex items-end cursor-pointer transition-all duration-300 ease-out hover:-translate-y-3.5 hover:scale-[1.045] hover:!rotate-0 hover:z-30 focus:outline-none focus:-translate-y-3 focus:z-30"
        style={{
          width: `${metrics.width}px`,
          height: `${metrics.height}px`,
          transform: `rotate(${metrics.tiltDeg}deg)`,
          transformOrigin: 'bottom center',
        }}
      >
        {/* Grounded contact shadow on the wooden shelf */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-1 left-1 right-0.5 h-2.5 rounded-full blur-[3px] bg-black/55 transition-opacity group-hover:opacity-80"
        />

        {/* Bookmark Ribbon when currently reading / watchlist */}
        {node.statusRibbon && (
          <span
            aria-hidden="true"
            className="absolute -top-2 right-3 w-2.5 h-5 rounded-t-xs shadow-md z-30"
            style={{
              background: 'linear-gradient(180deg, #B65B76 0%, #803C50 100%)',
            }}
          />
        )}

        {/* Floating Tooltip */}
        <span
          role="tooltip"
          className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all duration-200 absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-xl bg-[#2A181F]/95 text-[#FFF9F5] border border-[#D9B8C0]/35 shadow-xl text-left z-40"
        >
          <span className="block font-editorial text-xs font-semibold max-w-[200px] truncate">
            {node.title}
          </span>
          <span className="block text-[10px] text-[#E6CDD4] max-w-[200px] truncate">
            {node.author ? `${node.author} · ` : ''}
            {node.badgeText}
            {node.rating !== undefined ? ` · ${node.rating.toFixed(1)}/10` : ''}
          </span>
        </span>

        {/* Physical 3D Book Assembly: Visible Spine + Front Cover + Paper Thickness */}
        <div
          className="relative w-full h-full flex rounded-r-[4px] rounded-l-[2px] overflow-hidden"
          style={{
            boxShadow:
              '5px 4px 12px rgba(0, 0, 0, 0.52), -1px 1px 4px rgba(0, 0, 0, 0.35), 0 1px 0 rgba(255,255,255,0.12)',
          }}
        >
          {/* Visible 3D Left Spine */}
          <div
            aria-hidden="true"
            className="h-full shrink-0 flex flex-col justify-between items-center py-2 relative"
            style={{
              width: `${metrics.spineThickness}px`,
              background: metrics.palette.bg,
              boxShadow:
                'inset 2px 0 3px rgba(255,255,255,0.22), inset -2px 0 4px rgba(0,0,0,0.45)',
            }}
          >
            <span
              className="w-full h-[1.5px] opacity-80"
              style={{ backgroundColor: metrics.palette.foil }}
            />
            <span
              className="w-full h-[1.5px] opacity-80"
              style={{ backgroundColor: metrics.palette.foil }}
            />
          </div>

          {/* Front Cover Face (Real cover image or embossed cloth binding) */}
          <div
            className="relative flex-1 h-full overflow-hidden border-t border-r-[2.5px] border-b"
            style={{
              borderTopColor: 'rgba(255, 249, 240, 0.42)',
              borderRightColor: '#EFE4D6',
              borderBottomColor: 'rgba(0, 0, 0, 0.35)',
              background: metrics.palette.bg,
            }}
          >
            {hasRealCover ? (
              <img
                src={node.coverUrl}
                alt={node.title}
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
            ) : (
              /* Embossed Cloth / Leather Hardcover Binding (no fake photo) */
              <div
                className="w-full h-full p-2 flex flex-col justify-between text-center relative"
                style={{ background: metrics.palette.bg }}
              >
                <div
                  className="absolute inset-1.5 border rounded-[2px] pointer-events-none"
                  style={{ borderColor: metrics.palette.foil }}
                />
                <div className="relative z-10 pt-1">
                  <div
                    className="text-[7px] uppercase tracking-[0.16em] font-semibold opacity-80"
                    style={{ color: metrics.palette.accent }}
                  >
                    {microTag || 'ED. CLÁSSICA'}
                  </div>
                </div>
                <div className="relative z-10 px-0.5 space-y-1">
                  <div
                    className="font-editorial text-[11px] sm:text-xs font-semibold leading-tight line-clamp-4"
                    style={{ color: metrics.palette.text }}
                  >
                    {node.title}
                  </div>
                  {node.author && (
                    <div
                      className="text-[8.5px] truncate opacity-85"
                      style={{ color: metrics.palette.subtext }}
                    >
                      {node.author}
                    </div>
                  )}
                </div>
                <div className="relative z-10 pb-0.5 flex justify-center">
                  <span
                    className="w-5 h-[1.5px] rounded-full opacity-75"
                    style={{ backgroundColor: metrics.palette.foil }}
                  />
                </div>
              </div>
            )}

            {/* Spine Crease Groove + Gloss Lighting Overlay */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  'linear-gradient(90deg, rgba(0,0,0,0.34) 0%, rgba(255,255,255,0.16) 5%, transparent 16%, rgba(0,0,0,0.14) 100%)',
              }}
            />

            {/* Hover Luminous Sheen */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                boxShadow:
                  'inset 0 0 14px rgba(255, 226, 200, 0.35)',
              }}
            />

            {/* Discreet Favorite Corner Emblem */}
            {node.isFavorite && (
              <span
                aria-hidden="true"
                className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full bg-[#493039]/85 text-[#FFF9F5] flex items-center justify-center shadow"
              >
                <Heart className="w-2.5 h-2.5 fill-current text-[#D9B8C0]" />
              </span>
            )}

            {/* Micro Category Corner Label on Films/Series/Animes */}
            {microTag && hasRealCover && (
              <span className="absolute top-1.5 left-1.5 px-1 py-0.5 rounded bg-[#24141A]/75 text-[#FFF9F5] text-[6.5px] font-semibold tracking-wider uppercase">
                {microTag}
              </span>
            )}
          </div>
        </div>
      </button>
    );
  }

  // Turned Classic Spine Mode
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${node.title}${node.author ? ` — ${node.author}` : ''}`}
      aria-label={`Abrir detalhes de ${node.title}`}
      className="group relative shrink-0 snap-start flex flex-col justify-between items-center rounded-t-[4px] rounded-b-[2px] cursor-pointer transition-all duration-300 ease-out hover:-translate-y-3.5 hover:scale-[1.04] hover:!rotate-0 hover:z-30 focus:outline-none focus:-translate-y-3 focus:z-30"
      style={{
        width: `${metrics.width}px`,
        height: `${metrics.height}px`,
        transform: `rotate(${metrics.tiltDeg}deg)`,
        transformOrigin: 'bottom center',
        background: metrics.palette.bg,
        boxShadow:
          '4px 0 10px rgba(0, 0, 0, 0.52), -1px 0 3px rgba(0, 0, 0, 0.32), inset 4px 0 6px rgba(255, 255, 255, 0.14), inset -4px 0 7px rgba(0, 0, 0, 0.32)',
        borderTop: `1px solid ${metrics.palette.foil}`,
      }}
    >
      {node.statusRibbon && (
        <span
          aria-hidden="true"
          className="absolute -top-2.5 right-2 w-2 h-4 rounded-t-xs shadow-sm"
          style={{
            background: 'linear-gradient(180deg, #B65B76 0%, #803C50 100%)',
          }}
        />
      )}

      {/* 3D Spine Cylindrical Shading */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-t-[4px]"
        style={{
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.03) 22%, rgba(0,0,0,0.04) 70%, rgba(0,0,0,0.34) 100%)',
        }}
      />

      {/* Hover Warm Glow */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-t-[4px] opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          boxShadow:
            '0 0 18px rgba(217, 184, 192, 0.55), inset 0 0 10px rgba(255, 232, 238, 0.28)',
        }}
      />

      {/* Floating Tooltip */}
      <span
        role="tooltip"
        className="pointer-events-none opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-all duration-200 absolute -top-14 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1.5 rounded-xl bg-[#2A181F]/95 text-[#FFF9F5] border border-[#D9B8C0]/35 shadow-xl text-left z-40"
      >
        <span className="block font-editorial text-xs font-semibold max-w-[200px] truncate">
          {node.title}
        </span>
        <span className="block text-[10px] text-[#E6CDD4] max-w-[200px] truncate">
          {node.author ? `${node.author} · ` : ''}
          {node.badgeText}
          {node.rating !== undefined ? ` · ${node.rating.toFixed(1)}/10` : ''}
        </span>
      </span>

      {/* Top Foil Bands */}
      <div className="relative z-10 w-full pt-2 px-1 space-y-1 flex flex-col items-center">
        <div
          className="h-[2px] w-full rounded-full"
          style={{ backgroundColor: metrics.palette.foil }}
        />
        {metrics.hasDoubleBand && (
          <div
            className="h-[1px] w-3/4 rounded-full opacity-80"
            style={{ backgroundColor: metrics.palette.foil }}
          />
        )}
        {microTag && (
          <span
            className="text-[6.5px] font-bold tracking-[0.14em] uppercase opacity-80 leading-none pt-0.5"
            style={{ color: metrics.palette.accent }}
          >
            {microTag}
          </span>
        )}
      </div>

      {/* Vertical Title & Author */}
      <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center overflow-hidden px-1 py-1.5">
        <div
          className="flex items-center justify-center gap-1.5 max-h-full overflow-hidden"
          style={{
            writingMode: 'vertical-rl',
            transform: 'rotate(180deg)',
          }}
        >
          <span
            className="font-editorial text-[11px] font-semibold tracking-wide leading-tight truncate max-h-[104px]"
            style={{ color: metrics.palette.text }}
          >
            {node.title}
          </span>
          {node.author && (
            <span
              className="text-[8.5px] uppercase tracking-wider truncate max-h-[66px]"
              style={{ color: metrics.palette.subtext }}
            >
              {node.author}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Foil & Favorite Emblem */}
      <div className="relative z-10 w-full pb-2 px-1 flex flex-col items-center gap-1">
        {node.isFavorite && (
          <Heart className="w-2.5 h-2.5 fill-current" style={{ color: metrics.palette.accent }} />
        )}
        <div
          className="h-[2px] w-full rounded-full"
          style={{ backgroundColor: metrics.palette.foil }}
        />
        <div
          className="h-1.5 w-full rounded-b-[2px] opacity-75"
          style={{ backgroundColor: metrics.palette.band }}
        />
      </div>
    </button>
  );
}

function WoodenPlank({ woodTone }: { woodTone: ShelfWoodTone }) {
  const wood = getShelfWoodStyle(woodTone);
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="h-2.5 w-full"
        style={{ background: wood.plankTop }}
      />
      <div
        aria-hidden="true"
        className="h-4 w-full relative"
        style={{
          background: wood.plankFront,
          boxShadow:
            'inset 0 1px 1px rgba(255, 240, 230, 0.34), 0 8px 16px rgba(0, 0, 0, 0.48)',
        }}
      />
    </div>
  );
}

function WoodenCabinetFrame({
  cabinetRef,
  config,
  children,
}: {
  cabinetRef: React.RefObject<HTMLDivElement | null>;
  config: ShelfVisualConfig;
  children: React.ReactNode;
}) {
  const wood = getShelfWoodStyle(config.woodTone);
  const backdrop = getShelfBackdropStyle(config.backdropTone);

  return (
    <div
      ref={cabinetRef}
      className="relative rounded-[28px] p-2.5 sm:p-4 overflow-hidden select-none transition-all duration-300"
      style={{
        background: wood.frameBg,
        boxShadow:
          '0 24px 48px -18px rgba(34, 17, 22, 0.48), inset 0 2px 3px rgba(255, 244, 236, 0.25), inset 0 -3px 6px rgba(18, 8, 12, 0.45)',
        border: `1px solid ${wood.frameBorder}`,
      }}
    >
      {/* Natural Wood Grain Overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-20 mix-blend-overlay"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent 0px, transparent 14px, rgba(255,235,220,0.18) 15px, transparent 17px, rgba(0,0,0,0.2) 29px)',
        }}
      />
      {/* Top Cornice Molding */}
      <div
        aria-hidden="true"
        className="relative z-10 h-2.5 mx-1 mb-2 rounded-t-xl"
        style={{
          background: wood.isLightWood
            ? 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(160,128,118,0.28) 100%)'
            : 'linear-gradient(180deg, rgba(240,210,218,0.24) 0%, rgba(56,28,36,0.55) 100%)',
          boxShadow: '0 2px 6px rgba(0,0,0,0.28)',
        }}
      />
      {/* Interior Library Cavity */}
      <div
        className="relative z-10 rounded-2xl overflow-hidden transition-colors duration-300"
        style={{
          background: backdrop.bg,
          boxShadow:
            'inset 0 12px 26px rgba(0, 0, 0, 0.42), inset 10px 0 18px rgba(0, 0, 0, 0.28), inset -10px 0 18px rgba(0, 0, 0, 0.28)',
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-70"
          style={{ background: backdrop.glow }}
        />
        {children}
      </div>
    </div>
  );
}

function ShelfRowsRenderer({
  rows,
  config,
  emptyTitle,
  emptyDesc,
  emptyAction,
  onSelect,
}: {
  rows: WoodenRow[];
  config: ShelfVisualConfig;
  emptyTitle: string;
  emptyDesc: string;
  emptyAction?: React.ReactNode;
  onSelect: (selection: ShelfDisplaySelection) => void;
}) {
  const backdrop = getShelfBackdropStyle(config.backdropTone);
  const gapClass =
    config.spacing === 'junto'
      ? 'gap-1 sm:gap-1.5'
      : config.spacing === 'arejado'
      ? 'gap-3.5 sm:gap-4'
      : 'gap-2 sm:gap-2.5';

  if (rows.length === 0) {
    return (
      <div className="relative z-10">
        <div className="px-6 py-12 sm:py-14 text-center space-y-3">
          <div
            className="w-12 h-12 mx-auto rounded-full flex items-center justify-center shadow-inner border"
            style={{
              backgroundColor: backdrop.labelBg,
              borderColor: backdrop.labelBorder,
              color: backdrop.emptyTitle,
            }}
          >
            <Library className="w-5 h-5" />
          </div>
          <h3
            className="font-editorial text-xl sm:text-2xl font-semibold"
            style={{ color: backdrop.emptyTitle }}
          >
            {emptyTitle}
          </h3>
          <p
            className="text-xs sm:text-sm max-w-md mx-auto leading-relaxed"
            style={{ color: backdrop.emptyDesc }}
          >
            {emptyDesc}
          </p>
          {emptyAction && <div className="pt-1">{emptyAction}</div>}
        </div>
        <WoodenPlank woodTone={config.woodTone} />
      </div>
    );
  }

  return (
    <div className="relative z-10 divide-y divide-black/15">
      {rows.map((row) => (
        <div key={row.id} className="relative transition-all duration-300">
          {row.label && (
            <div className="px-4 sm:px-6 pt-3.5 pb-1 flex items-center justify-between">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{
                  background: backdrop.labelBg,
                  color: backdrop.labelText,
                  border: `1px solid ${backdrop.labelBorder}`,
                  boxShadow: '0 2px 5px rgba(0,0,0,0.18)',
                }}
              >
                <Sparkles className="w-2.5 h-2.5 opacity-80" />
                {row.label}
              </span>
            </div>
          )}
          <div
            className={`px-4 sm:px-6 pt-5 pb-0 flex items-end justify-start ${gapClass} min-h-[198px] overflow-x-auto sm:overflow-visible snap-x`}
          >
            {row.items.map((node) => (
              <PhysicalBookObject
                key={node.id}
                node={node}
                config={config}
                onClick={() => onSelect(node.selection)}
              />
            ))}
          </div>
          <WoodenPlank woodTone={config.woodTone} />
        </div>
      ))}
    </div>
  );
}

export function ShelfDetailModal({
  selection,
  reviews,
  allShelves,
  isOwner,
  onClose,
  onOpenWork,
  onOpenPostId,
  onUpdateMediaEntry,
  onRemoveMediaEntry,
  onUpdateShelfItem,
  onReorderShelfItem,
  onTransferShelfItem,
  onRemoveShelfItem,
}: {
  selection: ShelfDisplaySelection | null;
  reviews: MediaReviewEnriched[];
  allShelves: Shelf[];
  isOwner: boolean;
  onClose: () => void;
  onOpenWork?: (workId: string) => void;
  onOpenPostId?: (postId: string) => void;
  onUpdateMediaEntry: (
    entry: MediaShelfEntry,
    patch: { status?: BookShelfStatus | MovieShelfStatus | null; isFavorite?: boolean }
  ) => Promise<void>;
  onRemoveMediaEntry: (entry: MediaShelfEntry) => Promise<void>;
  onUpdateShelfItem?: (
    shelfId: string,
    itemId: string,
    patch: Partial<ShelfItem>
  ) => Promise<void>;
  onReorderShelfItem?: (
    shelfId: string,
    itemId: string,
    direction: -1 | 1
  ) => Promise<void>;
  onTransferShelfItem: (
    fromShelfId: string,
    toShelfId: string,
    item: ShelfItem
  ) => Promise<void>;
  onRemoveShelfItem: (shelfId: string, itemId: string) => Promise<void>;
}) {
  const [modalWork, setModalWork] = useState<CatalogWork | null>(null);
  const [modalPost, setModalPost] = useState<PostWithAuthor | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  // Inline editing state for custom shelf items
  const [editingCustom, setEditingCustom] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editCoverUrl, setEditCoverUrl] = useState('');
  const [editKind, setEditKind] = useState<ShelfItem['kind']>('livro');
  const [editNote, setEditNote] = useState('');

  const selectionKey =
    selection?.source === 'media'
      ? `m_${selection.entry.workId}`
      : selection?.source === 'shelf'
      ? `s_${selection.shelf.id}_${selection.item.id}`
      : null;

  useEffect(() => {
    setModalWork(null);
    setModalPost(null);
    setEditingCustom(false);
    if (!selection) return;

    if (selection.source === 'shelf') {
      setEditTitle(selection.item.title);
      setEditSubtitle(selection.item.subtitle || '');
      setEditYear(selection.item.year || '');
      setEditCoverUrl(selection.item.coverUrl || '');
      setEditKind(selection.item.kind);
      setEditNote(selection.item.note || '');
    }

    let cancelled = false;
    if (selection.source === 'media') {
      setLoadingDetails(true);
      api
        .getCatalogWork(selection.entry.workId)
        .then((res) => {
          if (!cancelled) setModalWork(res.work);
        })
        .catch(() => {
          if (!cancelled) setModalWork(null);
        })
        .finally(() => {
          if (!cancelled) setLoadingDetails(false);
        });
    } else if (selection.source === 'shelf' && selection.item.refId) {
      setLoadingDetails(true);
      api
        .getPost(selection.item.refId)
        .then((res) => {
          if (!cancelled) setModalPost(res.post);
        })
        .catch(() => {
          if (!cancelled) setModalPost(null);
        })
        .finally(() => {
          if (!cancelled) setLoadingDetails(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [selectionKey]);

  if (!selection) return null;

  if (selection.source === 'media') {
    const entry = selection.entry;
    const rev = reviews.find((r) => r.workId === entry.workId) || null;
    const isBook = entry.mediaKind === 'livro';
    const statusLabel = entry.status
      ? isBook
        ? BOOK_SHELF_LABELS[entry.status as BookShelfStatus]
        : MOVIE_SHELF_LABELS[entry.status as MovieShelfStatus]
      : null;

    return (
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 bg-[#241419]/65 backdrop-blur-sm flex items-center justify-center p-4 animate-page-enter"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="shelf-modal-title"
          className="bg-[#FFF9F5] text-[#493039] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#493039]/18 editorial-shadow"
        >
          <div className="sticky top-0 z-10 bg-[#FFF9F5]/95 backdrop-blur-xs px-6 py-4 border-b border-[#493039]/12 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#803C50]">
              {isBook ? <Library className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />}
              <span>
                {isBook
                  ? 'Livro na Minha Prateleira'
                  : entry.mediaKind === 'serie'
                  ? 'Série na Minha Prateleira'
                  : 'Filme na Minha Prateleira'}
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar detalhes"
              className="p-1.5 rounded-full hover:bg-[#F5E9E8] text-[#7B5A65] hover:text-[#493039] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-[175px_1fr] gap-6">
              <div className="w-44 sm:w-full mx-auto">
                <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-[#493039]/20 bg-[#F5E9E8] shadow-[10px_14px_26px_rgba(73,48,57,0.22)]">
                  <CatalogCover
                    src={modalWork?.coverUrl || entry.workSnapshot.coverUrl}
                    title={entry.workSnapshot.title}
                    creator={entry.workSnapshot.creator}
                    year={entry.workSnapshot.year}
                    mediaKind={entry.mediaKind}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#803C50] font-medium">
                  {statusLabel && <span>{statusLabel}</span>}
                  {!isBook && (
                    <AgeRatingBadge rating={modalWork?.ageRating || entry.workSnapshot.ageRating} />
                  )}
                  {entry.isFavorite && (
                    <span className="inline-flex items-center gap-1 text-[#B65B76]">
                      <Heart className="w-3 h-3 fill-current" />
                      Favorito
                    </span>
                  )}
                  {rev && (
                    <span className="inline-flex items-center gap-1 font-bold text-[#493039] tabular-nums">
                      <Star className="w-3.5 h-3.5 fill-current text-[#B65B76]" />
                      {rev.rating.toFixed(1)} / 10
                    </span>
                  )}
                </div>

                <h3
                  id="shelf-modal-title"
                  className="font-editorial text-2xl sm:text-3xl font-semibold text-[#493039] leading-tight"
                >
                  {entry.workSnapshot.title}
                </h3>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#7B5A65]">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#493039]">
                    <UserIcon className="w-3.5 h-3.5 text-[#B65B76]" />
                    {entry.workSnapshot.creator}
                  </span>
                  {entry.workSnapshot.year && (
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Calendar className="w-3.5 h-3.5 text-[#B65B76]" />
                      {entry.workSnapshot.year}
                    </span>
                  )}
                  {modalWork?.pageCount ? <span className="tabular-nums">{modalWork.pageCount} páginas</span> : null}
                  {modalWork?.publisher ? <span>{modalWork.publisher}</span> : null}
                </div>

                {entry.workSnapshot.genres?.length > 0 && (
                  <div className="text-[11px] text-[#7B5A65]">
                    {entry.workSnapshot.genres.join(' · ')}
                  </div>
                )}

                <div className="pt-2 border-t border-[#493039]/12 space-y-1.5">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#7B5A65]">
                    Sinopse
                  </h4>
                  {loadingDetails ? (
                    <p className="text-xs text-[#7B5A65] italic">
                      Carregando sinopse e detalhes…
                    </p>
                  ) : (
                    <p className="text-xs sm:text-sm leading-relaxed text-[#493039]/90 whitespace-pre-line">
                      {modalWork?.synopsis || 'Sinopse indisponível no momento.'}
                    </p>
                  )}
                </div>

                {rev?.review && (
                  <div className="rounded-2xl bg-[#F5E9E8] border border-[#D9B8C0] p-3.5 space-y-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#803C50]">
                      Sua resenha pessoal
                    </div>
                    <p className="text-xs text-[#493039] leading-relaxed">{rev.review}</p>
                  </div>
                )}
              </div>
            </div>

            {isOwner && (
              <div className="pt-4 border-t border-[#493039]/14 space-y-3">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-[#7B5A65]">
                  Organizar na prateleira
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isBook
                    ? BOOK_SHELF_ORDER.map((statusId) => {
                        const active = entry.status === statusId;
                        const Icon =
                          statusId === 'quero_ler'
                            ? Bookmark
                            : statusId === 'lendo'
                            ? BookOpen
                            : statusId === 'ja_li'
                            ? Check
                            : BookmarkX;
                        return (
                          <button
                            key={statusId}
                            type="button"
                            disabled={busyAction}
                            onClick={async () => {
                              setBusyAction(true);
                              try {
                                await onUpdateMediaEntry(entry, { status: statusId });
                              } finally {
                                setBusyAction(false);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border transition-colors cursor-pointer disabled:opacity-55 ${
                              active
                                ? 'bg-[#803C50] text-[#FFF9F5] border-[#803C50]'
                                : 'bg-[#F5E9E8] text-[#493039] border-[#D9B8C0] hover:border-[#B65B76]'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{BOOK_SHELF_LABELS[statusId]}</span>
                          </button>
                        );
                      })
                    : (['quero_assistir', 'ja_assistido'] as MovieShelfStatus[]).map(
                        (statusId) => {
                          const active = entry.status === statusId;
                          const Icon = statusId === 'quero_assistir' ? Clock : Check;
                          return (
                            <button
                              key={statusId}
                              type="button"
                              disabled={busyAction}
                              onClick={async () => {
                                setBusyAction(true);
                                try {
                                  await onUpdateMediaEntry(entry, { status: statusId });
                                } finally {
                                  setBusyAction(false);
                                }
                              }}
                              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border transition-colors cursor-pointer disabled:opacity-55 ${
                                active
                                  ? 'bg-[#803C50] text-[#FFF9F5] border-[#803C50]'
                                  : 'bg-[#F5E9E8] text-[#493039] border-[#D9B8C0] hover:border-[#B65B76]'
                              }`}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              <span>{MOVIE_SHELF_LABELS[statusId]}</span>
                            </button>
                          );
                        }
                      )}

                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={async () => {
                      setBusyAction(true);
                      try {
                        await onUpdateMediaEntry(entry, { isFavorite: !entry.isFavorite });
                      } finally {
                        setBusyAction(false);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border transition-colors cursor-pointer disabled:opacity-55 ${
                      entry.isFavorite
                        ? 'bg-[#B65B76] text-[#FFF9F5] border-[#B65B76]'
                        : 'bg-[#F5E9E8] text-[#493039] border-[#D9B8C0] hover:border-[#B65B76]'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${entry.isFavorite ? 'fill-current' : ''}`} />
                    <span>{entry.isFavorite ? 'Nos Favoritos' : 'Favoritar'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
              {isOwner ? (
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={async () => {
                    setBusyAction(true);
                    try {
                      onClose();
                      await onRemoveMediaEntry(entry);
                    } finally {
                      setBusyAction(false);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-[#F5E9E8] text-[#803C50] border border-[#D9B8C0] hover:bg-[#D9B8C0]/30 cursor-pointer disabled:opacity-55"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Retirar da estante</span>
                </button>
              ) : (
                <span />
              )}

              {onOpenWork && (
                <button
                  type="button"
                  onClick={() => {
                    const wid = entry.workId;
                    onClose();
                    onOpenWork(wid);
                  }}
                  className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#803C50] text-[#FFF9F5] text-xs font-semibold hover:bg-[#B65B76] cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir página da obra e avaliações</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Custom shelf item modal (Livros manuais, Animes, Filmes, Poemas, Artigos, etc.)
  const { shelf, item, index } = selection;
  const coverSrc = modalPost?.coverImage || item.coverUrl || '';
  const mappedKind: CatalogMediaKind =
    item.kind === 'filme' ? 'filme' : item.kind === 'serie' ? 'serie' : 'livro';

  async function handleSaveCustomEdit(e: FormEvent) {
    e.preventDefault();
    if (!onUpdateShelfItem || !editTitle.trim()) return;
    setBusyAction(true);
    try {
      await onUpdateShelfItem(shelf.id, item.id, {
        title: editTitle.trim(),
        subtitle: editSubtitle.trim(),
        year: editYear.trim(),
        coverUrl: editCoverUrl.trim(),
        kind: editKind,
        note: editNote.trim(),
      });
      setEditingCustom(false);
    } finally {
      setBusyAction(false);
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#241419]/65 backdrop-blur-sm flex items-center justify-center p-4 animate-page-enter"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="custom-shelf-modal-title"
        className="bg-[#FFF9F5] text-[#493039] w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-[#493039]/18 editorial-shadow"
      >
        <div className="sticky top-0 z-10 bg-[#FFF9F5]/95 backdrop-blur-xs px-6 py-4 border-b border-[#493039]/12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#803C50]">
            {item.kind === 'poema' ? (
              <Feather className="w-3.5 h-3.5" />
            ) : item.kind === 'artigo' || item.kind === 'publicacao' ? (
              <FileText className="w-3.5 h-3.5" />
            ) : (
              <Library className="w-3.5 h-3.5" />
            )}
            <span>
              {KIND_BADGE_LABELS[item.kind] || 'Obra'} · Estante “{shelf.title}”
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {isOwner && onUpdateShelfItem && (
              <button
                type="button"
                onClick={() => setEditingCustom((v) => !v)}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-[#F5E9E8] text-[#803C50] border border-[#D9B8C0] hover:border-[#B65B76] cursor-pointer"
              >
                <Pencil className="w-3 h-3" />
                <span>{editingCustom ? 'Cancelar edição' : 'Editar'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar detalhes"
              className="p-1.5 rounded-full hover:bg-[#F5E9E8] text-[#7B5A65] hover:text-[#493039] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {editingCustom ? (
            <form onSubmit={handleSaveCustomEdit} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#7B5A65] mb-1">Título</label>
                  <input
                    type="text"
                    required
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-3 py-2 text-sm text-[#493039]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#7B5A65] mb-1">Autor / Diretor / Estúdio</label>
                  <input
                    type="text"
                    value={editSubtitle}
                    onChange={(e) => setEditSubtitle(e.target.value)}
                    className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-3 py-2 text-sm text-[#493039]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#7B5A65] mb-1">Categoria</label>
                  <select
                    value={editKind}
                    onChange={(e) => setEditKind(e.target.value as ShelfItem['kind'])}
                    className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-3 py-2 text-sm text-[#493039]"
                  >
                    <option value="livro">Livro</option>
                    <option value="filme">Filme</option>
                    <option value="serie">Série</option>
                    <option value="anime">Anime</option>
                    <option value="poema">Poema</option>
                    <option value="artigo">Artigo / Ensaio</option>
                    <option value="fotografia">Fotografia</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#7B5A65] mb-1">Ano</label>
                  <input
                    type="text"
                    value={editYear}
                    onChange={(e) => setEditYear(e.target.value)}
                    placeholder="Ex.: 2024"
                    className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-3 py-2 text-sm text-[#493039]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#7B5A65] mb-1">URL da capa real (opcional)</label>
                  <input
                    type="text"
                    value={editCoverUrl}
                    onChange={(e) => setEditCoverUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] px-3 py-2 text-sm text-[#493039]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#7B5A65] mb-1">Notas pessoais</label>
                <textarea
                  rows={3}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  className="w-full rounded-xl bg-[#F5E9E8]/70 border border-[#D9B8C0] p-3 text-sm text-[#493039]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCustom(false)}
                  className="px-4 py-2 text-xs text-[#7B5A65] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={busyAction}
                  className="px-5 py-2 rounded-full bg-[#803C50] text-[#FFF9F5] text-xs font-semibold hover:bg-[#B65B76] cursor-pointer"
                >
                  {busyAction ? 'Salvando…' : 'Salvar informações'}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-[175px_1fr] gap-6">
              <div className="w-44 sm:w-full mx-auto">
                <div className="aspect-[2/3] rounded-2xl overflow-hidden border border-[#493039]/20 bg-[#F5E9E8] shadow-[10px_14px_26px_rgba(73,48,57,0.22)]">
                  {coverSrc ? (
                    <ImageWithFallback
                      src={coverSrc}
                      alt={item.title}
                      fallbackLabel={item.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <CatalogCover
                      src=""
                      title={item.title}
                      creator={item.subtitle || shelf.title}
                      year={item.year || ''}
                      mediaKind={mappedKind}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#803C50] font-medium">
                  <span>{KIND_BADGE_LABELS[item.kind] || 'Obra'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{shelf.title}</span>
                  {item.year && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{item.year}</span>
                    </>
                  )}
                  {item.isFavorite && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 text-[#B65B76]">
                        <Heart className="w-3 h-3 fill-current" />
                        Favorito
                      </span>
                    </>
                  )}
                </div>

                <h3
                  id="custom-shelf-modal-title"
                  className="font-editorial text-2xl sm:text-3xl font-semibold text-[#493039] leading-tight"
                >
                  {item.title}
                </h3>

                {(item.subtitle || modalPost?.author.displayName) && (
                  <p className="text-xs font-medium text-[#7B5A65] flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-[#B65B76]" />
                    <span>{item.subtitle || modalPost?.author.displayName}</span>
                  </p>
                )}

                {loadingDetails ? (
                  <p className="text-xs text-[#7B5A65] italic">
                    Carregando texto completo…
                  </p>
                ) : modalPost ? (
                  <div className="pt-2 border-t border-[#493039]/12 space-y-2">
                    {modalPost.subtitle && (
                      <p className="font-literary text-sm text-[#7B5A65] italic">
                        {modalPost.subtitle}
                      </p>
                    )}
                    <div
                      className={`rounded-2xl bg-[#F5E9E8]/70 border border-[#D9B8C0] p-4 max-h-56 overflow-y-auto text-sm text-[#493039] leading-relaxed whitespace-pre-line ${
                        modalPost.type === 'poema' ? 'font-literary italic text-center' : 'font-literary'
                      }`}
                    >
                      {modalPost.content}
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-[#493039]/12 space-y-1.5">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-[#7B5A65]">
                      Detalhes e anotações
                    </h4>
                    <p className="text-xs sm:text-sm leading-relaxed text-[#493039]/90 whitespace-pre-line">
                      {item.note ||
                        shelf.description ||
                        'Obra guardada pessoalmente nesta prateleira.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {isOwner && !editingCustom && (
            <div className="pt-4 border-t border-[#493039]/14 flex flex-wrap items-center gap-3">
              {onUpdateShelfItem && (
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={async () => {
                    setBusyAction(true);
                    try {
                      await onUpdateShelfItem(shelf.id, item.id, {
                        isFavorite: !item.isFavorite,
                      });
                    } finally {
                      setBusyAction(false);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                    item.isFavorite
                      ? 'bg-[#B65B76] text-[#FFF9F5] border-[#B65B76]'
                      : 'bg-[#F5E9E8] text-[#493039] border-[#D9B8C0] hover:border-[#B65B76]'
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-current' : ''}`} />
                  <span>{item.isFavorite ? 'Nos Favoritos' : 'Marcar como favorito'}</span>
                </button>
              )}

              {onReorderShelfItem && shelf.items.length > 1 && (
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={busyAction || index <= 0}
                    onClick={async () => {
                      setBusyAction(true);
                      try {
                        await onReorderShelfItem(shelf.id, item.id, -1);
                      } finally {
                        setBusyAction(false);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs bg-[#F5E9E8] border border-[#D9B8C0] text-[#493039] disabled:opacity-35 cursor-pointer"
                    title="Mover para a esquerda na estante"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Esquerda</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyAction || index >= shelf.items.length - 1}
                    onClick={async () => {
                      setBusyAction(true);
                      try {
                        await onReorderShelfItem(shelf.id, item.id, 1);
                      } finally {
                        setBusyAction(false);
                      }
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-full text-xs bg-[#F5E9E8] border border-[#D9B8C0] text-[#493039] disabled:opacity-35 cursor-pointer"
                    title="Mover para a direita na estante"
                  >
                    <span>Direita</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {allShelves.length > 1 && (
                <div className="inline-flex items-center gap-2">
                  <ArrowRightLeft className="w-3.5 h-3.5 text-[#803C50]" />
                  <select
                    aria-label="Mover obra para outra prateleira"
                    disabled={busyAction}
                    value={shelf.id}
                    onChange={async (e) => {
                      const targetId = e.target.value;
                      if (!targetId || targetId === shelf.id) return;
                      setBusyAction(true);
                      try {
                        onClose();
                        await onTransferShelfItem(shelf.id, targetId, item);
                      } finally {
                        setBusyAction(false);
                      }
                    }}
                    className="rounded-full bg-[#F5E9E8] border border-[#D9B8C0] px-3.5 py-2 text-xs font-medium text-[#493039] cursor-pointer"
                  >
                    {allShelves.map((s) => (
                      <option key={s.id} value={s.id}>
                        Mover para: {s.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            {isOwner ? (
              <button
                type="button"
                disabled={busyAction}
                onClick={async () => {
                  setBusyAction(true);
                  try {
                    onClose();
                    await onRemoveShelfItem(shelf.id, item.id);
                  } finally {
                    setBusyAction(false);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium bg-[#F5E9E8] text-[#803C50] border border-[#D9B8C0] hover:bg-[#D9B8C0]/30 cursor-pointer disabled:opacity-55"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Retirar da estante</span>
              </button>
            ) : (
              <span />
            )}

            {item.refId && onOpenPostId && (
              <button
                type="button"
                onClick={() => {
                  const pid = item.refId!;
                  onClose();
                  onOpenPostId(pid);
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#803C50] text-[#FFF9F5] text-xs font-semibold hover:bg-[#B65B76] cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir publicação completa</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function WoodenCustomShelf({
  shelf,
  idx,
  totalShelves,
  isOwner,
  canReorder,
  shelfConfig = DEFAULT_SHELF_CONFIG,
  onMoveShelf,
  onToggleVisibility,
  onRenameShelf,
  onDeleteShelf,
  onAddItem,
  onSelectItem,
}: {
  shelf: Shelf;
  idx: number;
  totalShelves: number;
  isOwner: boolean;
  canReorder: boolean;
  shelfConfig?: ShelfVisualConfig;
  onMoveShelf: (idx: number, dir: -1 | 1) => void;
  onToggleVisibility: (shelf: Shelf) => void;
  onRenameShelf?: (shelf: Shelf, nextTitle: string) => Promise<void>;
  onDeleteShelf: (shelfId: string) => void;
  onAddItem: (shelf: Shelf) => void;
  onSelectItem: (selection: ShelfDisplaySelection) => void;
}) {
  const cabinetRef = useRef<HTMLDivElement | null>(null);
  const cabinetWidth = useContainerWidth(cabinetRef, 480);
  const [renaming, setRenaming] = useState(false);
  const [titleDraft, setTitleDraft] = useState(shelf.title);

  useEffect(() => {
    setTitleDraft(shelf.title);
  }, [shelf.title]);

  const nodes: UnifiedSpineNode[] = useMemo(
    () =>
      shelf.items.map((item, itemIdx) => ({
        id: item.id,
        title: item.title,
        author: item.subtitle || '',
        year: item.year,
        kind: item.kind,
        coverUrl: item.coverUrl,
        badgeText: KIND_BADGE_LABELS[item.kind] || shelf.title,
        isFavorite: item.isFavorite,
        rating: item.rating,
        selection: { source: 'shelf', shelf, item, index: itemIdx },
      })),
    [shelf]
  );

  const rows = useMemo(
    () => chunkVolumesIntoRows(nodes, cabinetWidth, `custom_${shelf.id}`, shelfConfig),
    [nodes, cabinetWidth, shelf.id, shelfConfig]
  );

  return (
    <div className="space-y-2.5">
      {/* Shelf Plaque Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="min-w-0 flex-1">
          {renaming && isOwner && onRenameShelf ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!titleDraft.trim()) return;
                await onRenameShelf(shelf, titleDraft.trim());
                setRenaming(false);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                autoFocus
                className="rounded-xl bg-[#FFF9F5] border border-[#D9B8C0] px-2.5 py-1 text-sm font-editorial font-semibold text-[#493039]"
              />
              <button
                type="submit"
                className="px-2.5 py-1 rounded-full bg-[#803C50] text-[#FFF9F5] text-[11px] font-medium cursor-pointer"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => {
                  setTitleDraft(shelf.title);
                  setRenaming(false);
                }}
                className="text-[11px] opacity-70 cursor-pointer"
              >
                Cancelar
              </button>
            </form>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-editorial text-xl font-semibold truncate">
                {shelf.title}
              </h3>
              {isOwner && onRenameShelf && (
                <button
                  type="button"
                  onClick={() => setRenaming(true)}
                  title="Renomear coleção"
                  className="p-1 rounded-full opacity-65 hover:opacity-100 cursor-pointer"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
              <span className="text-[11px] opacity-75 inline-flex items-center gap-1 shrink-0 tabular-nums">
                {shelf.isPublic ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                {shelf.isPublic ? 'Pública' : 'Privada'} · {shelf.items.length}
              </span>
            </div>
          )}
          {shelf.description && (
            <p className="text-xs opacity-75 line-clamp-1">{shelf.description}</p>
          )}
        </div>

        {isOwner && (
          <div className="flex items-center gap-1 shrink-0">
            {canReorder && (
              <>
                <button
                  type="button"
                  onClick={() => onMoveShelf(idx, -1)}
                  disabled={idx === 0}
                  className="p-1.5 rounded-full hover:bg-black/5 disabled:opacity-25 cursor-pointer"
                  title="Mover antes"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onMoveShelf(idx, 1)}
                  disabled={idx === totalShelves - 1}
                  className="p-1.5 rounded-full hover:bg-black/5 disabled:opacity-25 cursor-pointer"
                  title="Mover depois"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onToggleVisibility(shelf)}
              className="p-1.5 rounded-full hover:bg-black/5 cursor-pointer"
              title="Alternar pública/privada"
            >
              {shelf.isPublic ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => onAddItem(shelf)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border border-current/20 text-[11px] font-medium hover:border-current/45 cursor-pointer"
              title="Adicionar obra à prateleira"
            >
              <Plus className="w-3 h-3" />
              <span>Adicionar</span>
            </button>
            <button
              type="button"
              onClick={() => onDeleteShelf(shelf.id)}
              className="p-1.5 rounded-full hover:bg-black/5 cursor-pointer"
              title="Remover prateleira"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 3D Wooden Cabinet */}
      <WoodenCabinetFrame cabinetRef={cabinetRef} config={shelfConfig}>
        <ShelfRowsRenderer
          rows={rows}
          config={shelfConfig}
          emptyTitle={`Prateleira “${shelf.title}” vazia`}
          emptyDesc="Adicione obras reais ou salve publicações da Thinklive para preencher esta prateleira."
          emptyAction={
            isOwner ? (
              <button
                type="button"
                onClick={() => onAddItem(shelf)}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#B65B76] text-[#FFF9F5] text-xs font-semibold hover:bg-[#803C50] cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar obra</span>
              </button>
            ) : undefined
          }
          onSelect={onSelectItem}
        />
      </WoodenCabinetFrame>
    </div>
  );
}

export function RealisticBookshelf({
  entries,
  reviews,
  shelves,
  isOwner,
  shelfConfig: propShelfConfig,
  onSaveShelfConfig,
  onOpenWork,
  onOpenPostId,
  onOpenBooks,
  onOpenMovies,
  onUpdateMediaEntry,
  onRemoveMediaEntry,
  onUpdateShelfItem,
  onReorderShelfItem,
  onRemoveShelfItem,
  onTransferShelfItem,
  onQuickAddKind,
}: RealisticBookshelfProps) {
  const [domainTab, setDomainTab] = useState<LibraryDomainTab>('livros');
  const [bookFilter, setBookFilter] = useState<BookFilterTab>('todas');
  const [movieFilter, setMovieFilter] = useState<MovieFilterTab>('todas');
  const [selection, setSelection] = useState<ShelfDisplaySelection | null>(null);
  const [showShelfCustomizer, setShowShelfCustomizer] = useState(false);
  const [editingCategoryLabel, setEditingCategoryLabel] = useState(false);
  const [categoryLabelDraft, setCategoryLabelDraft] = useState('');

  const activeConfig: ShelfVisualConfig = useMemo(
    () => ({
      ...DEFAULT_SHELF_CONFIG,
      ...(propShelfConfig || {}),
      categoryLabels: {
        ...DEFAULT_SHELF_CONFIG.categoryLabels,
        ...(propShelfConfig?.categoryLabels || {}),
      },
    }),
    [propShelfConfig]
  );

  const cabinetRef = useRef<HTMLDivElement | null>(null);
  const cabinetWidth = useContainerWidth(cabinetRef, 760);

  const bookEntries = useMemo(
    () => deduplicateBookShelves(entries.filter((e) => e.mediaKind === 'livro')),
    [entries]
  );

  const movieEntries = useMemo(() => {
    const seen = new Set<string>();
    return entries.filter((e) => {
      if (e.mediaKind !== 'filme') return false;
      if (!e.status && !e.isFavorite) return false;
      if (isAnimeMediaEntry(e)) return false;
      if (seen.has(e.workId)) return false;
      seen.add(e.workId);
      return true;
    });
  }, [entries]);

  const seriesEntries = useMemo(() => {
    const seen = new Set<string>();
    return entries.filter((e) => {
      if (e.mediaKind !== 'serie') return false;
      if (!e.status && !e.isFavorite) return false;
      if (isAnimeMediaEntry(e)) return false;
      if (seen.has(e.workId)) return false;
      seen.add(e.workId);
      return true;
    });
  }, [entries]);

  const animeMediaEntries = useMemo(() => {
    const seen = new Set<string>();
    return entries.filter((e) => {
      if (!isAnimeMediaEntry(e)) return false;
      if (!e.status && !e.isFavorite) return false;
      if (seen.has(e.workId)) return false;
      seen.add(e.workId);
      return true;
    });
  }, [entries]);

  const poemShelfPairs = useMemo(() => {
    const seen = new Set<string>();
    const list: { shelf: Shelf; item: ShelfItem; index: number }[] = [];
    shelves.forEach((shelf) => {
      shelf.items.forEach((item, index) => {
        if (!isPoemShelfItem(shelf, item)) return;
        const key = `${item.refId || item.title.toLowerCase().trim()}`;
        if (seen.has(key)) return;
        seen.add(key);
        list.push({ shelf, item, index });
      });
    });
    return list;
  }, [shelves]);

  const articleShelfPairs = useMemo(() => {
    const seen = new Set<string>();
    const list: { shelf: Shelf; item: ShelfItem; index: number }[] = [];
    shelves.forEach((shelf) => {
      shelf.items.forEach((item, index) => {
        if (!isArticleShelfItem(shelf, item)) return;
        const key = `${item.refId || item.title.toLowerCase().trim()}`;
        if (seen.has(key)) return;
        seen.add(key);
        list.push({ shelf, item, index });
      });
    });
    return list;
  }, [shelves]);

  const manualBookShelfPairs = useMemo(() => {
    const mediaKeys = new Set(bookEntries.map((b) => b.workSnapshot.title.toLowerCase().trim()));
    const list: { shelf: Shelf; item: ShelfItem; index: number }[] = [];
    shelves.forEach((shelf) => {
      shelf.items.forEach((item, index) => {
        if (item.kind !== 'livro') return;
        if (mediaKeys.has(item.title.toLowerCase().trim())) return;
        list.push({ shelf, item, index });
      });
    });
    return list;
  }, [shelves, bookEntries]);

  const manualMovieShelfPairs = useMemo(() => {
    const mediaKeys = new Set(movieEntries.map((m) => m.workSnapshot.title.toLowerCase().trim()));
    const list: { shelf: Shelf; item: ShelfItem; index: number }[] = [];
    shelves.forEach((shelf) => {
      shelf.items.forEach((item, index) => {
        if (item.kind !== 'filme') return;
        if (mediaKeys.has(item.title.toLowerCase().trim())) return;
        list.push({ shelf, item, index });
      });
    });
    return list;
  }, [shelves, movieEntries]);

  const manualSeriesShelfPairs = useMemo(() => {
    const mediaKeys = new Set(seriesEntries.map((m) => m.workSnapshot.title.toLowerCase().trim()));
    const list: { shelf: Shelf; item: ShelfItem; index: number }[] = [];
    shelves.forEach((shelf) => {
      shelf.items.forEach((item, index) => {
        if (item.kind !== 'serie') return;
        if (mediaKeys.has(item.title.toLowerCase().trim())) return;
        list.push({ shelf, item, index });
      });
    });
    return list;
  }, [shelves, seriesEntries]);

  const manualAnimeShelfPairs = useMemo(() => {
    const mediaKeys = new Set(animeMediaEntries.map((m) => m.workSnapshot.title.toLowerCase().trim()));
    const list: { shelf: Shelf; item: ShelfItem; index: number }[] = [];
    shelves.forEach((shelf) => {
      shelf.items.forEach((item, index) => {
        if (item.kind !== 'anime') return;
        if (mediaKeys.has(item.title.toLowerCase().trim())) return;
        list.push({ shelf, item, index });
      });
    });
    return list;
  }, [shelves, animeMediaEntries]);

  const customFavoritePairs = useMemo(() => {
    const list: { shelf: Shelf; item: ShelfItem; index: number }[] = [];
    shelves.forEach((shelf) => {
      shelf.items.forEach((item, index) => {
        if (item.isFavorite) list.push({ shelf, item, index });
      });
    });
    return list;
  }, [shelves]);

  // Keep selection synced after updates/removals
  useEffect(() => {
    if (!selection) return;
    if (selection.source === 'media') {
      const updated = entries.find((e) => e.workId === selection.entry.workId) || null;
      setSelection(updated ? { source: 'media', entry: updated } : null);
    } else {
      const updatedShelf = shelves.find((s) => s.id === selection.shelf.id);
      const updatedIdx = updatedShelf?.items.findIndex((i) => i.id === selection.item.id) ?? -1;
      const updatedItem = updatedIdx >= 0 ? updatedShelf?.items[updatedIdx] : undefined;
      setSelection(
        updatedShelf && updatedItem
          ? { source: 'shelf', shelf: updatedShelf, item: updatedItem, index: updatedIdx }
          : null
      );
    }
  }, [entries, shelves]);

  const bookToNode = (entry: MediaShelfEntry): UnifiedSpineNode => ({
    id: entry.workId,
    title: entry.workSnapshot.title,
    author: entry.workSnapshot.creator,
    year: entry.workSnapshot.year,
    kind: 'livro',
    coverUrl: entry.workSnapshot.coverUrl,
    badgeText: entry.status
      ? BOOK_SHELF_LABELS[entry.status as BookShelfStatus]
      : 'Favorito',
    statusRibbon: entry.status === 'lendo',
    isFavorite: entry.isFavorite,
    rating: reviews.find((r) => r.workId === entry.workId)?.rating,
    selection: { source: 'media', entry },
  });

  const movieToNode = (entry: MediaShelfEntry): UnifiedSpineNode => ({
    id: entry.workId,
    title: entry.workSnapshot.title,
    author: entry.workSnapshot.year || entry.workSnapshot.creator,
    year: entry.workSnapshot.year,
    kind: isAnimeMediaEntry(entry) ? 'anime' : entry.mediaKind,
    coverUrl: entry.workSnapshot.coverUrl,
    badgeText: entry.status
      ? MOVIE_SHELF_LABELS[entry.status as MovieShelfStatus]
      : 'Favorito',
    statusRibbon: entry.status === 'quero_assistir',
    isFavorite: entry.isFavorite,
    rating: reviews.find((r) => r.workId === entry.workId)?.rating,
    selection: { source: 'media', entry },
  });

  const shelfPairToNode = (pair: { shelf: Shelf; item: ShelfItem; index: number }): UnifiedSpineNode => ({
    id: pair.item.id,
    title: pair.item.title,
    author: pair.item.subtitle || pair.shelf.title,
    year: pair.item.year,
    kind: pair.item.kind,
    coverUrl: pair.item.coverUrl,
    badgeText: KIND_BADGE_LABELS[pair.item.kind] || pair.shelf.title,
    isFavorite: pair.item.isFavorite,
    rating: pair.item.rating,
    selection: { source: 'shelf', shelf: pair.shelf, item: pair.item, index: pair.index },
  });

  const labels = {
    livros: activeConfig.categoryLabels?.livros || 'Meus livros',
    filmes: activeConfig.categoryLabels?.filmes || 'Filmes',
    series: activeConfig.categoryLabels?.series || 'Séries',
    animes: activeConfig.categoryLabels?.animes || 'Animes',
    favoritos: activeConfig.categoryLabels?.favoritos || 'Favoritos',
    poemas: activeConfig.categoryLabels?.poemas || 'Poemas',
    artigos: activeConfig.categoryLabels?.artigos || 'Artigos',
  };

  const shelfRows = useMemo<WoodenRow[]>(() => {
    if (domainTab === 'livros') {
      if (bookFilter === 'todas') {
        const rows: WoodenRow[] = [];
        const cats: { id: BookShelfStatus; label: string }[] = [
          { id: 'lendo', label: 'Lendo Atualmente' },
          { id: 'quero_ler', label: 'Quero Ler' },
          { id: 'ja_li', label: 'Já Li' },
          { id: 'abandonado', label: 'Abandonados' },
        ];
        cats.forEach((cat) => {
          const list = bookEntries.filter((e) => e.status === cat.id).map(bookToNode);
          rows.push(
            ...chunkVolumesIntoRows(
              list,
              cabinetWidth,
              `book_${cat.id}`,
              activeConfig,
              `${cat.label} (${list.length})`
            )
          );
        });
        const favOnly = bookEntries.filter((e) => !e.status && e.isFavorite).map(bookToNode);
        rows.push(
          ...chunkVolumesIntoRows(
            favOnly,
            cabinetWidth,
            'book_fav_only',
            activeConfig,
            `Favoritos (${favOnly.length})`
          )
        );
        if (manualBookShelfPairs.length > 0) {
          rows.push(
            ...chunkVolumesIntoRows(
              manualBookShelfPairs.map(shelfPairToNode),
              cabinetWidth,
              'book_manual',
              activeConfig,
              `${labels.livros} adicionados (${manualBookShelfPairs.length})`
            )
          );
        }
        return rows;
      }

      const filtered =
        bookFilter === 'favoritos'
          ? bookEntries.filter((e) => e.isFavorite)
          : bookEntries.filter((e) => e.status === bookFilter);
      const label =
        bookFilter === 'favoritos'
          ? `Favoritos (${filtered.length})`
          : `${BOOK_SHELF_LABELS[bookFilter]} (${filtered.length})`;
      return chunkVolumesIntoRows(
        filtered.map(bookToNode),
        cabinetWidth,
        `book_filter_${bookFilter}`,
        activeConfig,
        label
      );
    }

    if (domainTab === 'filmes' || domainTab === 'series') {
      const targetList = domainTab === 'filmes' ? movieEntries : seriesEntries;
      const manualList = domainTab === 'filmes' ? manualMovieShelfPairs : manualSeriesShelfPairs;
      const sectionTitle = domainTab === 'filmes' ? labels.filmes : labels.series;

      if (movieFilter === 'todas') {
        const rows: WoodenRow[] = [];
        const want = targetList.filter((e) => e.status === 'quero_assistir').map(movieToNode);
        const watched = targetList.filter((e) => e.status === 'ja_assistido').map(movieToNode);
        const favOnly = targetList.filter((e) => !e.status && e.isFavorite).map(movieToNode);
        rows.push(
          ...chunkVolumesIntoRows(
            want,
            cabinetWidth,
            `${domainTab}_want`,
            activeConfig,
            `Quero assistir (${want.length})`
          )
        );
        rows.push(
          ...chunkVolumesIntoRows(
            watched,
            cabinetWidth,
            `${domainTab}_watched`,
            activeConfig,
            `Já assisti (${watched.length})`
          )
        );
        rows.push(
          ...chunkVolumesIntoRows(
            favOnly,
            cabinetWidth,
            `${domainTab}_fav`,
            activeConfig,
            `Favoritos (${favOnly.length})`
          )
        );
        if (manualList.length > 0) {
          rows.push(
            ...chunkVolumesIntoRows(
              manualList.map(shelfPairToNode),
              cabinetWidth,
              `${domainTab}_manual`,
              activeConfig,
              `${sectionTitle} na estante (${manualList.length})`
            )
          );
        }
        return rows;
      }

      const filtered =
        movieFilter === 'favoritos'
          ? targetList.filter((e) => e.isFavorite)
          : targetList.filter((e) => e.status === movieFilter);
      const label =
        movieFilter === 'favoritos'
          ? `Favoritos (${filtered.length})`
          : `${MOVIE_SHELF_LABELS[movieFilter]} (${filtered.length})`;
      return chunkVolumesIntoRows(
        filtered.map(movieToNode),
        cabinetWidth,
        `${domainTab}_filter_${movieFilter}`,
        activeConfig,
        label
      );
    }

    if (domainTab === 'animes') {
      const combined = [
        ...animeMediaEntries.map(movieToNode),
        ...manualAnimeShelfPairs.map(shelfPairToNode),
      ];
      return chunkVolumesIntoRows(
        combined,
        cabinetWidth,
        'animes',
        activeConfig,
        `${labels.animes} (${combined.length})`
      );
    }

    if (domainTab === 'favoritos') {
      const favBooks = bookEntries.filter((e) => e.isFavorite).map(bookToNode);
      const favMovies = [...movieEntries, ...seriesEntries, ...animeMediaEntries]
        .filter((e) => e.isFavorite)
        .map(movieToNode);
      const favCustom = customFavoritePairs.map(shelfPairToNode);
      const rows: WoodenRow[] = [];
      rows.push(
        ...chunkVolumesIntoRows(
          favBooks,
          cabinetWidth,
          'fav_books',
          activeConfig,
          `Livros favoritos (${favBooks.length})`
        )
      );
      rows.push(
        ...chunkVolumesIntoRows(
          favMovies,
          cabinetWidth,
          'fav_movies',
          activeConfig,
          `Cinema, séries & animes favoritos (${favMovies.length})`
        )
      );
      rows.push(
        ...chunkVolumesIntoRows(
          favCustom,
          cabinetWidth,
          'fav_custom',
          activeConfig,
          `Outras obras favoritas (${favCustom.length})`
        )
      );
      return rows;
    }

    if (domainTab === 'poemas') {
      return chunkVolumesIntoRows(
        poemShelfPairs.map(shelfPairToNode),
        cabinetWidth,
        'poemas',
        activeConfig,
        `${labels.poemas} (${poemShelfPairs.length})`
      );
    }

    if (domainTab === 'artigos') {
      return chunkVolumesIntoRows(
        articleShelfPairs.map(shelfPairToNode),
        cabinetWidth,
        'artigos',
        activeConfig,
        `${labels.artigos} (${articleShelfPairs.length})`
      );
    }

    // 'todas' — unified American library showcase
    const allRows: WoodenRow[] = [];
    const allBooks = [...bookEntries.map(bookToNode), ...manualBookShelfPairs.map(shelfPairToNode)];
    const allMovies = [...movieEntries.map(movieToNode), ...manualMovieShelfPairs.map(shelfPairToNode)];
    const allSeries = [...seriesEntries.map(movieToNode), ...manualSeriesShelfPairs.map(shelfPairToNode)];
    const allAnimes = [...animeMediaEntries.map(movieToNode), ...manualAnimeShelfPairs.map(shelfPairToNode)];
    const allPoems = poemShelfPairs.map(shelfPairToNode);
    const allArticles = articleShelfPairs.map(shelfPairToNode);

    allRows.push(
      ...chunkVolumesIntoRows(allBooks, cabinetWidth, 'all_books', activeConfig, `${labels.livros} (${allBooks.length})`)
    );
    allRows.push(
      ...chunkVolumesIntoRows(allMovies, cabinetWidth, 'all_movies', activeConfig, `${labels.filmes} (${allMovies.length})`)
    );
    allRows.push(
      ...chunkVolumesIntoRows(allSeries, cabinetWidth, 'all_series', activeConfig, `${labels.series} (${allSeries.length})`)
    );
    allRows.push(
      ...chunkVolumesIntoRows(allAnimes, cabinetWidth, 'all_animes', activeConfig, `${labels.animes} (${allAnimes.length})`)
    );
    allRows.push(
      ...chunkVolumesIntoRows(allPoems, cabinetWidth, 'all_poems', activeConfig, `${labels.poemas} (${allPoems.length})`)
    );
    allRows.push(
      ...chunkVolumesIntoRows(allArticles, cabinetWidth, 'all_articles', activeConfig, `${labels.artigos} (${allArticles.length})`)
    );
    return allRows;
  }, [
    domainTab,
    bookFilter,
    movieFilter,
    bookEntries,
    movieEntries,
    seriesEntries,
    animeMediaEntries,
    poemShelfPairs,
    articleShelfPairs,
    manualBookShelfPairs,
    manualMovieShelfPairs,
    manualSeriesShelfPairs,
    manualAnimeShelfPairs,
    customFavoritePairs,
    cabinetWidth,
    reviews,
    activeConfig,
    labels,
  ]);

  const totalBooksCount = bookEntries.length + manualBookShelfPairs.length;
  const totalMoviesCount = movieEntries.length + manualMovieShelfPairs.length;
  const totalSeriesCount = seriesEntries.length + manualSeriesShelfPairs.length;
  const totalAnimesCount = animeMediaEntries.length + manualAnimeShelfPairs.length;
  const totalFavoritesCount =
    bookEntries.filter((e) => e.isFavorite).length +
    movieEntries.filter((e) => e.isFavorite).length +
    seriesEntries.filter((e) => e.isFavorite).length +
    animeMediaEntries.filter((e) => e.isFavorite).length +
    customFavoritePairs.length;
  const totalPoemsCount = poemShelfPairs.length;
  const totalArticlesCount = articleShelfPairs.length;

  const emptyConfig = (() => {
    if (domainTab === 'livros') {
      return {
        title:
          totalBooksCount === 0
            ? 'A estante de livros aguarda o primeiro volume'
            : 'Nenhum livro nesta categoria',
        desc:
          totalBooksCount === 0
            ? 'Adicione suas leituras reais em Quero Ler, Lendo Atualmente ou Já Li para vê-las com capas na estante.'
            : 'Mude o filtro acima ou transfira qualquer livro para esta prateleira.',
        action:
          isOwner && totalBooksCount === 0 ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {onQuickAddKind && (
                <button
                  type="button"
                  onClick={() => onQuickAddKind('livro')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#B65B76] text-[#FFF9F5] text-xs font-semibold hover:bg-[#803C50] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar livro</span>
                </button>
              )}
              {onOpenBooks && (
                <button
                  type="button"
                  onClick={onOpenBooks}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FFF9F5] text-[#493039] text-xs font-semibold cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>Explorar catálogo</span>
                </button>
              )}
            </div>
          ) : null,
      };
    }
    if (domainTab === 'filmes' || domainTab === 'series') {
      const label = domainTab === 'filmes' ? 'filmes' : 'séries';
      return {
        title: `Estante de ${label} vazia`,
        desc: `Adicione ${label} reais em Quero assistir, Já assisti ou Favoritos para vê-los com pôsteres na prateleira.`,
        action:
          isOwner ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {onQuickAddKind && (
                <button
                  type="button"
                  onClick={() => onQuickAddKind(domainTab === 'filmes' ? 'filme' : 'serie')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#B65B76] text-[#FFF9F5] text-xs font-semibold hover:bg-[#803C50] cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{domainTab === 'filmes' ? 'Adicionar filme' : 'Adicionar série'}</span>
                </button>
              )}
              {onOpenMovies && (
                <button
                  type="button"
                  onClick={onOpenMovies}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#FFF9F5] text-[#493039] text-xs font-semibold cursor-pointer"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Explorar Filmes & Séries</span>
                </button>
              )}
            </div>
          ) : null,
      };
    }
    if (domainTab === 'animes') {
      return {
        title: 'Estante de animes vazia',
        desc: 'Adicione seus animes favoritos com capa real e anotações pessoais para organizar nesta prateleira.',
        action:
          isOwner && onQuickAddKind ? (
            <button
              type="button"
              onClick={() => onQuickAddKind('anime')}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#B65B76] text-[#FFF9F5] text-xs font-semibold hover:bg-[#803C50] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar anime</span>
            </button>
          ) : null,
      };
    }
    if (domainTab === 'favoritos') {
      return {
        title: 'Nenhum favorito na estante ainda',
        desc: 'Marque livros, filmes, séries ou obras como favoritos para reunir sua seleção especial aqui.',
        action: null,
      };
    }
    if (domainTab === 'poemas') {
      return {
        title: 'Estante de poemas vazia',
        desc: 'Guarde poemas da comunidade usando “+ Guardar na estante” ou adicione um poema manualmente.',
        action:
          isOwner && onQuickAddKind ? (
            <button
              type="button"
              onClick={() => onQuickAddKind('poema')}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#B65B76] text-[#FFF9F5] text-xs font-semibold hover:bg-[#803C50] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar poema à prateleira</span>
            </button>
          ) : null,
      };
    }
    if (domainTab === 'artigos') {
      return {
        title: 'Estante de artigos vazia',
        desc: 'Guarde artigos e ensaios usando “+ Guardar na estante” durante a leitura ou adicione manualmente.',
        action:
          isOwner && onQuickAddKind ? (
            <button
              type="button"
              onClick={() => onQuickAddKind('artigo')}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#B65B76] text-[#FFF9F5] text-xs font-semibold hover:bg-[#803C50] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar artigo à prateleira</span>
            </button>
          ) : null,
      };
    }
    return {
      title: 'Sua biblioteca pessoal está vazia',
      desc: 'Adicione livros, filmes, séries, animes, poemas ou artigos reais para preencher sua estante de madeira.',
      action:
        isOwner && onOpenBooks ? (
          <button
            type="button"
            onClick={onOpenBooks}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#B65B76] text-[#FFF9F5] text-xs font-semibold hover:bg-[#803C50] cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Explorar biblioteca</span>
          </button>
        ) : null,
    };
  })();

  const editableCategoryKey =
    domainTab !== 'todas' ? (domainTab as keyof NonNullable<ShelfVisualConfig['categoryLabels']>) : null;

  async function updateConfig(partial: Partial<ShelfVisualConfig>) {
    if (!onSaveShelfConfig) return;
    await onSaveShelfConfig({
      ...activeConfig,
      ...partial,
      categoryLabels: {
        ...activeConfig.categoryLabels,
        ...(partial.categoryLabels || {}),
      },
    });
  }

  return (
    <div className="space-y-4">
      {/* Main Estante Category Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'livros' as LibraryDomainTab, label: `${labels.livros} (${totalBooksCount})` },
            { id: 'filmes' as LibraryDomainTab, label: `${labels.filmes} (${totalMoviesCount})` },
            { id: 'series' as LibraryDomainTab, label: `${labels.series} (${totalSeriesCount})` },
            { id: 'animes' as LibraryDomainTab, label: `${labels.animes} (${totalAnimesCount})` },
            { id: 'favoritos' as LibraryDomainTab, label: `${labels.favoritos} (${totalFavoritesCount})` },
            { id: 'poemas' as LibraryDomainTab, label: `${labels.poemas} (${totalPoemsCount})` },
            { id: 'artigos' as LibraryDomainTab, label: `${labels.artigos} (${totalArticlesCount})` },
            { id: 'todas' as LibraryDomainTab, label: 'Biblioteca completa' },
          ].map((tab) => {
            const active = domainTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setDomainTab(tab.id);
                  setEditingCategoryLabel(false);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer tabular-nums ${
                  active
                    ? 'bg-[#803C50] text-[#FFF9F5] border-[#803C50] shadow-xs'
                    : 'bg-[#FFF9F5]/85 text-[#493039] border-[#D9B8C0] hover:border-[#B65B76]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {isOwner && editableCategoryKey && onSaveShelfConfig && (
            <button
              type="button"
              onClick={() => {
                setCategoryLabelDraft(labels[editableCategoryKey]);
                setEditingCategoryLabel((v) => !v);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#FFF9F5]/85 border border-[#D9B8C0] text-[11px] font-medium text-[#493039] hover:border-[#B65B76] cursor-pointer"
              title="Editar nome desta estante"
            >
              <Pencil className="w-3 h-3 text-[#803C50]" />
              <span>Renomear aba</span>
            </button>
          )}

          {isOwner && onQuickAddKind && (
            <button
              type="button"
              onClick={() =>
                onQuickAddKind(
                  domainTab === 'filmes'
                    ? 'filme'
                    : domainTab === 'series'
                    ? 'serie'
                    : domainTab === 'animes'
                    ? 'anime'
                    : domainTab === 'poemas'
                    ? 'poema'
                    : domainTab === 'artigos'
                    ? 'artigo'
                    : 'livro'
                )
              }
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#B65B76] text-[#FFF9F5] text-[11px] font-medium hover:bg-[#803C50] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar obra</span>
            </button>
          )}

          {isOwner && onSaveShelfConfig && (
            <button
              type="button"
              onClick={() => setShowShelfCustomizer((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-medium cursor-pointer transition-colors ${
                showShelfCustomizer
                  ? 'bg-[#493039] text-[#FFF9F5] border-[#493039]'
                  : 'bg-[#FFF9F5]/85 text-[#493039] border-[#D9B8C0] hover:border-[#B65B76]'
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              <span>Visual da estante</span>
            </button>
          )}
        </div>
      </div>

      {/* Inline Rename Active Shelf Category */}
      {editingCategoryLabel && editableCategoryKey && isOwner && onSaveShelfConfig && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!categoryLabelDraft.trim()) return;
            await updateConfig({
              categoryLabels: {
                [editableCategoryKey]: categoryLabelDraft.trim(),
              },
            });
            setEditingCategoryLabel(false);
          }}
          className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-[#FFF9F5] border border-[#D9B8C0] text-xs"
        >
          <span className="font-medium text-[#493039]">Nome da estante:</span>
          <input
            type="text"
            value={categoryLabelDraft}
            onChange={(e) => setCategoryLabelDraft(e.target.value)}
            className="rounded-xl bg-[#F5E9E8] border border-[#D9B8C0] px-3 py-1.5 text-xs text-[#493039]"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-full bg-[#803C50] text-[#FFF9F5] font-medium cursor-pointer"
          >
            Salvar nome
          </button>
          <button
            type="button"
            onClick={() => setEditingCategoryLabel(false)}
            className="px-2 py-1 text-[#7B5A65] cursor-pointer"
          >
            Cancelar
          </button>
        </form>
      )}

      {/* Inline Shelf Appearance Quick Studio */}
      {showShelfCustomizer && isOwner && onSaveShelfConfig && (
        <div className="p-4 rounded-2xl bg-[#FFF9F5] border border-[#D9B8C0] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs text-[#493039] editorial-shadow">
          <div>
            <label className="block font-semibold text-[11px] text-[#803C50] mb-1">
              Madeira
            </label>
            <select
              value={activeConfig.woodTone}
              onChange={(e) => updateConfig({ woodTone: e.target.value as ShelfWoodTone })}
              className="w-full rounded-xl bg-[#F5E9E8] border border-[#D9B8C0] px-2.5 py-1.5"
            >
              <option value="clara">Madeira clara</option>
              <option value="escura">Madeira escura</option>
              <option value="envelhecida">Madeira envelhecida</option>
              <option value="branca">Prateleiras brancas</option>
              <option value="marrom">Tons de marrom</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-[11px] text-[#803C50] mb-1">
              Fundo da biblioteca
            </label>
            <select
              value={activeConfig.backdropTone}
              onChange={(e) => updateConfig({ backdropTone: e.target.value as ShelfBackdropTone })}
              className="w-full rounded-xl bg-[#F5E9E8] border border-[#D9B8C0] px-2.5 py-1.5"
            >
              <option value="escuro">Biblioteca clássica escura</option>
              <option value="marfim">Marfim claro</option>
              <option value="rosa_antigo">Rosa antigo</option>
              <option value="verde_salvia">Verde biblioteca</option>
              <option value="vinho">Veludo vinho</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-[11px] text-[#803C50] mb-1">
              Organização
            </label>
            <select
              value={activeConfig.displayMode}
              onChange={(e) => updateConfig({ displayMode: e.target.value as ShelfDisplayMode })}
              className="w-full rounded-xl bg-[#F5E9E8] border border-[#D9B8C0] px-2.5 py-1.5"
            >
              <option value="capas_3d">Capas reais + lombada 3D</option>
              <option value="misto">Misto (capas & lombadas)</option>
              <option value="lombadas">Apenas lombadas clássicas</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-[11px] text-[#803C50] mb-1">
              Tamanho dos livros
            </label>
            <select
              value={activeConfig.bookSize}
              onChange={(e) => updateConfig({ bookSize: e.target.value as ShelfBookSize })}
              className="w-full rounded-xl bg-[#F5E9E8] border border-[#D9B8C0] px-2.5 py-1.5"
            >
              <option value="compacto">Compacto</option>
              <option value="medio">Equilibrado</option>
              <option value="grande">Ampliado</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-[11px] text-[#803C50] mb-1">
              Espaçamento
            </label>
            <select
              value={activeConfig.spacing}
              onChange={(e) => updateConfig({ spacing: e.target.value as ShelfSpacing })}
              className="w-full rounded-xl bg-[#F5E9E8] border border-[#D9B8C0] px-2.5 py-1.5"
            >
              <option value="junto">Junto (biblioteca cheia)</option>
              <option value="equilibrado">Equilibrado</option>
              <option value="arejado">Arejado (livraria boutique)</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold text-[11px] text-[#803C50] mb-1">
              Itens por prateleira
            </label>
            <select
              value={activeConfig.itemsPerRow}
              onChange={(e) => updateConfig({ itemsPerRow: Number(e.target.value) })}
              className="w-full rounded-xl bg-[#F5E9E8] border border-[#D9B8C0] px-2.5 py-1.5"
            >
              <option value={0}>Automático</option>
              <option value={4}>4 obras</option>
              <option value={6}>6 obras</option>
              <option value={8}>8 obras</option>
              <option value={10}>10 obras</option>
            </select>
          </div>
        </div>
      )}

      {/* Sub-Filters for Livros */}
      {domainTab === 'livros' && (
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'todas' as BookFilterTab, label: `Todos (${bookEntries.length})` },
            {
              id: 'lendo' as BookFilterTab,
              label: `Lendo Atualmente (${
                bookEntries.filter((e) => e.status === 'lendo').length
              })`,
            },
            {
              id: 'quero_ler' as BookFilterTab,
              label: `Quero Ler (${
                bookEntries.filter((e) => e.status === 'quero_ler').length
              })`,
            },
            {
              id: 'ja_li' as BookFilterTab,
              label: `Já Li (${bookEntries.filter((e) => e.status === 'ja_li').length})`,
            },
            {
              id: 'abandonado' as BookFilterTab,
              label: `Abandonados (${
                bookEntries.filter((e) => e.status === 'abandonado').length
              })`,
            },
            {
              id: 'favoritos' as BookFilterTab,
              label: `Favoritos (${bookEntries.filter((e) => e.isFavorite).length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setBookFilter(tab.id)}
              className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer tabular-nums ${
                bookFilter === tab.id
                  ? 'bg-[#B65B76] text-[#FFF9F5] border-[#B65B76]'
                  : 'bg-[#FFF9F5]/80 text-[#493039] border-[#D9B8C0] hover:border-[#B65B76]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Sub-Filters for Filmes or Séries */}
      {(domainTab === 'filmes' || domainTab === 'series') && (
        <div className="flex flex-wrap items-center gap-1.5">
          {(() => {
            const list = domainTab === 'filmes' ? movieEntries : seriesEntries;
            return [
              { id: 'todas' as MovieFilterTab, label: `Todos (${list.length})` },
              {
                id: 'quero_assistir' as MovieFilterTab,
                label: `Quero assistir (${
                  list.filter((e) => e.status === 'quero_assistir').length
                })`,
              },
              {
                id: 'ja_assistido' as MovieFilterTab,
                label: `Já assisti (${
                  list.filter((e) => e.status === 'ja_assistido').length
                })`,
              },
              {
                id: 'favoritos' as MovieFilterTab,
                label: `Favoritos (${list.filter((e) => e.isFavorite).length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMovieFilter(tab.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-colors cursor-pointer tabular-nums ${
                  movieFilter === tab.id
                    ? 'bg-[#B65B76] text-[#FFF9F5] border-[#B65B76]'
                    : 'bg-[#FFF9F5]/80 text-[#493039] border-[#D9B8C0] hover:border-[#B65B76]'
                }`}
              >
                {tab.label}
              </button>
            ));
          })()}
        </div>
      )}

      {/* 3D Wooden Cabinet */}
      <WoodenCabinetFrame cabinetRef={cabinetRef} config={activeConfig}>
        <ShelfRowsRenderer
          rows={shelfRows}
          config={activeConfig}
          emptyTitle={emptyConfig.title}
          emptyDesc={emptyConfig.desc}
          emptyAction={emptyConfig.action}
          onSelect={setSelection}
        />
      </WoodenCabinetFrame>

      {/* Shared Detail Modal */}
      <ShelfDetailModal
        selection={selection}
        reviews={reviews}
        allShelves={shelves}
        isOwner={isOwner}
        onClose={() => setSelection(null)}
        onOpenWork={onOpenWork}
        onOpenPostId={onOpenPostId}
        onUpdateMediaEntry={onUpdateMediaEntry}
        onRemoveMediaEntry={onRemoveMediaEntry}
        onUpdateShelfItem={onUpdateShelfItem}
        onReorderShelfItem={onReorderShelfItem}
        onTransferShelfItem={onTransferShelfItem}
        onRemoveShelfItem={onRemoveShelfItem}
      />
    </div>
  );
}
