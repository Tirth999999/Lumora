import { Pool } from "../core/pool.js";
import { lerp } from "../core/math.js";

export function createEffects(quality) {
  const cap = quality;
  const motes = new Pool(
    () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, r: 2, a: 1 }),
    (o, i) => {
      o.x = i.x;
      o.y = i.y;
      o.vx = i.vx;
      o.vy = i.vy;
      o.life = i.life;
      o.max = i.life;
      o.r = i.r;
      o.a = i.a ?? 1;
    },
    120
  );
  const wake = new Pool(
    () => ({ x: 0, y: 0, life: 0, max: 1, w: 8 }),
    (o, i) => {
      o.x = i.x;
      o.y = i.y;
      o.life = i.life;
      o.max = i.life;
      o.w = i.w;
    },
    80
  );

  return {
    motes,
    wake,
    burst(x, y, n, spread = 40) {
      const count = Math.min(n, cap.burst);
      for (let i = 0; i < count; i++) {
        const a = (Math.PI * 2 * i) / count + Math.random() * 0.2;
        const s = 18 + Math.random() * spread;
        motes.spawn({
          x,
          y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - 20,
          life: 0.5 + Math.random() * 0.4,
          r: 1.6 + Math.random() * 2.2,
          a: 0.9,
        });
      }
    },
    emitWake(x, y) {
      if (wake.live.length > cap.wake) return;
      wake.spawn({ x, y, life: 0.45, w: 10 + Math.random() * 6 });
      if (motes.live.length < cap.motes) {
        motes.spawn({
          x: x + (Math.random() - 0.5) * 10,
          y: y + (Math.random() - 0.5) * 8,
          vx: (Math.random() - 0.5) * 12,
          vy: -20 - Math.random() * 18,
          life: 0.6,
          r: 1.4 + Math.random() * 1.8,
          a: 0.7,
        });
      }
    },
    update(dt) {
      motes.update(dt, (o, d) => {
        o.life -= d;
        o.x += o.vx * d;
        o.y += o.vy * d;
        o.vy -= 12 * d;
        o.vx *= 0.98;
        return o.life > 0;
      });
      wake.update(dt, (o, d) => {
        o.life -= d;
        o.w = lerp(o.w, 4, d * 2);
        return o.life > 0;
      });
    },
    clear() {
      motes.clear();
      wake.clear();
    },
  };
}
