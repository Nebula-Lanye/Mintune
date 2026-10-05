import { AudioContext, AudioNode, BiquadFilterNode } from "react-native-audio-api";

type NativeFileSource = {
  start: (when?: number) => void;
  pause: () => void;
  seekToTime: (seconds: number) => void;
  disconnect?: () => void;
  remove?: () => void;
  currentTime: number;
  duration: number;
  playbackRate: number;
  routedThroughMediaElement?: boolean;
};

type Options = {
  uri: string;
  levels: number[];
  playbackRate: number;
  onTime: (current: number, duration: number, playing: boolean) => void;
  onEnded: () => void;
};

const FREQUENCIES = [60, 230, 910, 3600, 14000];

/** A single native Web-Audio graph with a five-band EQ and restartable file source. */
export class EqAudioPlayer {
  private readonly context: AudioContext;
  private readonly raw: NativeFileSource;
  private readonly source: AudioNode;
  private readonly filters: BiquadFilterNode[];
  private readonly timer: ReturnType<typeof setInterval>;
  private disposed = false;
  private playing = false;
  private started = false;
  private readonly onTime: Options["onTime"];
  private readonly onEnded: Options["onEnded"];

  constructor(options: Options) {
    this.context = new AudioContext();
    const raw = this.context.context.createFileSource({
      source: options.uri,
      playbackRate: options.playbackRate,
      preservesPitch: true,
      loop: false,
      volume: 1,
    });
    if (!raw) {
      void this.context.close();
      throw new Error("当前原生音频模块不支持此音频格式。");
    }

    this.raw = raw as NativeFileSource;
    this.source = new AudioNode(this.context, raw as never);
    this.onTime = options.onTime;
    this.onEnded = options.onEnded;

    this.filters = FREQUENCIES.map((frequency, index) => {
      const filter = this.context.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.value = frequency;
      filter.Q.value = 1;
      filter.gain.value = options.levels[index] ?? 0;
      return filter;
    });

    let node: AudioNode = this.source;
    this.filters.forEach((filter) => {
      node = node.connect(filter);
    });
    node.connect(this.context.destination);

    this.timer = setInterval(() => {
      if (this.disposed) return;
      const duration = this.raw.duration || 0;
      const current = this.raw.currentTime;
      this.onTime(current, duration, this.playing);
      if (this.playing && duration > 0 && current >= duration - 0.15) {
        this.playing = false;
        this.onEnded();
      }
    }, 150);
  }

  async play() {
    if (this.disposed) return;
    if (this.context.state === "suspended") await this.context.resume();
    if (this.disposed) return;
    // The source is already connected through the EQ chain in the constructor.
    this.raw.start(this.context.currentTime);
    this.started = true;
    this.playing = true;
  }

  pause() {
    if (this.disposed || !this.started) return;
    this.raw.pause();
    this.playing = false;
  }

  seekTo(seconds: number) {
    if (!this.disposed) this.raw.seekToTime(Math.max(0, seconds));
  }

  setPlaybackRate(rate: number) {
    if (!this.disposed) this.raw.playbackRate = rate;
  }

  setEqualizer(levels: number[]) {
    if (this.disposed) return;
    this.filters.forEach((filter, index) => {
      filter.gain.value = Math.max(-4, Math.min(4, levels[index] ?? 0));
    });
  }

  remove() {
    if (this.disposed) return;
    this.disposed = true;
    this.playing = false;
    clearInterval(this.timer);
    try {
      this.raw.pause();
      this.source.disconnect();
      this.raw.remove?.();
    } catch {
      // Best effort during app shutdown.
    }
    void this.context.close();
  }

  get currentTime() {
    return this.raw.currentTime;
  }

  get duration() {
    return this.raw.duration;
  }

  get isPlaying() {
    return this.playing;
  }
}
