import { STATES } from "../config/game.js";

export class StateMachine {
  constructor(initial = STATES.BOOT) {
    this.state = initial;
    this.prev = null;
    this.listeners = new Set();
    this.data = {};
  }

  on(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  set(next, data = {}) {
    if (next === this.state && !data.force) return;
    this.prev = this.state;
    this.state = next;
    this.data = data;
    for (const fn of this.listeners) fn(next, this.prev, data);
  }

  is(...names) {
    return names.includes(this.state);
  }
}
