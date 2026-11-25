import { useNavigate } from 'react-router';
import { errorMessage } from '@/api/client';
import { useCreateEntry } from '@/api/entries';
import type { EntryInput, EntryType } from '@/api/types';
import { toast } from '@/design';
import { isoDay } from '@/lib/format';

export type StartOptions = {
  title?: string;
  /** A prompt becomes the first line of the entry, set as a quote. */
  prompt?: string;
  /** Ready-made HTML body (weekly and monthly reviews). */
  html?: string;
  /** Minutes for a writing sprint, started as soon as the editor opens. */
  sprint?: number;
  extra?: Partial<EntryInput>;
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Creates an entry on the server and opens it in the editor. */
export function useStartEntry() {
  const create = useCreateEntry();
  const navigate = useNavigate();
  const start = (type: EntryType, options: StartOptions = {}) => {
    const html =
      options.html ??
      (options.prompt
        ? `<blockquote><p>${escapeHtml(options.prompt)}</p></blockquote><p></p>`
        : '');
    create.mutate(
      {
        type,
        title: options.title ?? '',
        contentHtml: html,
        entryDate: isoDay(),
        visibility: 'private',
        status: type === 'journal' ? 'published' : 'draft',
        ...options.extra,
      },
      {
        onSuccess: (entry) => {
          void navigate(
            `/desk/write/${entry.id}${options.sprint ? `?sprint=${options.sprint}` : ''}`,
          );
        },
        onError: (error) => {
          toast(errorMessage(error, 'Could not start a new entry.'), 'error');
        },
      },
    );
  };
  return { start, isPending: create.isPending };
}
