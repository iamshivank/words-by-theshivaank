import { endOfMonth, format, startOfMonth } from 'date-fns';
import { Trash2 } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { errorMessage } from '@/api/client';
import { useDeleteGoal, useGoals, useSaveGoal } from '@/api/desk';
import { useSiteSettings } from '@/api/settings';
import type { GoalInput, GoalMetric } from '@/api/types';
import {
  Button,
  Hairline,
  Input,
  LoadingLine,
  Notice,
  SectionLabel,
  Select,
  toast,
} from '@/design';
import { ProgressLine } from '@/features/desk/charts';
import { DeskHeading } from '@/features/desk/DeskLayout';
import { formatDate } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';

const METRICS: { value: GoalMetric; label: string; example: string }[] = [
  { value: 'words', label: 'Words written', example: 'Write 20,000 words' },
  { value: 'journal_days', label: 'Days journaled', example: 'Journal every day' },
  { value: 'entries', label: 'Entries', example: 'Finish 4 essays' },
  { value: 'minutes', label: 'Minutes writing', example: '10 hours at the desk' },
  { value: 'streak_days', label: 'Longest streak (days)', example: 'A 30 day streak' },
];

export function GoalsPage() {
  const settings = useSiteSettings();
  useDocumentTitle('Goals', settings.siteName);
  const goals = useGoals('all');
  const save = useSaveGoal();
  const remove = useDeleteGoal();
  const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(new Date()), 'yyyy-MM-dd');
  const [form, setForm] = useState<GoalInput>({
    title: '',
    metric: 'words',
    target: 20000,
    periodStart: monthStart,
    periodEnd: monthEnd,
  });

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const fallback = METRICS.find((m) => m.value === form.metric)?.example ?? 'Goal';
    const title = form.title.trim() ? form.title.trim() : fallback;
    save.mutate(
      { input: { ...form, title } },
      {
        onSuccess: () => {
          toast('Goal set');
          setForm((f) => ({ ...f, title: '' }));
        },
      },
    );
  };

  const active = goals.data?.filter((g) => g.active) ?? [];
  const other = goals.data?.filter((g) => !g.active) ?? [];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-14">
      <DeskHeading eyebrow="What this month is for" title="Goals" />
      <div className="grid gap-16 lg:grid-cols-[1fr_22rem]">
        <section className="flex flex-col gap-8">
          <SectionLabel index="01">In progress</SectionLabel>
          {goals.isPending && <LoadingLine />}
          {active.length === 0 && !goals.isPending && (
            <p className="text-ui text-muted">No goals running right now.</p>
          )}
          {active.map((g) => (
            <div key={g.id} className="flex flex-col gap-2">
              <ProgressLine label={g.title} value={g.progress} target={g.target} />
              <div className="flex items-center justify-between">
                <span className="meta">
                  {formatDate(g.periodStart)} to {formatDate(g.periodEnd)}
                </span>
                <button
                  type="button"
                  aria-label={`Delete ${g.title}`}
                  className="text-muted hover:text-accent"
                  onClick={() => {
                    remove.mutate(g.id);
                  }}
                >
                  <Trash2 aria-hidden className="size-3.5" strokeWidth={1.25} />
                </button>
              </div>
            </div>
          ))}
          {other.length > 0 && (
            <>
              <SectionLabel index="02" className="mt-8">
                Past and upcoming
              </SectionLabel>
              <ul>
                {other.map((g) => (
                  <li key={g.id}>
                    <div className="flex items-baseline justify-between gap-4 py-3">
                      <span className="text-ink">{g.title}</span>
                      <span className="num meta">
                        {Math.round((g.progress / g.target) * 100)}% · {formatDate(g.periodEnd)}
                      </span>
                    </div>
                    <Hairline />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
        <form
          onSubmit={submit}
          className="flex flex-col gap-8 self-start border-hair border-hairline-strong p-6"
        >
          <p className="meta text-ink">New goal</p>
          <Select
            label="Measure"
            value={form.metric}
            onChange={(e) => {
              setForm({ ...form, metric: e.target.value as GoalMetric });
            }}
          >
            {METRICS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
          <Input
            label="Target"
            type="number"
            min={1}
            value={form.target}
            onChange={(e) => {
              setForm({ ...form, target: Number(e.target.value) });
            }}
          />
          <Input
            label="Name"
            value={form.title}
            placeholder={METRICS.find((m) => m.value === form.metric)?.example}
            onChange={(e) => {
              setForm({ ...form, title: e.target.value });
            }}
          />
          <div className="grid grid-cols-2 gap-6">
            <Input
              label="From"
              type="date"
              value={form.periodStart}
              onChange={(e) => {
                setForm({ ...form, periodStart: e.target.value });
              }}
            />
            <Input
              label="To"
              type="date"
              value={form.periodEnd}
              onChange={(e) => {
                setForm({ ...form, periodEnd: e.target.value });
              }}
            />
          </div>
          {save.isError && <Notice tone="error">{errorMessage(save.error)}</Notice>}
          <Button type="submit" busy={save.isPending}>
            Set goal
          </Button>
        </form>
      </div>
    </div>
  );
}
