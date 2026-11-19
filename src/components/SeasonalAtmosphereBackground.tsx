import { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import { SeasonId } from '../types/thinklive';

interface ParticleSpec {
  id: number;
  leftPct: number;
  sizePx: number;
  color: string;
  opacity: number;
  durationSec: number;
  delaySec: number;
  swayA: number;
  swayB: number;
  swayEnd: number;
  rotA: number;
  rotB: number;
  rotEnd: number;
  variant: number;
}

const SEASON_PARTICLE_PALETTES: Record<SeasonId, string[]> = {
  outono: ['#C47743', '#98512F', '#D9BFA0', '#B86B35', '#765A49', '#563A2C'],
  inverno: ['#FFFFFF', '#DCEAF7', '#A5C7E4', '#6E9CC4', '#4A7599', '#EBF3FB'],
  primavera: ['#E495AB', '#D06A86', '#F4CDD7', '#B0536E', '#8AA880', '#F8E3E8'],
  verao: ['#F5BF49', '#E59A24', '#FFE59C', '#D4822A', '#F9CF6B', '#FFF0B8'],
};

function buildParticles(season: SeasonId, count: number): ParticleSpec[] {
  const palette = SEASON_PARTICLE_PALETTES[season];
  return Array.from({ length: count }, (_, i) => {
    const lane = (i * 13.7 + (i % 5) * 3.1) % 94;
    const baseSize =
      season === 'inverno'
        ? 13 + (i % 5) * 3.2
        : season === 'verao'
        ? 12 + (i % 5) * 3.6
        : season === 'primavera'
        ? 15 + (i % 5) * 3.4
        : 17 + (i % 5) * 3.5;

    const baseOpacity =
      season === 'inverno'
        ? 0.42 + (i % 4) * 0.1
        : season === 'verao'
        ? 0.44 + (i % 4) * 0.1
        : season === 'primavera'
        ? 0.34 + (i % 4) * 0.08
        : 0.28 + (i % 4) * 0.06;

    const durationSec =
      season === 'inverno'
        ? 16 + (i % 6) * 2.8
        : season === 'verao'
        ? 12 + (i % 6) * 2.4
        : season === 'primavera'
        ? 13 + (i % 6) * 2.3
        : 14 + (i % 6) * 2.6;

    return {
      id: i,
      leftPct: lane + 2,
      sizePx: baseSize,
      color: palette[i % palette.length],
      opacity: baseOpacity,
      durationSec,
      delaySec: -((i * 1.55) % 20),
      swayA: (i % 2 === 0 ? 1 : -1) * (18 + (i % 4) * 8),
      swayB: (i % 2 === 0 ? -1 : 1) * (15 + (i % 3) * 9),
      swayEnd: (i % 2 === 0 ? 1 : -1) * (14 + (i % 3) * 6),
      rotA: 55 + (i % 5) * 24,
      rotB: 170 + (i % 4) * 28,
      rotEnd: 290 + (i % 3) * 40,
      variant: i % 4,
    };
  });
}

function ParticleSvg({ season, variant, color, sizePx }: { season: SeasonId; variant: number; color: string; sizePx: number }) {
  if (season === 'inverno') {
    if (variant === 0) {
      // Six-point crystalline snowflake
      return (
        <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2V22M3.34 7L20.66 17M20.66 7L3.34 17M9.5 4.2L12 6.6L14.5 4.2M9.5 19.8L12 17.4L14.5 19.8M5 9.8L7.8 9.6L6.6 6.8M19 14.2L16.2 14.4L17.4 17.2M17.4 6.8L16.2 9.6L19 9.8M6.6 17.2L7.8 14.4L5 14.2"
            stroke={color}
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
    if (variant === 1) {
      // Starburst frost crystal
      return (
        <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 2.5L13.6 9.4L20.5 7.5L14.6 12L20.5 16.5L13.6 14.6L12 21.5L10.4 14.6L3.5 16.5L9.4 12L3.5 7.5L10.4 9.4L12 2.5Z"
            fill={color}
            fillOpacity="0.88"
          />
        </svg>
      );
    }
    if (variant === 2) {
      // Delicate diamond ice flake
      return (
        <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 3L16 12L12 21L8 12L12 3Z" stroke={color} strokeWidth="1.3" fill={color} fillOpacity="0.45" />
          <path d="M4 12H20" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    }
    // Soft frost snow puff
    return (
      <svg width={sizePx * 0.72} height={sizePx * 0.72} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="6.5" fill={color} fillOpacity="0.85" />
        <circle cx="12" cy="12" r="9.5" stroke={color} strokeOpacity="0.35" strokeWidth="1.2" />
      </svg>
    );
  }

  if (season === 'primavera') {
    if (variant === 0) {
      // Sakura petal with notch
      return (
        <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M12 3.5C8.5 6.5 6.5 10.5 7.8 14.8C8.8 18 10.8 19.8 12 20.5C13.2 19.8 15.2 18 16.2 14.8C17.5 10.5 15.5 6.5 12 3.5ZM12 3.5L10.6 6.2L12 5.4L13.4 6.2L12 3.5Z"
            fill={color}
          />
        </svg>
      );
    }
    if (variant === 1) {
      // 5-petal tiny blossom
      return (
        <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="7.2" r="3.4" fill={color} />
          <circle cx="16.6" cy="10.6" r="3.4" fill={color} />
          <circle cx="14.8" cy="16" r="3.4" fill={color} />
          <circle cx="9.2" cy="16" r="3.4" fill={color} />
          <circle cx="7.4" cy="10.6" r="3.4" fill={color} />
          <circle cx="12" cy="12" r="2.2" fill="#F6D58E" />
        </svg>
      );
    }
    if (variant === 2) {
      // Fresh spring sprout leaf
      return (
        <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M19 4C11.5 4.5 6.5 9.2 6 16.5C13.2 16 18 11.2 19 4Z"
            fill={color}
          />
          <path d="M5 19L14.5 9.5" stroke="#422631" strokeOpacity="0.25" strokeWidth="1.1" strokeLinecap="round" />
        </svg>
      );
    }
    // Rounded flower petal
    return (
      <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 4C15.5 7 17.2 11.5 15.5 15.5C14.4 18 12.6 19.2 12 19.5C11.4 19.2 9.6 18 8.5 15.5C6.8 11.5 8.5 7 12 4Z"
          fill={color}
        />
      </svg>
    );
  }

  if (season === 'verao') {
    if (variant === 0 || variant === 2) {
      // Glowing firefly mote with warm halo
      return (
        <svg
          width={sizePx}
          height={sizePx}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="season-summer-orb"
        >
          <circle cx="12" cy="12" r="9" fill={color} fillOpacity="0.26" />
          <circle cx="12" cy="12" r="4.8" fill={color} fillOpacity="0.88" />
          <circle cx="12" cy="12" r="2.2" fill="#FFFDF2" />
        </svg>
      );
    }
    if (variant === 1) {
      // Warm 4-point sunlight glint
      return (
        <svg
          width={sizePx}
          height={sizePx}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="season-summer-orb"
        >
          <path
            d="M12 3L14 10L21 12L14 14L12 21L10 14L3 12L10 10L12 3Z"
            fill={color}
            fillOpacity="0.9"
          />
          <circle cx="12" cy="12" r="2.2" fill="#FFFDF2" />
        </svg>
      );
    }
    // Sunlit pollen orb
    return (
      <svg width={sizePx * 0.85} height={sizePx * 0.85} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8" stroke={color} strokeOpacity="0.45" strokeWidth="1.2" />
        <circle cx="12" cy="12" r="4.2" fill={color} fillOpacity="0.92" />
      </svg>
    );
  }

  // OUTONO: 4 autumn leaf species
  if (variant === 1) {
    // Oak
    return (
      <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2C10.5 4 9.5 5 10.5 6.5C8.5 6.5 7 7.8 8.2 9.5C6.2 10 5.5 11.8 7 13C5.8 14.5 6.8 16.5 9 16.5C9.5 18 11 18.5 12 18.5C13 18.5 14.5 18 15 16.5C17.2 16.5 18.2 14.5 17 13C18.5 11.8 17.8 10 15.8 9.5C17 7.8 15.5 6.5 13.5 6.5C14.5 5 13.5 4 12 2Z"
          fill={color}
        />
        <path d="M12 6.5V22" stroke="#563A2C" strokeOpacity="0.32" strokeWidth="1" strokeLinecap="round" />
      </svg>
    );
  }
  if (variant === 2) {
    // Ginkgo
    return (
      <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 17C7 17 4 13 4.5 8.5C6.5 7.5 9.5 8.2 11.2 10.5C11.7 9 12.3 9 12.8 10.5C14.5 8.2 17.5 7.5 19.5 8.5C20 13 17 17 12 17Z"
          fill={color}
        />
        <path d="M12 14V21.5" stroke={color} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }
  if (variant === 3) {
    // Birch
    return (
      <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M12 2.5C15.8 6.2 17.5 10.2 16.5 14C15.7 16.8 13.8 18.2 12 18.5C10.2 18.2 8.3 16.8 7.5 14C6.5 10.2 8.2 6.2 12 2.5Z"
          fill={color}
        />
        <path
          d="M12 5.5V22M12 9L14.5 7.2M12 12.5L9.5 10.5M12 15L14.2 13.4"
          stroke="#563A2C"
          strokeOpacity="0.3"
          strokeWidth="0.95"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  // Maple
  return (
    <svg width={sizePx} height={sizePx} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 2.5L13.8 7.5L18.5 6L16.5 10.5L21 12.5L16.5 14.8L17.8 18.2L12.8 16.8L12 18.5L11.2 16.8L6.2 18.2L7.5 14.8L3 12.5L7.5 10.5L5.5 6L10.2 7.5L12 2.5Z"
        fill={color}
      />
      <path d="M12 7.5V22" stroke="#563A2C" strokeOpacity="0.3" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

interface SeasonalAtmosphereBackgroundProps {
  season: SeasonId;
  contained?: boolean;
}

export function SeasonalAtmosphereBackground({
  season,
  contained = false,
}: SeasonalAtmosphereBackgroundProps) {
  const [isMobile, setIsMobile] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const particleInnerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hoverTimersRef = useRef<Record<number, number>>({});

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const particleCount = useMemo(() => {
    if (contained) return isMobile ? 12 : 18;
    if (season === 'inverno') return isMobile ? 16 : 34;
    if (season === 'primavera' || season === 'verao') return isMobile ? 15 : 30;
    return isMobile ? 14 : 28;
  }, [contained, isMobile, season]);

  const particles = useMemo(() => buildParticles(season, particleCount), [season, particleCount]);

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reducedMotion.matches) return;

    let rafId = 0;
    let lastX = -9999;
    let lastY = -9999;

    function triggerReaction(idx: number, el: HTMLDivElement, cx: number, cy: number, px: number, py: number) {
      const dx = cx - px;
      const dy = cy - py;
      const pushX = Math.max(-28, Math.min(28, dx * 0.9 || (idx % 2 === 0 ? 16 : -16)));
      const pushY =
        season === 'primavera' || season === 'verao'
          ? Math.max(-28, Math.min(10, dy * 0.5 - 18))
          : Math.max(-24, Math.min(14, dy * 0.45 - 12));
      const rot = (dx >= 0 ? 1 : -1) * (season === 'inverno' ? 95 : 42 + (idx % 4) * 12);

      el.style.setProperty('--p-push-x', `${pushX.toFixed(1)}px`);
      el.style.setProperty('--p-push-y', `${pushY.toFixed(1)}px`);
      el.style.setProperty('--p-push-rot', `${rot}deg`);

      if (!el.classList.contains('is-hovered')) {
        el.classList.add('is-hovered');
      }

      const prev = hoverTimersRef.current[idx];
      if (prev) window.clearTimeout(prev);

      hoverTimersRef.current[idx] = window.setTimeout(() => {
        el.classList.remove('is-hovered');
        delete hoverTimersRef.current[idx];
      }, 640);
    }

    function checkAtPoint(clientX: number, clientY: number, hitPadding: number) {
      for (let i = 0; i < particleInnerRefs.current.length; i++) {
        const el = particleInnerRefs.current[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) continue;
        if (rect.bottom < -20 || rect.top > window.innerHeight + 20) continue;

        if (
          clientX >= rect.left - hitPadding &&
          clientX <= rect.right + hitPadding &&
          clientY >= rect.top - hitPadding &&
          clientY <= rect.bottom + hitPadding
        ) {
          const cx = rect.left + rect.width / 2;
          const cy = rect.top + rect.height / 2;
          triggerReaction(i, el, cx, cy, clientX, clientY);
        }
      }
    }

    function handlePointerMove(e: PointerEvent) {
      if (e.pointerType === 'touch' || reducedMotion.matches) return;
      if (contained && containerRef.current) {
        const bounds = containerRef.current.getBoundingClientRect();
        if (
          e.clientX < bounds.left ||
          e.clientX > bounds.right ||
          e.clientY < bounds.top ||
          e.clientY > bounds.bottom
        ) {
          return;
        }
      }
      lastX = e.clientX;
      lastY = e.clientY;
      if (!rafId) {
        rafId = window.requestAnimationFrame(() => {
          rafId = 0;
          checkAtPoint(lastX, lastY, 15);
        });
      }
    }

    function handlePointerDown(e: PointerEvent) {
      if (e.pointerType !== 'touch' || reducedMotion.matches) return;
      checkAtPoint(e.clientX, e.clientY, 26);
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
      Object.values(hoverTimersRef.current).forEach((t) => window.clearTimeout(t));
      hoverTimersRef.current = {};
    };
  }, [contained, particles.length, season]);

  const spriteClass = `season-sprite-${season}`;

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={`pointer-events-none ${
        contained ? 'absolute inset-0 z-20' : 'fixed inset-0 z-20'
      } overflow-hidden select-none`}
    >
      {/* Subtle Summer Sunbeam Wash */}
      {season === 'verao' && (
        <>
          <div
            className="season-sunbeam-wash absolute -top-24 -right-16 w-80 h-80 rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(245, 194, 78, 0.34), rgba(245, 194, 78, 0) 70%)',
            }}
          />
          <div
            className="season-sunbeam-wash absolute top-1/4 -left-24 w-72 h-72 rounded-full"
            style={{
              animationDelay: '-4.2s',
              background: 'radial-gradient(circle, rgba(254, 224, 138, 0.28), rgba(254, 224, 138, 0) 70%)',
            }}
          />
        </>
      )}

      {particles.map((p, idx) => {
        const style = {
          left: `${p.leftPct}%`,
          top: 0,
          height: '100%',
          animationDuration: `${p.durationSec}s`,
          animationDelay: `${p.delaySec}s`,
          '--p-opacity': p.opacity,
          '--p-sway-a': `${p.swayA}px`,
          '--p-sway-b': `${p.swayB}px`,
          '--p-sway-end': `${p.swayEnd}px`,
          '--p-rot-a': `${p.rotA}deg`,
          '--p-rot-b': `${p.rotB}deg`,
          '--p-rot-end': `${p.rotEnd}deg`,
        } as CSSProperties;

        return (
          <div key={`${season}-${p.id}`} style={style} className={`absolute ${spriteClass}`}>
            <div
              ref={(node) => {
                particleInnerRefs.current[idx] = node;
              }}
              className={`season-particle-interactive season-${season}`}
            >
              <ParticleSvg season={season} variant={p.variant} color={p.color} sizePx={p.sizePx} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
