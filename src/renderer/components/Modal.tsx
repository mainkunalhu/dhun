import { useEffect, useId, type ReactNode } from 'react';

export function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div
        className="absolute inset-0 bg-scrim"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[calc(100vh-3rem)] w-full max-w-[26rem] flex-col overflow-hidden rounded-xl border border-line bg-raised shadow-3"
      >
        <div className="shrink-0 px-5 pt-5">
          <h2
            id={titleId}
            className="text-lg font-semibold tracking-tight text-ink-strong"
          >
            {title}
          </h2>

          {description ? (
            <p className="mt-1 text-sm leading-[1.55] text-ink-soft">
              {description}
            </p>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
