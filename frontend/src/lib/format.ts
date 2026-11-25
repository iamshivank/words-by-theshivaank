import { format, formatDistanceToNowStrict, parseISO } from 'date-fns';

const numberFormat = new Intl.NumberFormat('en-IN');

/** 12,480 (Indian grouping for big numbers, since the owner is in Bengaluru). */
export function formatNumber(n: number): string {
  return numberFormat.format(n);
}

/** "24 Nov 2026" */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return format(parseISO(iso), 'd MMM yyyy');
}

/** "24 Nov" */
export function formatDayMonth(iso: string | null | undefined): string {
  if (!iso) return '';
  return format(parseISO(iso), 'd MMM');
}

/** "Tuesday, 24 November" */
export function formatLongDay(iso: string): string {
  return format(parseISO(iso), 'EEEE, d MMMM');
}

/** "3 minutes ago" */
export function formatAgo(iso: string | null | undefined): string {
  if (!iso) return 'never';
  return `${formatDistanceToNowStrict(parseISO(iso))} ago`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function plural(n: number, word: string, many = `${word}s`): string {
  return `${formatNumber(n)} ${n === 1 ? word : many}`;
}

/** Local calendar date as YYYY-MM-DD (not UTC). */
export function isoDay(date = new Date()): string {
  return format(date, 'yyyy-MM-dd');
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const MOOD_WORDS = ['', 'Heavy', 'Low', 'Even', 'Good', 'Bright'] as const;
export const ENERGY_WORDS = ['', 'Drained', 'Tired', 'Steady', 'Awake', 'Charged'] as const;

/** Splits a search snippet's [[match]] markers into plain and highlighted parts (never HTML). */
export function snippetParts(snippet: string | null): { text: string; hit: boolean }[] {
  if (!snippet) return [];
  return snippet
    .split(/(\[\[.*?\]\])/g)
    .filter(Boolean)
    .map((part) =>
      part.startsWith('[[') ? { text: part.slice(2, -2), hit: true } : { text: part, hit: false },
    );
}
