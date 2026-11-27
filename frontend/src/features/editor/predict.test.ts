import { describe, expect, it } from 'vitest';
import { NGramModel, Predictor, tokenize } from './predict';

const past = [
  'Today I felt grateful for the quiet morning. I want to write more.',
  'I want to write every day. The quiet morning helps me think.',
  'I want to write before work, when the house is quiet.',
];

const predictor = (texts = past) => new Predictor([new NGramModel(texts)]);

describe('tokenize', () => {
  it('lower-cases words and marks sentence boundaries', () => {
    expect(tokenize("Hello there. It's me")).toEqual(['hello', 'there', null, "it's", 'me']);
  });
});

describe('Predictor', () => {
  it('completes a word from the writer’s vocabulary, preferring what fits the context', () => {
    expect(predictor().suggest('The quiet mor')).toBe('ning');
  });

  it('predicts the next words when the history is confident', () => {
    expect(predictor().suggest('Tomorrow I want ')).toBe('to write');
  });

  it('completes the word and continues the phrase', () => {
    expect(predictor().suggest('I want to wr')).toBe('ite');
  });

  it('stays quiet when the next word is a guess', () => {
    expect(predictor().suggest('Nothing about this ')).toBeNull();
    expect(predictor().suggest('')).toBeNull();
  });

  it('does not let a sentence end predict the next sentence', () => {
    expect(predictor().suggest('I want to write more. ')).toBeNull();
  });

  it('needs at least two letters before completing', () => {
    expect(predictor().suggest('The q')).toBeNull();
  });

  it('keeps the writer’s capitals', () => {
    expect(predictor().suggest('QUIE')).toBe('T MORNING');
    expect(predictor().suggest('Mor')).toBe('ning');
  });

  it('leaves a finished word alone unless a longer one is likelier', () => {
    expect(predictor(['a long walk', 'walking']).suggest('A long walk')).toBeNull();
    expect(
      predictor(['walk', 'walking home', 'walking slowly', 'walking fast']).suggest('Go walk'),
    ).toBe('ing');
  });

  it('falls back to common words before there is any history', () => {
    expect(new Predictor([new NGramModel()]).suggest('Yesterd')).toBe('ay');
  });

  it('adds counts from several models together', () => {
    const p = new Predictor([
      new NGramModel(['dear diary']),
      new NGramModel(['dear diary, again']),
    ]);
    expect(p.suggest('Oh dear ')).toBe('diary');
  });
});
