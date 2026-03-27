/**
 * Native microphone capture using expo-av.
 *
 * Strategy: sequential short recordings (~200 ms each).
 * After each interval we stop the recording, read the resulting file as
 * base64, compute the RMS, deliver the chunk via callback, then start a
 * new recording.  The ~10–20 ms gap between stop/start is acceptable for
 * voice.
 */

import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from "expo-av";
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

const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: ".wav",
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: INPUT_SAMPLE_RATE,
    numberOfChannels: 1,
    bitRate: INPUT_SAMPLE_RATE * 16,
  },
  ios: {
    extension: ".wav",
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: INPUT_SAMPLE_RATE,
    numberOfChannels: 1,
    bitRate: INPUT_SAMPLE_RATE * 16,
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
  private recording: Audio.Recording | null = null;
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
    const { granted, canAskAgain } = await Audio.requestPermissionsAsync();
    return { granted, canAskAgain };
  }

  // ── Start ───────────────────────────────────────────────────

  async start(onData: OnAudioDataCallback): Promise<void> {
    if (this._isRecording) return;
    if (Platform.OS === "android") {
      throw new Error(
        "Android capture requires PCM WAV input, which expo-av cannot produce.",
      );
    }

    this.onAudioData = onData;
    this._isRecording = true;

    // Configure audio session for simultaneous recording + playback.
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
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
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(RECORDING_OPTIONS);
      await recording.startAsync();
      this.recording = recording;

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
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

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
      const status = await recording.getStatusAsync();
      if (status.isRecording) {
        await recording.stopAndUnloadAsync();
      }
      const uri = recording.getURI();
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
