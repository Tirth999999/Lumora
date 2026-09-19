import { STATES, QUALITY_PRESETS, WORLDS } from "./config/game.js";
import { StateMachine } from "./core/state.js";
import { Input } from "./core/input.js";
import { todayKey } from "./core/math.js";
import { SaveService } from "./save/SaveService.js";
import { PlatformService } from "./platform/PlatformService.js";
import { AnalyticsService } from "./analytics/AnalyticsService.js";
import { AudioService } from "./audio/AudioService.js";
import { Renderer } from "./world/renderer.js";
import { Session } from "./gameplay/session.js";
import { createEffects } from "./effects/particles.js";
import { getLevel, getDailyLevel } from "./levels/catalog.js";
import { UI, UI_CSS } from "./ui/UI.js";
import { syncAchievements, buyOrEquip } from "./progression/progress.js";
import { cosmeticState } from "./player/cosmetics.js";
import { DebugOverlay } from "./debug/debug.js";
import { QUALITY } from "./config/game.js";

export class Game {
  constructor() {
    this.canvas = document.getElementById("world");
    this.uiRoot = document.getElementById("ui");
    this.fsm = new StateMachine(STATES.BOOT);
    this.save = new SaveService();
    this.platform = new PlatformService();
    this.analytics = new AnalyticsService();
    this.audio = new AudioService();
    this.renderer = new Renderer(this.canvas);
    this.input = new Input(this.canvas);
    this.ui = new UI(this.uiRoot, this);
    this.session = null;
    this.effects = null;
    this.selectedWorld = "emberwake";
    this.selectedIndex = 0;
    this.dailyMode = false;
    this.showHint = true;
    this.loadP = 0;
    this.lastReward = null;
    this.completing = false;
    this.failT = 0;
    this.debug = new DebugOverlay(isDebug());
    this.hudPad = { top: 72, bot: 16 };
    this.raf = 0;
    this.last = 0;
  }

  async start() {
    injectCss(UI_CSS);
    this.save.load();
    autoQuality(this.save);
    this.fsm.set(STATES.LOADING);
    this.ui.render();
    this.platform.loadingStart();
    this.loadP = 0.15;
    this.ui.render();
    await this.platform.init();
    this.loadP = 0.55;
    this.audio.applySettings(this.save.data.settings, this.platform.muteFromPlatform);
    this.effects = createEffects(QUALITY_PRESETS[this.save.data.settings.quality] || QUALITY_PRESETS.medium);
    this.input.attach();
    this.debug.attach(this);
    this.renderer.resize();
    window.addEventListener("resize", () => this.renderer.resize());
    window.addEventListener("orientationchange", () => setTimeout(() => this.renderer.resize(), 120));
    const unlock = () => this.audio.unlock().then(() => this.audio.startMusic());
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    this.loadP = 1;
    this.platform.loadingStop();
    this.analytics.track("game_loaded");
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
    this.fsm.set(STATES.INTRO);
    this.ui.render();
    setTimeout(() => this.afterIntro(), 900);
  }

  afterIntro() {
    if (!this.save.data.tutorialDone) {
      this.startLevel("emberwake", 0, { tutorial: true });
    } else {
      this.fsm.set(STATES.MAIN_MENU);
      this.ui.render();
    }
  }

  continuePlay() {
    const save = this.save.data;
    for (const w of WORLDS) {
      for (let i = 0; i < w.levels; i++) {
        if (!save.completed[`${w.id}:${i}`]) {
          this.startLevel(w.id, i);
          return;
        }
      }
    }
    this.startLevel("emberwake", 0);
  }

  openWorld(id) {
    this.selectedWorld = id;
    this.fsm.set(STATES.LEVEL_SELECT);
    this.ui.render();
  }

  openDaily() {
    this.fsm.set(STATES.DAILY_CHALLENGE);
    this.ui.render();
  }

  startDaily() {
    const key = todayKey();
    this.dailyMode = true;
    this.analytics.track("daily_challenge_started", { key });
    const level = getDailyLevel(key);
    this.bootSession(level, { daily: true });
  }

  startLevel(worldId, index, extra = {}) {
    this.dailyMode = false;
    this.selectedWorld = worldId;
    this.selectedIndex = index;
    if (!extra.skipIntro && !this.save.data.introsSeen[worldId]) {
      this.pendingBoot = { worldId, index, extra };
      this.fsm.set(STATES.WORLD_INTRO);
      this.ui.applyTheme(worldId);
      this.ui.render();
      return;
    }
    const level = getLevel(worldId, index);
    this.bootSession(level, extra);
  }

  confirmWorldIntro() {
    const pending = this.pendingBoot;
    if (!pending) return;
    this.save.data.introsSeen[pending.worldId] = true;
    this.save.persist();
    this.pendingBoot = null;
    const level = getLevel(pending.worldId, pending.index);
    this.bootSession(level, pending.extra || {});
  }

  bootSession(level, extra) {
    this.session = new Session(level);
    this.effects.clear();
    this.completing = false;
    this.failT = 0;
    this.input.queue.length = 0;
    this.input.lock(false);
    this.showHint = extra.tutorial || (!this.save.data.tutorialDone && level.index < 3);
    this.ui.applyTheme(level);
    this.fsm.set(STATES.PLAYING);
    this.platform.gameplayStart();
    this.analytics.track("level_started", { world: level.worldId, index: level.index, seed: level.seed });
    this.analytics.track("gameplay_started");
    this.ui.render();
    this.layout();
  }

  layout() {
    if (!this.session) return;
    this.renderer.layoutBoard(this.session.level, this.hudPad.top, this.hudPad.bot);
  }

  pause() {
    if (!this.fsm.is(STATES.PLAYING)) return;
    this.fsm.set(STATES.PAUSED);
    this.platform.gameplayStop();
    this.input.lock(true);
    this.audio.click();
    this.ui.render();
  }

  resume() {
    this.fsm.set(STATES.PLAYING);
    this.platform.gameplayStart();
    this.input.lock(false);
    this.ui.render();
  }

  restart() {
    if (!this.session) return;
    this.analytics.track("level_restarted", { world: this.session.level.worldId, index: this.session.level.index });
    this.session.reset();
    this.effects.clear();
    this.completing = false;
    this.input.lock(false);
    this.fsm.set(STATES.PLAYING);
    this.platform.gameplayStart();
    this.ui.render();
  }

  quitToWorlds() {
    this.platform.gameplayStop();
    this.session = null;
    this.input.lock(false);
    this.fsm.set(STATES.WORLD_SELECT);
    this.ui.render();
  }

  nextLevel() {
    if (this.dailyMode) {
      this.fsm.set(STATES.MAIN_MENU);
      this.session = null;
      this.ui.render();
      return;
    }
    const w = this.selectedWorld;
    const i = this.selectedIndex + 1;
    const world = WORLDS.find((x) => x.id === w);
    if (i < world.levels) this.startLevel(w, i);
    else {
      const idx = WORLDS.findIndex((x) => x.id === w);
      if (WORLDS[idx + 1]) {
        this.save.unlockWorld(WORLDS[idx + 1].id);
        this.startLevel(WORLDS[idx + 1].id, 0);
      } else {
        this.fsm.set(STATES.MAIN_MENU);
        this.session = null;
        this.ui.render();
      }
    }
  }

  setSetting(k, v) {
    this.save.data.settings[k] = v;
    this.save.persist();
    if (k === "quality") this.effects = createEffects(QUALITY_PRESETS[v] || QUALITY_PRESETS.medium);
    this.audio.applySettings(this.save.data.settings, this.platform.muteFromPlatform);
  }

  buyOrEquip(id) {
    this.audio.click();
    const res = buyOrEquip(this.save, id);
    if (!res.ok) this.ui.setToast("Need more Gleams");
    else {
      if (res.bought) {
        this.analytics.track("cosmetic_unlocked", { id });
        this.ui.setToast(`Unlocked ${res.item.name}`);
        syncAchievements(this.save, { onAchieve: (a) => this.ui.setToast(a.name) });
      }
    }
    this.ui.render();
  }

  unlockAll() {
    for (const w of WORLDS) {
      this.save.unlockWorld(w.id);
      for (let i = 0; i < w.levels; i++) this.save.data.completed[`${w.id}:${i}`] = true;
    }
    this.save.data.gleams += 500;
    this.save.persist();
    this.ui.setToast("Debug unlock");
  }

  completeNow() {
    if (!this.session) return;
    const targets = this.session.level.restoreTargets || [];
    for (const id of targets) this.session.wakeCells.add(id);
    this.session.flags.visited = new Set(targets);
    this.session.complete = true;
    this.session.celebrating = true;
    this.onLevelComplete();
  }

  onLevelComplete() {
    if (this.completing) return;
    this.completing = true;
    const s = this.session;
    this.input.lock(true);
    this.platform.gameplayStop();
    this.platform.happytime();
    this.audio.complete();
    const p = this.cellXY(s.fx, s.fy);
    this.effects.burst(p.x, p.y, this.save.data.equipped.burst === "burst-constellation" ? 48 : 28, 70);
    const quiet = s.level.difficulty?.quiet;
    const result = this.save.completeLevel(s.level.worldId === "daily" ? "daily" : s.level.worldId, s.level.index, s.moves, quiet);
    const world = WORLDS.find((w) => w.id === s.level.worldId);
    if (world && s.level.index >= world.levels - 1) {
      const idx = WORLDS.findIndex((w) => w.id === world.id);
      if (WORLDS[idx + 1]) this.save.unlockWorld(WORLDS[idx + 1].id);
    }
    if (this.dailyMode) {
      const key = todayKey();
      const d = this.save.data.daily;
      if (d.lastDate !== key) {
        d.streak = d.lastDate ? d.streak + 1 : 1;
        d.lastDate = key;
      }
      d.completed = true;
      if (!this.save.data.achievements.daily) this.save.achieve("daily");
      this.save.persist();
    }
    if (s.level.worldId === "emberwake" && s.level.index === 0) {
      this.save.data.tutorialDone = true;
      this.save.persist();
      this.analytics.track("tutorial_completed");
    }
    if (result.efficient) this.save.achieve("efficient");
    syncAchievements(this.save, { onAchieve: (a) => this.ui.setToast(a.name) });
    this.lastReward = result;
    this.analytics.track("level_completed", { world: s.level.worldId, index: s.level.index, moves: s.moves });
    setTimeout(() => {
      const after = () => {
        this.fsm.set(STATES.LEVEL_COMPLETE);
        this.audio.reward();
        this.ui.render();
        this.input.lock(false);
      };
      const skipAd = s.level.worldId === "emberwake" && s.level.index < 3;
      if (skipAd) after();
      else {
        this.platform.requestMidgame(
          () => {
            this.audio.applySettings(this.save.data.settings, true);
          },
          () => {
            this.audio.applySettings(this.save.data.settings, this.platform.muteFromPlatform);
            after();
          }
        );
      }
    }, 1100);
  }

  cellXY(x, y) {
    return this.renderer.cellToXY(x, y);
  }

  loop(t) {
    const dt = Math.min(0.033, (t - (this.last || t)) / 1000);
    this.last = t;
    this.debug.tick(dt);
    this.audio.applySettings(this.save.data.settings, this.platform.muteFromPlatform || this.platform.adPlaying);
    if (this.fsm.is(STATES.PLAYING) && this.session && !this.platform.adPlaying) {
      const dir = this.input.consume();
      if (dir === "pause") this.pause();
      else if (dir) this.session.tryMove(dir);
      this.session.update(dt);
      const p = this.cellXY(this.session.fx, this.session.fy);
      if (this.session.moving) this.effects.emitWake(p.x, p.y);
      for (const ev of this.session.drainEvents()) this.handleEvent(ev);
      this.effects.update(dt);
      if (this.session.failed) {
        this.failT += dt;
        if (this.failT > 0.55) this.restart();
      }
    } else if (this.session) {
      this.effects.update(dt);
    }
    this.ui.update(dt);
    this.layout();
    const pal = this.session?.level.palette || this.selectedWorld || "emberwake";
    this.renderer.draw(
      null,
      this.fsm.is(STATES.PLAYING, STATES.PAUSED, STATES.LEVEL_COMPLETE, STATES.WORLD_INTRO) ? this.session : null,
      this.effects,
      cosmeticState(this.save),
      pal
    );
    if (this.debug.enabled && this.session) this.renderer.drawDebug(this.session, this.debug.showGrid, this.debug.showSol);
    this.debug.draw(this);
    if (!this.fsm.is(STATES.PLAYING) || this._uiDirty()) this.ui.render();
    else this.ui.render();
    this.raf = requestAnimationFrame(this.loop);
  }

  _uiDirty() {
    return true;
  }

  menuPreview() {
    return null;
  }

  handleEvent(ev) {
    if (ev.type === "move") this.audio.move();
    if (ev.type === "blocked") this.audio.collide();
    if (ev.type === "stop") this.audio.collide();
    if (ev.type === "step") {
      if (ev.fresh) this.audio.wake();
      else this.audio.pop();
    }
    if (ev.type === "anchor") this.audio.anchor();
    if (ev.type === "well") {
      this.audio.well();
      this.save.achieve("well-tender");
    }
    if (ev.type === "fold") {
      this.audio.pop();
      this.save.achieve("fold-step");
    }
    if (ev.type === "fail") this.audio.fail();
    if (ev.type === "complete") this.onLevelComplete();
    if (ev.type === "anchor" || ev.type === "well") {
      const p = this.cellXY(this.session.px, this.session.py);
      this.effects.burst(p.x, p.y, 12, 28);
    }
  }
}

function injectCss(css) {
  const s = document.createElement("style");
  s.textContent = css;
  document.head.appendChild(s);
}

function isDebug() {
  if (import.meta.env?.PROD) return false;
  return new URLSearchParams(location.search).has("debug");
}

function autoQuality(save) {
  if (save.data.settings.qualityManual) return;
  const mem = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  if (mem <= 2 || cores <= 2) save.data.settings.quality = QUALITY.LOW;
  else if (mem >= 8 && cores >= 6) save.data.settings.quality = QUALITY.HIGH;
}

document.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
  },
  { passive: false }
);

const game = new Game();
game.start();
window.__lumora = game;
