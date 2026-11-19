const GLOW_CARD_SELECTOR = '.autumn-glow-card, .autumn-glow-surface, .autumn-glow-image';
const TOUCH_GLOW_SELECTOR =
  '.autumn-glow-card, .autumn-glow-btn, .autumn-glow-surface, .autumn-glow-image, .autumn-glow-link';

export function initAutumnHoverGlow(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const touchTimers = new WeakMap<HTMLElement, number>();
  let rafId = 0;
  let pendingX = 0;
  let pendingY = 0;
  let pendingTarget: EventTarget | null = null;

  function setGlowCoords(el: HTMLElement, clientX: number, clientY: number) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    el.style.setProperty('--glow-x', `${clientX - rect.left}px`);
    el.style.setProperty('--glow-y', `${clientY - rect.top}px`);
  }

  function flushPointerMove() {
    rafId = 0;
    const node = pendingTarget instanceof HTMLElement ? pendingTarget : null;
    if (!node) return;

    // Update the innermost interactive glow surface/image and also any enclosing card
    const directEl = node.closest<HTMLElement>(GLOW_CARD_SELECTOR);
    if (!directEl) return;

    setGlowCoords(directEl, pendingX, pendingY);

    const parentCard = directEl.parentElement?.closest<HTMLElement>('.autumn-glow-card');
    if (parentCard && parentCard !== directEl) {
      setGlowCoords(parentCard, pendingX, pendingY);
    }
  }

  function handlePointerMove(e: PointerEvent) {
    if (e.pointerType === 'touch' || reducedMotionQuery.matches) return;
    pendingTarget = e.target;
    pendingX = e.clientX;
    pendingY = e.clientY;
    if (!rafId) {
      rafId = window.requestAnimationFrame(flushPointerMove);
    }
  }

  function triggerTouchGlow(el: HTMLElement, clientX: number, clientY: number) {
    setGlowCoords(el, clientX, clientY);
    el.classList.remove('is-touch-glow');
    // Force reflow only when restarting an active brief pulse on repeated tap
    void el.offsetWidth;
    el.classList.add('is-touch-glow');

    const prevTimer = touchTimers.get(el);
    if (prevTimer) window.clearTimeout(prevTimer);

    const timerId = window.setTimeout(() => {
      el.classList.remove('is-touch-glow');
      touchTimers.delete(el);
    }, 480);
    touchTimers.set(el, timerId);
  }

  function handlePointerDown(e: PointerEvent) {
    if (e.pointerType !== 'touch' || reducedMotionQuery.matches) return;
    const node = e.target instanceof HTMLElement ? e.target : null;
    if (!node) return;

    const target = node.closest<HTMLElement>(TOUCH_GLOW_SELECTOR);
    if (target) {
      triggerTouchGlow(target, e.clientX, e.clientY);
      const enclosingCard = target.parentElement?.closest<HTMLElement>('.autumn-glow-card');
      if (enclosingCard && enclosingCard !== target) {
        triggerTouchGlow(enclosingCard, e.clientX, e.clientY);
      }
    }
  }

  document.addEventListener('pointermove', handlePointerMove, { passive: true });
  document.addEventListener('pointerdown', handlePointerDown, { passive: true });

  return () => {
    if (rafId) window.cancelAnimationFrame(rafId);
    document.removeEventListener('pointermove', handlePointerMove);
    document.removeEventListener('pointerdown', handlePointerDown);
  };
}
