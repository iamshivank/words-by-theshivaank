import type { Preferences, PublicSettings } from '@/api/types';

export const DEFAULT_PREFERENCES: Preferences = {
  customCursor: true,
  grain: true,
  smoothScroll: true,
  flyingPosts: true,
  readingProgress: true,
  dropCap: true,
  tableOfContents: true,
  showReadCounts: false,
  showStreakOnLanding: true,
  rssFeed: true,
  editorQuotes: true,
  typewriterScrolling: true,
  dictation: true,
  dailyPrompt: true,
  autocomplete: true,
};

/**
 * Used only until the server's settings arrive (or if it is unreachable).
 * Mirrors the seed in backend V2/V3 migrations; the real values live in the database.
 */
export const DEFAULT_SETTINGS: PublicSettings = {
  siteName: 'Words',
  byline: 'By theshivaank',
  tagline: 'A quiet place to think in sentences.',
  displayName: 'Shivank',
  about: '',
  social: [],
  hero: { overlayDarkness: 0.55, grainIntensity: 0.06 },
  appearance: { theme: 'noir', bodyFont: 'serif', baseFontSize: 19 },
  landing: {
    sections: [
      { id: 'hero', enabled: true },
      { id: 'flying', enabled: true },
      { id: 'latest', enabled: true },
      { id: 'about', enabled: true },
    ],
  },
  preferences: DEFAULT_PREFERENCES,
};
