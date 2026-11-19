import { BookOpen, Film, Tv } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CatalogMediaKind, CatalogWork, CatalogWorkSnapshot } from '../types/thinklive';

export function workToSnapshot(work: CatalogWork): CatalogWorkSnapshot {
  return {
    id: work.id,
    mediaKind: work.mediaKind,
    title: work.title,
    creator: work.creator,
    year: work.year,
    coverUrl: work.coverUrl,
    genres: work.genres,
    ageRating: work.ageRating,
  };
}

export function mediaKindLabel(kind: CatalogMediaKind): string {
  if (kind === 'filme') return 'Filme';
  if (kind === 'serie') return 'Série';
  return 'Livro';
}

export function AgeRatingBadge({ rating }: { rating?: string }) {
  if (!rating || rating === 'Não informada') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-tl-bege/85 text-tl-marrom-suave border border-tl-marrom/15">
        Class. não informada
      </span>
    );
  }

  const normalized = rating.trim();
  let tone = 'bg-tl-bege text-tl-marrom border-tl-marrom/20';
  if (normalized === 'Livre') tone = 'bg-emerald-800/90 text-tl-creme border-emerald-900/20';
  else if (normalized === '10') tone = 'bg-sky-800/90 text-tl-creme border-sky-900/20';
  else if (normalized === '12') tone = 'bg-amber-600/90 text-tl-creme border-amber-700/20';
  else if (normalized === '14') tone = 'bg-orange-700/90 text-tl-creme border-orange-800/20';
  else if (normalized === '16') tone = 'bg-red-700/90 text-tl-creme border-red-800/20';
  else if (normalized === '18') tone = 'bg-stone-900 text-tl-creme border-stone-950/30';

  return (
    <span
      title={`Classificação indicativa: ${normalized}`}
      className={`inline-flex items-center justify-center min-w-[26px] px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wide border ${tone}`}
    >
      {normalized === 'Livre' ? 'L' : normalized}
    </span>
  );
}

interface CatalogCoverProps {
  src?: string;
  title: string;
  creator?: string;
  year?: string;
  mediaKind: CatalogMediaKind;
  className?: string;
}

export function CatalogCover({
  src,
  title,
  creator,
  year,
  mediaKind,
  className = 'w-full h-full object-cover',
}: CatalogCoverProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    const Icon = mediaKind === 'livro' ? BookOpen : mediaKind === 'serie' ? Tv : Film;
    return (
      <div className="w-full h-full bg-gradient-to-br from-tl-bege via-tl-creme to-tl-areia/75 p-4 flex flex-col justify-between text-tl-marrom border border-tl-marrom/10 select-none">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-tl-marrom-suave">
          <span>{mediaKindLabel(mediaKind)}</span>
          <Icon className="w-3.5 h-3.5 text-tl-terracota" />
        </div>
        <div className="my-auto py-2">
          <div className="font-editorial text-base md:text-lg font-semibold leading-snug line-clamp-4 text-tl-marrom">
            {title}
          </div>
          {creator && (
            <div className="mt-1.5 text-[11px] text-tl-marrom-suave line-clamp-2">{creator}</div>
          )}
        </div>
        <div className="text-[10px] text-tl-marrom-suave/80 border-t border-tl-marrom/12 pt-1.5 flex items-center justify-between">
          <span>{year || 'Edição'}</span>
          <span>Thinklive</span>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={`Capa de ${title}`}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
