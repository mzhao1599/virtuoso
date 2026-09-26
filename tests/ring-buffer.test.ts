import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

/**
 * Runs the real AudioWorklet file (public/worklets/ring-buffer-processor.js)
 * in a sandbox that provides the AudioWorkletGlobalScope pieces it uses.
 */
const SOURCE = readFileSync(join(process.cwd(), "public/worklets/ring-buffer-processor.js"), "utf8");

interface Captured {
  command: string;
  left: Float32Array;
  right: Float32Array;
  sampleRate: number;
}

function loadProcessor(sampleRate: number) {
  let Processor: new () => {
    process(inputs: Float32Array[][]): boolean;
    port: { onmessage: (e: { data: unknown }) => void };
  };
  const posted: Captured[] = [];

  class AudioWorkletProcessor {
    port = {
      onmessage: (() => {}) as (e: { data: unknown }) => void,
      postMessage: (msg: Captured) => posted.push(msg),
    };
  }

  vm.runInNewContext(SOURCE, {
    AudioWorkletProcessor,
    sampleRate,
    Float32Array,
    Math,
    registerProcessor: (_name: string, ctor: typeof Processor) => {
      Processor = ctor;
    },
  });

  const processor = new Processor!();
  let t = 0;
  /** Feed `count` samples in 128-sample blocks; left = t, right = -t. */
  const feed = (count: number, mono = false) => {
    while (count > 0) {
      const size = Math.min(128, count);
      const l = Float32Array.from({ length: size }, (_, i) => t + i);
      const r = Float32Array.from(l, (v) => -v);
      processor.process([mono ? [l] : [l, r]]);
      t += size;
      count -= size;
    }
  };
  const capture = () => {
    processor.port.onmessage({ data: { command: "CAPTURE" } });
    return posted[posted.length - 1];
  };
  const reset = () => processor.port.onmessage({ data: { command: "RESET" } });
  return { feed, capture, reset, bufferSize: Math.ceil(sampleRate * 30) };
}

const range = (from: number, to: number) => Array.from({ length: to - from }, (_, i) => from + i);

describe("ring buffer worklet", () => {
  // A small "sample rate" keeps the 30-second buffer small: 30 * 100 = 3000 samples
  const SR = 100;

  it("returns only what has been written before the buffer fills, oldest first", () => {
    const rb = loadProcessor(SR);
    rb.feed(1000);
    const out = rb.capture();
    expect(out.command).toBe("CAPTURE_RESULT");
    expect(out.sampleRate).toBe(SR);
    expect(Array.from(out.left)).toEqual(range(0, 1000));
    expect(Array.from(out.right)).toEqual(range(0, 1000).map((v) => -v));
  });

  it("keeps exactly the last 30 seconds after wrapping, in order", () => {
    const rb = loadProcessor(SR);
    rb.feed(rb.bufferSize + 1234); // wraps once, write pointer mid-buffer
    const out = rb.capture();
    expect(out.left).toHaveLength(rb.bufferSize);
    expect(Array.from(out.left)).toEqual(range(1234, rb.bufferSize + 1234));
  });

  it("stays ordered after many wraps with blocks that don't divide the buffer", () => {
    const rb = loadProcessor(SR);
    rb.feed(rb.bufferSize * 3 + 77);
    const out = Array.from(rb.capture().left);
    const end = rb.bufferSize * 3 + 77;
    expect(out[0]).toBe(end - rb.bufferSize);
    expect(out[out.length - 1]).toBe(end - 1);
    expect(out.every((v, i) => i === 0 || v === out[i - 1] + 1)).toBe(true);
  });

  it("copies a mono input to both channels", () => {
    const rb = loadProcessor(SR);
    rb.feed(10, true);
    const out = rb.capture();
    expect(Array.from(out.right)).toEqual(Array.from(out.left));
  });

  it("starts empty again after RESET (so a capture never spans a break)", () => {
    const rb = loadProcessor(SR);
    rb.feed(rb.bufferSize + 50);
    rb.reset();
    expect(rb.capture().left).toHaveLength(0);
    rb.feed(5);
    expect(rb.capture().left).toHaveLength(5);
  });

  it("sizes the buffer for 30 seconds at the recorder's 44.1 kHz", () => {
    const rb = loadProcessor(44100);
    rb.feed(44100 * 31);
    expect(rb.capture().left).toHaveLength(44100 * 30);
  });
});
