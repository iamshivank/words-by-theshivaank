import { ArrowRight, Shuffle } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router';
import {
  useDueDecisions,
  useGoals,
  useHeatmap,
  useOverview,
  useRandomQuote,
  useShufflePrompt,
  useTodayPrompt,
} from '@/api/desk';
import { useEntries } from '@/api/entries';
import { usePreferences, useSiteSettings } from '@/api/settings';
import { Button, EASE, Hairline, LoadingLine, SectionLabel } from '@/design';
import { useStartEntry } from '@/features/editor/useStartEntry';
import { formatAgo, formatDate, formatNumber, MOOD_WORDS, plural } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';
import { formatLongDate, greetingFor, useNow } from '@/lib/time';
import { Heatmap, ProgressLine, WeekChart } from './charts';

const reveal = (delay: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, delay, ease: EASE },
});

function Stat({ label, value, unit }: { label: string; value: number | string; unit?: string }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="meta">{label}</span>
      <span className="num text-h2 leading-none font-[300] text-ink">
        {typeof value === 'number' ? formatNumber(value) : value}
        {unit && <span className="ml-2 meta">{unit}</span>}
      </span>
    </div>
  );
}

function TodayPrompt() {
  const prompt = useTodayPrompt();
  const shuffle = useShufflePrompt();
  const { start, isPending } = useStartEntry();
  return (
    <section aria-labelledby="prompt-title" className="flex flex-col gap-5">
      <SectionLabel index="01">
        <span id="prompt-title">Today&rsquo;s prompt</span>
      </SectionLabel>
      <p className="max-w-[30ch] font-serif text-h3 leading-[1.15] font-[300] text-ink italic">
        {prompt.data?.text ?? '…'}
      </p>
      <div className="flex flex-wrap items-center gap-6">
        <Button
          busy={isPending}
          busyLabel="Opening"
          disabled={!prompt.data}
          onClick={() => {
            if (prompt.data) start('journal', { prompt: prompt.data.text });
          }}
        >
          Write about this
        </Button>
        <Button
          variant="text"
          size="sm"
          icon={<Shuffle aria-hidden className="size-3.5" strokeWidth={1.25} />}
          onClick={() => {
            shuffle.mutate();
          }}
          busy={shuffle.isPending}
        >
          Another
        </Button>
      </div>
    </section>
  );
}

/** The Desk's front page: greeting, prompt, streak, a year of writing, the week, goals and what is due. */
export function DeskPage() {
  const settings = useSiteSettings();
  const prefs = usePreferences();
  useDocumentTitle('Desk', settings.siteName);
  const now = useNow();
  const overview = useOverview();
  const heatmap = useHeatmap();
  const goals = useGoals();
  const due = useDueDecisions();
  const recent = useEntries({ size: 6, sort: 'updated' });
  const quote = useRandomQuote('editor');
  const { start, isPending } = useStartEntry();
  const o = overview.data;
  const weekWords = o?.week.reduce((s, d) => s + d.words, 0) ?? 0;
  const weekMinutes = o?.week.reduce((s, d) => s + d.minutes, 0) ?? 0;
  const weekEntries = o?.week.reduce((s, d) => s + d.entries, 0) ?? 0;
  const moods = o?.week.filter((d) => d.mood !== null).map((d) => d.mood ?? 0) ?? [];
  const avgMood = moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-20">
      <motion.header {...reveal(0)} className="flex flex-col gap-6">
        <time dateTime={now.toISOString()} className="meta">
          {formatLongDate(now)}
        </time>
        <h1 className="text-display leading-[0.98]">
          {greetingFor(now)}, <em className="font-[280]">{settings.displayName}</em>.
        </h1>
        {quote.data && (
          <p className="max-w-[52ch] font-serif text-h4 font-[300] text-muted italic">
            “{quote.data.text}” <span className="meta not-italic">— {quote.data.author}</span>
          </p>
        )}
        <div className="mt-2 flex flex-wrap gap-4">
          <Button
            busy={isPending}
            onClick={() => {
              start('journal');
            }}
          >
            New journal entry
          </Button>
          <Button
            variant="text"
            onClick={() => {
              start('essay');
            }}
          >
            New essay
          </Button>
          <Button
            variant="text"
            onClick={() => {
              start('note');
            }}
          >
            New note
          </Button>
          <Link
            to="/desk/decisions?new=1"
            className="inline-flex items-center py-1.5 meta transition-colors hover:text-ink"
          >
            Log a decision
          </Link>
        </div>
      </motion.header>

      {overview.isPending && <LoadingLine />}

      {o && (
        <motion.section
          {...reveal(0.1)}
          aria-label="Streak and today"
          className="border-y-hair grid gap-10 border-hairline py-10 sm:grid-cols-2 lg:grid-cols-4"
        >
          <div className="flex flex-col gap-2">
            <span className="meta">Current streak</span>
            <span className="num text-h1 leading-none font-[300] text-ink">
              {o.streak.current}
              <span className="ml-2 meta">{o.streak.current === 1 ? 'day' : 'days'}</span>
            </span>
            <span className="h-hair w-16 bg-accent" />
            <span className="text-ui text-muted">
              {o.streak.writtenToday ? 'Today is counted.' : 'Write today to keep it.'}
            </span>
          </div>
          <Stat label="Longest streak" value={o.streak.longest} unit="days" />
          <div className="flex flex-col gap-3">
            <Stat label="Today" value={o.today.words} unit="words" />
            {o.dailyWordGoal > 0 && <ProgressLine value={o.today.words} target={o.dailyWordGoal} />}
          </div>
          <Stat label="All time" value={o.totals.words} unit="words" />
        </motion.section>
      )}

      <div className="grid gap-16 lg:grid-cols-[1.1fr_1fr]">
        {prefs.dailyPrompt ? <TodayPrompt /> : <div />}
        <section aria-labelledby="week-title" className="flex flex-col gap-5">
          <SectionLabel index="02">
            <span id="week-title">This week</span>
          </SectionLabel>
          {o && <WeekChart days={o.week} />}
          <dl className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <div>
              <dt className="meta">Words</dt>
              <dd className="num text-h4 text-ink">{formatNumber(weekWords)}</dd>
            </div>
            <div>
              <dt className="meta">Entries</dt>
              <dd className="num text-h4 text-ink">{weekEntries}</dd>
            </div>
            <div>
              <dt className="meta">Minutes</dt>
              <dd className="num text-h4 text-ink">{weekMinutes}</dd>
            </div>
            <div>
              <dt className="meta">Mood</dt>
              <dd className="text-h4 text-ink">
                {avgMood ? MOOD_WORDS[Math.round(avgMood)] : '—'}
              </dd>
            </div>
          </dl>
        </section>
      </div>

      <section aria-labelledby="year-title" className="flex flex-col gap-6">
        <SectionLabel index="03">
          <span id="year-title">The year</span>
        </SectionLabel>
        {heatmap.data ? (
          <Heatmap days={heatmap.data} goal={o?.dailyWordGoal ?? 500} />
        ) : (
          <LoadingLine />
        )}
      </section>

      <div className="grid gap-16 lg:grid-cols-2">
        <section aria-labelledby="goals-title" className="flex flex-col gap-6">
          <div className="flex items-baseline justify-between">
            <SectionLabel index="04">
              <span id="goals-title">Goals</span>
            </SectionLabel>
            <Link to="/desk/goals" className="meta transition-colors hover:text-ink">
              Manage
            </Link>
          </div>
          {goals.data?.length === 0 && (
            <p className="text-ui text-muted">
              No goals for now.{' '}
              <Link
                to="/desk/goals"
                className="text-ink underline decoration-accent decoration-1 underline-offset-4"
              >
                Set one for this month.
              </Link>
            </p>
          )}
          <div className="flex flex-col gap-6">
            {goals.data?.map((g) => (
              <ProgressLine key={g.id} label={g.title} value={g.progress} target={g.target} />
            ))}
          </div>
        </section>

        <section aria-labelledby="due-title" className="flex flex-col gap-6">
          <div className="flex items-baseline justify-between">
            <SectionLabel index="05">
              <span id="due-title">Decisions due</span>
            </SectionLabel>
            <Link to="/desk/decisions" className="meta transition-colors hover:text-ink">
              All decisions
            </Link>
          </div>
          {due.data?.length === 0 && (
            <p className="text-ui text-muted">Nothing waiting for review.</p>
          )}
          <ul>
            {due.data?.map((d) => (
              <li key={d.id}>
                <Link
                  to={`/desk/decisions?review=${d.id}`}
                  className="group flex items-baseline justify-between gap-4 py-3"
                >
                  <span className="font-serif text-h4 text-ink transition-colors group-hover:text-accent">
                    {d.title}
                  </span>
                  <span className="meta whitespace-nowrap">Due {formatDate(d.reviewOn)}</span>
                </Link>
                <Hairline />
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section aria-labelledby="recent-title" className="flex flex-col gap-6">
        <SectionLabel index="06">
          <span id="recent-title">Recently touched</span>
        </SectionLabel>
        <ul>
          {recent.data?.items.map((e) => (
            <li key={e.id}>
              <Link
                to={`/desk/write/${e.id}`}
                className="group grid grid-cols-[5rem_1fr_auto] items-baseline gap-4 py-4"
              >
                <span className="meta">{e.type}</span>
                <span className="truncate font-serif text-h4 text-ink transition-colors group-hover:text-accent">
                  {e.title || <span className="text-muted italic">Untitled</span>}
                </span>
                <span className="flex items-center gap-4">
                  <span className="hidden num meta sm:inline">{plural(e.wordCount, 'word')}</span>
                  <span className="meta whitespace-nowrap">{formatAgo(e.updatedAt)}</span>
                  <ArrowRight
                    aria-hidden
                    className="size-3.5 text-accent opacity-0 transition-opacity group-hover:opacity-100"
                    strokeWidth={1.25}
                  />
                </span>
              </Link>
              <Hairline />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
