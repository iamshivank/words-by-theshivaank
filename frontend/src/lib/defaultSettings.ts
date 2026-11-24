import type { PublicSettings } from '@/api/types';

/**
 * Used only until the server's settings arrive (or if it is unreachable).
 * Mirrors the seed in backend V2__default_site_settings.sql; the real values live in the database.
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
      { id: 'latest', enabled: true },
      { id: 'about', enabled: true },
    ],
  },
};
