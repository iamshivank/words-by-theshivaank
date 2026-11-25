import { addMonths, format } from 'date-fns';
import { AnimatePresence, motion } from 'motion/react';
import { useState, type SubmitEvent } from 'react';
import { useSearchParams } from 'react-router';
import { errorMessage } from '@/api/client';
import {
  useCalibration,
  useDecisions,
  useDeleteDecision,
  useReviewDecision,
  useSaveDecision,
} from '@/api/desk';
import { useSiteSettings } from '@/api/settings';
import type { Calibration, Decision, DecisionInput, Verdict } from '@/api/types';
import {
  Button,
  EASE,
  Hairline,
  Input,
  LoadingLine,
  Notice,
  SectionLabel,
  Segmented,
  Textarea,
  toast,
} from '@/design';
import { DeskHeading } from '@/features/desk/DeskLayout';
import { cn } from '@/lib/cn';
import { formatDate } from '@/lib/format';
import { useDocumentTitle } from '@/lib/hooks';

const VERDICTS: { value: Verdict; label: string; note: string }[] = [
  { value: 'good_process_good_outcome', label: 'Good call, good result', note: 'Earned.' },
  { value: 'good_process_bad_outcome', label: 'Good call, bad luck', note: 'Keep the process.' },
  { value: 'bad_process_good_outcome', label: 'Poor call, got lucky', note: 'Do not repeat it.' },
  { value: 'bad_process_bad_outcome', label: 'Poor call, bad result', note: 'Learn the lesson.' },
];

function DecisionForm({ initial, onDone }: { initial?: Decision; onDone: () => void }) {
  const save = useSaveDecision();
  const [form, setForm] = useState<DecisionInput>(() => ({
    title: initial?.title ?? '',
    context: initial?.context ?? '',
    options: initial?.options.length ? initial.options : ['', ''],
    choice: initial?.choice ?? '',
    reasoning: initial?.reasoning ?? '',
    expectedOutcome: initial?.expectedOutcome ?? '',
    confidence: initial?.confidence ?? 70,
    reviewOn: initial?.reviewOn ?? format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
  }));
  const set = (patch: Partial<DecisionInput>) => {
    setForm((f) => ({ ...f, ...patch }));
  };
  const options = form.options ?? [];

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate(
      { id: initial?.id, input: { ...form, options: options.filter((o) => o.trim()) } },
      {
        onSuccess: () => {
          toast(
            initial ? 'Decision updated' : 'Decision logged. It will come back on its review date.',
          );
          onDone();
        },
      },
    );
  };

  return (
    <motion.form
      onSubmit={submit}
      className="flex flex-col gap-10 border-hair border-hairline-strong p-6 md:p-10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <Input
        label="What are you deciding?"
        value={form.title}
        required
        onChange={(e) => {
          set({ title: e.target.value });
        }}
        placeholder="Whether to…"
      />
      <Textarea
        label="Context"
        value={form.context ?? ''}
        onChange={(e) => {
          set({ context: e.target.value });
        }}
        placeholder="What is going on, what matters, what you know and do not know"
      />
      <fieldset className="flex flex-col gap-3">
        <legend className="meta">Options you actually considered</legend>
        {options.map((o, i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="w-5 num meta text-accent">{i + 1}</span>
            <input
              value={o}
              aria-label={`Option ${i + 1}`}
              onChange={(e) => {
                set({ options: options.map((x, j) => (j === i ? e.target.value : x)) });
              }}
              className="flex-1 border-b-hair border-hairline-strong bg-transparent py-1.5 text-base text-ink focus:border-accent focus:outline-none"
            />
          </div>
        ))}
        {options.length < 8 && (
          <Button
            variant="text"
            size="sm"
            className="self-start"
            onClick={() => {
              set({ options: [...options, ''] });
            }}
          >
            Add an option
          </Button>
        )}
      </fieldset>
      <Input
        label="What you chose"
        value={form.choice ?? ''}
        onChange={(e) => {
          set({ choice: e.target.value });
        }}
      />
      <Textarea
        label="Why"
        value={form.reasoning ?? ''}
        onChange={(e) => {
          set({ reasoning: e.target.value });
        }}
        placeholder="The reasons, and what would make you wrong"
      />
      <Textarea
        label="What you expect to happen"
        value={form.expectedOutcome ?? ''}
        onChange={(e) => {
          set({ expectedOutcome: e.target.value });
        }}
      />
      <div className="grid gap-10 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <label htmlFor="confidence" className="flex items-baseline justify-between meta">
            Confidence <span className="num text-h4 text-ink">{form.confidence ?? 0}%</span>
          </label>
          <input
            id="confidence"
            type="range"
            min={0}
            max={100}
            step={5}
            value={form.confidence ?? 0}
            onChange={(e) => {
              set({ confidence: Number(e.target.value) });
            }}
            className="range-hair w-full"
          />
        </div>
        <Input
          label="Review on"
          type="date"
          value={form.reviewOn ?? ''}
          onChange={(e) => {
            set({ reviewOn: e.target.value || null });
          }}
        />
      </div>
      {save.isError && <Notice tone="error">{errorMessage(save.error)}</Notice>}
      <div className="flex gap-6">
        <Button type="submit" busy={save.isPending} busyLabel="Saving">
          {initial ? 'Save' : 'Log decision'}
        </Button>
        <Button variant="text" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </motion.form>
  );
}

function ReviewForm({ decision, onDone }: { decision: Decision; onDone: () => void }) {
  const review = useReviewDecision();
  const [actualOutcome, setOutcome] = useState('');
  const [lessons, setLessons] = useState('');
  const [wasRight, setWasRight] = useState<'yes' | 'no'>('yes');
  const [verdict, setVerdict] = useState<Verdict>('good_process_good_outcome');
  return (
    <motion.div
      className="border-accent-line flex flex-col gap-8 border-hair p-6 md:p-10"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <div>
        <p className="meta text-accent">Review</p>
        <h3 className="mt-3 font-serif text-h3 text-ink">{decision.title}</h3>
        <dl className="mt-5 grid gap-4 text-ui md:grid-cols-3">
          <div>
            <dt className="meta">You chose</dt>
            <dd className="mt-1 text-ink">{decision.choice ?? '—'}</dd>
          </div>
          <div>
            <dt className="meta">You expected</dt>
            <dd className="mt-1 text-ink">{decision.expectedOutcome ?? '—'}</dd>
          </div>
          <div>
            <dt className="meta">Confidence</dt>
            <dd className="mt-1 num text-ink">{decision.confidence ?? '—'}%</dd>
          </div>
        </dl>
      </div>
      <Textarea
        label="What actually happened?"
        value={actualOutcome}
        onChange={(e) => {
          setOutcome(e.target.value);
        }}
      />
      <Textarea
        label="What did you learn?"
        value={lessons}
        onChange={(e) => {
          setLessons(e.target.value);
        }}
      />
      <div className="flex flex-col gap-3">
        <p className="meta">Did it turn out the way you expected?</p>
        <Segmented
          label="Was it right"
          value={wasRight}
          onChange={setWasRight}
          options={[
            { value: 'yes', label: 'Yes' },
            { value: 'no', label: 'No' },
          ]}
        />
      </div>
      <fieldset className="flex flex-col gap-3">
        <legend className="meta">Judge the decision, not just the dice</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {VERDICTS.map((v) => (
            <button
              key={v.value}
              type="button"
              aria-pressed={verdict === v.value}
              onClick={() => {
                setVerdict(v.value);
              }}
              className={cn(
                'border-hair p-4 text-left transition-colors duration-500',
                verdict === v.value ? 'border-accent' : 'border-hairline-strong hover:border-muted',
              )}
            >
              <span className="block text-ui text-ink">{v.label}</span>
              <span className="mt-1 block text-ui text-muted">{v.note}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex gap-6">
        <Button
          busy={review.isPending}
          onClick={() => {
            review.mutate(
              {
                id: decision.id,
                input: { actualOutcome, lessons, wasRight: wasRight === 'yes', verdict },
              },
              {
                onSuccess: () => {
                  toast('Reviewed');
                  onDone();
                },
              },
            );
          }}
        >
          Close the loop
        </Button>
        <Button variant="text" onClick={onDone}>
          Later
        </Button>
      </div>
    </motion.div>
  );
}

/** Confidence against how often you were right. The diagonal is perfect calibration. */
function CalibrationChart({ data }: { data: Calibration }) {
  const size = 240;
  const pad = 28;
  const points = data.buckets
    .filter((b) => b.count > 0 && b.rate !== null)
    .map((b) => {
      const mid = (b.from + b.to) / 2 / 100;
      return {
        x: pad + mid * (size - pad * 2),
        y: size - pad - (b.rate ?? 0) * (size - pad * 2),
        b,
      };
    });
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ');
  return (
    <div className="flex flex-col gap-4">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-full max-w-xs"
        role="img"
        aria-label="Calibration: confidence versus how often you were right"
      >
        <line
          x1={pad}
          y1={size - pad}
          x2={size - pad}
          y2={pad}
          stroke="var(--hairline-strong)"
          strokeDasharray="3 4"
          strokeWidth={0.75}
        />
        <line
          x1={pad}
          y1={size - pad}
          x2={size - pad}
          y2={size - pad}
          stroke="var(--hairline-strong)"
          strokeWidth={0.75}
        />
        <line
          x1={pad}
          y1={pad}
          x2={pad}
          y2={size - pad}
          stroke="var(--hairline-strong)"
          strokeWidth={0.75}
        />
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <text
              x={pad + (v / 100) * (size - pad * 2)}
              y={size - 10}
              textAnchor="middle"
              className="fill-(--text-muted) text-[8px]"
            >
              {v}%
            </text>
            <text
              x={10}
              y={size - pad - (v / 100) * (size - pad * 2) + 3}
              className="fill-(--text-muted) text-[8px]"
            >
              {v}
            </text>
          </g>
        ))}
        {points.length > 1 && (
          <motion.path
            d={path}
            fill="none"
            stroke="var(--accent)"
            strokeWidth={1}
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.4, ease: EASE }}
          />
        )}
        {points.map((p) => (
          <circle
            key={p.b.from}
            cx={p.x}
            cy={p.y}
            r={2 + Math.min(p.b.count, 8) * 0.5}
            fill="var(--bg)"
            stroke="var(--accent)"
            strokeWidth={1}
          >
            <title>{`${p.b.from}–${p.b.to}% sure: right ${p.b.right} of ${p.b.count}`}</title>
          </circle>
        ))}
      </svg>
      <p className="text-ui text-muted">
        {data.reviewed === 0
          ? 'Review a few decisions to see how your confidence compares with reality.'
          : `${data.reviewed} reviewed. Brier score ${data.brierScore?.toFixed(3) ?? '—'} (lower is better; 0.25 is a coin toss).`}
      </p>
    </div>
  );
}

export function DecisionsPage() {
  const settings = useSiteSettings();
  useDocumentTitle('Decisions', settings.siteName);
  const [params, setParams] = useSearchParams();
  const decisions = useDecisions();
  const calibration = useCalibration();
  const remove = useDeleteDecision();
  type Mode = { kind: 'new' } | { kind: 'edit' | 'review'; id: string };
  const [chosen, setMode] = useState<Mode | null>(null);
  // Links from the Desk and the palette open a form through the URL (?new=1, ?review=id).
  const reviewParam = params.get('review');
  const fromUrl: Mode | null = params.get('new')
    ? { kind: 'new' }
    : reviewParam
      ? { kind: 'review', id: reviewParam }
      : null;
  const mode = chosen ?? fromUrl;

  const close = () => {
    setMode(null);
    setParams({}, { replace: true });
  };
  const today = format(new Date(), 'yyyy-MM-dd');
  const open = decisions.data?.filter((d) => d.status === 'open') ?? [];
  const reviewed = decisions.data?.filter((d) => d.status === 'reviewed') ?? [];
  const current =
    mode && mode.kind !== 'new' ? decisions.data?.find((d) => d.id === mode.id) : undefined;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-14">
      <DeskHeading eyebrow="Better decisions, slowly" title="Decision journal">
        <Button
          onClick={() => {
            setMode({ kind: 'new' });
          }}
        >
          Log a decision
        </Button>
      </DeskHeading>

      <AnimatePresence mode="wait">
        {mode?.kind === 'new' && <DecisionForm key="new" onDone={close} />}
        {mode?.kind === 'edit' && current && (
          <DecisionForm key={`edit-${current.id}`} initial={current} onDone={close} />
        )}
        {mode?.kind === 'review' && current && (
          <ReviewForm key={`review-${current.id}`} decision={current} onDone={close} />
        )}
      </AnimatePresence>

      {decisions.isPending && <LoadingLine />}

      <div className="grid gap-16 lg:grid-cols-[1fr_18rem]">
        <section className="flex flex-col gap-6">
          <SectionLabel index="01">Open</SectionLabel>
          {open.length === 0 && (
            <p className="text-ui text-muted">
              No open decisions. Log the next one before you make it.
            </p>
          )}
          <ul>
            {open.map((d) => {
              const due = d.reviewOn !== null && d.reviewOn <= today;
              return (
                <li key={d.id}>
                  <div className="flex flex-col gap-3 py-5 sm:flex-row sm:items-baseline sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-serif text-h4 text-ink">{d.title}</p>
                      <p className="mt-1 text-ui text-muted">
                        {d.choice ? `Chose: ${d.choice}` : 'No choice recorded'} ·{' '}
                        <span className="num">{d.confidence ?? '—'}%</span> sure
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-5">
                      <span className={cn('meta', due && 'text-accent')}>
                        {due ? 'Due now' : `Review ${formatDate(d.reviewOn)}`}
                      </span>
                      <button
                        type="button"
                        className="meta hover:text-ink"
                        onClick={() => {
                          setMode({ kind: 'review', id: d.id });
                        }}
                      >
                        Review
                      </button>
                      <button
                        type="button"
                        className="meta hover:text-ink"
                        onClick={() => {
                          setMode({ kind: 'edit', id: d.id });
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                  <Hairline />
                </li>
              );
            })}
          </ul>

          <SectionLabel index="02" className="mt-10">
            Reviewed
          </SectionLabel>
          {reviewed.length === 0 && <p className="text-ui text-muted">Nothing reviewed yet.</p>}
          <ul>
            {reviewed.map((d) => (
              <li key={d.id}>
                <details className="group py-5">
                  <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4">
                    <span className="font-serif text-h4 text-ink">{d.title}</span>
                    <span
                      className={cn(
                        'meta whitespace-nowrap',
                        d.wasRight ? 'text-ink' : 'text-accent',
                      )}
                    >
                      {d.wasRight ? 'Right' : 'Wrong'} ·{' '}
                      <span className="num">{d.confidence ?? '—'}%</span>
                    </span>
                  </summary>
                  <div className="mt-4 grid gap-4 text-ui md:grid-cols-2">
                    <p>
                      <span className="block meta">Expected</span>
                      {d.expectedOutcome ?? '—'}
                    </p>
                    <p>
                      <span className="block meta">Happened</span>
                      {d.actualOutcome ?? '—'}
                    </p>
                    <p>
                      <span className="block meta">Lesson</span>
                      {d.lessons ?? '—'}
                    </p>
                    <p>
                      <span className="block meta">Verdict</span>
                      {VERDICTS.find((v) => v.value === d.verdict)?.label ?? '—'}
                    </p>
                    <button
                      type="button"
                      className="justify-self-start meta hover:text-accent"
                      onClick={() => {
                        remove.mutate(d.id, {
                          onError: (e) => {
                            toast(errorMessage(e), 'error');
                          },
                        });
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </details>
                <Hairline />
              </li>
            ))}
          </ul>
        </section>
        <aside className="flex flex-col gap-6">
          <SectionLabel index="03">Calibration</SectionLabel>
          {calibration.data && <CalibrationChart data={calibration.data} />}
        </aside>
      </div>
    </div>
  );
}
