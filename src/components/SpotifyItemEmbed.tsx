import { ExternalLink, Music2 } from 'lucide-react';
import { useState } from 'react';
import { SpotifyItemRef } from '../types/thinklive';
import { ImageWithFallback } from './ImageWithFallback';

interface SpotifyItemEmbedProps {
  item: SpotifyItemRef;
  compact?: boolean;
  onRemove?: () => void;
}

const TYPE_LABELS: Record<SpotifyItemRef['type'], string> = {
  track: 'Faixa musical',
  artist: 'Artista',
  album: 'Álbum',
  playlist: 'Playlist',
};

export function SpotifyItemEmbed({ item, compact = false, onRemove }: SpotifyItemEmbedProps) {
  const [showPlayer, setShowPlayer] = useState(!compact);

  return (
    <div className="autumn-glow-card rounded-xl border border-tl-marrom/15 bg-tl-bege/55 overflow-hidden">
      <div className="relative z-[2] p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {item.imageUrl ? (
            <div className="autumn-glow-image w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-tl-marrom/12">
              <ImageWithFallback
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-tl-areia/60 flex items-center justify-center shrink-0 text-tl-terracota">
              <Music2 className="w-5 h-5" strokeWidth={1.6} />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wider text-tl-terracota font-semibold">
              {TYPE_LABELS[item.type]}
            </div>
            <div className="font-editorial text-base font-semibold text-tl-marrom truncate">
              {item.name}
            </div>
            {item.subtitle && (
              <div className="text-xs text-tl-marrom-suave truncate">{item.subtitle}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {compact && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowPlayer((v) => !v);
              }}
              className="autumn-glow-surface px-3 py-1.5 text-[11px] font-medium rounded-full border border-tl-marrom/20 bg-tl-creme text-tl-marrom hover:border-tl-laranja hover:text-tl-terracota active:scale-95 cursor-pointer"
            >
              {showPlayer ? 'Ocultar player' : 'Ouvir prévia'}
            </button>
          )}
          <a
            href={item.spotifyUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="autumn-glow-btn inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-full bg-tl-laranja text-tl-creme border border-tl-terracota/20 hover:bg-tl-terracota active:scale-95"
          >
            <span>Spotify</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="autumn-glow-link text-xs text-tl-terracota hover:underline px-1.5 cursor-pointer"
            >
              Remover
            </button>
          )}
        </div>
      </div>

      {showPlayer && item.embedUrl && (
        <div className="px-3 pb-3">
          <iframe
            title={`Player: ${item.name}`}
            src={item.embedUrl}
            width="100%"
            height={item.type === 'track' ? 152 : 232}
            frameBorder="0"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="rounded-lg bg-tl-creme"
          />
        </div>
      )}
    </div>
  );
}
