import { GAME, COSMETICS, QUALITY } from "../config/game.js";

const empty = () => ({
  version: 1,
  tutorialDone: false,
  worlds: {},
  completed: {},
  bestMoves: {},
  gleams: 0,
  owned: COSMETICS.filter((c) => c.unlock === "start").map((c) => c.id),
  equipped: {
    body: "nuri-dawn",
    wake: "wake-ribbon",
    mote: "mote-orbs",
    burst: "burst-bloom",
    sky: "sky-still",
  },
  achievements: {},
  daily: { lastDate: null, completed: false, streak: 0 },
  introsSeen: {},
  settings: {
    music: true,
    sfx: true,
    master: 0.85,
    musicVol: 0.35,
    sfxVol: 0.8,
    quality: QUALITY.MEDIUM,
  },
});

export class SaveService {
  constructor() {
    this.data = empty();
    this.available = true;
  }

  load() {
    try {
      const raw = localStorage.getItem(GAME.saveKey);
      if (!raw) return this.data;
      const parsed = JSON.parse(raw);
      this.data = {
        ...empty(),
        ...parsed,
        settings: { ...empty().settings, ...(parsed.settings || {}) },
        equipped: { ...empty().equipped, ...(parsed.equipped || {}) },
        introsSeen: { ...(parsed.introsSeen || {}) },
      };
    } catch {
      this.available = false;
    }
    return this.data;
  }

  persist() {
    if (!this.available) return;
    try {
      localStorage.setItem(GAME.saveKey, JSON.stringify(this.data));
    } catch {
      this.available = false;
    }
  }

  completeLevel(worldId, index, moves, quietHint) {
    const key = `${worldId}:${index}`;
    const first = !this.data.completed[key];
    this.data.completed[key] = true;
    const prev = this.data.bestMoves[key];
    if (prev == null || moves < prev) this.data.bestMoves[key] = moves;
    let reward = first ? 8 + index : 2;
    const efficient = quietHint != null && moves <= quietHint;
    if (efficient) reward += 5;
    this.data.gleams += reward;
    this.persist();
    return { first, reward, efficient };
  }

  unlockWorld(id) {
    this.data.worlds[id] = true;
    this.persist();
  }

  ownCosmetic(id) {
    if (!this.data.owned.includes(id)) this.data.owned.push(id);
    this.persist();
  }

  achieve(id) {
    if (this.data.achievements[id]) return false;
    this.data.achievements[id] = Date.now();
    this.data.gleams += 12;
    this.persist();
    return true;
  }
}
