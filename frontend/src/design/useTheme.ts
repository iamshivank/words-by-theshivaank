import { useCallback } from 'react';
import { useSiteSettings } from '@/api/settings';
import { useMediaQuery } from '@/lib/useMediaQuery';
import {
  applyAccentHue,
  applyTheme,
  crossFade,
  nextTheme,
  resolveTheme,
  useAppearance,
  type ThemeName,
  type ThemePreference,
} from './theme';

type ThemeControls = {
  /** The theme on screen right now. */
  theme: ThemeName;
  preference: ThemePreference;
  accentHue: number | null;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
  setAccentHue: (hue: number | null) => void;
};

/** Device choice wins; otherwise the site default from settings. */
export function useTheme(): ThemeControls {
  const settings = useSiteSettings();
  const prefersLight = useMediaQuery('(prefers-color-scheme: light)');
  const storedPreference = useAppearance((s) => s.preference);
  const storedHue = useAppearance((s) => s.accentHue);
  const storePreference = useAppearance((s) => s.setPreference);
  const storeHue = useAppearance((s) => s.setAccentHue);

  const preference = storedPreference ?? settings.appearance.theme;
  const theme = resolveTheme(preference, prefersLight);
  const accentHue = storedHue ?? settings.appearance.accentHue ?? null;

  const setPreference = useCallback(
    (next: ThemePreference) => {
      // Apply to the DOM inside the transition callback so the cross-fade captures the new state.
      crossFade(() => {
        applyTheme(resolveTheme(next, prefersLight));
        storePreference(next);
      });
    },
    [prefersLight, storePreference],
  );

  const toggle = useCallback(() => {
    setPreference(nextTheme(theme));
  }, [setPreference, theme]);

  const setAccentHue = useCallback(
    (hue: number | null) => {
      applyAccentHue(hue);
      storeHue(hue);
    },
    [storeHue],
  );

  return { theme, preference, accentHue, setPreference, toggle, setAccentHue };
}
