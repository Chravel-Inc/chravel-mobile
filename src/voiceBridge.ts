/**
 * Voice bridge orchestrator.
 *
 * Wires up AudioCaptureManager and AudioPlaybackManager to the
 * WebView ↔ Native bridge protocol. Each incoming bridge message of
 * type `voice:*` is dispatched here; results are sent back to the
 * WebView as `chravel:voice-*` custom events.
 */

import { createCaptureManager, type AudioChunk } from "./audio/capture";
import { AudioPlaybackManager } from "./audio/playback";
import { OUTPUT_SAMPLE_RATE } from "./audio/constants";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Function the WebView host provides to inject a JS event into the page. */
export type SendEventFn = (eventName: string, detail: Record<string, unknown>) => void;

/** Discriminated union of voice-related bridge messages from the web app. */
export type VoiceBridgeMessage =
  | { type: "voice:request-permission" }
  | { type: "voice:start-capture" }
  | { type: "voice:stop-capture" }
  | { type: "voice:play-audio"; audio: string; sampleRate?: number }
  | { type: "voice:flush-playback" };

// ---------------------------------------------------------------------------
// VoiceBridge
// ---------------------------------------------------------------------------

export class VoiceBridge {
  private capture = createCaptureManager();
  private playback = new AudioPlaybackManager();
  private sendEvent: SendEventFn | null = null;

  /**
   * Bind the bridge to a `sendEvent` function that injects JS events
   * into the WebView. Must be called before handling messages.
   */
  attach(sendEvent: SendEventFn): void {
    if (this.sendEvent) return; // Already attached — avoid re-wiring callbacks.
    this.sendEvent = sendEvent;

    // Wire playback callbacks.
    this.playback.onRms = (rms) => {
      this.sendEvent?.("chravel:voice-playback-rms", { rms });
    };

    this.playback.onQueueDrained = () => {
      this.sendEvent?.("chravel:voice-playback-complete", {});
    };
  }

  /**
   * Handle an incoming voice bridge message.
   */
  async handle(message: VoiceBridgeMessage): Promise<void> {
    switch (message.type) {
      case "voice:request-permission":
        await this.handleRequestPermission();
        break;

      case "voice:start-capture":
        await this.handleStartCapture();
        break;

      case "voice:stop-capture":
        await this.handleStopCapture();
        break;

      case "voice:play-audio":
        await this.handlePlayAudio(message.audio, message.sampleRate);
        break;

      case "voice:flush-playback":
        await this.handleFlushPlayback();
        break;
    }
  }

  /**
   * Tear down all resources. Call when the component unmounts.
   */
  async dispose(): Promise<void> {
    await this.capture.stop();
    await this.playback.dispose();
    this.sendEvent = null;
  }

  // ── Handlers ────────────────────────────────────────────────

  private async handleRequestPermission(): Promise<void> {
    try {
      const result = await this.capture.requestPermission();
      this.sendEvent?.("chravel:voice-permission", {
        granted: result.granted,
        canAskAgain: result.canAskAgain,
      });
    } catch (err) {
      this.sendError("Failed to request microphone permission", "PERMISSION_ERROR");
    }
  }

  private async handleStartCapture(): Promise<void> {
    try {
      await this.capture.start((chunk: AudioChunk) => {
        this.sendEvent?.("chravel:voice-audio-data", {
          audio: chunk.audio,
          rms: chunk.rms,
          timestamp: chunk.timestamp,
        });
      });
      this.sendEvent?.("chravel:voice-capture-started", {});
    } catch (err) {
      this.sendError("Failed to start audio capture", "CAPTURE_ERROR");
    }
  }

  private async handleStopCapture(): Promise<void> {
    try {
      await this.capture.stop();
      this.sendEvent?.("chravel:voice-capture-stopped", {});
    } catch (err) {
      this.sendError("Failed to stop audio capture", "CAPTURE_ERROR");
    }
  }

  private async handlePlayAudio(
    audio: string,
    sampleRate?: number,
  ): Promise<void> {
    try {
      await this.playback.enqueue(audio, sampleRate ?? OUTPUT_SAMPLE_RATE);
    } catch (err) {
      this.sendError("Failed to play audio", "PLAYBACK_ERROR");
    }
  }

  private async handleFlushPlayback(): Promise<void> {
    try {
      await this.playback.flush();
      this.sendEvent?.("chravel:voice-playback-flushed", {});
    } catch (err) {
      this.sendError("Failed to flush playback", "PLAYBACK_ERROR");
    }
  }

  // ── Helpers ─────────────────────────────────────────────────

  private sendError(error: string, code: string): void {
    console.error(`[VoiceBridge] ${code}: ${error}`);
    this.sendEvent?.("chravel:voice-error", { error, code });
  }
}
