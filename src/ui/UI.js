import { STATES, WORLDS, COSMETICS, COSMETIC_TYPE, ACHIEVEMENTS, WORLD_INTROS } from "../config/game.js";
import { worldProgress } from "../levels/catalog.js";
import { getPalette } from "../config/palette.js";

const LOCK_THEME = new Set([
  STATES.PLAYING,
  STATES.PAUSED,
  STATES.LEVEL_COMPLETE,
  STATES.REWARD,
  STATES.WORLD_INTRO,
  STATES.LEVEL_SELECT,
]);

export class UI {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.toastT = 0;
    this.toast = "";
    this.pendingBuy = null;
    this.colCategory = "all";
    this.colPreview = null;
    this.showResetConfirm = false;
  }

  setToast(msg) {
    this.toast = msg;
    this.toastT = 2.4;
  }

  applyPalette(pal) {
    if (!pal) return;
    const root = document.documentElement;
    root.style.setProperty("--accent", pal.accent);
    root.style.setProperty("--accent-deep", pal.accentDeep);
    root.style.setProperty("--ink", pal.ink || "#fff4ea");
    root.style.setProperty("--rim", pal.rim || pal.accent);
    root.style.setProperty("--floor-lit", pal.floorLit || pal.accent);
    root.style.setProperty("--sky", pal.skyBot);
    root.style.setProperty("--sky-top", pal.skyTop || pal.skyBot);
    if (document.body) document.body.style.background = pal.skyBot;
  }

  applyTheme(levelOrWorld) {
    const pal = levelOrWorld?.paletteResolved
      ? levelOrWorld.paletteResolved
      : getPalette(
        typeof levelOrWorld === "string"
          ? { palette: levelOrWorld, index: 0, seed: 1 }
          : levelOrWorld || { palette: "emberwake", index: 0, seed: 1 }
      );
    this.applyPalette(pal);
  }

  update(dt) {
    if (this.toastT > 0) this.toastT -= dt;
    const st = this.game.fsm.state;
    if (!LOCK_THEME.has(st) && this.game.menuPal) this.applyPalette(this.game.menuPal);
  }

  render() {
    const g = this.game;
    const st = g.fsm.state;
    const p = g.session?.progress();
    const save = g.save?.data;

    // Comprehensive cache key including currency, equipped items, owned count, and active category
    const key = `${st}:${g.uiTick || 0}:${g.session?.complete}:${g.session?.failed}:${g.session?.moves}:${p?.cur}:${this.pendingBuy || ""}:${this.colCategory || "all"}:${this.colPreview || ""}:${save?.gleams || 0}:${JSON.stringify(save?.equipped || {})}:${save?.owned?.length || 0}:${this.showResetConfirm ? 1 : 0}`;

    if (key === this._key) {
      if (st === STATES.PLAYING) this.updateHud();
      this.drawToast();
      return;
    }
    this._key = key;

    if (st === STATES.LOADING || st === STATES.BOOT) this.loading();
    else if (st === STATES.INTRO) this.intro();
    else if (st === STATES.MAIN_MENU) this.menu();
    else if (st === STATES.WORLD_SELECT) this.worlds();
    else if (st === STATES.LEVEL_SELECT) this.levels();
    else if (st === STATES.WORLD_INTRO) this.worldIntro();
    else if (st === STATES.PLAYING) this.hud();
    else if (st === STATES.PAUSED) this.pause();
    else if (st === STATES.LEVEL_COMPLETE || st === STATES.REWARD) this.complete();
    else if (st === STATES.SETTINGS) this.settings();
    else if (st === STATES.COLLECTION) this.collection();
    else if (st === STATES.DAILY_CHALLENGE) this.daily();
    else if (st === STATES.ACHIEVEMENTS) this.achievements();
    this.drawToast();
  }

  drawToast() {
    let el = this.root.querySelector(".toast");
    if (this.toastT > 0 && this.toast) {
      if (!el) {
        el = document.createElement("div");
        el.className = "toast";
        el.dataset.ui = "1";
        this.root.appendChild(el);
      }
      el.textContent = this.toast;
      el.style.opacity = String(Math.min(1, this.toastT));
    } else if (el) el.remove();
  }

  loading() {
    this.applyTheme("emberwake");
    this.root.innerHTML = `<div class="screen center" data-ui="1">
      ${lumoraBrandEmblem()}
      <h1 class="logo">Lumora</h1>
      <p class="muted">Awakening the ancient platforms…</p>
      <div class="bar"><i style="width:${Math.round((this.game.loadP || 0) * 100)}%"></i></div>
    </div>`;
  }

  intro() {
    this.applyTheme("emberwake");
    this.root.innerHTML = `<div class="screen center" data-ui="1">
      ${lumoraBrandEmblem()}
      <h1 class="logo">Lumora</h1>
      <p class="lede">Guide your radiant spirit across sleeping platforms.<br/>Awaken every tile with your luminous wake.</p>
    </div>`;
  }

  menu() {
    const save = this.game.save.data;
    const totalStars = this.game.save.totalStars();
    const totalPossibleStars = WORLDS.reduce((acc, w) => acc + w.levels * 3, 0);

    this.root.innerHTML = `<div class="screen menu scroll-screen" data-ui="1">
      <div class="brand">
        ${lumoraBrandEmblem()}
        <h1 class="logo">Lumora</h1>
        <p class="lede">Awaken the ancient lattices with radiant light.</p>
      </div>
      <div class="stack">
        <button class="btn primary" id="play">Continue Journey</button>
        <button class="btn" id="worlds">World Atlas</button>
        <button class="btn" id="daily">Dayweave Challenge</button>
        <div class="row">
          <button class="btn ghost" id="col">Store & Skins</button>
          <button class="btn ghost" id="set">Settings</button>
        </div>
        <button class="btn ghost" id="ach">Achievements</button>
      </div>
      <div class="menu-footer">
        <span class="star-chip">${starSvg(true, 15)}<b>${totalStars}</b>/${totalPossibleStars}</span>
        ${gleamChip(save.gleams)}
      </div>
    </div>`;
    this.bind({
      play: () => this.game.continuePlay(),
      worlds: () => this.game.fsm.set(STATES.WORLD_SELECT),
      daily: () => this.game.openDaily(),
      col: () => this.game.fsm.set(STATES.COLLECTION),
      set: () => this.game.fsm.set(STATES.SETTINGS),
      ach: () => this.game.fsm.set(STATES.ACHIEVEMENTS),
    });
  }

  worlds() {
    const save = this.game.save.data;
    const totalStarsEarned = this.game.save.totalStars();
    const totalPossibleStars = WORLDS.reduce((acc, w) => acc + w.levels * 3, 0);

    const cards = WORLDS.map((w, i) => {
      const unlocked = i === 0 || save.worlds[w.id] || worldProgress(save.completed, WORLDS[i - 1].id) >= WORLDS[i - 1].levels;
      const done = worldProgress(save.completed, w.id);
      const pct = Math.round((done / w.levels) * 100);
      const isComplete = done >= w.levels;

      let worldStars = 0;
      for (let lv = 0; lv < w.levels; lv++) {
        worldStars += save.stars?.[`${w.id}:${lv}`] || 0;
      }

      return `<button class="card world-card ${unlocked ? "" : "locked"} ${isComplete ? "completed" : ""}" data-world="${w.id}" ${unlocked ? "" : "disabled"}>
        <div class="world-poster" aria-hidden="true">${worldPoster(w)}</div>
        <div class="world-meta">
          <div class="world-title-row">
            <div class="world-name-group">
              <span class="world-sector">SECTOR ${String(i + 1).padStart(2, "0")}</span>
              <strong>${w.name}</strong>
            </div>
            <div class="world-badges-group">
              ${unlocked ? `<span class="world-star-badge">${starSvg(true, 13)}<b>${worldStars}</b>/${w.levels * 3}</span>` : ""}
              <span class="world-count-badge ${isComplete ? "complete" : unlocked ? "active" : "locked"}">${unlocked ? (isComplete ? "✓ Restored" : `${done}/${w.levels}`) : "Locked"}</span>
            </div>
          </div>
          <p class="world-tagline">${w.tagline}</p>
          ${unlocked ?
          `<div class="world-progress-track"><i class="world-fill" style="width:${pct}%;background:${w.hue}"></i></div>` :
          `<span class="sleeping">Locked Sector</span>`
        }
        </div>
      </button>`;
    }).join("");

    this.root.innerHTML = `<div class="screen scroll-screen" data-ui="1">
      <div class="topbar">
        ${backBtnHtml("back")}
        <h2>World Atlas</h2>
        <div class="topbar-right">
          <span class="star-chip">${starSvg(true, 15)}<b>${totalStarsEarned}</b>/${totalPossibleStars}</span>
          ${gleamChip(save.gleams)}
        </div>
      </div>
      <p class="lede slim">Select an atmospheric realm to awaken its sleeping lattices.</p>
      <div class="cards world-grid">${cards}</div>
    </div>`;

    this.root.querySelector("#back").onclick = () => this.game.fsm.set(STATES.MAIN_MENU);
    this.root.querySelectorAll("[data-world]").forEach((el) => {
      el.onclick = () => this.game.openWorld(el.dataset.world);
    });
  }

  worldIntro() {
    const id = this.game.selectedWorld;
    const world = WORLDS.find((w) => w.id === id);
    const brief = WORLD_INTROS[id] || WORLD_INTROS.emberwake;
    const focus = world?.intro || "restore";
    this.applyTheme(id);
    this.root.innerHTML = `<div class="screen dim intro-overlay" data-ui="1">
      <div class="panel intro-panel">
        <p class="eyebrow">${world?.name || "Lattice"}</p>
        <div class="intro-stage art-${brief.art}">${introArt(brief.art)}</div>
        <div class="intro-legend">
          <div class="mini-badge"><span class="mini-mark" data-mode="${focus}"></span></div>
          <div>
            <strong>${brief.title}</strong>
            <span>${brief.line}</span>
          </div>
        </div>
        <div class="intro-focus-grid">
          <div class="focus-chip"><b>How It Works</b><span>${getMechanicGuide(brief.art)}</span></div>
          <div class="focus-chip"><b>Objective</b><span>Restore every tile to awaken sector.</span></div>
        </div>
        <button class="btn primary" id="go">Enter World</button>
      </div>
    </div>`;
    this.bind({ go: () => this.game.confirmWorldIntro() });
  }

  levels() {
    const worldId = this.game.selectedWorld;
    const world = WORLDS.find((w) => w.id === worldId);
    this.applyTheme(worldId);
    const save = this.game.save.data;

    let worldStars = 0;
    for (let lv = 0; lv < world.levels; lv++) {
      worldStars += save.stars?.[`${worldId}:${lv}`] || 0;
    }

    let html = "";
    for (let i = 0; i < world.levels; i++) {
      const unlocked = i === 0 || save.completed[`${worldId}:${i - 1}`] || this.game.debug.enabled;
      const done = !!save.completed[`${worldId}:${i}`];
      const stars = save.stars?.[`${worldId}:${i}`] || 0;
      const best = save.bestMoves?.[`${worldId}:${i}`];

      const starIcons = `
        <div class="lvl-stars-row">
          ${starSvg(stars >= 1, 12)}
          ${starSvg(stars >= 2, 12)}
          ${starSvg(stars >= 3, 12)}
        </div>
      `;

      html += `<button class="lvl ${done ? "done" : ""} ${unlocked ? "" : "locked"}" data-i="${i}" ${unlocked ? "" : "disabled"}>
        <div class="lvl-num"><b>${i + 1}</b></div>
        ${done ? starIcons : `<div class="lvl-gem">${gemSvg(14)}</div>`}
        ${best != null ? `<span class="lvl-best">${best} glides</span>` : unlocked && !done ? `<span class="lvl-ready">Play</span>` : `<span class="lvl-lock">🔒</span>`}
      </button>`;
    }

    this.root.innerHTML = `<div class="screen scroll-screen" data-ui="1">
      <div class="topbar">
        ${backBtnHtml("back")}
        <h2>${world.name}</h2>
        <div class="topbar-right">
          <span class="star-chip">${starSvg(true, 15)}<b>${worldStars}</b>/${world.levels * 3}</span>
          ${gleamChip(save.gleams)}
        </div>
      </div>
      <p class="lede slim">${world.tagline}</p>
      <div class="grid-lvls">${html}</div>
    </div>`;

    this.root.querySelector("#back").onclick = () => this.game.fsm.set(STATES.WORLD_SELECT);
    this.root.querySelectorAll("[data-i]").forEach((el) => {
      el.onclick = () => this.game.startLevel(worldId, +el.dataset.i);
    });
  }

  hud() {
    const s = this.game.session;
    if (!s) return;
    this.applyTheme(s.level);
    const p = s.progress();
    const pct = p.max ? Math.round((p.cur / p.max) * 100) : 0;
    const isFirstWorld = s.level.worldId === "emberwake" && s.level.index < 2 && s.moves === 0;
    const moveTutorial = isFirstWorld
      ? `<div class="move-tutorial" data-ui="1">
          <div class="keys-row">
            <span class="key-badge">W</span>
            <div class="keys-sub"><span class="key-badge">A</span><span class="key-badge">S</span><span class="key-badge">D</span></div>
          </div>
          <div class="tut-text">Swipe or use WASD / Arrow Keys to Glide</div>
        </div>`
      : "";
    const stuckBanner = s.stuck
      ? `<div class="stuck-banner"><span>Lattice blocked — tap ↻ to restart</span></div>`
      : "";
    const hint = this.game.showHint ? `<div class="hint">${s.level.hint || "Swipe to glide — illuminate every platform"}</div>` : "";
    const save = this.game.save?.data || { gleams: 0 };
    const world = WORLDS.find((w) => w.id === s.level.worldId);
    const worldName = world?.name || "Lattice";

    this.root.innerHTML = `<div class="hud" data-ui="1">
      <div class="hud-top">
        <button class="iconbtn hud-btn" id="pause" aria-label="Pause">❚❚</button>
        <div class="hud-meta">
          <span class="hud-subhead">${worldName.toUpperCase()} · ${s.level.index + 1}</span>
          <strong class="hud-title">${s.level.title}</strong>
          <div class="progress-wrap">
            <div class="progress-bar"><i style="width:${pct}%"></i></div>
            <span class="progress-label">${p.cur}/${p.max} tiles · ${s.moves} glides</span>
          </div>
        </div>
        <div class="hud-actions">
          <span class="hud-gleam-badge">${gemSvg(16)}<b>${save.gleams}</b></span>
          <button class="iconbtn hud-btn ${s.stuck ? "stuck-pulse" : ""}" id="restart" aria-label="Restart">↻</button>
        </div>
      </div>
      ${moveTutorial}
      ${stuckBanner}
      ${hint}
    </div>`;
    this.root.querySelector("#pause").onclick = () => this.game.pause();
    this.root.querySelector("#restart").onclick = () => this.game.restart();
  }

  updateHud() {
    const s = this.game.session;
    if (!s) return;
    const p = s.progress();
    const pct = p.max ? Math.round((p.cur / p.max) * 100) : 0;
    const bar = this.root.querySelector(".progress-bar i");
    const label = this.root.querySelector(".progress-label");
    const gleamEl = this.root.querySelector(".hud-gleam-badge b");
    const restartBtn = this.root.querySelector("#restart");
    let stuckBanner = this.root.querySelector(".stuck-banner");
    const moveTut = this.root.querySelector(".move-tutorial");

    if (bar) bar.style.width = `${pct}%`;
    if (label) label.textContent = `${p.cur}/${p.max} tiles · ${s.moves} glides`;
    if (gleamEl && this.game.save?.data) gleamEl.textContent = String(this.game.save.data.gleams);
    if (moveTut && s.moves > 0) moveTut.remove();

    if (restartBtn) {
      restartBtn.classList.toggle("stuck-pulse", !!s.stuck);
    }
    if (s.stuck && !stuckBanner) {
      const b = document.createElement("div");
      b.className = "stuck-banner";
      b.innerHTML = "<span>Lattice blocked — tap ↻ to restart</span>";
      this.root.querySelector(".hud")?.appendChild(b);
    } else if (!s.stuck && stuckBanner) {
      stuckBanner.remove();
    }
  }

  pause() {
    this.root.innerHTML = `<div class="screen dim" data-ui="1">
      <div class="panel">
        <p class="eyebrow">Paused</p>
        <h2>Journey Paused</h2>
        <p class="lede slim">The platforms patiently await your wake.</p>
        <button class="btn primary" id="resume">Resume Glide</button>
        <button class="btn" id="restart">Restart Lattice</button>
        <button class="btn" id="set">Settings</button>
        <button class="btn ghost" id="quit">World Atlas</button>
      </div>
    </div>`;
    this.bind({
      resume: () => this.game.resume(),
      restart: () => this.game.restart(),
      set: () => this.game.fsm.set(STATES.SETTINGS, { from: STATES.PAUSED }),
      quit: () => this.game.quitToWorlds(),
    });
  }

  complete() {
    const r = this.game.lastReward || { reward: 0, efficient: false, starsEarned: 1, moves: 0, target3Star: 0, target2Star: 0 };
    const s = this.game.session;
    if (s) this.applyTheme(s.level);

    const stars = r.starsEarned || 1;
    const starsHtml = `
      <div class="completion-stars-showcase">
        <div class="comp-star ${stars >= 1 ? "awarded pulse-1" : "unearned"}">${starSvg(stars >= 1, 38)}</div>
        <div class="comp-star center-star ${stars >= 2 ? "awarded pulse-2" : "unearned"}">${starSvg(stars >= 2, 46)}</div>
        <div class="comp-star ${stars >= 3 ? "awarded pulse-3" : "unearned"}">${starSvg(stars >= 3, 38)}</div>
      </div>
      <div class="star-rating-subtitle">
        ${stars === 3 ? "★★★ Pristine Optimal Run" : stars === 2 ? "★★ Great Precision" : "★ Lattice Awoken"}
      </div>
    `;

    const statsDetail = r.moves ? `
      <div class="move-comparison-pill">
        <span>Glides: <b>${r.moves}</b></span>
        <span class="divider">·</span>
        <span>Target for 3★: <b>≤${r.target3Star}</b></span>
      </div>
    ` : "";

    this.root.innerHTML = `<div class="screen dim" data-ui="1">
      <div class="panel shine complete-panel">
        <p class="eyebrow">Lattice Restored</p>
        <h2>${s?.level?.title || "Platform Awoken"}</h2>
        ${starsHtml}
        ${statsDetail}
        <div class="reward-box">
          <span class="reward-amount">${gemSvg(26)} +${r.reward} Gleams</span>
          ${r.efficient ? `<span class="reward-badge">★ Quiet Path Mastery (+5 Bonus)</span>` : ""}
          ${r.newStarsGained ? `<span class="star-bonus-badge">+${r.newStarsGained * 3} Star Mastery Bonus</span>` : ""}
        </div>
        <button class="btn primary" id="next">Next Lattice</button>
        <button class="btn" id="again">Replay Lattice</button>
        <button class="btn ghost" id="menu">Main Menu</button>
      </div>
    </div>`;
    this.bind({
      next: () => this.game.nextLevel(),
      again: () => this.game.restart(),
      menu: () => this.game.fsm.set(STATES.MAIN_MENU),
    });
  }

  settings() {
    const s = this.game.save.data.settings;
    const currentSpeed = s.speed || 1.0;
    const pct = (v) => Math.round(v * 100);

    const resetModal = this.showResetConfirm
      ? `<div class="buy-overlay" data-ui="1">
          <div class="panel confirm-modal reset-modal">
            <p class="eyebrow warning-text">Confirm Reset</p>
            <h2>Reset All Progress?</h2>
            <p class="lede slim">This will reset all unlocked sectors, custom character skins, and milestones back to defaults. This action cannot be undone.</p>
            <div class="modal-actions">
              <button class="btn danger" id="reset-confirm">Yes, Reset Everything</button>
              <button class="btn ghost" id="reset-cancel">Keep My Progress</button>
            </div>
          </div>
        </div>`
      : "";

    this.root.innerHTML = `<div class="screen scroll-screen" data-ui="1">
      <div class="topbar">
        ${backBtnHtml("back")}
        <h2>Settings</h2>
        <span class="top-spacer"></span>
      </div>
      <div class="settings-wrap">
        <section class="set-card">
          <div class="set-header">
            <span class="set-icon">♪</span>
            <h3>Audio Experience</h3>
          </div>
          ${tog("music", "Music", s.music)}
          ${tog("sfx", "Sound Effects", s.sfx)}
          ${slider("master", "Master Volume", s.master, pct(s.master))}
          ${slider("musicVol", "Music Level", s.musicVol, pct(s.musicVol))}
          ${slider("sfxVol", "SFX Level", s.sfxVol, pct(s.sfxVol))}
        </section>

        <section class="set-card">
          <div class="set-header">
            <span class="set-icon">✧</span>
            <h3>Visual Quality</h3>
          </div>
          <p class="set-hint">Balances motes, cosmic starfield sparkles, and atmospheric bloom.</p>
          <div class="seg" id="quality">
            <button type="button" class="seg-btn ${s.quality === "low" ? "on" : ""}" data-q="low">Soft</button>
            <button type="button" class="seg-btn ${s.quality === "medium" ? "on" : ""}" data-q="medium">Balanced</button>
            <button type="button" class="seg-btn ${s.quality === "high" ? "on" : ""}" data-q="high">Vivid</button>
          </div>
          <span class="quality-desc">${s.quality === "high" ? "Vivid: 52 motes, intense starfields, full particle bloom" : s.quality === "low" ? "Soft: 16 motes, soft lighting, battery saver" : "Balanced: 32 motes, smooth ambient glow"}</span>
        </section>

        <section class="set-card">
          <div class="set-header">
            <span class="set-icon">⚙</span>
            <h3>Controls & Gameplay</h3>
          </div>
          ${tog("hints", "Show Path Hints", this.game.showHint)}
          <div class="info-row">
            <span>Gliding Speed Pace</span>
            <b class="stat-pill">${currentSpeed}x · ${currentSpeed === 1.0 ? "Calm" : currentSpeed <= 1.25 ? "Swift" : currentSpeed <= 1.5 ? "Brisk" : "Hyper"}</b>
          </div>
          <div class="seg" id="speed">
            <button type="button" class="seg-btn ${currentSpeed === 1.0 ? "on" : ""}" data-spd="1.0">1.0x Calm</button>
            <button type="button" class="seg-btn ${currentSpeed === 1.25 ? "on" : ""}" data-spd="1.25">1.25x Swift</button>
            <button type="button" class="seg-btn ${currentSpeed === 1.5 ? "on" : ""}" data-spd="1.5">1.5x Brisk</button>
            <button type="button" class="seg-btn ${currentSpeed === 2.0 ? "on" : ""}" data-spd="2.0">2.0x Hyper</button>
          </div>
        </section>

        <section class="set-card">
          <div class="set-header">
            <span class="set-icon">ℹ</span>
            <h3>Game Data</h3>
          </div>
          <div class="info-row">
            <span>Version</span>
            <b>1.2.0 · Production Edition</b>
          </div>
          <button class="btn danger-outline" id="reset-btn">Reset Save Data</button>
        </section>

        <button class="btn ghost" id="ach">View Achievements</button>
      </div>
    </div>${resetModal}`;

    this.root.querySelector("#back").onclick = () => {
      this.game.fsm.set(this.game.fsm.data.from || STATES.MAIN_MENU);
    };
    this.root.querySelector("#ach").onclick = () => this.game.fsm.set(STATES.ACHIEVEMENTS);

    this.root.querySelector("#music").onchange = (e) => {
      this.game.setSetting("music", e.target.checked);
      if (e.target.checked) this.game.audio.click();
    };
    this.root.querySelector("#sfx").onchange = (e) => {
      this.game.setSetting("sfx", e.target.checked);
      this.game.audio.click();
    };

    const hintsCheck = this.root.querySelector("#hints");
    if (hintsCheck) {
      hintsCheck.onchange = (e) => {
        this.game.showHint = e.target.checked;
        this.game.setSetting("hints", e.target.checked);
        this.game.audio.click();
      };
    }

    const resetBtn = this.root.querySelector("#reset-btn");
    if (resetBtn) {
      resetBtn.onclick = () => {
        this.showResetConfirm = true;
        this._key = "";
        this.render();
      };
    }

    const resetConfirm = this.root.querySelector("#reset-confirm");
    const resetCancel = this.root.querySelector("#reset-cancel");
    if (resetConfirm) {
      resetConfirm.onclick = () => {
        this.game.save.reset();
        this.showResetConfirm = false;
        this._key = "";
        this.setToast("Game progress reset successfully");
        this.render();
      };
    }
    if (resetCancel) {
      resetCancel.onclick = () => {
        this.showResetConfirm = false;
        this._key = "";
        this.render();
      };
    }

    const bindSlider = (id, key) => {
      const el = this.root.querySelector("#" + id);
      const out = this.root.querySelector(`[data-val="${id}"]`);
      if (el) {
        el.oninput = (e) => {
          const v = +e.target.value;
          if (out) out.textContent = `${Math.round(v * 100)}%`;
          this.game.setSetting(key, v);
        };
        el.onchange = () => this.game.audio.click();
      }
    };
    bindSlider("master", "master");
    bindSlider("musicVol", "musicVol");
    bindSlider("sfxVol", "sfxVol");

    this.root.querySelectorAll("[data-q]").forEach((btn) => {
      btn.onclick = () => {
        this.game.audio.click();
        this.root.querySelectorAll("[data-q]").forEach((b) => b.classList.toggle("on", b === btn));
        this.game.setSetting("quality", btn.dataset.q);
        this._key = "";
        this.render();
      };
    });

    this.root.querySelectorAll("[data-spd]").forEach((btn) => {
      btn.onclick = () => {
        this.game.audio.click();
        const spd = parseFloat(btn.dataset.spd);
        this.root.querySelectorAll("[data-spd]").forEach((b) => b.classList.toggle("on", b === btn));
        this.game.setSetting("speed", spd);
        this._key = "";
        this.render();
      };
    });
  }

  collection() {
    const save = this.game.save.data;
    const pending = COSMETICS.find((c) => c.id === this.pendingBuy);

    const CATEGORIES = [
      { id: "all", name: "All Items" },
      { id: "body", name: "Characters" },
      { id: "wake", name: "Wake Trails" },
      { id: "mote", name: "Aura Motes" },
      { id: "burst", name: "Blooms" },
      { id: "sky", name: "Sky Veils" },
    ];

    const filtered = this.colCategory === "all"
      ? COSMETICS
      : COSMETICS.filter((c) => c.type === this.colCategory);

    // Active equipped summary
    const equippedBody = COSMETICS.find((c) => c.id === save.equipped.body) || COSMETICS[0];
    const equippedWake = COSMETICS.find((c) => c.id === save.equipped.wake);
    const equippedMote = COSMETICS.find((c) => c.id === save.equipped.mote);

    const catTabsHtml = CATEGORIES.map((cat) => {
      const count = cat.id === "all"
        ? COSMETICS.length
        : COSMETICS.filter((c) => c.type === cat.id).length;
      return `<button class="cat-tab ${this.colCategory === cat.id ? "active" : ""}" data-cat="${cat.id}">
        ${cat.name} <span class="tab-count">${count}</span>
      </button>`;
    }).join("");

    const items = filtered.map((c) => {
      const owned = save.owned.includes(c.id);
      const eq = save.equipped[c.type] === c.id;
      const state = !owned ? "buy" : eq ? "worn" : "owned";

      let ctaHtml = "";
      if (!owned) {
        ctaHtml = `<span class="cos-cta buy">${gemSvg(15)} ${c.cost} Gleams</span>`;
      } else if (eq) {
        ctaHtml = `<span class="cos-cta worn"><span class="check-icon">✓</span> Equipped</span>`;
      } else {
        ctaHtml = `<button class="cos-cta wear" data-equip="${c.id}">Equip</button>`;
      }

      return `<div class="card cos-card state-${state} ${eq ? "is-equipped" : ""}" data-id="${c.id}">
        ${renderCosmeticPreview(c, eq, owned)}
        <div class="cos-card-body">
          <div class="cos-card-top">
            <strong>${c.name}</strong>
            <span class="cos-type">${c.type === "body" ? (c.title || "Character Skin") : (COSMETIC_TYPE[c.type] || c.type)}</span>
          </div>
          <p class="cos-blurb">${c.blurb || ""}</p>
          <div class="cos-card-footer">
            ${ctaHtml}
          </div>
        </div>
      </div>`;
    }).join("");

    // Centered modal for confirming purchase
    let modal = "";
    if (pending) {
      const canAfford = save.gleams >= pending.cost;
      const remaining = save.gleams - pending.cost;
      modal = `<div class="buy-overlay" data-ui="1">
        <div class="panel confirm-modal">
          <p class="eyebrow">Unlock Confirmation</p>
          <div class="buy-preview-stage">
            ${renderCosmeticPreview(pending, false, false)}
          </div>
          <h2>${pending.name}</h2>
          <span class="badge-type">${pending.type === "body" ? (pending.title || "Character Skin") : (COSMETIC_TYPE[pending.type] || pending.type)}</span>
          <p class="lede slim">${pending.blurb || "A radiant spirit look."}</p>

          <div class="price-breakdown">
            <div class="price-row">
              <span>Item Price</span>
              <b>${gemSvg(16)} ${pending.cost} Gleams</b>
            </div>
            <div class="price-row">
              <span>Your Balance</span>
              <b>${gemSvg(16)} ${save.gleams} Gleams</b>
            </div>
            <div class="price-row total-row">
              <span>Balance After</span>
              <b class="${canAfford ? "positive" : "negative"}">${gemSvg(16)} ${canAfford ? remaining : "Insufficient"}</b>
            </div>
          </div>

          ${!canAfford ? `<div class="insufficient-alert">You need ${pending.cost - save.gleams} more Gleams to unlock this item.</div>` : ""}

          <div class="modal-actions">
            <button class="btn primary ${canAfford ? "" : "disabled"}" id="buyyes" ${canAfford ? "" : "disabled"}>
              ${gemSvg(18)} Unlock Item
            </button>
            <button class="btn ghost" id="buyno">Not Now</button>
          </div>
        </div>
      </div>`;
    }

    this.root.innerHTML = `<div class="screen scroll-screen" data-ui="1">
      <div class="topbar">
        ${backBtnHtml("back")}
        <h2>Store & Sanctuary</h2>
        ${gleamChip(save.gleams)}
      </div>

      <!-- Live Hero Stage -->
      <div class="col-hero">
        <div class="hero-showcase">
          <div class="hero-preview-avatar">
            ${renderCosmeticPreview(equippedBody, true, true)}
          </div>
          <div class="hero-meta">
            <span class="hero-tag">ACTIVE COMPANION</span>
            <h3>${equippedBody.name}</h3>
            <p class="hero-sub">${equippedWake?.name || "Soft Ribbon"} trail · ${equippedMote?.name || "Tiny Orbs"}</p>
            <span class="hero-owned-count">Collected: ${save.owned.length} of ${COSMETICS.length} items</span>
          </div>
        </div>
      </div>

      <!-- Category Tabs -->
      <div class="cat-tabs-wrap">
        ${catTabsHtml}
      </div>

      <div class="cards cos-grid">${items}</div>
    </div>${modal}`;

    this.root.querySelector("#back").onclick = () => this.game.fsm.set(STATES.MAIN_MENU);

    // Tab clicks
    this.root.querySelectorAll("[data-cat]").forEach((el) => {
      el.onclick = () => {
        this.game.audio.click();
        this.colCategory = el.dataset.cat;
        this._key = "";
        this.render();
      };
    });

    // Card equip & buy clicks
    this.root.querySelectorAll(".cos-card").forEach((el) => {
      el.onclick = (e) => {
        const id = el.dataset.id;
        const item = COSMETICS.find((c) => c.id === id);
        if (!item) return;

        if (!save.owned.includes(id)) {
          this.game.audio.click();
          this.pendingBuy = id;
          this._key = "";
          this.render();
          return;
        }

        // Equip if owned
        this.game.buyOrEquip(id);
        this._key = "";
        this.render();
      };
    });

    // Equip button inside card
    this.root.querySelectorAll("[data-equip]").forEach((btn) => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const id = btn.dataset.equip;
        this.game.buyOrEquip(id);
        this._key = "";
        this.render();
      };
    });

    // Modal actions
    const yes = this.root.querySelector("#buyyes");
    const no = this.root.querySelector("#buyno");
    if (yes) {
      yes.onclick = () => {
        const id = this.pendingBuy;
        this.pendingBuy = null;
        this.game.buyOrEquip(id);
        this._key = "";
        this.render();
      };
    }
    if (no) {
      no.onclick = () => {
        this.pendingBuy = null;
        this._key = "";
        this.render();
      };
    }
  }

  daily() {
    const d = this.game.save.data.daily;
    this.applyTheme("daily");
    this.root.innerHTML = `<div class="screen center" data-ui="1">
      <div class="topbar abs">${backBtnHtml("back")}</div>
      <h2 class="logo small">Dayweave</h2>
      <p class="lede">A unique lattice handcrafted for this day. Restore every tile.</p>
      <div class="daily-badge-card">
        <span class="daily-date">${d.lastDate || "Today's Challenge"}</span>
        <b>${d.completed ? "✓ Lattice Illuminated" : "Waiting to be Woven"}</b>
        <span class="daily-streak">Current Streak: ${d.streak} Days</span>
      </div>
      <button class="btn primary" id="go">${d.completed ? "Replay Challenge" : "Enter Dayweave"}</button>
    </div>`;
    this.bind({
      back: () => this.game.fsm.set(STATES.MAIN_MENU),
      go: () => this.game.startDaily(),
    });
  }

  achievements() {
    const save = this.game.save.data;
    const a = save.achievements;
    const unlockedN = ACHIEVEMENTS.filter((x) => a[x.id]).length;
    const totalGleamsEarned = unlockedN * 30;
    const pct = Math.round((unlockedN / ACHIEVEMENTS.length) * 100);

    const items = ACHIEVEMENTS.map((x) => {
      const done = !!a[x.id];
      const pr = achProgress(x, save);
      const barPct = pr.max ? Math.round((pr.cur / pr.max) * 100) : 0;
      return `<article class="card ach-card ${done ? "done" : "locked-ach"}">
        <span class="ach-medal" style="--ach:${x.hue || "#ff9a4a"}">
          ${achGlyph(x.icon, x.hue || "#ff9a4a")}
        </span>
        <div class="ach-copy">
          <div class="ach-head">
            <strong>${x.name}</strong>
            <span class="ach-flag ${done ? "unlocked" : "locked"}">${done ? "✓ Unlocked" : "In Progress"}</span>
          </div>
          <span class="ach-desc">${x.desc}</span>
          <span class="ach-how">${x.how || ""}</span>
          <div class="ach-progress-row">
            <div class="ach-bar"><i style="width:${barPct}%;background:${x.hue}"></i></div>
            <span class="ach-prog">${pr.cur}/${pr.max}</span>
          </div>
        </div>
      </article>`;
    }).join("");

    this.root.innerHTML = `<div class="screen scroll-screen" data-ui="1">
      <div class="topbar">
        ${backBtnHtml("back")}
        <h2>Achievements</h2>
        ${gleamChip(save.gleams)}
      </div>

      <!-- Summary Banner -->
      <div class="ach-summary-card">
        <div class="ach-summary-main">
          <div class="ach-summary-text">
            <span class="ach-summary-title">Completion Status</span>
            <h3>${unlockedN} of ${ACHIEVEMENTS.length} Milestones</h3>
          </div>
          <span class="ach-reward-tag">${gemSvg(18)} +${totalGleamsEarned} Gleams Earned</span>
        </div>
        <div class="ach-total-bar">
          <i style="width:${pct}%"></i>
        </div>
      </div>

      <div class="cards ach-grid">${items}</div>
    </div>`;

    this.root.querySelector("#back").onclick = () => this.game.fsm.set(STATES.MAIN_MENU);
  }

  bind(map) {
    for (const [id, fn] of Object.entries(map)) {
      const el = this.root.querySelector("#" + id);
      if (el) el.onclick = fn;
    }
  }
}

/** Rich 3D Multi-faceted Gem/Coin SVG */
export function gemSvg(size = 18) {
  return `<svg class="gem-ico" width="${size}" height="${size}" viewBox="0 0 32 32" aria-hidden="true">
    <defs>
      <linearGradient id="gemGradTop" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#fff8d6"/>
        <stop offset="60%" stop-color="#ffd054"/>
        <stop offset="100%" stop-color="#f5a623"/>
      </linearGradient>
      <linearGradient id="gemGradFront" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#ffd55c"/>
        <stop offset="100%" stop-color="#d47c12"/>
      </linearGradient>
      <linearGradient id="gemGradSideL" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffe48a"/>
        <stop offset="100%" stop-color="#e08a18"/>
      </linearGradient>
      <linearGradient id="gemGradSideR" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#c46a08"/>
        <stop offset="100%" stop-color="#8a4004"/>
      </linearGradient>
    </defs>
    <g>
      <!-- Faceted Gem Silhouette -->
      <polygon points="16,2 27,9 16,30 5,9" fill="url(#gemGradFront)" stroke="#783c06" stroke-width="0.8" stroke-linejoin="round"/>
      <polygon points="16,2 27,9 21,11 16,6 11,11 5,9" fill="url(#gemGradTop)"/>
      <polygon points="11,11 16,6 21,11 16,30" fill="url(#gemGradFront)" opacity="0.95"/>
      <polygon points="5,9 11,11 16,30" fill="url(#gemGradSideL)"/>
      <polygon points="27,9 21,11 16,30" fill="url(#gemGradSideR)"/>
      <!-- Brilliant Highlights -->
      <polygon points="16,6 19,10 16,12 13,10" fill="#ffffff" opacity="0.8"/>
      <line x1="6" y1="9.5" x2="15" y2="28" stroke="#ffffff" stroke-width="0.8" opacity="0.5"/>
      <path d="M5,9 L27,9" stroke="#fff8dc" stroke-width="0.8" opacity="0.85"/>
    </g>
  </svg>`;
}

export function starSvg(filled = true, size = 18) {
  if (filled) {
    return `<svg class="star-ico filled" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="starGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fff8d6"/>
          <stop offset="50%" stop-color="#ffd054"/>
          <stop offset="100%" stop-color="#e08a18"/>
        </linearGradient>
      </defs>
      <polygon points="12,2 15.2,8.5 22.4,9.5 17.2,14.6 18.4,21.8 12,18.4 5.6,21.8 6.8,14.6 1.6,9.5 8.8,8.5" fill="url(#starGrad)" stroke="#783c06" stroke-width="0.8" stroke-linejoin="round"/>
      <polygon points="12,4 14,9 18,9.7 15,12.6 12,11" fill="#ffffff" opacity="0.6"/>
    </svg>`;
  }
  return `<svg class="star-ico empty" width="${size}" height="${size}" viewBox="0 0 24 24" aria-hidden="true">
    <polygon points="12,2 15.2,8.5 22.4,9.5 17.2,14.6 18.4,21.8 12,18.4 5.6,21.8 6.8,14.6 1.6,9.5 8.8,8.5" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)" stroke-width="1.2" stroke-linejoin="round"/>
  </svg>`;
}

export function backBtnHtml(id = "back") {
  return `<button class="iconbtn back-btn" id="${id}" aria-label="Back">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <path d="M19 12H5M12 19l-7-7 7-7"/>
    </svg>
  </button>`;
}

function gleamChip(n) {
  return `<span class="gleam-chip">${gemSvg(18)}<b>${n}</b><span>Gleams</span></span>`;
}

function tog(id, label, on) {
  return `<label class="switch-row"><span>${label}</span><span class="switch"><input type="checkbox" id="${id}" ${on ? "checked" : ""} /><i></i></span></label>`;
}

function slider(id, label, v, shown) {
  return `<label class="slide-row"><span>${label}<b data-val="${id}">${shown}%</b></span><input type="range" id="${id}" min="0" max="1" step="0.01" value="${v}" /></label>`;
}

function achProgress(x, save) {
  const n = Object.keys(save.completed || {}).length;
  const starsMap = save.stars || {};
  const totalStars = Object.values(starsMap).reduce((acc, v) => acc + (v || 0), 0);
  const maxStarsAny = Math.max(0, ...Object.values(starsMap));

  if (x.id === "first-wake") return { cur: Math.min(n, 1), max: 1 };
  if (x.id === "first-3star") return { cur: maxStarsAny >= 3 ? 1 : 0, max: 1 };
  if (x.id === "ten-lattices") return { cur: Math.min(n, 10), max: 10 };
  if (x.id === "fifty-lattices") return { cur: Math.min(n, 50), max: 50 };
  if (x.id === "star-collector") return { cur: Math.min(totalStars, 25), max: 25 };
  if (x.id === "star-master") return { cur: Math.min(totalStars, 75), max: 75 };
  if (x.id.startsWith("world-")) {
    const wid = x.id.slice(6);
    const w = WORLDS.find((o) => o.id === wid);
    return { cur: worldProgress(save.completed, wid), max: w?.levels || 10 };
  }
  if (x.id === "collector") return { cur: Math.min((save.owned || []).length, 6), max: 6 };
  if (save.achievements?.[x.id]) return { cur: 1, max: 1 };
  return { cur: 0, max: 1 };
}

/** Bespoke themed colorful SVG glyphs for ALL 25+ achievements */
function achGlyph(icon, hue = "#ff9a4a") {
  const glyphs = {
    wake: `<svg viewBox="0 0 24 24"><polygon points="12,2 15,8 22,9 17,14 18,21 12,17 6,21 7,14 2,9 9,8" fill="${hue}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
    ten: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="${hue}" stroke-width="2.2"/><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="800" fill="#ffffff">10</text></svg>`,
    fifty: `<svg viewBox="0 0 24 24"><polygon points="12,3 19,7 19,17 12,21 5,17 5,7" fill="${hue}" stroke="#ffffff" stroke-width="1.2"/><text x="12" y="16" text-anchor="middle" font-size="9" font-weight="800" fill="#ffffff">50</text></svg>`,
    quiet: `<svg viewBox="0 0 24 24"><path d="M4,18 C8,18 10,6 20,4 C20,12 12,14 4,18 Z" fill="${hue}" stroke="#ffffff" stroke-width="1.2"/><path d="M7,16 L17,7" stroke="#ffffff" stroke-width="1.5"/></svg>`,
    daily: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" fill="none" stroke="${hue}" stroke-width="2.2"/><circle cx="12" cy="12" r="3" fill="#ffffff"/><line x1="12" y1="2" x2="12" y2="5" stroke="${hue}" stroke-width="2"/><line x1="12" y1="19" x2="12" y2="22" stroke="${hue}" stroke-width="2"/><line x1="2" y1="12" x2="5" y2="12" stroke="${hue}" stroke-width="2"/><line x1="19" y1="12" x2="22" y2="12" stroke="${hue}" stroke-width="2"/></svg>`,
    wardrobe: `<svg viewBox="0 0 24 24"><path d="M5,6 L19,6 L21,20 L3,20 Z" fill="${hue}" stroke="#ffffff" stroke-width="1.2"/><circle cx="12" cy="10" r="2.5" fill="#ffffff"/><path d="M12,12.5 L12,17" stroke="#ffffff" stroke-width="1.5"/></svg>`,
    well: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="${hue}" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="${hue}" opacity="0.6"/><circle cx="12" cy="12" r="2" fill="#ffffff"/></svg>`,
    fold: `<svg viewBox="0 0 24 24"><path d="M6,12 C6,8 10,8 12,12 C14,16 18,16 18,12 C18,8 14,8 12,12 C10,16 6,16 6,12 Z" fill="none" stroke="${hue}" stroke-width="2.4"/><circle cx="6" cy="12" r="2" fill="#ffffff"/><circle cx="18" cy="12" r="2" fill="#ffffff"/></svg>`,
    // Bespoke World Keeper Glyphs
    emberwake: `<svg viewBox="0 0 24 24"><path d="M12,2 C12,6 8,9 8,14 C8,18 10,21 12,21 C14,21 16,18 16,14 C16,9 12,6 12,2 Z" fill="${hue}" stroke="#ffffff" stroke-width="1.2"/><circle cx="12" cy="15" r="2" fill="#ffffff"/></svg>`,
    tidecrest: `<svg viewBox="0 0 24 24"><path d="M3,16 C6,13 9,13 12,16 C15,19 18,19 21,16 L21,21 L3,21 Z" fill="${hue}" stroke="#ffffff" stroke-width="1"/><circle cx="12" cy="8" r="3.5" fill="${hue}" stroke="#ffffff" stroke-width="1.2"/></svg>`,
    duskveil: `<svg viewBox="0 0 24 24"><path d="M12,3 C7,3 3,7 3,12 C3,17 7,21 12,21 C10,18 10,14 12,11 C14,8 18,8 21,9 C20,5.5 16.5,3 12,3 Z" fill="${hue}" stroke="#ffffff" stroke-width="1.2"/></svg>`,
    canopy: `<svg viewBox="0 0 24 24"><path d="M12,2 C6,8 5,16 12,22 C19,16 18,8 12,2 Z" fill="${hue}" stroke="#ffffff" stroke-width="1.2"/><line x1="12" y1="6" x2="12" y2="18" stroke="#ffffff" stroke-width="1.5"/></svg>`,
    starloom: `<svg viewBox="0 0 24 24"><polygon points="12,2 14,10 22,12 14,14 12,22 10,14 2,12 10,10" fill="${hue}" stroke="#ffffff" stroke-width="1.2"/></svg>`,
    cinderfall: `<svg viewBox="0 0 24 24"><polygon points="3,18 9,7 15,12 21,4 21,20 3,20" fill="${hue}" stroke="#ffffff" stroke-width="1.2"/><line x1="12" y1="12" x2="12" y2="20" stroke="#ffffff" stroke-width="1.5"/></svg>`,
    mirrorfen: `<svg viewBox="0 0 24 24"><polygon points="12,2 20,8 16,21 8,21 4,8" fill="none" stroke="${hue}" stroke-width="2"/><line x1="12" y1="2" x2="12" y2="21" stroke="#ffffff" stroke-width="1.5"/></svg>`,
    zephyrrow: `<svg viewBox="0 0 24 24"><path d="M3,8 H15 C17,8 19,6 19,4 C19,2 17,2 15,2" fill="none" stroke="${hue}" stroke-width="2"/><path d="M3,14 H18 C20,14 22,16 22,18 C22,20 20,20 18,20" fill="none" stroke="${hue}" stroke-width="2"/><path d="M3,20 H12" fill="none" stroke="${hue}" stroke-width="2"/></svg>`,
    brasslock: `<svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" fill="${hue}" stroke="#ffffff" stroke-width="1.2"/><path d="M8,10 V6 C8,3.8 9.8,2 12,2 C14.2,2 16,3.8 16,6 V10" fill="none" stroke="#ffffff" stroke-width="2"/><circle cx="12" cy="15" r="1.5" fill="#ffffff"/></svg>`,
    hollowmere: `<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="${hue}" stroke="#ffffff" stroke-width="1.2"/><ellipse cx="12" cy="12" rx="4" ry="7" fill="#08040a"/></svg>`,
    prismarch: `<svg viewBox="0 0 24 24"><polygon points="12,3 21,19 3,19" fill="none" stroke="${hue}" stroke-width="2"/><line x1="12" y1="3" x2="12" y2="19" stroke="#ffffff" stroke-width="1.5"/></svg>`,
    auroraloom: `<svg viewBox="0 0 24 24"><path d="M12,21.35l-1.45-1.32C5.4,15.36 2,12.28 2,8.5 2,5.42 4.42,3 7.5,3c1.74,0 3.41,0.81 4.5,2.09C13.09,3.81 14.76,3 16.5,3 19.58,3 22,5.42 22,8.5c0,3.78-3.4,6.86-8.55,11.54L12,21.35z" fill="${hue}" stroke="#ffffff" stroke-width="1.2"/></svg>`,
    rootspire: `<svg viewBox="0 0 24 24"><polygon points="12,2 17,21 12,17 7,21" fill="${hue}" stroke="#ffffff" stroke-width="1.2"/><line x1="12" y1="2" x2="12" y2="17" stroke="#ffffff" stroke-width="1.5"/></svg>`,
    stormglass: `<svg viewBox="0 0 24 24"><polygon points="13,2 4,13 11,13 9,22 20,10 13,10" fill="${hue}" stroke="#ffffff" stroke-width="1.2"/></svg>`,
    duskforge: `<svg viewBox="0 0 24 24"><path d="M4,9 L20,9 L18,17 L6,17 Z" fill="${hue}" stroke="#ffffff" stroke-width="1.2"/><rect x="10" y="17" width="4" height="4" fill="${hue}"/><polygon points="12,2 14,6 10,6" fill="#ffffff"/></svg>`,
  };

  return glyphs[icon] || glyphs.wake;
}

/** AAA Thriller Movie Posters for All 15 Worlds */
function worldPoster(w) {
  const id = w.id;
  const h = w.hue;
  const motif = POSTER[id] || POSTER.emberwake;
  return `<svg viewBox="0 0 320 180" class="poster-svg" preserveAspectRatio="xMidYMin slice">
    <defs>
      <linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${motif.top}"/>
        <stop offset="1" stop-color="${motif.bot}"/>
      </linearGradient>
      <radialGradient id="sun-${id}" cx="50%" cy="30%" r="50%">
        <stop offset="0%" stop-color="${h}" stop-opacity="0.6"/>
        <stop offset="60%" stop-color="${h}" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
      <radialGradient id="vg-${id}" cx="50%" cy="50%" r="70%">
        <stop offset="0%" stop-color="transparent"/>
        <stop offset="70%" stop-color="rgba(0,0,0,0.3)"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.85)"/>
      </radialGradient>
      <linearGradient id="mist-${id}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="transparent"/>
        <stop offset="50%" stop-color="${h}" stop-opacity="0.25"/>
        <stop offset="100%" stop-color="rgba(0,0,0,0.7)"/>
      </linearGradient>
    </defs>
    <!-- Deep Sky Backdrop -->
    <rect width="320" height="180" fill="url(#sky-${id})"/>
    <!-- Volumetric Ambient Light Aura -->
    <rect width="320" height="180" fill="url(#sun-${id})"/>
    <!-- Bespoke Thriller Composition -->
    ${motif.art(h)}
    <!-- Atmospheric Mist / Fog Layer -->
    <rect x="0" y="90" width="320" height="90" fill="url(#mist-${id})"/>
    <!-- Cinematic Vignette Rim -->
    <rect width="320" height="180" fill="url(#vg-${id})"/>
  </svg>`;
}

const POSTER = {
  emberwake: {
    top: "#3d140a", bot: "#120608",
    art: (h) => `
      <!-- Fiery Solar Eclipse -->
      <circle cx="160" cy="55" r="32" fill="#ff4d1a" opacity="0.3"/>
      <circle cx="160" cy="55" r="24" fill="#080204"/>
      <circle cx="160" cy="55" r="26" fill="none" stroke="${h}" stroke-width="2.5" opacity="0.9"/>
      <!-- Volcanic Obsidian Spires -->
      <polygon points="20,180 70,75 110,180" fill="#180a0a"/>
      <polygon points="60,180 70,75 80,180" fill="${h}" opacity="0.45"/>
      <polygon points="210,180 255,60 295,180" fill="#14080a"/>
      <polygon points="245,180 255,60 265,180" fill="${h}" opacity="0.4"/>
      <!-- Central Floating Monolith -->
      <polygon points="135,160 160,95 185,160 160,175" fill="#240e10" stroke="${h}" stroke-width="1.2"/>
      <polygon points="150,155 160,105 170,155" fill="${h}" opacity="0.8"/>
      <!-- Molten Lava Flow & Floating Embers -->
      <path d="M0,170 Q80,150 160,165 T320,155 L320,180 L0,180 Z" fill="#ff5a20" opacity="0.6"/>
      <circle cx="85" cy="95" r="1.5" fill="#fff5cc"/>
      <circle cx="230" cy="80" r="1.2" fill="#fff5cc"/>
      <circle cx="175" cy="40" r="1.8" fill="#ffd080"/>`,
  },
  tidecrest: {
    top: "#041a28", bot: "#020810",
    art: (h) => `
      <!-- Abyssal Bioluminescent Moon -->
      <ellipse cx="230" cy="40" rx="30" ry="30" fill="#48d8d0" opacity="0.25"/>
      <circle cx="230" cy="40" r="18" fill="#c4fffa"/>
      <!-- Sunken Glass Spires -->
      <polygon points="40,180 75,65 110,180" fill="#061e2b" stroke="${h}" stroke-width="0.8"/>
      <polygon points="120,180 150,85 180,180" fill="#092636"/>
      <!-- Submerged Temple Gate -->
      <circle cx="160" cy="120" r="26" fill="none" stroke="${h}" stroke-width="4"/>
      <circle cx="160" cy="120" r="14" fill="none" stroke="#e8fffc" stroke-width="2"/>
      <!-- Deep Aqua Ocean Waves & Coral Tendrils -->
      <path d="M0,140 Q80,110 160,135 T320,125 L320,180 L0,180 Z" fill="${h}" opacity="0.35"/>
      <circle cx="95" cy="110" r="2.2" fill="#80fff5"/>
      <circle cx="215" cy="95" r="2" fill="#80fff5"/>`,
  },
  duskveil: {
    top: "#1a082e", bot: "#090314",
    art: (h) => `
      <!-- Eerie Violet Nebula Vortex -->
      <ellipse cx="160" cy="50" rx="70" ry="35" fill="${h}" opacity="0.2" transform="rotate(-15 160 50)"/>
      <circle cx="160" cy="48" r="16" fill="#f4e0ff"/>
      <!-- Ancient Occult Standing Stones -->
      <polygon points="45,180 65,70 95,180" fill="#120620"/>
      <polygon points="225,180 255,75 275,180" fill="#150824"/>
      <!-- Floating Runic Seal Rings -->
      <circle cx="160" cy="110" r="32" fill="none" stroke="${h}" stroke-width="3.5"/>
      <circle cx="160" cy="110" r="22" fill="none" stroke="#fff" stroke-width="1.2"/>
      <polygon points="160,92 175,118 145,118" fill="${h}" opacity="0.75"/>
      <!-- Drifting Wisps -->
      <circle cx="110" cy="85" r="2" fill="#e8b8ff"/>
      <circle cx="210" cy="90" r="2.5" fill="#e8b8ff"/>`,
  },
  canopy: {
    top: "#0c2412", bot: "#030e06",
    art: (h) => `
      <!-- Primordial Sun Shafts -->
      <polygon points="120,0 200,0 260,180 60,180" fill="${h}" opacity="0.12"/>
      <!-- Gargantuan Redwood Spires -->
      <polygon points="15,180 50,45 85,180" fill="#08180c"/>
      <polygon points="230,180 265,35 305,180" fill="#06140a"/>
      <polygon points="125,180 160,65 195,180" fill="#0e2a16"/>
      <!-- Turning Drift Vane in Midair -->
      <g transform="translate(160, 95)">
        <circle cx="0" cy="0" r="20" fill="none" stroke="${h}" stroke-width="2.5"/>
        <polygon points="0,-18 16,10 -16,10" fill="${h}" stroke="#fff" stroke-width="1"/>
      </g>
      <!-- Golden Spore Cloud -->
      <circle cx="105" cy="85" r="2" fill="#e4ffa8"/>
      <circle cx="215" cy="70" r="2.2" fill="#e4ffa8"/>`,
  },
  starloom: {
    top: "#080c2e", bot: "#020412",
    art: (h) => `
      <!-- Cosmic Foldgate Stargate Rift -->
      <ellipse cx="160" cy="75" rx="55" ry="55" fill="${h}" opacity="0.25"/>
      <circle cx="160" cy="75" r="38" fill="none" stroke="${h}" stroke-width="4"/>
      <circle cx="160" cy="75" r="28" fill="none" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="160" cy="75" r="14" fill="#040618"/>
      <!-- Celestial Constellation Rays -->
      <line x1="80" y1="75" x2="240" y2="75" stroke="#ffffff" stroke-width="1" opacity="0.7"/>
      <line x1="160" y1="20" x2="160" y2="130" stroke="#ffffff" stroke-width="1" opacity="0.7"/>
      <!-- Fractured Space Platforms -->
      <polygon points="30,180 80,120 130,180" fill="#0e143c" stroke="${h}" stroke-width="0.8"/>
      <polygon points="190,180 240,120 290,180" fill="#0e143c" stroke="${h}" stroke-width="0.8"/>
      <circle cx="160" cy="75" r="3" fill="#fff"/>`,
  },
  cinderfall: {
    top: "#380d06", bot: "#120302",
    art: (h) => `
      <!-- Collapsing Magma Caldera & Shattered Crust -->
      <polygon points="0,150 70,115 140,145 220,110 320,150 320,180 0,180" fill="#ff4818" opacity="0.75"/>
      <polygon points="50,180 90,85 130,180" fill="#180604"/>
      <polygon points="190,180 230,75 270,180" fill="#200806"/>
      <!-- Cracking Ash Plates -->
      <path d="M40,130 L90,105 L150,135 L210,100 L270,140" stroke="#ff8040" stroke-width="3" fill="none"/>
      <!-- Volcanic Plume & Embers -->
      <ellipse cx="160" cy="40" rx="36" ry="24" fill="#ff7040" opacity="0.3"/>
      <circle cx="110" cy="65" r="2" fill="#ffd090"/>
      <circle cx="210" cy="55" r="2.5" fill="#ffd090"/>`,
  },
  mirrorfen: {
    top: "#082424", bot: "#020f0f",
    art: (h) => `
      <!-- Dual Silver Moons -->
      <circle cx="130" cy="40" r="18" fill="#e8ffff" opacity="0.85"/>
      <circle cx="190" cy="35" r="14" fill="${h}" opacity="0.65"/>
      <!-- Chrome Obelisks -->
      <polygon points="50,180 80,65 110,180" fill="#082828" stroke="#ffffff" stroke-width="1"/>
      <polygon points="210,180 240,65 270,180" fill="#082828" stroke="#ffffff" stroke-width="1"/>
      <!-- Endless Inverted Water Horizon -->
      <line x1="0" y1="120" x2="320" y2="120" stroke="${h}" stroke-width="2"/>
      <polygon points="80,120 160,145 240,120 160,95" fill="rgba(232,255,248,0.3)" stroke="#fff" stroke-width="1.5"/>`,
  },
  zephyrrow: {
    top: "#081e38", bot: "#020a16",
    art: (h) => `
      <!-- Supersonic Wind Vortices -->
      <path d="M-20,60 Q80,30 180,60 T340,40" fill="none" stroke="${h}" stroke-width="4" opacity="0.6"/>
      <path d="M-20,90 Q120,60 220,90 T340,75" fill="none" stroke="#ffffff" stroke-width="2.5" opacity="0.75"/>
      <!-- High-Altitude Cloud Citadel -->
      <polygon points="120,180 160,70 200,180" fill="#0d2848" stroke="${h}" stroke-width="1"/>
      <!-- Directional Arrow Fleet -->
      <polygon points="145,95 175,110 145,125 155,110" fill="#ffffff"/>
      <circle cx="70" cy="80" r="2" fill="#d0eeff"/>`,
  },
  brasslock: {
    top: "#301e04", bot: "#100a01",
    art: (h) => `
      <!-- Subterranean Vault Gate -->
      <circle cx="160" cy="85" r="45" fill="none" stroke="${h}" stroke-width="7"/>
      <circle cx="160" cy="85" r="28" fill="none" stroke="#fff2b0" stroke-width="2.5"/>
      <!-- Heavy Gear Teeth -->
      <rect x="154" y="32" width="12" height="14" fill="${h}"/>
      <rect x="154" y="124" width="12" height="14" fill="${h}"/>
      <rect x="107" y="79" width="14" height="12" fill="${h}"/>
      <rect x="199" y="79" width="14" height="12" fill="${h}"/>
      <!-- Heavy Brass Vault Columns -->
      <polygon points="20,180 45,60 70,180" fill="#201404"/>
      <polygon points="250,180 275,60 300,180" fill="#201404"/>`,
  },
  hollowmere: {
    top: "#260618", bot: "#0c0208",
    art: (h) => `
      <!-- Nightmare Dimensional Singularity -->
      <ellipse cx="160" cy="70" rx="42" ry="42" fill="#050104"/>
      <circle cx="160" cy="70" r="46" fill="none" stroke="${h}" stroke-width="4.5"/>
      <circle cx="160" cy="70" r="30" fill="none" stroke="#ff5090" stroke-width="1.8"/>
      <!-- Void Tentacle Tears -->
      <path d="M120,80 Q90,50 60,70" stroke="${h}" stroke-width="3" fill="none"/>
      <path d="M200,80 Q230,50 260,70" stroke="${h}" stroke-width="3" fill="none"/>
      <!-- Fractured Obsidian Shards -->
      <polygon points="60,180 110,120 160,180" fill="#14040d"/>
      <polygon points="160,180 210,120 260,180" fill="#14040d"/>`,
  },
  prismarch: {
    top: "#260830", bot: "#0e0212",
    art: (h) => `
      <!-- Laser Refraction Prism Tower -->
      <polygon points="160,30 215,150 105,150" fill="rgba(240,160,255,0.2)" stroke="${h}" stroke-width="2"/>
      <!-- Spectral Rainbow Laser Beams -->
      <line x1="0" y1="80" x2="160" y2="80" stroke="#ffffff" stroke-width="3"/>
      <line x1="160" y1="80" x2="320" y2="40" stroke="#ff4080" stroke-width="2.5"/>
      <line x1="160" y1="80" x2="320" y2="80" stroke="#ffd040" stroke-width="2.5"/>
      <line x1="160" y1="80" x2="320" y2="120" stroke="#40e0ff" stroke-width="2.5"/>
      <!-- Crystal Spire Facets -->
      <polygon points="160,30 185,150 160,170 135,150" fill="#f8c8ff" opacity="0.6"/>`,
  },
  auroraloom: {
    top: "#041e26", bot: "#020c10",
    art: (h) => `
      <!-- Roaring Arctic Aurora Curtain -->
      <path d="M-20,40 Q60,10 160,50 T340,30" fill="none" stroke="#50ffb0" stroke-width="6" opacity="0.6"/>
      <path d="M-20,60 Q80,30 180,70 T340,50" fill="none" stroke="${h}" stroke-width="5" opacity="0.6"/>
      <!-- Heart Relic Beacon -->
      <path d="M160,95 C160,80 140,80 140,95 C140,110 160,125 160,125 C160,125 180,110 180,95 C180,80 160,80 160,95" fill="#ff4070" stroke="#fff" stroke-width="1.5"/>
      <!-- Glacier Peaks -->
      <polygon points="20,180 75,100 130,180" fill="#06222c"/>
      <polygon points="190,180 245,100 300,180" fill="#06222c"/>`,
  },
  rootspire: {
    top: "#0a2214", bot: "#030e06",
    art: (h) => `
      <!-- Gargantuan Emerald Crystal Geodes -->
      <polygon points="160,25 185,130 160,165 135,130" fill="${h}" stroke="#ffffff" stroke-width="1.5"/>
      <polygon points="70,180 105,75 140,180" fill="#082012"/>
      <polygon points="180,180 215,75 250,180" fill="#0c2e1a"/>
      <!-- Bio-Electric Root Pulses -->
      <path d="M160,140 Q110,155 70,180" stroke="${h}" stroke-width="2.5" fill="none"/>
      <path d="M160,140 Q210,155 250,180" stroke="${h}" stroke-width="2.5" fill="none"/>
      <circle cx="160" cy="25" r="4" fill="#e8ffc8"/>`,
  },
  stormglass: {
    top: "#06142a", bot: "#020812",
    art: (h) => `
      <!-- Violent Electric Lightning Bolts -->
      <path d="M150,10 L130,60 L160,60 L135,115" stroke="#ffffff" stroke-width="3" fill="none"/>
      <path d="M150,10 L130,60 L160,60 L135,115" stroke="${h}" stroke-width="6" fill="none" opacity="0.4"/>
      <!-- Tempestuous Shattered Floating Monoliths -->
      <polygon points="30,180 65,110 100,180" fill="#0c1e38"/>
      <polygon points="220,180 255,105 290,180" fill="#0c1e38"/>
      <polygon points="120,170 160,120 200,170" fill="#122c50" stroke="${h}" stroke-width="1"/>`,
  },
  duskforge: {
    top: "#300612", bot: "#100206",
    art: (h) => `
      <!-- Cyber-Industrial Titan Forge -->
      <ellipse cx="160" cy="45" r="32" fill="#ff4060" opacity="0.3"/>
      <rect x="135" y="70" width="50" height="40" fill="#1e060d" stroke="${h}" stroke-width="2"/>
      <!-- Molten Metal Cascades -->
      <line x1="145" y1="110" x2="145" y2="180" stroke="#ff9030" stroke-width="4"/>
      <line x1="175" y1="110" x2="175" y2="180" stroke="#ff9030" stroke-width="4"/>
      <!-- Anvil Spire Silhouettes -->
      <polygon points="30,180 70,85 110,180" fill="#18040a"/>
      <polygon points="210,180 250,85 290,180" fill="#18040a"/>
      <!-- Rising Sparks -->
      <circle cx="140" cy="50" r="1.5" fill="#fff5cc"/>
      <circle cx="180" cy="40" r="2" fill="#fff5cc"/>`,
  },
};

function lumoraBrandEmblem() {
  return `<div class="brand-emblem" aria-hidden="true">
    <svg viewBox="0 0 100 100" class="brand-mascot-svg">
      <defs>
        <radialGradient id="emblemGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="var(--rim, #ffd0a0)" stop-opacity="0.6"/>
          <stop offset="60%" stop-color="var(--accent, #ff9a4a)" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
        <radialGradient id="wispBody" cx="38%" cy="32%" r="55%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="35%" stop-color="#fff0d0"/>
          <stop offset="70%" stop-color="var(--accent, #ff9a4a)"/>
          <stop offset="100%" stop-color="var(--accent-deep, #d45a28)"/>
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="50" rx="42" ry="16" fill="none" stroke="var(--rim, #ffd0a0)" stroke-width="1.8" stroke-dasharray="8 4" opacity="0.6" transform="rotate(-15 50 50)"/>
      <circle cx="50" cy="50" r="44" fill="url(#emblemGlow)"/>
      <ellipse cx="38" cy="24" rx="7" ry="14" fill="#ffd0a0" transform="rotate(-20 38 24)"/>
      <ellipse cx="38" cy="24" rx="3.5" ry="9" fill="#fff5ea" transform="rotate(-20 38 24)"/>
      <ellipse cx="62" cy="24" rx="7" ry="14" fill="#ffd0a0" transform="rotate(20 62 24)"/>
      <ellipse cx="62" cy="24" rx="3.5" ry="9" fill="#fff5ea" transform="rotate(20 62 24)"/>
      <ellipse cx="50" cy="54" rx="26" ry="29" fill="url(#wispBody)"/>
      <ellipse cx="43" cy="42" rx="8" ry="4" fill="#ffffff" opacity="0.6" transform="rotate(-25 43 42)"/>
      <circle cx="43" cy="54" r="3.2" fill="#180e14"/>
      <circle cx="57" cy="54" r="3.2" fill="#180e14"/>
      <circle cx="44.2" cy="52.8" r="1.1" fill="#ffffff"/>
      <circle cx="58.2" cy="52.8" r="1.1" fill="#ffffff"/>
      <path d="M48,60 Q50,62.5 52,60" fill="none" stroke="var(--accent-deep, #d45a28)" stroke-width="1.4" stroke-linecap="round"/>
      <polygon points="18,34 20,38 24,40 20,42 18,46 16,42 12,40 16,38" fill="#ffeaa0" opacity="0.85"/>
      <polygon points="82,48 83.5,51 86.5,52.5 83.5,54 82,57 80.5,54 77.5,52.5 80.5,51" fill="#ffeaa0" opacity="0.85"/>
    </svg>
  </div>`;
}

function renderCosmeticPreview(c, isEquipped = false, isOwned = false) {
  if (!c) return "";
  const type = c.type;
  let art = "";

  if (type === "body") {
    const col = c.color || "#ff9a4a";
    const glow = c.glow || "#ffe49e";
    let earArt = "";
    if (c.id === "nuri-tide") {
      earArt = `<ellipse cx="28" cy="30" rx="5" ry="14" fill="#40d6ca" opacity="0.9" transform="rotate(-35 28 30)"/>
                <ellipse cx="72" cy="30" rx="5" ry="14" fill="#40d6ca" opacity="0.9" transform="rotate(35 72 30)"/>`;
    } else if (c.id === "nuri-dusk") {
      earArt = `<path d="M36,36 Q18,12 28,34" fill="#c68cf4"/>
                <path d="M64,36 Q82,12 72,34" fill="#c68cf4"/>`;
    } else if (c.id === "nuri-leaf") {
      earArt = `<ellipse cx="34" cy="22" rx="4.5" ry="11" fill="#9cd646" transform="rotate(-25 34 22)"/>
                <ellipse cx="66" cy="22" rx="4.5" ry="11" fill="#9cd646" transform="rotate(25 66 22)"/>
                <line x1="34" y1="16" x2="34" y2="28" stroke="#387818" stroke-width="1"/>
                <line x1="66" y1="16" x2="66" y2="28" stroke="#387818" stroke-width="1"/>`;
    } else if (c.id === "nuri-star") {
      earArt = `<ellipse cx="50" cy="26" rx="34" ry="10" fill="none" stroke="#b4d2ff" stroke-width="2" opacity="0.9"/>
                <circle cx="78" cy="26" r="3" fill="#ffffff"/>`;
    } else if (c.id === "nuri-pyra") {
      earArt = `<path d="M36,32 Q24,10 32,8 Q40,16 39,32 Z" fill="#ffaa20"/>
                <path d="M64,32 Q76,10 68,8 Q60,16 61,32 Z" fill="#ffaa20"/>`;
    } else if (c.id === "nuri-zephyr") {
      earArt = `<ellipse cx="22" cy="42" rx="5" ry="16" fill="#80d8ff" opacity="0.9" transform="rotate(-60 22 42)"/>
                <ellipse cx="78" cy="42" rx="5" ry="16" fill="#80d8ff" opacity="0.9" transform="rotate(60 78 42)"/>`;
    } else if (c.id === "nuri-solas") {
      earArt = `<polygon points="50,10 53,24 47,24" fill="#ffd840"/>
                <polygon points="36,14 44,25 39,27" fill="#ffd840"/>
                <polygon points="64,14 61,27 56,25" fill="#ffd840"/>`;
    } else {
      earArt = `<ellipse cx="36" cy="24" rx="6" ry="13" fill="#ffd0a0" transform="rotate(-20 36 24)"/>
                <ellipse cx="64" cy="24" rx="6" ry="13" fill="#ffd0a0" transform="rotate(20 64 24)"/>
                <ellipse cx="36" cy="24" rx="3" ry="8" fill="#fff5ea" transform="rotate(-20 36 24)"/>
                <ellipse cx="64" cy="24" rx="3" ry="8" fill="#fff5ea" transform="rotate(20 64 24)"/>`;
    }

    art = `<svg viewBox="0 0 100 100" class="cos-preview-svg">
      <defs>
        <radialGradient id="charHalo-${c.id}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="${col}" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="transparent"/>
        </radialGradient>
        <radialGradient id="charBody-${c.id}" cx="38%" cy="35%" r="55%">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="40%" stop-color="${glow}"/>
          <stop offset="100%" stop-color="${col}"/>
        </radialGradient>
      </defs>
      <circle cx="50" cy="52" r="38" fill="url(#charHalo-${c.id})"/>
      ${earArt}
      <ellipse cx="50" cy="54" rx="24" ry="27" fill="url(#charBody-${c.id})"/>
      <ellipse cx="44" cy="44" rx="6" ry="3" fill="#ffffff" opacity="0.6" transform="rotate(-25 44 44)"/>
      <circle cx="43" cy="53" r="2.8" fill="#140c16"/>
      <circle cx="57" cy="53" r="2.8" fill="#140c16"/>
      <circle cx="44" cy="52" r="0.9" fill="#ffffff"/>
      <circle cx="58" cy="52" r="0.9" fill="#ffffff"/>
    </svg>`;
  } else if (type === "wake") {
    const isSparks = c.id === "wake-sparks";
    const isPetals = c.id === "wake-petals";
    art = `<svg viewBox="0 0 100 100" class="cos-preview-svg">
      <path d="M15,75 Q50,25 85,45" fill="none" stroke="var(--accent)" stroke-width="4" stroke-linecap="round" opacity="0.6"/>
      ${isPetals ? `
        <circle cx="35" cy="50" r="4" fill="#ffb4c8"/>
        <circle cx="55" cy="35" r="4.5" fill="#ff8aa8"/>
        <circle cx="75" cy="42" r="3.5" fill="#ffd0e0"/>
      ` : isSparks ? `
        <circle cx="25" cy="65" r="2.5" fill="#fff5aa"/>
        <circle cx="42" cy="44" r="3" fill="#ffe488"/>
        <circle cx="62" cy="32" r="3.5" fill="#ffffff"/>
        <circle cx="80" cy="44" r="2.5" fill="#ffd070"/>
      ` : `
        <path d="M15,75 Q50,25 85,45" fill="none" stroke="#fff5ea" stroke-width="2" stroke-linecap="round"/>
      `}
    </svg>`;
  } else if (type === "mote") {
    const isRings = c.id === "mote-rings";
    art = `<svg viewBox="0 0 100 100" class="cos-preview-svg">
      ${isRings ? `
        <circle cx="50" cy="50" r="16" fill="none" stroke="var(--rim)" stroke-width="2.2" opacity="0.9"/>
        <circle cx="50" cy="50" r="28" fill="none" stroke="var(--accent)" stroke-width="1.8" opacity="0.6"/>
        <circle cx="50" cy="50" r="38" fill="none" stroke="var(--accent)" stroke-width="1" opacity="0.3"/>
      ` : `
        <circle cx="35" cy="45" r="6" fill="#ffffff" opacity="0.9"/>
        <circle cx="35" cy="45" r="12" fill="var(--accent)" opacity="0.3"/>
        <circle cx="65" cy="40" r="7" fill="#ffffff" opacity="0.9"/>
        <circle cx="65" cy="40" r="14" fill="var(--accent)" opacity="0.3"/>
        <circle cx="50" cy="68" r="5" fill="#ffffff" opacity="0.8"/>
      `}
    </svg>`;
  } else if (type === "burst") {
    const isConst = c.id === "burst-constellation";
    art = `<svg viewBox="0 0 100 100" class="cos-preview-svg">
      ${isConst ? `
        <line x1="25" y1="35" x2="50" y2="25" stroke="rgba(255,255,255,0.5)" stroke-width="1.2"/>
        <line x1="50" y1="25" x2="75" y2="40" stroke="rgba(255,255,255,0.5)" stroke-width="1.2"/>
        <line x1="50" y1="25" x2="50" y2="70" stroke="rgba(255,255,255,0.5)" stroke-width="1.2"/>
        <circle cx="25" cy="35" r="3" fill="#ffffff"/>
        <circle cx="50" cy="25" r="4.5" fill="#ffe488"/>
        <circle cx="75" cy="40" r="3" fill="#ffffff"/>
        <circle cx="50" cy="70" r="4" fill="#a8d4ff"/>
      ` : `
        <circle cx="50" cy="50" r="28" fill="none" stroke="var(--rim)" stroke-width="2"/>
        <circle cx="50" cy="50" r="14" fill="var(--accent)" opacity="0.7"/>
        <circle cx="50" cy="50" r="5" fill="#ffffff"/>
      `}
    </svg>`;
  } else {
    const isAurora = c.id === "sky-aurora";
    art = `<svg viewBox="0 0 100 100" class="cos-preview-svg">
      <defs>
        <linearGradient id="skyGrad-${c.id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${isAurora ? "#143048" : "#241628"}"/>
          <stop offset="100%" stop-color="${isAurora ? "#08101e" : "#0c0812"}"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" rx="14" fill="url(#skyGrad-${c.id})"/>
      ${isAurora ? `
        <path d="M10,40 Q40,15 70,35 T100,20 L100,70 L0,70 Z" fill="#48d8d0" opacity="0.35"/>
        <path d="M0,50 Q30,30 60,45 T100,35 L100,75 L0,75 Z" fill="#c890f0" opacity="0.35"/>
      ` : `
        <circle cx="30" cy="35" r="1.5" fill="#ffffff" opacity="0.8"/>
        <circle cx="70" cy="25" r="2" fill="#ffd0a0" opacity="0.9"/>
        <circle cx="80" cy="65" r="1.5" fill="#ffffff" opacity="0.7"/>
      `}
    </svg>`;
  }

  return `<div class="cos-preview-box">
    ${art}
    ${isEquipped ? `<span class="equipped-badge">EQUIPPED</span>` : isOwned ? `<span class="owned-badge">OWNED</span>` : `<span class="lock-badge">🔒</span>`}
  </div>`;
}

function getMechanicGuide(kind) {
  const guides = {
    restore: "Glide across sleeping tiles to ignite them with radiant golden wake.",
    well: "Glide into the fountain well to replenish its celestial water.",
    seal: "Awaken the blossom crystal to shatter the golden lock rings.",
    vane: "Ride into spinning vanes to redirect your gliding velocity.",
    fold: "Step into paired foldgates to warp instantly through space.",
    fracture: "Ash plates crack and plunge into the abyss once you depart.",
    mirror: "Strike silver mirrors to reflect your glide at crisp 90° angles.",
    oneway: "Arrows enforce flow. You can only glide with the direction of wind.",
    rift: "Avoid void tears at all costs. Hitting a rift resets the lattice.",
    sequence: "Awaken numbered pillars in strict numerical sequence (1 → 2 → 3).",
    heart: "Discover the concealed beating heart at the lattice center.",
    pillar: "Thread between solid ancient crystal spires to change direction.",
    storm: "Ride gale currents while steering away from violent void rifts.",
    forge: "Navigate fragile crumbling plates surrounded by dangerous tears.",
  };
  return guides[kind] || "Restore 100% of the platform tiles to complete the sector.";
}

function introArt(kind) {
  const scenes = {
    restore: `<svg viewBox="0 0 220 130" class="intro-svg">
      <defs>
        <linearGradient id="tileGlow" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe494"/><stop offset="1" stop-color="#ff9a4a"/></linearGradient>
      </defs>
      <!-- Isometric Platform Tiles -->
      <polygon points="15,85 50,68 85,85 50,102" fill="#ffb86a"/>
      <polygon points="75,85 110,68 145,85 110,102" class="demo-tile-2" fill="#ffb86a"/>
      <polygon points="135,85 170,68 205,85 170,102" class="demo-tile-3" fill="#ffb86a"/>
      <!-- Glowing Tile Tops -->
      <polygon points="15,80 50,63 85,80 50,97" fill="url(#tileGlow)"/>
      <polygon points="75,80 110,63 145,80 110,97" class="demo-tile-top-2" fill="url(#tileGlow)"/>
      <polygon points="135,80 170,63 205,80 170,97" class="demo-tile-top-3" fill="url(#tileGlow)"/>
      <!-- Animated Gliding Spirit -->
      <g class="demo-spirit-glide">
        <circle cx="0" cy="0" r="14" fill="#ffffff" opacity="0.3"/>
        <circle cx="0" cy="0" r="10" fill="#fff2da"/>
        <circle cx="0" cy="0" r="6" fill="#ff9a4a"/>
        <circle cx="-3" cy="-1" r="1.5" fill="#1c1218"/>
        <circle cx="3" cy="-1" r="1.5" fill="#1c1218"/>
      </g>
    </svg>`,

    well: `<svg viewBox="0 0 220 130" class="intro-svg">
      <!-- Tile -->
      <polygon points="65,95 110,75 155,95 110,115" fill="#163440"/>
      <polygon points="65,90 110,70 155,90 110,110" fill="#1e3c48"/>
      <!-- Well Rim & Pool -->
      <ellipse cx="110" cy="90" rx="30" ry="15" fill="#0b2430" stroke="#48d8d0" stroke-width="2"/>
      <ellipse cx="110" cy="90" rx="20" ry="10" fill="#38b8b0"/>
      <!-- Animated Water Ripples -->
      <ellipse cx="110" cy="90" rx="10" ry="5" class="demo-ripple-1" fill="none" stroke="#e8fffc" stroke-width="2"/>
      <ellipse cx="110" cy="90" rx="18" ry="9" class="demo-ripple-2" fill="none" stroke="#7ef0e0" stroke-width="1.5"/>
      <!-- Spirit on Well -->
      <g transform="translate(110, 78)">
        <circle cx="0" cy="0" r="11" fill="#c4fffa"/>
        <circle cx="0" cy="0" r="7" fill="#48d8d0"/>
      </g>
    </svg>`,

    seal: `<svg viewBox="0 0 220 130" class="intro-svg">
      <!-- Left Blossom Tile -->
      <polygon points="25,90 60,72 95,90 60,108" fill="#322448"/>
      <polygon points="25,85 60,67 95,85 60,103" fill="#c890f0"/>
      <circle cx="60" cy="85" r="7" fill="#ffffff"/>
      <!-- Right Gate Tile with Ring Lock -->
      <polygon points="125,90 160,72 195,90 160,108" fill="#201430"/>
      <polygon points="125,85 160,67 195,85 160,103" fill="#4a2e68"/>
      <!-- Unlocking Seal Ring -->
      <g class="demo-seal-ring">
        <circle cx="160" cy="80" r="16" fill="none" stroke="#ffc233" stroke-width="3"/>
        <circle cx="160" cy="80" r="10" fill="none" stroke="#fff" stroke-width="1"/>
        <rect x="156" y="76" width="8" height="9" rx="2" fill="#ffc233"/>
      </g>
      <!-- Beam shooting from blossom to seal -->
      <line x1="60" y1="85" x2="160" y2="80" stroke="#ffd0a0" stroke-width="2" stroke-dasharray="4 4" class="demo-beam"/>
    </svg>`,

    vane: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="65,95 110,75 155,95 110,115" fill="#1c3024"/>
      <polygon points="65,90 110,70 155,90 110,110" fill="#a8e050"/>
      <!-- Spinning Vane Arrow -->
      <g class="demo-vane-spin" transform="translate(110, 90)">
        <circle cx="0" cy="0" r="18" fill="none" stroke="#589828" stroke-width="2"/>
        <polygon points="0,-16 12,8 -12,8" fill="#ffffff" stroke="#243c2c" stroke-width="1.5"/>
      </g>
      <!-- Glide path turn -->
      <path d="M110,35 L110,90 L175,90" fill="none" stroke="#e0ffb0" stroke-width="2.5" stroke-dasharray="6 4" class="demo-turn-path"/>
    </svg>`,

    fold: `<svg viewBox="0 0 220 130" class="intro-svg">
      <!-- Portal 1 -->
      <ellipse cx="60" cy="85" rx="22" ry="32" class="demo-portal-1" fill="none" stroke="#88a8ff" stroke-width="3.5"/>
      <ellipse cx="60" cy="85" rx="14" ry="22" fill="#141e38"/>
      <!-- Portal 2 -->
      <ellipse cx="160" cy="85" rx="22" ry="32" class="demo-portal-2" fill="none" stroke="#88a8ff" stroke-width="3.5"/>
      <ellipse cx="160" cy="85" rx="14" ry="22" fill="#141e38"/>
      <!-- Teleporting Arc -->
      <path d="M60,65 Q110,25 160,65" fill="none" stroke="#f0f4ff" stroke-width="2" stroke-dasharray="4 4" class="demo-warp-arc"/>
      <!-- Teleporting Nuri -->
      <circle cx="60" cy="85" r="9" class="demo-nuri-teleport" fill="#fff"/>
    </svg>`,

    fracture: `<svg viewBox="0 0 220 130" class="intro-svg">
      <!-- Stable Tile -->
      <polygon points="25,90 60,72 95,90 60,108" fill="#3a221c"/>
      <polygon points="25,85 60,67 95,85 60,103" fill="#ff9a60"/>
      <!-- Crumbling Ash Tile -->
      <g class="demo-crumble-tile">
        <polygon points="125,90 160,72 195,90 160,108" fill="#20100e"/>
        <polygon points="125,85 160,67 195,85 160,103" fill="#ff7040"/>
        <line x1="140" y1="75" x2="165" y2="92" stroke="#fff" stroke-width="1.8"/>
        <line x1="155" y1="80" x2="148" y2="98" stroke="#fff" stroke-width="1.8"/>
      </g>
    </svg>`,

    mirror: `<svg viewBox="0 0 220 130" class="intro-svg">
      <!-- Mirror Prism Tile -->
      <polygon points="65,95 110,75 155,95 110,115" fill="#163030"/>
      <polygon points="65,90 110,70 155,90 110,110" fill="#9ee0d0"/>
      <!-- Silver Reflective Prism -->
      <polygon points="100,85 120,70 120,95 100,110" fill="#ffffff" stroke="#388888" stroke-width="1.5"/>
      <!-- Reflection Path -->
      <path d="M35,115 L110,90 L185,55" fill="none" stroke="#fff" stroke-width="2.8" stroke-dasharray="5 5" class="demo-reflect-beam"/>
      <circle cx="110" cy="90" r="8" fill="#ffffff" class="demo-flash"/>
    </svg>`,

    oneway: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="65,95 110,75 155,95 110,115" fill="#163044"/>
      <polygon points="65,90 110,70 155,90 110,110" fill="#7ec8ff"/>
      <!-- Directional Wind Arrows -->
      <g class="demo-wind-arrows" stroke="#ffffff" stroke-width="2.5" fill="none" stroke-linecap="round">
        <path d="M90,95 L105,87 L90,79"/>
        <path d="M105,95 L120,87 L105,79"/>
        <path d="M120,95 L135,87 L120,79"/>
      </g>
    </svg>`,

    rift: `<svg viewBox="0 0 220 130" class="intro-svg">
      <ellipse cx="110" cy="75" rx="45" ry="24" fill="#180c14" stroke="#c07090" stroke-width="1"/>
      <!-- Swirling Void Rift -->
      <g class="demo-rift-swirl">
        <ellipse cx="110" cy="75" rx="30" ry="14" fill="#080206" stroke="#f0a0b8" stroke-width="2.5"/>
        <path d="M90,75 Q110,60 130,75 T110,90 Z" fill="#903050"/>
      </g>
      <!-- Safe Perimeter Path -->
      <path d="M45,75 Q110,35 175,75" fill="none" stroke="#ffe8a8" stroke-width="2.2" stroke-dasharray="4 4"/>
    </svg>`,

    sequence: `<svg viewBox="0 0 220 130" class="intro-svg">
      <!-- 3 Numbered Beacons -->
      <g transform="translate(45, 80)">
        <polygon points="-25,10 0,-5 25,10 0,25" class="demo-seq-1" fill="#ff9a4a"/>
        <text x="0" y="14" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">1</text>
      </g>
      <g transform="translate(110, 70)">
        <polygon points="-25,10 0,-5 25,10 0,25" class="demo-seq-2" fill="#4a3030"/>
        <text x="0" y="14" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">2</text>
      </g>
      <g transform="translate(175, 60)">
        <polygon points="-25,10 0,-5 25,10 0,25" class="demo-seq-3" fill="#4a3030"/>
        <text x="0" y="14" text-anchor="middle" font-size="12" font-weight="800" fill="#fff">3</text>
      </g>
    </svg>`,

    heart: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="65,95 110,75 155,95 110,115" fill="#143040"/>
      <polygon points="65,90 110,70 155,90 110,110" fill="#80e0ff"/>
      <!-- Glowing Radiant Heart -->
      <path d="M110,88 C110,76 94,76 94,88 C94,100 110,112 110,112 C110,112 126,100 126,88 C126,76 110,76 110,88" class="demo-heart-pulse" fill="#ff4080" stroke="#fff" stroke-width="2"/>
    </svg>`,

    pillar: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="65,95 110,75 155,95 110,115" fill="#1c3828"/>
      <!-- Tall Crystal Obelisk Anchor -->
      <polygon points="110,25 125,85 110,105 95,85" fill="#6ecf7a" stroke="#fff" stroke-width="1.5"/>
      <line x1="110" y1="25" x2="110" y2="105" stroke="#fff" stroke-width="1"/>
      <circle cx="110" cy="25" r="3" fill="#e8ffc8"/>
    </svg>`,

    storm: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="65,95 110,75 155,95 110,115" fill="#142438"/>
      <polygon points="65,90 110,70 155,90 110,110" fill="#6aa8ff"/>
      <path d="M90,92 L105,84 L90,76" stroke="#fff" stroke-width="2.5" fill="none"/>
      <ellipse cx="155" cy="70" rx="18" ry="9" fill="#080206" stroke="#ff6080" stroke-width="2"/>
    </svg>`,

    forge: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="35,90 70,72 105,90 70,108" fill="#ff6080"/>
      <g class="demo-crumble-tile">
        <polygon points="115,90 150,72 185,90 150,108" fill="#ff90a8"/>
        <line x1="130" y1="80" x2="155" y2="95" stroke="#fff" stroke-width="2"/>
      </g>
    </svg>`,
  };
  return scenes[kind] || scenes.restore;
}

export const UI_CSS = `
:root {
  --accent: #ff9a4a;
  --accent-deep: #d45a28;
  --ink: #fff4ea;
  --rim: #ffd0a0;
  --floor-lit: #ffb86a;
  --sky: #3d241f;
  --sky-top: #1c1218;
  --panel: rgba(22, 16, 28, 0.92);
  --panel-border: rgba(255,255,255,0.14);
}

#ui {
  font-family: "Sora", "Trebuchet MS", sans-serif;
  pointer-events: none;
  color: var(--ink);
}

/* Fluid Smooth Theme Color Transitions */
.btn.primary, .screen, .panel, .card, .logo-mark, .lvl.done, .gleam-chip, .ach-medal, .cat-tab.active {
  transition: background 0.75s cubic-bezier(0.16, 1, 0.3, 1),
              color 0.75s ease,
              border-color 0.75s ease,
              box-shadow 0.75s ease;
}

.screen, .hud-top, .panel, .toast, .iconbtn, .btn, .card, .lvl, .form, .topbar,
.buy-overlay, .settings-wrap, .gleam-chip, .seg-btn, .switch, .cat-tab {
  pointer-events: auto;
}

.screen {
  position: absolute; inset: 0;
  padding: max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left));
  display: flex; flex-direction: column; gap: 12px;
  min-height: 0; box-sizing: border-box;
}

.scroll-screen {
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
}

.center { align-items: center; justify-content: center; text-align: center; }
.dim { background: rgba(6, 4, 12, 0.65); backdrop-filter: blur(10px); align-items: center; justify-content: center; }

.panel {
  width: min(420px, 92vw);
  max-height: min(88vh, 680px);
  overflow-y: auto;
  background: linear-gradient(165deg, rgba(38, 28, 48, 0.96), rgba(16, 12, 24, 0.98));
  border: 1px solid var(--panel-border);
  border-radius: 26px;
  padding: 24px;
  display: flex; flex-direction: column; gap: 14px;
  box-shadow: 0 24px 64px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,0.08);
  position: relative; z-index: 8;
}

.menu { justify-content: center; align-items: center; }
.brand { text-align: center; margin-bottom: 12px; }

.logo {
  font-family: "Fraunces", Georgia, serif;
  font-size: clamp(34px, 9vw, 56px);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin: 12px 0 0;
  font-weight: 700;
  background: linear-gradient(180deg, #ffffff, var(--rim));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 2px 12px rgba(0,0,0,0.4));
}
.logo.small { font-size: clamp(26px, 7vw, 42px); letter-spacing: 0.08em; }

.eyebrow { margin: 0; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; opacity: 0.7; font-weight: 700; }
.lede { opacity: 0.86; max-width: 34ch; margin: 8px auto; line-height: 1.5; font-size: 15px; }
.lede.slim { margin: 0 0 4px; max-width: none; text-align: left; opacity: 0.76; font-size: 13px; }
.muted, .tiny { opacity: 0.68; font-size: 13px; }
.top-spacer { width: 44px; }

/* Proper Gem Chip */
.gleam-chip {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 14px 6px 10px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 214, 120, 0.4);
  font-size: 13px; font-weight: 600; color: var(--ink);
  box-shadow: 0 0 20px color-mix(in srgb, #f5c84a 25%, transparent);
  backdrop-filter: blur(8px);
}
.gleam-chip b { font-size: 16px; color: #ffe694; font-weight: 800; }
.gleam-chip span { opacity: 0.82; font-weight: 600; font-size: 12px; }
.gem-ico { display: block; flex: 0 0 auto; filter: drop-shadow(0 2px 5px rgba(0,0,0,0.4)); }

.menu-footer {
  margin-top: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-wrap: wrap;
}

.logo-mark {
  width: 64px; height: 68px; margin: 0 auto;
  background: radial-gradient(circle at 35% 30%, #fff6de, var(--accent) 58%, var(--accent-deep));
  border-radius: 50% 50% 48% 52%;
  position: relative;
  box-shadow: 0 12px 32px rgba(0,0,0,0.45), 0 0 28px color-mix(in srgb, var(--accent) 55%, transparent);
}
.logo-mark:before, .logo-mark:after {
  content: ""; position: absolute; width: 20px; height: 28px;
  background: color-mix(in srgb, var(--accent) 70%, #fff);
  border-radius: 50%; top: -9px;
}
.logo-mark:before { left: 5px; transform: rotate(-18deg); }
.logo-mark:after { right: 5px; transform: rotate(18deg); }
.logo-mark.pulse { animation: pulse 1.8s ease-in-out infinite; }
@keyframes pulse { 50% { transform: scale(1.08); } }

.stack { display: flex; flex-direction: column; gap: 12px; width: min(340px, 90vw); }
.row { display: flex; gap: 10px; }
.row .btn { flex: 1; min-width: 0; }

.btn {
  appearance: none; border: 0; border-radius: 20px; padding: 14px 18px;
  font: inherit; font-weight: 700; color: #1a1420; background: #f0e6d6;
  cursor: pointer; text-align: center;
  box-shadow: 0 4px 14px rgba(0,0,0,0.25);
}
.btn:hover { filter: brightness(1.06); transform: translateY(-1px); }
.btn:active { transform: translateY(1px); }
.btn.primary {
  background: linear-gradient(180deg, var(--rim), var(--accent));
  color: #1a0e0e;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 45%, transparent);
}
.btn.ghost { background: rgba(255, 255, 255, 0.1); color: var(--ink); border: 1px solid rgba(255,255,255,0.08); }
.btn.danger { background: linear-gradient(180deg, #ff7a88, #d82a44); color: #fff; }
.btn.danger-outline { background: transparent; border: 1px solid #d82a44; color: #ff7a88; }
.btn.disabled { opacity: 0.45; cursor: not-allowed; filter: grayscale(0.5); }

.iconbtn {
  width: 44px; height: 44px; flex: 0 0 44px; border: 0; border-radius: 16px;
  background: rgba(255, 255, 255, 0.14); color: #fff; font-weight: 700; cursor: pointer;
  backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center;
  font-size: 18px; border: 1px solid rgba(255,255,255,0.12);
}
.iconbtn:hover { background: rgba(255,255,255,0.22); }

.topbar { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex: 0 0 auto; margin-bottom: 4px; }
.topbar.abs { position: absolute; top: max(16px, env(safe-area-inset-top)); left: 16px; }
.topbar h2 { margin: 0; font-size: clamp(18px, 4.8vw, 22px); letter-spacing: 0.04em; font-family: "Fraunces", Georgia, serif; }

.topbar-right {
  display: flex; align-items: center; gap: 8px; flex-wrap: nowrap;
}

.back-btn {
  display: inline-flex; align-items: center; justify-content: center;
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}
.back-btn:hover {
  transform: translateX(-2px);
  background: rgba(255,255,255,0.24);
  border-color: rgba(255,255,255,0.3);
}
.back-btn:active {
  transform: translateX(-3px) scale(0.96);
}

.star-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 12px 6px 10px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 220, 100, 0.45);
  font-size: 13px; font-weight: 700; color: var(--ink);
  box-shadow: 0 0 16px rgba(255, 208, 84, 0.25);
  backdrop-filter: blur(8px);
}
.star-chip b { color: #ffe694; font-size: 15px; font-weight: 800; }

.cards {
  display: grid; gap: 14px;
  width: 100%; box-sizing: border-box;
  padding-bottom: 24px;
}
.world-grid {
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  align-content: start;
}
.cos-grid { grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)); align-content: start; }
.ach-grid { grid-template-columns: 1fr; align-content: start; gap: 12px; }

.card {
  text-align: left; border-radius: 22px; padding: 16px;
  background: rgba(255, 255, 255, 0.07); color: inherit; cursor: pointer;
  display: flex; flex-direction: column; gap: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 24px rgba(0,0,0,0.22);
}
.card:hover { border-color: rgba(255,255,255,0.22); }

/* AAA World Posters & Cards */
.world-card {
  padding: 0; overflow: hidden; gap: 0; background: #100b14;
  border-radius: 22px; border: 1px solid rgba(255,255,255,0.12);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.world-card:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 16px 40px rgba(0,0,0,0.55);
  border-color: rgba(255,255,255,0.25);
}
.world-card.completed { border-color: color-mix(in srgb, var(--accent) 55%, transparent); }
.world-card.locked { opacity: 0.5; cursor: not-allowed; }
.world-poster { aspect-ratio: 16 / 9; overflow: hidden; background: #06040a; position: relative; }
.poster-svg { width: 100%; height: 100%; display: block; object-fit: cover; }
.world-meta { padding: 14px 16px 16px; display: flex; flex-direction: column; gap: 6px; }
.world-title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.world-name-group { display: flex; flex-direction: column; gap: 2px; }
.world-sector { font-size: 10px; letter-spacing: 0.2em; font-weight: 800; color: var(--rim); opacity: 0.85; }
.world-meta strong { font-size: 16px; font-family: "Fraunces", Georgia, serif; letter-spacing: 0.02em; }
.world-badges-group { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.world-star-badge {
  display: inline-flex; align-items: center; gap: 4px;
  background: rgba(0,0,0,0.4); border: 1px solid rgba(255,214,120,0.3);
  padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; color: #ffe694;
}
.world-star-badge b { color: #ffffff; font-size: 12px; }
.world-count-badge { font-size: 11px; font-weight: 800; padding: 4px 9px; border-radius: 999px; }
.world-count-badge.active { background: rgba(255,255,255,0.12); color: var(--ink); }
.world-count-badge.complete { background: color-mix(in srgb, var(--accent) 25%, transparent); color: var(--rim); border: 1px solid var(--rim); }
.world-count-badge.locked { background: rgba(0,0,0,0.3); opacity: 0.6; }
.world-tagline { font-size: 12px; opacity: 0.75; margin: 0; line-height: 1.4; }
.world-progress-track { height: 6px; border-radius: 99px; background: rgba(255,255,255,0.08); overflow: hidden; margin-top: 6px; }
.world-fill { display: block; height: 100%; border-radius: 99px; box-shadow: 0 0 10px currentColor; }
.sleeping { font-size: 10px; opacity: 0.5; letter-spacing: 0.1em; text-transform: uppercase; }

/* Level Select Grid & Modern 3-Star Cards */
.grid-lvls {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  width: 100%;
  box-sizing: border-box;
  padding-bottom: 24px;
}
.lvl {
  aspect-ratio: 1 / 1;
  min-height: 84px;
  border: 0; border-radius: 22px; overflow: hidden;
  background: linear-gradient(145deg, rgba(255,255,255,0.11), rgba(255,255,255,0.03));
  color: #fff; font-family: "Sora", sans-serif; cursor: pointer; position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  padding: 10px 6px 8px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.15), 0 6px 18px rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.1);
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}
.lvl:hover:not(:disabled) {
  transform: translateY(-3px);
  border-color: rgba(255,255,255,0.28);
  box-shadow: 0 10px 24px rgba(0,0,0,0.4);
}
.lvl:active:not(:disabled) {
  transform: scale(0.96);
}
.lvl-num {
  font-size: 16px; font-weight: 800; letter-spacing: -0.02em;
}
.lvl-stars-row {
  display: flex; align-items: center; justify-content: center; gap: 3px;
  margin: 2px 0;
}
.lvl-best {
  font-size: 10px; font-weight: 700; opacity: 0.85;
  background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.1);
}
.lvl-ready {
  font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--rim);
}
.lvl-lock {
  font-size: 13px; opacity: 0.55;
}
.lvl.done {
  background: linear-gradient(145deg, rgba(255, 184, 106, 0.22), rgba(212, 90, 40, 0.14));
  border-color: color-mix(in srgb, var(--accent) 60%, transparent);
  box-shadow: 0 6px 18px color-mix(in srgb, var(--accent) 25%, transparent);
}
.lvl.done .lvl-num {
  color: #ffe8b0;
}
.lvl.locked {
  opacity: 0.4; cursor: not-allowed;
  background: rgba(255,255,255,0.02);
}

/* Completion Stars & Reward Celebration */
.complete-panel {
  text-align: center;
  align-items: center;
}
.completion-stars-showcase {
  display: flex; align-items: flex-end; justify-content: center; gap: 14px;
  margin: 10px 0 6px; height: 60px;
}
.comp-star {
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.comp-star.center-star {
  transform: translateY(-6px);
}
.comp-star.awarded {
  filter: drop-shadow(0 0 16px rgba(255, 208, 84, 0.6));
}
.comp-star.pulse-1 { animation: starPop 0.5s ease 0.1s backwards; }
.comp-star.pulse-2 { animation: starPop 0.5s ease 0.3s backwards; }
.comp-star.pulse-3 { animation: starPop 0.5s ease 0.5s backwards; }
@keyframes starPop {
  0% { transform: scale(0) rotate(-25deg); opacity: 0; }
  70% { transform: scale(1.25) rotate(10deg); }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
.star-rating-subtitle {
  font-size: 13px; font-weight: 800; letter-spacing: 0.08em;
  color: #ffe694; text-transform: uppercase;
}
.move-comparison-pill {
  display: inline-flex; align-items: center; gap: 8px;
  background: rgba(0,0,0,0.35); padding: 5px 14px; border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.12); font-size: 12px; margin: 4px 0 2px;
}
.move-comparison-pill b { color: var(--rim); font-weight: 800; }
.move-comparison-pill .divider { opacity: 0.4; }
.star-bonus-badge {
  font-size: 11px; font-weight: 800; letter-spacing: 0.08em;
  color: #ffe694; background: rgba(255,214,120,0.15); padding: 3px 8px; border-radius: 999px;
}

/* HUD Design & Alignment */
.hud { position: absolute; inset: 0; pointer-events: none; }
.hud-top {
  pointer-events: auto; display: flex; align-items: center; justify-content: space-between;
  padding: max(14px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) 0 max(16px, env(safe-area-inset-left));
  gap: 12px;
}
.hud-meta { text-align: center; flex: 1; min-width: 0; }
.hud-subhead { font-size: 10px; letter-spacing: 0.22em; font-weight: 800; opacity: 0.75; text-transform: uppercase; display: block; margin-bottom: 2px; }
.hud-title {
  display: block; font-size: 15px; letter-spacing: 0.02em;
  font-family: "Fraunces", Georgia, serif; margin-bottom: 6px;
  text-shadow: 0 2px 10px rgba(0,0,0,0.6);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.hud-actions { display: flex; align-items: center; gap: 8px; }
.hud-gleam-badge {
  display: flex; align-items: center; gap: 6px; padding: 6px 12px 6px 8px;
  background: rgba(14, 10, 20, 0.75); border: 1px solid rgba(255, 214, 120, 0.4);
  border-radius: 999px; font-size: 13px; font-weight: 800; backdrop-filter: blur(8px);
}
.hud-gleam-badge b { color: #ffe694; font-size: 14px; }
.progress-wrap { max-width: min(280px, 100%); margin: 0 auto; }
.progress-bar {
  height: 8px; border-radius: 99px; overflow: hidden;
  background: rgba(0,0,0,0.45); border: 1px solid rgba(255,255,255,0.15);
}
.progress-bar i {
  display: block; height: 100%; width: 0%;
  background: linear-gradient(90deg, var(--accent-deep), var(--floor-lit));
  box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 60%, transparent);
  transition: width 0.22s ease;
}
.progress-label {
  display: block; margin-top: 5px; font-size: 11px; opacity: 0.88; font-weight: 600;
  text-shadow: 0 1px 6px rgba(0,0,0,0.6);
}

.hint {
  position: absolute; left: 50%; bottom: max(12%, calc(env(safe-area-inset-bottom) + 30px));
  transform: translateX(-50%);
  background: rgba(14, 10, 22, 0.85); padding: 10px 18px; border-radius: 999px;
  font-size: 13px; pointer-events: none; max-width: min(92vw, 440px);
  text-align: center; line-height: 1.35;
  border: 1px solid rgba(255,255,255,0.14);
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.45);
}

.stuck-banner {
  position: absolute; top: calc(max(14px, env(safe-area-inset-top)) + 74px); left: 50%;
  transform: translateX(-50%);
  background: rgba(220, 60, 40, 0.92); border: 1px solid rgba(255, 180, 160, 0.6);
  color: #ffffff; padding: 6px 16px; border-radius: 999px;
  font-size: 12px; font-weight: 700; pointer-events: none;
  box-shadow: 0 4px 20px rgba(220, 60, 40, 0.5);
  animation: stuckPulse 1.2s ease-in-out infinite alternate;
  white-space: nowrap; z-index: 10;
}
@keyframes stuckPulse {
  from { transform: translateX(-50%) scale(0.98); opacity: 0.9; }
  to { transform: translateX(-50%) scale(1.02); opacity: 1; }
}

.stuck-pulse {
  background: linear-gradient(135deg, #ff5040, #ff8060) !important;
  border-color: #ffe0d0 !important;
  animation: restartWiggle 0.8s ease-in-out infinite !important;
  box-shadow: 0 0 20px rgba(255, 80, 60, 0.7) !important;
}
@keyframes restartWiggle {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-12deg); }
  75% { transform: rotate(12deg); }
}

.move-tutorial {
  position: absolute; left: 50%; top: 40%; transform: translate(-50%, -50%);
  background: rgba(16, 12, 24, 0.88); border: 1px solid rgba(255,255,255,0.18);
  border-radius: 20px; padding: 14px 20px; text-align: center;
  backdrop-filter: blur(12px); box-shadow: 0 12px 36px rgba(0,0,0,0.5);
  pointer-events: none; z-index: 10;
}
.keys-row { display: flex; flex-direction: column; align-items: center; gap: 4px; margin-bottom: 8px; }
.keys-sub { display: flex; gap: 4px; }
.key-badge {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px; border-radius: 8px;
  background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.3);
  font-weight: 800; font-size: 13px; color: #fff;
  box-shadow: 0 2px 4px rgba(0,0,0,0.4);
}
.tut-text { font-size: 12px; font-weight: 700; color: var(--rim); opacity: 0.95; }

/* Collection & Wardrobe Chamber */
.col-hero {
  margin-bottom: 6px;
  background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03));
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 24px; padding: 16px;
}
.hero-showcase { display: flex; align-items: center; gap: 16px; }
.hero-nuri {
  width: 60px; height: 64px; border-radius: 50% 50% 46% 54%;
  background: radial-gradient(circle at 35% 30%, #fff6e0, var(--accent) 58%, var(--accent-deep));
  position: relative; flex: 0 0 60px;
  box-shadow: 0 8px 20px rgba(0,0,0,0.4), 0 0 20px color-mix(in srgb, var(--accent) 50%, transparent);
}
.hero-nuri.nuri-tide { filter: hue-rotate(140deg); }
.hero-nuri.nuri-dusk { filter: hue-rotate(250deg); }
.hero-nuri.nuri-leaf { filter: hue-rotate(70deg); }
.hero-nuri.nuri-star { filter: hue-rotate(200deg); }
.hero-meta { flex: 1; min-width: 0; }
.hero-tag { font-size: 9px; letter-spacing: 0.2em; font-weight: 800; color: var(--rim); text-transform: uppercase; }
.hero-meta h3 { margin: 2px 0 3px; font-family: "Fraunces", Georgia, serif; font-size: 17px; }
.hero-sub { margin: 0 0 4px; font-size: 12px; opacity: 0.75; }
.hero-owned-count { font-size: 11px; opacity: 0.6; font-weight: 600; }

.cat-tabs-wrap {
  display: flex; gap: 8px; overflow-x: auto; padding-bottom: 6px;
  -webkit-overflow-scrolling: touch;
}
.cat-tab {
  border: 0; border-radius: 999px; padding: 8px 14px;
  background: rgba(255,255,255,0.08); color: var(--ink);
  font: inherit; font-size: 12px; font-weight: 700; cursor: pointer;
  white-space: nowrap; display: flex; align-items: center; gap: 6px;
  border: 1px solid rgba(255,255,255,0.08);
}
.cat-tab.active {
  background: linear-gradient(180deg, var(--rim), var(--accent));
  color: #1a0e0e; border-color: transparent;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 40%, transparent);
}
.tab-count { font-size: 10px; opacity: 0.7; font-weight: 800; }

.cos-card {
  padding: 0; overflow: hidden; background: rgba(20, 14, 26, 0.75);
  border-radius: 20px; min-height: 180px; position: relative;
}
.cos-card.is-equipped {
  border: 2px solid var(--rim);
  box-shadow: 0 0 24px color-mix(in srgb, var(--accent) 45%, transparent);
}
.cos-card.state-buy { opacity: 0.9; }
.cos-card-body { padding: 12px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
.cos-card-top strong { font-size: 14px; display: block; }
.cos-blurb { font-size: 11px; opacity: 0.7; margin: 2px 0 8px; line-height: 1.35; flex: 1; }
.cos-card-footer { margin-top: auto; }

.equipped-badge {
  position: absolute; top: 8px; right: 8px; font-size: 9px; font-weight: 800;
  letter-spacing: 0.12em; background: rgba(14, 10, 20, 0.85); color: var(--rim);
  padding: 3px 8px; border-radius: 999px; border: 1px solid var(--rim);
}
.owned-badge {
  position: absolute; top: 8px; right: 8px; font-size: 9px; font-weight: 800;
  letter-spacing: 0.1em; background: rgba(255,255,255,0.16); color: #fff;
  padding: 3px 8px; border-radius: 999px;
}
.lock-badge {
  position: absolute; top: 8px; right: 8px; font-size: 12px; opacity: 0.75;
}

.cos-cta { font-size: 12px; font-weight: 800; display: inline-flex; align-items: center; gap: 6px; }
.cos-cta.worn { color: var(--rim); font-size: 12px; }
.cos-cta.wear {
  border: 0; border-radius: 12px; padding: 7px 12px; background: rgba(255,255,255,0.15);
  color: #fff; font: inherit; font-size: 12px; font-weight: 700; cursor: pointer; width: 100%;
}
.cos-cta.wear:hover { background: rgba(255,255,255,0.25); }
.cos-cta.buy { color: #ffe694; font-size: 13px; font-weight: 800; }

.cos-art {
  width: 100%; height: 72px; border-radius: 0;
  background: radial-gradient(circle at 40% 35%, #fff8ec, var(--accent) 55%, var(--accent-deep));
  position: relative; display: block;
}
.cos-art.type-wake { background: linear-gradient(90deg, transparent, var(--accent), transparent); }
.cos-art.type-mote:before, .cos-art.type-mote:after {
  content: ""; position: absolute; width: 10px; height: 10px; border-radius: 50%; background: #fff; top: 30px;
}
.cos-art.type-mote:before { left: 28%; }
.cos-art.type-mote:after { right: 28%; box-shadow: 0 0 0 6px rgba(255,255,255,0.2); }
.cos-art.type-burst { background: radial-gradient(circle, var(--rim), transparent 64%); }
.cos-art.type-sky { background: linear-gradient(180deg, #140e1a, var(--accent-deep)); }
.cos-art.id-nuri-tide { filter: hue-rotate(140deg); }
.cos-art.id-nuri-dusk { filter: hue-rotate(250deg); }
.cos-art.id-nuri-leaf { filter: hue-rotate(70deg); }
.cos-art.id-nuri-star { filter: hue-rotate(200deg); }
.cos-art.id-wake-petals { background: radial-gradient(circle at 20% 50%, #ffb0c8, transparent 40%), radial-gradient(circle at 70% 50%, var(--accent), transparent 42%); }
.cos-art.id-wake-sparks { background: repeating-linear-gradient(90deg, var(--rim) 0 4px, transparent 4px 14px); }
.cos-art.id-mote-rings { background: radial-gradient(circle, transparent 40%, var(--accent) 42%, transparent 48%); }
.cos-art.id-burst-constellation { background: radial-gradient(circle at 30% 40%, #fff 0 2px, transparent 3px), radial-gradient(circle at 70% 55%, #fff 0 2px, transparent 3px), radial-gradient(circle at 50% 20%, var(--rim), transparent 55%); }
.cos-art.id-sky-aurora { background: linear-gradient(120deg, #1a3850, #48d8d0 40%, #c890f0); }

/* Purchase Confirmation Modal */
.confirm-modal { width: min(420px, 92vw); text-align: center; }
.buy-preview-stage {
  width: 100%; height: 90px; border-radius: 18px; overflow: hidden;
  margin: 4px 0 8px; border: 1px solid rgba(255,255,255,0.12);
}
.buy-preview { height: 100%; width: 100%; }
.badge-type {
  display: inline-block; font-size: 11px; letter-spacing: 0.16em; font-weight: 800;
  text-transform: uppercase; color: var(--rim); margin-bottom: 6px;
}
.price-breakdown {
  background: rgba(0,0,0,0.3); border-radius: 16px; padding: 14px;
  display: flex; flex-direction: column; gap: 8px; margin: 12px 0;
  border: 1px solid rgba(255,255,255,0.08);
}
.price-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.price-row b { display: inline-flex; align-items: center; gap: 6px; }
.price-row.total-row { border-top: 1px solid rgba(255,255,255,0.1); padding-top: 8px; }
.price-row b.positive { color: #a4f090; }
.price-row b.negative { color: #ff7080; }
.insufficient-alert {
  background: rgba(220, 40, 60, 0.2); border: 1px solid rgba(220, 40, 60, 0.4);
  color: #ff9ca8; padding: 8px 12px; border-radius: 12px; font-size: 12px; margin-bottom: 10px;
}
.modal-actions { display: flex; flex-direction: column; gap: 8px; }

/* Settings Dashboard */
.settings-wrap {
  display: flex; flex-direction: column; gap: 14px; min-height: 0; flex: 1;
  max-width: 580px; width: 100%; margin: 0 auto;
}
.set-card {
  background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 22px; padding: 18px; display: flex; flex-direction: column; gap: 14px;
}
.set-header { display: flex; align-items: center; gap: 10px; }
.set-icon { font-size: 18px; color: var(--rim); }
.set-card h3 { margin: 0; font-family: "Fraunces", Georgia, serif; font-size: 17px; }
.set-hint { margin: 0; font-size: 12px; opacity: 0.7; }
.quality-desc { font-size: 12px; opacity: 0.75; font-style: italic; }

.switch-row, .info-row {
  display: flex; justify-content: space-between; align-items: center; gap: 12px; font-size: 14px;
}
.slide-row { display: flex; flex-direction: column; gap: 8px; font-size: 14px; }
.slide-row span { display: flex; justify-content: space-between; align-items: center; }
.slide-row b { color: var(--rim); font-size: 13px; font-weight: 800; }
.slide-row input[type=range] { width: 100%; accent-color: var(--accent); cursor: pointer; }

.stat-pill {
  background: rgba(255,255,255,0.12); padding: 4px 10px; border-radius: 999px;
  font-size: 12px; color: var(--rim);
}

.switch { position: relative; width: 50px; height: 30px; flex: 0 0 50px; }
.switch input { opacity: 0; width: 50px; height: 30px; margin: 0; cursor: pointer; }
.switch i {
  position: absolute; inset: 0; border-radius: 99px; pointer-events: none;
  background: rgba(255, 255, 255, 0.2); transition: 0.25s ease;
}
.switch i:after {
  content: ""; position: absolute; width: 22px; height: 22px; border-radius: 50%;
  background: #fff; top: 4px; left: 4px; transition: 0.25s ease;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}
.switch input:checked + i { background: linear-gradient(180deg, var(--rim), var(--accent)); }
.switch input:checked + i:after { left: 24px; }

.seg { display: flex; gap: 6px; background: rgba(0,0,0,0.3); padding: 5px; border-radius: 16px; }
.seg-btn {
  flex: 1; border: 0; border-radius: 12px; padding: 10px 8px; cursor: pointer;
  background: transparent; color: var(--ink); font: inherit; font-weight: 700; font-size: 13px;
  transition: 0.2s ease;
}
.seg-btn.on { background: linear-gradient(180deg, var(--rim), var(--accent)); color: #1a0e0e; }

/* Achievements Redesign */
.ach-summary-card {
  background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.03));
  border: 1px solid rgba(255,255,255,0.14); border-radius: 22px; padding: 16px; margin-bottom: 4px;
}
.ach-summary-main { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.ach-summary-title { font-size: 10px; letter-spacing: 0.2em; font-weight: 800; color: var(--rim); text-transform: uppercase; }
.ach-summary-main h3 { margin: 2px 0 0; font-family: "Fraunces", Georgia, serif; font-size: 18px; }
.ach-reward-tag {
  display: inline-flex; align-items: center; gap: 6px; background: rgba(0,0,0,0.3);
  padding: 6px 12px; border-radius: 999px; border: 1px solid rgba(255,214,120,0.3);
  font-size: 12px; font-weight: 800; color: #ffe694;
}
.ach-total-bar { height: 8px; border-radius: 99px; background: rgba(255,255,255,0.1); overflow: hidden; }
.ach-total-bar i { display: block; height: 100%; background: linear-gradient(90deg, var(--accent-deep), var(--rim)); }

.ach-card {
  flex-direction: row; align-items: flex-start; gap: 14px;
  min-height: auto; cursor: default; padding: 14px 16px;
}
.ach-card.done {
  border-color: color-mix(in srgb, var(--ach, var(--accent)) 60%, transparent);
  background: linear-gradient(135deg, rgba(255,255,255,0.09), rgba(255,255,255,0.03));
}
.ach-medal {
  width: 56px; height: 56px; flex: 0 0 56px; border-radius: 18px;
  background: radial-gradient(circle at 35% 30%, #ffffff, var(--ach, var(--accent)) 60%, #1a1014);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.45), 0 6px 16px rgba(0,0,0,0.35);
  display: flex; align-items: center; justify-content: center;
}
.ach-medal svg { width: 28px; height: 28px; display: block; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35)); }
.ach-card.locked-ach .ach-medal { filter: grayscale(0.85) brightness(0.65); opacity: 0.7; }
.ach-copy { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px; }
.ach-head { display: flex; justify-content: space-between; gap: 8px; align-items: baseline; }
.ach-head strong { font-size: 15px; }
.ach-flag { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 800; }
.ach-flag.unlocked { color: var(--rim); }
.ach-flag.locked { opacity: 0.55; }
.ach-desc { font-size: 13px; opacity: 0.88; line-height: 1.4; }
.ach-how { font-size: 11px; opacity: 0.65; line-height: 1.35; margin-top: 2px; }
.ach-progress-row { display: flex; align-items: center; gap: 10px; margin-top: 6px; }
.ach-bar { flex: 1; height: 5px; border-radius: 99px; background: rgba(255,255,255,0.12); overflow: hidden; }
.ach-bar i { display: block; height: 100%; border-radius: 99px; }
.ach-prog { font-size: 11px; opacity: 0.75; font-weight: 700; flex: 0 0 auto; }

/* Dayweave Card */
.daily-badge-card {
  background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px; padding: 18px; margin: 12px 0 16px;
  display: flex; flex-direction: column; gap: 4px;
}
.daily-date { font-size: 11px; letter-spacing: 0.16em; font-weight: 800; color: var(--rim); text-transform: uppercase; }
.daily-badge-card b { font-size: 16px; }
.daily-streak { font-size: 12px; opacity: 0.75; }

/* Complete Screen */
.reward-box {
  background: rgba(0,0,0,0.35); border: 1px solid rgba(255,214,120,0.35);
  border-radius: 20px; padding: 16px; display: flex; flex-direction: column; align-items: center; gap: 6px;
  margin: 10px 0 14px;
}
.reward-amount { font-size: 20px; font-weight: 800; color: #ffe694; display: flex; align-items: center; gap: 8px; }
.reward-badge { font-size: 11px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--rim); }

.bar { width: min(260px, 75vw); height: 8px; background: rgba(255,255,255,0.14); border-radius: 99px; overflow: hidden; }
.bar i { display: block; height: 100%; background: linear-gradient(90deg, var(--accent-deep), var(--accent)); }

.toast {
  position: absolute; left: 50%; bottom: max(20px, env(safe-area-inset-bottom)); transform: translateX(-50%);
  background: rgba(16, 12, 24, 0.92); padding: 10px 20px; border-radius: 999px; font-size: 13px; font-weight: 700;
  pointer-events: none; border: 1px solid rgba(255,255,255,0.16); max-width: 90vw;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5); backdrop-filter: blur(10px);
}

.intro-panel { text-align: center; align-items: center; width: min(420px, 92vw); }
.intro-stage {
  width: 100%; height: 140px; border-radius: 20px;
  background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--accent) 30%, transparent), rgba(0,0,0,0.35));
  border: 1px solid rgba(255,255,255,0.12);
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.intro-svg { width: 90%; height: 120px; }
.intro-svg .spin { transform-origin: 110px 64px; animation: spin 2.4s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.intro-legend, .intro-focus-grid { width: 100%; text-align: left; }
.intro-focus-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.focus-chip { background: rgba(255,255,255,0.06); border-radius: 14px; padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; font-size: 12px; }

/* Responsive Adaptations */
@media (min-width: 1024px) {
  .world-grid { grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
  .grid-lvls { grid-template-columns: repeat(5, 1fr); max-width: 720px; margin: 0 auto; }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .ach-grid { grid-template-columns: 1fr 1fr; }
  .world-grid { grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); }
  .cos-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); }
  .grid-lvls { grid-template-columns: repeat(5, 1fr); }
}

@media (max-width: 767px) {
  .grid-lvls { grid-template-columns: repeat(4, 1fr); gap: 10px; }
  .lvl { min-height: 74px; border-radius: 18px; }
}

@media (max-width: 480px) {
  .world-grid { grid-template-columns: 1fr; }
  .cos-grid { grid-template-columns: repeat(2, 1fr); }
  .grid-lvls { grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .lvl { min-height: 70px; border-radius: 16px; padding: 8px 4px 6px; }
  .lvl-num { font-size: 15px; }
  .intro-focus-grid { grid-template-columns: 1fr; }
  .topbar h2 { font-size: 18px; }
  .star-chip { padding: 4px 8px; font-size: 12px; }
}

@media (max-height: 540px) and (orientation: landscape) {
  .logo { font-size: 24px; }
  .lede { display: none; }
  .btn { padding: 9px 14px; }
  .world-poster, .poster-svg { aspect-ratio: 21 / 9; }
  .grid-lvls { grid-template-columns: repeat(5, 1fr); max-width: 600px; margin: 0 auto; }
  .lvl { min-height: 56px; }
  .hint { bottom: 8%; font-size: 12px; padding: 6px 14px; }
  .intro-stage { height: 90px; }
}
`;
