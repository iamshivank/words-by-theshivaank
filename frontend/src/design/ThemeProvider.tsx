import { useEffect, type ReactNode } from 'react';
import { useSiteSettings } from '@/api/settings';
import { applyAccentHue, applyTheme } from './theme';
import { useTheme } from './useTheme';

/** Keeps <html> in sync with the theme, accent and reading preferences. Renders its children untouched. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const { theme, accentHue } = useTheme();
  const { appearance, hero } = useSiteSettings();

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    applyAccentHue(accentHue);
  }, [accentHue]);

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty(
      '--body-font-family',
      appearance.bodyFont === 'sans' ? 'var(--font-sans)' : 'var(--font-serif)',
    );
    // A gentle fluid range around the chosen size: one pixel smaller on phones, the exact size on desktop.
    const size = appearance.baseFontSize;
    root.setProperty(
      '--reading-size',
      `clamp(${(size - 1) / 16}rem, ${(size - 1) / 16}rem + 0.0926vw, ${size / 16}rem)`,
    );
    root.setProperty('--grain-opacity', String(hero.grainIntensity));
  }, [appearance.bodyFont, appearance.baseFontSize, hero.grainIntensity]);

  return children;
}
