import { PALETTES } from "./game.js";
import { mulberry32, mixHex, lerp, easeInOut } from "../core/math.js";

function hexToHsl(hex) {
  const n = hex.replace("#", "");
  let r = parseInt(n.slice(0, 2), 16) / 255;
  let g = parseInt(n.slice(2, 4), 16) / 255;
  let b = parseInt(n.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return { h: h * 360, s, l };
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function shiftHex(hex, dh, ds = 0, dl = 0) {
  const { h, s, l } = hexToHsl(hex);
  return hslToHex(h + dh, Math.max(0, Math.min(1, s + ds)), Math.max(0.05, Math.min(0.92, l + dl)));
}

/**
 * Each lattice gets its own accent shift inside the world theme.
 * Same world + index always yields the same palette.
 */
export function resolvePalette(worldId, levelIndex = 0, seed = 0) {
  const base = PALETTES[worldId] || PALETTES.emberwake;
  const rng = mulberry32((seed ^ ((levelIndex + 1) * 7919)) >>> 0);
  const hue = (levelIndex * 11 + rng() * 18 - 9) % 28;
  const warm = rng() * 0.08 - 0.02;
  const bright = rng() * 0.06 - 0.02;

  const out = { ...base };
  const keys = [
    "fog",
    "floor",
    "floorLit",
    "sideL",
    "sideR",
    "sideLLit",
    "sideRLit",
    "accent",
    "accentDeep",
    "rim",
  ];
  for (const k of keys) {
    if (!out[k]) continue;
    out[k] = shiftHex(out[k], hue, warm, bright);
  }
  out.skyTop = mixHex(base.skyTop, shiftHex(base.skyTop, hue * 0.4, 0, -0.02), 0.55);
  out.skyBot = mixHex(base.skyBot, shiftHex(base.skyBot, hue * 0.5, 0.02, bright), 0.65);
  out.levelTint = out.accent;
  out.progress = lerp(0.35, 1, Math.min(1, (levelIndex + 1) / 12));
  return out;
}

export function getPalette(level) {
  if (!level) return PALETTES.emberwake;
  if (level.paletteResolved) return level.paletteResolved;
  return resolvePalette(level.palette || level.worldId, level.index || 0, level.seed || 0);
}

export function mixPalettes(a, b, t) {
  if (!a) return b;
  if (!b || t <= 0) return { ...a };
  if (t >= 1) return { ...b };
  const out = { ...a };
  for (const k of Object.keys(a)) {
    if (typeof a[k] === "string" && a[k][0] === "#" && typeof b[k] === "string" && b[k][0] === "#") {
      out[k] = mixHex(a[k], b[k], t);
    }
  }
  return out;
}

const CYCLE_IDS = Object.keys(PALETTES);

/** Smooth, continuous infinite loop across every diverse world palette. */
export function cyclePalette(timeSec) {
  const hold = 3.5;
  const fade = 3.0;
  const span = hold + fade;
  const n = CYCLE_IDS.length;
  const total = ((timeSec % (span * n)) + span * n) % (span * n);
  const i = Math.floor(total / span) % n;
  const local = total - i * span;
  const t = local < hold ? 0 : easeInOut(Math.min(1, (local - hold) / fade));
  return mixPalettes(PALETTES[CYCLE_IDS[i]], PALETTES[CYCLE_IDS[(i + 1) % n]], t);
}
