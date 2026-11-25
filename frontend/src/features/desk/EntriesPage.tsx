import { format, parseISO } from 'date-fns';
import { ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { Link } from 'react-router';
import { useEntries } from '@/api/entries';
import { useSiteSettings } from '@/api/settings';
import type { EntrySummary, EntryType, Status } from '@/api/types';
import { Button, EASE, Hairline, LoadingLine, Segmented } from '@/design';
import { useStartEntry } from '@/features/editor/useStartEntry';
import { cn } from '@/lib/cn';
import { formatAgo, formatDate, MOOD_WORDS, plural } from '@/lib/format';
import { useDebounced, useDocumentTitle } from '@/lib/hooks';
import { DeskHeading } from './DeskLayout';

const COPY: Record<EntryType, { title: string; eyebrow: string; empty: string; action: string }> = {
  journal: {
    title: 'Journal',
    eyebrow: 'Private, dated, honest',
    empty: 'No journal entries yet. The first one can be three sentences long.',
    action: 'New entry',
  },
  essay: {
    title: 'Essays',
    eyebrow: 'Long form, for the public site',
    empty: 'No essays yet. Start one; it stays private until you publish it.',
    action: 'New essay',
  },
  note: {
    title: 'Notes',
    eyebrow: 'Fragments and quick thoughts',
    empty: 'No notes yet. Catch a thought before it leaves.',
    action: 'New note',
  },
};

function MoodMark({ mood }: { mood: number | null }) {
  if (!mood) return <span className="w-14" />;
  return (
    <span
      className="flex w-14 items-center gap-[3px]"
      title={`Mood: ${MOOD_WORDS[mood] ?? ''}`}
      aria-label={`Mood ${MOOD_WORDS[mood] ?? ''}`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={cn('h-2.5 w-hair', i <= mood ? 'bg-accent' : 'bg-hairline-strong')}
        />
      ))}
    </span>
  );
}

function Row({ entry }: { entry: EntrySummary }) {
  const journal = entry.type === 'journal';
  return (
    <li>
      <Link
        to={`/desk/write/${entry.id}`}
        className="group grid grid-cols-[4.5rem_1fr] items-baseline gap-x-5 gap-y-2 py-5 md:grid-cols-[4.5rem_1fr_auto]"
      >
        <span className="flex flex-col">
          {journal && entry.entryDate ? (
            <>
              <span className="num text-h4 leading-none text-ink">
                {format(parseISO(entry.entryDate), 'dd')}
              </span>
              <span className="mt-1 meta">{format(parseISO(entry.entryDate), 'EEE')}</span>
            </>
          ) : (
            <span
              className={cn(
                'meta',
                entry.status === 'published' && entry.visibility !== 'private' ? 'text-accent' : '',
              )}
            >
              {entry.status === 'draft'
                ? 'Draft'
                : entry.visibility === 'private'
                  ? 'Private'
                  : entry.visibility === 'unlisted'
                    ? 'Unlisted'
                    : 'Live'}
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-3">
            <span className="font-serif text-h4 font-[330] text-ink transition-colors duration-500 group-hover:text-accent">
              {entry.title || <span className="text-muted italic">Untitled</span>}
            </span>
            {entry.highlightLabel && (
              <span className="border-accent-line border-hair px-1.5 text-[0.625rem] tracking-[0.16em] text-accent uppercase">
                {entry.highlightLabel}
              </span>
            )}
          </span>
          {entry.excerpt && (
            <span className="mt-1 line-clamp-1 block text-ui text-muted">{entry.excerpt}</span>
          )}
        </span>
        <span className="col-start-2 flex items-center gap-5 md:col-start-3">
          {journal && <MoodMark mood={entry.mood} />}
          <span className="num meta whitespace-nowrap">{plural(entry.wordCount, 'word')}</span>
          <span className="meta whitespace-nowrap">
            {journal
              ? formatAgo(entry.updatedAt)
              : formatDate(entry.publishedAt ?? entry.updatedAt)}
          </span>
          <ArrowRight
            aria-hidden
            className="size-3.5 text-accent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            strokeWidth={1.25}
          />
        </span>
      </Link>
      <Hairline />
    </li>
  );
}

/** Journal, essays or notes: a quiet list with search and a status filter; journals grouped by month. */
export function EntriesPage({ type }: { type: EntryType }) {
  const copy = COPY[type];
  const settings = useSiteSettings();
  useDocumentTitle(copy.title, settings.siteName);
  const [status, setStatus] = useState<'all' | Status>('all');
  const [q, setQ] = useState('');
  const [size, setSize] = useState(40);
  const query = useDebounced(q, 300);
  const { data, isPending } = useEntries({
    type,
    status: status === 'all' ? null : status,
    q: query || null,
    sort: type === 'journal' ? 'date' : 'updated',
    size,
  });
  const { start, isPending: starting } = useStartEntry();

  const groups = new Map<string, EntrySummary[]>();
  for (const e of data?.items ?? []) {
    const key = type === 'journal' && e.entryDate ? format(parseISO(e.entryDate), 'MMMM yyyy') : '';
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-12">
      <DeskHeading eyebrow={copy.eyebrow} title={copy.title}>
        <Button
          busy={starting}
          onClick={() => {
            start(type);
          }}
        >
          {copy.action}
        </Button>
      </DeskHeading>

      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <label className="relative block w-full max-w-sm">
          <span className="sr-only">Search {copy.title.toLowerCase()}</span>
          <input
            type="search"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
            }}
            placeholder={`Search ${copy.title.toLowerCase()}`}
            className="peer w-full bg-transparent py-2 text-base text-ink placeholder:text-muted placeholder:opacity-60 focus:outline-none"
          />
          <span aria-hidden className="absolute inset-x-0 bottom-0 h-hair bg-hairline-strong" />
          <span
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-hair origin-left scale-x-0 bg-accent transition-transform duration-700 peer-focus:scale-x-100"
          />
        </label>
        {type !== 'journal' && (
          <Segmented
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All' },
              { value: 'draft', label: 'Drafts' },
              { value: 'published', label: 'Published' },
            ]}
          />
        )}
      </div>

      {isPending && <LoadingLine />}
      {data?.items.length === 0 && (
        <p className="font-serif text-h4 text-muted italic">
          {query ? `Nothing matches “${query}”.` : copy.empty}
        </p>
      )}

      {[...groups.entries()].map(([month, items]) => (
        <motion.section
          key={month || 'all'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          {month && <h2 className="mb-2 meta text-ink">{month}</h2>}
          <Hairline />
          <ul>
            {items.map((e) => (
              <Row key={e.id} entry={e} />
            ))}
          </ul>
        </motion.section>
      ))}

      {data && data.totalItems > data.items.length && (
        <Button
          variant="text"
          onClick={() => {
            setSize((s) => s + 40);
          }}
        >
          Show more ({data.totalItems - data.items.length})
        </Button>
      )}
    </div>
  );
}
