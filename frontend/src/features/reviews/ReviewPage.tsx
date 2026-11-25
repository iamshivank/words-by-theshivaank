import { addMonths, endOfWeek, format, startOfWeek } from 'date-fns';
import { useState } from 'react';
import { useMonthStats, useOverview } from '@/api/desk';
import { useSiteSettings } from '@/api/settings';
import { Button, Hairline, LoadingLine, SectionLabel, Segmented, Textarea } from '@/design';
import { ProgressLine, WeekChart } from '@/features/desk/charts';
import { DeskHeading } from '@/features/desk/DeskLayout';
import { useStartEntry } from '@/features/editor/useStartEntry';
import { formatDate, formatNumber, MOOD_WORDS } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';

const WEEKLY = [
  { key: 'wins', label: 'Wins', placeholder: 'What went well, however small?' },
  { key: 'struggles', label: 'Struggles', placeholder: 'What was hard? What did you avoid?' },
  { key: 'lessons', label: 'Lessons', placeholder: 'What would you tell yourself last Monday?' },
  { key: 'focus', label: 'Focus for next week', placeholder: 'One or two things that matter most' },
] as const;

const MONTHLY = [
  {
    key: 'story',
    label: 'The story of the month',
    placeholder: 'If this month were a chapter, what was it about?',
  },
  { key: 'proud', label: 'Proud of', placeholder: '' },
  { key: 'change', label: 'Change next month', placeholder: 'One habit to start, one to stop' },
] as const;

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toHtml(sections: { label: string; text: string }[], intro: string): string {
  const body = sections
    .filter((s) => s.text.trim())
    .map(
      (s) =>
        `<h2>${escape(s.label)}</h2>${s.text
          .trim()
          .split(/\n\s*\n/)
          .map((p) => `<p>${escape(p)}</p>`)
          .join('')}`,
    )
    .join('');
  return `<p><em>${escape(intro)}</em></p>${body}`;
}

function Weekly() {
  const overview = useOverview();
  const { start, isPending } = useStartEntry();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const from = startOfWeek(new Date(), { weekStartsOn: 1 });
  const to = endOfWeek(new Date(), { weekStartsOn: 1 });
  const week = overview.data?.week ?? [];
  const words = week.reduce((s, d) => s + d.words, 0);
  const days = week.filter((d) => d.words > 0 || d.entries > 0).length;
  const moods = week.filter((d) => d.mood).map((d) => d.mood ?? 0);
  const mood = moods.length
    ? MOOD_WORDS[Math.round(moods.reduce((a, b) => a + b, 0) / moods.length)]
    : '—';
  const intro = `Week of ${format(from, 'd MMM')} to ${format(to, 'd MMM yyyy')}: ${formatNumber(words)} words on ${days} of 7 days. Mood: ${mood}.`;

  return (
    <div className="grid gap-16 lg:grid-cols-[1fr_20rem]">
      <div className="flex flex-col gap-10">
        {WEEKLY.map((q) => (
          <Textarea
            key={q.key}
            label={q.label}
            placeholder={q.placeholder}
            rows={4}
            value={answers[q.key] ?? ''}
            onChange={(e) => {
              setAnswers((a) => ({ ...a, [q.key]: e.target.value }));
            }}
          />
        ))}
        <div>
          <Button
            busy={isPending}
            onClick={() => {
              start('journal', {
                title: `Weekly review, ${format(from, 'd MMM')}`,
                html: toHtml(
                  WEEKLY.map((q) => ({ label: q.label, text: answers[q.key] ?? '' })),
                  intro,
                ),
              });
            }}
          >
            Save as journal entry
          </Button>
        </div>
      </div>
      <aside className="flex flex-col gap-6">
        <SectionLabel>The last seven days</SectionLabel>
        {overview.isPending ? <LoadingLine /> : <WeekChart days={week} />}
        <p className="text-ui text-muted">{intro}</p>
      </aside>
    </div>
  );
}

function Monthly() {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const stats = useMonthStats(month);
  const { start, isPending } = useStartEntry();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const s = stats.data;
  const label = format(new Date(`${month}-01T12:00:00`), 'MMMM yyyy');
  const intro = s
    ? `${label}: ${formatNumber(s.words)} words, ${s.entries} entries, written on ${s.activeDays} days, ${s.minutes} minutes at the desk. Average mood ${s.averageMood ? MOOD_WORDS[Math.round(s.averageMood)] : 'not recorded'}. Decisions logged: ${s.decisionsLogged}, reviewed: ${s.decisionsReviewed}.`
    : '';

  return (
    <div className="flex flex-col gap-12">
      <div className="flex items-center gap-6">
        <Button
          variant="text"
          size="sm"
          onClick={() => {
            setMonth(format(addMonths(new Date(`${month}-01T12:00:00`), -1), 'yyyy-MM'));
          }}
        >
          Earlier
        </Button>
        <span className="font-serif text-h3 text-ink">{label}</span>
        <Button
          variant="text"
          size="sm"
          disabled={month >= format(new Date(), 'yyyy-MM')}
          onClick={() => {
            setMonth(format(addMonths(new Date(`${month}-01T12:00:00`), 1), 'yyyy-MM'));
          }}
        >
          Later
        </Button>
      </div>
      {stats.isPending && <LoadingLine />}
      {s && (
        <dl className="border-y-hair grid gap-8 border-hairline py-8 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ['Words', formatNumber(s.words)],
            ['Entries', s.entries],
            ['Days written', `${s.activeDays}/${s.days.length}`],
            ['Longest run', `${s.streak.longest}d`],
            ['Mood', s.averageMood ? MOOD_WORDS[Math.round(s.averageMood)] : '—'],
            ['Decisions reviewed', s.decisionsReviewed],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <dt className="meta">{k}</dt>
              <dd className="mt-2 num text-h3 font-[300] text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      )}
      {s && (
        <div className="grid gap-12 md:grid-cols-2">
          <div className="flex flex-col gap-4">
            <SectionLabel>Days written</SectionLabel>
            <ProgressLine value={s.activeDays} target={s.days.length} />
            {s.bestDay && (
              <p className="text-ui text-muted">
                Best day: <span className="text-ink">{formatDate(s.bestDay.date)}</span>,{' '}
                {formatNumber(s.bestDay.words)} words.
              </p>
            )}
          </div>
          <div className="flex flex-col gap-4">
            <SectionLabel>What you wrote about</SectionLabel>
            {s.topTags.length === 0 ? (
              <p className="text-ui text-muted">No tags this month.</p>
            ) : (
              <ul className="flex flex-wrap gap-x-5 gap-y-2">
                {s.topTags.map((t) => (
                  <li key={t.name} className="text-ui text-ink">
                    {t.name} <span className="num text-muted">{t.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      <Hairline />
      <div className="flex flex-col gap-10">
        {MONTHLY.map((q) => (
          <Textarea
            key={q.key}
            label={q.label}
            placeholder={q.placeholder}
            rows={4}
            value={answers[q.key] ?? ''}
            onChange={(e) => {
              setAnswers((a) => ({ ...a, [q.key]: e.target.value }));
            }}
          />
        ))}
        <div>
          <Button
            busy={isPending}
            disabled={!s}
            onClick={() => {
              start('journal', {
                title: `Monthly review, ${label}`,
                html: toHtml(
                  MONTHLY.map((q) => ({ label: q.label, text: answers[q.key] ?? '' })),
                  intro,
                ),
              });
            }}
          >
            Save as journal entry
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ReviewPage() {
  const settings = useSiteSettings();
  useDocumentTitle('Reviews', settings.siteName);
  const [tab, setTab] = useState<'weekly' | 'monthly'>('weekly');
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12">
      <DeskHeading eyebrow="Look back to look ahead" title="Reviews">
        <Segmented
          label="Review"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
          ]}
        />
      </DeskHeading>
      {tab === 'weekly' ? <Weekly /> : <Monthly />}
    </div>
  );
}
