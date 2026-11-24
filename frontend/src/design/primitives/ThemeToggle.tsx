import { cn } from '@/lib/cn';
import { useTheme } from '../useTheme';

/** "Noir / Paper": the active theme in ink, the other muted. */
export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const target = theme === 'noir' ? 'Paper' : 'Noir';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${target} theme`}
      className={cn('group inline-flex items-center gap-2 py-1 meta', className)}
    >
      <span className={cn('transition-colors duration-500', theme === 'noir' && 'text-ink')}>
        Noir
      </span>
      <span aria-hidden className="h-[0.9em] w-hair bg-hairline-strong" />
      <span className={cn('transition-colors duration-500', theme === 'paper' && 'text-ink')}>
        Paper
      </span>
    </button>
  );
}
