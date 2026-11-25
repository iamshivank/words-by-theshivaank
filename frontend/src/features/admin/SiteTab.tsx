import { ImagePlus, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRef, useState } from 'react';
import { uploadImage } from '@/api/admin';
import { errorMessage } from '@/api/client';
import type { SiteSettings } from '@/api/types';
import {
  Button,
  EASE,
  Hairline,
  Input,
  LoadingLine,
  SectionLabel,
  Textarea,
  toast,
} from '@/design';
import { useSettingsDraft } from './useSettingsDraft';

/** Site copy, social links, the hero image and writing targets. Saved together with one button. */
export function SiteTab() {
  const { draft, setDraft, dirty, save, saving, reset } = useSettingsDraft();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  if (!draft) return <LoadingLine />;
  const set = (patch: Partial<SiteSettings>) => {
    setDraft({ ...draft, ...patch });
  };

  return (
    <div className="flex flex-col gap-16 pb-24">
      <div className="grid gap-16 lg:grid-cols-2">
        <section className="flex flex-col gap-8">
          <SectionLabel index="01">Identity</SectionLabel>
          <Input
            label="Site name"
            value={draft.siteName}
            onChange={(e) => {
              set({ siteName: e.target.value });
            }}
          />
          <Input
            label="Byline"
            value={draft.byline}
            onChange={(e) => {
              set({ byline: e.target.value });
            }}
          />
          <Input
            label="Tagline"
            value={draft.tagline}
            onChange={(e) => {
              set({ tagline: e.target.value });
            }}
          />
          <Input
            label="Your name"
            value={draft.displayName}
            onChange={(e) => {
              set({ displayName: e.target.value });
            }}
            hint="Used in greetings and on the about page."
          />
        </section>
        <section className="flex flex-col gap-8">
          <SectionLabel index="02">About page</SectionLabel>
          <Textarea
            label="About"
            rows={12}
            value={draft.about}
            onChange={(e) => {
              set({ about: e.target.value });
            }}
            hint="Separate paragraphs with a blank line. The first paragraph also appears on the landing page."
          />
        </section>
      </div>

      <div className="grid gap-16 lg:grid-cols-2">
        <section className="flex flex-col gap-6">
          <SectionLabel index="03">Elsewhere</SectionLabel>
          {draft.social.map((link, i) => (
            <div key={i} className="grid grid-cols-[1fr_2fr_auto] items-end gap-4">
              <Input
                label="Label"
                value={link.label}
                onChange={(e) => {
                  set({
                    social: draft.social.map((s, j) =>
                      j === i ? { ...s, label: e.target.value } : s,
                    ),
                  });
                }}
              />
              <Input
                label="Address"
                value={link.url}
                placeholder="https://"
                onChange={(e) => {
                  set({
                    social: draft.social.map((s, j) =>
                      j === i ? { ...s, url: e.target.value } : s,
                    ),
                  });
                }}
              />
              <button
                type="button"
                aria-label="Remove link"
                className="mb-3 text-muted hover:text-accent"
                onClick={() => {
                  set({ social: draft.social.filter((_, j) => j !== i) });
                }}
              >
                <Trash2 aria-hidden className="size-3.5" strokeWidth={1.25} />
              </button>
            </div>
          ))}
          {draft.social.length < 12 && (
            <Button
              variant="text"
              size="sm"
              className="self-start"
              icon={<Plus aria-hidden className="size-3.5" strokeWidth={1.25} />}
              onClick={() => {
                set({ social: [...draft.social, { label: '', url: 'https://' }] });
              }}
            >
              Add a link
            </Button>
          )}
        </section>

        <section className="flex flex-col gap-8">
          <SectionLabel index="04">Writing targets</SectionLabel>
          <Input
            label="Daily word goal"
            type="number"
            min={0}
            max={20000}
            value={draft.writing.dailyWordGoal}
            onChange={(e) => {
              set({ writing: { ...draft.writing, dailyWordGoal: Number(e.target.value) } });
            }}
            hint="Shown as a thin line under the editor and on the Desk. 0 hides it."
          />
          <Input
            label="Reminder"
            value={draft.writing.reminderText}
            onChange={(e) => {
              set({ writing: { ...draft.writing, reminderText: e.target.value } });
            }}
          />
        </section>
      </div>

      <section className="flex flex-col gap-8">
        <SectionLabel index="05">Hero</SectionLabel>
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <div className="relative aspect-[16/9] overflow-hidden border-hair border-hairline-strong">
            {draft.hero.imageUrl ? (
              <img src={draft.hero.imageUrl} alt="" className="size-full object-cover" />
            ) : (
              <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-ui text-muted">
                No photograph: the landing page uses drifting contour lines.
              </p>
            )}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background: `color-mix(in oklab, var(--bg) ${Math.round(draft.hero.overlayDarkness * 100)}%, transparent)`,
              }}
            />
          </div>
          <div className="flex flex-col gap-8">
            <Input
              label="Image address"
              value={draft.hero.imageUrl ?? ''}
              placeholder="https://… or upload"
              onChange={(e) => {
                set({ hero: { ...draft.hero, imageUrl: e.target.value || null } });
              }}
            />
            <div className="flex flex-wrap gap-4">
              <Button
                size="sm"
                busy={uploading}
                busyLabel="Uploading"
                icon={<ImagePlus aria-hidden className="size-3.5" strokeWidth={1.25} />}
                onClick={() => fileRef.current?.click()}
              >
                Upload a photograph
              </Button>
              {draft.hero.imageUrl && (
                <Button
                  variant="text"
                  size="sm"
                  onClick={() => {
                    set({ hero: { ...draft.hero, imageUrl: null } });
                  }}
                >
                  Use contour lines
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                setUploading(true);
                uploadImage(file)
                  .then((m) => {
                    set({ hero: { ...draft.hero, imageUrl: m.url } });
                  })
                  .catch((err: unknown) => {
                    toast(errorMessage(err, 'Upload failed.'), 'error');
                  })
                  .finally(() => {
                    setUploading(false);
                  });
              }}
            />
            <div className="flex flex-col gap-3">
              <label htmlFor="overlay" className="flex items-baseline justify-between meta">
                Overlay darkness{' '}
                <span className="num text-ink">
                  {Math.round(draft.hero.overlayDarkness * 100)}%
                </span>
              </label>
              <input
                id="overlay"
                type="range"
                min={0}
                max={0.95}
                step={0.05}
                value={draft.hero.overlayDarkness}
                onChange={(e) => {
                  set({ hero: { ...draft.hero, overlayDarkness: Number(e.target.value) } });
                }}
                className="range-hair w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {dirty && (
          <motion.div
            className="fixed inset-x-0 bottom-0 z-40 bg-bg/90 backdrop-blur-md lg:left-60"
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <Hairline tone="accent" />
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-(--gutter) py-4 lg:px-14">
              <span className="text-ui text-muted">You have unsaved changes.</span>
              <div className="flex gap-6">
                <Button variant="text" onClick={reset}>
                  Discard
                </Button>
                <Button
                  busy={saving}
                  busyLabel="Saving"
                  onClick={() => {
                    save();
                  }}
                >
                  Save changes
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
