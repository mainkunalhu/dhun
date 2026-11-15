import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type PlayerTake = {
  id: string;
  title: string;
  subtitle: string;
  durationMs: number;
};

type PlayerValue = {
  current: PlayerTake | null;
  playing: boolean;
  time: number;
  duration: number;
  play: (take: PlayerTake) => void;
  toggle: () => void;
  seek: (seconds: number) => void;
  stop: () => void;
};

const PlayerContext = createContext<PlayerValue | null>(null);

/**
 * One shared audio element for the whole app. Takes play through the local
 * dhun-media protocol, so nothing opens an external player.
 */
export function PlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentIdRef = useRef<string | null>(null);
  const [current, setCurrent] = useState<PlayerTake | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.loop = false;
    audioRef.current = audio;

    const onTime = () => setTime(audio.currentTime);
    const onMeta = () =>
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    const onEnded = () => {
      setPlaying(false);
      setTime(0);
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => setPlaying(false);

    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
      audioRef.current = null;
    };
  }, []);

  const play = useCallback((take: PlayerTake) => {
    const audio = audioRef.current;
    if (!audio) return;

    // Compare against a ref, not React state: a fast second click can arrive
    // before the state update and would otherwise reload the file from zero.
    if (currentIdRef.current === take.id) {
      if (audio.ended) {
        audio.currentTime = 0;
        setTime(0);
      }
      if (audio.paused) void audio.play().catch(() => setPlaying(false));
      else audio.pause();
      return;
    }

    currentIdRef.current = take.id;
    setCurrent(take);
    setTime(0);
    setDuration(take.durationMs / 1000);
    audio.src = `dhun-media://renders/${take.id}.wav`;
    audio.load();
    void audio.play().catch(() => setPlaying(false));
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    if (audio.ended) {
      audio.currentTime = 0;
      setTime(0);
    }
    if (audio.paused) void audio.play().catch(() => setPlaying(false));
    else audio.pause();
  }, [current]);

  const seek = useCallback((seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    setTime(seconds);
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    currentIdRef.current = null;
    setCurrent(null);
    setPlaying(false);
    setTime(0);
    setDuration(0);
  }, []);

  const value = useMemo(
    () => ({ current, playing, time, duration, play, toggle, seek, stop }),
    [current, playing, time, duration, play, toggle, seek, stop],
  );

  return (
    <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
  );
}

export function usePlayer(): PlayerValue {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('usePlayer must be used inside PlayerProvider');
  return value;
}
