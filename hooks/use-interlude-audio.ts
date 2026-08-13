// "use client";

// import { useEffect, useRef, useState } from "react";

// export const INTERLUDE_SRC = "/audio/interlude.mp3";

// interface UseInterludeAudioOptions {
//   loop?: boolean;
//   volume?: number;
// }

// export function useInterludeAudio(
//   active: boolean,
//   { loop = true, volume = 0.35 }: UseInterludeAudioOptions = {},
// ) {
//   const audioRef = useRef<HTMLAudioElement | null>(null);
//   // Optimistic: we try unmuted first. Flips to true only if the browser
//   // blocks unmuted autoplay, so the toggle always reflects what's real.
//   const [muted, setMuted] = useState(false);

//   useEffect(() => {
//     const audio = new Audio(INTERLUDE_SRC);
//     audio.loop = loop;
//     audio.volume = volume;
//     audio.muted = false;
//     audioRef.current = audio;

//     return () => {
//       audio.pause();
//       audio.src = "";
//       audioRef.current = null;
//     };
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   useEffect(() => {
//     const audio = audioRef.current;
//     if (!audio) return;

//     if (active) {
//       audio.muted = false;
//       audio.play().catch(() => {
//         // Autoplay-with-sound was blocked. Muted autoplay is always
//         // allowed, so fall back to that and let the toggle take over.
//         audio.muted = true;
//         setMuted(true);
//         audio.play().catch(() => {
//           // Blocked even muted (rare). Toggle still lets them start it
//           // manually with a real click.
//         });
//       });
//     } else {
//       audio.pause();
//     }
//   }, [active]);

//   const toggleMute = () => {
//     const audio = audioRef.current;
//     if (!audio) return;
//     const next = !audio.muted;
//     audio.muted = next;
//     setMuted(next);
//     if (!next && audio.paused && active) {
//       audio.play().catch(() => {});
//     }
//   };

//   return { muted, toggleMute };
// }

"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const INTERLUDE_SRC = "/audio/interlude.mp3";

interface UseInterludeAudioOptions {
  loop?: boolean;
  volume?: number;
  /**
   * "immediate": play as soon as `active` is true (existing behavior —
   * creation modal, history preview).
   * "interaction": wait for triggerPlay() — used on the public CV page
   * so autoplay-with-sound only fires after a real scroll/click.
   */
  trigger?: "immediate" | "interaction";
}

export function useInterludeAudio(
  active: boolean,
  {
    loop = true,
    volume = 0.35,
    trigger = "immediate",
  }: UseInterludeAudioOptions = {},
) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [muted, setMuted] = useState(false);
  const [armed, setArmed] = useState(trigger === "immediate");

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
    if (active && armed) {
      audio.muted = false;
      audio.play().catch(() => {
        audio.muted = true;
        setMuted(true);
        audio.play().catch(() => {});
      });
    } else {
      audio.pause();
    }
  }, [active, armed]);

  // Call from a scroll or click handler to unlock playback in
  // "interaction" mode. No-op in "immediate" mode (already armed).
  const triggerPlay = useCallback(() => setArmed(true), []);

  const toggleMute = () => {
    setArmed(true); // clicking the button is itself a valid gesture
    const audio = audioRef.current;
    if (!audio) return;
    const next = !audio.muted;
    audio.muted = next;
    setMuted(next);
    if (!next && audio.paused && active) {
      audio.play().catch(() => {});
    }
  };

  return { muted, toggleMute, triggerPlay };
}
