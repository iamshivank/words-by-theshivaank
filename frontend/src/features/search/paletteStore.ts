import { create } from 'zustand';

type PaletteState = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
};

export const usePalette = create<PaletteState>((set, get) => ({
  isOpen: false,
  open: () => {
    set({ isOpen: true });
  },
  close: () => {
    set({ isOpen: false });
  },
  toggle: () => {
    set({ isOpen: !get().isOpen });
  },
}));
