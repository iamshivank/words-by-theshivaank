import { motion, useReducedMotion } from 'motion/react';
import { useSiteSettings } from '@/api/settings';
import { cn } from '@/lib/cn';
import { EASE } from '../motion';
import { Hairline } from './Hairline';

type Size = 'sm' | 'md' | 'lg' | 'hero';

type WordmarkProps = {
  size?: Size;
  layout?: 'stacked' | 'inline';
  /** Play the entrance: the name settles in, the hairline draws, the byline exhales. */
  animate?: boolean;
  as?: 'h1' | 'div' | 'p';
  /** Defaults to the site name and byline from settings. */
  name?: string;
  byline?: string;
  className?: string;
};

const NAME_SIZE: Record<Size, string> = {
  sm: 'text-h4',
  md: 'text-h2',
  lg: 'text-display',
  hero: 'text-mark',
};

const BYLINE_SIZE: Record<Size, string> = {
  sm: 'text-[0.625rem]',
  md: 'text-meta',
  lg: 'text-meta',
  hero: 'text-ui',
};

export function Wordmark({
  size = 'md',
  layout = 'stacked',
  animate = false,
  as: Tag = 'div',
  name,
  byline,
  className,
}: WordmarkProps) {
  const settings = useSiteSettings();
  const reduce = useReducedMotion() === true;
  const play = animate && !reduce;
  const stacked = layout === 'stacked';

  return (
    <Tag
      className={cn(
        'inline-flex w-fit',
        stacked ? 'flex-col items-stretch' : 'items-center gap-[0.9em]',
        className,
      )}
    >
      <motion.span
        className={cn(
          'block font-serif leading-[0.82] font-[300] tracking-display text-ink',
          NAME_SIZE[size],
          stacked ? 'pb-[0.12em]' : '',
        )}
        initial={play ? { opacity: 0, y: '0.08em', filter: 'blur(8px)' } : false}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1.4, ease: EASE }}
      >
        {name ?? settings.siteName}
      </motion.span>

      <Hairline
        tone="accent"
        orientation={stacked ? 'horizontal' : 'vertical'}
        draw={play ? 'mount' : 'none'}
        delay={0.55}
        duration={1.1}
        className={stacked ? 'mt-[0.35em]' : 'h-[1.4em]'}
      />

      <motion.span
        className={cn(
          'block font-sans font-[450] text-muted uppercase',
          'tracking-wide',
          BYLINE_SIZE[size],
          stacked ? 'mt-[1.1em]' : '',
        )}
        initial={play ? { opacity: 0, letterSpacing: '0.42em' } : false}
        animate={{ opacity: 1, letterSpacing: '0.2em' }}
        transition={{ duration: 1.6, delay: 0.9, ease: EASE }}
      >
        {byline ?? settings.byline}
      </motion.span>
    </Tag>
  );
}
