import { Equalizer } from "@/lib/queue-equalizer";
import { logError, logEvent } from "@/lib/diagnostics";

type Options = {
  uri: string;
  title?: string;
  artist?: string;
  album?: string;
  artworkUri?: string;
  duration?: number;
  levels: number[];
  playbackRate: number;
  onTime: (current: number, duration: number, playing: boolean) => void;
  onEnded: () => void;
};

type QueuePlayerModule = typeof import("react-native-queue-player");
type NativePlayer = ReturnType<QueuePlayerModule["getTrackPlayer"]>;

let queuePlayerModulePromise: Promise<QueuePlayerModule> | null = null;
let nativePlayer: NativePlayer | null = null;

function loadQueuePlayer() {
  return (queuePlayerModulePromise ??= import("react-native-queue-player"));
}

async function player() {
  const module = await loadQueuePlayer();
  return (nativePlayer ??= module.getTrackPlayer());
}

let configurePromise: Promise<void> | null = null;
let generation = 0;

async function configure() {
  if (!configurePromise) {
    configurePromise = player().then((instance) =>
      instance
        .configure({
          audioContentType: "music",
          skipToPreviousBehavior: "restart-or-previous",
          progressUpdateIntervalMs: 500,
        })
        .then(() => undefined),
    );
  }
  return configurePromise;
}

/** Adapter retaining Mintune's existing player contract while delegating playback to queue-player. */
export class EqAudioPlayer {
  private readonly token = ++generation;
  private disposed = false;
  private playing = false;
  private current = 0;
  private total = 0;
  private readonly ready: Promise<void>;
  private readonly disposers: Array<() => void> = [];
  private readonly onTime: Options["onTime"];
  private readonly onEnded: Options["onEnded"];

  constructor(options: Options) {
    this.onTime = options.onTime;
    this.onEnded = options.onEnded;
    void Equalizer.init();
    logEvent("queue_player_constructor", {
      uri: options.uri,
      title: options.title,
      duration: options.duration,
    });
    this.ready = (async () => {
      const instance = await player();
      this.disposers.push(
        instance.onProgress((progress) => {
          if (this.disposed || this.token !== generation) return;
          this.current = progress.position;
          this.total = progress.duration || options.duration || 0;
          this.onTime(this.current, this.total, this.playing);
        }),
        instance.onStateChange((state) => {
          if (this.disposed || this.token !== generation) return;
          this.playing = state === "playing";
          this.onTime(this.current, this.total, this.playing);
        }),
        instance.onQueueEnd(() => {
          if (this.disposed || this.token !== generation) return;
          this.playing = false;
          logEvent("queue_player_ended", {
            uri: options.uri,
            currentTime: this.current,
            duration: this.total,
          });
          this.onEnded();
        }),
        instance.onError((error) => {
          if (this.disposed || this.token !== generation) return;
          logError(error, {
            source: "queue_player_native_error",
            uri: options.uri,
            title: options.title,
          });
        }),
      );
      await configure();
      await instance.setQueue(
        [
          {
            id: options.uri,
            url: options.uri,
            title: options.title,
            artist: options.artist,
            album: options.album,
            duration: options.duration,
            artworkUrl: options.artworkUri,
          },
        ],
        0,
      );
      logEvent("queue_player_ready", { uri: options.uri, title: options.title });
    })().catch((error) => {
      logError(error, {
        source: "queue_player_set_queue",
        uri: options.uri,
        title: options.title,
      });
      throw error;
    });
  }

  async play() {
    if (this.disposed) return;
    await this.ready;
    if (this.disposed) return;
    logEvent("queue_player_play", { currentTime: this.current, duration: this.total });
    (await player()).play();
    this.playing = true;
  }

  pause() {
    if (this.disposed) return;
    void player()
      .then((instance) => instance.pause())
      .then(() => {
        this.playing = false;
      })
      .catch((error) => logError(error, { source: "queue_player_pause" }));
  }

  seekTo(seconds: number) {
    if (!this.disposed) {
      void player()
        .then((instance) => instance.seekTo(Math.max(0, seconds)))
        .catch((error) => logError(error, { source: "queue_player_seek", seconds }));
    }
  }

  setPlaybackRate(rate: number) {
    if (!this.disposed) {
      void player()
        .then((instance) => instance.setPlaybackSpeed(rate))
        .catch((error) => logError(error, { source: "queue_player_speed", rate }));
    }
  }

  async setEqualizer(levels: number[]) {
    if (!this.disposed) await Equalizer.setAllBandGains(levels);
  }

  remove() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.token === generation) generation += 1;
    this.disposers.splice(0).forEach((dispose) => dispose());
  }

  get currentTime() {
    return this.current;
  }
  get duration() {
    return this.total;
  }
  get isPlaying() {
    return this.playing;
  }
}

export { player as getNativePlayer };
