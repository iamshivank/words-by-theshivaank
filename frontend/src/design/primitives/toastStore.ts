import { create } from 'zustand';

export type Toast = { id: number; text: string; tone: 'muted' | 'error' };

export type ToastState = {
  toasts: Toast[];
  show: (text: string, tone?: Toast['tone']) => void;
  dismiss: (id: number) => void;
};

let nextId = 1;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  show: (text, tone = 'muted') => {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-2), { id, text, tone }] });
    window.setTimeout(() => {
      get().dismiss(id);
    }, 3600);
  },
  dismiss: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

/** Call from anywhere: toast('Saved'). */
export function toast(text: string, tone: Toast['tone'] = 'muted') {
  useToasts.getState().show(text, tone);
}
