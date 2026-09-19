import {
  simulateSlide,
  defaultFlags,
  applyVisit,
  applyStop,
  objectiveMet,
  flagsKey,
  coverageCount,
  listRestoreTargets,
  crumbleLeftTiles,
} from "../gameplay/rules.js";

const DIRS = ["up", "down", "left", "right"];

export function solveLevel(level, opts = {}) {
  const targets = listRestoreTargets(level);
  const maxStates = opts.maxStates || (targets.length > 18 ? 14000 : 10000);
  const maxDepth = opts.maxDepth || Math.min(36, 8 + targets.length);
  const startFlags = defaultFlags(level);
  applyVisit(level, startFlags, level.start.x, level.start.y);
  applyStop(level, startFlags, level.start.x, level.start.y);
  if (objectiveMet(level, startFlags)) {
    return { ok: false, reason: "trivial" };
  }

  const startKey = `${level.start.x},${level.start.y}|${flagsKey(startFlags, level)}`;
  const queue = [
    {
      x: level.start.x,
      y: level.start.y,
      flags: startFlags,
      path: [],
      depth: 0,
    },
  ];
  const seen = new Set([startKey]);
  let explored = 0;
  let branchy = 0;
  let bestCover = coverageCount(level, startFlags).cur;

  while (queue.length) {
    const cur = queue.shift();
    explored++;
    if (explored > maxStates) return { ok: false, reason: "too-large", bestCover };
    if (cur.depth >= maxDepth) continue;

    let options = 0;
    for (const dir of DIRS) {
      const slide = simulateSlide(level, cur.x, cur.y, dir, cur.flags);
      if (slide.path.length < 2) continue;
      options++;
      const nf = defaultFlags(level, {
        anchors: cur.flags.anchors,
        wells: cur.flags.wells,
        sealsOpen: cur.flags.sealsOpen,
        foldsActive: cur.flags.foldsActive,
        sequence: cur.flags.sequence,
        visited: cur.flags.visited,
        riftHit: cur.flags.riftHit,
        crumbled: cur.flags.crumbled,
      });
      nf.heart = cur.flags.heart;
      for (const p of slide.path) applyVisit(level, nf, p.x, p.y);
      crumbleLeftTiles(level, nf, slide.path);
      applyStop(level, nf, slide.x, slide.y);
      if (nf.riftHit && (level.objective === "safe" || level.riftsFail)) continue;

      const cover = coverageCount(level, nf).cur;
      if (cover > bestCover) bestCover = cover;

      if (objectiveMet(level, nf)) {
        const solution = cur.path.concat(dir);
        return {
          ok: true,
          solution,
          moves: solution.length,
          explored,
          branchy,
          bestCover,
        };
      }
      const key = `${slide.x},${slide.y}|${flagsKey(nf, level)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      queue.push({
        x: slide.x,
        y: slide.y,
        flags: nf,
        path: cur.path.concat(dir),
        depth: cur.depth + 1,
      });
    }
    if (options >= 3) branchy++;
  }
  return { ok: false, reason: "unsolved", explored, bestCover };
}

export function scoreDifficulty(level, solve) {
  const targets = listRestoreTargets(level).length;
  const specials =
    (level.wells?.length || 0) * 3 +
    (level.seals?.length || 0) * 4 +
    (level.folds?.length ? 5 : 0) +
    (level.vanes?.length || 0) * 3 +
    (level.rifts?.length || 0) * 2;
  const moves = solve.moves || 0;
  const score =
    targets * 1.4 +
    moves * 5.5 +
    Math.min(28, (solve.branchy || 0) * 0.15) +
    specials +
    (level.objective === "sequence" ? 10 : 0) +
    (level.objective === "wells" ? 6 : 0);
  let band = "easy";
  if (score > 40) band = "medium";
  if (score > 70) band = "hard";
  if (score > 105) band = "expert";
  return { score: Math.round(score), band, moves, quiet: Math.max(moves, Math.ceil(moves * 1.2)) };
}
