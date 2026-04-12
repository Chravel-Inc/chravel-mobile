import {
  createWavHeader,
  base64ToUint8Array,
  uint8ArrayToBase64,
  calculateRmsFromPcm16Base64,
  calculateRmsFromPcm16Bytes,
  concatUint8Arrays,
} from "../audio/utils";
import {
  NUM_CHANNELS,
  BYTES_PER_SAMPLE,
  BITS_PER_SAMPLE,
} from "../audio/constants";

describe("audio utils", () => {
  describe("createWavHeader", () => {
    it("creates a 44-byte WAV header with correct markers", () => {
      const pcmLength = 1000;
      const sampleRate = 16000;
      const header = createWavHeader(pcmLength, sampleRate);
      const view = new DataView(header.buffer);

      expect(header.length).toBe(44);

      // RIFF marker
      expect(String.fromCharCode(header[0], header[1], header[2], header[3])).toBe("RIFF");
      // File size (36 + pcmLength)
      expect(view.getUint32(4, true)).toBe(36 + pcmLength);
      // WAVE marker
      expect(String.fromCharCode(header[8], header[9], header[10], header[11])).toBe("WAVE");
      // fmt marker
      expect(String.fromCharCode(header[12], header[13], header[14], header[15])).toBe("fmt ");
      // fmt chunk size (16 for PCM)
      expect(view.getUint32(16, true)).toBe(16);
      // Audio format (1 for PCM)
      expect(view.getUint16(20, true)).toBe(1);
      // Channels
      expect(view.getUint16(22, true)).toBe(NUM_CHANNELS);
      // Sample rate
      expect(view.getUint32(24, true)).toBe(sampleRate);
      // Byte rate
      expect(view.getUint32(28, true)).toBe(sampleRate * NUM_CHANNELS * BYTES_PER_SAMPLE);
      // Block align
      expect(view.getUint16(32, true)).toBe(NUM_CHANNELS * BYTES_PER_SAMPLE);
      // Bits per sample
      expect(view.getUint16(34, true)).toBe(BITS_PER_SAMPLE);
      // data marker
      expect(String.fromCharCode(header[36], header[37], header[38], header[39])).toBe("data");
      // data chunk size
      expect(view.getUint32(40, true)).toBe(pcmLength);
    });
  });

  describe("base64ToUint8Array and uint8ArrayToBase64", () => {
    it("round-trips empty data", () => {
      const original = new Uint8Array(0);
      const b64 = uint8ArrayToBase64(original);
      expect(b64).toBe("");
      const decoded = base64ToUint8Array(b64);
      expect(decoded).toEqual(original);
    });

    it("round-trips short data without padding", () => {
      const original = new Uint8Array([72, 101, 108]); // "Hel"
      const b64 = uint8ArrayToBase64(original);
      expect(b64).toBe("SGVs");
      const decoded = base64ToUint8Array(b64);
      expect(decoded).toEqual(original);
    });

    it("round-trips data with 1 byte padding", () => {
      const original = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const b64 = uint8ArrayToBase64(original);
      expect(b64).toBe("SGVsbG8=");
      const decoded = base64ToUint8Array(b64);
      expect(decoded).toEqual(original);
    });

    it("round-trips data with 2 bytes padding", () => {
      const original = new Uint8Array([72, 101, 108, 108]); // "Hell"
      const b64 = uint8ArrayToBase64(original);
      expect(b64).toBe("SGVsbA==");
      const decoded = base64ToUint8Array(b64);
      expect(decoded).toEqual(original);
    });

    it("handles arbitrary binary data", () => {
      const original = new Uint8Array([0, 255, 127, 128, 64]);
      const b64 = uint8ArrayToBase64(original);
      const decoded = base64ToUint8Array(b64);
      expect(decoded).toEqual(original);
    });
  });

  describe("calculateRmsFromPcm16Bytes", () => {
    it("returns 0 for empty data", () => {
      expect(calculateRmsFromPcm16Bytes(new Uint8Array(0))).toBe(0);
    });

    it("returns 0 for silence", () => {
      const silence = new Uint8Array(100).fill(0);
      expect(calculateRmsFromPcm16Bytes(silence)).toBe(0);
    });

    it("calculates RMS correctly for a known sample (maximum value)", () => {
      // 0x7FFF is 32767. normalised it is 32767/32768 approx 0.99997
      const samples = new Uint8Array([0xFF, 0x7F, 0xFF, 0x7F]);
      const rms = calculateRmsFromPcm16Bytes(samples);
      expect(rms).toBeCloseTo(32767 / 32768, 5);
    });

    it("calculates RMS correctly for a known sample (minimum value)", () => {
      // 0x8000 is -32768. normalised it is -32768/32768 = -1.0
      // Square is 1.0. RMS should be 1.0.
      const samples = new Uint8Array([0x00, 0x80, 0x00, 0x80]);
      const rms = calculateRmsFromPcm16Bytes(samples);
      expect(rms).toBe(1.0);
    });

    it("handles odd number of bytes by ignoring the last byte", () => {
       const samples = new Uint8Array([0x00, 0x80, 0xFF]); // 1.5 samples
       expect(calculateRmsFromPcm16Bytes(samples)).toBe(1.0);
    });
  });

  describe("calculateRmsFromPcm16Base64", () => {
    it("calculates RMS from base64 string", () => {
      const b64 = uint8ArrayToBase64(new Uint8Array([0x00, 0x80]));
      expect(calculateRmsFromPcm16Base64(b64)).toBe(1.0);
    });
  });

  describe("concatUint8Arrays", () => {
    it("concatenates two arrays", () => {
      const a = new Uint8Array([1, 2]);
      const b = new Uint8Array([3, 4, 5]);
      const result = concatUint8Arrays(a, b);
      expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    });

    it("handles empty first array", () => {
      const a = new Uint8Array(0);
      const b = new Uint8Array([1, 2]);
      expect(concatUint8Arrays(a, b)).toEqual(new Uint8Array([1, 2]));
    });

    it("handles empty second array", () => {
      const a = new Uint8Array([1, 2]);
      const b = new Uint8Array(0);
      expect(concatUint8Arrays(a, b)).toEqual(new Uint8Array([1, 2]));
    });
  });
});
