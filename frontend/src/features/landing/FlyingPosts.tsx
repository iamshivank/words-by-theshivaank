import { ArrowUpRight } from 'lucide-react';
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { useRef, type CSSProperties } from 'react';
import { Link } from 'react-router';
import { useFlyingEntries } from '@/api/entries';
import type { PublicEntrySummary } from '@/api/types';
import { EASE, Hairline } from '@/design';
import { cn } from '@/lib/cn';
import { formatDate, pad2 } from '@/lib/format';

/**
 * Where each slip rests on wide screens (top in rem, so the section grows only as far as it needs),
 * how deep it sits for parallax, and where it flies in from.
 */
const SLOTS = [
  { left: '2%', top: 3, depth: 1.1, from: { x: -260, y: 120, r: -16 }, tilt: [-2.2, 1] },
  { left: '52%', top: 0, depth: 0.6, from: { x: 280, y: 80, r: 14 }, tilt: [1.6, -1.2] },
  { left: '30%', top: 23, depth: 1.4, from: { x: -120, y: 220, r: 10 }, tilt: [-1, 2] },
  { left: '64%', top: 27, depth: 0.9, from: { x: 300, y: 180, r: -12 }, tilt: [2, -1.6] },
  { left: '5%', top: 44, depth: 0.7, from: { x: -300, y: 160, r: 12 }, tilt: [-1.4, 1.4] },
  { left: '44%', top: 50, depth: 1.2, from: { x: 220, y: 240, r: -9 }, tilt: [1.2, -2] },
] as const;

/** Card height plus room for its hanging label, in rem. */
const SLIP_ROOM = 21;

/** The highlight label, tied below the slip's corner on a thin thread, swaying as the slip drifts. */
function HangingTag({ label, side }: { label: string; side: 'left' | 'right' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flying-tag pointer-events-none absolute top-full flex flex-col items-center',
        side === 'right' ? 'right-10' : 'left-10',
      )}
    >
      <span className="h-5 w-hair bg-accent" />
      <span className="relative border-hair border-accent bg-bg px-2.5 pt-2.5 pb-1.5 text-[0.625rem] font-[500] tracking-[0.18em] text-accent uppercase">
        <span className="absolute top-1 left-1/2 size-[5px] -translate-x-1/2 rounded-full border-hair border-accent" />
        {label}
      </span>
    </span>
  );
}

function Slip({
  entry,
  index,
  className,
  style,
}: {
  entry: PublicEntrySummary;
  index: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Link
      to={`/writing/${entry.slug}`}
      className={cn(
        'group relative block border-hair border-hairline-strong bg-bg p-6 pt-7',
        'transition-[border-color,translate,scale] duration-700 ease-editorial',
        'hover:border-accent-line hover:-translate-y-1 hover:scale-[1.015] focus-visible:border-accent',
        className,
      )}
      style={style}
    >
      <span className="sr-only">{entry.label}: </span>
      <HangingTag label={entry.label} side={index % 2 === 0 ? 'right' : 'left'} />
      <div className="flex items-baseline gap-3">
        <span className="num meta text-accent">{pad2(index + 1)}</span>
        <time dateTime={entry.publishedAt} className="meta">
          {formatDate(entry.publishedAt)}
        </time>
      </div>
      <h3 className="mt-4 font-serif text-h3 leading-[1.08] font-[320] tracking-tight text-ink">
        {entry.title}
      </h3>
      {entry.excerpt && <p className="mt-3 line-clamp-2 text-ui text-muted">{entry.excerpt}</p>}
      <div className="mt-6 flex items-center justify-between">
        <span className="meta">{entry.readingTimeMinutes} min read</span>
        <ArrowUpRight
          aria-hidden
          strokeWidth={1.25}
          className="size-4 text-muted transition-[color,translate] duration-700 ease-editorial group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent"
        />
      </div>
      <span
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-hair origin-left scale-x-0 bg-accent transition-transform duration-700 ease-editorial group-hover:scale-x-100"
      />
    </Link>
  );
}

function FlyingSlot({
  entry,
  index,
  progress,
}: {
  entry: PublicEntrySummary;
  index: number;
  progress: MotionValue<number>;
}) {
  const slot = SLOTS[index % SLOTS.length] ?? SLOTS[0];
  const y = useTransform(progress, [0, 1], [90 * slot.depth, -90 * slot.depth]);
  return (
    <motion.div
      className="absolute w-[34%] max-w-md focus-within:z-50! hover:z-50!"
      style={{ left: slot.left, top: `${slot.top}rem`, y, zIndex: 10 + index }}
    >
      <motion.div
        initial={{ opacity: 0, x: slot.from.x, y: slot.from.y, rotate: slot.from.r, scale: 0.92 }}
        whileInView={{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 }}
        viewport={{ once: true, margin: '0px 0px -10% 0px' }}
        transition={{ duration: 1.6, delay: 0.12 * index, ease: EASE }}
      >
        <div
          className="flying-card"
          style={
            {
              '--drift-duration': `${11 + index * 2.3}s`,
              '--drift-delay': `${-index * 1.7}s`,
              '--drift-x': `${8 + (index % 3) * 4}px`,
              '--drift-y': `${10 + (index % 2) * 6}px`,
              '--tilt-a': `${slot.tilt[0]}deg`,
              '--tilt-b': `${slot.tilt[1]}deg`,
            } as CSSProperties
          }
        >
          <Slip entry={entry} index={index} />
        </div>
      </motion.div>
    </motion.div>
  );
}

/** "In flight": the latest and featured essays drift across the page, each with its label attached. */
export function FlyingPosts() {
  const { data } = useFlyingEntries(6);
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  if (!data || data.length === 0) return null;
  const entries = data.slice(0, SLOTS.length);

  return (
    <section id="in-flight" ref={ref} aria-labelledby="in-flight-title" className="relative py-24">
      <div className="mx-auto max-w-7xl px-(--gutter)">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="meta">Fresh from the desk</p>
            <h2 id="in-flight-title" className="mt-3 text-h1">
              In <em className="font-[280]">flight</em>
            </h2>
          </div>
          <Link to="/writing" className="group relative pb-1 meta transition-colors hover:text-ink">
            All writing
            <span className="absolute inset-x-0 bottom-0 h-hair origin-left scale-x-0 bg-accent transition-transform duration-700 group-hover:scale-x-100" />
          </Link>
        </div>
        <Hairline draw="view" className="mt-8" />

        {/* Wide screens: slips scattered across the page, drifting at different depths. */}
        <div
          className="relative mt-16 hidden md:block"
          style={{
            height: `${Math.max(...entries.map((_, i) => SLOTS[i]?.top ?? 0)) + SLIP_ROOM}rem`,
          }}
        >
          {entries.map((entry, index) => (
            <FlyingSlot key={entry.slug} entry={entry} index={index} progress={scrollYProgress} />
          ))}
        </div>

        {/* Phones: a horizontal run of slips, still gently drifting. */}
        <div className="-mx-(--gutter) mt-12 flex snap-x snap-mandatory gap-5 overflow-x-auto px-(--gutter) pt-8 pb-10 md:hidden">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.slug}
              className="w-[82%] shrink-0 snap-center"
              initial={{ opacity: 0, x: 80, rotate: 6 }}
              whileInView={{ opacity: 1, x: 0, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.2, delay: 0.08 * index, ease: EASE }}
            >
              <div
                className="flying-card"
                style={
                  {
                    '--drift-duration': `${10 + index * 2}s`,
                    '--drift-x': '4px',
                    '--drift-y': '6px',
                  } as CSSProperties
                }
              >
                <Slip entry={entry} index={index} />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
