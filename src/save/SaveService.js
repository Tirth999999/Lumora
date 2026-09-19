import { GAME, COSMETICS, QUALITY } from "../config/game.js";

const empty = () => ({
  version: 1,
  tutorialDone: false,
  worlds: {},
  completed: {},
  bestMoves: {},
  stars: {},
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
    speed: 1.0,
    hints: true,
  },
});

export class SaveService {
  constructor() {
    this.data = empty();
    this.available = true;
  }

  reset() {
    this.data = empty();
    try {
      localStorage.removeItem(GAME.saveKey);
    } catch {}
    this.persist();
    return this.data;
  }

  load() {
    try {
      const raw = localStorage.getItem(GAME.saveKey);
      if (!raw) return this.data;
      const parsed = JSON.parse(raw);
      this.data = {
        ...empty(),
        ...parsed,
        stars: { ...(parsed.stars || {}) },
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

  completeLevel(worldId, index, moves, quietHint, starsEarned = 1) {
    const key = `${worldId}:${index}`;
    const first = !this.data.completed[key];
    this.data.completed[key] = true;
    const prev = this.data.bestMoves[key];
    if (prev == null || moves < prev) this.data.bestMoves[key] = moves;
    
    // Star awarding logic: never downgrade earned stars
    const prevStars = this.data.stars[key] || 0;
    const stars = Math.max(prevStars, Math.min(3, Math.max(1, starsEarned)));
    this.data.stars[key] = stars;
    const newStarsGained = Math.max(0, stars - prevStars);

    let reward = first ? 8 + index : 2;
    const efficient = quietHint != null && moves <= quietHint;
    if (efficient) reward += 5;
    // Extra gleams for stars earned (3 gleams per newly earned star)
    reward += newStarsGained * 3;

    this.data.gleams += reward;
    this.persist();
    return { first, reward, efficient, stars, newStarsGained };
  }

  getStars(worldId, index) {
    return this.data.stars[`${worldId}:${index}`] || 0;
  }

  totalStars() {
    return Object.values(this.data.stars).reduce((acc, v) => acc + (v || 0), 0);
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
