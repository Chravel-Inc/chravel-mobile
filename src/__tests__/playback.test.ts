import { AudioPlaybackManager } from "../audio/playback";

const listenersByPlayer = new Map<
  object,
  (status: {
    isLoaded: boolean;
    didJustFinish: boolean;
    playing: boolean;
  }) => void
>();

const mockCreateAudioPlayer = jest.fn();

jest.mock("expo-audio", () => ({
  createAudioPlayer: (opts: { uri: string }) => mockCreateAudioPlayer(opts),
}));

jest.mock("expo-file-system", () => {
  class MockFile {
    uri: string;
    constructor(_dir: unknown, name: string) {
      this.uri = `file:///cache/${name}`;
    }
    write(_data: string, _opts: { encoding: string }): void {}
    delete(): void {}
  }
  return {
    Paths: { cache: "cache" },
    File: MockFile,
  };
});

describe("AudioPlaybackManager", () => {
  beforeEach(() => {
    listenersByPlayer.clear();
    mockCreateAudioPlayer.mockClear();
    mockCreateAudioPlayer.mockImplementation(() => {
      const player = {
        play: jest.fn(),
        remove: jest.fn(),
        addListener: jest.fn(
          (
            _event: string,
            cb: (status: {
              isLoaded: boolean;
              didJustFinish: boolean;
              playing: boolean;
            }) => void,
          ) => {
            listenersByPlayer.set(player, cb);
            return { remove: jest.fn() };
          },
        ),
      };
      return player;
    });
  });

  it("does not advance queue or fire drained after flush when a stale finish event arrives", async () => {
    const mgr = new AudioPlaybackManager();
    const onDrained = jest.fn();
    mgr.onQueueDrained = onDrained;

    const pcm = Buffer.alloc(4).toString("base64");
    await mgr.enqueue(pcm);

    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(1);
    const players = [...listenersByPlayer.keys()];
    expect(players).toHaveLength(1);
    const staleListener = listenersByPlayer.get(players[0])!;

    await mgr.flush();

    // Simulate the old player's finish firing after barge-in (queue already empty).
    staleListener({
      isLoaded: true,
      didJustFinish: true,
      playing: false,
    });

    await Promise.resolve();
    expect(onDrained).not.toHaveBeenCalled();
  });

  it("does not treat pre-flush finish as end of post-flush chunk", async () => {
    const mgr = new AudioPlaybackManager();
    const onDrained = jest.fn();
    mgr.onQueueDrained = onDrained;

    const pcm = Buffer.alloc(4).toString("base64");
    await mgr.enqueue(pcm);

    const [player1] = [...listenersByPlayer.keys()];
    const listener1 = listenersByPlayer.get(player1)!;

    await mgr.flush();
    await mgr.enqueue(pcm);

    expect(mockCreateAudioPlayer).toHaveBeenCalledTimes(2);
    const players = [...listenersByPlayer.keys()];
    const listener2 = listenersByPlayer.get(players[1])!;

    listener1({
      isLoaded: true,
      didJustFinish: true,
      playing: false,
    });
    await Promise.resolve();
    expect(onDrained).not.toHaveBeenCalled();

    listener2({
      isLoaded: true,
      didJustFinish: true,
      playing: false,
    });
    await Promise.resolve();
    expect(onDrained).toHaveBeenCalledTimes(1);
  });
});
