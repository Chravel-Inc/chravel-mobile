import {
  createWavHeader,
  base64ToUint8Array,
  uint8ArrayToBase64,
  calculateRmsFromPcm16Bytes,
  calculateRmsFromPcm16Base64,
  concatUint8Arrays,
} from "../audio/utils";

describe("createWavHeader", () => {
  it("creates a 44-byte header with correct markers", () => {
    const pcmByteLength = 1000;
    const sampleRate = 16000;
    const header = createWavHeader(pcmByteLength, sampleRate);

    expect(header.length).toBe(44);

    const view = new DataView(header.buffer);

    // RIFF chunk descriptor
    expect(String.fromCharCode(header[0], header[1], header[2], header[3])).toBe("RIFF");
    expect(view.getUint32(4, true)).toBe(36 + pcmByteLength);
    expect(String.fromCharCode(header[8], header[9], header[10], header[11])).toBe("WAVE");

    // fmt sub-chunk
    expect(String.fromCharCode(header[12], header[13], header[14], header[15])).toBe("fmt ");
    expect(view.getUint32(16, true)).toBe(16);
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // NUM_CHANNELS (mono)
    expect(view.getUint32(24, true)).toBe(sampleRate);

    // data sub-chunk
    expect(String.fromCharCode(header[36], header[37], header[38], header[39])).toBe("data");
    expect(view.getUint32(40, true)).toBe(pcmByteLength);
  });

  it("calculates byteRate and blockAlign correctly", () => {
    const pcmByteLength = 0;
    const sampleRate = 44100;
    const header = createWavHeader(pcmByteLength, sampleRate);
    const view = new DataView(header.buffer);

    // NUM_CHANNELS = 1, BYTES_PER_SAMPLE = 2 (16-bit)
    const expectedBlockAlign = 1 * 2;
    const expectedByteRate = sampleRate * expectedBlockAlign;

    expect(view.getUint32(28, true)).toBe(expectedByteRate);
    expect(view.getUint16(32, true)).toBe(expectedBlockAlign);
    expect(view.getUint16(34, true)).toBe(16); // BITS_PER_SAMPLE
  });
});

describe("Base64 Utilities", () => {
  const testCases = [
    { bytes: new Uint8Array([0, 1, 2]), b64: "AAEC" },
    { bytes: new Uint8Array([255, 254, 253]), b64: "/f79" },
    { bytes: new Uint8Array([72, 101, 108, 108, 111]), b64: "SGVsbG8=" },
    { bytes: new Uint8Array([]), b64: "" },
    { bytes: new Uint8Array([1]), b64: "AQ==" },
    { bytes: new Uint8Array([1, 2]), b64: "AQI=" },
  ];

  describe("uint8ArrayToBase64", () => {
    it("correctly encodes Uint8Array to base64", () => {
      testCases.forEach(({ bytes, b64 }) => {
        expect(uint8ArrayToBase64(bytes)).toBe(b64);
      });
    });
  });

  describe("base64ToUint8Array", () => {
    it("correctly decodes base64 to Uint8Array", () => {
      testCases.forEach(({ bytes, b64 }) => {
        expect(base64ToUint8Array(b64)).toEqual(bytes);
      });
    });

    it("handles base64 with different padding correctly", () => {
      // 0 padding characters
      expect(base64ToUint8Array("AAAA")).toEqual(new Uint8Array([0, 0, 0]));
      // 1 padding character
      expect(base64ToUint8Array("AAA=")).toEqual(new Uint8Array([0, 0]));
      // 2 padding characters
      expect(base64ToUint8Array("AA==")).toEqual(new Uint8Array([0]));
    });
  });

  it("performs round-trip conversion correctly", () => {
    const original = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);
    const b64 = uint8ArrayToBase64(original);
    const decoded = base64ToUint8Array(b64);
    expect(decoded).toEqual(original);
  });
});

describe("RMS Calculation", () => {
  describe("calculateRmsFromPcm16Bytes", () => {
    it("returns 0 for empty input", () => {
      expect(calculateRmsFromPcm16Bytes(new Uint8Array([]))).toBe(0);
    });

    it("returns 0 for silence", () => {
      const silence = new Uint8Array([0, 0, 0, 0, 0, 0]);
      expect(calculateRmsFromPcm16Bytes(silence)).toBe(0);
    });

    it("returns approx 1.0 for full-scale square wave", () => {
      // 0x7FFF is max positive value, 0x8000 is max negative
      const fullScale = new Uint8Array([0xff, 0x7f, 0x00, 0x80]);
      const rms = calculateRmsFromPcm16Bytes(fullScale);
      expect(rms).toBeCloseTo(1.0, 1);
    });

    it("correctly handles small non-zero values", () => {
      // Sample value 16384 (0x4000) is 0.5 of max (32768)
      // RMS of a single sample of 0.5 should be 0.5
      const halfScale = new Uint8Array([0x00, 0x40]);
      expect(calculateRmsFromPcm16Bytes(halfScale)).toBeCloseTo(0.5);
    });
  });

  describe("calculateRmsFromPcm16Base64", () => {
    it("correctly calculates RMS from base64 string", () => {
      const bytes = new Uint8Array([0x00, 0x40]); // 0.5 scale
      const b64 = uint8ArrayToBase64(bytes);
      expect(calculateRmsFromPcm16Base64(b64)).toBeCloseTo(0.5);
    });
  });
});

describe("concatUint8Arrays", () => {
  it("concatenates two Uint8Arrays correctly", () => {
    const a = new Uint8Array([1, 2, 3]);
    const b = new Uint8Array([4, 5]);
    const result = concatUint8Arrays(a, b);
    expect(result).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
  });

  it("handles empty arrays", () => {
    const a = new Uint8Array([]);
    const b = new Uint8Array([1, 2]);
    expect(concatUint8Arrays(a, b)).toEqual(new Uint8Array([1, 2]));
    expect(concatUint8Arrays(b, a)).toEqual(new Uint8Array([1, 2]));
  });
});
