/**
 * Native microphone capture using expo-audio.
 *
 * Strategy: sequential short recordings (~200 ms each).
 * After each interval we stop the recording, read the resulting file as
 * base64, compute the RMS, deliver the chunk via callback, then start a
 * new recording.  The ~10–20 ms gap between stop/start is acceptable for
 * voice.
 */

import {
  setAudioModeAsync,
  requestRecordingPermissionsAsync,
  AudioModule,
  IOSOutputFormat,
  AudioQuality,
} from "expo-audio";
import type { RecordingOptions, AudioRecorder } from "expo-audio";
import { File as FSFile } from "expo-file-system";
import { Platform } from "react-native";

import { INPUT_SAMPLE_RATE, CAPTURE_INTERVAL_MS } from "./constants";
import {
  base64ToUint8Array,
  calculateRmsFromPcm16Base64,
  uint8ArrayToBase64,
} from "./utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AudioChunk {
  /** Base64-encoded PCM16 audio data (no WAV header). */
  audio: string;
  /** Normalised RMS volume (0–1). */
  rms: number;
  /** Timestamp (ms since epoch) when this chunk was captured. */
  timestamp: number;
}

export type OnAudioDataCallback = (chunk: AudioChunk) => void;

// ---------------------------------------------------------------------------
// Recording options
// ---------------------------------------------------------------------------

const RECORDING_OPTIONS: RecordingOptions = {
  isMeteringEnabled: true,
  extension: ".wav",
  sampleRate: INPUT_SAMPLE_RATE,
  numberOfChannels: 1,
  bitRate: INPUT_SAMPLE_RATE * 16,
  android: {
    extension: ".wav",
    outputFormat: "default",
    audioEncoder: "default",
    sampleRate: INPUT_SAMPLE_RATE,
  },
  ios: {
    extension: ".wav",
    outputFormat: IOSOutputFormat.LINEARPCM,
    audioQuality: AudioQuality.HIGH,
    sampleRate: INPUT_SAMPLE_RATE,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {},
};

// ---------------------------------------------------------------------------
// AudioCaptureManager
// ---------------------------------------------------------------------------

export class AudioCaptureManager {
  private recording: AudioRecorder | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
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
    const { granted, canAskAgain } = await requestRecordingPermissionsAsync();
    return { granted, canAskAgain };
  }

  // ── Start ───────────────────────────────────────────────────

  async start(onData: OnAudioDataCallback): Promise<void> {
    if (this._isRecording) return;

    this.onAudioData = onData;
    this._isRecording = true;

    // Configure audio session for simultaneous recording + playback.
    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: "doNotMix",
      shouldRouteThroughEarpiece: false,
    });

    await this.startChunk();
  }

  // ── Stop ────────────────────────────────────────────────────

  async stop(): Promise<void> {
    this._isRecording = false;
    this.onAudioData = null;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    await this.stopCurrentRecording();
  }

  // ── Internal: chunk cycle ───────────────────────────────────

  private async startChunk(): Promise<void> {
    if (!this._isRecording) return;

    try {
      const recorder = new AudioModule.AudioRecorder({});
      await recorder.prepareToRecordAsync(RECORDING_OPTIONS);
      recorder.record();
      this.recording = recorder;

      // Schedule harvest after CAPTURE_INTERVAL_MS.
      this.timer = setTimeout(() => this.harvestChunk(), CAPTURE_INTERVAL_MS);
    } catch (err) {
      console.error("[AudioCapture] Failed to start chunk:", err);
      this._isRecording = false;
    }
  }

  private async harvestChunk(): Promise<void> {
    if (!this._isRecording) return;

    const recording = this.recording;
    this.recording = null;

    if (!recording) {
      await this.startChunk();
      return;
    }

    try {
      await recording.stop();
      const uri = recording.uri;

      if (uri) {
        // Read the WAV file as base64 using the new expo-file-system API.
        const file = new FSFile(uri);
        const wavBase64 = await file.base64();

        // Strip the 44-byte WAV header to get raw PCM.
        const pcmBase64 = stripWavHeaderBase64(wavBase64);

        if (pcmBase64 && this.onAudioData) {
          const rms = calculateRmsFromPcm16Base64(pcmBase64);
          this.onAudioData({
            audio: pcmBase64,
            rms,
            timestamp: Date.now(),
          });
        }

        // Clean up temp file.
        try { file.delete(); } catch { /* ignore */ }
      }
    } catch (err) {
      console.error("[AudioCapture] Failed to harvest chunk:", err);
    }

    // Start next chunk.
    await this.startChunk();
  }

  private async stopCurrentRecording(): Promise<void> {
    const recording = this.recording;
    this.recording = null;

    if (!recording) return;

    try {
      const status = recording.getStatus();
      if (status.isRecording) {
        await recording.stop();
      }
      const uri = recording.uri;
      if (uri) {
        try { new FSFile(uri).delete(); } catch { /* ignore */ }
      }
    } catch {
      // Recording may already be stopped — ignore.
    }
  }
}

// ---------------------------------------------------------------------------
// Factory — platform-aware capture manager
// ---------------------------------------------------------------------------

/** Common interface for both iOS and Android capture managers. */
export interface CaptureManager {
  readonly isRecording: boolean;
  requestPermission(): Promise<{ granted: boolean; canAskAgain: boolean }>;
  start(onData: OnAudioDataCallback): Promise<void>;
  stop(): Promise<void>;
}

/**
 * Returns the appropriate capture manager for the current platform.
 * iOS uses expo-audio (sequential short recordings → WAV → strip header).
 * Android uses @mykin-ai/expo-audio-stream (AudioRecord PCM streaming).
 */
export function createCaptureManager(): CaptureManager {
  if (Platform.OS === "android") {
    // Lazy import to avoid loading the Android-only module on iOS.
    const { AndroidCaptureManager } = require("./androidCapture");
    return new AndroidCaptureManager();
  }
  return new AudioCaptureManager();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the raw PCM payload from a base64-encoded WAV file.
 * Parses the RIFF structure to find the 'data' chunk instead of
 * blindly stripping 44 bytes, which breaks if 'FLLR' chunks are present.
 */
function stripWavHeaderBase64(wavBase64: string): string | null {
  if (wavBase64.length < 60) return null;
  const wavBytes = base64ToUint8Array(wavBase64);

  const view = new DataView(wavBytes.buffer, wavBytes.byteOffset, wavBytes.byteLength);

  // Check for "RIFF" and "WAVE" signatures
  if (view.byteLength < 12) return null;
  if (view.getUint32(0, false) !== 0x52494646) return null; // "RIFF"
  if (view.getUint32(8, false) !== 0x57415645) return null; // "WAVE"

  let offset = 12;
  while (offset < view.byteLength) {
    if (offset + 8 > view.byteLength) break;

    const chunkId = view.getUint32(offset, false);
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 0x64617461) { // "data" chunk
      const pcmBytes = new Uint8Array(wavBytes.buffer, wavBytes.byteOffset + offset + 8, Math.min(chunkSize, view.byteLength - (offset + 8)));
      return uint8ArrayToBase64(pcmBytes);
    }

    offset += 8 + chunkSize;
    // Word-align chunk if odd length
    if (chunkSize % 2 !== 0) offset++;
  }

  return null;
}
