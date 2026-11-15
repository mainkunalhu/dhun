import { NavLink } from 'react-router';
import { Box, FolderOpen, ShieldCheck } from 'lucide-react';
import appIcon from '../../../assets/brand/icon-rounded.png';
import { Progress } from '../components/ui';
import { cn } from '../lib/cn';
import { useModelsContext } from '../lib/models-context';

function navClass({ isActive }: { isActive: boolean }): string {
  return cn(
    'flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors duration-150',
    isActive
      ? 'bg-raised font-medium text-ink-strong'
      : 'text-ink-soft hover:bg-surface hover:text-ink-strong',
  );
}

export function Sidebar() {
  const { models } = useModelsContext();
  const active = models.filter((model) => model.installing);

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-canvas">
      <div className="flex items-center gap-2 px-4 pt-5">
        <img
          src={appIcon}
          alt=""
          width={32}
          height={32}
          draggable={false}
          className="size-8 shrink-0"
        />
        <span className="text-sm font-semibold tracking-tight text-ink-strong">
          dhun<span className="text-accent">.</span>
        </span>
      </div>

      <nav className="mt-6 flex flex-col gap-1 px-2" aria-label="Main">
        <NavLink to="/projects" className={navClass}>
          <FolderOpen className="size-4" aria-hidden="true" />
          Projects
        </NavLink>
        <NavLink to="/models" className={navClass}>
          <Box className="size-4" aria-hidden="true" />
          Models
        </NavLink>
      </nav>

      <div className="mt-auto px-3 pb-3">
        {active.length > 0 ? (
          <div className="rounded-lg bg-surface p-3 shadow-1">
            <p className="text-xs font-medium text-ink-soft">Downloading</p>

            <div className="mt-2 flex flex-col gap-2.5">
              {active.map((model) => {
                const percent =
                  model.totalBytes > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (model.downloadedBytes / model.totalBytes) * 100,
                        ),
                      )
                    : 0;

                return (
                  <div key={model.id} className="flex flex-col gap-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate text-ink">{model.name}</span>
                      <span className="tabular-nums text-ink-soft">
                        {percent}%
                      </span>
                    </div>
                    <Progress value={percent} />
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div
          className={cn(
            'flex items-center gap-1.5 text-xs text-ink-faint',
            active.length > 0 && 'mt-3',
          )}
        >
          <ShieldCheck className="size-3.5 shrink-0" aria-hidden="true" />
          Local only. Nothing leaves this machine.
        </div>
      </div>
    </aside>
  );
}
