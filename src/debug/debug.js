export class DebugOverlay {
  constructor(enabled) {
    this.enabled = enabled;
    this.showGrid = false;
    this.showSol = false;
    this.showFps = true;
    this.fps = 0;
    this.frames = 0;
    this.acc = 0;
  }

  tick(dt) {
    this.frames++;
    this.acc += dt;
    if (this.acc >= 0.5) {
      this.fps = Math.round(this.frames / this.acc);
      this.frames = 0;
      this.acc = 0;
    }
  }

  attach(game) {
    if (!this.enabled) return;
    window.addEventListener("keydown", (e) => {
      if (e.key === "F1") this.showFps = !this.showFps;
      if (e.key === "F2") this.showGrid = !this.showGrid;
      if (e.key === "F3") this.showSol = !this.showSol;
      if (e.key === "F4") game.unlockAll();
      if (e.key === "F5" && game.session) game.completeNow();
      if (e.key === "F6") game.audio.complete();
      if (e.key === "F8" && game.session) {
        const s = game.session.level.solution;
        if (s?.length) game.session.tryMove(s[game.session.moves] || s[0]);
      }
    });
    const box = document.createElement("div");
    box.className = "debug";
    box.id = "dbg";
    document.getElementById("ui").appendChild(box);
    this.box = box;
  }

  draw(game) {
    if (!this.enabled || !this.box) return;
    const s = game.session;
    this.box.textContent = [
      `FPS ${this.fps}`,
      s ? `seed ${s.level.seed}  ${s.level.w}x${s.level.h}` : "",
      s ? `diff ${s.level.difficulty?.band} ${s.level.difficulty?.score}` : "",
      s ? `obj ${s.level.objective}` : "",
      "F2 grid  F3 solution  F4 unlock  F5 complete  F8 step",
    ]
      .filter(Boolean)
      .join("\n");
  }
}
