/**
 * Android microphone capture using @mykin-ai/expo-audio-stream.
 *
 * expo-audio cannot produce PCM WAV on Android (MediaRecorder has no WAV
 * output format). This module uses expo-audio-stream which accesses
 * Android's lower-level AudioRecord API to stream raw PCM16 chunks.
 *
 * The interface mirrors AudioCaptureManager so voiceBridge.ts can use
 * either implementation transparently via the factory in capture.ts.
 */

import { ExpoPlayAudioStream } from "@mykin-ai/expo-audio-stream";
import { requestRecordingPermissionsAsync, setAudioModeAsync } from "expo-audio";

import { INPUT_SAMPLE_RATE, CAPTURE_INTERVAL_MS } from "./constants";
import { calculateRmsFromPcm16Base64, uint8ArrayToBase64 } from "./utils";
import type { AudioChunk, OnAudioDataCallback } from "./capture";

// ---------------------------------------------------------------------------
// AndroidCaptureManager
// ---------------------------------------------------------------------------

export class AndroidCaptureManager {
  private subscription: { remove(): void } | null = null;
  private _isRecording = false;
  private onAudioData: OnAudioDataCallback | null = null;

  get isRecording(): boolean {
    return this._isRecording;
  }

  // ── Permission ──────────────────────────────────────────────

  async requestPermission(): Promise<{
    granted: boolean;
    canAskAgain: boolean;
  }> {
    // Use the same expo-audio permission API for consistency.
    const { granted, canAskAgain } = await requestRecordingPermissionsAsync();
    return { granted, canAskAgain };
  }

  // ── Start ───────────────────────────────────────────────────

  async start(onData: OnAudioDataCallback): Promise<void> {
    if (this._isRecording) return;

    this.onAudioData = onData;
    this._isRecording = true;

    // Configure audio session for simultaneous recording + playback (duplex voice).
    // Mirrors the iOS AudioCaptureManager.start() configuration.
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "doNotMix",
      shouldRouteThroughEarpiece: false,
    });

    // Subscribe to audio data events before starting recording.
    this.subscription = ExpoPlayAudioStream.subscribeToAudioEvents(
      async (event) => {
        if (!this._isRecording || !this.onAudioData) return;

        const audioData = event.data;
        if (!audioData) return;

        // event.data may be a base64 string or Float32Array depending on version.
        const base64Audio =
          typeof audioData === "string"
            ? audioData
            : float32ToBase64Pcm16(audioData);

        if (!base64Audio) return;

        const rms = calculateRmsFromPcm16Base64(base64Audio);

        const chunk: AudioChunk = {
          audio: base64Audio,
          rms,
          timestamp: Date.now(),
        };

        this.onAudioData(chunk);
      },
    );

    try {
      await ExpoPlayAudioStream.startRecording({
        sampleRate: INPUT_SAMPLE_RATE,
        encoding: "pcm_16bit",
        channels: 1,
        interval: CAPTURE_INTERVAL_MS,
      });
    } catch (err) {
      console.error("[AndroidCapture] Failed to start recording:", err);
      this._isRecording = false;
      this.subscription?.remove();
      this.subscription = null;
      throw err;
    }
  }

  // ── Stop ────────────────────────────────────────────────────

  async stop(): Promise<void> {
    this._isRecording = false;
    this.onAudioData = null;

    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }

    try {
      await ExpoPlayAudioStream.stopRecording();
    } catch {
      // Recording may already be stopped — ignore.
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Convert a Float32Array (normalised -1..1 samples) to base64-encoded PCM16.
 */
function float32ToBase64Pcm16(float32: Float32Array): string {
  const pcm16 = new Uint8Array(float32.length * 2);
  for (let i = 0; i < float32.length; i++) {
    const clamped = Math.max(-1, Math.min(1, float32[i]));
    const sample = clamped < 0 ? clamped * 32768 : clamped * 32767;
    const int16 = Math.round(sample);
    pcm16[i * 2] = int16 & 0xff;
    pcm16[i * 2 + 1] = (int16 >> 8) & 0xff;
  }
  return uint8ArrayToBase64(pcm16);
}
