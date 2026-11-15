import { AudioLines, Pause, Play, X } from 'lucide-react';
import { IconButton } from '../components/ui';
import { usePlayer } from '../lib/player';

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function PlayerBar() {
  const { current, playing, time, duration, toggle, seek, stop } = usePlayer();

  if (!current) return null;

  const total = duration > 0 ? duration : current.durationMs / 1000;

  return (
    <div className="flex h-16 shrink-0 items-center gap-3 border-t border-line bg-surface px-4">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-sunken text-ink-soft shadow-inset">
        <AudioLines className="size-4" aria-hidden="true" />
      </span>

      <div className="w-48 min-w-0 shrink-0">
        <p className="truncate text-sm font-medium text-ink-strong">
          {current.title}
        </p>
        <p className="truncate text-xs text-ink-soft">{current.subtitle}</p>
      </div>

      <IconButton
        label={playing ? 'Pause' : 'Play'}
        onClick={toggle}
        className="size-9"
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </IconButton>

      <span className="w-10 text-right font-mono text-xs tabular-nums text-ink-soft">
        {formatTime(time)}
      </span>

      <input
        type="range"
        min={0}
        max={Math.max(total, 0.1)}
        step={0.05}
        value={Math.min(time, total || 0)}
        onChange={(event) => seek(Number(event.target.value))}
        aria-label="Seek"
        className="h-1.5 min-w-0 flex-1 cursor-pointer accent-accent"
      />

      <span className="w-10 font-mono text-xs tabular-nums text-ink-soft">
        {formatTime(total)}
      </span>

      <IconButton label="Close player" onClick={stop}>
        <X className="size-4" />
      </IconButton>
    </div>
  );
}
