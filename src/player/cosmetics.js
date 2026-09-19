import { COSMETICS } from "../config/game.js";

export function cosmeticState(save) {
  const eq = save.data.equipped;
  return {
    body: eq.body,
    wake: eq.wake,
    mote: eq.mote,
    burst: eq.burst,
    sky: eq.sky,
    owned: save.data.owned,
    catalog: COSMETICS,
  };
}
