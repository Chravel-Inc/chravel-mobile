/**
 * Audio utility helpers — WAV header generation, base64 ↔ binary
 * conversion, and RMS calculation.
 */

import {
  BITS_PER_SAMPLE,
  BYTES_PER_SAMPLE,
  NUM_CHANNELS,
} from "./constants";

// ---------------------------------------------------------------------------
// WAV header
// ---------------------------------------------------------------------------

/**
 * Build a 44-byte canonical WAV (RIFF) header for raw PCM data.
 *
 * The resulting Uint8Array can be prepended to a raw PCM buffer so that
 * expo-av's `Audio.Sound` can load it as a `.wav` file.
 */
export function createWavHeader(
  pcmByteLength: number,
  sampleRate: number,
): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);

  const byteRate = sampleRate * NUM_CHANNELS * BYTES_PER_SAMPLE;
  const blockAlign = NUM_CHANNELS * BYTES_PER_SAMPLE;

  // RIFF chunk descriptor
  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + pcmByteLength, true); // file size - 8
  writeString(view, 8, "WAVE");

  // fmt sub-chunk
  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true); // sub-chunk size (PCM = 16)
  view.setUint16(20, 1, true); // audio format (1 = PCM)
  view.setUint16(22, NUM_CHANNELS, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);

  // data sub-chunk
  writeString(view, 36, "data");
  view.setUint32(40, pcmByteLength, true);

  return new Uint8Array(header);
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ---------------------------------------------------------------------------
// Base64 ↔ binary helpers
// ---------------------------------------------------------------------------

/**
 * Decode a base64 string into a Uint8Array.
 *
 * Uses a lookup-table approach that works in any JS runtime (React Native
 * does not guarantee `atob` on all engines).
 */
export function base64ToUint8Array(b64: string): Uint8Array {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) {
    lookup[chars.charCodeAt(i)] = i;
  }

  // Strip padding
  let len = b64.length;
  if (b64[len - 1] === "=") len--;
  if (b64[len - 1] === "=") len--;

  const byteLength = (len * 3) >> 2;
  const bytes = new Uint8Array(byteLength);

  for (let i = 0, j = 0; i < len; i += 4) {
    const a = lookup[b64.charCodeAt(i)];
    const b = lookup[b64.charCodeAt(i + 1)];
    const c = lookup[b64.charCodeAt(i + 2)];
    const d = lookup[b64.charCodeAt(i + 3)];

    bytes[j++] = (a << 2) | (b >> 4);
    if (j < byteLength) bytes[j++] = ((b & 0xf) << 4) | (c >> 2);
    if (j < byteLength) bytes[j++] = ((c & 0x3) << 6) | d;
  }

  return bytes;
}

/**
 * Encode a Uint8Array to a base64 string.
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let result = "";
  const len = bytes.length;

  for (let i = 0; i < len; i += 3) {
    const a = bytes[i];
    const b = i + 1 < len ? bytes[i + 1] : 0;
    const c = i + 2 < len ? bytes[i + 2] : 0;

    result += chars[a >> 2];
    result += chars[((a & 0x3) << 4) | (b >> 4)];
    result += i + 1 < len ? chars[((b & 0xf) << 2) | (c >> 6)] : "=";
    result += i + 2 < len ? chars[c & 0x3f] : "=";
  }

  return result;
}

// ---------------------------------------------------------------------------
// RMS (Root Mean Square) calculation
// ---------------------------------------------------------------------------

/**
 * Calculate RMS from base64-encoded PCM16 audio data.
 * Returns a normalised value in the range [0, 1].
 */
export function calculateRmsFromPcm16Base64(b64: string): number {
  const bytes = base64ToUint8Array(b64);
  return calculateRmsFromPcm16Bytes(bytes);
}

/**
 * Calculate RMS from raw PCM16 LE bytes.
 */
export function calculateRmsFromPcm16Bytes(bytes: Uint8Array): number {
  const numSamples = Math.floor(bytes.length / 2);
  if (numSamples === 0) return 0;

  let sumSquares = 0;
  for (let i = 0; i < numSamples; i++) {
    // Little-endian signed 16-bit
    const lo = bytes[i * 2];
    const hi = bytes[i * 2 + 1];
    let sample = lo | (hi << 8);
    if (sample >= 0x8000) sample -= 0x10000; // signed
    const normalised = sample / 32768;
    sumSquares += normalised * normalised;
  }

  return Math.sqrt(sumSquares / numSamples);
}

// ---------------------------------------------------------------------------
// Concatenation helper
// ---------------------------------------------------------------------------

/** Concatenate a WAV header and raw PCM body into a single Uint8Array. */
export function concatUint8Arrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.length + b.length);
  result.set(a, 0);
  result.set(b, a.length);
  return result;
}
