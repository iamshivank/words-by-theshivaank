import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge the design system's custom scales, so `text-meta` (a size) and
// `text-ink` (a color) are not treated as conflicting, while `w-12` still overrides `w-full`.
const merge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['meta', 'ui', 'base', 'read', 'h4', 'h3', 'h2', 'h1', 'display', 'mark'],
      color: [
        'bg',
        'surface',
        'ink',
        'muted',
        'hairline',
        'hairline-strong',
        'accent',
        'accent-soft',
      ],
      spacing: ['hair'],
      radius: ['hair'],
      tracking: ['display', 'tight', 'meta', 'wide'],
    },
    classGroups: {
      'border-w': ['border-hair'],
      'border-w-t': ['border-t-hair'],
      'border-w-b': ['border-b-hair'],
      'border-w-l': ['border-l-hair'],
      'border-w-r': ['border-r-hair'],
    },
  },
});

export function cn(...inputs: ClassValue[]): string {
  return merge(clsx(inputs));
}
