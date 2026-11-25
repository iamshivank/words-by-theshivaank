import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import type { SlashItem } from './slashItems';

/** The "/" menu: appears under the caret, filtered by what you type after the slash. */
export function SlashMenu({
  items,
  active,
  position,
  onPick,
}: {
  items: SlashItem[];
  active: number;
  position: { left: number; top: number };
  onPick: (item: SlashItem) => void;
}) {
  return (
    <motion.div
      role="listbox"
      aria-label="Insert block"
      className="fixed z-[60] w-60 border-hair border-hairline-strong bg-bg py-2"
      style={{ left: position.left, top: position.top }}
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      {items.length === 0 && <p className="px-4 py-2 text-ui text-muted">No matches</p>}
      {items.map((item, i) => (
        <button
          key={item.id}
          type="button"
          role="option"
          aria-selected={i === active}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(item);
          }}
          className={cn(
            'relative flex w-full items-center justify-between px-4 py-1.5 text-left text-ui transition-colors',
            i === active ? 'text-ink' : 'text-muted hover:text-ink',
          )}
        >
          {i === active && (
            <span
              aria-hidden
              className="absolute top-1/2 left-0 h-hair w-2 -translate-y-1/2 bg-accent"
            />
          )}
          {item.label}
          <span className="num text-[0.6875rem] opacity-60">{item.hint}</span>
        </button>
      ))}
    </motion.div>
  );
}
