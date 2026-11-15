import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { cn } from '../lib/cn';
import { Button } from '../components/ui';
import appIcon from '../../../assets/brand/icon-rounded.png';

/**
 * Set when the user leaves the welcome screen. index.html reads it before the
 * router mounts, so the splash only opens on a real first run.
 */
export const ONBOARDED_KEY = 'dhun.onboarded';

export function Splash() {
  const navigate = useNavigate();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const start = () => {
    try {
      localStorage.setItem(ONBOARDED_KEY, 'true');
    } catch {
      /* storage can be unavailable; the session still moves on */
    }
    navigate('/studio');
  };

  const fade = 'transition-opacity duration-700 ease-soft';

  return (
    <div className="flex h-full flex-col items-center justify-center overflow-hidden bg-canvas px-8 [-webkit-app-region:drag]">
      <div className="flex w-full max-w-[40rem] flex-col items-center">
        <img
          src={appIcon}
          alt=""
          width={208}
          height={208}
          draggable={false}
          className={cn(
            'size-52 transition-[opacity,transform] duration-700 ease-soft',
            shown ? 'scale-100 opacity-100' : 'scale-95 opacity-0',
          )}
        />

        <h1
          className={cn(
            'mt-8 text-center text-2xl leading-[1.25] font-semibold tracking-tight text-balance text-ink-strong',
            fade,
            shown ? 'opacity-100' : 'opacity-0',
          )}
        >
          One script. Every voice.
        </h1>

        <p
          className={cn(
            'mt-3 max-w-[58ch] text-center text-sm leading-[1.55] text-ink-soft',
            fade,
            shown ? 'opacity-100' : 'opacity-0',
          )}
        >
          Turn one script into finished voiceovers in English and Hinglish, in
          every voice you've cloned. All on your machine.
        </p>

        <Button
          size="lg"
          onClick={start}
          className={cn(
            'mt-8 h-10 min-w-48 px-6 text-sm [-webkit-app-region:no-drag]',
            fade,
            shown ? 'opacity-100' : 'opacity-0',
          )}
        >
          Get started
        </Button>
      </div>
    </div>
  );
}
