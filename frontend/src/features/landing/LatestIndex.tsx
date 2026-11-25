import { ArrowRight } from 'lucide-react';
import { AnimatePresence, motion, useMotionValue, useSpring } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import type { PublicEntrySummary } from '@/api/types';
import { EASE, Hairline } from '@/design';
import { formatDate, pad2 } from '@/lib/format';

/** A typographic index of essays. Hovering a row reveals a preview that follows the cursor. */
export function EssayIndex({
  entries,
  numbered = true,
  startAt = 0,
}: {
  entries: PublicEntrySummary[];
  numbered?: boolean;
  startAt?: number;
}) {
  const [hovered, setHovered] = useState<PublicEntrySummary | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 180, damping: 26 });
  const sy = useSpring(y, { stiffness: 180, damping: 26 });

  return (
    <div
      className="relative"
      onPointerMove={(e) => {
        x.set(e.clientX + 24);
        y.set(e.clientY - 60);
      }}
      onPointerLeave={() => {
        setHovered(null);
      }}
    >
      <ol>
        {entries.map((entry, i) => (
          <motion.li
            key={entry.slug}
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '0px 0px -6% 0px' }}
            transition={{ duration: 0.9, delay: Math.min(i, 6) * 0.06, ease: EASE }}
          >
            <Link
              to={`/writing/${entry.slug}`}
              onPointerEnter={() => {
                setHovered(entry);
              }}
              onFocus={() => {
                setHovered(null);
              }}
              className="group grid grid-cols-[2.5rem_1fr] items-baseline gap-x-4 gap-y-2 py-7 sm:grid-cols-[3.5rem_1fr_auto]"
            >
              <span className="num meta text-accent">{numbered ? pad2(startAt + i + 1) : ''}</span>
              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
                  <span className="font-serif text-h3 leading-[1.1] font-[320] tracking-tight text-ink transition-[translate,color] duration-700 ease-editorial group-hover:translate-x-2">
                    {entry.title}
                  </span>
                  {entry.highlightLabel && (
                    <span className="border-accent-line border-hair px-2 py-0.5 text-[0.625rem] tracking-[0.18em] text-accent uppercase">
                      {entry.highlightLabel}
                    </span>
                  )}
                </span>
                {entry.excerpt && (
                  <span className="mt-2 block max-w-[60ch] text-ui text-muted sm:hidden">
                    {entry.excerpt}
                  </span>
                )}
              </span>
              <span className="col-start-2 flex items-center gap-4 sm:col-start-3">
                <time dateTime={entry.publishedAt} className="meta whitespace-nowrap">
                  {formatDate(entry.publishedAt)}
                </time>
                <span className="meta whitespace-nowrap">{entry.readingTimeMinutes} min</span>
                <ArrowRight
                  aria-hidden
                  strokeWidth={1.25}
                  className="size-4 -translate-x-2 text-accent opacity-0 transition-[opacity,translate] duration-700 ease-editorial group-hover:translate-x-0 group-hover:opacity-100"
                />
              </span>
            </Link>
            <Hairline draw="view" />
          </motion.li>
        ))}
      </ol>

      <AnimatePresence>
        {hovered && (
          <motion.div
            key={hovered.slug}
            aria-hidden
            className="pointer-events-none fixed top-0 left-0 z-50 hidden w-72 border-hair border-hairline-strong bg-bg p-4 lg:block"
            style={{ x: sx, y: sy }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            {hovered.coverImageUrl ? (
              <img
                src={hovered.coverImageUrl}
                alt=""
                className="mb-3 aspect-[4/3] w-full object-cover"
              />
            ) : null}
            <p className="line-clamp-4 font-serif text-base leading-snug text-ink italic">
              {hovered.excerpt}
            </p>
            <p className="mt-3 meta">{hovered.tags.map((t) => t.name).join(' · ') || 'Essay'}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
