export function ThinkliveBrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5 select-none group">
      <span className="relative inline-flex items-baseline">
        <span className="font-editorial font-semibold tracking-tight text-2xl md:text-[28px] text-tl-marrom group-hover:text-tl-terracota transition-colors">
          Think
        </span>
        <span className="font-editorial italic font-semibold text-2xl md:text-[28px] text-tl-laranja group-hover:text-tl-terracota transition-colors">
          live
        </span>
      </span>
      {!compact && (
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="w-3.5 h-3.5 text-tl-laranja/80 self-center -mt-1 transition-transform duration-300 group-hover:rotate-12"
          fill="none"
        >
          <path
            d="M12 3C9.2 6.8 8 10.5 9.5 14.5C11.5 14.8 14.5 13 16 9.5C16.8 7.5 15.5 4.8 12 3Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M9.5 14.5L6.5 20" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )}
    </span>
  );
}

export function BotanicalDivider({ className = 'w-24 h-3 text-tl-laranja' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 120 14" fill="none" className={className}>
      <path d="M2 7H46" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="round" />
      <path
        d="M60 2.5C57.5 4.8 57 7.5 58.2 10.2C60.5 10.2 62.6 8.5 63.2 5.8C63.6 4.2 62.3 3 60 2.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M58.2 10.2L55 12.2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M74 7H118" stroke="currentColor" strokeOpacity="0.4" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function AutumnLeafAccent({ className = 'w-4 h-4 text-tl-laranja' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M12 3C8.5 6.5 7 10.5 9 14.5C12.2 14.8 15.6 12.5 17 8.5C17.8 6 15.8 4 12 3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 14.5L5.5 20.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

// Legacy alias kept to avoid breaking any residual imports during refactoring
export const DoodleSquiggle = BotanicalDivider;
export const DoodleStarSticker = AutumnLeafAccent;
export function WashiTape({ className = '' }: { color?: string; rotate?: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none block h-[2px] w-10 bg-tl-areia/80 ${className}`}
    />
  );
}
