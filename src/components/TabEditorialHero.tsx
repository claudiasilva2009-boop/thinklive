import { ReactNode } from 'react';
import { TopCategory } from '../types/thinklive';
import { useSiteConfig } from './SiteConfigContext';

interface TabEditorialHeroProps {
  tabKey?: TopCategory;
  imageUrl: string;
  imageAlt: string;
  objectPositionClass?: string;
  kickerIcon?: ReactNode;
  kicker: string;
  title: string;
  phrase: string;
  actions?: ReactNode;
  metaText?: string;
}

function resolveTabCategory(title: string, explicitKey?: TopCategory): TopCategory | null {
  if (explicitKey) return explicitKey;
  const normalized = title.trim().toLowerCase();
  if (normalized.startsWith('notícia')) return 'Notícias';
  if (normalized.startsWith('filmes')) return 'Filmes & Séries';
  if (normalized === 'artigos') return 'Artigos';
  if (normalized === 'livros') return 'Livros';
  if (normalized === 'fotografia') return 'Fotografia';
  if (normalized.startsWith('arte')) return 'Arte e cultura';
  if (normalized.startsWith('podcast')) return 'Podcasts';
  if (normalized.startsWith('diário')) return 'Diários';
  if (normalized.startsWith('música')) return 'Músicas';
  if (normalized === 'poemas') return 'Poemas';
  return null;
}

export function TabEditorialHero({
  tabKey,
  imageUrl,
  imageAlt,
  objectPositionClass = 'object-center',
  kickerIcon,
  kicker,
  title,
  phrase,
  actions,
  metaText,
}: TabEditorialHeroProps) {
  const { siteConfig } = useSiteConfig();
  const resolvedKey = resolveTabCategory(title, tabKey);
  const override = resolvedKey ? siteConfig.tabHeroes?.[resolvedKey] : undefined;

  const finalImageUrl = override?.imageUrl?.trim() || imageUrl;
  const finalKicker = override?.kicker?.trim() || kicker;
  const finalTitle = override?.title?.trim() || title;
  const finalPhrase = override?.phrase?.trim() || phrase;

  return (
    <section className="relative rounded-3xl overflow-hidden min-h-[300px] md:min-h-[390px] flex items-end border border-tl-marrom/14 editorial-shadow">
      <img
        src={finalImageUrl}
        alt={imageAlt}
        referrerPolicy="no-referrer"
        className={`absolute inset-0 w-full h-full object-cover ${objectPositionClass}`}
      />

      {/* Measured literary scrim for crisp WCAG AA contrast */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-t from-[#160d09]/92 via-[#1d110b]/52 to-[#160d09]/18"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(232,175,114,0.16),transparent_55%)]"
      />

      <div className="relative z-10 w-full p-7 sm:p-10 md:p-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="max-w-2xl space-y-2.5">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-[#EAD2B5]">
            {kickerIcon}
            <span>{finalKicker}</span>
          </div>

          <h1 className="font-editorial text-4xl sm:text-5xl md:text-[62px] font-semibold text-[#FAF5EC] leading-[1.02] tracking-tight text-balance">
            {finalTitle}
          </h1>

          <p className="font-editorial italic text-base sm:text-lg md:text-[21px] text-[#F5E3CC] leading-relaxed max-w-xl">
            {finalPhrase}
          </p>
        </div>

        {(actions || metaText) && (
          <div className="flex flex-col items-start md:items-end gap-2.5 shrink-0">
            {actions}
            {metaText && (
              <span className="text-xs text-[#EAD2B5]/90 tabular-nums">{metaText}</span>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
