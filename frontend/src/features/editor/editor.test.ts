import { describe, expect, it } from 'vitest';
import { snippetParts } from '@/lib/format';
import { filterSlash, SLASH_ITEMS } from './slashItems';
import { applySpokenPunctuation } from './useDictation';

describe('dictation', () => {
  it('turns spoken punctuation into marks and capitalises new sentences', () => {
    expect(
      applySpokenPunctuation('i missed the deadline full stop it was fear comma not time'),
    ).toBe('i missed the deadline. It was fear, not time');
    expect(applySpokenPunctuation('first thought new paragraph second thought')).toBe(
      'first thought\n\nSecond thought',
    );
    expect(applySpokenPunctuation('was it worth it question mark')).toBe('was it worth it?');
  });
});

describe('search snippets', () => {
  it('splits highlight markers into parts without ever producing HTML', () => {
    expect(snippetParts('a [[match]] and <b>tags</b>')).toEqual([
      { text: 'a ', hit: false },
      { text: 'match', hit: true },
      { text: ' and <b>tags</b>', hit: false },
    ]);
    expect(snippetParts(null)).toEqual([]);
  });
});

describe('slash menu', () => {
  it('filters by label and keywords', () => {
    expect(filterSlash(SLASH_ITEMS, 'he').map((i) => i.id)).toEqual(['h2', 'h3']);
    expect(filterSlash(SLASH_ITEMS, 'photo').map((i) => i.id)).toEqual(['image']);
    expect(filterSlash(SLASH_ITEMS, '')).toHaveLength(SLASH_ITEMS.length);
  });
});
