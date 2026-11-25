import { useCallback, useEffect, useRef, useState } from 'react';

/** The parts of the Web Speech API we use (not yet in TypeScript's DOM types). */
type RecognitionAlternative = { transcript: string };
type RecognitionResult = { isFinal: boolean; 0: RecognitionAlternative; length: number };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type RecognitionErrorEvent = { error: string };
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: RecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Spoken punctuation and layout, for browsers that do not add punctuation themselves. */
const SPOKEN: [RegExp, string][] = [
  [/\s*\b(new paragraph)\b\s*/gi, '\n\n'],
  [/\s*\b(new line)\b\s*/gi, '\n'],
  [/\s*\b(full stop|period)\b/gi, '.'],
  [/\s*\bcomma\b/gi, ','],
  [/\s*\bquestion mark\b/gi, '?'],
  [/\s*\bexclamation (mark|point)\b/gi, '!'],
  [/\s*\bcolon\b/gi, ':'],
  [/\s*\bsemicolon\b/gi, ';'],
  [/\s*\b(dash|em dash)\b\s*/gi, ' — '],
];

export function applySpokenPunctuation(text: string): string {
  let out = text;
  for (const [pattern, replacement] of SPOKEN) out = out.replace(pattern, replacement);
  // Capitalise the first letter after a sentence ends.
  return out.replace(
    /([.?!]\s+|\n\s*)([a-z])/g,
    (_, gap: string, letter: string) => gap + letter.toUpperCase(),
  );
}

export type DictationState = 'idle' | 'listening' | 'unsupported' | 'denied' | 'error';

/**
 * Speech to text with the browser's own recognizer (Chrome, Edge, Safari). Final phrases go to
 * `onFinal`; the in-progress phrase is exposed as `interim` so it can be shown before it is committed.
 * Recognition restarts itself after the browser's silence timeout until `stop()` is called.
 */
export function useDictation(
  onFinal: (text: string) => void,
  lang = navigator.language || 'en-IN',
) {
  const [state, setState] = useState<DictationState>(() =>
    recognitionCtor() ? 'idle' : 'unsupported',
  );
  const [interim, setInterim] = useState('');
  const recognitionRef = useRef<Recognition | null>(null);
  const wantRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const stop = useCallback(() => {
    wantRef.current = false;
    recognitionRef.current?.stop();
    setInterim('');
    setState((s) => (s === 'listening' ? 'idle' : s));
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setState('unsupported');
      return;
    }
    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (event) => {
      let pending = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (!result) continue;
        const transcript = result[0].transcript;
        if (result.isFinal) {
          const text = applySpokenPunctuation(transcript.trim());
          if (text) onFinalRef.current(text);
        } else {
          pending += transcript;
        }
      }
      setInterim(pending);
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        wantRef.current = false;
        setState('denied');
      } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setState('error');
      }
    };
    recognition.onend = () => {
      setInterim('');
      if (wantRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          // Fall through to idle.
        }
      }
      setState((s) => (s === 'listening' ? 'idle' : s));
    };
    recognitionRef.current?.abort();
    recognitionRef.current = recognition;
    wantRef.current = true;
    try {
      recognition.start();
      setState('listening');
    } catch {
      setState('error');
    }
  }, [lang]);

  useEffect(
    () => () => {
      wantRef.current = false;
      recognitionRef.current?.abort();
    },
    [],
  );

  return { state, interim, start, stop, toggle: state === 'listening' ? stop : start };
}
