/**
 * Native audio playback using expo-audio.
 *
 * Accepts base64 PCM16 chunks (typically 24 kHz mono from Vertex AI),
 * wraps them in a WAV file, and plays them sequentially through
 * expo-audio's AudioPlayer.
 *
 * Supports:
 * - Queued gapless playback (chunks are played one after another)
 * - flush() for barge-in (stops current sound + clears queue)
 * - RMS reporting per chunk for waveform visualisation
 */

import { createAudioPlayer } from "expo-audio";
import type { AudioPlayer, AudioEvents } from "expo-audio";
import { Paths, File as FSFile } from "expo-file-system";

import { OUTPUT_SAMPLE_RATE } from "./constants";
import {
  base64ToUint8Array,
  createWavHeader,
  concatUint8Arrays,
  uint8ArrayToBase64,
  calculateRmsFromPcm16Base64,
} from "./utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OnPlaybackRmsCallback = (rms: number) => void;
export type OnQueueDrainedCallback = () => void;

interface QueuedChunk {
  wavBase64: string;
  rms: number;
}

// ---------------------------------------------------------------------------
// AudioPlaybackManager
// ---------------------------------------------------------------------------

export class AudioPlaybackManager {
  private queue: QueuedChunk[] = [];
  private currentPlayer: AudioPlayer | null = null;
  private currentFile: FSFile | null = null;
  private isPlaying = false;
  private chunkCounter = 0;

  onRms: OnPlaybackRmsCallback | null = null;
  onQueueDrained: OnQueueDrainedCallback | null = null;

  /**
   * Enqueue a base64 PCM16 chunk for playback.
   *
   * @param pcmBase64 - Raw PCM16 audio as base64 (no WAV header).
   * @param sampleRate - Sample rate of the PCM data (default: 24000).
   */
  async enqueue(pcmBase64: string, sampleRate = OUTPUT_SAMPLE_RATE): Promise<void> {
    const rms = calculateRmsFromPcm16Base64(pcmBase64);

    // Wrap raw PCM in a WAV container.
    const pcmBytes = base64ToUint8Array(pcmBase64);
    const wavHeader = createWavHeader(pcmBytes.length, sampleRate);
    const wavBytes = concatUint8Arrays(wavHeader, pcmBytes);
    const wavBase64 = uint8ArrayToBase64(wavBytes);

    this.queue.push({ wavBase64, rms });

    if (!this.isPlaying) {
      await this.playNext();
    }
  }

  /**
   * Stop all playback immediately and clear the queue (barge-in).
   */
  async flush(): Promise<void> {
    this.queue = [];
    this.isPlaying = false;
    this.stopCurrentPlayer();
  }

  /**
   * Clean up all resources.
   */
  async dispose(): Promise<void> {
    await this.flush();
  }

  // ── Internal ────────────────────────────────────────────────

  private async playNext(): Promise<void> {
    const chunk = this.queue.shift();

    if (!chunk) {
      this.isPlaying = false;
      this.onQueueDrained?.();
      return;
    }

    this.isPlaying = true;
    this.onRms?.(chunk.rms);

    try {
      // Write WAV to a temp file using new expo-file-system File API.
      const file = new FSFile(Paths.cache, `voice_playback_${this.chunkCounter++}.wav`);
      file.write(chunk.wavBase64, { encoding: "base64" });
      this.currentFile = file;

      // Create and play the sound.
      const player = createAudioPlayer({ uri: file.uri });
      player.addListener("playbackStatusUpdate", this.onPlaybackStatus);
      this.currentPlayer = player;
      player.play();
    } catch (err) {
      console.error("[AudioPlayback] Failed to play chunk:", err);
      this.cleanupCurrentFile();
      await this.playNext();
    }
  }

  private onPlaybackStatus = (status: Parameters<AudioEvents["playbackStatusUpdate"]>[0]) => {
    if (status.isLoaded && status.didJustFinish && !status.playing) {
      this.stopCurrentPlayer();
      this.playNext().catch((err) =>
        console.error("[AudioPlayback] Error advancing queue:", err),
      );
    }
  };

  private stopCurrentPlayer(): void {
    const player = this.currentPlayer;
    this.currentPlayer = null;

    if (player) {
      try {
        player.remove();
      } catch {
        // Player may already be removed.
      }
    }

    this.cleanupCurrentFile();
  }

  private cleanupCurrentFile(): void {
    const file = this.currentFile;
    this.currentFile = null;
    if (file) {
      try { file.delete(); } catch { /* ignore */ }
    }
  }
}
