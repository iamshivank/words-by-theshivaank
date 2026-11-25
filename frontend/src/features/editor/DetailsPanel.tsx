import { ExternalLink, ImagePlus, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { useRef, useState } from 'react';
import { Link } from 'react-router';
import { uploadImage } from '@/api/admin';
import { errorMessage } from '@/api/client';
import type { EntryInput, EntryType, Visibility } from '@/api/types';
import { Button, EASE, Hairline, Input, Segmented, Switch, Textarea, toast } from '@/design';
import { cn } from '@/lib/cn';
import { ENERGY_WORDS, MOOD_WORDS } from '@/lib/format';

function Scale({
  label,
  value,
  words,
  onChange,
}: {
  label: string;
  value: number | null | undefined;
  words: readonly string[];
  onChange: (v: number | null) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="meta">
        {label} {value ? <span className="ml-2 text-ink normal-case">{words[value]}</span> : null}
      </legend>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-pressed={value === n}
            aria-label={`${label} ${n}: ${words[n] ?? ''}`}
            onClick={() => {
              onChange(value === n ? null : n);
            }}
            className={cn(
              'flex size-9 items-center justify-center rounded-full border-hair num text-ui transition-colors duration-500',
              value !== null && value !== undefined && n <= value
                ? 'border-accent text-accent'
                : 'border-hairline-strong text-muted hover:text-ink',
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function TagsField({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const add = () => {
    const name = draft.trim().replace(/,$/, '');
    if (name && !tags.some((t) => t.toLowerCase() === name.toLowerCase()) && tags.length < 12)
      onChange([...tags, name.slice(0, 40)]);
    setDraft('');
  };
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="tags-input" className="meta">
        Tags
      </label>
      <div className="flex flex-wrap items-center gap-2 border-b-hair border-hairline-strong pb-2">
        {tags.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1.5 border-hair border-hairline-strong px-2 py-0.5 text-ui text-ink"
          >
            {t}
            <button
              type="button"
              aria-label={`Remove ${t}`}
              onClick={() => {
                onChange(tags.filter((x) => x !== t));
              }}
              className="text-muted hover:text-accent"
            >
              <X aria-hidden className="size-3" strokeWidth={1.25} />
            </button>
          </span>
        ))}
        <input
          id="tags-input"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add();
            } else if (e.key === 'Backspace' && !draft && tags.length) {
              onChange(tags.slice(0, -1));
            }
          }}
          onBlur={add}
          placeholder={tags.length ? '' : 'Add a tag, press Enter'}
          className="min-w-24 flex-1 bg-transparent py-1 text-ui text-ink placeholder:text-muted focus:outline-none"
        />
      </div>
    </div>
  );
}

/** Everything about an entry except its words: type, visibility, address, tags, cover, label, mood. */
export function DetailsPanel({
  input,
  onChange,
  onClose,
  onPublish,
  onDelete,
  publicSlug,
}: {
  input: EntryInput;
  onChange: (patch: Partial<EntryInput>) => void;
  onClose: () => void;
  onPublish: (publish: boolean) => void;
  onDelete: () => void;
  publicSlug: string | null;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const published = input.status === 'published';
  const isEssay = input.type === 'essay';
  const isJournal = input.type === 'journal';
  const readable = published && input.visibility !== 'private';

  return (
    <motion.aside
      role="dialog"
      aria-label="Entry details"
      className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col overflow-y-auto border-l-hair border-hairline-strong bg-bg"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.7, ease: EASE }}
    >
      <div className="flex items-center justify-between px-8 pt-8">
        <p className="meta text-ink">Details</p>
        <button
          type="button"
          aria-label="Close details"
          onClick={onClose}
          className="p-1 text-muted hover:text-ink"
        >
          <X aria-hidden className="size-4" strokeWidth={1.25} />
        </button>
      </div>
      <div className="flex flex-col gap-9 px-8 py-8">
        <Segmented<EntryType>
          label="Type"
          value={input.type}
          onChange={(type) => {
            onChange({ type });
          }}
          options={[
            { value: 'journal', label: 'Journal' },
            { value: 'essay', label: 'Essay' },
            { value: 'note', label: 'Note' },
          ]}
        />

        <div className="flex flex-col gap-4">
          <p className="meta">Who can read it</p>
          <Segmented<Visibility>
            label="Visibility"
            value={input.visibility ?? 'private'}
            onChange={(visibility) => {
              onChange({ visibility });
            }}
            options={[
              { value: 'private', label: 'Only me' },
              { value: 'unlisted', label: 'Anyone with link' },
              { value: 'public', label: 'Public' },
            ]}
          />
          <p className="text-ui text-muted">
            {input.visibility === 'public'
              ? isEssay
                ? 'Listed on the site, in the feed and on the landing page once published.'
                : 'Readable by link once published. Only essays are listed on the site.'
              : input.visibility === 'unlisted'
                ? 'Not listed anywhere, but anyone with the link can read it once published.'
                : 'Private to you. Never shown on the public site.'}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={() => {
              onPublish(!published);
            }}
          >
            {published ? 'Unpublish' : 'Publish'}
          </Button>
          {readable && publicSlug && (
            <Link
              to={`/writing/${publicSlug}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 meta transition-colors hover:text-accent"
            >
              View <ExternalLink aria-hidden className="size-3" strokeWidth={1.25} />
            </Link>
          )}
        </div>

        <Hairline />

        {isJournal && (
          <>
            <Input
              label="Date"
              type="date"
              value={input.entryDate ?? ''}
              onChange={(e) => {
                onChange({ entryDate: e.target.value || null });
              }}
            />
            <Scale
              label="Mood"
              value={input.mood}
              words={MOOD_WORDS}
              onChange={(mood) => {
                onChange({ mood });
              }}
            />
            <Scale
              label="Energy"
              value={input.energy}
              words={ENERGY_WORDS}
              onChange={(energy) => {
                onChange({ energy });
              }}
            />
            <Textarea
              label="Grateful for"
              value={input.gratitude ?? ''}
              onChange={(e) => {
                onChange({ gratitude: e.target.value });
              }}
              placeholder="One small thing is enough"
            />
            <Textarea
              label="Lesson"
              value={input.lessons ?? ''}
              onChange={(e) => {
                onChange({ lessons: e.target.value });
              }}
              placeholder="What will you do differently?"
            />
          </>
        )}

        {!isJournal && (
          <Input
            label="Address"
            value={input.slug ?? ''}
            onChange={(e) => {
              onChange({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') });
            }}
            placeholder="made-from-the-title"
            hint={`/writing/${input.slug?.length ? input.slug : 'made-from-the-title'}`}
          />
        )}

        <TagsField
          tags={input.tags ?? []}
          onChange={(tags) => {
            onChange({ tags });
          }}
        />

        <Textarea
          label="Excerpt"
          value={input.excerpt ?? ''}
          onChange={(e) => {
            onChange({ excerpt: e.target.value });
          }}
          placeholder="Left empty, the first lines are used"
          maxLength={600}
        />

        {isEssay && (
          <>
            <Input
              label="Highlight label"
              value={input.highlightLabel ?? ''}
              maxLength={40}
              onChange={(e) => {
                onChange({ highlightLabel: e.target.value });
              }}
              placeholder="Fresh ink, Editor's pick, Long read…"
              hint="Hangs from the essay as it flies across the landing page."
            />
            <Switch
              label="Feature on the landing page"
              description="Featured essays fly first."
              checked={!!input.featured}
              onChange={(featured) => {
                onChange({ featured });
              }}
            />
          </>
        )}

        <div className="flex flex-col gap-3">
          <p className="meta">Cover image</p>
          {input.coverImageUrl && (
            <img src={input.coverImageUrl} alt="" className="aspect-[16/9] w-full object-cover" />
          )}
          <div className="flex flex-wrap items-center gap-4">
            <Button
              size="sm"
              busy={uploading}
              busyLabel="Uploading"
              icon={<ImagePlus aria-hidden className="size-3.5" strokeWidth={1.25} />}
              onClick={() => fileRef.current?.click()}
            >
              Upload
            </Button>
            {input.coverImageUrl && (
              <Button
                variant="text"
                size="sm"
                onClick={() => {
                  onChange({ coverImageUrl: null });
                }}
              >
                Remove
              </Button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp,image/avif"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              setUploading(true);
              uploadImage(file)
                .then((media) => {
                  onChange({ coverImageUrl: media.url });
                })
                .catch((error: unknown) => {
                  toast(errorMessage(error, 'Upload failed.'), 'error');
                })
                .finally(() => {
                  setUploading(false);
                });
            }}
          />
        </div>

        <Hairline />
        <Button
          variant="text"
          className="self-start text-muted hover:text-accent"
          icon={<Trash2 aria-hidden className="size-3.5" strokeWidth={1.25} />}
          onClick={onDelete}
        >
          Delete this entry
        </Button>
      </div>
    </motion.aside>
  );
}
