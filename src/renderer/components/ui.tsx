import type { ComponentProps, ReactNode } from 'react';
import { ChevronDown, LoaderCircle, TriangleAlert } from 'lucide-react';
import { cn } from '../lib/cn';

/* =============================================================================
   Button
   One height per size. Variants change appearance only — never the box.
   Every variant defines hover, active and disabled through `enabled:` so a
   disabled control can't pick up a hover style.
   ========================================================================== */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';
const buttonBase =
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent font-medium whitespace-nowrap select-none transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-soft active:translate-y-px disabled:cursor-not-allowed disabled:border-line disabled:bg-sunken disabled:text-ink-faint disabled:shadow-none';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-accent-ink shadow-1 enabled:hover:bg-accent-hover enabled:hover:shadow-2 enabled:active:bg-accent-active enabled:active:shadow-1',
  secondary:
    'border-line-strong bg-surface text-ink enabled:hover:bg-raised enabled:hover:text-ink-strong enabled:active:bg-sunken',
  ghost:
    'text-ink-soft enabled:hover:bg-raised enabled:hover:text-ink-strong enabled:active:bg-sunken',
  danger:
    'bg-danger text-danger-ink shadow-1 enabled:hover:brightness-110 enabled:hover:shadow-2',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-7 gap-1.5 px-2.5 text-xs',
  md: 'h-8 px-3 text-sm',
  lg: 'h-9 px-4 text-sm',
};

type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
};

/**
 * Shared so links can look like buttons without nesting a <button> in an <a>.
 */
export function buttonStyles(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
): string {
  return cn(buttonBase, buttonVariants[variant], buttonSizes[size]);
}

export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={cn(buttonStyles(variant, size), block && 'w-full', className)}
      {...props}
    />
  );
}

type IconButtonProps = ComponentProps<'button'> & {
  label: string;
  active?: boolean;
  tone?: 'default' | 'danger';
};

export function IconButton({
  label,
  active,
  tone = 'default',
  className,
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn(
        'inline-flex size-7 shrink-0 items-center justify-center rounded-md text-ink-soft transition-colors duration-150 enabled:hover:bg-raised enabled:hover:text-ink-strong enabled:active:bg-sunken disabled:cursor-not-allowed disabled:text-ink-faint',
        active && 'text-accent-text',
        tone === 'danger' &&
          'enabled:hover:bg-danger-soft enabled:hover:text-danger',
        className,
      )}
      {...props}
    />
  );
}

/* =============================================================================
   Labels, badges, chips
   ========================================================================== */

type BadgeTone =
  | 'neutral'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'bg-raised text-ink-soft',
  accent: 'bg-accent-soft text-accent-text',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
};

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: ComponentProps<'span'> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        'inline-flex h-5 shrink-0 items-center gap-1 rounded-sm px-1.5 text-xs font-medium whitespace-nowrap',
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Chip({
  pressed,
  className,
  ...props
}: ComponentProps<'button'> & { pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border border-line-strong px-2.5 text-xs font-medium whitespace-nowrap text-ink-soft transition-colors duration-150 hover:bg-raised hover:text-ink-strong',
        pressed &&
          'border-accent-line bg-accent-soft text-accent-text hover:bg-accent-soft hover:text-accent-text',
        className,
      )}
      {...props}
    />
  );
}

export function SectionLabel({ className, ...props }: ComponentProps<'p'>) {
  return (
    <p
      className={cn('text-xs font-medium text-ink-soft', className)}
      {...props}
    />
  );
}

/* =============================================================================
   Segmented control — a real control, with state
   ========================================================================== */

type SegmentedProps<T extends string> = {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ value: T; label: ReactNode }>;
};

export function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: SegmentedProps<T>) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center gap-0.5 rounded-md bg-sunken p-0.5 shadow-inset"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'h-6 rounded-sm px-2.5 text-xs font-medium whitespace-nowrap text-ink-soft transition-colors duration-150 hover:text-ink-strong',
            value === option.value && 'bg-raised text-ink-strong shadow-1',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* =============================================================================
   Progress and waveform
   ========================================================================== */

export function Progress({ value, idle }: { value: number; idle?: boolean }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-sunken shadow-inset">
      <span
        className={cn(
          'block h-full rounded-full transition-[width] duration-200 ease-soft',
          idle ? 'bg-line-strong' : 'bg-accent',
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/* =============================================================================
   Containers
   ========================================================================== */

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-lg bg-surface p-4 shadow-1', className)}
      {...props}
    />
  );
}

export function EmptyState({
  title,
  children,
  action,
  icon,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
      {icon ? (
        <span className="mb-1 flex size-11 items-center justify-center rounded-lg bg-surface text-ink-soft shadow-1">
          {icon}
        </span>
      ) : null}
      <p className="text-base font-medium text-ink-strong">{title}</p>
      <p className="max-w-[40ch] text-sm leading-[1.55] text-ink-soft">
        {children}
      </p>
      {action}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-line bg-raised px-1 font-mono text-xs font-medium text-ink-soft shadow-[0_1px_0_var(--dh-line-strong)]">
      {children}
    </kbd>
  );
}

/* =============================================================================
   Form controls
   ========================================================================== */

const fieldControl =
  'h-10 w-full rounded-lg border border-line-strong bg-sunken px-3 text-sm text-ink shadow-inset transition-colors duration-150 placeholder:text-ink-soft hover:border-ink-faint focus:border-accent disabled:cursor-not-allowed disabled:border-line disabled:bg-canvas disabled:text-ink-faint disabled:shadow-none';

export function Field({
  label,
  hint,
  error,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-sm font-medium text-ink-soft">{label}</span>
      {children}
      {error ? (
        <span className="flex items-center gap-1.5 text-xs text-danger">
          <TriangleAlert className="size-3.5" aria-hidden="true" />
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-ink-soft">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(fieldControl, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<'textarea'>) {
  return (
    <textarea
      className={cn(
        fieldControl,
        'h-auto min-h-[7rem] resize-y py-2.5 leading-[1.6]',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: ComponentProps<'select'>) {
  return (
    <span className="relative block">
      <select
        className={cn(
          fieldControl,
          'cursor-pointer appearance-none pr-9',
          className,
        )}
        {...props}
      />
      <ChevronDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-ink-soft"
        aria-hidden="true"
      />
    </span>
  );
}

export function Check({
  className,
  children,
  ...props
}: ComponentProps<'input'> & { children: ReactNode }) {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2 text-sm text-ink',
        className,
      )}
    >
      <input
        type="checkbox"
        className="size-[0.9375rem] cursor-pointer accent-accent"
        {...props}
      />
      {children}
    </label>
  );
}

export function Switch({
  className,
  children,
  ...props
}: ComponentProps<'input'> & { children: ReactNode }) {
  return (
    <label
      className={cn(
        'inline-flex cursor-pointer items-center gap-2.5 text-sm text-ink',
        className,
      )}
    >
      <span className="relative inline-flex h-[1.125rem] w-8 items-center">
        <input
          type="checkbox"
          className="peer absolute inset-0 h-full w-full appearance-none rounded-full border border-line-strong bg-sunken shadow-inset transition-colors duration-150 checked:border-accent checked:bg-accent-soft"
          {...props}
        />
        <span className="pointer-events-none absolute left-[2px] size-[0.8125rem] rounded-full bg-ink-soft transition-[transform,background-color] duration-150 peer-checked:translate-x-[0.875rem] peer-checked:bg-accent" />
      </span>
      {children}
    </label>
  );
}

/* =============================================================================
   Domain components
   ========================================================================== */

export function Spinner({ className }: { className?: string }) {
  return (
    <LoaderCircle
      className={cn('size-3.5 animate-spin', className)}
      aria-hidden="true"
    />
  );
}
