import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useIsOwner } from '@/api/auth';
import { usePublicQuotes, useStreak } from '@/api/desk';
import { usePublicStats } from '@/api/entries';
import { usePreferences, useSiteSettings } from '@/api/settings';
import { EASE, Hairline, ThemeToggle, Wordmark } from '@/design';
import { PublicNav } from '@/features/public/PublicShell';
import { formatClock, formatLongDate, HOME_CITY, useNow } from '@/lib/time';
import { Topography } from './Topography';

function RotatingQuote() {
  const { data: quotes } = usePublicQuotes(8);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!quotes || quotes.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % quotes.length);
    }, 9000);
    return () => {
      window.clearInterval(timer);
    };
  }, [quotes]);
  const quote = quotes?.[index];
  return (
    <div className="relative min-h-[5.5rem] max-w-[46ch]" aria-live="polite">
      <AnimatePresence mode="wait">
        {quote && (
          <motion.figure
            key={quote.text}
            initial={{ opacity: 0, y: 6, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
            transition={{ duration: 1.1, ease: EASE }}
          >
            <blockquote className="font-serif text-h4 leading-snug font-[300] text-ink/90 italic">
              “{quote.text}”
            </blockquote>
            <figcaption className="mt-3 meta">
              {quote.author}
              {quote.source && <span className="normal-case"> · {quote.source}</span>}
            </figcaption>
          </motion.figure>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Full-viewport opening: photograph (or drifting contours), the wordmark, and an editorial frame. */
export function Hero() {
  const settings = useSiteSettings();
  const prefs = usePreferences();
  const isOwner = useIsOwner();
  const streak = useStreak(isOwner && prefs.showStreakOnLanding);
  const stats = usePublicStats();
  const now = useNow();
  const ref = useRef<HTMLElement>(null);

  // Parallax: the background sinks slower than the page scrolls.
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '22%']);
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '-12%']);
  const fade = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  // A faint light that follows the cursor.
  const mx = useMotionValue(70);
  const my = useMotionValue(40);
  const sx = useSpring(mx, { stiffness: 40, damping: 20 });
  const sy = useSpring(my, { stiffness: 40, damping: 20 });
  const light = useMotionTemplate`radial-gradient(38rem circle at ${sx}% ${sy}%, color-mix(in oklab, var(--accent) 16%, transparent), transparent 70%)`;

  const fadeIn = (delay: number) => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 1.2, delay, ease: EASE },
  });
  const image = settings.hero.imageUrl;
  const issue = stats.data?.published ?? 0;

  return (
    <section
      ref={ref}
      className="relative isolate flex min-h-dvh flex-col overflow-hidden"
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        mx.set(((e.clientX - rect.left) / rect.width) * 100);
        my.set(((e.clientY - rect.top) / rect.height) * 100);
      }}
    >
      <motion.div aria-hidden className="absolute inset-0 -z-20 h-[120%]" style={{ y: bgY }}>
        {image ? (
          <img src={image} alt="" className="size-full object-cover" fetchPriority="high" />
        ) : (
          <Topography className="size-full" />
        )}
      </motion.div>
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background: `linear-gradient(180deg, color-mix(in oklab, var(--bg) ${Math.round(settings.hero.overlayDarkness * 70)}%, transparent) 0%, color-mix(in oklab, var(--bg) ${Math.round(settings.hero.overlayDarkness * 100)}%, transparent) 55%, var(--bg) 100%)`,
        }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: light }}
      />

      <motion.div
        className="flex flex-1 flex-col px-(--frame) pt-(--frame)"
        style={{ y: contentY, opacity: fade }}
      >
        <header className="flex flex-col gap-4">
          <motion.div {...fadeIn(1.1)} className="flex items-baseline justify-between gap-6">
            <div className="flex items-baseline gap-5">
              <time dateTime={now.toISOString()} className="hidden meta sm:inline">
                {formatLongDate(now)}
              </time>
              <span className="num meta text-ink">No. {String(issue).padStart(3, '0')}</span>
            </div>
            <div className="flex items-baseline gap-6">
              <span className="hidden meta lg:inline">
                {HOME_CITY} <span className="ml-1 num text-ink">{formatClock(now)}</span>
              </span>
              <PublicNav />
              <ThemeToggle className="hidden md:inline-flex" />
            </div>
          </motion.div>
          <Hairline draw="mount" delay={0.2} duration={1.6} />
        </header>

        <div className="flex flex-1 items-center py-16">
          <Wordmark as="h1" size="hero" animate />
        </div>

        <footer className="flex flex-col gap-4 pb-(--frame)">
          <Hairline draw="mount" delay={0.35} duration={1.6} origin="end" />
          <motion.div
            {...fadeIn(1.5)}
            className="flex flex-col justify-between gap-8 md:flex-row md:items-end"
          >
            <RotatingQuote />
            <div className="flex items-end gap-8">
              {isOwner && (
                <Link to="/desk" className="group flex flex-col items-end gap-1">
                  {prefs.showStreakOnLanding && streak.data && (
                    <span className="num text-h4 text-ink">
                      {streak.data.current}
                      <span className="ml-2 meta">day streak</span>
                    </span>
                  )}
                  <span className="relative meta transition-colors group-hover:text-accent">
                    Enter the Desk
                    <span className="absolute inset-x-0 -bottom-px h-hair origin-left scale-x-0 bg-accent transition-transform duration-700 group-hover:scale-x-100" />
                  </span>
                </Link>
              )}
              <a
                href="#in-flight"
                className="hidden flex-col items-center gap-3 meta md:flex"
                aria-label="Scroll to the writing"
              >
                Scroll
                <span className="relative h-14 w-hair overflow-hidden bg-hairline">
                  <motion.span
                    className="absolute inset-x-0 h-1/2 bg-accent"
                    animate={{ top: ['-50%', '100%'] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
                  />
                </span>
              </a>
            </div>
          </motion.div>
        </footer>
      </motion.div>
    </section>
  );
}
