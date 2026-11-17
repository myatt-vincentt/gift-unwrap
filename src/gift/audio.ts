// The rattle, made in code (no sound files). What's inside decides how it
// sounds, so you can guess before you open it:
//   puppy     soft padded thumps, and now and then a tiny squeak
//   confetti  dry papery rustle
//   snow      little icy tinkles
// Browsers only allow sound after you touch the page once: the first tap,
// click or key press anywhere switches it on.
import type { Inside } from "./state";

let ctx: AudioContext | null = null;
let out: GainNode | null = null;
let noise: AudioBuffer | null = null;

const audio = () => {
  if (ctx) return ctx;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  out = ctx.createGain();
  out.gain.value = 0.8;
  out.connect(ctx.destination);
  // One second of white noise, reused by every rustle and thump.
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = noise.getChannelData(0);
  data.forEach((_, i) => {
    data[i] = Math.random() * 2 - 1;
  });
  return ctx;
};

/** Switch sound on at the first touch, click or key press (browser rule). */
export const unlockAudioOnFirstTouch = () => {
  const unlock = () => {
    audio()
      ?.resume()
      .catch(() => {});
  };
  // Some browsers let it start straight away; try once now.
  unlock();
  ["pointerdown", "keydown", "touchend"].forEach((ev) =>
    window.addEventListener(ev, unlock, { once: true, capture: true }),
  );
};

/** A short burst of filtered noise. */
const burst = (
  c: AudioContext,
  at: number,
  {
    freq,
    q,
    type,
    dur,
    gain,
  }: {
    freq: number;
    q: number;
    type: BiquadFilterType;
    dur: number;
    gain: number;
  },
) => {
  if (!noise || !out) return;
  const src = c.createBufferSource();
  src.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  src.connect(f).connect(g).connect(out);
  src.start(at, Math.random() * 0.5, dur + 0.05);
};

/** A short sine tone that falls away (a thump body, a tinkle, a squeak). */
const tone = (
  c: AudioContext,
  at: number,
  {
    from,
    to,
    dur,
    gain,
    type = "sine",
  }: {
    from: number;
    to: number;
    dur: number;
    gain: number;
    type?: OscillatorType;
  },
) => {
  if (!out) return;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(from, at);
  o.frequency.exponentialRampToValueAtTime(to, at + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + dur + 0.05);
};

/** One rattle: what's inside hits the wall, `strength` 0..1. */
export const playRattle = (inside: Inside, strength: number) => {
  const c = audio();
  if (!c || c.state !== "running") return;
  const at = c.currentTime + 0.005;
  const s = 0.35 + 0.65 * Math.min(1, Math.max(0, strength));
  const jitter = () => 0.9 + Math.random() * 0.2;
  if (inside === "puppy") {
    // A soft padded body bumping the side.
    tone(c, at, { from: 150 * jitter(), to: 70, dur: 0.12, gain: 0.55 * s });
    burst(c, at, {
      freq: 500,
      q: 0.8,
      type: "lowpass",
      dur: 0.08,
      gain: 0.35 * s,
    });
    // Now and then, a tiny squeak.
    if (Math.random() < 0.18)
      tone(c, at + 0.06, {
        from: 1500 * jitter(),
        to: 2300,
        dur: 0.11,
        gain: 0.12,
        type: "triangle",
      });
  } else if (inside === "confetti") {
    // Lots of paper bits: a dry rustle made of a few quick grains.
    Array.from({ length: 5 }).forEach((_, i) =>
      burst(c, at + i * 0.012 * jitter(), {
        freq: 3500 * jitter(),
        q: 0.9,
        type: "bandpass",
        dur: 0.05 + Math.random() * 0.04,
        gain: 0.4 * s,
      }),
    );
  } else {
    // Icy bits: two or three little bell tinkles.
    const notes = [2093, 2637, 3136, 3520];
    Array.from({ length: 2 + Math.round(s) }).forEach((_, i) => {
      const f = notes[Math.floor(Math.random() * notes.length)];
      tone(c, at + i * 0.03 * jitter(), {
        from: f,
        to: f * 0.98,
        dur: 0.22,
        gain: 0.16 * s,
      });
    });
    burst(c, at, {
      freq: 6000,
      q: 1,
      type: "highpass",
      dur: 0.04,
      gain: 0.08 * s,
    });
  }
};
