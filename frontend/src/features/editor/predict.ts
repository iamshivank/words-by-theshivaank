/**
 * Word prediction for the editor's inline autocomplete.
 *
 * A small n-gram model: it counts how often each word appears (unigrams), which word follows another
 * (bigrams) and which word follows a pair (trigrams). Suggestions come from the longest context that has
 * evidence, so "I want to" prefers whatever the writer usually puts after "want to". It is trained on the
 * writer's own entries plus the document being written, runs in the browser, and needs no network or key.
 */

const WORD = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
/** A context word separated from the next by sentence punctuation does not predict it. */
const BOUNDARY = /[.!?;:\n]/;

/** Common longer words, so word completion helps before there is much writing to learn from. */
const SEED_WORDS = `about above across actually after again against almost already also although always
among another answer anything anyway around because become before began behind being believe below between
beyond both bring brought build business careful certain change children choose clearly close coming
completely consider continue could country course create decided decision deeply different difficult
direction during early easier either else enough entire especially even evening every everyone everything
exactly experience family feeling feelings felt finally first follow forget forward friend friends future
general getting given going gratitude grateful happened happening happy hard having heart herself himself
honest honestly however idea important instead itself journal just knowing known later learn learned
learning least leave less letting little living longer looking lately making maybe meaning meeting
memory might moment moments morning mostly myself nothing noticed number often only others ourselves
outside people perhaps person place planning possible probably problem process question quickly quiet
quite rather really reason remember report right second seemed seems sentence should simple since small
something sometimes somewhere start started still story strange strong study suddenly something sure
taking talking thank thankful thing things think thinking those though thought thoughts through today
together tomorrow tonight toward trying under understand understanding until usually various very
waiting walking wanted wanting watching weekend whatever whether which while whole without wonder
wondering words working world would writing written yesterday yourself`;

type Counts = Map<string, number>;

function bump(map: Map<string, Counts>, key: string, next: string) {
  let counts = map.get(key);
  if (!counts) {
    counts = new Map();
    map.set(key, counts);
  }
  counts.set(next, (counts.get(next) ?? 0) + 1);
}

/** Words of a text, lower-cased, with a null where a sentence boundary breaks the chain. */
export function tokenize(text: string): (string | null)[] {
  const out: (string | null)[] = [];
  let last = 0;
  for (const match of text.matchAll(WORD)) {
    if (BOUNDARY.test(text.slice(last, match.index))) out.push(null);
    out.push(match[0].toLowerCase().replace(/’/g, "'"));
    last = match.index + match[0].length;
  }
  return out;
}

export class NGramModel {
  readonly unigrams: Counts = new Map();
  readonly bigrams = new Map<string, Counts>();
  readonly trigrams = new Map<string, Counts>();

  constructor(texts: Iterable<string> = []) {
    for (const text of texts) this.add(text);
  }

  add(text: string): this {
    const tokens = tokenize(text);
    for (let i = 0; i < tokens.length; i++) {
      const word = tokens[i];
      if (!word) continue;
      this.unigrams.set(word, (this.unigrams.get(word) ?? 0) + 1);
      const p1 = tokens[i - 1];
      const p2 = tokens[i - 2];
      if (p1) bump(this.bigrams, p1, word);
      if (p1 && p2) bump(this.trigrams, `${p2} ${p1}`, word);
    }
    return this;
  }
}

export type PredictOptions = {
  /** How many words a suggestion may run to (the completed word counts as one). */
  maxWords?: number;
  /** A next word needs at least this many sightings after its context. */
  minCount?: number;
  /** ...and at least this share of everything seen after that context. */
  minShare?: number;
  /** Shortest partial word worth completing. */
  minPrefix?: number;
};

const DEFAULTS: Required<PredictOptions> = {
  maxWords: 4,
  minCount: 2,
  minShare: 0.4,
  minPrefix: 2,
};

/** Several models (e.g. past writing and the current document) read as one by adding their counts. */
export class Predictor {
  private readonly models: NGramModel[];
  private readonly opts: Required<PredictOptions>;

  constructor(models: NGramModel[], opts: PredictOptions = {}) {
    this.models = models;
    this.opts = { ...DEFAULTS, ...opts };
  }

  private merged(pick: (m: NGramModel) => Counts | undefined): Counts {
    const out: Counts = new Map();
    for (const model of this.models) {
      const counts = pick(model);
      if (!counts) continue;
      for (const [word, n] of counts) out.set(word, (out.get(word) ?? 0) + n);
    }
    return out;
  }

  private unigram(word: string): number {
    let n = 0;
    for (const model of this.models) n += model.unigrams.get(word) ?? 0;
    return n;
  }

  /** Candidate next words for a context, from the longest context that has any evidence. */
  private following(p2: string | null, p1: string | null): Counts {
    if (p1 && p2) {
      const tri = this.merged((m) => m.trigrams.get(`${p2} ${p1}`));
      if (tri.size) return tri;
    }
    return p1 ? this.merged((m) => m.bigrams.get(p1)) : new Map<string, number>();
  }

  /** The best next word, only when the model is confident; otherwise null. */
  private confidentNext(p2: string | null, p1: string | null): string | null {
    const counts = this.following(p2, p1);
    let total = 0;
    let best: string | null = null;
    let bestN = 0;
    for (const [word, n] of counts) {
      total += n;
      if (n > bestN) {
        best = word;
        bestN = n;
      }
    }
    if (!best || bestN < this.opts.minCount || bestN / total < this.opts.minShare) return null;
    return best;
  }

  /** The likeliest whole word that starts with `prefix`, preferring words seen in this context. */
  private complete(prefix: string, p2: string | null, p1: string | null): string | null {
    const context = this.following(p2, p1);
    let best: string | null = null;
    let bestScore = 0;
    const consider = (word: string) => {
      if (word.length <= prefix.length || !word.startsWith(prefix)) return;
      // Context sightings dominate; overall frequency breaks ties and covers unseen contexts.
      const score =
        (context.get(word) ?? 0) * 1000 + this.unigram(word) + (SEED.has(word) ? 0.5 : 0);
      if (score > bestScore || (score === bestScore && best && word.length < best.length)) {
        best = word;
        bestScore = score;
      }
    };
    for (const model of this.models) for (const word of model.unigrams.keys()) consider(word);
    for (const word of SEED) consider(word);
    // "walk" is already a word: only offer "walked" if it is the likelier of the two here.
    const asTyped = (context.get(prefix) ?? 0) * 1000 + this.unigram(prefix);
    if (asTyped > 0 && asTyped >= bestScore) return null;
    return best;
  }

  /**
   * The text to show after the caret, or null. `before` is the text that precedes the caret.
   * Mid-word it completes the word (and may continue the phrase); after a space it predicts the
   * next words, but only when the writer's history makes them likely.
   */
  suggest(before: string): string | null {
    if (!before.trim()) return null;
    const tail = before.slice(-300);
    const partial = /[\p{L}\p{N}][\p{L}\p{N}'’-]*$/u.exec(tail)?.[0] ?? '';
    const head = tail.slice(0, tail.length - partial.length);
    // Only continue right after a word or a space; never after punctuation like "(" or a dash.
    if (!partial && !/[\p{L}\p{N}][,]?\s$/u.test(tail)) return null;

    const tokens = tokenize(head);
    let p1 = tokens.at(-1) ?? null;
    let p2 = tokens.at(-2) ?? null;
    // A sentence boundary after the last word means it does not predict what comes next.
    if (BOUNDARY.test(head.slice(head.search(/\S*\s*$/)))) {
      p1 = null;
      p2 = null;
    }

    const words: string[] = [];
    let text = '';
    if (partial) {
      if (partial.length < this.opts.minPrefix) return null;
      const lower = partial.toLowerCase().replace(/’/g, "'");
      const word = this.complete(lower, p2, p1);
      if (!word) return null;
      text = word.slice(lower.length);
      words.push(word);
      [p2, p1] = [p1, word];
    }
    while (words.length < this.opts.maxWords) {
      const next = this.confidentNext(p2, p1);
      if (!next) break;
      text += (text || partial ? ' ' : '') + next;
      words.push(next);
      [p2, p1] = [p1, next];
    }
    if (!text) return null;
    return matchCase(partial, text, head);
  }
}

const SEED = new Set(SEED_WORDS.split(/\s+/).filter(Boolean));

/** "Tod" → "ay", "TOD" → "AY"; the first word of a sentence is capitalised. */
function matchCase(partial: string, text: string, head: string): string {
  if (partial && partial.length > 1 && partial === partial.toUpperCase() && /\p{L}/u.test(partial))
    return text.toUpperCase();
  const sentenceStart = !partial && (/^\s*$/.test(head) || /[.!?]\s+$/.test(head));
  const withI = text.replace(/\bi\b/g, 'I').replace(/\bi'/g, "I'");
  return sentenceStart ? withI.charAt(0).toUpperCase() + withI.slice(1) : withI;
}
