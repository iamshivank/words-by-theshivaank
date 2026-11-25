import { Heart, Trash2 } from 'lucide-react';
import { useState, type SubmitEvent } from 'react';
import { errorMessage } from '@/api/client';
import {
  useDeletePrompt,
  useDeleteQuote,
  usePrompts,
  useQuotes,
  useSavePrompt,
  useSaveQuote,
} from '@/api/desk';
import { useSiteSettings } from '@/api/settings';
import type { Quote } from '@/api/types';
import { Button, Hairline, Input, LoadingLine, Notice, Segmented, Textarea, toast } from '@/design';
import { DeskHeading } from '@/features/desk/DeskLayout';
import { cn } from '@/lib/cn';
import { useDebounced, useDocumentTitle } from '@/lib/hooks';

function Flag({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        'meta transition-colors duration-500',
        on
          ? 'text-ink underline decoration-accent decoration-1 underline-offset-4'
          : 'opacity-60 hover:opacity-100',
      )}
    >
      {label}
    </button>
  );
}

function QuoteRow({ quote }: { quote: Quote }) {
  const save = useSaveQuote();
  const remove = useDeleteQuote();
  const toggle = (patch: Partial<Quote>) => {
    save.mutate(
      { id: quote.id, input: { ...quote, ...patch } },
      {
        onError: (e) => {
          toast(errorMessage(e), 'error');
        },
      },
    );
  };
  return (
    <li className={cn(!quote.active && 'opacity-50')}>
      <div className="grid gap-4 py-6 md:grid-cols-[1fr_auto]">
        <figure>
          <blockquote className="font-serif text-h4 leading-snug font-[320] text-ink">
            “{quote.text}”
          </blockquote>
          <figcaption className="mt-2 meta">
            {quote.author}
            {quote.source && <span className="normal-case"> · {quote.source}</span>}
            {quote.custom && <span className="ml-3 text-accent">yours</span>}
          </figcaption>
        </figure>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 md:flex-col md:items-end">
          <button
            type="button"
            aria-label={quote.favorite ? 'Unfavorite' : 'Favorite'}
            aria-pressed={quote.favorite}
            onClick={() => {
              toggle({ favorite: !quote.favorite });
            }}
            className={quote.favorite ? 'text-accent' : 'text-muted hover:text-ink'}
          >
            <Heart
              aria-hidden
              className="size-4"
              strokeWidth={1.25}
              fill={quote.favorite ? 'currentColor' : 'none'}
            />
          </button>
          <Flag
            on={quote.showInEditor}
            label="Editor"
            onClick={() => {
              toggle({ showInEditor: !quote.showInEditor });
            }}
          />
          <Flag
            on={quote.showOnLanding}
            label="Landing"
            onClick={() => {
              toggle({ showOnLanding: !quote.showOnLanding });
            }}
          />
          <Flag
            on={quote.active}
            label="Active"
            onClick={() => {
              toggle({ active: !quote.active });
            }}
          />
          <button
            type="button"
            aria-label="Delete quote"
            onClick={() => {
              remove.mutate(quote.id);
            }}
            className="text-muted hover:text-accent"
          >
            <Trash2 aria-hidden className="size-3.5" strokeWidth={1.25} />
          </button>
        </div>
      </div>
      <Hairline />
    </li>
  );
}

function Quotes() {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'favorites' | 'custom'>('all');
  const query = useDebounced(q, 250);
  const quotes = useQuotes({
    q: query,
    favorites: filter === 'favorites',
    custom: filter === 'custom',
  });
  const save = useSaveQuote();
  const [form, setForm] = useState({ text: '', author: '', source: '' });

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    save.mutate(
      {
        input: { ...form, favorite: false, active: true, showInEditor: true, showOnLanding: true },
      },
      {
        onSuccess: () => {
          toast('Quote added');
          setForm({ text: '', author: '', source: '' });
        },
      },
    );
  };

  return (
    <div className="grid gap-16 lg:grid-cols-[1fr_20rem]">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <Input
            label="Search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
            }}
            placeholder="Words or author"
            className="max-w-sm flex-1"
          />
          <Segmented
            label="Filter"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'favorites', label: 'Favorites' },
              { value: 'custom', label: 'Yours' },
            ]}
          />
        </div>
        <p className="num meta">{quotes.data?.totalItems ?? 0} quotes</p>
        {quotes.isPending && <LoadingLine />}
        <Hairline />
        <ul>
          {quotes.data?.items.map((quote) => (
            <QuoteRow key={quote.id} quote={quote} />
          ))}
        </ul>
      </section>
      <form
        onSubmit={submit}
        className="flex flex-col gap-8 self-start border-hair border-hairline-strong p-6"
      >
        <p className="meta text-ink">Add a quote</p>
        <Textarea
          label="Quote"
          required
          value={form.text}
          onChange={(e) => {
            setForm({ ...form, text: e.target.value });
          }}
        />
        <Input
          label="Author"
          required
          value={form.author}
          onChange={(e) => {
            setForm({ ...form, author: e.target.value });
          }}
        />
        <Input
          label="Source"
          value={form.source}
          onChange={(e) => {
            setForm({ ...form, source: e.target.value });
          }}
          placeholder="Book, letter, year"
        />
        {save.isError && <Notice tone="error">{errorMessage(save.error)}</Notice>}
        <Button type="submit" busy={save.isPending}>
          Add
        </Button>
      </form>
    </div>
  );
}

function Prompts() {
  const prompts = usePrompts();
  const save = useSavePrompt();
  const remove = useDeletePrompt();
  const [text, setText] = useState('');
  return (
    <div className="grid gap-16 lg:grid-cols-[1fr_20rem]">
      <section>
        <p className="num meta">
          {prompts.data?.filter((p) => p.active).length ?? 0} active of {prompts.data?.length ?? 0}{' '}
          · one is shown each day, least recent first
        </p>
        <Hairline className="mt-6" />
        <ul>
          {prompts.data?.map((p) => (
            <li key={p.id} className={cn(!p.active && 'opacity-50')}>
              <div className="flex items-baseline justify-between gap-6 py-4">
                <div>
                  <p className="font-serif text-h4 font-[320] text-ink">{p.text}</p>
                  <p className="mt-1 meta">
                    {p.category}
                    {p.custom && <span className="ml-3 text-accent">yours</span>}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-5">
                  <Flag
                    on={p.active}
                    label="Active"
                    onClick={() => {
                      save.mutate({
                        id: p.id,
                        input: { text: p.text, category: p.category, active: !p.active },
                      });
                    }}
                  />
                  <button
                    type="button"
                    aria-label="Delete prompt"
                    className="text-muted hover:text-accent"
                    onClick={() => {
                      remove.mutate(p.id);
                    }}
                  >
                    <Trash2 aria-hidden className="size-3.5" strokeWidth={1.25} />
                  </button>
                </div>
              </div>
              <Hairline />
            </li>
          ))}
        </ul>
      </section>
      <form
        className="flex flex-col gap-8 self-start border-hair border-hairline-strong p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(
            { input: { text } },
            {
              onSuccess: () => {
                toast('Prompt added');
                setText('');
              },
            },
          );
        }}
      >
        <p className="meta text-ink">Add your own prompt</p>
        <Textarea
          label="Prompt"
          required
          value={text}
          onChange={(e) => {
            setText(e.target.value);
          }}
          placeholder="A question worth sitting with"
        />
        <Button type="submit" busy={save.isPending}>
          Add
        </Button>
      </form>
    </div>
  );
}

export function QuotesPage() {
  const settings = useSiteSettings();
  useDocumentTitle('Quotes & prompts', settings.siteName);
  const [tab, setTab] = useState<'quotes' | 'prompts'>('quotes');
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12">
      <DeskHeading eyebrow="Borrowed light" title="Quotes & prompts">
        <Segmented
          label="Library"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'quotes', label: 'Quotes' },
            { value: 'prompts', label: 'Prompts' },
          ]}
        />
      </DeskHeading>
      {tab === 'quotes' ? <Quotes /> : <Prompts />}
    </div>
  );
}
