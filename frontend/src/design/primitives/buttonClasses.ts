import { cn } from '@/lib/cn';

export type Variant = 'outline' | 'text';
export type Size = 'sm' | 'md';

export type StyleProps = {
  variant?: Variant;
  size?: Size;
  className?: string | undefined;
};

const BASE =
  'group relative inline-flex select-none items-center justify-center gap-2.5 whitespace-nowrap ' +
  'font-sans text-meta font-[450] uppercase tracking-meta text-ink ' +
  'transition-[color,border-color,opacity] duration-500 ease-editorial ' +
  'disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40';

const VARIANT: Record<Variant, string> = {
  outline: 'rounded-hair border-hair border-hairline-strong hover:border-muted',
  text: 'text-muted hover:text-ink',
};

const SIZE: Record<Variant, Record<Size, string>> = {
  outline: { sm: 'h-9 px-4', md: 'h-12 px-7' },
  text: { sm: 'py-1', md: 'py-1.5' },
};

export function buttonClasses({ variant = 'outline', size = 'md', className }: StyleProps = {}) {
  return cn(BASE, VARIANT[variant], SIZE[variant][size], className);
}
