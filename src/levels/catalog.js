import { WORLDS, OBJECTIVE } from "../config/game.js";
import { hashString } from "../core/math.js";
import { generateValidated, tutorialLevel } from "../generation/generator.js";

function ramp(i, easy, hard) {
  return easy + Math.round((hard - easy) * (i / 9));
}

const WORLD_CURVE = {
  emberwake: (i) => ({
    w: i < 3 ? 6 : i < 7 ? 7 : 8,
    h: i < 3 ? 5 : i < 7 ? 6 : 7,
    pillars: 1 + Math.floor(i / 4),
    objective: OBJECTIVE.RESTORE,
    mechanics: ["restore"],
    minMoves: i < 2 ? 1 : ramp(i, 2, 5),
    maxMoves: ramp(i, 10, 18),
    minTiles: i < 4 ? 6 : 8,
    maxTiles: ramp(i, 14, 24),
    density: 0.42 + i * 0.02,
    maxScore: i < 4 ? 90 : 180,
  }),
  tidecrest: (i) => ({
    w: 7 + (i > 6 ? 1 : 0),
    h: 6 + (i > 4 ? 1 : 0),
    pillars: 2 + Math.floor(i / 5),
    wells: 1 + (i > 5 ? 1 : 0),
    rifts: i > 3 ? 1 : 0,
    objective: i % 5 === 4 ? OBJECTIVE.SAFE : i % 3 === 2 ? OBJECTIVE.WELLS : OBJECTIVE.RESTORE,
    mechanics: ["well", i > 3 ? "rift" : "restore"],
    riftsFail: true,
    minMoves: ramp(i, 2, 6),
    maxMoves: ramp(i, 12, 20),
    minTiles: 8,
    maxTiles: ramp(i, 16, 26),
    density: 0.48 + i * 0.018,
  }),
  duskveil: (i) => ({
    w: 7 + (i > 7 ? 1 : 0),
    h: 7,
    pillars: 2 + (i > 5 ? 1 : 0),
    anchors: 2 + (i > 6 ? 1 : 0),
    seals: 1,
    objective: i % 2 === 0 ? OBJECTIVE.SEQUENCE : OBJECTIVE.RESTORE,
    mechanics: ["seal", "sequence"],
    minMoves: ramp(i, 3, 7),
    maxMoves: ramp(i, 14, 22),
    minTiles: 9,
    maxTiles: ramp(i, 18, 26),
    density: 0.5 + i * 0.015,
  }),
  canopy: (i) => ({
    w: 7 + (i > 6 ? 1 : 0),
    h: 7,
    pillars: 2 + Math.floor(i / 5),
    vanes: 1 + (i > 3 ? 1 : 0) + (i > 7 ? 1 : 0),
    objective: OBJECTIVE.RESTORE,
    mechanics: ["vane", i > 5 ? "well" : "vane"],
    wells: i > 5 ? 1 : 0,
    minMoves: ramp(i, 3, 7),
    maxMoves: ramp(i, 14, 22),
    minTiles: 9,
    maxTiles: ramp(i, 18, 26),
    density: 0.52 + i * 0.014,
  }),
  starloom: (i) => ({
    w: 7 + (i > 5 ? 1 : 0),
    h: 7 + (i > 8 ? 1 : 0),
    pillars: 2 + (i > 4 ? 1 : 0),
    objective: i % 4 === 3 ? OBJECTIVE.FOLD : OBJECTIVE.RESTORE,
    mechanics: ["fold", i > 3 ? "vane" : "fold"],
    vanes: i > 3 ? 1 : 0,
    minMoves: ramp(i, 3, 8),
    maxMoves: ramp(i, 14, 22),
    minTiles: 9,
    maxTiles: ramp(i, 18, 28),
    density: 0.5 + i * 0.016,
  }),
  cinderfall: (i) => ({
    w: 7 + (i > 5 ? 1 : 0),
    h: 6 + (i > 3 ? 1 : 0),
    pillars: 2 + Math.floor(i / 4),
    fractures: 2 + Math.floor(i / 3),
    objective: OBJECTIVE.RESTORE,
    mechanics: ["fracture"],
    minMoves: ramp(i, 3, 8),
    maxMoves: ramp(i, 14, 22),
    minTiles: 9,
    maxTiles: ramp(i, 16, 24),
    density: 0.5 + i * 0.015,
  }),
  mirrorfen: (i) => ({
    w: 7 + (i > 6 ? 1 : 0),
    h: 7,
    pillars: 2 + (i > 4 ? 1 : 0),
    mirrors: 1 + (i > 3 ? 1 : 0) + (i > 7 ? 1 : 0),
    objective: OBJECTIVE.RESTORE,
    mechanics: ["mirror", i > 5 ? "vane" : "mirror"],
    vanes: i > 5 ? 1 : 0,
    minMoves: ramp(i, 3, 8),
    maxMoves: ramp(i, 14, 22),
    minTiles: 9,
    maxTiles: ramp(i, 18, 26),
    density: 0.5 + i * 0.014,
  }),
  zephyrrow: (i) => ({
    w: 7 + (i > 5 ? 1 : 0),
    h: 7,
    pillars: 2,
    oneways: 2 + Math.floor(i / 3),
    objective: OBJECTIVE.RESTORE,
    mechanics: ["oneway"],
    minMoves: ramp(i, 3, 8),
    maxMoves: ramp(i, 14, 22),
    minTiles: 9,
    maxTiles: ramp(i, 18, 26),
    density: 0.52 + i * 0.014,
  }),
  hollowmere: (i) => ({
    w: 7,
    h: 6 + (i > 4 ? 1 : 0),
    pillars: 2 + (i > 6 ? 1 : 0),
    rifts: 1 + (i > 3 ? 1 : 0) + (i > 7 ? 1 : 0),
    wells: i > 5 ? 1 : 0,
    objective: OBJECTIVE.SAFE,
    mechanics: ["rift", i > 5 ? "well" : "rift"],
    riftsFail: true,
    minMoves: ramp(i, 3, 7),
    maxMoves: ramp(i, 14, 20),
    minTiles: 8,
    maxTiles: ramp(i, 16, 24),
    density: 0.48 + i * 0.016,
  }),
  prismarch: (i) => ({
    w: 7 + (i > 6 ? 1 : 0),
    h: 7,
    pillars: 2 + (i > 5 ? 1 : 0),
    anchors: 2 + (i > 4 ? 1 : 0),
    objective: OBJECTIVE.SEQUENCE,
    mechanics: ["sequence"],
    minMoves: ramp(i, 3, 8),
    maxMoves: ramp(i, 14, 22),
    minTiles: 9,
    maxTiles: ramp(i, 18, 26),
    density: 0.5 + i * 0.015,
  }),
  brasslock: (i) => ({
    w: 7 + (i > 6 ? 1 : 0),
    h: 7,
    pillars: 2 + (i > 4 ? 1 : 0),
    seals: 1 + (i > 4 ? 1 : 0),
    objective: OBJECTIVE.RESTORE,
    mechanics: ["seal"],
    minMoves: ramp(i, 3, 8),
    maxMoves: ramp(i, 14, 22),
    minTiles: 9,
    maxTiles: ramp(i, 18, 26),
    density: 0.5 + i * 0.015,
  }),
  auroraloom: (i) => ({
    w: 7 + (i > 5 ? 1 : 0),
    h: 7,
    pillars: 2,
    objective: OBJECTIVE.RESTORE,
    mechanics: ["heart", "fold", i > 5 ? "vane" : "fold"],
    vanes: i > 5 ? 1 : 0,
    minMoves: ramp(i, 4, 8),
    maxMoves: ramp(i, 16, 24),
    minTiles: 10,
    maxTiles: ramp(i, 18, 28),
    density: 0.52 + i * 0.014,
  }),
  rootspire: (i) => ({
    w: 7 + (i > 4 ? 1 : 0),
    h: 7 + (i > 7 ? 1 : 0),
    pillars: 3 + Math.floor(i / 3),
    objective: OBJECTIVE.RESTORE,
    mechanics: ["restore"],
    minMoves: ramp(i, 4, 8),
    maxMoves: ramp(i, 14, 22),
    minTiles: 10,
    maxTiles: ramp(i, 18, 28),
    density: 0.56 + i * 0.012,
  }),
  stormglass: (i) => ({
    w: 7 + (i > 6 ? 1 : 0),
    h: 7,
    pillars: 2,
    oneways: 2 + Math.floor(i / 4),
    rifts: 1 + (i > 4 ? 1 : 0),
    vanes: i > 6 ? 1 : 0,
    objective: OBJECTIVE.SAFE,
    mechanics: ["oneway", "rift", i > 6 ? "vane" : "rift"],
    riftsFail: true,
    minMoves: ramp(i, 3, 8),
    maxMoves: ramp(i, 14, 22),
    minTiles: 9,
    maxTiles: ramp(i, 16, 24),
    density: 0.5 + i * 0.014,
  }),
  duskforge: (i) => ({
    w: 7 + (i > 5 ? 1 : 0),
    h: 7,
    pillars: 2 + (i > 6 ? 1 : 0),
    fractures: 2 + Math.floor(i / 4),
    rifts: 1 + (i > 5 ? 1 : 0),
    objective: OBJECTIVE.SAFE,
    mechanics: ["fracture", "rift"],
    riftsFail: true,
    minMoves: ramp(i, 4, 8),
    maxMoves: ramp(i, 14, 22),
    minTiles: 9,
    maxTiles: ramp(i, 16, 24),
    density: 0.5 + i * 0.014,
  }),
};

export function levelParams(worldId, index) {
  const curve = WORLD_CURVE[worldId] || WORLD_CURVE.emberwake;
  const p = curve(index);
  p.worldId = worldId;
  p.index = index;
  p.palette = worldId;
  p.title = `${WORLDS.find((w) => w.id === worldId)?.name || "Lattice"} ${index + 1}`;
  p.radius = 1.9 + index * 0.04;
  p.maxStates = 18000;
  return p;
}

export function getLevel(worldId, index) {
  if (worldId === "emberwake" && index < 3) return tutorialLevel(index);
  const params = levelParams(worldId, index);
  const seed = hashString(`${worldId}:${index}:lumora:v3:restore`);
  return generateValidated(seed, params);
}

export function getDailyLevel(dateKey) {
  const seed = hashString(`daily:${dateKey}:lumora:v3`);
  const palettes = WORLDS.map((w) => w.id).concat("daily");
  const palette = palettes[seed % palettes.length];
  return generateValidated(seed, {
    w: 7 + (seed % 2),
    h: 7,
    pillars: 2,
    wells: 1,
    rifts: 1,
    fractures: 1,
    objective: OBJECTIVE.SAFE,
    mechanics: ["rift", "well", "fracture"],
    riftsFail: true,
    palette,
    worldId: "daily",
    index: 0,
    title: `Dayweave ${dateKey}`,
    minMoves: 3,
    maxMoves: 18,
    minTiles: 9,
    maxTiles: 24,
    radius: 2.2,
  });
}

export function worldProgress(completed, worldId) {
  const world = WORLDS.find((w) => w.id === worldId);
  let n = 0;
  for (let i = 0; i < world.levels; i++) if (completed[`${worldId}:${i}`]) n++;
  return n;
}
