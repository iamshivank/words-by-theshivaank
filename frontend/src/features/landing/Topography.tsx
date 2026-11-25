import { useEffect, useRef } from 'react';

type Peak = { x: number; y: number; rings: number; spacing: number; phase: number; speed: number };

const PEAKS: Peak[] = [
  { x: 0.72, y: 0.38, rings: 26, spacing: 22, phase: 0.4, speed: 0.06 },
  { x: 0.18, y: 0.78, rings: 18, spacing: 26, phase: 2.1, speed: -0.045 },
  { x: 0.95, y: 0.95, rings: 14, spacing: 30, phase: 4.2, speed: 0.035 },
];

/**
 * Thin orange contour lines drifting slowly, like a topographic map breathing: the fallback hero
 * background until a photograph is set in Settings. Draws once (no animation) for reduced motion,
 * pauses when off screen, and re-reads the accent colour when the theme changes.
 */
export function Topography({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let accent = '#ff6a1a';
    let width = 0;
    let height = 0;
    let frame = 0;
    let visible = true;
    let last = 0;
    const start = performance.now();

    const readAccent = () => {
      accent =
        getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || accent;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (time: number) => {
      const t = (time - start) / 1000;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 0.7;
      const scale = Math.max(width, height) / 1400;
      for (const peak of PEAKS) {
        const cx = peak.x * width;
        const cy = peak.y * height;
        for (let ring = 1; ring <= peak.rings; ring++) {
          const base = ring * peak.spacing * scale * 1.6;
          ctx.globalAlpha = Math.max(0.04, 0.42 - ring * 0.014);
          ctx.beginPath();
          const steps = 120;
          for (let i = 0; i <= steps; i++) {
            const a = (i / steps) * Math.PI * 2;
            const wobble =
              Math.sin(a * 3 + peak.phase + t * peak.speed + ring * 0.21) * 9 +
              Math.sin(a * 5 - peak.phase * 1.3 - t * peak.speed * 1.7 + ring * 0.13) * 5 +
              Math.sin(a * 2 + ring * 0.35 + t * peak.speed * 0.6) * ring * 0.9;
            const r = base + wobble * scale * 1.4;
            const px = cx + Math.cos(a) * r * 1.18;
            const py = cy + Math.sin(a) * r * 0.82;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = (time: number) => {
      frame = 0;
      if (!visible) return;
      // About 30 frames a second is plenty for something this slow.
      if (time - last > 33) {
        last = time;
        draw(time);
      }
      frame = requestAnimationFrame(loop);
    };

    readAccent();
    resize();
    draw(start + 8000);
    if (!reduce) frame = requestAnimationFrame(loop);

    const ro = new ResizeObserver(() => {
      resize();
      draw(performance.now());
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (visible && !reduce && !frame) frame = requestAnimationFrame(loop);
    });
    io.observe(canvas);
    const mo = new MutationObserver(() => {
      readAccent();
      draw(performance.now());
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'style'],
    });

    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className={className} />;
}
