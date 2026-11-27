import { ArrowDown, ArrowUp } from 'lucide-react';
import type { LandingSectionId, Preferences, SiteSettings } from '@/api/types';
import { Hairline, LoadingLine, SectionLabel, Segmented, Switch, useTheme } from '@/design';
import { useSettingsDraft } from './useSettingsDraft';

const GROUPS: {
  title: string;
  items: { key: keyof Preferences; label: string; description: string }[];
}[] = [
  {
    title: 'Public site',
    items: [
      {
        key: 'flyingPosts',
        label: 'Flying essays',
        description: 'Essays drift across the landing page with their highlight labels.',
      },
      {
        key: 'customCursor',
        label: 'Ink pen cursor',
        description: 'A dot and ring that turns into a pen over links. Mouse only.',
      },
      {
        key: 'grain',
        label: 'Film grain',
        description: 'A faint printed texture over everything.',
      },
      {
        key: 'smoothScroll',
        label: 'Smooth scrolling',
        description: 'Weighted, calm scrolling on public pages.',
      },
      {
        key: 'showStreakOnLanding',
        label: 'Streak on the landing page',
        description: 'Only you see it, when signed in.',
      },
      { key: 'rssFeed', label: 'RSS feed', description: 'Publish /rss.xml for feed readers.' },
    ],
  },
  {
    title: 'Reading',
    items: [
      {
        key: 'readingProgress',
        label: 'Reading progress line',
        description: 'A thin orange line across the top as you read.',
      },
      { key: 'dropCap', label: 'Drop cap', description: 'A large first letter on each essay.' },
      {
        key: 'tableOfContents',
        label: 'Table of contents',
        description: 'In the margin on wide screens, for essays with headings.',
      },
      {
        key: 'showReadCounts',
        label: 'Show read counts',
        description: 'Show how many times an essay has been read.',
      },
    ],
  },
  {
    title: 'Writing',
    items: [
      {
        key: 'editorQuotes',
        label: 'Quote on the blank page',
        description: 'Fades away once you start typing.',
      },
      {
        key: 'typewriterScrolling',
        label: 'Typewriter scrolling',
        description: 'Keep the line you are writing in the middle of the screen.',
      },
      {
        key: 'dictation',
        label: 'Dictation',
        description: 'Speak instead of typing (Chrome, Edge and Safari). Ctrl Shift D.',
      },
      {
        key: 'autocomplete',
        label: 'Autocomplete',
        description:
          'Suggest the rest of a word or phrase as you type, learned from your own writing. Tab accepts.',
      },
      {
        key: 'dailyPrompt',
        label: 'Daily prompt on the Desk',
        description: 'One reflective question a day.',
      },
    ],
  },
];

const SECTION_NAMES: Record<LandingSectionId, string> = {
  hero: 'Opening (wordmark and quote)',
  flying: 'In flight (flying essays)',
  latest: 'Latest essays',
  about: 'About strip',
};

/** On/off switches. Each change saves straight away. */
export function PreferencesTab() {
  const { draft, save, saving } = useSettingsDraft();
  const { preference, setPreference } = useTheme();
  if (!draft) return <LoadingLine />;

  const commit = (next: SiteSettings, message?: string) => {
    save(next, message);
  };
  const toggle = (key: keyof Preferences, value: boolean) => {
    commit(
      { ...draft, preferences: { ...draft.preferences, [key]: value } },
      value ? 'Switched on' : 'Switched off',
    );
  };
  const sections = draft.landing.sections;
  const move = (index: number, by: -1 | 1) => {
    const next = [...sections];
    const [item] = next.splice(index, 1);
    if (!item) return;
    next.splice(index + by, 0, item);
    commit({ ...draft, landing: { sections: next } }, 'Landing order saved');
  };

  return (
    <div className="grid gap-16 lg:grid-cols-2">
      <div className="flex flex-col gap-12">
        {GROUPS.map((group, gi) => (
          <section key={group.title}>
            <SectionLabel index={String(gi + 1).padStart(2, '0')}>{group.title}</SectionLabel>
            <div className="mt-4 flex flex-col">
              {group.items.map((item) => (
                <div key={item.key}>
                  <Switch
                    label={item.label}
                    description={item.description}
                    checked={draft.preferences[item.key]}
                    disabled={saving}
                    onChange={(v) => {
                      toggle(item.key, v);
                    }}
                  />
                  <Hairline />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="flex flex-col gap-12">
        <section className="flex flex-col gap-6">
          <SectionLabel index="04">Landing page sections</SectionLabel>
          <ol>
            {sections.map((s, i) => (
              <li key={s.id}>
                <div className="flex items-center justify-between gap-4 py-3">
                  <span className="flex items-center gap-3">
                    <span className="num meta text-accent">{i + 1}</span>
                    <span className="text-ui text-ink">{SECTION_NAMES[s.id]}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <button
                      type="button"
                      aria-label="Move up"
                      disabled={i === 0 || saving}
                      onClick={() => {
                        move(i, -1);
                      }}
                      className="p-1 text-muted hover:text-ink disabled:opacity-30"
                    >
                      <ArrowUp aria-hidden className="size-3.5" strokeWidth={1.25} />
                    </button>
                    <button
                      type="button"
                      aria-label="Move down"
                      disabled={i === sections.length - 1 || saving}
                      onClick={() => {
                        move(i, 1);
                      }}
                      className="p-1 text-muted hover:text-ink disabled:opacity-30"
                    >
                      <ArrowDown aria-hidden className="size-3.5" strokeWidth={1.25} />
                    </button>
                    <Switch
                      className="py-0"
                      hideLabel
                      label={`Show ${SECTION_NAMES[s.id]}`}
                      checked={s.enabled}
                      disabled={saving}
                      onChange={(enabled) => {
                        commit({
                          ...draft,
                          landing: {
                            sections: sections.map((x) => (x.id === s.id ? { ...x, enabled } : x)),
                          },
                        });
                      }}
                    />
                  </span>
                </div>
                <Hairline />
              </li>
            ))}
          </ol>
          <p className="text-ui text-muted">
            Reorder with the arrows; the switch shows or hides a section.
          </p>
        </section>

        <section className="flex flex-col gap-8">
          <SectionLabel index="05">Appearance</SectionLabel>
          <div className="flex flex-col gap-3">
            <p className="meta">Default theme for visitors</p>
            <Segmented
              label="Default theme"
              value={draft.appearance.theme}
              onChange={(theme) => {
                commit({ ...draft, appearance: { ...draft.appearance, theme } });
              }}
              options={[
                { value: 'noir', label: 'Noir' },
                { value: 'paper', label: 'Paper' },
                { value: 'system', label: 'Follow system' },
              ]}
            />
          </div>
          <div className="flex flex-col gap-3">
            <p className="meta">On this device</p>
            <Segmented
              label="Theme on this device"
              value={preference}
              onChange={setPreference}
              options={[
                { value: 'noir', label: 'Noir' },
                { value: 'paper', label: 'Paper' },
                { value: 'system', label: 'System' },
              ]}
            />
          </div>
          <div className="flex flex-col gap-3">
            <label htmlFor="accent" className="flex items-baseline justify-between meta">
              Accent hue
              <span className="num text-ink">
                {draft.appearance.accentHue === null || draft.appearance.accentHue === undefined
                  ? 'orange'
                  : `${draft.appearance.accentHue}°`}
              </span>
            </label>
            <input
              id="accent"
              type="range"
              min={0}
              max={359}
              value={draft.appearance.accentHue ?? 45}
              onChange={(e) => {
                const hue = Number(e.target.value);
                document.documentElement.dataset.accentHue = '';
                document.documentElement.style.setProperty('--accent-hue', String(hue));
              }}
              onPointerUp={(e) => {
                commit(
                  {
                    ...draft,
                    appearance: {
                      ...draft.appearance,
                      accentHue: Number((e.target as HTMLInputElement).value),
                    },
                  },
                  'Accent saved',
                );
              }}
              onKeyUp={(e) => {
                commit(
                  {
                    ...draft,
                    appearance: {
                      ...draft.appearance,
                      accentHue: Number((e.target as HTMLInputElement).value),
                    },
                  },
                  'Accent saved',
                );
              }}
              className="range-hair w-full"
              style={{
                background:
                  'linear-gradient(90deg, oklch(0.7 0.18 0), oklch(0.7 0.18 60), oklch(0.7 0.18 120), oklch(0.7 0.18 180), oklch(0.7 0.18 240), oklch(0.7 0.18 300), oklch(0.7 0.18 359)) center / 100% 1px no-repeat',
              }}
            />
            <button
              type="button"
              className="self-start meta hover:text-ink"
              onClick={() => {
                delete document.documentElement.dataset.accentHue;
                document.documentElement.style.removeProperty('--accent-hue');
                commit(
                  { ...draft, appearance: { ...draft.appearance, accentHue: null } },
                  'Back to orange',
                );
              }}
            >
              Reset to orange
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <p className="meta">Reading font</p>
            <Segmented
              label="Reading font"
              value={draft.appearance.bodyFont}
              onChange={(bodyFont) => {
                commit({ ...draft, appearance: { ...draft.appearance, bodyFont } });
              }}
              options={[
                { value: 'serif', label: 'Serif' },
                { value: 'sans', label: 'Sans' },
              ]}
            />
          </div>
          <div className="flex flex-col gap-3">
            <label htmlFor="size" className="flex items-baseline justify-between meta">
              Reading size <span className="num text-ink">{draft.appearance.baseFontSize}px</span>
            </label>
            <input
              id="size"
              type="range"
              min={15}
              max={24}
              value={draft.appearance.baseFontSize}
              onChange={(e) => {
                commit(
                  {
                    ...draft,
                    appearance: { ...draft.appearance, baseFontSize: Number(e.target.value) },
                  },
                  'Reading size saved',
                );
              }}
              className="range-hair w-full"
            />
          </div>
          <div className="flex flex-col gap-3">
            <label htmlFor="grain" className="flex items-baseline justify-between meta">
              Grain intensity{' '}
              <span className="num text-ink">{Math.round(draft.hero.grainIntensity * 100)}%</span>
            </label>
            <input
              id="grain"
              type="range"
              min={0}
              max={0.3}
              step={0.01}
              value={draft.hero.grainIntensity}
              onChange={(e) => {
                commit(
                  { ...draft, hero: { ...draft.hero, grainIntensity: Number(e.target.value) } },
                  'Grain saved',
                );
              }}
              className="range-hair w-full"
            />
          </div>
        </section>
      </div>
    </div>
  );
}
