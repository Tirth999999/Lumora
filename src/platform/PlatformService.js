export class PlatformService {
  constructor() {
    this.ready = false;
    this.env = "none";
    this.sdk = null;
    this.muteFromPlatform = false;
    this.adPlaying = false;
    this.lastMidgame = 0;
  }

  async init() {
    const sdk = window.CrazyGames?.SDK;
    if (!sdk) {
      this.ready = true;
      this.env = "none";
      return;
    }
    try {
      await sdk.init();
      this.sdk = sdk;
      this.env = sdk.environment || "unknown";
      this.ready = true;
      const settings = sdk.game?.settings;
      if (settings?.muteAudio) this.muteFromPlatform = true;
      sdk.game?.addSettingsChangeListener?.((s) => {
        this.muteFromPlatform = !!s.muteAudio;
      });
      const params = new URLSearchParams(location.search);
      if (params.get("muteAudio") === "true") this.muteFromPlatform = true;
    } catch {
      this.ready = true;
      this.env = "none";
      this.sdk = null;
    }
  }

  loadingStart() {
    try {
      this.sdk?.game?.loadingStart?.();
    } catch {}
  }

  loadingStop() {
    try {
      this.sdk?.game?.loadingStop?.();
    } catch {}
  }

  gameplayStart() {
    try {
      this.sdk?.game?.gameplayStart?.();
    } catch {}
  }

  gameplayStop() {
    try {
      this.sdk?.game?.gameplayStop?.();
    } catch {}
  }

  happytime() {
    try {
      this.sdk?.game?.happytime?.();
    } catch {}
  }

  requestMidgame(onStart, onDone) {
    const now = performance.now();
    if (!this.sdk?.ad || now - this.lastMidgame < 180000) {
      onDone?.(false);
      return;
    }
    const finish = (ok) => {
      this.adPlaying = false;
      onDone?.(ok);
    };
    try {
      this.sdk.ad.requestAd("midgame", {
        adStarted: () => {
          this.adPlaying = true;
          this.lastMidgame = performance.now();
          onStart?.();
        },
        adFinished: () => finish(true),
        adError: () => finish(false),
      });
    } catch {
      finish(false);
    }
  }
}
