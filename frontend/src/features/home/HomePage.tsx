import { motion } from 'motion/react';
import { useIsOwner } from '@/api/auth';
import { useSiteSettings } from '@/api/settings';
import { EASE, Hairline, LinkButton, ThemeToggle, Wordmark } from '@/design';
import { formatClock, formatLongDate, HOME_CITY, useNow } from '@/lib/time';

/**
 * Foundation home: the wordmark inside an editorial frame.
 * Phase 2 replaces this with the full landing page (hero image, quote, latest index).
 */
export function HomePage() {
  const settings = useSiteSettings();
  const isOwner = useIsOwner();
  const now = useNow();

  const fadeIn = (delay: number) => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 1.2, delay, ease: EASE },
  });

  return (
    <main className="relative grid min-h-dvh grid-rows-[auto_1fr_auto] px-(--frame) py-(--frame)">
      <header className="flex flex-col gap-4">
        <motion.div {...fadeIn(1.2)} className="flex items-baseline justify-between gap-6">
          <time dateTime={now.toISOString()} className="meta">
            {formatLongDate(now)}
          </time>
          <div className="flex items-baseline gap-6">
            <span className="hidden meta sm:inline">
              {HOME_CITY} <span className="ml-1 num text-ink">{formatClock(now)}</span>
            </span>
            <ThemeToggle />
          </div>
        </motion.div>
        <Hairline draw="mount" delay={0.2} duration={1.6} />
      </header>

      <section className="flex items-center py-16">
        <Wordmark as="h1" size="hero" animate />
      </section>

      <footer className="flex flex-col gap-4">
        <Hairline draw="mount" delay={0.35} duration={1.6} origin="end" />
        <motion.div
          {...fadeIn(1.5)}
          className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-baseline"
        >
          <p className="max-w-[40ch] font-serif text-h4 font-[300] text-muted italic">
            {settings.tagline}
          </p>
          {isOwner ? (
            <LinkButton to="/desk">Enter the Desk</LinkButton>
          ) : (
            <LinkButton to="/login">Sign in</LinkButton>
          )}
        </motion.div>
      </footer>
    </main>
  );
}
