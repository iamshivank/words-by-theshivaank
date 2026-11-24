import { useEffect, useRef } from 'react';
import { useMediaQuery } from '@/lib/useMediaQuery';

const INTERACTIVE = 'a, button, [role="button"], label, summary, select, [data-cursor="link"]';
const TEXT =
  'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]), textarea, [contenteditable="true"], [data-cursor="text"]';

/**
 * A small orange dot with a thin trailing ring that widens over links.
 * Mouse only: touch and pen devices keep their native behaviour. Over text fields it steps aside
 * so the native I-beam shows. Styles live in index.css (.cursor-dot, .cursor-ring).
 */
export function Cursor() {
  const enabled = useMediaQuery('(hover: hover) and (pointer: fine)');
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!enabled || !dot || !ring) return;

    const root = document.documentElement;
    root.classList.add('has-custom-cursor');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let x = 0;
    let y = 0;
    let ringX = 0;
    let ringY = 0;
    let frame = 0;
    let visible = false;

    const setVisible = (next: boolean) => {
      if (next === visible) return;
      visible = next;
      dot.dataset.visible = String(next);
      ring.dataset.visible = String(next);
    };

    const follow = () => {
      const ease = reduce ? 1 : 0.2;
      ringX += (x - ringX) * ease;
      ringY += (y - ringY) * ease;
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      frame = Math.abs(x - ringX) + Math.abs(y - ringY) > 0.1 ? requestAnimationFrame(follow) : 0;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      x = event.clientX;
      y = event.clientY;
      if (!visible) {
        ringX = x;
        ringY = y;
      }
      setVisible(true);
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      if (!frame) frame = requestAnimationFrame(follow);
    };

    const onOver = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const state = target?.closest(TEXT) ? 'text' : target?.closest(INTERACTIVE) ? 'link' : 'idle';
      dot.dataset.state = state;
      ring.dataset.state = state;
    };

    const onDown = () => {
      ring.dataset.pressed = 'true';
    };
    const onUp = () => {
      ring.dataset.pressed = 'false';
    };
    const onLeave = () => {
      setVisible(false);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);

    return () => {
      root.classList.remove('has-custom-cursor');
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <div ref={ringRef} aria-hidden className="cursor-ring" />
      <div ref={dotRef} aria-hidden className="cursor-dot" />
    </>
  );
}
