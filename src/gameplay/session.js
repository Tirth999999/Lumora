import { TILE } from "../config/game.js";
import { lerp, easeOutCubic } from "../core/math.js";
import {
  simulateSlide,
  defaultFlags,
  applyVisit,
  applyStop,
  objectiveMet,
  cellAt,
  coverageCount,
  crumbleLeftTiles,
} from "./rules.js";

const DIR = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

export class Session {
  constructor(level) {
    this.level = level;
    this.reset();
  }

  reset() {
    const l = this.level;
    this.flags = defaultFlags(l);
    this.px = l.start.x;
    this.py = l.start.y;
    this.fx = l.start.x;
    this.fy = l.start.y;
    this.moving = false;
    this.path = [];
    this.pathI = 0;
    this.t = 0;
    this.moves = 0;
    this.squash = 1;
    this.stretch = 1;
    this.tilt = 0;
    this.bounce = 0;
    this.anticipate = 0;
    this.dir = "right";
    this.failed = false;
    this.complete = false;
    this.completeT = 0;
    this.celebrating = false;
    this.wakeCells = new Set();
    this.events = [];
    applyVisit(l, this.flags, this.px, this.py);
    applyStop(l, this.flags, this.px, this.py);
    this.wakeCells.add(`${this.px},${this.py}`);
  }

  tryMove(dir) {
    if (this.moving || this.complete || this.failed) return false;
    const slide = simulateSlide(this.level, this.px, this.py, dir, this.flags);
    if (slide.path.length < 2) {
      this.bounce = 1;
      this.squash = 0.78;
      this.stretch = 1.18;
      this.events.push({ type: "blocked" });
      return false;
    }
    this.moving = true;
    this.path = slide.path;
    this.pathI = 0;
    this.t = 0;
    this.dir = dir;
    this.moves++;
    this.anticipate = 1;
    this.events.push({ type: "move", dir });
    return true;
  }

  update(dt) {
    if (this.bounce > 0) this.bounce = Math.max(0, this.bounce - dt * 4);
    if (this.anticipate > 0) this.anticipate = Math.max(0, this.anticipate - dt * 6);
    this.squash = lerp(this.squash, 1, Math.min(1, dt * 10));
    this.stretch = lerp(this.stretch, 1, Math.min(1, dt * 10));
    this.tilt = lerp(this.tilt, 0, Math.min(1, dt * 8));

    if (this.complete) {
      this.completeT += dt;
      return;
    }

    if (!this.moving) return;

    const speed = 11.8;
    this.t += dt * speed;
    while (this.t >= 1 && this.pathI < this.path.length - 1) {
      this.t -= 1;
      this.pathI++;
      const p = this.path[this.pathI];
      this.px = p.x;
      this.py = p.y;
      const key = `${p.x},${p.y}`;
      const fresh = !this.wakeCells.has(key);
      this.wakeCells.add(key);
      applyVisit(this.level, this.flags, p.x, p.y);
      this.events.push({ type: "step", x: p.x, y: p.y, fold: p.fold, fresh });
      const cell = cellAt(this.level, p.x, p.y);
      if (cell.t === TILE.ANCHOR && this.flags.anchors.has(cell.anchorId)) {
        this.events.push({ type: "anchor", id: cell.anchorId });
      }
      if (cell.t === TILE.FOLD && p.fold) this.events.push({ type: "fold" });
      if (this.flags.riftHit && (this.level.riftsFail || this.level.objective === "safe")) {
        this.failed = true;
        this.moving = false;
        this.events.push({ type: "fail" });
        return;
      }
    }
    const a = this.path[this.pathI];
    const b = this.path[Math.min(this.pathI + 1, this.path.length - 1)];
    const u = easeOutCubic(Math.min(1, this.t));
    this.fx = lerp(a.x, b.x, u);
    this.fy = lerp(a.y, b.y, u);
    const d = DIR[this.dir] || DIR.right;
    this.tilt = d.x * 0.22;
    this.stretch = 1.12;
    this.squash = 0.9;

    if (this.pathI >= this.path.length - 1 && this.t >= 1) {
      this.moving = false;
      this.fx = this.px;
      this.fy = this.py;
      this.squash = 0.82;
      this.stretch = 1.16;
      this.bounce = 0.8;
      this.crumblePath(this.path);
      applyStop(this.level, this.flags, this.px, this.py);
      const cell = cellAt(this.level, this.px, this.py);
      if (cell.t === TILE.WELL) this.events.push({ type: "well" });
      this.events.push({ type: "stop" });
      if (objectiveMet(this.level, this.flags)) {
        this.complete = true;
        this.celebrating = true;
        this.completeT = 0;
        this.events.push({ type: "complete" });
      }
    }
  }

  crumblePath(path) {
    crumbleLeftTiles(this.level, this.flags, path);
  }

  drainEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }

  progress() {
    const cov = coverageCount(this.level, this.flags);
    return { cur: cov.cur, max: cov.max, label: "Tiles restored" };
  }
}
