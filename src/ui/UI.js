import { STATES, WORLDS, COSMETICS, ACHIEVEMENTS, WORLD_INTROS } from "../config/game.js";
import { worldProgress } from "../levels/catalog.js";
import { getPalette } from "../config/palette.js";

export class UI {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.toastT = 0;
    this.toast = "";
  }

  setToast(msg) {
    this.toast = msg;
    this.toastT = 2.2;
  }

  applyTheme(levelOrWorld) {
    const pal = levelOrWorld?.paletteResolved
      ? levelOrWorld.paletteResolved
      : getPalette(
          typeof levelOrWorld === "string"
            ? { palette: levelOrWorld, index: 0, seed: 1 }
            : levelOrWorld || { palette: "emberwake", index: 0, seed: 1 }
        );
    const root = document.documentElement;
    root.style.setProperty("--accent", pal.accent);
    root.style.setProperty("--accent-deep", pal.accentDeep);
    root.style.setProperty("--ink", pal.ink);
    root.style.setProperty("--rim", pal.rim || pal.accent);
    root.style.setProperty("--floor-lit", pal.floorLit || pal.accent);
    root.style.setProperty("--sky", pal.skyBot);
  }

  update(dt) {
    if (this.toastT > 0) this.toastT -= dt;
  }

  render() {
    const g = this.game;
    const st = g.fsm.state;
    const p = g.session?.progress();
    const key = `${st}:${g.uiTick || 0}:${g.session?.complete}:${g.session?.failed}:${g.session?.moves}:${p?.cur}`;
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
      <div class="logo-mark"></div>
      <h1 class="logo">Lumora</h1>
      <p class="muted">Shaping the still platforms…</p>
      <div class="bar"><i style="width:${Math.round((this.game.loadP || 0) * 100)}%"></i></div>
    </div>`;
  }

  intro() {
    this.applyTheme("emberwake");
    this.root.innerHTML = `<div class="screen center" data-ui="1">
      <div class="logo-mark pulse"></div>
      <h1 class="logo">Lumora</h1>
      <p class="lede">Nuri glides across sleeping platforms.<br/>Restore every tile with your wake.</p>
    </div>`;
  }

  menu() {
    this.applyTheme(this.game.selectedWorld || "emberwake");
    const save = this.game.save.data;
    this.root.innerHTML = `<div class="screen menu" data-ui="1">
      <div class="brand">
        <div class="logo-mark"></div>
        <h1 class="logo">Lumora</h1>
        <p class="lede">Guide Nuri. Restore every platform.</p>
      </div>
      <div class="stack">
        <button class="btn primary" id="play">Play</button>
        <button class="btn" id="worlds">Worlds</button>
        <button class="btn" id="daily">Dayweave</button>
        <div class="row">
          <button class="btn ghost" id="col">Collection</button>
          <button class="btn ghost" id="set">Settings</button>
        </div>
        <button class="btn ghost" id="ach">Achievements</button>
      </div>
      <p class="tiny glow-chip">${save.gleams} Gleams</p>
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
    const cards = WORLDS.map((w, i) => {
      const unlocked = i === 0 || save.worlds[w.id] || worldProgress(save.completed, WORLDS[i - 1].id) >= WORLDS[i - 1].levels;
      const done = worldProgress(save.completed, w.id);
      const pct = Math.round((done / w.levels) * 100);
      return `<button class="card world-card theme-${w.id} ${unlocked ? "" : "locked"}" data-w="${w.id}" ${unlocked ? "" : "disabled"} style="--accent:${w.hue};--accent-deep:${w.hue};--rim:${w.hue}">
        <div class="world-art" data-w="${w.id}" aria-hidden="true">
          <span class="wa-sky"></span>
          <span class="wa-tile a"></span>
          <span class="wa-tile b"></span>
          <span class="wa-tile c"></span>
          <span class="wa-nuri"></span>
        </div>
        <div class="world-meta">
          <strong>${w.name}</strong>
          <span>${unlocked ? `${done}/${w.levels} restored` : "Sleeping"}</span>
          <em>${w.tagline}</em>
          ${unlocked ? `<i class="world-fill" style="width:${pct}%"></i>` : ""}
        </div>
      </button>`;
    }).join("");
    this.root.innerHTML = `<div class="screen" data-ui="1">
      <div class="topbar"><button class="iconbtn" id="back">‹</button><h2>Worlds</h2><span></span></div>
      <div class="cards world-grid">${cards}</div>
    </div>`;
    this.root.querySelector("#back").onclick = () => this.game.fsm.set(STATES.MAIN_MENU);
    this.root.querySelectorAll("[data-w]").forEach((el) => {
      el.onclick = () => this.game.openWorld(el.dataset.w);
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
          <div class="focus-chip"><b>Goal</b><span>Restore every glowing tile.</span></div>
          <div class="focus-chip"><b>Flow</b><span>Glide, wake, and avoid hazards.</span></div>
        </div>
        <button class="btn primary" id="go">Enter world</button>
      </div>
    </div>`;
    this.bind({ go: () => this.game.confirmWorldIntro() });
  }

  levels() {
    const worldId = this.game.selectedWorld;
    const world = WORLDS.find((w) => w.id === worldId);
    this.applyTheme(worldId);
    const save = this.game.save.data;
    let html = "";
    for (let i = 0; i < world.levels; i++) {
      const unlocked = i === 0 || save.completed[`${worldId}:${i - 1}`] || this.game.debug.enabled;
      const done = !!save.completed[`${worldId}:${i}`];
      html += `<button class="lvl ${done ? "done" : ""} ${unlocked ? "" : "locked"}" data-i="${i}" ${unlocked ? "" : "disabled"}>
        <span class="lvl-gem"></span><b>${i + 1}</b>
      </button>`;
    }
    this.root.innerHTML = `<div class="screen" data-ui="1">
      <div class="topbar"><button class="iconbtn" id="back">‹</button><h2>${world.name}</h2><span></span></div>
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
    const hint = this.game.showHint ? `<div class="hint">${s.level.hint || "Swipe to glide — cover every tile"}</div>` : "";
    this.root.innerHTML = `<div class="hud" data-ui="1">
      <div class="hud-top">
        <button class="iconbtn" id="pause" aria-label="Pause">❚❚</button>
        <div class="hud-meta">
          <strong>${s.level.title}</strong>
          <div class="progress-wrap">
            <div class="progress-bar"><i style="width:${pct}%"></i></div>
            <span class="progress-label">${p.cur}/${p.max} tiles · ${s.moves} glides</span>
          </div>
        </div>
        <button class="iconbtn" id="restart" aria-label="Restart">↻</button>
      </div>
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
    if (bar) bar.style.width = `${pct}%`;
    if (label) label.textContent = `${p.cur}/${p.max} tiles · ${s.moves} glides`;
  }

  pause() {
    this.root.innerHTML = `<div class="screen dim" data-ui="1">
      <div class="panel">
        <h2>Paused</h2>
        <p class="lede slim">The platforms wait.</p>
        <button class="btn primary" id="resume">Resume</button>
        <button class="btn" id="restart">Restart lattice</button>
        <button class="btn" id="set">Settings</button>
        <button class="btn ghost" id="quit">Worlds</button>
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
    const r = this.game.lastReward || { reward: 0, efficient: false };
    const s = this.game.session;
    if (s) this.applyTheme(s.level);
    this.root.innerHTML = `<div class="screen dim" data-ui="1">
      <div class="panel shine">
        <p class="eyebrow">Complete</p>
        <h2>All tiles restored</h2>
        <p class="lede">Nuri’s wake lit the whole lattice.</p>
        <p class="reward">+${r.reward} Gleams ${r.efficient ? "· Quiet Path" : ""}</p>
        <button class="btn primary" id="next">Next lattice</button>
        <button class="btn" id="again">Replay</button>
        <button class="btn ghost" id="menu">Menu</button>
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
    this.root.innerHTML = `<div class="screen" data-ui="1">
      <div class="topbar"><button class="iconbtn" id="back">‹</button><h2>Settings</h2><span></span></div>
      <div class="form panel-inline">
        ${tog("music", "Music", s.music)}
        ${tog("sfx", "Sounds", s.sfx)}
        ${slider("master", "Master", s.master)}
        ${slider("musicVol", "Music level", s.musicVol)}
        ${slider("sfxVol", "Sound level", s.sfxVol)}
        <label>Clarity
          <select id="quality">
            <option value="low" ${s.quality === "low" ? "selected" : ""}>Soft</option>
            <option value="medium" ${s.quality === "medium" ? "selected" : ""}>Balanced</option>
            <option value="high" ${s.quality === "high" ? "selected" : ""}>Vivid</option>
          </select>
        </label>
        <button class="btn ghost" id="ach">Achievements</button>
      </div>
    </div>`;
    this.root.querySelector("#back").onclick = () => {
      this.game.fsm.set(this.game.fsm.data.from || STATES.MAIN_MENU);
    };
    this.root.querySelector("#ach").onclick = () => this.game.fsm.set(STATES.ACHIEVEMENTS);
    this.root.querySelector("#music").onchange = (e) => this.game.setSetting("music", e.target.checked);
    this.root.querySelector("#sfx").onchange = (e) => this.game.setSetting("sfx", e.target.checked);
    this.root.querySelector("#master").oninput = (e) => this.game.setSetting("master", +e.target.value);
    this.root.querySelector("#musicVol").oninput = (e) => this.game.setSetting("musicVol", +e.target.value);
    this.root.querySelector("#sfxVol").oninput = (e) => this.game.setSetting("sfxVol", +e.target.value);
    this.root.querySelector("#quality").onchange = (e) => this.game.setSetting("quality", e.target.value);
  }

  collection() {
    const save = this.game.save.data;
    const items = COSMETICS.map((c) => {
      const owned = save.owned.includes(c.id);
      const eq = save.equipped[c.type] === c.id;
      return `<button class="card cos-card ${owned ? "" : "locked"} ${eq ? "eq" : ""}" data-id="${c.id}">
        <span class="cos-art type-${c.type} id-${c.id}" aria-hidden="true"></span>
        <strong>${c.name}</strong>
        <span class="cos-type">${c.type}</span>
        <span>${owned ? (eq ? "Worn" : "Wear") : `${c.cost} Gleams`}</span>
      </button>`;
    }).join("");
    this.root.innerHTML = `<div class="screen" data-ui="1">
      <div class="topbar"><button class="iconbtn" id="back">‹</button><h2>Collection</h2><span class="glow-chip">${save.gleams} Gleams</span></div>
      <div class="cards">${items}</div>
    </div>`;
    this.root.querySelector("#back").onclick = () => this.game.fsm.set(STATES.MAIN_MENU);
    this.root.querySelectorAll("[data-id]").forEach((el) => {
      el.onclick = () => this.game.buyOrEquip(el.dataset.id);
    });
  }

  daily() {
    const d = this.game.save.data.daily;
    this.applyTheme("daily");
    this.root.innerHTML = `<div class="screen center" data-ui="1">
      <div class="topbar abs"><button class="iconbtn" id="back">‹</button></div>
      <h2 class="logo small">Dayweave</h2>
      <p class="lede">A unique lattice for this day. Restore every tile.</p>
      <p class="tiny">${d.lastDate || "New"} ${d.completed ? "· restored" : ""} · streak ${d.streak}</p>
      <button class="btn primary" id="go">${d.completed ? "Visit again" : "Enter"}</button>
    </div>`;
    this.bind({
      back: () => this.game.fsm.set(STATES.MAIN_MENU),
      go: () => this.game.startDaily(),
    });
  }

  achievements() {
    const a = this.game.save.data.achievements;
    const items = ACHIEVEMENTS.map(
      (x) => `<div class="card ach-card ${a[x.id] ? "done" : ""}">
        <span class="ach-medal icon-${x.icon || "wake"}" aria-hidden="true"></span>
        <div><strong>${x.name}</strong><span>${x.desc}</span></div>
      </div>`
    ).join("");
    this.root.innerHTML = `<div class="screen" data-ui="1">
      <div class="topbar"><button class="iconbtn" id="back">‹</button><h2>Achievements</h2><span></span></div>
      <div class="cards">${items}</div>
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

function introArt(kind) {
  const scenes = {
    restore: `<svg viewBox="0 0 220 130" class="intro-svg">
      <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd0a0"/><stop offset="1" stop-color="#ff9a4a"/></linearGradient></defs>
      <ellipse cx="110" cy="108" rx="70" ry="10" fill="rgba(0,0,0,.25)"/>
      <polygon points="70,78 110,58 150,78 110,98" fill="#3a2426"/>
      <polygon points="70,62 110,42 150,62 110,82" fill="url(#g1)"/>
      <polygon points="150,78 110,98 110,82 150,62" fill="#2a181a"/>
      <circle cx="110" cy="52" r="11" fill="#fff4ea"/>
      <ellipse cx="104" cy="42" rx="7" ry="10" fill="#ffc08a" transform="rotate(-20 104 42)"/>
      <path d="M40 70 L20 78" stroke="#fff4ea" stroke-width="3" fill="none" stroke-linecap="round"/>
      <polygon points="18,72 8,82 22,80" fill="#fff4ea"/>
    </svg>`,
    well: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="70,80 110,60 150,80 110,100" fill="#1e3c48"/>
      <polygon points="70,64 110,44 150,64 110,84" fill="#48d8d0"/>
      <circle cx="110" cy="64" r="16" fill="none" stroke="#e8fffc" stroke-width="4"/>
      <circle cx="110" cy="64" r="6" fill="#7ef0e0"/>
      <circle cx="110" cy="48" r="10" fill="#fff"/>
    </svg>`,
    seal: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="50,86 90,66 130,86 90,106" fill="#322448"/>
      <polygon points="50,70 90,50 130,70 90,90" fill="#c890f0"/>
      <circle cx="90" cy="70" r="10" fill="#f8f0ff"/>
      <polygon points="120,78 160,58 200,78 160,98" fill="#1c102c"/>
      <circle cx="160" cy="70" r="14" fill="none" stroke="#e0b050" stroke-width="5"/>
      <path d="M160 56 v28" stroke="#e0b050" stroke-width="3"/>
    </svg>`,
    vane: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="70,80 110,60 150,80 110,100" fill="#243c2c"/>
      <polygon points="70,64 110,44 150,64 110,84" fill="#a8e050"/>
      <g class="spin"><polygon points="110,50 126,70 94,70" fill="#589828"/></g>
      <circle cx="110" cy="48" r="9" fill="#f4ffe8"/>
    </svg>`,
    fold: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="30,86 70,66 110,86 70,106" fill="#1c2848"/>
      <polygon points="30,70 70,50 110,70 70,90" fill="#88a8ff"/>
      <polygon points="110,86 150,66 190,86 150,106" fill="#1c2848"/>
      <polygon points="110,70 150,50 190,70 150,90" fill="#88a8ff"/>
      <path d="M70 70 C90 40, 130 40, 150 70" fill="none" stroke="#f0f4ff" stroke-width="3"/>
      <circle cx="70" cy="54" r="8" fill="#fff"/>
      <circle cx="150" cy="54" r="8" fill="#b8d0ff" opacity=".5"/>
    </svg>`,
    fracture: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="50,80 90,60 130,80 90,100" fill="#ff9a60"/>
      <polygon points="96,78 140,52 180,86 150,108 118,96" fill="#3a221c" opacity=".9"/>
      <path d="M70 70 L88 82 L100 60 L118 86" stroke="#ff7040" stroke-width="3" fill="none"/>
      <circle cx="78" cy="56" r="9" fill="#fff4ea"/>
    </svg>`,
    mirror: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="70,84 110,64 150,84 110,104" fill="#9ee0d0"/>
      <polygon points="110,42 132,88 88,88" fill="#e8fff8" stroke="#2a8880" stroke-width="2"/>
      <path d="M70 50 H50" stroke="#fff" stroke-width="3"/>
      <path d="M150 50 H170" stroke="#fff" stroke-width="3"/>
      <polygon points="48,44 38,56 52,52" fill="#fff"/>
      <polygon points="172,44 182,56 168,52" fill="#fff"/>
    </svg>`,
    oneway: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="40,84 80,64 120,84 80,104" fill="#7ec8ff"/>
      <polygon points="100,84 140,64 180,84 140,104" fill="#1c3850"/>
      <polygon points="86,62 118,78 86,94 96,78" fill="#fff"/>
      <circle cx="70" cy="58" r="9" fill="#eef8ff"/>
    </svg>`,
    rift: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="40,86 80,66 120,86 80,106" fill="#f0a0b8"/>
      <polygon points="100,78 150,50 190,92 140,112" fill="#120818"/>
      <path d="M130 70 L160 86 L145 54" fill="none" stroke="#c07090" stroke-width="3"/>
      <circle cx="68" cy="62" r="9" fill="#fff"/>
    </svg>`,
    sequence: `<svg viewBox="0 0 220 130" class="intro-svg">
      <circle cx="56" cy="70" r="20" fill="#f0a0ff"/>
      <circle cx="110" cy="70" r="20" fill="#3c2448"/>
      <circle cx="164" cy="70" r="20" fill="#3c2448"/>
      <text x="56" y="76" text-anchor="middle" fill="#1a1018" font-size="18" font-weight="700">1</text>
      <text x="110" y="76" text-anchor="middle" fill="#f8c8ff" font-size="18" font-weight="700">2</text>
      <text x="164" y="76" text-anchor="middle" fill="#f8c8ff" font-size="18" font-weight="700">3</text>
    </svg>`,
    heart: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="40,86 80,66 120,86 80,106" fill="#80e0ff"/>
      <path d="M110 58 C110 42 86 42 86 58 C86 74 110 86 110 86 C110 86 134 74 134 58 C134 42 110 42 110 58" fill="#ff6080"/>
      <path d="M80 70 C100 50 140 50 160 70" fill="none" stroke="#b8f4ff" stroke-width="3"/>
    </svg>`,
    pillar: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="40,96 80,76 120,96 80,116" fill="#b8f090"/>
      <polygon points="96,96 120,50 144,96 120,108" fill="#102418"/>
      <polygon points="120,50 144,96 132,46" fill="#244830"/>
      <circle cx="120" cy="44" r="8" fill="#6ecf7a"/>
      <circle cx="62" cy="70" r="9" fill="#f2ffe8"/>
    </svg>`,
    storm: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="40,86 80,66 120,86 80,106" fill="#6aa8ff"/>
      <polygon points="118,78 160,52 196,90 150,110" fill="#120818"/>
      <polygon points="70,62 102,78 70,94 80,78" fill="#fff"/>
    </svg>`,
    forge: `<svg viewBox="0 0 220 130" class="intro-svg">
      <polygon points="36,86 76,66 116,86 76,106" fill="#ff90a8"/>
      <path d="M50 74 L70 86 L86 60" stroke="#3c1c28" stroke-width="3" fill="none"/>
      <polygon points="118,78 160,50 198,92 152,112" fill="#120818"/>
      <circle cx="64" cy="58" r="9" fill="#fff0f4"/>
    </svg>`,
  };
  return scenes[kind] || scenes.restore;
}

function tog(id, label, on) {
  return `<label class="tog">${label}<input type="checkbox" id="${id}" ${on ? "checked" : ""} /></label>`;
}
function slider(id, label, v) {
  return `<label>${label}<input type="range" id="${id}" min="0" max="1" step="0.01" value="${v}" /></label>`;
}

export const UI_CSS = `
:root {
  --accent: #ff9a4a;
  --accent-deep: #d45a28;
  --ink: #fff4ea;
  --rim: #ffd0a0;
  --floor-lit: #ffb86a;
  --sky: #3d241f;
  --panel: rgba(22, 16, 28, 0.88);
  --panel-border: rgba(255,255,255,0.12);
}
#ui {
  font-family: "Sora", "Trebuchet MS", sans-serif;
  pointer-events: none;
  color: var(--ink);
}
.screen, .hud-top, .panel, .toast, .iconbtn, .btn, .card, .lvl, .form, .topbar { pointer-events: auto; }
.screen { position:absolute; inset:0; padding: max(14px, env(safe-area-inset-top)) 18px 18px; display:flex; flex-direction:column; gap:14px; }
.center { align-items:center; justify-content:center; text-align:center; }
.dim { background: rgba(8,6,14,0.58); backdrop-filter: blur(8px); align-items:center; justify-content:center; }
.panel {
  width:min(360px, 92vw);
  background: linear-gradient(165deg, rgba(40,30,48,0.95), rgba(18,14,26,0.96));
  border: 1px solid var(--panel-border);
  border-radius: 24px;
  padding: 24px;
  display:flex; flex-direction:column; gap:12px;
  box-shadow: 0 20px 60px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,0.06);
  position: relative; z-index: 8;
}
.panel-inline {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 20px;
  padding: 16px;
}
.menu { justify-content:center; align-items:center; }
.brand { text-align:center; margin-bottom:10px; }
.logo {
  font-family: "Fraunces", Georgia, serif;
  font-size: clamp(32px, 9vw, 52px);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin: 10px 0 0;
  font-weight: 700;
  background: linear-gradient(180deg, #fff, var(--rim));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.logo.small { font-size: clamp(26px, 7vw, 40px); letter-spacing: 0.08em; }
.eyebrow { margin:0; font-size:11px; letter-spacing:0.22em; text-transform:uppercase; opacity:0.6; }
.lede { opacity: 0.84; max-width: 30ch; margin: 8px auto; line-height: 1.45; font-size: 15px; }
.lede.slim { margin: 0 0 4px; max-width: none; text-align:left; opacity:0.7; font-size:13px; }
.muted, .tiny { opacity: 0.65; font-size: 13px; }
.glow-chip {
  display:inline-block; padding:6px 12px; border-radius:999px;
  background: rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.1);
}
.logo-mark {
  width: 58px; height: 62px; margin: 0 auto;
  background: radial-gradient(circle at 35% 30%, #fff4d6, var(--accent) 58%, var(--accent-deep));
  border-radius: 50% 50% 48% 52%;
  position: relative;
  box-shadow: 0 10px 28px rgba(0,0,0,.4), 0 0 24px color-mix(in srgb, var(--accent) 45%, transparent);
}
.logo-mark:before, .logo-mark:after {
  content:""; position:absolute; width:18px; height:26px;
  background: color-mix(in srgb, var(--accent) 70%, #fff);
  border-radius: 50%; top:-8px;
}
.logo-mark:before { left: 4px; transform: rotate(-18deg); }
.logo-mark:after { right: 4px; transform: rotate(18deg); }
.logo-mark.pulse { animation: pulse 1.6s ease-in-out infinite; }
@keyframes pulse { 50% { transform: scale(1.06); } }
.stack { display:flex; flex-direction:column; gap:11px; width:min(320px, 88vw); }
.row { display:flex; gap:10px; }
.row .btn { flex:1; }
.btn {
  appearance:none; border:0; border-radius: 18px; padding: 13px 16px;
  font: inherit; font-weight: 700; color: #1a1420; background: #efe4d4;
  cursor:pointer; transition: transform .12s, filter .12s, box-shadow .12s;
}
.btn:hover { transform: translateY(-1px); filter: brightness(1.05); }
.btn:active { transform: translateY(1px); }
.btn.primary {
  background: linear-gradient(180deg, var(--rim), var(--accent));
  color:#1a1010;
  box-shadow: 0 8px 24px color-mix(in srgb, var(--accent) 35%, transparent);
}
.btn.ghost { background: rgba(255,255,255,0.08); color: var(--ink); }
.iconbtn {
  width:42px; height:42px; border:0; border-radius:15px;
  background: rgba(255,255,255,0.1); color:#fff; font-weight:700; cursor:pointer;
  backdrop-filter: blur(6px);
}
.topbar { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.topbar.abs { position:absolute; top:12px; left:12px; }
.topbar h2 { margin:0; font-size:18px; letter-spacing:.04em; font-family: "Fraunces", Georgia, serif; }
.cards { display:grid; grid-template-columns: repeat(auto-fit, minmax(148px, 1fr)); gap:10px; overflow:auto; }
.card {
  text-align:left; border:0; border-radius:18px; padding:14px;
  background: rgba(255,255,255,0.07); color:inherit; cursor:pointer;
  display:flex; flex-direction:column; gap:4px;
  border: 1px solid rgba(255,255,255,0.06);
}
.card em { font-size:11px; opacity:.7; font-style:normal; }
.card.locked { opacity:.45; cursor:not-allowed; }
.card.eq, .card.done { outline: 2px solid var(--accent); }
.world-card.theme-emberwake { background: linear-gradient(145deg, rgba(80,40,30,0.55), rgba(30,18,20,0.7)); }
.world-card.theme-tidecrest { background: linear-gradient(145deg, rgba(30,60,70,0.55), rgba(14,28,36,0.7)); }
.world-card.theme-duskveil { background: linear-gradient(145deg, rgba(60,40,90,0.55), rgba(22,16,40,0.7)); }
.world-card.theme-canopy { background: linear-gradient(145deg, rgba(40,70,45,0.55), rgba(16,30,20,0.7)); }
.world-card.theme-starloom { background: linear-gradient(145deg, rgba(35,45,90,0.55), rgba(12,16,40,0.7)); }
.world-card.theme-cinderfall { background: linear-gradient(145deg, rgba(90,40,28,0.55), rgba(30,14,12,0.7)); }
.world-card.theme-mirrorfen { background: linear-gradient(145deg, rgba(28,70,70,0.55), rgba(10,28,28,0.7)); }
.world-card.theme-zephyrrow { background: linear-gradient(145deg, rgba(30,55,90,0.55), rgba(10,22,40,0.7)); }
.world-card.theme-brasslock { background: linear-gradient(145deg, rgba(90,70,30,0.55), rgba(32,22,10,0.7)); }
.world-card.theme-hollowmere { background: linear-gradient(145deg, rgba(80,30,50,0.55), rgba(28,12,20,0.7)); }
.world-card.theme-prismarch { background: linear-gradient(145deg, rgba(80,40,90,0.55), rgba(28,12,40,0.7)); }
.world-card.theme-auroraloom { background: linear-gradient(145deg, rgba(30,70,90,0.55), rgba(10,28,40,0.7)); }
.world-card.theme-rootspire { background: linear-gradient(145deg, rgba(30,80,45,0.55), rgba(12,30,18,0.7)); }
.world-card.theme-stormglass { background: linear-gradient(145deg, rgba(30,50,90,0.55), rgba(10,18,36,0.7)); }
.world-card.theme-duskforge { background: linear-gradient(145deg, rgba(90,30,48,0.55), rgba(32,10,18,0.7)); }
.world-card { padding: 0; overflow: hidden; gap: 0; }
.world-art {
  position: relative; height: 78px; overflow: hidden;
  background: radial-gradient(circle at 30% 20%, color-mix(in srgb, var(--accent) 35%, transparent), transparent 60%);
}
.world-art .wa-sky { position:absolute; inset:0; background: linear-gradient(180deg, rgba(255,255,255,0.08), transparent); }
.world-art .wa-tile {
  position:absolute; width:34px; height:20px; background: var(--accent);
  transform: rotate(35deg) skewX(-18deg); border-radius: 4px;
  box-shadow: 0 6px 0 color-mix(in srgb, var(--accent-deep) 80%, #000);
}
.world-art .wa-tile.a { left: 18px; top: 36px; opacity: .85; }
.world-art .wa-tile.b { left: 44px; top: 26px; opacity: 1; filter: brightness(1.15); }
.world-art .wa-tile.c { left: 70px; top: 38px; opacity: .7; }
.world-art .wa-nuri {
  position:absolute; width:16px; height:18px; border-radius:50% 50% 46% 54%;
  background: radial-gradient(circle at 35% 30%, #fff, var(--rim) 70%);
  right: 22px; top: 22px;
  box-shadow: 0 0 12px var(--accent);
}
.world-art[data-w="tidecrest"] .wa-nuri { right: 28px; }
.world-meta { padding: 12px 14px 14px; position: relative; display:flex; flex-direction:column; gap:3px; }
.world-fill {
  display:block; height:4px; border-radius:99px; margin-top:8px;
  background: linear-gradient(90deg, var(--accent-deep), var(--rim));
}
.world-grid { grid-template-columns: repeat(auto-fit, minmax(168px, 1fr)); }
.grid-lvls { display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; }
.lvl {
  height:58px; border:0; border-radius:16px; overflow:hidden;
  background: linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.04));
  color:#fff; font-weight:700; cursor:pointer; font-family: "Sora", sans-serif; position: relative;
  display:flex; align-items:center; justify-content:center; box-shadow: inset 0 1px 0 rgba(255,255,255,0.08);
}
.lvl::before {
  content:""; position:absolute; inset: 8px 12px auto auto; width: 18px; height: 18px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 75%, #fff) 0, rgba(255,255,255,0.15) 55%, transparent 70%);
}
.lvl-gem {
  position:absolute; left:8px; top:50%; width:10px; height:10px; margin-top:-5px;
  background: rgba(255,255,255,0.25); transform: rotate(45deg); border-radius:2px;
}
.lvl.done { background: linear-gradient(180deg, var(--rim), var(--accent)); color:#1a1010; }
.lvl.done .lvl-gem { background: #1a1010; }
.lvl.locked { opacity:.35; }
.intro-panel { text-align:center; align-items:center; width:min(400px, 92vw); }
.intro-panel h2 { margin: 0; font-family: "Fraunces", Georgia, serif; }
.intro-stage {
  width: 100%; height: 140px; border-radius: 18px;
  background: radial-gradient(circle at 50% 30%, color-mix(in srgb, var(--accent) 28%, transparent), rgba(0,0,0,0.25));
  border: 1px solid rgba(255,255,255,0.1);
  display:flex; align-items:center; justify-content:center; overflow:hidden;
}
.intro-svg { width: 92%; height: 130px; }
.intro-svg .spin { transform-origin: 110px 64px; animation: spin 2.4s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.intro-line { margin: 0 0 4px; opacity: 0.85; font-size: 15px; max-width: 28ch; }
.cos-card { align-items:flex-start; }
.cos-art {
  width: 100%; height: 56px; border-radius: 12px; margin-bottom: 6px;
  background: radial-gradient(circle at 40% 35%, #fff6e8, var(--accent) 55%, var(--accent-deep));
  position: relative; display:block;
}
.cos-art.type-wake { background: linear-gradient(90deg, transparent, var(--accent), transparent); height: 40px; margin-top: 8px; }
.cos-art.type-mote:before, .cos-art.type-mote:after {
  content:""; position:absolute; width:10px; height:10px; border-radius:50%; background:#fff; top:22px;
}
.cos-art.type-mote:before { left: 28%; }
.cos-art.type-mote:after { right: 28%; box-shadow: 0 0 0 6px rgba(255,255,255,0.2); }
.cos-art.type-burst {
  background: radial-gradient(circle, var(--rim), transparent 62%);
}
.cos-art.type-sky { background: linear-gradient(180deg, #1a1020, var(--accent-deep)); }
.cos-art.id-nuri-tide { filter: hue-rotate(140deg); }
.cos-art.id-nuri-dusk { filter: hue-rotate(250deg); }
.cos-art.id-nuri-leaf { filter: hue-rotate(70deg); }
.cos-art.id-nuri-star { filter: hue-rotate(200deg); }
.cos-art.id-wake-petals { background: radial-gradient(circle at 20% 50%, #ffb0c8, transparent 40%), radial-gradient(circle at 70% 50%, var(--accent), transparent 42%); }
.cos-art.id-wake-sparks { background: repeating-linear-gradient(90deg, var(--rim) 0 4px, transparent 4px 14px); }
.cos-art.id-mote-rings { background: radial-gradient(circle, transparent 40%, var(--accent) 42%, transparent 48%); }
.cos-art.id-burst-constellation { background: radial-gradient(circle at 30% 40%, #fff 0 2px, transparent 3px), radial-gradient(circle at 70% 55%, #fff 0 2px, transparent 3px), radial-gradient(circle at 50% 20%, var(--rim), transparent 55%); }
.cos-art.id-sky-aurora { background: linear-gradient(120deg, #204060, #48d8d0 40%, #c890f0); }
.cos-type { font-size:10px; letter-spacing:.16em; text-transform:uppercase; opacity:.55; }
.ach-card { flex-direction:row; align-items:center; gap:12px; position:relative; overflow:hidden; }
.ach-card::before {
  content:""; position:absolute; inset: 0 0 auto auto; width: 80px; height: 80px; border-radius:50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent) 18%, transparent), transparent 65%);
}
.ach-card span:not(.ach-medal) { opacity:.75; font-size:12px; display:block; }
.ach-medal {
  width:46px; height:46px; flex: 0 0 46px; border-radius:50%;
  background: radial-gradient(circle at 35% 30%, #fff4d0, var(--accent) 55%, var(--accent-deep));
  box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 6px 14px rgba(0,0,0,.25);
  position: relative;
}
.ach-medal:after {
  content:""; position:absolute; inset:12px; border-radius:50%;
  border: 2px solid rgba(26,16,16,.35);
}
.ach-card:not(.done) .ach-medal { filter: grayscale(1) brightness(.55); }
.ach-medal.icon-fold:after { border-radius: 6px; transform: rotate(45deg); }
.ach-medal.icon-well:after { inset: 14px; }
.ach-medal.icon-quiet:after { border: 0; background: conic-gradient(from 180deg, transparent, rgba(0,0,0,.4)); }
.hud { position:absolute; inset:0; pointer-events:none; }
.hud-top {
  pointer-events:auto; display:flex; align-items:flex-start; justify-content:space-between;
  padding: 12px 12px 0; gap:10px;
}
.hud-meta { text-align:center; flex:1; min-width:0; }
.hud-meta strong {
  display:block; font-size:14px; letter-spacing:.03em;
  font-family: "Fraunces", Georgia, serif; margin-bottom:6px;
  text-shadow: 0 2px 10px rgba(0,0,0,0.45);
}
.progress-wrap { max-width: 240px; margin: 0 auto; }
.progress-bar {
  height: 8px; border-radius: 99px; overflow: hidden;
  background: rgba(0,0,0,0.35); border: 1px solid rgba(255,255,255,0.12);
}
.progress-bar i {
  display:block; height:100%; width:0%;
  background: linear-gradient(90deg, var(--accent-deep), var(--floor-lit));
  box-shadow: 0 0 12px color-mix(in srgb, var(--accent) 50%, transparent);
  transition: width 0.18s ease;
}
.progress-label {
  display:block; margin-top:5px; font-size:11px; opacity:0.85;
  text-shadow: 0 1px 6px rgba(0,0,0,0.5);
}
.hint {
  position:absolute; left:50%; bottom: 11%; transform:translateX(-50%);
  background: rgba(12,10,20,.72); padding:9px 14px; border-radius:999px;
  font-size:13px; pointer-events:none; white-space:nowrap;
  border: 1px solid rgba(255,255,255,0.1);
  backdrop-filter: blur(6px);
}
.panel.shine { animation: in .38s ease; }
@keyframes in { from { transform: translateY(12px) scale(0.98); opacity:0; } }
.form { display:flex; flex-direction:column; gap:12px; width:min(420px, 100%); }
.form label { display:flex; justify-content:space-between; align-items:center; gap:12px; font-size:14px; }
.form input[type=range] { width: 46%; accent-color: var(--accent); }
.form select { background:#2a2234; color:#fff; border:0; border-radius:10px; padding:6px 8px; }
.bar { width:min(240px, 70vw); height:8px; background: rgba(255,255,255,.12); border-radius:99px; overflow:hidden; }
.bar i { display:block; height:100%; background: linear-gradient(90deg, var(--accent-deep), var(--accent)); }
.toast {
  position:absolute; left:50%; bottom:18px; transform:translateX(-50%);
  background: rgba(16,12,24,.88); padding:9px 16px; border-radius:999px; font-size:13px;
  pointer-events:none; border:1px solid rgba(255,255,255,0.12);
}
.reward { font-weight:700; color: var(--rim); font-size:16px; }
.debug { position:absolute; left:8px; bottom:8px; font: 11px/1.3 monospace; color:#cfe; opacity:.8; pointer-events:none; white-space:pre; }
@media (max-height: 500px) {
  .logo { font-size: 22px; }
  .lede { display:none; }
  .btn { padding: 8px 12px; }
  .grid-lvls { grid-template-columns: repeat(6, 1fr); }
  .hint { bottom: 8%; font-size:12px; }
  .intro-line { display:block; }
  .intro-stage { height: 100px; }
}
`;
