import { useRef, useState, useCallback, useEffect } from "react";
import { encodeWav } from "@/lib/audio/wav-encoder";

export interface Snippet {
  id: string;
  blob: Blob;
  url: string;           // Object URL for playback
  capturedAt: number;     // Timestamp (ms since session start)
  durationMs: number;     // Actual duration of captured audio
  uploaded: boolean;
  uploading: boolean;
}

interface UseRetroactiveRecorderReturn {
  /** Whether the mic is live & the ring-buffer is filling */
  isListening: boolean;
  /** Start the mic + worklet pipeline */
  startListening: () => Promise<void>;
  /** Stop the mic and tear down nodes */
  stopListening: () => void;
  /** Grab the last ≤30 s from the ring buffer */
  capture: (currentPracticeTimeMs: number) => Promise<Snippet | null>;
  /** Reset the ring buffer (used when resuming from break) */
  resetBuffer: () => void;
  /** Any error that occurred during setup */
  error: string | null;
}

const FORCED_SAMPLE_RATE = 44100;

export function useRetroactiveRecorder(): UseRetroactiveRecorderReturn {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Clean up object URLs when component unmounts
  useEffect(() => {
    return () => {
      stopListening();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startListening = useCallback(async () => {
    if (ctxRef.current) {
      return; // already running
    }

    try {
      setError(null);

      // 1. Create AudioContext at 44.1 kHz
      const ctx = new AudioContext({ sampleRate: FORCED_SAMPLE_RATE });
      ctxRef.current = ctx;

      // 2. Load the worklet module
      await ctx.audioWorklet.addModule("/worklets/ring-buffer-processor.js");

      // 3. Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: FORCED_SAMPLE_RATE,
          channelCount: 2,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      streamRef.current = stream;

      // 4. Wire up: Mic → WorkletNode (no destination — we don't want monitoring playback)
      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const workletNode = new AudioWorkletNode(ctx, "ring-buffer-processor", {
        numberOfInputs: 1,
        numberOfOutputs: 0, // sink node — no output
        channelCount: 2,
      });
      workletRef.current = workletNode;

      // Start the message port to enable communication
      workletNode.port.start();

      source.connect(workletNode);

      setIsListening(true);
    } catch (err) {
      const msg =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone permission denied. Please allow access."
          : `Audio setup failed: ${err instanceof Error ? err.message : String(err)}`;
      setError(msg);
      console.error("[useRetroactiveRecorder] Error during setup:", err);

      // Tear down whatever was created so the next attempt starts clean
      // (otherwise the leftover AudioContext makes startListening a no-op).
      sourceRef.current?.disconnect();
      sourceRef.current = null;
      workletRef.current?.disconnect();
      workletRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      if (ctxRef.current && ctxRef.current.state !== "closed") {
        void ctxRef.current.close();
      }
      ctxRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    // Disconnect nodes
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (workletRef.current) {
      workletRef.current.disconnect();
      workletRef.current = null;
    }

    // Stop mic tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Close AudioContext
    if (ctxRef.current && ctxRef.current.state !== "closed") {
      ctxRef.current.close();
      ctxRef.current = null;
    }

    setIsListening(false);
  }, []);

  const capture = useCallback(
    (currentPracticeTimeMs: number): Promise<Snippet | null> => {
      return new Promise((resolve) => {
        const worklet = workletRef.current;
        if (!worklet) {
          resolve(null);
          return;
        }

        // One-shot listener for the result
        const handler = (event: MessageEvent) => {
          if (event.data.command !== "CAPTURE_RESULT") return;
          worklet.port.removeEventListener("message", handler);

          const { left, right, sampleRate: sr } = event.data as {
            left: Float32Array;
            right: Float32Array;
            sampleRate: number;
          };

          if (left.length === 0) {
            resolve(null);
            return;
          }

          const blob = encodeWav(left, right, sr);
          const url = URL.createObjectURL(blob);
          const durationMs = (left.length / sr) * 1000;

          resolve({
            id: crypto.randomUUID(),
            blob,
            url,
            capturedAt: currentPracticeTimeMs, // Practice time only (excluding breaks)
            durationMs,
            uploaded: false,
            uploading: false,
          });
        };

        worklet.port.addEventListener("message", handler);
        worklet.port.postMessage({ command: "CAPTURE" });
      });
    },
    []
  );

  const resetBuffer = useCallback(() => {
    const worklet = workletRef.current;
    if (!worklet) {
      return;
    }
    worklet.port.postMessage({ command: 'RESET' });
  }, []);

  return { isListening, startListening, stopListening, capture, resetBuffer, error };
}
