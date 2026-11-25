import { motion } from 'motion/react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useArchive, usePublicEntries, usePublicTags, useSearch } from '@/api/entries';
import { useSiteSettings } from '@/api/settings';
import { Button, EASE, Hairline, LoadingLine } from '@/design';
import { EssayIndex } from '@/features/landing/LatestIndex';
import { PublicShell } from '@/features/public/PublicShell';
import { cn } from '@/lib/cn';
import { snippetParts } from '@/lib/format';
import { useDebounced, useDocumentTitle } from '@/lib/hooks';

function Filter({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'relative py-1 meta transition-colors duration-500',
        active ? 'text-ink' : 'hover:text-ink',
      )}
    >
      {children}
      <span
        aria-hidden
        className={cn(
          'absolute inset-x-0 -bottom-px h-hair origin-left bg-accent transition-transform duration-700 ease-editorial',
          active ? 'scale-x-100' : 'scale-x-0',
        )}
      />
    </button>
  );
}

/** Every public essay, filterable by tag and year, with a quiet full-text search. */
export function WritingIndexPage() {
  const settings = useSiteSettings();
  useDocumentTitle('Writing', settings.siteName);
  const [params, setParams] = useSearchParams();
  const tag = params.get('tag');
  const year = params.get('year') ? Number(params.get('year')) : null;
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 300);

  const entries = usePublicEntries({ tag, year, page, size: 20 });
  const tags = usePublicTags();
  const archive = useArchive();
  const search = useSearch(debounced, false);
  const years = archive.data?.map((y) => y.year) ?? [];
  const searching = debounced.trim().length >= 2;

  const setFilter = (key: 'tag' | 'year', value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || next.get(key) === value) next.delete(key);
    else next.set(key, value);
    setPage(0);
    setParams(next, { replace: true });
  };

  return (
    <PublicShell>
      <div className="mx-auto max-w-6xl px-(--gutter) pt-20 md:pt-28">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE }}
        >
          <p className="meta">Essays</p>
          <h1 className="mt-4 text-display">Writing</h1>
          <Hairline tone="accent" draw="mount" delay={0.3} className="mt-8 w-16" />
        </motion.div>

        <div className="mt-14 flex flex-col gap-6">
          <label className="relative block max-w-md">
            <span className="sr-only">Search essays</span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
              }}
              placeholder="Search the essays"
              className="peer w-full bg-transparent py-2 font-serif text-h4 font-[320] text-ink placeholder:text-muted placeholder:opacity-60 focus:outline-none"
            />
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-hair bg-hairline-strong" />
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-hair origin-left scale-x-0 bg-accent transition-transform duration-700 peer-focus:scale-x-100"
            />
          </label>
          {!searching && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <span className="w-12 meta text-ink">Tags</span>
                <Filter
                  active={!tag}
                  onClick={() => {
                    setFilter('tag', null);
                  }}
                >
                  All
                </Filter>
                {tags.data?.map((t) => (
                  <Filter
                    key={t.slug}
                    active={tag === t.slug}
                    onClick={() => {
                      setFilter('tag', t.slug);
                    }}
                  >
                    {t.name} <span className="num text-muted">{t.count}</span>
                  </Filter>
                ))}
              </div>
              {years.length > 1 && (
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <span className="w-12 meta text-ink">Year</span>
                  <Filter
                    active={!year}
                    onClick={() => {
                      setFilter('year', null);
                    }}
                  >
                    Any
                  </Filter>
                  {years.map((y) => (
                    <Filter
                      key={y}
                      active={year === y}
                      onClick={() => {
                        setFilter('year', String(y));
                      }}
                    >
                      <span className="num">{y}</span>
                    </Filter>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <Hairline className="mt-10" />
        {searching ? (
          <ul>
            {search.data?.length === 0 && (
              <li className="py-10 text-muted">Nothing matches “{debounced}”.</li>
            )}
            {search.data?.map((hit) => (
              <li key={hit.id}>
                <Link to={`/writing/${hit.slug ?? ''}`} className="group block py-7">
                  <span className="font-serif text-h3 font-[320] text-ink transition-colors group-hover:text-accent">
                    {hit.title}
                  </span>
                  <p className="mt-2 max-w-[70ch] text-ui text-muted">
                    {snippetParts(hit.snippet).map((part, i) =>
                      part.hit ? (
                        <mark key={i} className="bg-accent-soft text-ink">
                          {part.text}
                        </mark>
                      ) : (
                        <span key={i}>{part.text}</span>
                      ),
                    )}
                  </p>
                </Link>
                <Hairline />
              </li>
            ))}
          </ul>
        ) : entries.isPending ? (
          <LoadingLine className="mt-10" />
        ) : entries.data && entries.data.items.length > 0 ? (
          <>
            <EssayIndex entries={entries.data.items} startAt={page * 20} />
            {entries.data.totalPages > 1 && (
              <div className="mt-10 flex items-center justify-between">
                <Button
                  variant="text"
                  disabled={page === 0}
                  onClick={() => {
                    setPage((p) => p - 1);
                  }}
                >
                  Newer
                </Button>
                <span className="num meta">
                  {page + 1} / {entries.data.totalPages}
                </span>
                <Button
                  variant="text"
                  disabled={page + 1 >= entries.data.totalPages}
                  onClick={() => {
                    setPage((p) => p + 1);
                  }}
                >
                  Older
                </Button>
              </div>
            )}
          </>
        ) : (
          <p className="py-16 font-serif text-h4 text-muted italic">Nothing published here yet.</p>
        )}
      </div>
    </PublicShell>
  );
}
