/**
 * Encode raw PCM Float32 stereo data into a WAV Blob.
 *
 * WAV spec reference:
 *   RIFF header (44 bytes) + interleaved 16-bit PCM data.
 *
 * We clamp & quantise float samples → Int16 to keep file sizes reasonable
 * while preserving plenty of dynamic range for practice recordings.
 * 
 * To minimize file size:
 *   - Converts stereo to mono
 *   - Downsamples to 22050 Hz (reduces size by ~75%)
 */

export function encodeWav(
  leftChannel: Float32Array,
  rightChannel: Float32Array,
  sampleRate: number
): Blob {
  // ── Compress: Convert to mono and downsample ──────────────
  const targetSampleRate = 22050;
  const downsampleRatio = Math.round(sampleRate / targetSampleRate);
  const downsampledLength = Math.floor(leftChannel.length / downsampleRatio);
  
  const monoChannel = new Float32Array(downsampledLength);
  
  for (let i = 0; i < downsampledLength; i++) {
    const sourceIndex = i * downsampleRatio;
    // Mix stereo to mono and downsample
    monoChannel[i] = (leftChannel[sourceIndex] + rightChannel[sourceIndex]) * 0.5;
  }
  
  return encodeMonoWav(monoChannel, targetSampleRate);
}

/**
 * Encode mono Float32 PCM data into a WAV Blob.
 */
function encodeMonoWav(
  channel: Float32Array,
  sampleRate: number
): Blob {
  const numChannels = 1; // mono
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const numSamples = channel.length;
  const dataByteLength = numSamples * numChannels * bytesPerSample;
  const headerByteLength = 44;
  const totalByteLength = headerByteLength + dataByteLength;

  const buffer = new ArrayBuffer(totalByteLength);
  const view = new DataView(buffer);

  let offset = 0;

  // ── RIFF header ──────────────────────────────────────────
  writeString(view, offset, "RIFF"); offset += 4;
  view.setUint32(offset, totalByteLength - 8, true); offset += 4;
  writeString(view, offset, "WAVE"); offset += 4;

  // ── fmt  sub-chunk ───────────────────────────────────────
  writeString(view, offset, "fmt "); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;               // sub-chunk size
  view.setUint16(offset, 1, true); offset += 2;                // PCM format
  view.setUint16(offset, numChannels, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, sampleRate * numChannels * bytesPerSample, true); offset += 4; // byte rate
  view.setUint16(offset, numChannels * bytesPerSample, true); offset += 2; // block align
  view.setUint16(offset, bitsPerSample, true); offset += 2;

  // ── data sub-chunk ───────────────────────────────────────
  writeString(view, offset, "data"); offset += 4;
  view.setUint32(offset, dataByteLength, true); offset += 4;

  // ── Mono 16-bit PCM samples ──────────────────────────────
  for (let i = 0; i < numSamples; i++) {
    // Clamp to [-1, 1] then scale to Int16 range
    const sample = Math.max(-1, Math.min(1, channel[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
