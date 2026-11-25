import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from './client';
import type {
  ArchiveYear,
  BulkActionName,
  EntryDetail,
  EntryInput,
  EntrySummary,
  EntryType,
  Page,
  PublicEntry,
  PublicEntrySummary,
  PublicStats,
  SearchHit,
  Status,
  TagCount,
  Visibility,
} from './types';

// ---- Public -------------------------------------------------------------------

export function usePublicEntries(filters: {
  tag?: string | null;
  year?: number | null;
  page?: number;
  size?: number;
}) {
  return useQuery({
    queryKey: ['public', 'entries', filters],
    queryFn: () =>
      api<Page<PublicEntrySummary>>(
        `/public/entries${qs({ tag: filters.tag, year: filters.year, page: filters.page ?? 0, size: filters.size ?? 20 })}`,
      ),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useFlyingEntries(limit = 6) {
  return useQuery({
    queryKey: ['public', 'flying', limit],
    queryFn: () => api<PublicEntrySummary[]>(`/public/entries/flying${qs({ limit })}`),
    staleTime: 60_000,
  });
}

export function usePublicEntry(slug: string | undefined) {
  return useQuery({
    queryKey: ['public', 'entry', slug],
    queryFn: () => api<PublicEntry>(`/public/entries/${encodeURIComponent(slug ?? '')}`),
    enabled: !!slug,
    staleTime: 60_000,
  });
}

export function recordView(slug: string): void {
  const key = `words-read:${slug}`;
  try {
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    // Storage unavailable: count anyway.
  }
  void api(`/public/entries/${encodeURIComponent(slug)}/view`, { method: 'POST' }).catch(
    () => undefined,
  );
}

export function useArchive() {
  return useQuery({
    queryKey: ['public', 'archive'],
    queryFn: () => api<ArchiveYear[]>('/public/archive'),
    staleTime: 60_000,
  });
}

export function usePublicTags() {
  return useQuery({
    queryKey: ['public', 'tags'],
    queryFn: () => api<TagCount[]>('/public/tags'),
    staleTime: 5 * 60_000,
  });
}

export function usePublicStats() {
  return useQuery({
    queryKey: ['public', 'stats'],
    queryFn: () => api<PublicStats>('/public/stats'),
    staleTime: 5 * 60_000,
  });
}

export function useSearch(q: string, owner: boolean) {
  const query = q.trim();
  return useQuery({
    queryKey: ['search', owner, query],
    queryFn: () =>
      api<SearchHit[]>(`${owner ? '/search' : '/public/search'}${qs({ q: query, limit: 8 })}`),
    enabled: query.length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

// ---- Owner --------------------------------------------------------------------

export type EntryFilters = {
  type?: EntryType | null;
  status?: Status | null;
  visibility?: Visibility | null;
  tag?: string | null;
  q?: string | null;
  sort?: 'updated' | 'created' | 'date' | 'published' | 'words' | 'views';
  page?: number;
  size?: number;
};

export const entriesKey = ['entries'] as const;

export function useEntries(filters: EntryFilters) {
  return useQuery({
    queryKey: [...entriesKey, 'list', filters],
    queryFn: () =>
      api<Page<EntrySummary>>(
        `/entries${qs({ ...filters, page: filters.page ?? 0, size: filters.size ?? 30 })}`,
      ),
    placeholderData: keepPreviousData,
  });
}

export function useEntry(id: string | undefined) {
  return useQuery({
    queryKey: [...entriesKey, 'detail', id],
    queryFn: () => api<EntryDetail>(`/entries/${id ?? ''}`),
    enabled: !!id,
    staleTime: Infinity,
    gcTime: 0,
  });
}

export function createEntry(input: EntryInput) {
  return api<EntryDetail>('/entries', { method: 'POST', json: input });
}

export function saveEntry(id: string, input: EntryInput) {
  return api<EntryDetail>(`/entries/${id}`, { method: 'PUT', json: input });
}

/** Invalidate everything an entry change can affect: lists, stats, public pages. */
export function useInvalidateWriting() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: entriesKey, refetchType: 'none' });
    void queryClient.invalidateQueries({ queryKey: ['stats'] });
    void queryClient.invalidateQueries({ queryKey: ['public'] });
    void queryClient.invalidateQueries({ queryKey: ['admin'] });
  };
}

export function useCreateEntry() {
  const invalidate = useInvalidateWriting();
  return useMutation({ mutationFn: createEntry, onSuccess: invalidate });
}

export function useDeleteEntry() {
  const invalidate = useInvalidateWriting();
  return useMutation({
    mutationFn: (id: string) => api<undefined>(`/entries/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

export function useBulkEntries() {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateWriting();
  return useMutation({
    mutationFn: (body: { ids: string[]; action: BulkActionName }) =>
      api<{ affected: number }>('/entries/bulk', { method: 'POST', json: body }),
    onSuccess: () => {
      invalidate();
      void queryClient.invalidateQueries({ queryKey: entriesKey });
    },
  });
}

/** The full input the editor sends, built from a loaded entry. */
export function toInput(e: EntryDetail): EntryInput {
  return {
    type: e.type,
    title: e.title,
    slug: e.slug,
    contentJson: e.contentJson,
    contentHtml: e.contentHtml,
    excerpt: e.excerpt,
    coverImageUrl: e.coverImageUrl,
    visibility: e.visibility,
    status: e.status,
    entryDate: e.entryDate,
    mood: e.mood,
    energy: e.energy,
    gratitude: e.gratitude,
    lessons: e.lessons,
    tags: e.tags.map((t) => t.name),
    highlightLabel: e.highlightLabel,
    featured: e.featured,
  };
}
