import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Typography from '@tiptap/extension-typography';
import { CharacterCount, Focus, Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { del, get, set } from 'idb-keyval';
import { ArrowLeft, Eye, Heart, Mic, MicOff, PanelRight, Shuffle, Timer } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { uploadImage } from '@/api/admin';
import { errorMessage } from '@/api/client';
import { reportSession, startSession, useOverview, useRandomQuote, useSaveQuote } from '@/api/desk';
import { saveEntry, toInput, useDeleteEntry, useInvalidateWriting } from '@/api/entries';
import { usePreferences } from '@/api/settings';
import type { EntryDetail, EntryInput, JSONContent } from '@/api/types';
import { EASE, toast } from '@/design';
import { cn } from '@/lib/cn';
import { formatNumber, pad2 } from '@/lib/format';
import { isModKey } from '@/lib/hooks';
import { DetailsPanel } from './DetailsPanel';
import { SlashMenu } from './SlashMenu';
import { filterSlash, SLASH_ITEMS, type SlashItem } from './slashItems';
import { useDictation } from './useDictation';

type SaveState = 'saved' | 'unsaved' | 'saving' | 'error';
type LocalDraft = { title: string; html: string; json: JSONContent; at: number; synced: boolean };

const AUTOSAVE_MS = 1500;
const SESSION_REPORT_MS = 30_000;
const SPRINTS = [10, 15, 25] as const;
const BACK: Record<string, string> = {
  journal: '/desk/journal',
  essay: '/desk/essays',
  note: '/desk/notes',
};

const draftKey = (id: string) => `words-draft:${id}`;

function wordsOf(editor: Editor | null): number {
  const storage = editor?.storage as { characterCount?: { words: () => number } } | undefined;
  return storage?.characterCount?.words() ?? 0;
}

/** Where to put the caret's line: the vertical centre of the window. */
function typewriterScroll(editor: Editor) {
  const { from } = editor.state.selection;
  const coords = editor.view.coordsAtPos(from);
  const delta = coords.top - window.innerHeight * 0.45;
  if (Math.abs(delta) > 48) window.scrollBy({ top: delta, behavior: 'smooth' });
}

export function WritingRoom({ entry }: { entry: EntryDetail }) {
  const prefs = usePreferences();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const invalidate = useInvalidateWriting();
  const deleteEntry = useDeleteEntry();
  const overview = useOverview();
  const quote = useRandomQuote('editor', prefs.editorQuotes);
  const saveQuote = useSaveQuote();

  const [input, setInput] = useState<EntryInput>(() => toInput(entry));
  const inputRef = useRef(input);
  const [slug, setSlug] = useState(entry.slug);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [words, setWords] = useState(entry.wordCount);
  const [isEmpty, setIsEmpty] = useState(entry.wordCount === 0);
  const [focusMode, setFocusMode] = useState(false);
  const [typewriter, setTypewriter] = useState(prefs.typewriterScrolling);
  const [showDetails, setShowDetails] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [sprint, setSprint] = useState<{
    minutes: number;
    endsAt: number;
    startWords: number;
  } | null>(() => {
    // A sprint can be started from the URL (?sprint=15), e.g. from the command palette.
    const minutes = Number(params.get('sprint'));
    return SPRINTS.includes(minutes as (typeof SPRINTS)[number])
      ? { minutes, endsAt: Date.now() + minutes * 60_000, startWords: entry.wordCount }
      : null;
  });
  const sprintRef = useRef(sprint);
  const wordsRef = useRef(entry.wordCount);
  const [sprintPicker, setSprintPicker] = useState(false);
  const [restore, setRestore] = useState<LocalDraft | null>(null);
  const [slash, setSlash] = useState<{
    query: string;
    from: number;
    left: number;
    top: number;
    active: number;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const [baseline, setBaseline] = useState(entry.wordCount);
  const imageInput = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  // Save plumbing lives in refs so timers and listeners always see the latest state.
  const dirty = useRef(false);
  const saving = useRef<Promise<void> | null>(null);
  const timer = useRef(0);
  const session = useRef<{
    id: string | null;
    starting: boolean;
    baseline: number;
    reported: number;
  }>({
    id: null,
    starting: false,
    baseline: entry.wordCount,
    reported: -1,
  });

  const editorRef = useRef<Editor | null>(null);

  const save = useCallback(async (): Promise<void> => {
    if (saving.current) await saving.current;
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed || !dirty.current) return;
    dirty.current = false;
    setSaveState('saving');
    const body: EntryInput = {
      ...inputRef.current,
      contentHtml: editor.getHTML(),
      contentJson: editor.getJSON() as JSONContent,
    };
    const run = saveEntry(entry.id, body)
      .then((saved) => {
        setSlug(saved.slug);
        if (!dirty.current) setSaveState('saved');
        void set(draftKey(entry.id), {
          title: body.title ?? '',
          html: body.contentHtml ?? '',
          json: body.contentJson ?? {},
          at: Date.now(),
          synced: true,
        } satisfies LocalDraft);
        invalidate();
      })
      .catch((error: unknown) => {
        dirty.current = true;
        setSaveState('error');
        toast(errorMessage(error, 'Could not save. Your words are kept on this device.'), 'error');
      })
      .finally(() => {
        saving.current = null;
      });
    saving.current = run;
    return run;
  }, [entry.id, invalidate]);

  const scheduleSave = useCallback(() => {
    dirty.current = true;
    setSaveState('unsaved');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void save();
    }, AUTOSAVE_MS);
  }, [save]);

  /** Back up to IndexedDB on every change: nothing is lost if the network or tab dies. */
  const backup = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || editor.isDestroyed) return;
    void set(draftKey(entry.id), {
      title: inputRef.current.title ?? '',
      html: editor.getHTML(),
      json: editor.getJSON() as JSONContent,
      at: Date.now(),
      synced: false,
    } satisfies LocalDraft);
  }, [entry.id]);

  const reportProgress = useCallback((final = false) => {
    const s = session.current;
    if (!s.id) return;
    const added = Math.max(0, wordsOf(editorRef.current) - s.baseline);
    if (added === s.reported && !final) return;
    s.reported = added;
    void reportSession(s.id, added).catch(() => undefined);
  }, []);

  const ensureSession = useCallback(() => {
    const s = session.current;
    if (s.id || s.starting) return;
    s.starting = true;
    startSession(entry.id)
      .then(({ id }) => {
        s.id = id;
      })
      .catch(() => {
        s.starting = false;
      });
  }, [entry.id]);

  const update = useCallback(
    (patch: Partial<EntryInput>) => {
      inputRef.current = { ...inputRef.current, ...patch };
      setInput(inputRef.current);
      backup();
      scheduleSave();
    },
    [backup, scheduleSave],
  );

  const insertImage = useCallback((file: File) => {
    const editor = editorRef.current;
    if (!editor) return;
    toast('Uploading image…');
    uploadImage(file)
      .then((media) => {
        editor.chain().focus().setImage({ src: media.url, alt: '' }).run();
      })
      .catch((error: unknown) => {
        toast(errorMessage(error, 'Upload failed.'), 'error');
      });
  }, []);

  const filtered = useMemo(() => (slash ? filterSlash(SLASH_ITEMS, slash.query) : []), [slash]);
  // The editor's key handlers are created once, so they read the latest menu state through refs.
  const slashRef = useRef(slash);
  const filteredRef = useRef(filtered);
  useEffect(() => {
    slashRef.current = slash;
    filteredRef.current = filtered;
  }, [slash, filtered]);

  const pickSlash = useCallback((item: SlashItem) => {
    const editor = editorRef.current;
    const s = slashRef.current;
    if (!editor || !s) return;
    editor.chain().focus().deleteRange({ from: s.from, to: editor.state.selection.from }).run();
    if (item.id === 'image') imageInput.current?.click();
    else item.run(editor);
    setSlash(null);
  }, []);

  const typewriterRef = useRef(typewriter);
  useEffect(() => {
    typewriterRef.current = typewriter;
  }, [typewriter]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      }),
      Placeholder.configure({
        placeholder:
          entry.type === 'journal'
            ? 'What is on your mind today?'
            : 'Begin anywhere. Type / for blocks.',
      }),
      CharacterCount,
      Focus.configure({ className: 'has-focus', mode: 'shallowest' }),
      Image.configure({ inline: false }),
      Highlight,
      Typography,
    ],
    content: entry.contentJson.type === 'doc' ? entry.contentJson : entry.contentHtml,
    editorProps: {
      attributes: { class: 'prose-words', 'aria-label': 'Entry text', spellcheck: 'true' },
      handleKeyDown: (_view, event) => {
        const s = slashRef.current;
        if (!s) return false;
        const list = filteredRef.current;
        if (event.key === 'ArrowDown') {
          setSlash({ ...s, active: (s.active + 1) % Math.max(list.length, 1) });
          return true;
        }
        if (event.key === 'ArrowUp') {
          setSlash({ ...s, active: (s.active - 1 + list.length) % Math.max(list.length, 1) });
          return true;
        }
        const item = list[s.active];
        if (event.key === 'Enter' && item) {
          pickSlash(item);
          return true;
        }
        if (event.key === 'Escape') {
          setSlash(null);
          return true;
        }
        return false;
      },
      handlePaste: (_view, event) => {
        const file = [...(event.clipboardData?.files ?? [])].find((f) =>
          f.type.startsWith('image/'),
        );
        if (!file) return false;
        insertImage(file);
        return true;
      },
      handleDrop: (_view, event) => {
        const file = [...(event.dataTransfer?.files ?? [])].find((f) =>
          f.type.startsWith('image/'),
        );
        if (!file) return false;
        event.preventDefault();
        insertImage(file);
        return true;
      },
    },
    onCreate: ({ editor: e }) => {
      // In development React mounts twice; the discarded editor still fires onCreate later.
      if (e.isDestroyed) return;
      session.current.baseline = wordsOf(e);
      setBaseline(wordsOf(e));
      setWords(wordsOf(e));
      setIsEmpty(e.isEmpty);
    },
    onUpdate: ({ editor: e }) => {
      setWords(wordsOf(e));
      setIsEmpty(e.isEmpty);
      ensureSession();
      backup();
      scheduleSave();
      setChromeVisible(false);
    },
    onSelectionUpdate: ({ editor: e }) => {
      // The slash menu: open while the current block starts with "/" and the caret is at its end.
      const { $from, empty } = e.state.selection;
      const text = $from.parent.textContent;
      if (
        empty &&
        $from.parent.isTextblock &&
        text.startsWith('/') &&
        $from.parentOffset === text.length &&
        text.length < 24 &&
        !text.includes(' ')
      ) {
        const coords = e.view.coordsAtPos($from.pos);
        setSlash((prev) => ({
          query: text.slice(1),
          from: $from.start(),
          left: coords.left,
          top: coords.bottom + 8,
          active: prev?.query === text.slice(1) ? prev.active : 0,
        }));
      } else if (slashRef.current) {
        setSlash(null);
      }
      if (typewriterRef.current) typewriterScroll(e);
    },
    onBlur: () => {
      if (dirty.current) void save();
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Offer to restore a newer, unsynced local copy (e.g. after the tab closed while offline).
  useEffect(() => {
    void get<LocalDraft>(draftKey(entry.id)).then((local) => {
      if (
        local?.synced === false &&
        local.at > Date.parse(entry.updatedAt) &&
        local.html !== entry.contentHtml
      )
        setRestore(local);
    });
  }, [entry.id, entry.updatedAt, entry.contentHtml]);

  // Periodic save and session reports; final ones when leaving.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (dirty.current) void save();
      reportProgress();
    }, SESSION_REPORT_MS);
    const tick = window.setInterval(() => {
      const t = Date.now();
      setNow(t);
      const running = sprintRef.current;
      if (running && t >= running.endsAt) {
        sprintRef.current = null;
        setSprint(null);
        toast(
          `Sprint done: ${formatNumber(Math.max(0, wordsRef.current - running.startWords))} words in ${running.minutes} minutes.`,
        );
      }
    }, 1000);
    const onHide = () => {
      if (document.visibilityState === 'hidden') {
        if (dirty.current) void save();
        reportProgress(true);
      }
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      reportProgress(true);
      if (dirty.current) {
        void save();
        event.preventDefault();
      }
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.clearInterval(interval);
      window.clearInterval(tick);
      window.clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (dirty.current) void save();
      reportProgress(true);
    };
  }, [save, reportProgress]);

  // Once read, the sprint parameter is removed so a reload does not restart it.
  useEffect(() => {
    if (!params.has('sprint')) return;
    const next = new URLSearchParams(params);
    next.delete('sprint');
    setParams(next, { replace: true });
  }, [params, setParams]);

  useEffect(() => {
    sprintRef.current = sprint;
    wordsRef.current = words;
  }, [sprint, words]);

  const publish = useCallback(
    (on: boolean) => {
      const patch: Partial<EntryInput> = { status: on ? 'published' : 'draft' };
      if (on && inputRef.current.type === 'essay' && inputRef.current.visibility === 'private')
        patch.visibility = 'public';
      update(patch);
      void save().then(() => {
        toast(
          on
            ? inputRef.current.visibility === 'private'
              ? 'Saved as published (private)'
              : 'Published'
            : 'Moved back to drafts',
        );
      });
    },
    [save, update],
  );

  const leave = useCallback(() => {
    void save().finally(() => {
      void navigate(BACK[inputRef.current.type] ?? '/desk');
    });
  }, [navigate, save]);

  const dictation = useDictation(
    useCallback((text: string) => {
      const e = editorRef.current;
      if (!e) return;
      const parts = text.split(/\n\n/);
      parts.forEach((part, i) => {
        if (i > 0) e.chain().focus().splitBlock().run();
        const { $from } = e.state.selection;
        const atStart = $from.parentOffset === 0;
        const before = $from.parent.textContent.slice(0, $from.parentOffset);
        const chunk = part.replace(/\n/g, ' ').trim();
        if (!chunk) return;
        const sentenceStart = atStart || /[.?!]\s*$/.test(before);
        const text2 = sentenceStart ? chunk.charAt(0).toUpperCase() + chunk.slice(1) : chunk;
        const spacer = atStart || /\s$/.test(before) ? '' : ' ';
        e.chain()
          .focus()
          .insertContent(spacer + text2)
          .run();
      });
    }, []),
  );

  // Keyboard: save, publish, focus mode, exit.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isModKey(event) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        dirty.current = true;
        void save().then(() => {
          toast('Saved');
        });
      } else if (isModKey(event) && event.key === 'Enter') {
        event.preventDefault();
        publish(inputRef.current.status !== 'published');
      } else if (isModKey(event) && event.key === '.') {
        event.preventDefault();
        setFocusMode((f) => !f);
      } else if (
        isModKey(event) &&
        event.shiftKey &&
        event.key.toLowerCase() === 'd' &&
        prefs.dictation
      ) {
        event.preventDefault();
        dictation.toggle();
      } else if (event.key === 'Escape' && !slashRef.current) {
        if (showDetails) setShowDetails(false);
        else if (focusMode) setFocusMode(false);
        else leave();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [save, publish, leave, showDetails, focusMode, dictation, prefs.dictation]);

  // Chrome fades while typing and returns when the mouse moves.
  useEffect(() => {
    const show = () => {
      setChromeVisible(true);
    };
    window.addEventListener('mousemove', show);
    return () => {
      window.removeEventListener('mousemove', show);
    };
  }, []);

  const onDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      toast('Press delete again to remove this entry for good.');
      window.setTimeout(() => {
        setConfirmDelete(false);
      }, 4000);
      return;
    }
    dirty.current = false;
    window.clearTimeout(timer.current);
    deleteEntry.mutate(entry.id, {
      onSuccess: () => {
        void del(draftKey(entry.id));
        toast('Deleted');
        void navigate(BACK[inputRef.current.type] ?? '/desk', { replace: true });
      },
    });
  };

  const sessionSeconds = Math.floor((now - openedAt) / 1000);
  const goal = overview.data?.dailyWordGoal ?? 0;
  const addedThisSession = Math.max(0, words - baseline);
  const todayWords = (overview.data?.today.words ?? 0) + addedThisSession;
  const chromeShown = !focusMode && (chromeVisible || showDetails);
  const sprintLeft = sprint ? Math.max(0, sprint.endsAt - now) : 0;

  return (
    <div className="relative min-h-dvh">
      {/* Sprint: a hairline that runs across the top. */}
      {sprint && (
        <div
          className="fixed inset-x-0 top-0 z-50 h-px bg-hairline"
          aria-label={`Sprint: ${Math.ceil(sprintLeft / 60_000)} minutes left`}
          role="timer"
        >
          <div
            className="h-full bg-accent transition-[width] duration-1000 ease-linear"
            style={{ width: `${(1 - sprintLeft / (sprint.minutes * 60_000)) * 100}%` }}
          />
        </div>
      )}

      <motion.header
        className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-4 bg-bg/85 px-(--gutter) py-4 backdrop-blur-sm"
        animate={{ opacity: chromeShown ? 1 : 0, y: chromeShown ? 0 : -8 }}
        transition={{ duration: 0.6, ease: EASE }}
        style={{ pointerEvents: chromeShown ? 'auto' : 'none' }}
      >
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={leave}
            className="inline-flex items-center gap-2 meta transition-colors hover:text-ink"
            aria-label="Back (Esc)"
          >
            <ArrowLeft aria-hidden className="size-3.5" strokeWidth={1.25} />
            {input.type}
          </button>
          <span className={cn('meta', saveState === 'error' && 'text-accent')} aria-live="polite">
            {saveState === 'saved'
              ? 'Saved'
              : saveState === 'saving'
                ? 'Saving…'
                : saveState === 'error'
                  ? 'Not saved, retrying'
                  : 'Editing'}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          {prefs.dictation && dictation.state !== 'unsupported' && (
            <button
              type="button"
              onClick={dictation.toggle}
              aria-pressed={dictation.state === 'listening'}
              title="Dictate (Ctrl Shift D)"
              className={cn(
                'relative p-2 transition-colors',
                dictation.state === 'listening' ? 'text-accent' : 'text-muted hover:text-ink',
              )}
            >
              {dictation.state === 'listening' ? (
                <Mic aria-hidden className="size-4" strokeWidth={1.25} />
              ) : (
                <MicOff aria-hidden className="size-4" strokeWidth={1.25} />
              )}
              <span className="sr-only">
                {dictation.state === 'listening' ? 'Stop dictation' : 'Start dictation'}
              </span>
              {dictation.state === 'listening' && (
                <span
                  aria-hidden
                  className="absolute top-1.5 right-1.5 size-1.5 animate-pulse rounded-full bg-accent"
                />
              )}
            </button>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                if (sprint) setSprint(null);
                else setSprintPicker((v) => !v);
              }}
              className={cn(
                'inline-flex items-center gap-2 p-2 meta transition-colors',
                sprint ? 'text-accent' : 'hover:text-ink',
              )}
              title="Writing sprint"
            >
              <Timer aria-hidden className="size-4" strokeWidth={1.25} />
              <span className="hidden num sm:inline">
                {sprint
                  ? `${pad2(Math.floor(sprintLeft / 60_000))}:${pad2(Math.floor((sprintLeft % 60_000) / 1000))}`
                  : 'Sprint'}
              </span>
            </button>
            <AnimatePresence>
              {sprintPicker && !sprint && (
                <motion.div
                  className="absolute top-full right-0 mt-2 flex gap-1 border-hair border-hairline-strong bg-bg p-1"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {SPRINTS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className="px-3 py-1.5 num text-ui text-muted transition-colors hover:text-accent"
                      onClick={() => {
                        setSprint({
                          minutes: m,
                          endsAt: Date.now() + m * 60_000,
                          startWords: words,
                        });
                        setSprintPicker(false);
                        editorRef.current?.commands.focus();
                      }}
                    >
                      {m}m
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button
            type="button"
            onClick={() => {
              setFocusMode(true);
            }}
            className="p-2 text-muted transition-colors hover:text-ink"
            title="Focus mode (Ctrl .)"
          >
            <Eye aria-hidden className="size-4" strokeWidth={1.25} />
            <span className="sr-only">Focus mode</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setTypewriter((t) => !t);
            }}
            aria-pressed={typewriter}
            className={cn(
              'hidden p-2 meta transition-colors sm:inline',
              typewriter ? 'text-ink' : 'hover:text-ink',
            )}
            title="Typewriter scrolling keeps your line in the middle"
          >
            Typewriter
          </button>
          <button
            type="button"
            onClick={() => {
              setShowDetails(true);
            }}
            className="inline-flex items-center gap-2 p-2 meta transition-colors hover:text-ink"
            title="Details and publishing"
          >
            <PanelRight aria-hidden className="size-4" strokeWidth={1.25} />
            <span className="hidden sm:inline">
              {input.status === 'published'
                ? input.visibility === 'private'
                  ? 'Private'
                  : 'Published'
                : 'Draft'}
            </span>
          </button>
        </div>
      </motion.header>

      <div className="mx-auto max-w-[44rem] px-(--gutter) pt-32 md:pt-40">
        {restore && (
          <div
            className="border-accent-line mb-10 flex flex-wrap items-center justify-between gap-4 border-hair px-5 py-4"
            role="alert"
          >
            <p className="text-ui text-ink">
              A newer copy of this entry was found on this device, from a session that did not
              finish saving.
            </p>
            <div className="flex gap-4">
              <button
                type="button"
                className="meta text-accent"
                onClick={() => {
                  editor.commands.setContent(
                    restore.json.type === 'doc' ? restore.json : restore.html,
                  );
                  update({ title: restore.title });
                  setRestore(null);
                }}
              >
                Restore it
              </button>
              <button
                type="button"
                className="meta hover:text-ink"
                onClick={() => {
                  setRestore(null);
                }}
              >
                Discard
              </button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {prefs.editorQuotes && isEmpty && quote.data && (
            <motion.figure
              className="mb-12 flex items-start justify-between gap-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.55 }}
              exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
              transition={{ duration: 1, ease: EASE }}
            >
              <div>
                <blockquote className="font-serif text-h4 leading-snug font-[300] text-ink italic">
                  “{quote.data.text}”
                </blockquote>
                <figcaption className="mt-2 meta">{quote.data.author}</figcaption>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  aria-label="Another quote"
                  onClick={() => void quote.refetch()}
                  className="p-1.5 text-muted hover:text-ink"
                >
                  <Shuffle aria-hidden className="size-3.5" strokeWidth={1.25} />
                </button>
                <button
                  type="button"
                  aria-label={quote.data.favorite ? 'Unfavorite quote' : 'Favorite quote'}
                  aria-pressed={quote.data.favorite}
                  onClick={() => {
                    const q = quote.data;
                    saveQuote.mutate(
                      { id: q.id, input: { ...q, favorite: !q.favorite } },
                      { onSuccess: () => void quote.refetch() },
                    );
                  }}
                  className={cn(
                    'p-1.5',
                    quote.data.favorite ? 'text-accent' : 'text-muted hover:text-ink',
                  )}
                >
                  <Heart
                    aria-hidden
                    className="size-3.5"
                    strokeWidth={1.25}
                    fill={quote.data.favorite ? 'currentColor' : 'none'}
                  />
                </button>
              </div>
            </motion.figure>
          )}
        </AnimatePresence>

        <textarea
          ref={titleRef}
          value={input.title ?? ''}
          rows={1}
          aria-label="Title"
          placeholder={input.type === 'journal' ? 'A title, if you like' : 'Title'}
          onChange={(e) => {
            e.target.style.height = 'auto';
            e.target.style.height = `${e.target.scrollHeight}px`;
            update({ title: e.target.value });
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              editor.commands.focus('start');
            }
          }}
          className={cn(
            'w-full resize-none overflow-hidden bg-transparent font-serif text-h1 leading-[1.05] font-[320] tracking-tight text-ink placeholder:text-muted placeholder:opacity-40 focus:outline-none',
            focusMode && 'opacity-30 transition-opacity duration-700 focus:opacity-100',
          )}
        />
        <div className="mt-6 mb-10 h-hair w-12 bg-accent" />

        <div className={cn('editor-surface', focusMode && 'is-focus')}>
          <EditorContent editor={editor} />
        </div>
        <input
          ref={imageInput}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (file) insertImage(file);
          }}
        />
      </div>

      {slash && (
        <SlashMenu
          items={filtered}
          active={slash.active}
          position={{ left: slash.left, top: slash.top }}
          onPick={pickSlash}
        />
      )}

      <AnimatePresence>
        {dictation.state === 'listening' && (
          <motion.div
            className="border-accent-line fixed bottom-16 left-1/2 z-50 flex max-w-[90vw] -translate-x-1/2 items-center gap-3 border-hair bg-bg px-4 py-2"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            role="status"
          >
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-accent" />
            <span className="truncate text-ui text-muted italic">
              {dictation.interim || 'Listening… say “new paragraph” or “full stop”.'}
            </span>
          </motion.div>
        )}
        {(dictation.state === 'denied' || dictation.state === 'error') && prefs.dictation && (
          <motion.p
            className="fixed bottom-16 left-1/2 z-50 -translate-x-1/2 text-ui text-accent"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {dictation.state === 'denied'
              ? 'Microphone access was refused.'
              : 'Dictation stopped. Try again.'}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Quiet numbers at the bottom, and progress toward today's goal as a thin line. */}
      <footer
        className={cn(
          'fixed inset-x-0 bottom-0 z-30 bg-bg/85 backdrop-blur-sm transition-opacity duration-700',
          focusMode && 'opacity-0 hover:opacity-100',
        )}
      >
        {goal > 0 && (
          <div className="h-px w-full bg-hairline" aria-hidden>
            <div
              className="h-full bg-accent transition-[width] duration-700 ease-editorial"
              style={{ width: `${Math.min(100, (todayWords / goal) * 100)}%` }}
            />
          </div>
        )}
        <div className="flex items-center justify-between gap-4 px-(--gutter) py-2.5">
          <div className="flex items-center gap-5">
            <span className="num text-[0.6875rem] text-muted">
              <span className="text-ink">{formatNumber(words)}</span> words
            </span>
            <span className="hidden num text-[0.6875rem] text-muted sm:inline">
              {Math.max(1, Math.ceil(words / 230))} min read
            </span>
            <span className="num text-[0.6875rem] text-muted">
              {pad2(Math.floor(sessionSeconds / 60))}:{pad2(sessionSeconds % 60)}
            </span>
          </div>
          {goal > 0 && (
            <span className="num text-[0.6875rem] text-muted">
              today {formatNumber(todayWords)} / {formatNumber(goal)}
            </span>
          )}
          {focusMode && (
            <button
              type="button"
              className="meta hover:text-ink"
              onClick={() => {
                setFocusMode(false);
              }}
            >
              Leave focus
            </button>
          )}
        </div>
      </footer>

      <AnimatePresence>
        {showDetails && (
          <>
            <motion.div
              aria-hidden
              className="fixed inset-0 z-[65] bg-bg/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowDetails(false);
              }}
            />
            <DetailsPanel
              input={input}
              onChange={update}
              onClose={() => {
                setShowDetails(false);
              }}
              onPublish={publish}
              onDelete={onDelete}
              publicSlug={slug}
            />
          </>
        )}
      </AnimatePresence>

      <Link to="/desk" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2">
        Back to the Desk
      </Link>
    </div>
  );
}
