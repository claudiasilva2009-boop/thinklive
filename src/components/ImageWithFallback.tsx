import { BookOpen } from 'lucide-react';
import { type CSSProperties, useEffect, useState } from 'react';

interface ImageWithFallbackProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  style?: CSSProperties;
}

export function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackLabel,
  style,
}: ImageWithFallbackProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-tl-bege/70 text-tl-marrom-suave border border-tl-marrom/12 p-4 text-center ${className}`}
        aria-label={alt}
        style={style}
      >
        <BookOpen className="w-5 h-5 mb-1.5 opacity-70 text-tl-terracota" strokeWidth={1.5} />
        {fallbackLabel && <span className="text-xs font-editorial italic max-w-[18ch] truncate">{fallbackLabel}</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
      style={style}
    />
  );
}

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function UserAvatar({ src, name, size = 'md', className = '' }: AvatarProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const sizeClass = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-20 h-20 text-2xl',
  }[size];

  const initials = (name || 'T')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

  if (!src || failed) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-tl-areia/65 text-tl-marrom border border-tl-marrom/20 flex items-center justify-center font-editorial font-semibold shrink-0 ${className}`}
      >
        {initials || 'T'}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`${sizeClass} rounded-full object-cover border border-tl-creme shadow-xs shrink-0 ${className}`}
    />
  );
}
