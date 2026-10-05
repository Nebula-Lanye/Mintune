import { getTrackPlayer } from "react-native-queue-player";
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

type NativePlayer = ReturnType<typeof getTrackPlayer>;
let nativePlayer: NativePlayer | null = null;
function player() { return nativePlayer ??= getTrackPlayer(); }
let configurePromise: Promise<void> | null = null;
let generation = 0;

function configure() {
  if (!configurePromise) {
    configurePromise = player().configure({
      audioContentType: "music",
      skipToPreviousBehavior: "restart-or-previous",
      progressUpdateIntervalMs: 500,
    });
  }
  return configurePromise;
}

/** Adapter retaining Mintune's existing player contract while delegating all native playback to queue-player. */
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
    logEvent("queue_player_constructor", { uri: options.uri, title: options.title, duration: options.duration });
    this.disposers.push(
      player().onProgress((progress) => {
        if (this.disposed || this.token !== generation) return;
        this.current = progress.position;
        this.total = progress.duration || options.duration || 0;
        this.onTime(this.current, this.total, this.playing);
      }),
      player().onStateChange((state) => {
        if (this.disposed || this.token !== generation) return;
        this.playing = state === "playing";
        this.onTime(this.current, this.total, this.playing);
      }),
      player().onQueueEnd(() => {
        if (this.disposed || this.token !== generation) return;
        this.playing = false;
        logEvent("queue_player_ended", { uri: options.uri, currentTime: this.current, duration: this.total });
        this.onEnded();
      }),
      player().onError((error) => {
        if (this.disposed || this.token !== generation) return;
        logError(error, { source: "queue_player_native_error", uri: options.uri, title: options.title });
      }),
    );
    this.ready = configure()
      .then(() => player().setQueue([{
        id: options.uri,
        url: options.uri,
        title: options.title,
        artist: options.artist,
        album: options.album,
        duration: options.duration,
        artworkUrl: options.artworkUri,
      }], 0))
      .then(() => { logEvent("queue_player_ready", { uri: options.uri, title: options.title }); })
      .catch((error) => { logError(error, { source: "queue_player_set_queue", uri: options.uri, title: options.title }); throw error; });
  }

  async play() {
    if (this.disposed) return;
    await this.ready;
    if (this.disposed) return;
    logEvent("queue_player_play", { currentTime: this.current, duration: this.total });
    await player().play();
    this.playing = true;
  }

  pause() {
    if (this.disposed) return;
    void player().pause().then(() => { this.playing = false; }).catch((error) => logError(error, { source: "queue_player_pause" }));
  }

  seekTo(seconds: number) {
    if (!this.disposed) void player().seekTo(Math.max(0, seconds)).catch((error) => logError(error, { source: "queue_player_seek", seconds }));
  }

  setPlaybackRate(rate: number) {
    if (!this.disposed) void player().setPlaybackSpeed(rate).catch((error) => logError(error, { source: "queue_player_speed", rate }));
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

  get currentTime() { return this.current; }
  get duration() { return this.total; }
  get isPlaying() { return this.playing; }
}

export { player as getNativePlayer };
