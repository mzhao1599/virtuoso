// Generates the two synthesized clips used by the demo seed
// (public/demo/clips/*.wav). They are not recordings: one is a
// Karplus-Strong plucked-string arpeggio, the other an additive-synthesis
// piano-like broken chord. Output goes through the app's own WAV encoder,
// so the files match what the recorder uploads (mono, 22.05 kHz, 16-bit).
//
//   node scripts/generate-demo-clips.mjs
//
// Deterministic: a seeded PRNG means re-running produces identical files.

import { writeFile } from "node:fs/promises";
import { encodeWav } from "../lib/audio/wav-encoder.ts";

const SR = 44100;
const SECONDS = 10;

function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const midiToHz = (m) => 440 * 2 ** ((m - 69) / 12);

/** Karplus-Strong: a noise burst in a delay line, averaged each pass (a lossy string). */
function pluck(out, startSample, freq, rand, { decay = 0.996, gain = 0.5 } = {}) {
  const period = Math.round(SR / freq);
  const line = new Float32Array(period);
  for (let i = 0; i < period; i++) line[i] = (rand() * 2 - 1) * gain;
  let idx = 0;
  for (let n = startSample; n < out.length; n++) {
    const next = (idx + 1) % period;
    const y = decay * 0.5 * (line[idx] + line[next]);
    out[n] += line[idx];
    line[idx] = y;
    idx = next;
  }
}

/** Piano-ish note: stiff-string partials f*k*sqrt(1+B k^2), higher partials decay faster. */
function strike(out, startSample, freq, { gain = 0.25, inharmonicity = 0.0004 } = {}) {
  for (let k = 1; k <= 10; k++) {
    const fk = freq * k * Math.sqrt(1 + inharmonicity * k * k);
    if (fk > SR / 2) break;
    const amp = gain / k ** 1.3;
    const rate = 0.9 + 0.55 * k;
    for (let n = startSample; n < out.length; n++) {
      const t = (n - startSample) / SR;
      const env = Math.min(1, t / 0.004) * Math.exp(-rate * t);
      if (env < 1e-4 && t > 0.01) break;
      out[n] += amp * env * Math.sin(2 * Math.PI * fk * t);
    }
  }
}

function finish(mono) {
  let peak = 0;
  for (const v of mono) peak = Math.max(peak, Math.abs(v));
  const scale = peak > 0 ? 0.8 / peak : 1;
  const fade = Math.round(0.4 * SR);
  for (let n = 0; n < mono.length; n++) {
    const tail = mono.length - n;
    mono[n] *= scale * (tail < fade ? tail / fade : 1);
  }
  return encodeWav(mono, mono, SR);
}

async function save(name, blob) {
  const path = new URL(`../public/demo/clips/${name}`, import.meta.url);
  await writeFile(path, Buffer.from(await blob.arrayBuffer()));
  console.log(`wrote public/demo/clips/${name} (${blob.size} bytes)`);
}

// 1. Plucked arpeggio: E minor / C / G / D pattern, eighth notes at 100 bpm
{
  const rand = mulberry32(7);
  const out = new Float32Array(SR * SECONDS);
  const eighth = (60 / 100 / 2) * SR;
  const shapes = [
    [40, 47, 52, 55, 59, 55, 52, 47], // Em
    [48, 52, 55, 60, 64, 60, 55, 52], // C
    [43, 50, 55, 59, 62, 59, 55, 50], // G
    [50, 57, 62, 66, 69, 66, 62, 57], // D
  ];
  let step = 0;
  for (const shape of shapes) {
    for (const note of shape) {
      pluck(out, Math.round(step * eighth), midiToHz(note), rand, { gain: note < 50 ? 0.6 : 0.45 });
      step++;
    }
  }
  await save("plucked-arpeggio.wav", finish(out));
}

// 2. Piano-like broken chords (C - Dm7/C - G7/B - C), sixteenths at 72 bpm
{
  const out = new Float32Array(SR * SECONDS);
  const sixteenth = (60 / 72 / 4) * SR;
  const bars = [
    [60, 64, 67, 72, 76],
    [60, 62, 69, 74, 77],
    [59, 62, 67, 74, 77],
    [60, 64, 67, 72, 76],
  ];
  let step = 0;
  for (const bar of bars) {
    for (let rep = 0; rep < 2; rep++) {
      strike(out, Math.round(step * sixteenth), midiToHz(bar[0]), { gain: 0.3 });
      step++;
      strike(out, Math.round(step * sixteenth), midiToHz(bar[1]), { gain: 0.25 });
      step++;
      for (const note of [bar[2], bar[3], bar[4], bar[2], bar[3], bar[4]]) {
        strike(out, Math.round(step * sixteenth), midiToHz(note), { gain: 0.2 });
        step++;
      }
    }
  }
  await save("piano-phrase.wav", finish(out));
}
