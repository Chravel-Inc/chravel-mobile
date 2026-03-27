/**
 * Audio configuration constants for the native voice bridge.
 *
 * These mirror the web app's voice/audioContract.ts and voice/liveConstants.ts
 * values so that the native capture/playback aligns with what Vertex AI
 * Live API expects (PCM16 16 kHz in, PCM16 24 kHz out).
 */

/** Microphone capture sample rate — Vertex AI expects 16 kHz input. */
export const INPUT_SAMPLE_RATE = 16000;

/** Server audio playback sample rate — Vertex AI sends 24 kHz output. */
export const OUTPUT_SAMPLE_RATE = 24000;

/** Number of audio channels (mono). */
export const NUM_CHANNELS = 1;

/** Bits per PCM sample. */
export const BITS_PER_SAMPLE = 16;

/** How often (ms) to harvest a recording chunk and send it to the web app. */
export const CAPTURE_INTERVAL_MS = 200;

/** Byte depth for 16-bit PCM. */
export const BYTES_PER_SAMPLE = BITS_PER_SAMPLE / 8;
