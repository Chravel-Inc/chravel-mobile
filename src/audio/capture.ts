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
import type { RecordingOptions } from "expo-audio";
import type { AudioRecorder } from "expo-audio/build/AudioModule.types";
import { createRecordingOptions } from "expo-audio/build/utils/options";
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
    if (Platform.OS === "android") {
      throw new Error(
        "Android capture requires PCM WAV input, which expo-audio cannot produce.",
      );
    }

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
      const platformOptions = createRecordingOptions(RECORDING_OPTIONS);
      const recorder = new AudioModule.AudioRecorder(platformOptions);
      await recorder.prepareToRecordAsync();
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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip the 44-byte WAV header from a base64-encoded WAV file.
 *
 * For our small chunks (~200 ms × 16 kHz × 2 bytes = ~6400 bytes) the
 * decode-slice-reencode approach is fast enough.
 */
function stripWavHeaderBase64(wavBase64: string): string | null {
  if (wavBase64.length < 60) return null;
  const wavBytes = base64ToUint8Array(wavBase64);
  if (wavBytes.length <= 44) return null;
  return uint8ArrayToBase64(wavBytes.subarray(44));
}
