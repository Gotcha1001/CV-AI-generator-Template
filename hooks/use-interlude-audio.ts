"use client";

import { useEffect, useRef, useState } from "react";

export const INTERLUDE_SRC = "/audio/interlude.mp3";

interface UseInterludeAudioOptions {
  loop?: boolean;
  volume?: number;
}

export function useInterludeAudio(
  active: boolean,
  { loop = true, volume = 0.35 }: UseInterludeAudioOptions = {},
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Optimistic: we try unmuted first. Flips to true only if the browser
  // blocks unmuted autoplay, so the toggle always reflects what's real.
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const audio = new Audio(INTERLUDE_SRC);
    audio.loop = loop;
    audio.volume = volume;
    audio.muted = false;
    audioRef.current = audio;

    return () => {
      audio.pause();
      audio.src = "";
      audioRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (active) {
      audio.muted = false;
      audio.play().catch(() => {
        // Autoplay-with-sound was blocked. Muted autoplay is always
        // allowed, so fall back to that and let the toggle take over.
        audio.muted = true;
        setMuted(true);
        audio.play().catch(() => {
          // Blocked even muted (rare). Toggle still lets them start it
          // manually with a real click.
        });
      });
    } else {
      audio.pause();
    }
  }, [active]);

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = !audio.muted;
    audio.muted = next;
    setMuted(next);
    if (!next && audio.paused && active) {
      audio.play().catch(() => {});
    }
  };

  return { muted, toggleMute };
}
