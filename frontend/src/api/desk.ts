/** Hooks for the private Desk: stats, prompts, quotes, decisions, goals. */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, qs } from './client';
import type {
  Calibration,
  Day,
  Decision,
  DecisionInput,
  Goal,
  GoalInput,
  MonthStats,
  Overview,
  Page,
  Prompt,
  PromptInput,
  PublicQuote,
  Quote,
  QuoteInput,
  ReviewInput,
  Streak,
} from './types';

// ---- Stats --------------------------------------------------------------------

export function useOverview() {
  return useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: () => api<Overview>('/stats/overview'),
  });
}

export function useHeatmap(days = 371) {
  return useQuery({
    queryKey: ['stats', 'heatmap', days],
    queryFn: () => api<Day[]>(`/stats/heatmap${qs({ days })}`),
  });
}

export function useMonthStats(month: string) {
  return useQuery({
    queryKey: ['stats', 'month', month],
    queryFn: () => api<MonthStats>(`/stats/month${qs({ month })}`),
  });
}

export function useStreak(enabled = true) {
  return useQuery({
    queryKey: ['stats', 'streak'],
    queryFn: () => api<Streak>('/stats/streak'),
    enabled,
  });
}

// ---- Prompts ------------------------------------------------------------------

export function useTodayPrompt(enabled = true) {
  return useQuery({
    queryKey: ['prompts', 'today'],
    queryFn: () => api<Prompt>('/prompts/today'),
    enabled,
  });
}

export function useShufflePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<Prompt>('/prompts/today/shuffle', { method: 'POST' }),
    onSuccess: (prompt) => {
      queryClient.setQueryData(['prompts', 'today'], prompt);
    },
  });
}

export function usePrompts() {
  return useQuery({ queryKey: ['prompts', 'all'], queryFn: () => api<Prompt[]>('/prompts') });
}

export function useSavePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: PromptInput }) =>
      id
        ? api<Prompt>(`/prompts/${id}`, { method: 'PUT', json: input })
        : api<Prompt>('/prompts', { method: 'POST', json: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prompts'] }),
  });
}

export function useDeletePrompt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<undefined>(`/prompts/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prompts'] }),
  });
}

// ---- Quotes -------------------------------------------------------------------

export function useQuotes(filters: {
  q?: string;
  favorites?: boolean;
  custom?: boolean;
  page?: number;
}) {
  return useQuery({
    queryKey: ['quotes', 'list', filters],
    queryFn: () => api<Page<Quote>>(`/quotes${qs({ ...filters, size: 200 })}`),
  });
}

export function useRandomQuote(placement: 'editor' | 'landing', enabled = true) {
  return useQuery({
    queryKey: ['quotes', 'random', placement],
    queryFn: () => api<Quote>(`/quotes/random${qs({ placement })}`),
    enabled,
    staleTime: Infinity,
  });
}

export function usePublicQuotes(limit = 8) {
  return useQuery({
    queryKey: ['public', 'quotes', limit],
    queryFn: () => api<PublicQuote[]>(`/public/quotes${qs({ limit })}`),
    staleTime: 30 * 60_000,
  });
}

export function useSaveQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: QuoteInput }) =>
      id
        ? api<Quote>(`/quotes/${id}`, { method: 'PUT', json: input })
        : api<Quote>('/quotes', { method: 'POST', json: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['quotes', 'list'] });
      void queryClient.invalidateQueries({ queryKey: ['public', 'quotes'] });
    },
  });
}

export function useDeleteQuote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<undefined>(`/quotes/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes', 'list'] }),
  });
}

// ---- Decisions ----------------------------------------------------------------

export function useDecisions() {
  return useQuery({ queryKey: ['decisions', 'all'], queryFn: () => api<Decision[]>('/decisions') });
}

export function useDueDecisions() {
  return useQuery({
    queryKey: ['decisions', 'due'],
    queryFn: () => api<Decision[]>('/decisions/due'),
  });
}

export function useCalibration() {
  return useQuery({
    queryKey: ['decisions', 'calibration'],
    queryFn: () => api<Calibration>('/decisions/calibration'),
  });
}

export function useSaveDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: DecisionInput }) =>
      id
        ? api<Decision>(`/decisions/${id}`, { method: 'PUT', json: input })
        : api<Decision>('/decisions', { method: 'POST', json: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['decisions'] }),
  });
}

export function useReviewDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: ReviewInput }) =>
      api<Decision>(`/decisions/${id}/review`, { method: 'POST', json: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['decisions'] }),
  });
}

export function useDeleteDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<undefined>(`/decisions/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['decisions'] }),
  });
}

// ---- Goals --------------------------------------------------------------------

export function useGoals(scope: 'current' | 'all' = 'current') {
  return useQuery({
    queryKey: ['goals', scope],
    queryFn: () => api<Goal[]>(`/goals${qs({ scope })}`),
  });
}

export function useSaveGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id?: string; input: GoalInput }) =>
      id
        ? api<Goal>(`/goals/${id}`, { method: 'PUT', json: input })
        : api<Goal>('/goals', { method: 'POST', json: input }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<undefined>(`/goals/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['goals'] }),
  });
}

// ---- Writing sessions ---------------------------------------------------------

export function startSession(entryId: string) {
  return api<{ id: string }>('/sessions', { method: 'POST', json: { entryId } });
}

/** keepalive lets the final report survive the tab closing. */
export function reportSession(id: string, wordsAdded: number) {
  return api<undefined>(`/sessions/${id}`, {
    method: 'PUT',
    json: { wordsAdded },
    keepalive: true,
  });
}
