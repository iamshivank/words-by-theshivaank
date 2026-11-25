import { format, getDay, parseISO } from 'date-fns';
import { motion } from 'motion/react';
import { useState } from 'react';
import type { Day } from '@/api/types';
import { formatNumber, MOOD_WORDS } from '@/lib/format';

/**
 * A year of writing as a calendar: thin outlined squares, filled with the accent at an opacity that
 * follows the words written that day.
 */
export function Heatmap({ days, goal }: { days: Day[]; goal: number }) {
  const [hover, setHover] = useState<Day | null>(null);
  if (days.length === 0) return null;
  const first = parseISO(days[0]?.date ?? '');
  const lead = (getDay(first) + 6) % 7; // weeks start on Monday
  const cells: (Day | null)[] = [...Array<null>(lead).fill(null), ...days];
  const weeks: (Day | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const max = Math.max(goal, ...days.map((d) => d.words), 1);
  const size = 11;
  const gap = 3;
  const months: { x: number; label: string }[] = [];
  weeks.forEach((week, w) => {
    const day = week.find((d) => d !== null);
    if (day && parseISO(day.date).getDate() <= 7)
      months.push({ x: w * (size + gap), label: format(parseISO(day.date), 'MMM') });
  });
  const total = days.reduce((sum, d) => sum + d.words, 0);
  const activeDays = days.filter((d) => d.words > 0 || d.entries > 0).length;

  return (
    <figure className="flex flex-col gap-4">
      <div className="overflow-x-auto pb-2">
        <svg
          role="img"
          aria-label={`${formatNumber(total)} words over the last year, on ${activeDays} days`}
          width={weeks.length * (size + gap)}
          height={7 * (size + gap) + 18}
          className="block"
        >
          {months.map((m) => (
            <text
              key={`${m.x}-${m.label}`}
              x={m.x}
              y={10}
              className="fill-(--text-muted) text-[9px] tracking-[0.12em] uppercase"
            >
              {m.label}
            </text>
          ))}
          <g transform="translate(0 18)">
            {weeks.map((week, w) =>
              week.map((day, d) => {
                if (!day) return null;
                const intensity =
                  day.words > 0
                    ? 0.18 + 0.82 * Math.min(1, day.words / max)
                    : day.entries > 0
                      ? 0.12
                      : 0;
                return (
                  <rect
                    key={day.date}
                    x={w * (size + gap) + 0.5}
                    y={d * (size + gap) + 0.5}
                    width={size - 1}
                    height={size - 1}
                    rx={1}
                    className="transition-[stroke] duration-300"
                    fill="var(--accent)"
                    fillOpacity={intensity}
                    stroke={hover?.date === day.date ? 'var(--accent)' : 'var(--hairline-strong)'}
                    strokeWidth={0.75}
                    onPointerEnter={() => {
                      setHover(day);
                    }}
                    onPointerLeave={() => {
                      setHover(null);
                    }}
                  >
                    <title>{`${format(parseISO(day.date), 'd MMM yyyy')}: ${formatNumber(day.words)} words`}</title>
                  </rect>
                );
              }),
            )}
          </g>
        </svg>
      </div>
      <figcaption className="flex min-h-5 flex-wrap items-baseline justify-between gap-4 text-ui text-muted">
        {hover ? (
          <span>
            <span className="text-ink">{format(parseISO(hover.date), 'EEEE d MMMM')}</span> ·{' '}
            <span className="num">{formatNumber(hover.words)}</span> words
            {hover.mood ? ` · ${MOOD_WORDS[Math.round(hover.mood)] ?? ''}` : ''}
          </span>
        ) : (
          <span>
            <span className="num text-ink">{formatNumber(total)}</span> words on{' '}
            <span className="num text-ink">{activeDays}</span> days
          </span>
        )}
        <span className="flex items-center gap-1.5">
          Less
          {[0, 0.25, 0.5, 0.75, 1].map((o) => (
            <span
              key={o}
              className="inline-block size-2.5 rounded-[1px] border-hair border-hairline-strong"
              style={{
                backgroundColor: `color-mix(in oklab, var(--accent) ${o * 100}%, transparent)`,
              }}
            />
          ))}
          More
        </span>
      </figcaption>
    </figure>
  );
}

/** Seven thin bars for words, and a thin line for mood across them. */
export function WeekChart({ days }: { days: Day[] }) {
  const width = 320;
  const height = 120;
  const max = Math.max(...days.map((d) => d.words), 1);
  const step = width / days.length;
  const moodPoints = days
    .map((d, i) =>
      d.mood
        ? { x: i * step + step / 2, y: height - 14 - ((d.mood - 1) / 4) * (height - 34) }
        : null,
    )
    .filter((p): p is { x: number; y: number } => p !== null);
  const path = moodPoints
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height + 16}`}
      className="w-full"
      role="img"
      aria-label="Words and mood over the last seven days"
    >
      {days.map((d, i) => {
        const h = d.words > 0 ? Math.max(2, (d.words / max) * (height - 24)) : 0;
        const x = i * step + step / 2;
        return (
          <g key={d.date}>
            <line
              x1={x}
              x2={x}
              y1={height - 4}
              y2={height - 4 - (height - 24)}
              stroke="var(--hairline)"
              strokeWidth={1}
            />
            <motion.line
              x1={x}
              x2={x}
              y1={height - 4}
              stroke="var(--accent)"
              strokeWidth={2}
              initial={{ y2: height - 4 }}
              animate={{ y2: height - 4 - h }}
              transition={{ duration: 1.1, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <title>{`${format(parseISO(d.date), 'EEE d MMM')}: ${d.words} words`}</title>
            </motion.line>
            <text
              x={x}
              y={height + 12}
              textAnchor="middle"
              className="fill-(--text-muted) text-[9px] tracking-[0.12em] uppercase"
            >
              {format(parseISO(d.date), 'EEEEE')}
            </text>
          </g>
        );
      })}
      {moodPoints.length > 1 && (
        <motion.path
          d={path}
          fill="none"
          stroke="var(--text)"
          strokeWidth={0.9}
          strokeDasharray="3 3"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
        />
      )}
      {moodPoints.map((p) => (
        <circle
          key={`${p.x}`}
          cx={p.x}
          cy={p.y}
          r={2.2}
          fill="var(--bg)"
          stroke="var(--text)"
          strokeWidth={0.9}
        />
      ))}
    </svg>
  );
}

/** A thin progress line with the number above it. */
export function ProgressLine({
  value,
  target,
  label,
}: {
  value: number;
  target: number;
  label?: string;
}) {
  const ratio = target > 0 ? Math.min(1, value / target) : 0;
  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-ui text-ink">{label}</span>
          <span className="num text-ui text-muted">
            {formatNumber(value)} / {formatNumber(target)}
          </span>
        </div>
      )}
      <div
        className="relative h-hair w-full bg-hairline-strong"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={target}
        aria-valuenow={value}
        aria-label={label}
      >
        <motion.span
          className="absolute inset-y-0 left-0 bg-accent"
          initial={{ width: 0 }}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        />
        {ratio >= 1 && (
          <span className="absolute -top-[3px] right-0 size-[7px] rounded-full bg-accent" />
        )}
      </div>
    </div>
  );
}
