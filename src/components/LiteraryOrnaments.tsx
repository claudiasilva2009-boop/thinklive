import { PoemOrnamentKind } from '../types/thinklive';

export function PressedFlowerIllustration({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className={className}>
      <path d="M16 28V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M16 11C13.5 8 13.5 5 16 3.5C18.5 5 18.5 8 16 11Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 11.5C12 11 9.5 9 9 6.5C11.8 6 14 7.8 15.5 11.5Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 11.5C20 11 22.5 9 23 6.5C20.2 6 18 7.8 16.5 11.5Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path
        d="M16 20.5C13 19.5 11 17.5 11 15.2C13.5 15.2 15.2 17 16 20.5Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path
        d="M16 23C19 22 21 20 21 17.8C18.5 17.8 16.8 19.5 16 23Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FountainPenInkIllustration({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M21.5 4.5L27.5 10.5L14.5 23.5L7 25L8.5 17.5L21.5 4.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M18.5 7.5L24.5 13.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M7 25L12.5 19.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="13.5" cy="18.5" r="1.2" fill="currentColor" />
      <path d="M6 27.5H20" stroke="currentColor" strokeOpacity="0.45" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function OpenBookIllustration({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M16 8.5C13 6.5 8.5 6.2 4.5 7.5V24C8.5 22.8 13 23 16 25C19 23 23.5 22.8 27.5 24V7.5C23.5 6.2 19 6.5 16 8.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M16 8.5V25" stroke="currentColor" strokeWidth="1.3" />
      <path d="M8 12.2H13" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M8 15.8H12.5" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M19 12.2H24" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M19 15.8H23.5" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function DriedLeafIllustration({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 32 32" fill="none" className={className}>
      <path
        d="M24.5 6.5C15.5 7 9.5 12.5 9.5 21C17.5 21.5 24 15.5 24.5 6.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M6 25.5C9.5 21.5 15 16.5 21 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M13.5 18L13 13.5" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M17 15L21 15.5" stroke="currentColor" strokeOpacity="0.6" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

export function ManuscriptRuleDivider({ className = 'w-full h-4' }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center gap-3 ${className}`}>
      <span className="h-[1px] flex-1 bg-current opacity-20" />
      <DriedLeafIllustration className="w-4 h-4 opacity-70 shrink-0" />
      <span className="h-[1px] flex-1 bg-current opacity-20" />
    </div>
  );
}

export function PoemOrnamentIcon({
  kind,
  className = 'w-4 h-4',
}: {
  kind: PoemOrnamentKind;
  className?: string;
}) {
  if (kind === 'nenhum') return null;
  if (kind === 'flor_seca') return <PressedFlowerIllustration className={className} />;
  if (kind === 'tinteiro') return <FountainPenInkIllustration className={className} />;
  if (kind === 'livro_aberto') return <OpenBookIllustration className={className} />;
  return <DriedLeafIllustration className={className} />;
}
