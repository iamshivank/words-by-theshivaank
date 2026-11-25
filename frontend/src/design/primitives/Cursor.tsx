import { useEffect, useRef } from 'react';
import { useMediaQuery } from '@/lib/useMediaQuery';

const INTERACTIVE =
  'a, button, [role="button"], [role="tab"], [role="option"], [role="switch"], [role="menuitem"], label, summary, select, [data-cursor="link"]';
const TEXT =
  'input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="file"]), textarea, [contenteditable="true"], [data-cursor="text"]';

/**
 * The cursor is ONE element locked to the pointer (no trailing, so nothing drifts apart):
 * - idle: a small orange dot inside a thin ring;
 * - over anything clickable: the ring collapses into the tip and an ink pen nib turns in and
 *   draws its outline; pressing dips the pen and leaves a small ink blot that fades;
 * - over text fields it steps aside so the native I-beam shows.
 * Mouse only; touch and pen devices keep their native behaviour. Styles live in index.css (.ink-cursor).
 */
export function Cursor() {
  const enabled = useMediaQuery('(hover: hover) and (pointer: fine)');
  const rootRef = useRef<HTMLDivElement>(null);
  const blotsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cursor = rootRef.current;
    const blots = blotsRef.current;
    if (!enabled || !cursor || !blots) return;

    const html = document.documentElement;
    html.classList.add('has-custom-cursor');
    let x = -100;
    let y = -100;
    let frame = 0;

    const paint = () => {
      frame = 0;
      cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    };

    const setState = (target: EventTarget | null) => {
      const el = target instanceof Element ? target : null;
      const disabled = el?.closest(':disabled, [aria-disabled="true"]');
      const state = el?.closest(TEXT)
        ? 'text'
        : el?.closest(INTERACTIVE) && !disabled
          ? 'link'
          : 'idle';
      if (cursor.dataset.state !== state) cursor.dataset.state = state;
    };

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      x = event.clientX;
      y = event.clientY;
      cursor.dataset.visible = 'true';
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onOver = (event: PointerEvent) => {
      setState(event.target);
    };
    const onDown = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      cursor.dataset.pressed = 'true';
      if (cursor.dataset.state !== 'link') return;
      const blot = document.createElement('span');
      blot.className = 'ink-blot';
      blot.style.left = `${event.clientX}px`;
      blot.style.top = `${event.clientY}px`;
      blots.appendChild(blot);
      window.setTimeout(() => {
        blot.remove();
      }, 900);
    };
    const onUp = () => {
      cursor.dataset.pressed = 'false';
    };
    const onLeave = () => {
      cursor.dataset.visible = 'false';
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);

    return () => {
      html.classList.remove('has-custom-cursor');
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <div ref={blotsRef} aria-hidden className="ink-blots" />
      <div ref={rootRef} aria-hidden className="ink-cursor" data-state="idle" data-visible="false">
        <span className="ink-cursor__ring" />
        <span className="ink-cursor__dot" />
        <svg className="ink-cursor__pen" width="24" height="34" viewBox="0 0 24 34" fill="none">
          {/* Nib, drawn pointing up with its tip at (12, 1); CSS turns it to point down-left. */}
          <path
            className="ink-cursor__nib"
            pathLength={1}
            d="M12 1 L18.6 13.2 Q20.4 16.8 18.2 20.4 L16.4 24.5 L7.6 24.5 L5.8 20.4 Q3.6 16.8 5.4 13.2 Z"
          />
          <path className="ink-cursor__slit" pathLength={1} d="M12 2.5 L12 12.4" />
          <circle className="ink-cursor__vent" cx="12" cy="14.6" r="1.5" />
          <path
            className="ink-cursor__grip"
            pathLength={1}
            d="M7.6 24.5 L16.4 24.5 L15.6 33 L8.4 33 Z"
          />
        </svg>
        <span className="ink-cursor__drop" />
      </div>
    </>
  );
}
