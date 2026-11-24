import { afterEach, describe, expect, it } from 'vitest';
import { applyAccentHue, applyTheme, nextTheme, resolveTheme } from './theme';

describe('theme', () => {
  afterEach(() => {
    applyAccentHue(null);
  });

  it('resolves system preference from the color scheme', () => {
    expect(resolveTheme('system', true)).toBe('paper');
    expect(resolveTheme('system', false)).toBe('noir');
    expect(resolveTheme('paper', false)).toBe('paper');
  });

  it('toggles between the two themes', () => {
    expect(nextTheme('noir')).toBe('paper');
    expect(nextTheme('paper')).toBe('noir');
  });

  it('writes the theme and accent hue to the root element', () => {
    const root = document.documentElement;
    applyTheme('paper');
    expect(root.dataset.theme).toBe('paper');

    applyAccentHue(212.4);
    expect(root.dataset.accentHue).toBe('');
    expect(root.style.getPropertyValue('--accent-hue')).toBe('212');

    applyAccentHue(null);
    expect(root.dataset.accentHue).toBeUndefined();
    expect(root.style.getPropertyValue('--accent-hue')).toBe('');
  });
});
