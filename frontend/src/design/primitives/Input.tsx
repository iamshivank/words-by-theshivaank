import { useId, type ComponentPropsWithRef } from 'react';
import { cn } from '@/lib/cn';

type InputProps = Omit<ComponentPropsWithRef<'input'>, 'size'> & {
  label: string;
  error?: string | null | undefined;
  hint?: string;
};

/** Label above, a single hairline below; the line turns orange and draws in on focus. */
export function Input({ label, error, hint, id, className, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <label htmlFor={inputId} className="meta">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            'peer block w-full bg-transparent py-2.5 font-serif text-h4 font-[350] tracking-tight text-ink',
            'placeholder:text-muted placeholder:opacity-60 focus-visible:outline-none',
          )}
          {...props}
        />
        <span aria-hidden className="absolute inset-x-0 bottom-0 h-hair bg-hairline-strong" />
        <span
          aria-hidden
          className={cn(
            'absolute inset-x-0 bottom-0 h-hair origin-left bg-accent',
            'transition-transform duration-700 ease-editorial',
            error ? 'scale-x-100' : 'scale-x-0 peer-focus:scale-x-100',
          )}
        />
      </div>
      {message && (
        <p
          id={messageId}
          role={error ? 'alert' : undefined}
          className={cn('text-ui', error ? 'text-accent' : 'text-muted')}
        >
          {message}
        </p>
      )}
    </div>
  );
}
