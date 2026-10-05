import { AudioContext, AudioNode, BiquadFilterNode } from "react-native-audio-api";

type NativeAudioFileSourceNode = AudioNode & {
  attach: (options: { loop: boolean; onEnded: () => void }) => { duration: number };
  play: () => void;
  pause: () => void;
  seekToTime: (seconds: number) => void;
  setPlaybackRate: (rate: number) => void;
  dispose: () => void;
};

const { AudioFileSourceNode } = require("react-native-audio-api/lib/commonjs/Audio/AudioFileSourceNode") as {
  AudioFileSourceNode: new (context: AudioContext, node: unknown) => NativeAudioFileSourceNode;
};

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
  private readonly source: NativeAudioFileSourceNode;
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
      // Audio API expects a filesystem path, not Expo's file:// URI.
      source: options.uri.replace(/^file:\/\//, ""),
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
    this.source = new AudioFileSourceNode(this.context, raw);
    this.onTime = options.onTime;
    this.onEnded = options.onEnded;
    this.source.attach({
      loop: false,
      onEnded: () => {
        if (this.disposed) return;
        this.playing = false;
        this.onEnded();
      },
    });

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
    // The package wrapper intentionally bypasses the one-shot start guard,
    // allowing a paused file source to resume from its current position.
    this.source.play();
    this.started = true;
    this.playing = true;
  }

  pause() {
    if (this.disposed || !this.started) return;
    this.source.pause();
    this.playing = false;
  }

  seekTo(seconds: number) {
    if (!this.disposed) this.source.seekToTime(Math.max(0, seconds));
  }

  setPlaybackRate(rate: number) {
    if (!this.disposed) this.source.setPlaybackRate(rate);
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
      this.source.pause();
      this.source.dispose();
      this.source.disconnect();
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
