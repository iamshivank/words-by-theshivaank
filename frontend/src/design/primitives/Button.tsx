import type { ComponentPropsWithRef, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '@/lib/cn';
import { buttonClasses, type StyleProps, type Variant } from './buttonClasses';

/** The orange hairline that draws in from the left on hover and keyboard focus. */
function Underline({ variant }: { variant: Variant }) {
  return (
    <span
      aria-hidden
      className={cn(
        'pointer-events-none absolute h-hair origin-left scale-x-0 bg-accent',
        'transition-transform duration-[650ms] ease-editorial',
        'group-hover:scale-x-100 group-focus-visible:scale-x-100',
        variant === 'outline' ? 'inset-x-0 -bottom-hair' : 'inset-x-0 bottom-0',
      )}
    />
  );
}

type ButtonProps = ComponentPropsWithRef<'button'> &
  StyleProps & {
    icon?: ReactNode;
    /** Shows `busyLabel` (or the children) and marks the button busy. */
    busy?: boolean;
    busyLabel?: ReactNode;
  };

export function Button({
  variant = 'outline',
  size = 'md',
  className,
  icon,
  busy = false,
  busyLabel,
  children,
  type = 'button',
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={disabled === true || busy}
      aria-busy={busy || undefined}
      {...props}
    >
      <span>{busy && busyLabel ? busyLabel : children}</span>
      {icon}
      <Underline variant={variant} />
    </button>
  );
}

type LinkButtonProps = LinkProps & StyleProps & { icon?: ReactNode };

export function LinkButton({
  variant = 'text',
  size = 'md',
  className,
  icon,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link className={buttonClasses({ variant, size, className })} {...props}>
      <span>{children}</span>
      {icon}
      <Underline variant={variant} />
    </Link>
  );
}
