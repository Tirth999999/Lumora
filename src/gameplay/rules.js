import { TILE } from "../config/game.js";

const DMAP = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function inBounds(level, x, y) {
  return x >= 0 && y >= 0 && x < level.w && y < level.h;
}

export function cellAt(level, x, y) {
  if (!inBounds(level, x, y)) return { t: TILE.VOID };
  return level.grid[y][x];
}

export function isSolid(cell, flags, x, y) {
  if (!cell || cell.t === TILE.VOID || cell.t === TILE.PILLAR) return true;
  if (flags?.crumbled?.has(`${x},${y}`)) return true;
  if (cell.t === TILE.RIFT) return false;
  if (cell.t === TILE.SEAL && !flags.sealsOpen.has(cell.sealId)) return true;
  return false;
}

export function isFloorTile(cell) {
  if (!cell) return false;
  return (
    cell.t === TILE.SHARD ||
    cell.t === TILE.ANCHOR ||
    cell.t === TILE.WELL ||
    cell.t === TILE.FOLD ||
    cell.t === TILE.VANE ||
    cell.t === TILE.HEART ||
    cell.t === TILE.SEAL ||
    cell.t === TILE.FRACTURE ||
    cell.t === TILE.MIRROR ||
    cell.t === TILE.ONEWAY
  );
}

/** Floor tiles that must be restored (covered). Rifts are hazards, not targets. */
export function listRestoreTargets(level) {
  if (level.restoreTargets?.length) return level.restoreTargets;
  const out = [];
  for (let y = 0; y < level.h; y++) {
    for (let x = 0; x < level.w; x++) {
      const c = level.grid[y][x];
      if (isFloorTile(c)) out.push(`${x},${y}`);
    }
  }
  return out;
}

export function rotateDir(dir, vane) {
  const order = ["up", "right", "down", "left"];
  const i = order.indexOf(dir);
  if (vane === "cw") return order[(i + 1) % 4];
  if (vane === "ccw") return order[(i + 3) % 4];
  return vane;
}

export function oppositeDir(dir) {
  return { up: "down", down: "up", left: "right", right: "left" }[dir] || dir;
}

export function simulateSlide(level, x, y, dirName, flags) {
  const path = [{ x, y }];
  let dir = DMAP[dirName];
  let dname = dirName;
  let cx = x;
  let cy = y;
  let hops = 0;
  const seen = new Set();
  while (hops++ < 80) {
    const here = cellAt(level, cx, cy);
    if (here.t === TILE.ONEWAY && dname !== here.oneway) break;
    const nx = cx + dir.x;
    const ny = cy + dir.y;
    const next = cellAt(level, nx, ny);
    if (next.t === TILE.ONEWAY && dname !== next.oneway) break;
    if (isSolid(next, flags, nx, ny)) break;
    cx = nx;
    cy = ny;
    path.push({ x: cx, y: cy });
    const key = `${cx},${cy},${dname}`;
    if (seen.has(key)) break;
    seen.add(key);
    if (next.t === TILE.VANE) {
      dname = rotateDir(dname, next.vane);
      dir = DMAP[dname];
    }
    if (next.t === TILE.MIRROR) {
      dname = oppositeDir(dname);
      dir = DMAP[dname];
    }
    if (next.t === TILE.FOLD && flags.foldsActive) {
      const other = level.folds.find((f) => f.id === next.foldId && (f.x !== cx || f.y !== cy));
      if (other) {
        cx = other.x;
        cy = other.y;
        path.push({ x: cx, y: cy, fold: true });
      }
    }
  }
  return { path, x: cx, y: cy, dir: dname, stopped: path.length > 1 || hops === 1 };
}

export function defaultFlags(level, extra = {}) {
  return {
    anchors: new Set(extra.anchors || []),
    wells: new Set(extra.wells || []),
    sealsOpen: new Set(extra.sealsOpen || []),
    foldsActive: extra.foldsActive || false,
    sequence: extra.sequence || 0,
    visited: extra.visited ? new Set(extra.visited) : new Set(),
    riftHit: !!extra.riftHit,
    heart: !!extra.heart,
    crumbled: extra.crumbled ? new Set(extra.crumbled) : new Set(),
  };
}

export function applyVisit(level, flags, x, y) {
  const cell = cellAt(level, x, y);
  flags.visited.add(`${x},${y}`);
  if (cell.t === TILE.RIFT) flags.riftHit = true;
  if (cell.t === TILE.ANCHOR) {
    if (level.objective === "sequence") {
      if (cell.order === flags.sequence) {
        flags.sequence += 1;
        flags.anchors.add(cell.anchorId);
      }
    } else {
      flags.anchors.add(cell.anchorId);
    }
  }
  if (cell.t === TILE.HEART) flags.heart = true;
  for (const seal of level.seals || []) {
    if (seal.requires.every((id) => flags.anchors.has(id))) flags.sealsOpen.add(seal.id);
  }
  if (level.foldNeed && flags.anchors.size >= level.foldNeed) flags.foldsActive = true;
  if (level.foldNeed === 0 && (level.folds?.length || 0) > 0) flags.foldsActive = true;
}

export function applyStop(level, flags, x, y) {
  const cell = cellAt(level, x, y);
  if (cell.t === TILE.WELL) flags.wells.add(cell.wellId);
}

export function crumbleLeftTiles(level, flags, path) {
  if (!path) return;
  for (let i = 0; i < path.length - 1; i++) {
    const p = path[i];
    const cell = cellAt(level, p.x, p.y);
    if (cell.t === TILE.FRACTURE) flags.crumbled.add(`${p.x},${p.y}`);
  }
}

export function coverageCount(level, flags) {
  const targets = listRestoreTargets(level);
  let n = 0;
  for (const id of targets) if (flags.visited.has(id)) n++;
  return { cur: n, max: targets.length };
}

export function objectiveMet(level, flags) {
  if (flags.riftHit && (level.objective === "safe" || level.riftsFail)) return false;

  const { cur, max } = coverageCount(level, flags);
  const allCovered = max > 0 && cur >= max;

  if (level.objective === "wells") {
    return allCovered && level.wells.every((w) => flags.wells.has(w.id));
  }
  if (level.objective === "sequence") {
    return allCovered && flags.sequence >= (level.anchors?.length || 0);
  }
  if (level.objective === "fold") {
    return allCovered && flags.foldsActive;
  }
  // restore + safe: cover every floor tile
  return allCovered;
}

export function flagsKey(flags, level) {
  const a = [...flags.anchors].sort().join(".");
  const w = [...flags.wells].sort().join(".");
  const s = flags.sequence | 0;
  const f = flags.foldsActive ? 1 : 0;
  const r = flags.riftHit ? 1 : 0;
  const h = flags.heart ? 1 : 0;
  // Coverage puzzles need visited in the state key
  const v = [...flags.visited].sort().join(",");
  const c = [...(flags.crumbled || [])].sort().join(",");
  return `${a}|${w}|${s}|${f}|${r}|${h}|${v}|${c}`;
}
