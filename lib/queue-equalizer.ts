export const EQ_BAND_FREQUENCIES_HZ = [60, 230, 910, 3600, 14000] as const;

export function clampGain(value: number) {
  return Math.max(-12, Math.min(12, Number(value) || 0));
}

type QueuePlayerModule = typeof import("react-native-queue-player");
type NativeEqualizer = ReturnType<QueuePlayerModule["getEqualizer"]>;

let modulePromise: Promise<QueuePlayerModule> | null = null;
let eq: NativeEqualizer | null = null;

function loadModule() {
  return (modulePromise ??= import("react-native-queue-player"));
}

async function nativeEqualizer() {
  const module = await loadModule();
  return (eq ??= module.getEqualizer());
}

let initialized: Promise<void> | null = null;

export const Equalizer = {
  init() {
    if (!initialized) {
      initialized = Promise.resolve().then(async () => {
        const instance = await nativeEqualizer();
        await instance.setEnabled(false);
        await instance.reset();
      });
    }
    return initialized;
  },
  async setEnabled(enabled: boolean) {
    await this.init();
    (await nativeEqualizer()).setEnabled(enabled);
  },
  async setBandGain(index: number, gain: number) {
    await this.init();
    (await nativeEqualizer()).setBandGain(index, clampGain(gain));
  },
  async setAllBandGains(gains: number[]) {
    await this.init();
    (await nativeEqualizer()).setAllBandGains(
      gains.slice(0, EQ_BAND_FREQUENCIES_HZ.length).map(clampGain),
    );
  },
  async setPreset(name: string) {
    await this.init();
    (await nativeEqualizer()).applyPreset(name);
  },
  async reset() {
    await this.init();
    (await nativeEqualizer()).reset();
  },
};
