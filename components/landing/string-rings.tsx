"use client";

import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

/*
 * Six Karplus-Strong plucked strings, one per open string of a guitar, each
 * drawn as its own delay line: a circular buffer of N = fs / f samples laid
 * around a ring, so a ring's circumference is proportional to its delay
 * length (low E outermost, high E innermost).
 *
 * Every step a string reads the sample at its head, averages it with the
 * next one, scales by rho and writes it back:
 *     y[n] = rho * (y[n-N] + y[n-N-1]) / 2
 * The average is a low-pass filter, so high harmonics die first and a noise
 * burst turns into a tone. The waveform is drawn relative to the head, so it
 * travels around the ring once per period, and higher strings turn faster.
 *
 * Intro: every string starts as white noise (the classic KS excitation) and
 * runs fast until it settles into its fundamental.
 * Pointer: crossing a ring plucks it there (outward and inward strokes have
 * opposite polarity); a tap plucks the nearest ring.
 * Idle: now and then a very soft, wide excitation (air in the room) lands
 * on a random string, and strings that share a harmonic excite each other
 * a little (sympathetic resonance: E2's 3rd harmonic is B3, A2's 3rd is E4).
 *
 * Each sample is updated once per trip around its ring, so rho is set per
 * ring from a decay rate per second: every string loses amplitude at the
 * same rate however fast the simulation runs, while the averaging filter
 * still smooths the long low strings more slowly, as in the real algorithm.
 */

const VISUAL_FS = 16000; // "sample rate" of the drawing; sets the delay lengths
const STRINGS = [
  { name: "E2", freq: 82.41, wound: true },
  { name: "A2", freq: 110.0, wound: true },
  { name: "D3", freq: 146.83, wound: true },
  { name: "G3", freq: 196.0, wound: true },
  { name: "B3", freq: 246.94, wound: false },
  { name: "E4", freq: 329.63, wound: false },
];
// Pairs whose low harmonics coincide (ratio of small integers), for sympathetic coupling
const SYMPATHETIC: Array<[number, number]> = [
  [0, 5], // E2 x4 = E4
  [0, 4], // E2 x3 ~ B3 x1
  [1, 5], // A2 x3 ~ E4 x1
  [1, 2], // A2 x4 ~ D3 x3
  [2, 3], // D3 x4 ~ G3 x3
  [4, 5], // B3 x4 ~ E4 x3
];
const COUPLING = 0.03;
const DECAY_PER_SECOND = 0.8; // at rest: a pluck halves in about 3 s
const INTRO_DECAY_PER_SECOND = 0.35; // noise burst fades while it turns into a tone
const INTRO_MS = 2600;
const INTRO_MAX_STEPS_PER_FRAME = 420; // enough passes for the low E to filter its noise
const IDLE_EXCITATION_EVERY_MS = 900;

interface Ring {
  n: number;
  buf: Float32Array;
  head: number;
  energy: number;
}

function makeRings(): Ring[] {
  return STRINGS.map((s) => {
    const n = Math.round(VISUAL_FS / s.freq);
    return { n, buf: new Float32Array(n), head: 0, energy: 0 };
  });
}

/** Deterministic PRNG so the still frame (reduced motion) is always the same. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * rho for each ring such that the ring decays by `perSecond` per second when
 * advancing `stepsPerSecond` samples a second (each sample is visited once
 * every N steps, so rho is applied stepsPerSecond / N times per second).
 */
function ringRhos(rings: Ring[], perSecond: number, stepsPerSecond: number): Float32Array {
  return Float32Array.from(rings, (r) => Math.pow(perSecond, r.n / Math.max(1, stepsPerSecond)));
}

function step(rings: Ring[], rho: Float32Array) {
  const out = new Float32Array(rings.length);
  for (let i = 0; i < rings.length; i++) {
    const r = rings[i];
    const a = r.buf[r.head];
    const b = r.buf[(r.head + 1) % r.n];
    out[i] = rho[i] * 0.5 * (a + b);
  }
  for (const [i, j] of SYMPATHETIC) {
    const yi = out[i];
    out[i] += COUPLING * out[j];
    out[j] += COUPLING * yi;
  }
  for (let i = 0; i < rings.length; i++) {
    const r = rings[i];
    r.buf[r.head] = out[i];
    r.head = (r.head + 1) % r.n;
  }
}

/** Triangular pluck centred on buffer index `center`, with the mean removed (no DC). */
function pluck(ring: Ring, center: number, amplitude: number, widthFraction = 0.1) {
  const half = Math.max(3, Math.round(ring.n * widthFraction));
  const bump = new Float32Array(ring.n);
  let sum = 0;
  for (let d = -half; d <= half; d++) {
    const k = (((Math.round(center) + d) % ring.n) + ring.n) % ring.n;
    const v = amplitude * (1 - Math.abs(d) / (half + 1));
    bump[k] += v;
    sum += v;
  }
  const mean = sum / ring.n;
  for (let k = 0; k < ring.n; k++) ring.buf[k] += bump[k] - mean;
}

/** Offline KS note for the optional sound, at the audio context's real rate. */
function renderNote(ctx: AudioContext, freq: number, seed: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = Math.round(sr * 2.2);
  const buffer = ctx.createBuffer(1, len, sr);
  const data = buffer.getChannelData(0);
  const period = Math.round(sr / freq);
  const line = new Float32Array(period);
  const rand = mulberry32(seed);
  for (let i = 0; i < period; i++) line[i] = rand() * 2 - 1;
  let idx = 0;
  for (let n = 0; n < len; n++) {
    const next = (idx + 1) % period;
    data[n] = line[idx] * 0.35 * Math.min(1, (len - n) / (sr * 0.1));
    line[idx] = 0.996 * 0.5 * (line[idx] + line[next]);
    idx = next;
  }
  return buffer;
}

export function StringRings() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [soundOn, setSoundOn] = useState(false);
  const soundRef = useRef<{ ctx: AudioContext; notes: AudioBuffer[] } | null>(null);
  const soundOnRef = useRef(false);

  const toggleSound = () => {
    if (!soundRef.current) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      soundRef.current = { ctx, notes: STRINGS.map((s, i) => renderNote(ctx, s.freq, i + 1)) };
    }
    const next = !soundOnRef.current;
    soundOnRef.current = next;
    if (next) void soundRef.current.ctx.resume();
    setSoundOn(next);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    const rings = makeRings();
    const maxN = rings[0].n;
    const rand = mulberry32(2024);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let width = 0;
    let height = 0;
    let radiusScale = 0; // px per sample of delay length
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
      radiusScale = (Math.min(width, height) * 0.42) / maxN;
    };
    resize();

    const baseRadius = (ring: Ring) => ring.n * radiusScale;
    const amplitudePx = () => Math.min(width, height) * 0.024;

    const colors = STRINGS.map((s, i) =>
      s.wound
        ? `hsl(${30 + i * 3} ${62 - i * 4}% ${58 + i * 3}%`
        : `hsl(200 ${14 + i}% ${80 - (i - 4) * 4}%`
    );

    const draw = () => {
      ctx2d.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const amp = amplitudePx();

      for (let i = 0; i < rings.length; i++) {
        const ring = rings[i];
        const r0 = baseRadius(ring);
        let e = 0;
        for (let k = 0; k < ring.n; k++) e += ring.buf[k] * ring.buf[k];
        ring.energy = ring.energy * 0.85 + Math.sqrt(e / ring.n) * 0.15;
        const glow = Math.min(1, ring.energy * 6);

        // Smooth closed curve through midpoints of the delay-line samples
        const pts: Array<[number, number]> = [];
        for (let k = 0; k < ring.n; k++) {
          // Relative to the head: the waveform travels once around per period
          const rel = (k - ring.head + ring.n) % ring.n;
          const theta = (rel / ring.n) * Math.PI * 2 - Math.PI / 2;
          const r = r0 + Math.max(-1.6, Math.min(1.6, ring.buf[k])) * amp;
          pts.push([cx + r * Math.cos(theta), cy + r * Math.sin(theta)]);
        }
        ctx2d.beginPath();
        const mid = (a: [number, number], b: [number, number]): [number, number] => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const start = mid(pts[pts.length - 1], pts[0]);
        ctx2d.moveTo(start[0], start[1]);
        for (let k = 0; k < pts.length; k++) {
          const m = mid(pts[k], pts[(k + 1) % pts.length]);
          ctx2d.quadraticCurveTo(pts[k][0], pts[k][1], m[0], m[1]);
        }
        ctx2d.closePath();

        ctx2d.strokeStyle = colors[i] + ` / ${0.14 + glow * 0.2})`;
        ctx2d.lineWidth = (STRINGS[i].wound ? 7 : 5) - i * 0.4;
        ctx2d.stroke();
        ctx2d.strokeStyle = colors[i] + ` / ${0.6 + glow * 0.4})`;
        ctx2d.lineWidth = (STRINGS[i].wound ? 2.2 : 1.4) - i * 0.12;
        ctx2d.stroke();
      }
    };

    // Reduced motion: settle offline and draw one still frame.
    if (reduceMotion) {
      const still = ringRhos(rings, 0.9, 60);
      for (let i = 0; i < rings.length; i++) pluck(rings[i], rings[i].n * (0.15 + 0.13 * i), 0.5 - i * 0.05, 0.2);
      for (let s = 0; s < 400; s++) step(rings, still);
      draw();
      const onResize = () => {
        resize();
        draw();
      };
      window.addEventListener("resize", onResize);
      return () => window.removeEventListener("resize", onResize);
    }

    // Intro: all strings start as white noise
    for (const ring of rings) for (let k = 0; k < ring.n; k++) ring.buf[k] = (rand() * 2 - 1) * 1.2;
    const introStart = performance.now();
    let introDone = false;
    const skipIntro = () => {
      if (introDone) return;
      introDone = true;
      // Jump to the resting state: run the rest of the intro at once
      const fast = ringRhos(rings, INTRO_DECAY_PER_SECOND, 20000 / (INTRO_MS / 1000));
      for (let s = 0; s < 20000; s++) step(rings, fast);
    };

    // Pointer: pluck where a ring is crossed
    let last: { r: number; x: number; y: number } | null = null;
    const toLocal = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left - width / 2;
      const y = e.clientY - rect.top - height / 2;
      return { x, y, r: Math.hypot(x, y) };
    };
    const pluckAt = (i: number, x: number, y: number, amplitude: number) => {
      const ring = rings[i];
      const theta = Math.atan2(y, x) + Math.PI / 2;
      const rel = (((theta / (Math.PI * 2)) % 1) + 1) % 1;
      pluck(ring, ring.head + rel * ring.n, amplitude);
      const sound = soundRef.current;
      if (soundOnRef.current && sound) {
        const src = sound.ctx.createBufferSource();
        const gain = sound.ctx.createGain();
        gain.gain.value = Math.min(1, Math.abs(amplitude)) * 0.6;
        src.buffer = sound.notes[i];
        src.connect(gain).connect(sound.ctx.destination);
        src.start();
      }
    };
    const onMove = (e: PointerEvent) => {
      skipIntro();
      const p = toLocal(e);
      if (last) {
        const speed = Math.hypot(p.x - last.x, p.y - last.y);
        for (let i = 0; i < rings.length; i++) {
          const r0 = baseRadius(rings[i]);
          if ((last.r - r0) * (p.r - r0) < 0) {
            const t = (r0 - last.r) / (p.r - last.r);
            const x = last.x + (p.x - last.x) * t;
            const y = last.y + (p.y - last.y) * t;
            const direction = p.r > last.r ? 1 : -1;
            pluckAt(i, x, y, direction * Math.max(0.6, Math.min(1.4, speed / 12)));
          }
        }
      }
      last = p;
    };
    const onLeave = () => {
      last = null;
    };
    const onDown = (e: PointerEvent) => {
      skipIntro();
      const p = toLocal(e);
      let nearest = 0;
      let best = Infinity;
      rings.forEach((ring, i) => {
        const d = Math.abs(baseRadius(ring) - p.r);
        if (d < best) {
          best = d;
          nearest = i;
        }
      });
      if (best < radiusScale * 30) pluckAt(nearest, p.x, p.y, 1);
      last = p;
    };
    const onSkip = () => skipIntro();

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerleave", onLeave);
    window.addEventListener("keydown", onSkip);
    window.addEventListener("wheel", onSkip, { passive: true });
    window.addEventListener("touchmove", onSkip, { passive: true });

    // Animation loop, paused when offscreen or hidden
    let frame = 0;
    let visible = true;
    let carry = 0;
    let lastTime = 0;
    let nextIdle = 0;
    const loop = (now: number) => {
      frame = 0;
      const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60;
      lastTime = now;
      const t = now - introStart;
      let stepsPerFrame = 1;
      let perSecond = DECAY_PER_SECOND;
      if (!introDone && t < INTRO_MS) {
        const u = t / INTRO_MS;
        stepsPerFrame = 1 + INTRO_MAX_STEPS_PER_FRAME * (1 - u) * (1 - u);
        perSecond = INTRO_DECAY_PER_SECOND;
      } else {
        introDone = true;
        if (now > nextIdle) {
          // A soft, wide nudge on a random string: the room is never silent
          const ring = rings[Math.floor(rand() * rings.length)];
          pluck(ring, rand() * ring.n, (rand() < 0.5 ? -1 : 1) * (0.22 + rand() * 0.2), 0.3);
          nextIdle = now + IDLE_EXCITATION_EVERY_MS * (0.5 + rand());
        }
      }
      carry += stepsPerFrame;
      const n = Math.floor(carry);
      carry -= n;
      const rho = ringRhos(rings, perSecond, Math.max(1, n) / dt);
      for (let s = 0; s < n; s++) step(rings, rho);
      draw();
      if (visible && !document.hidden) frame = requestAnimationFrame(loop);
      else lastTime = 0;
    };
    const start = () => {
      if (!frame && visible && !document.hidden) frame = requestAnimationFrame(loop);
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      start();
    });
    observer.observe(canvas);
    const onVisibility = () => start();
    document.addEventListener("visibilitychange", onVisibility);
    const onResize = () => resize();
    window.addEventListener("resize", onResize);
    start();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("keydown", onSkip);
      window.removeEventListener("wheel", onSkip);
      window.removeEventListener("touchmove", onSkip);
    };
  }, []);

  useEffect(() => {
    return () => {
      void soundRef.current?.ctx.close();
    };
  }, []);

  return (
    <figure className="relative w-full">
      <canvas
        ref={canvasRef}
        className="block w-full aspect-square touch-pan-y cursor-crosshair"
        aria-hidden="true"
      />
      <button
        type="button"
        onClick={toggleSound}
        aria-pressed={soundOn}
        className="absolute top-2 right-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
      >
        {soundOn ? <Volume2 className="w-3.5 h-3.5" aria-hidden="true" /> : <VolumeX className="w-3.5 h-3.5" aria-hidden="true" />}
        Sound {soundOn ? "on" : "off"}
      </button>
      <figcaption className="mt-3 text-[11px] leading-relaxed text-white/55 max-w-md mx-auto text-center text-pretty">
        Six Karplus–Strong strings tuned E2–E4. Each ring is a circular buffer of{" "}
        <span className="font-mono text-white/70">N = f<sub>s</sub>/f</span> samples, drawn to scale, updated{" "}
        <span className="font-mono text-white/70 whitespace-nowrap">y[n] = ρ·½(y[n−N] + y[n−N−1])</span>. Drag across
        the rings to strum. Virtuoso&apos;s 30-second capture keeps your playing in the same kind of ring buffer.
      </figcaption>
    </figure>
  );
}
