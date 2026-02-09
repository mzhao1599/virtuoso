/**
 * RingBufferProcessor — AudioWorklet that maintains a 30-second circular
 * buffer per channel.  When the main thread sends { command: 'CAPTURE' },
 * the buffer is flattened (oldest-sample-first) and posted back.
 *
 * Design constraints
 * ──────────────────
 * • Zero allocations inside process() — we reuse pre-allocated Float32Arrays.
 * • Handles mono or stereo input transparently.
 * • Buffer size is derived from sampleRate (available at construction time).
 */

const BUFFER_SECONDS = 30;

class RingBufferProcessor extends AudioWorkletProcessor {
  constructor() {
    super();

    console.log('[RingBufferProcessor] Initializing at sample rate:', sampleRate);

    // sampleRate is a global available inside AudioWorkletGlobalScope
    this._bufferSize = Math.ceil(sampleRate * BUFFER_SECONDS);
    this._left = new Float32Array(this._bufferSize);
    this._right = new Float32Array(this._bufferSize);
    this._writePointer = 0;
    this._samplesWritten = 0; // tracks total samples written (for partial buffers)

    this.port.onmessage = (event) => {
      console.log('[RingBufferProcessor] Message received:', event.data);
      if (event.data.command === 'CAPTURE') {
        console.log('[RingBufferProcessor] Handling CAPTURE command');
        this._handleCapture();
      } else if (event.data.command === 'RESET') {
        console.log('[RingBufferProcessor] Handling RESET command');
        this._handleReset();
      }
    };
  }

  /**
   * Called ~every 128 samples per quantum.
   * We MUST NOT allocate here — only index into pre-existing buffers.
   */
  process(inputs /*, outputs, parameters */) {
    const input = inputs[0]; // first input node
    if (!input || input.length === 0) return true;

    const leftChannel = input[0];
    const rightChannel = input.length > 1 ? input[1] : input[0]; // mono fallback
    const blockSize = leftChannel.length; // typically 128

    for (let i = 0; i < blockSize; i++) {
      this._left[this._writePointer] = leftChannel[i];
      this._right[this._writePointer] = rightChannel[i];
      this._writePointer++;
      if (this._writePointer >= this._bufferSize) {
        this._writePointer = 0;
      }
    }

    this._samplesWritten += blockSize;
    return true; // keep processor alive
  }

  /**
   * Flatten the circular buffer so the oldest sample is at index 0.
   * If we haven't filled the buffer yet, only return what we have.
   */
  _handleCapture() {
    const filled = Math.min(this._samplesWritten, this._bufferSize);
    console.log('[RingBufferProcessor] _handleCapture called', {
      samplesWritten: this._samplesWritten,
      bufferSize: this._bufferSize,
      filled,
      writePointer: this._writePointer
    });
    
    const left = new Float32Array(filled);
    const right = new Float32Array(filled);

    if (this._samplesWritten < this._bufferSize) {
      // Buffer not yet full — data starts at index 0
      left.set(this._left.subarray(0, filled));
      right.set(this._right.subarray(0, filled));
    } else {
      // Buffer is full — oldest sample is at writePointer
      const wp = this._writePointer;
      const tailLen = this._bufferSize - wp;

      // Copy tail (oldest) then head (newest)
      left.set(this._left.subarray(wp, wp + tailLen), 0);
      left.set(this._left.subarray(0, wp), tailLen);

      right.set(this._right.subarray(wp, wp + tailLen), 0);
      right.set(this._right.subarray(0, wp), tailLen);
    }

    console.log('[RingBufferProcessor] Posting CAPTURE_RESULT', {
      leftLength: left.length,
      rightLength: right.length,
      sampleRate
    });

    this.port.postMessage(
      { command: 'CAPTURE_RESULT', left, right, sampleRate },
      [left.buffer, right.buffer] // transfer ownership — zero-copy
    );
  }

  /**
   * Reset the buffer to clear all audio data.
   * Used when resuming from a break to prevent captures from spanning breaks.
   */
  _handleReset() {
    console.log('[RingBufferProcessor] Resetting buffer');
    this._left.fill(0);
    this._right.fill(0);
    this._writePointer = 0;
    this._samplesWritten = 0;
  }
}

registerProcessor('ring-buffer-processor', RingBufferProcessor);
