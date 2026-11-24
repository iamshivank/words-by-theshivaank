import { ArrowRight, Feather } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Button, Hairline, Input, ThemeToggle, useTheme, Wordmark } from '@/design';

const COLORS = [
  ['Background', '--bg'],
  ['Surface', '--surface'],
  ['Text', '--text'],
  ['Text muted', '--text-muted'],
  ['Hairline', '--hairline'],
  ['Hairline strong', '--hairline-strong'],
  ['Accent', '--accent'],
  ['Accent soft', '--accent-soft'],
] as const;

const TYPE_SCALE = [
  ['mark', 'text-mark', 'Words'],
  ['display', 'text-display', 'Begin again'],
  ['h1', 'text-h1', 'The discipline of small pages'],
  ['h2', 'text-h2', 'What the morning knows'],
  ['h3', 'text-h3', 'Notes on deciding slowly'],
  ['h4', 'text-h4', 'A sentence a day'],
] as const;

function Section({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="grid gap-8 py-16 md:grid-cols-[12rem_1fr]">
      <div className="flex items-baseline gap-3 md:flex-col md:gap-2">
        <span className="num meta text-accent">{index}</span>
        <h2 className="meta">{title}</h2>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export function StyleGuidePage() {
  const { accentHue, setAccentHue } = useTheme();

  return (
    <main className="mx-auto max-w-6xl px-(--gutter) py-(--frame)">
      <header className="flex items-center justify-between py-4">
        <Link to="/" aria-label="Home">
          <Wordmark size="sm" layout="inline" />
        </Link>
        <ThemeToggle />
      </header>

      <div className="pt-20 pb-8">
        <p className="meta">Design system</p>
        <h1 className="mt-4 text-display">Tokens &amp; primitives</h1>
        <Hairline tone="accent" draw="mount" delay={0.2} className="mt-8 w-16" />
      </div>

      <Hairline />
      <Section index="01" title="Color">
        <ul className="grid gap-x-10 sm:grid-cols-2">
          {COLORS.map(([name, token]) => (
            <li
              key={token}
              className="flex items-center gap-4 border-b-hair border-hairline py-4 last:border-b-0 sm:[&:nth-last-child(2)]:border-b-0"
            >
              <span
                className="size-8 shrink-0 rounded-hair border-hair border-hairline-strong"
                style={{ background: `var(${token})` }}
              />
              <span className="flex-1">{name}</span>
              <code className="num text-ui text-muted">{token}</code>
            </li>
          ))}
        </ul>
        <div className="mt-12 flex flex-col gap-4">
          <div className="flex items-baseline justify-between">
            <label htmlFor="accent-hue" className="meta">
              Accent hue
            </label>
            <span className="num text-ui text-muted">
              {accentHue === null ? 'default' : `${Math.round(accentHue)}°`}
            </span>
          </div>
          <input
            id="accent-hue"
            type="range"
            min={0}
            max={359}
            value={accentHue ?? 45}
            onChange={(e) => {
              setAccentHue(Number(e.target.value));
            }}
            className="range-hair w-full"
          />
          <div>
            <Button
              variant="text"
              size="sm"
              disabled={accentHue === null}
              onClick={() => {
                setAccentHue(null);
              }}
            >
              Reset to orange
            </Button>
          </div>
        </div>
      </Section>

      <Hairline />
      <Section index="02" title="Typography">
        <ul className="flex flex-col">
          {TYPE_SCALE.map(([name, className, sample]) => (
            <li
              key={name}
              className="flex flex-col gap-2 border-b-hair border-hairline py-6 sm:flex-row sm:items-baseline sm:gap-8"
            >
              <span className="w-20 shrink-0 num meta">{name}</span>
              <span className={`${className} min-w-0 font-serif break-words`}>{sample}</span>
            </li>
          ))}
        </ul>
        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_14rem]">
          <p className="reading">
            A sentence written every day is a small vote for the person you are becoming. Most days
            it will not be a good sentence. That is not the point. The point is that you sat down,
            looked at the blank page long enough, and stayed until one honest thought arrived.
          </p>
          <dl className="flex flex-col gap-6">
            <div>
              <dt className="meta">Meta</dt>
              <dd className="mt-2 meta text-ink">24 Nov 2026 · 6 min read</dd>
            </div>
            <div>
              <dt className="meta">Numbers</dt>
              <dd className="mt-2 num text-h3 text-ink">1,284</dd>
            </div>
            <div>
              <dt className="meta">Italic</dt>
              <dd className="mt-2 font-serif text-h4 font-[300] text-muted italic">
                Waste no more time.
              </dd>
            </div>
          </dl>
        </div>
      </Section>

      <Hairline />
      <Section index="03" title="Lines">
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3">
            <span className="meta">Default</span>
            <Hairline draw="view" />
          </div>
          <div className="flex flex-col gap-3">
            <span className="meta">Strong</span>
            <Hairline tone="strong" draw="view" delay={0.15} />
          </div>
          <div className="flex flex-col gap-3">
            <span className="meta">Accent</span>
            <Hairline tone="accent" draw="view" delay={0.3} />
          </div>
          <div className="flex h-24 items-stretch gap-10">
            <Hairline orientation="vertical" draw="view" />
            <Hairline orientation="vertical" tone="strong" draw="view" delay={0.15} />
            <Hairline orientation="vertical" tone="accent" draw="view" delay={0.3} />
          </div>
        </div>
      </Section>

      <Hairline />
      <Section index="04" title="Buttons">
        <div className="flex flex-wrap items-center gap-6">
          <Button>Publish</Button>
          <Button icon={<ArrowRight aria-hidden className="size-3.5" strokeWidth={1.25} />}>
            Continue
          </Button>
          <Button size="sm">Save</Button>
          <Button variant="text">Cancel</Button>
          <Button
            variant="text"
            icon={<Feather aria-hidden className="size-3.5" strokeWidth={1.25} />}
          >
            New entry
          </Button>
          <Button disabled>Disabled</Button>
          <Button busy busyLabel="Saving">
            Save
          </Button>
        </div>
      </Section>

      <Hairline />
      <Section index="05" title="Inputs">
        <div className="grid gap-12 md:grid-cols-2">
          <Input label="Title" placeholder="Untitled" />
          <Input
            label="Daily word goal"
            inputMode="numeric"
            defaultValue="500"
            hint="Words per day."
          />
          <Input
            label="Email"
            defaultValue="not-an-email"
            error="That doesn't look like an email."
          />
        </div>
      </Section>

      <Hairline />
      <Section index="06" title="Wordmark">
        <div className="flex flex-col gap-16">
          <Wordmark size="sm" layout="inline" />
          <Wordmark size="md" />
          <Wordmark size="lg" animate />
        </div>
      </Section>
    </main>
  );
}
