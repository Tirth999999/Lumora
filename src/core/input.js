export class Input {
  constructor(target) {
    this.target = target;
    this.queue = [];
    this.swiping = false;
    this.sx = 0;
    this.sy = 0;
    this.locked = false;
    this._onKey = this.onKey.bind(this);
    this._onDown = this.onDown.bind(this);
    this._onMove = this.onMove.bind(this);
    this._onUp = this.onUp.bind(this);
  }

  attach() {
    window.addEventListener("keydown", this._onKey, { passive: false });
    this.target.addEventListener("pointerdown", this._onDown, { passive: false });
    window.addEventListener("pointermove", this._onMove, { passive: false });
    window.addEventListener("pointerup", this._onUp, { passive: false });
    window.addEventListener("pointercancel", this._onUp, { passive: false });
  }

  detach() {
    window.removeEventListener("keydown", this._onKey);
    this.target.removeEventListener("pointerdown", this._onDown);
    window.removeEventListener("pointermove", this._onMove);
    window.removeEventListener("pointerup", this._onUp);
    window.removeEventListener("pointercancel", this._onUp);
  }

  lock(v) {
    this.locked = v;
  }

  consume() {
    return this.queue.shift() || null;
  }

  push(dir) {
    if (this.locked) return;
    if (this.queue.length > 2) this.queue.length = 2;
    this.queue.push(dir);
  }

  onKey(e) {
    if (this.locked) return;
    const map = {
      ArrowUp: "up",
      ArrowDown: "down",
      ArrowLeft: "left",
      ArrowRight: "right",
      w: "up",
      W: "up",
      s: "down",
      S: "down",
      a: "left",
      A: "left",
      d: "right",
      D: "right",
    };
    if (e.key === "Escape") {
      e.preventDefault();
      this.push("pause");
      return;
    }
    const dir = map[e.key];
    if (!dir) return;
    e.preventDefault();
    this.push(dir);
  }

  onDown(e) {
    if (this.locked) return;
    if (e.target && e.target.closest && e.target.closest("[data-ui]")) return;
    this.swiping = true;
    this.sx = e.clientX;
    this.sy = e.clientY;
  }

  onMove(e) {
    if (!this.swiping) return;
    e.preventDefault();
  }

  onUp(e) {
    if (!this.swiping) return;
    this.swiping = false;
    const dx = e.clientX - this.sx;
    const dy = e.clientY - this.sy;
    const mag = Math.hypot(dx, dy);
    if (mag < 24) return;
    if (Math.abs(dx) > Math.abs(dy)) this.push(dx > 0 ? "right" : "left");
    else this.push(dy > 0 ? "down" : "up");
  }
}
