import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeName = 'noir' | 'paper';
export type ThemePreference = ThemeName | 'system';
export type BodyFont = 'serif' | 'sans';

export const APPEARANCE_STORAGE_KEY = 'words-appearance';

type AppearanceState = {
  /** null until chosen on this device; the site default from settings applies meanwhile. */
  preference: ThemePreference | null;
  /** null keeps the theme's own orange. */
  accentHue: number | null;
  setPreference: (preference: ThemePreference) => void;
  setAccentHue: (hue: number | null) => void;
};

export const useAppearance = create<AppearanceState>()(
  persist(
    (set) => ({
      preference: null,
      accentHue: null,
      setPreference: (preference) => {
        set({ preference });
      },
      setAccentHue: (accentHue) => {
        set({ accentHue });
      },
    }),
    {
      name: APPEARANCE_STORAGE_KEY,
      partialize: ({ preference, accentHue }) => ({ preference, accentHue }),
    },
  ),
);

export function resolveTheme(preference: ThemePreference, prefersLight: boolean): ThemeName {
  if (preference === 'system') return prefersLight ? 'paper' : 'noir';
  return preference;
}

export function nextTheme(current: ThemeName): ThemeName {
  return current === 'noir' ? 'paper' : 'noir';
}

/**
 * Runs a DOM change as a slow cross-fade: View Transitions where supported,
 * a temporary color transition otherwise. Instant when the user prefers reduced motion.
 */
export function crossFade(change: () => void): void {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    change();
    return;
  }
  if (typeof document.startViewTransition === 'function') {
    document.startViewTransition(change);
    return;
  }
  const root = document.documentElement;
  root.classList.add('theme-fading');
  change();
  window.setTimeout(() => {
    root.classList.remove('theme-fading');
  }, 750);
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
}

export function applyAccentHue(hue: number | null): void {
  const root = document.documentElement;
  if (hue === null) {
    delete root.dataset.accentHue;
    root.style.removeProperty('--accent-hue');
  } else {
    root.dataset.accentHue = '';
    root.style.setProperty('--accent-hue', String(Math.round(hue) % 360));
  }
}
