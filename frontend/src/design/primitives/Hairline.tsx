import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import { DURATION, EASE } from '../motion';

type HairlineProps = {
  orientation?: 'horizontal' | 'vertical';
  tone?: 'default' | 'strong' | 'accent';
  /** 'mount' draws on first render, 'view' when scrolled into view. */
  draw?: 'none' | 'mount' | 'view';
  origin?: 'start' | 'center' | 'end';
  delay?: number;
  duration?: number;
  /** Set false when the line separates content meaningfully (adds role="separator"). */
  decorative?: boolean;
  className?: string;
};

const TONE = {
  default: 'bg-hairline',
  strong: 'bg-hairline-strong',
  accent: 'bg-accent',
} as const;

export function Hairline({
  orientation = 'horizontal',
  tone = 'default',
  draw = 'none',
  origin = 'start',
  delay = 0,
  duration = DURATION.slow,
  decorative = true,
  className,
}: HairlineProps) {
  const horizontal = orientation === 'horizontal';
  const transformOrigin = {
    start: horizontal ? 'left center' : 'center top',
    center: 'center',
    end: horizontal ? 'right center' : 'center bottom',
  }[origin];
  const hidden = horizontal ? { scaleX: 0 } : { scaleY: 0 };
  const shown = horizontal ? { scaleX: 1 } : { scaleY: 1 };

  return (
    <motion.span
      {...(decorative
        ? { 'aria-hidden': true }
        : { role: 'separator', 'aria-orientation': orientation })}
      className={cn(
        'block shrink-0',
        horizontal ? 'h-hair w-full' : 'w-hair self-stretch',
        TONE[tone],
        className,
      )}
      style={{ transformOrigin }}
      transition={{ duration, delay, ease: EASE }}
      {...(draw === 'mount' && { initial: hidden, animate: shown })}
      {...(draw === 'view' && {
        initial: hidden,
        whileInView: shown,
        viewport: { once: true, margin: '0px 0px -8% 0px' },
      })}
    />
  );
}
