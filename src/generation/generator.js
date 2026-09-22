import { TILE, OBJECTIVE } from "../config/game.js";
import { mulberry32, pick } from "../core/math.js";
import { resolvePalette } from "../config/palette.js";
import { solveLevel, scoreDifficulty } from "../solver/solver.js";
import { listRestoreTargets } from "../gameplay/rules.js";

function emptyCell() {
  return { t: TILE.VOID };
}

function shard() {
  return { t: TILE.SHARD };
}

function makeGrid(w, h, fill = TILE.VOID) {
  return Array.from({ length: h }, () =>
    Array.from({ length: w }, () => (fill === TILE.SHARD ? shard() : emptyCell()))
  );
}

function neighbors4(x, y) {
  return [
    [x + 1, y],
    [x - 1, y],
    [x, y + 1],
    [x, y - 1],
  ];
}

function carveBlob(grid, rng, cx, cy, radius) {
  const h = grid.length;
  const w = grid[0].length;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.hypot(x - cx, y - cy) + (rng() - 0.5) * 1.2;
      if (d < radius) grid[y][x] = shard();
    }
  }
}

/** Carve a connected corridor snake — better for cover-all ice puzzles. */
function carveSnake(grid, rng, steps) {
  const h = grid.length;
  const w = grid[0].length;
  let x = 1 + Math.floor(rng() * (w - 2));
  let y = 1 + Math.floor(rng() * (h - 2));
  grid[y][x] = shard();
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (let i = 0; i < steps; i++) {
    const opts = dirs.filter(([dx, dy]) => {
      const nx = x + dx;
      const ny = y + dy;
      return nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1;
    });
    if (!opts.length) break;
    const [dx, dy] = pick(rng, opts);
    x += dx;
    y += dy;
    grid[y][x] = shard();
    if (rng() > 0.55) {
      const [sx, sy] = pick(rng, opts);
      const bx = x + sx;
      const by = y + sy;
      if (bx > 0 && by > 0 && bx < w - 1 && by < h - 1) grid[by][bx] = shard();
    }
  }
}

function countWalk(grid) {
  let n = 0;
  for (const row of grid) for (const c of row) if (c.t === TILE.SHARD) n++;
  return n;
}

function randomWalkable(grid, rng) {
  const spots = [];
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x].t === TILE.SHARD) spots.push({ x, y });
    }
  }
  return spots.length ? pick(rng, spots) : null;
}

function placePillars(grid, rng, count) {
  const placed = [];
  let tries = 0;
  while (placed.length < count && tries++ < 100) {
    const p = randomWalkable(grid, rng);
    if (!p) break;
    let open = 0;
    for (const [nx, ny] of neighbors4(p.x, p.y)) {
      if (grid[ny]?.[nx]?.t === TILE.SHARD) open++;
    }
    if (open < 2) continue;
    grid[p.y][p.x] = { t: TILE.PILLAR };
    placed.push(p);
  }
  return placed;
}

function uniqueSpots(grid, rng, n, avoid) {
  const out = [];
  const used = new Set(avoid.map((p) => `${p.x},${p.y}`));
  let tries = 0;
  while (out.length < n && tries++ < 140) {
    const p = randomWalkable(grid, rng);
    if (!p) break;
    const k = `${p.x},${p.y}`;
    if (used.has(k)) continue;
    used.add(k);
    out.push(p);
  }
  return out;
}

function assemble(grid, spec) {
  const h = grid.length;
  const w = grid[0].length;
  const anchors = [];
  const wells = [];
  const folds = [];
  const vanes = [];
  const rifts = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = grid[y][x];
      if (c.t === TILE.ANCHOR) anchors.push({ id: c.anchorId, x, y, order: c.order ?? anchors.length });
      if (c.t === TILE.WELL) wells.push({ id: c.wellId, x, y });
      if (c.t === TILE.FOLD) folds.push({ id: c.foldId, x, y });
      if (c.t === TILE.VANE) vanes.push({ x, y, vane: c.vane });
      if (c.t === TILE.RIFT) rifts.push({ x, y });
    }
  }
  const level = {
    w,
    h,
    grid,
    start: spec.start,
    objective: spec.objective,
    anchors,
    wells,
    seals: spec.seals || [],
    folds,
    vanes,
    rifts,
    foldNeed: spec.foldNeed ?? (folds.length ? 0 : 0),
    riftsFail: spec.riftsFail || spec.objective === "safe",
    palette: spec.palette,
    worldId: spec.worldId,
    index: spec.index,
    seed: spec.seed,
    mechanics: spec.mechanics,
    title: spec.title,
  };
  level.restoreTargets = listRestoreTargets(level);
  level.paletteResolved = resolvePalette(spec.palette || spec.worldId, spec.index || 0, spec.seed || 0);
  return level;
}

export function generateCandidate(seed, params) {
  const rng = mulberry32(seed);
  const w = params.w;
  const h = params.h;
  const grid = makeGrid(w, h, TILE.VOID);

  const density = params.density ?? 0.45 + rng() * 0.25;
  if (rng() > 0.28) {
    carveSnake(grid, rng, Math.floor(w * h * density));
  } else {
    const blobs = 1 + Math.floor(rng() * 2);
    for (let i = 0; i < blobs; i++) {
      carveBlob(grid, rng, 1 + rng() * (w - 2), 1 + rng() * (h - 2), 1.4 + rng() * (params.radius || 2));
    }
  }

  let walk = countWalk(grid);
  if (walk < (params.minTiles || 8)) carveSnake(grid, rng, Math.max(30, (params.minTiles || 8) * 1.5));
  walk = countWalk(grid);
  if (walk > (params.maxTiles || 22)) {
    // trim random shards at edges
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (grid[y][x].t === TILE.SHARD && rng() > 0.72) {
          let n = 0;
          for (const [nx, ny] of neighbors4(x, y)) if (grid[ny]?.[nx]?.t === TILE.SHARD) n++;
          if (n <= 1) grid[y][x] = emptyCell();
        }
      }
    }
  }

  placePillars(grid, rng, params.pillars || 1);

  const start = randomWalkable(grid, rng);
  if (!start) return null;

  const objective = params.objective || OBJECTIVE.RESTORE;
  const mechanics = params.mechanics || [];
  const avoid = [start];
  const spec = {
    start,
    objective,
    palette: params.palette,
    worldId: params.worldId,
    index: params.index,
    seed,
    mechanics,
    title: params.title,
    seals: [],
    riftsFail: objective === OBJECTIVE.SAFE || !!params.riftsFail,
  };

  const spots = uniqueSpots(grid, rng, 16, avoid);
  let si = 0;

  if (mechanics.includes("well") || objective === OBJECTIVE.WELLS) {
    const n = params.wells ?? 1;
    for (let i = 0; i < n && si < spots.length; i++) {
      const p = spots[si++];
      grid[p.y][p.x] = { t: TILE.WELL, wellId: i };
    }
  }
  if (mechanics.includes("rift") || objective === OBJECTIVE.SAFE) {
    const n = params.rifts ?? 1;
    for (let i = 0; i < n && si < spots.length; i++) {
      const p = spots[si++];
      grid[p.y][p.x] = { t: TILE.RIFT };
    }
  }
  if (mechanics.includes("seal")) {
    const n = params.seals ?? 1;
    spec.seals = [];
    for (let i = 0; i < n && si + 1 < spots.length; i++) {
      const p = spots[si++];
      const a = spots[si++];
      grid[a.y][a.x] = { t: TILE.ANCHOR, anchorId: i, order: i };
      grid[p.y][p.x] = { t: TILE.SEAL, sealId: i };
      spec.seals.push({ id: i, x: p.x, y: p.y, requires: [i] });
    }
  }
  if (mechanics.includes("sequence") || objective === OBJECTIVE.SEQUENCE) {
    const n = Math.min(3, params.anchors || 2);
    const base = spec.seals?.length || 0;
    for (let i = 0; i < n && si < spots.length; i++) {
      const p = spots[si++];
      grid[p.y][p.x] = { t: TILE.ANCHOR, anchorId: base + i, order: i };
    }
  }
  if (mechanics.includes("vane")) {
    const n = params.vanes ?? 1;
    for (let i = 0; i < n && si < spots.length; i++) {
      const p = spots[si++];
      grid[p.y][p.x] = { t: TILE.VANE, vane: rng() > 0.5 ? "cw" : "ccw" };
    }
  }
  if (mechanics.includes("fold") && si + 1 < spots.length) {
    const a = spots[si++];
    const b = spots[si++];
    grid[a.y][a.x] = { t: TILE.FOLD, foldId: 0 };
    grid[b.y][b.x] = { t: TILE.FOLD, foldId: 0 };
    spec.foldNeed = 0;
  }
  if (mechanics.includes("fracture")) {
    const n = params.fractures ?? 2;
    for (let i = 0; i < n && si < spots.length; i++) {
      const p = spots[si++];
      grid[p.y][p.x] = { t: TILE.FRACTURE };
    }
  }
  if (mechanics.includes("mirror")) {
    const n = params.mirrors ?? 1;
    for (let i = 0; i < n && si < spots.length; i++) {
      const p = spots[si++];
      grid[p.y][p.x] = { t: TILE.MIRROR };
    }
  }
  if (mechanics.includes("oneway")) {
    const n = params.oneways ?? 2;
    const dirs = ["up", "down", "left", "right"];
    for (let i = 0; i < n && si < spots.length; i++) {
      const p = spots[si++];
      grid[p.y][p.x] = { t: TILE.ONEWAY, oneway: dirs[Math.floor(rng() * 4)] };
    }
  }
  if (mechanics.includes("heart") && si < spots.length) {
    const p = spots[si++];
    grid[p.y][p.x] = { t: TILE.HEART };
  }

  return assemble(grid, spec);
}

export function generateValidated(seed, params) {
  let s = seed >>> 0;
  for (let i = 0; i < 80; i++) {
    const level = generateCandidate((s + i * 9973) >>> 0, params);
    if (!level) continue;
    const targets = level.restoreTargets.length;
    if (targets < (params.minTiles || 6) || targets > (params.maxTiles || 28)) continue;
    const solved = solveLevel(level, {
      maxStates: params.maxStates || 16000,
      maxDepth: params.maxDepth || Math.min(36, 7 + targets),
    });
    if (!solved.ok) continue;
    if (params.minMoves && solved.moves < params.minMoves) continue;
    if (params.maxMoves && solved.moves > params.maxMoves) continue;
    const diff = scoreDifficulty(level, solved);
    if (params.minScore && diff.score < params.minScore) continue;
    if (params.maxScore && diff.score > params.maxScore) continue;
    level.solution = solved.solution;
    level.difficulty = diff;
    return level;
  }
  return fallbackLevel(seed, params);
}

function fallbackLevel(seed, params) {
  const w = 6;
  const h = 5;
  const grid = makeGrid(w, h, TILE.VOID);
  for (let x = 1; x <= 4; x++) grid[1][x] = shard();
  for (let y = 1; y <= 3; y++) grid[y][4] = shard();
  for (let x = 1; x <= 4; x++) grid[3][x] = shard();
  grid[2][2] = { t: TILE.PILLAR };
  const start = { x: 1, y: 1 };
  const level = assemble(grid, {
    start,
    objective: OBJECTIVE.RESTORE,
    palette: params.palette,
    worldId: params.worldId,
    index: params.index,
    seed,
    mechanics: ["restore"],
    title: params.title || "Fallback Lattice",
    seals: [],
  });
  const solved = solveLevel(level);
  level.solution = solved.ok ? solved.solution : ["right", "down", "left"];
  level.difficulty = scoreDifficulty(level, solved.ok ? solved : { moves: 3, branchy: 0 });
  return level;
}

export function tutorialLevel(index) {
  if (index === 0) {
    const grid = makeGrid(5, 4, TILE.VOID);
    for (let x = 1; x <= 3; x++) grid[2][x] = shard();
    const level = assemble(grid, {
      start: { x: 1, y: 2 },
      objective: OBJECTIVE.RESTORE,
      palette: "emberwake",
      worldId: "emberwake",
      index: 0,
      seed: 1,
      mechanics: ["restore"],
      title: "First Light",
      seals: [],
    });
    level.handcrafted = true;
    level.hint = "Swipe to glide — restore every tile.";
    const solved = solveLevel(level);
    level.solution = solved.solution || ["right"];
    level.difficulty = scoreDifficulty(level, solved);
    return level;
  }
  if (index === 1) {
    const grid = makeGrid(6, 5, TILE.VOID);
    for (let x = 1; x <= 4; x++) grid[1][x] = shard();
    for (let y = 1; y <= 3; y++) grid[y][4] = shard();
    for (let x = 1; x <= 4; x++) grid[3][x] = shard();
    const level = assemble(grid, {
      start: { x: 1, y: 1 },
      objective: OBJECTIVE.RESTORE,
      palette: "emberwake",
      worldId: "emberwake",
      index: 1,
      seed: 2,
      mechanics: ["restore"],
      title: "The Bend",
      seals: [],
    });
    level.handcrafted = true;
    level.hint = "Cover the whole path. Nuri stops at the rim.";
    const solved = solveLevel(level);
    level.solution = solved.solution || ["right", "down", "left"];
    level.difficulty = scoreDifficulty(level, solved);
    return level;
  }
  // index 2 — pillar + cover all, avoid nothing yet
  const grid = makeGrid(6, 6, TILE.VOID);
  for (let x = 1; x <= 4; x++) grid[1][x] = shard();
  for (let y = 1; y <= 4; y++) grid[y][4] = shard();
  for (let x = 1; x <= 4; x++) grid[4][x] = shard();
  grid[2][1] = shard();
  grid[3][1] = shard();
  grid[2][2] = { t: TILE.PILLAR };
  const level = assemble(grid, {
    start: { x: 1, y: 1 },
    objective: OBJECTIVE.RESTORE,
    palette: "emberwake",
    worldId: "emberwake",
    index: 2,
    seed: 3,
    mechanics: ["restore"],
    title: "Crystal Stop",
    seals: [],
  });
  level.handcrafted = true;
  level.hint = "Crystals stop Nuri. Plan a path that lights every tile.";
  const solved = solveLevel(level);
  level.solution = solved.solution || ["right", "down", "left", "up"];
  level.difficulty = scoreDifficulty(level, solved);
  return level;
}
