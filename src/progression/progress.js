import { ACHIEVEMENTS, COSMETICS, WORLDS } from "../config/game.js";
import { worldProgress } from "../levels/catalog.js";

export function syncAchievements(save, ctx) {
  const c = save.data.completed;
  const n = Object.keys(c).length;
  if (n >= 1) grant(save, "first-wake", ctx);
  if (n >= 10) grant(save, "ten-lattices", ctx);
  if (n >= 50) grant(save, "fifty-lattices", ctx);
  WORLDS.forEach((w) => {
    if (worldProgress(c, w.id) >= w.levels) grant(save, `world-${w.id}`, ctx);
  });
  if (save.data.owned.length >= 6) grant(save, "collector", ctx);
}

function grant(save, id, ctx) {
  if (save.achieve(id)) ctx?.onAchieve?.(ACHIEVEMENTS.find((a) => a.id === id));
}

export function buyOrEquip(save, id) {
  const item = COSMETICS.find((c) => c.id === id);
  if (!item) return { ok: false };
  if (!save.data.owned.includes(id)) {
    if (save.data.gleams < item.cost) return { ok: false, reason: "gleams" };
    save.data.gleams -= item.cost;
    save.ownCosmetic(id);
    save.data.equipped[item.type] = id;
    save.persist();
    return { ok: true, bought: true, item };
  }
  save.data.equipped[item.type] = id;
  save.persist();
  return { ok: true, equipped: true, item };
}
