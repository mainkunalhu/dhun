import { isRouteErrorResponse, useRouteError } from 'react-router';

export function RouteError() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Something went wrong while rendering this screen.';

  return (
    <div className="flex h-full items-center justify-center bg-canvas px-8">
      <div className="flex w-full max-w-[30rem] flex-col gap-2 rounded-lg bg-surface p-6 shadow-1">
        <h1 className="text-lg font-semibold tracking-tight text-ink-strong">
          This screen failed to load
        </h1>
        <p className="text-sm leading-[1.55] text-ink-soft">{message}</p>
        <a
          href="#/"
          className="mt-2 self-start text-sm font-medium text-accent-text"
        >
          Back to the app
        </a>
      </div>
    </div>
  );
}
