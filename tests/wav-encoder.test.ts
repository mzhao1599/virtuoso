import { describe, expect, it } from "vitest";
import { encodeWav } from "@/lib/audio/wav-encoder";

async function parse(blob: Blob) {
  const view = new DataView(await blob.arrayBuffer());
  const text = (offset: number) =>
    String.fromCharCode(...[0, 1, 2, 3].map((i) => view.getUint8(offset + i)));
  return { view, text, bytes: view.byteLength };
}

describe("encodeWav", () => {
  it("writes a valid 16-bit mono PCM RIFF header at 22.05 kHz", async () => {
    const n = 44100; // one second at 44.1 kHz
    const blob = encodeWav(new Float32Array(n), new Float32Array(n), 44100);
    expect(blob.type).toBe("audio/wav");

    const { view, text, bytes } = await parse(blob);
    const samples = n / 2; // downsampled by 2
    expect(text(0)).toBe("RIFF");
    expect(view.getUint32(4, true)).toBe(bytes - 8);
    expect(text(8)).toBe("WAVE");
    expect(text(12)).toBe("fmt ");
    expect(view.getUint32(16, true)).toBe(16); // fmt chunk size
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // mono
    expect(view.getUint32(24, true)).toBe(22050); // sample rate
    expect(view.getUint32(28, true)).toBe(22050 * 2); // byte rate
    expect(view.getUint16(32, true)).toBe(2); // block align
    expect(view.getUint16(34, true)).toBe(16); // bits per sample
    expect(text(36)).toBe("data");
    expect(view.getUint32(40, true)).toBe(samples * 2);
    expect(bytes).toBe(44 + samples * 2);
  });

  it("mixes stereo to mono and keeps every other sample at 44.1 kHz", async () => {
    const left = Float32Array.from([0.5, 9, 1, 9, -1, 9]);
    const right = Float32Array.from([0.5, 9, 0, 9, -0.5, 9]);
    const { view } = await parse(encodeWav(left, right, 44100));
    // samples 0, 2, 4 → (0.5+0.5)/2 = 0.5, (1+0)/2 = 0.5, (-1-0.5)/2 = -0.75
    expect(view.getInt16(44, true)).toBe(Math.trunc(0.5 * 0x7fff));
    expect(view.getInt16(46, true)).toBe(Math.trunc(0.5 * 0x7fff));
    expect(view.getInt16(48, true)).toBe(Math.trunc(-0.75 * 0x8000));
  });

  it("clamps out-of-range samples to the 16-bit limits", async () => {
    const loud = Float32Array.from([3, 0, -3, 0]);
    const { view } = await parse(encodeWav(loud, loud, 44100));
    expect(view.getInt16(44, true)).toBe(32767);
    expect(view.getInt16(46, true)).toBe(-32768);
  });

  it("handles 48 kHz input (ratio rounds to 2) and an empty buffer", async () => {
    const { view } = await parse(encodeWav(new Float32Array(480), new Float32Array(480), 48000));
    expect(view.getUint32(24, true)).toBe(22050);
    expect(view.getUint32(40, true)).toBe(240 * 2);

    const empty = await parse(encodeWav(new Float32Array(0), new Float32Array(0), 44100));
    expect(empty.bytes).toBe(44);
  });

  it("encodes a 30-second clip at the size the upload limit assumes", async () => {
    const n = 44100 * 30;
    const blob = encodeWav(new Float32Array(n), new Float32Array(n), 44100);
    expect(blob.size).toBe(44 + 22050 * 30 * 2); // ~1.3 MB, under the 3 MB server action limit
  });
});
