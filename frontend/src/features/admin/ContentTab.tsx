import { useState } from 'react';
import { Link } from 'react-router';
import { errorMessage } from '@/api/client';
import { useBulkEntries, useEntries, type EntryFilters } from '@/api/entries';
import type { BulkActionName, EntryType, Status, Visibility } from '@/api/types';
import { Button, Hairline, Input, LoadingLine, Select, toast } from '@/design';
import { cn } from '@/lib/cn';
import { formatDate, formatNumber } from '@/lib/format';
import { useDebounced } from '@/lib/hooks';

const ACTIONS: { value: BulkActionName; label: string }[] = [
  { value: 'publish', label: 'Publish' },
  { value: 'unpublish', label: 'Unpublish' },
  { value: 'make-public', label: 'Make public' },
  { value: 'make-private', label: 'Make private' },
  { value: 'feature', label: 'Feature' },
  { value: 'unfeature', label: 'Unfeature' },
  { value: 'delete', label: 'Delete' },
];

/** Every entry in one table, with filters and bulk actions. */
export function ContentTab() {
  const [type, setType] = useState<EntryType | ''>('');
  const [status, setStatus] = useState<Status | ''>('');
  const [visibility, setVisibility] = useState<Visibility | ''>('');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<NonNullable<EntryFilters['sort']>>('updated');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const query = useDebounced(q, 300);
  const { data, isPending } = useEntries({
    type: type || null,
    status: status || null,
    visibility: visibility || null,
    q: query || null,
    sort,
    page,
    size: 50,
  });
  const bulk = useBulkEntries();
  const items = data?.items ?? [];
  const allSelected = items.length > 0 && items.every((e) => selected.has(e.id));

  const run = (action: BulkActionName) => {
    if (action === 'delete' && !confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    bulk.mutate(
      { ids: [...selected], action },
      {
        onSuccess: (r) => {
          toast(
            `${ACTIONS.find((a) => a.value === action)?.label ?? 'Done'}: ${r.affected} ${r.affected === 1 ? 'entry' : 'entries'}`,
          );
          setSelected(new Set());
        },
        onError: (e) => {
          toast(errorMessage(e), 'error');
        },
      },
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 md:grid-cols-5">
        <Input
          label="Search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(0);
          }}
          placeholder="Title or text"
          className="md:col-span-1"
        />
        <Select
          label="Type"
          value={type}
          onChange={(e) => {
            setType(e.target.value as EntryType | '');
            setPage(0);
          }}
        >
          <option value="">Any</option>
          <option value="essay">Essays</option>
          <option value="journal">Journal</option>
          <option value="note">Notes</option>
        </Select>
        <Select
          label="Status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as Status | '');
            setPage(0);
          }}
        >
          <option value="">Any</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
        </Select>
        <Select
          label="Visibility"
          value={visibility}
          onChange={(e) => {
            setVisibility(e.target.value as Visibility | '');
            setPage(0);
          }}
        >
          <option value="">Any</option>
          <option value="public">Public</option>
          <option value="unlisted">Unlisted</option>
          <option value="private">Private</option>
        </Select>
        <Select
          label="Sort"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value as NonNullable<EntryFilters['sort']>);
          }}
        >
          <option value="updated">Recently edited</option>
          <option value="created">Newest</option>
          <option value="published">Recently published</option>
          <option value="words">Longest</option>
          <option value="views">Most read</option>
        </Select>
      </div>

      <div
        className={cn(
          'flex flex-wrap items-center gap-x-5 gap-y-3 transition-opacity',
          selected.size === 0 && 'pointer-events-none opacity-30',
        )}
        aria-hidden={selected.size === 0}
      >
        <span className="num meta text-ink">{selected.size} selected</span>
        {ACTIONS.map((a) => (
          <Button
            key={a.value}
            variant="text"
            size="sm"
            busy={bulk.isPending && bulk.variables.action === a.value}
            className={a.value === 'delete' && confirming ? 'text-accent' : undefined}
            onClick={() => {
              run(a.value);
            }}
          >
            {a.value === 'delete' && confirming ? 'Really delete?' : a.label}
          </Button>
        ))}
      </div>

      {isPending && <LoadingLine />}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[46rem] text-left text-ui">
          <thead>
            <tr className="border-b-hair border-hairline-strong">
              <th className="w-8 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all on this page"
                  checked={allSelected}
                  onChange={() => {
                    setSelected(allSelected ? new Set() : new Set(items.map((e) => e.id)));
                  }}
                  className="accent-(--accent)"
                />
              </th>
              <th className="py-3 meta font-normal">Title</th>
              <th className="py-3 meta font-normal">Type</th>
              <th className="py-3 meta font-normal">State</th>
              <th className="py-3 text-right meta font-normal">Words</th>
              <th className="py-3 text-right meta font-normal">Reads</th>
              <th className="py-3 text-right meta font-normal">Edited</th>
            </tr>
          </thead>
          <tbody>
            {items.map((e) => (
              <tr
                key={e.id}
                className={cn(
                  'border-b-hair border-hairline transition-colors',
                  selected.has(e.id) && 'bg-accent-soft',
                )}
              >
                <td className="py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${e.title || 'untitled'}`}
                    checked={selected.has(e.id)}
                    onChange={() => {
                      const next = new Set(selected);
                      if (next.has(e.id)) next.delete(e.id);
                      else next.add(e.id);
                      setSelected(next);
                    }}
                    className="accent-(--accent)"
                  />
                </td>
                <td className="max-w-xs py-3 pr-4">
                  <Link
                    to={`/desk/write/${e.id}`}
                    className="truncate text-ink transition-colors hover:text-accent"
                  >
                    {e.title || <span className="text-muted italic">Untitled</span>}
                  </Link>
                  {e.featured && (
                    <span className="ml-2 text-[0.625rem] tracking-[0.16em] text-accent uppercase">
                      featured
                    </span>
                  )}
                </td>
                <td className="py-3 meta">{e.type}</td>
                <td className="py-3">
                  <span
                    className={cn(
                      'meta',
                      e.status === 'published' && e.visibility !== 'private' && 'text-accent',
                    )}
                  >
                    {e.status} · {e.visibility}
                  </span>
                </td>
                <td className="py-3 text-right num text-muted">{formatNumber(e.wordCount)}</td>
                <td className="py-3 text-right num text-muted">{formatNumber(e.viewCount)}</td>
                <td className="py-3 text-right meta whitespace-nowrap">
                  {formatDate(e.updatedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="text"
            disabled={page === 0}
            onClick={() => {
              setPage((p) => p - 1);
            }}
          >
            Previous
          </Button>
          <span className="num meta">
            {page + 1} / {data.totalPages} · {data.totalItems} entries
          </span>
          <Button
            variant="text"
            disabled={page + 1 >= data.totalPages}
            onClick={() => {
              setPage((p) => p + 1);
            }}
          >
            Next
          </Button>
        </div>
      )}
      <Hairline />
    </div>
  );
}
