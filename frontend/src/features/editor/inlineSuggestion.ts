import { Extension } from '@tiptap/react';
import { Plugin, PluginKey, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

/**
 * Inline autocomplete ("ghost text"). After each edit it asks `suggest` for a continuation of the text
 * before the caret and shows it greyed out at the caret. Tab (or → at the end of the line) accepts it,
 * Escape hides it, and any other typing replaces it with a fresh prediction.
 *
 * The predictor and the on/off switch live in the extension's storage (editor.storage.inlineSuggestion),
 * so the page can swap them at any time without rebuilding the editor.
 *
 * The suggestion lives in plugin state, so it is part of the editor's own update cycle: it can never point
 * at a stale position, and accepting it is a single undoable text insertion.
 */
export type InlineSuggestionStorage = {
  /** Returns the continuation for the text before the caret, or null. Read on every edit. */
  suggest: (before: string) => string | null;
  /** Checked on every edit so the feature can be switched off without rebuilding the editor. */
  enabled: boolean;
};

type SuggestionState = { text: string; pos: number } | null;

declare module '@tiptap/core' {
  // Augmenting Tiptap's command list only works by merging into its interface.
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions
  interface Commands<ReturnType> {
    inlineSuggestion: {
      /** Sets where predictions come from and whether they are shown. */
      setInlineSuggestion: (
        suggest: InlineSuggestionStorage['suggest'],
        enabled: boolean,
      ) => ReturnType;
    };
  }
}

export const inlineSuggestionKey = new PluginKey<SuggestionState>('inlineSuggestion');

const CONTEXT_CHARS = 300;

function compute(state: EditorState, storage: InlineSuggestionStorage): SuggestionState {
  if (!storage.enabled) return null;
  const { selection } = state;
  if (!selection.empty) return null;
  const { $head } = selection;
  const parent = $head.parent;
  if (!parent.isTextblock || parent.type.spec.code) return null;
  // Only at the end of the line: a prediction in the middle of existing text would cover it.
  if ($head.parentOffset !== parent.content.size) return null;
  // Leave "/" commands to the slash menu.
  if (parent.textContent.startsWith('/')) return null;
  const from = Math.max(0, $head.pos - CONTEXT_CHARS);
  const before = state.doc.textBetween(from, $head.pos, '\n', ' ');
  const text = storage.suggest(before);
  return text ? { text, pos: $head.pos } : null;
}

export const InlineSuggestion = Extension.create<object, InlineSuggestionStorage>({
  name: 'inlineSuggestion',

  addStorage() {
    return { suggest: () => null, enabled: false };
  },

  addCommands() {
    return {
      setInlineSuggestion: (suggest, enabled) => () => {
        this.storage.suggest = suggest;
        this.storage.enabled = enabled;
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin<SuggestionState>({
        key: inlineSuggestionKey,
        state: {
          init: () => null,
          apply(tr, value, _old, next) {
            const meta = tr.getMeta(inlineSuggestionKey) as 'hide' | 'accepted' | undefined;
            // After an accept, wait for the next keystroke rather than extending what was just taken.
            if (meta === 'hide' || meta === 'accepted') return null;
            // Predict only after typing; moving the caret or clicking hides the suggestion.
            if (tr.docChanged && !tr.getMeta('composition')) return compute(next, storage);
            if (tr.selectionSet) return null;
            return value;
          },
        },
        props: {
          decorations(state) {
            const s = inlineSuggestionKey.getState(state);
            if (!s) return null;
            return DecorationSet.create(state.doc, [
              Decoration.widget(
                s.pos,
                () => {
                  const span = document.createElement('span');
                  span.className = 'inline-suggestion';
                  span.setAttribute('aria-hidden', 'true');
                  span.textContent = s.text;
                  const hint = document.createElement('kbd');
                  hint.className = 'inline-suggestion-hint';
                  hint.textContent = 'tab';
                  span.appendChild(hint);
                  return span;
                },
                // Keep the caret before the ghost text, and do not let it count as content.
                { side: 1, key: `suggestion:${s.text}`, ignoreSelection: true },
              ),
            ]);
          },
          handleKeyDown(view, event) {
            const s = inlineSuggestionKey.getState(view.state);
            if (!s || event.isComposing) return false;
            const plain = !event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;
            if ((event.key === 'Tab' || event.key === 'ArrowRight') && plain) {
              view.dispatch(
                view.state.tr
                  .insertText(s.text, s.pos)
                  .setMeta(inlineSuggestionKey, 'accepted')
                  .scrollIntoView(),
              );
              return true;
            }
            if (event.key === 'Escape') {
              view.dispatch(view.state.tr.setMeta(inlineSuggestionKey, 'hide'));
              return true;
            }
            return false;
          },
          handleDOMEvents: {
            blur(view) {
              if (inlineSuggestionKey.getState(view.state))
                view.dispatch(view.state.tr.setMeta(inlineSuggestionKey, 'hide'));
              return false;
            },
          },
        },
      }),
    ];
  },
});
