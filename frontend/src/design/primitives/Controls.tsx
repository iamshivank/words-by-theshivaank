import { motion } from 'motion/react';
import { useId, type ComponentPropsWithRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A hairline switch: a thin track with a small knob that slides, accent when on. */
export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  hideLabel = false,
  className,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Keep the label for screen readers only (when the row already says what it is). */
  hideLabel?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn('flex items-start justify-between gap-6 py-4', className)}>
      <div className={cn('min-w-0', hideLabel && 'sr-only')}>
        <label htmlFor={id} className="block text-ui text-ink">
          {label}
        </label>
        {description && <p className="mt-1 text-ui text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => {
          onChange(!checked);
        }}
        className={cn(
          'relative mt-1 h-5 w-10 shrink-0 rounded-full border-hair transition-colors duration-500 ease-editorial',
          checked ? 'border-accent' : 'border-hairline-strong',
          'disabled:opacity-40',
        )}
      >
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
        <motion.span
          aria-hidden
          className={cn(
            'absolute top-1/2 left-[3px] size-3 -translate-y-1/2 rounded-full',
            checked ? 'bg-accent' : 'bg-muted',
          )}
          animate={{ x: checked ? 19 : 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        />
      </button>
    </div>
  );
}

type TextareaProps = ComponentPropsWithRef<'textarea'> & { label?: string; hint?: string };

export function Textarea({ label, hint, id, className, ...props }: TextareaProps) {
  const generated = useId();
  const textareaId = id ?? generated;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label htmlFor={textareaId} className="meta">
          {label}
        </label>
      )}
      <textarea id={textareaId} rows={3} className="field-area" {...props} />
      {hint && <p className="text-ui text-muted">{hint}</p>}
    </div>
  );
}

type SelectProps = ComponentPropsWithRef<'select'> & { label: string; children: ReactNode };

export function Select({ label, id, className, children, ...props }: SelectProps) {
  const generated = useId();
  const selectId = id ?? generated;
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={selectId} className="meta">
        {label}
      </label>
      <select
        id={selectId}
        className="w-full appearance-none border-b-hair border-hairline-strong bg-transparent py-2 text-base text-ink focus:border-accent focus:outline-none [&>option]:bg-surface"
        {...props}
      >
        {children}
      </select>
    </div>
  );
}

/** A row of text choices with a sliding orange underline under the selected one. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  label: string;
  className?: string;
}) {
  const group = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn('flex flex-wrap items-center gap-x-6 gap-y-2', className)}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              onChange(o.value);
            }}
            className={cn(
              'relative py-1.5 meta transition-colors duration-500',
              active ? 'text-ink' : 'hover:text-ink',
            )}
          >
            {o.label}
            {active && (
              <motion.span
                layoutId={`seg-${group}`}
                className="absolute inset-x-0 -bottom-px h-hair bg-accent"
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Indeterminate loading: a short accent line travelling along a hairline. */
export function LoadingLine({
  label = 'Loading',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn('relative h-hair w-full overflow-hidden bg-hairline', className)}
    >
      <motion.span
        className="absolute inset-y-0 w-1/4 bg-accent"
        initial={{ left: '-25%' }}
        animate={{ left: '100%' }}
        transition={{ duration: 1.4, ease: [0.65, 0, 0.35, 1], repeat: Infinity }}
      />
    </div>
  );
}

/** Quiet inline status text: errors in accent, everything else muted. */
export function Notice({
  tone = 'muted',
  children,
  className,
}: {
  tone?: 'muted' | 'error';
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('text-ui', tone === 'error' ? 'text-accent' : 'text-muted', className)}
    >
      {children}
    </p>
  );
}

/** Section label used across the Desk and admin: an index number and an uppercase title. */
export function SectionLabel({
  index,
  children,
  className,
}: {
  index?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-baseline gap-3', className)}>
      {index && <span className="num meta text-accent">{index}</span>}
      <h2 className="meta">{children}</h2>
    </div>
  );
}
