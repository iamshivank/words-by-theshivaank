import { AnimatePresence, motion } from 'motion/react';
import { useToasts } from './toastStore';

/** Small notes that rise from the bottom-left corner on a hairline, then leave. */
export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 left-(--frame) z-[95] flex flex-col gap-3"
    >
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3 bg-bg/90 py-1 pr-3 backdrop-blur-sm"
          >
            <span
              aria-hidden
              className={
                t.tone === 'error' ? 'h-3 w-hair bg-accent' : 'h-3 w-hair bg-hairline-strong'
              }
            />
            <span className={t.tone === 'error' ? 'text-ui text-accent' : 'text-ui text-ink'}>
              {t.text}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
