import { TILE, QUALITY_PRESETS } from "../config/game.js";
import { rgba, lerp, hexToRgb } from "../core/math.js";
import { getPalette } from "../config/palette.js";
import { simulateSlide } from "../gameplay/rules.js";

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
    this.dpr = 1;
    this.layout = { tw: 56, th: 28, depth: 14, ox: 0, oy: 0 };
    this.time = 0;
    this.quality = QUALITY_PRESETS.medium;
    this.stars = Array.from({ length: 36 }, (_, i) => ({
      x: (i * 97) % 100,
      y: (i * 53) % 100,
      r: 0.5 + (i % 4) * 0.25,
      p: i * 0.17,
    }));
    this.camBob = 0;
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.canvas.width = Math.max(1, Math.floor(w * dpr));
    this.canvas.height = Math.max(1, Math.floor(h * dpr));
  }

  layoutBoard(level, hudTop, hudBot) {
    const vw = this.canvas.clientWidth;
    const vh = this.canvas.clientHeight;
    const pad = Math.max(12, Math.min(vw, vh) * 0.04);
    const availW = vw - pad * 2;
    const availH = vh - hudTop - hudBot - pad;

    // Slightly elevated isometric pitch so plateaus stay visible behind crystals.
    const pitch = 0.66;
    const isoW = (level.w + level.h) * 0.5;
    const isoH = (level.w + level.h) * (pitch / 2);
    let tw = Math.min(64, Math.max(28, availW / isoW));
    let th = tw * pitch;
    let depth = tw * 0.26;
    // Fit height including extrusion
    const boardH = (level.w + level.h) * th * 0.5 + depth + tw * 0.4;
    const boardW = (level.w + level.h) * tw * 0.5;
    if (boardH > availH) {
      const s = availH / boardH;
      tw *= s;
      th *= s;
      depth *= s;
    }
    if (boardW > availW) {
      const s = availW / boardW;
      tw *= s;
      th *= s;
      depth *= s;
    }

    this.layout = {
      tw,
      th,
      depth,
      ox: vw / 2,
      oy: hudTop + availH * 0.34,
      vw,
      vh,
    };
    return this.layout;
  }

  /** Grid → isometric screen */
  toIso(gx, gy) {
    const { tw, th, ox, oy } = this.layout;
    return {
      x: ox + (gx - gy) * (tw / 2),
      y: oy + (gx + gy) * (th / 2) + this.camBob,
    };
  }

  cellToXY(gx, gy) {
    const p = this.toIso(gx, gy);
    return { x: p.x, y: p.y - this.layout.depth };
  }

  draw(world, session, effects, cosmetics, paletteId, menuPal) {
    const ctx = this.ctx;
    const dpr = this.dpr;
    this.time += 0.016;
    this.camBob = Math.sin(this.time * 0.7) * 1.2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const vw = this.canvas.clientWidth;
    const vh = this.canvas.clientHeight;

    const pal = session
      ? getPalette(session.level)
      : menuPal || getPalette({ palette: paletteId || "emberwake", index: 0, seed: 1 });

    this.drawSky(ctx, vw, vh, pal, cosmetics);
    if (!session) {
      return;
    }

    this.drawLattice3D(ctx, session, pal);
    this.drawEffects(ctx, effects, pal, cosmetics);
    this.drawNuri3D(ctx, session, pal, cosmetics);

    if (session.complete) this.drawCompleteWash(ctx, vw, vh, pal, session.completeT);
    if (session.moves === 0 && !session.moving && session.level.hint) this.drawSwipeCue(ctx, session, pal);
    if (!session.moving && !session.complete && (cosmetics?.showHint || session.inactiveTime > 3.5 || session.stuck)) {
      this.drawPathHint(ctx, session, pal);
    }
  }

  drawSky(ctx, vw, vh, pal, cosmetics) {
    const g = ctx.createLinearGradient(0, 0, 0, vh);
    g.addColorStop(0, pal.skyTop);
    g.addColorStop(0.55, mix(pal.skyTop, pal.skyBot, 0.45));
    g.addColorStop(1, pal.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);

    // Soft volumetric fog orbs
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const x = vw * (0.15 + i * 0.18) + Math.sin(this.time * 0.18 + i) * 24;
      const y = vh * (0.2 + (i % 3) * 0.18) + Math.cos(this.time * 0.14 + i) * 16;
      const rad = Math.min(vw, vh) * (0.16 + (i % 2) * 0.06);
      const grd = ctx.createRadialGradient(x, y, 0, x, y, rad);
      grd.addColorStop(0, rgba(pal.fog, 0.16));
      grd.addColorStop(1, "transparent");
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    const aurora = cosmetics?.sky === "sky-aurora";
    for (const s of this.stars) {
      const x = (s.x / 100) * vw;
      const y = (s.y / 100) * vh * 0.65;
      const tw = 0.45 + 0.55 * Math.sin(this.time * 1.3 + s.p);
      ctx.globalAlpha = (aurora ? 0.35 : 0.18) + tw * 0.35;
      ctx.fillStyle = pal.ink;
      ctx.beginPath();
      ctx.arc(x, y, s.r * (aurora ? 1.3 : 1), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Ground vignette under board
    const vg = ctx.createRadialGradient(vw / 2, vh * 0.72, 10, vw / 2, vh * 0.72, Math.max(vw, vh) * 0.55);
    vg.addColorStop(0, rgba(pal.accent, 0.06));
    vg.addColorStop(1, "transparent");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, vw, vh);
  }

  drawMenuOrb(ctx, vw, vh, pal) {
    const x = vw / 2;
    const y = vh * 0.42 + Math.sin(this.time * 2) * 6;
    const r = Math.min(vw, vh) * 0.09;
    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(x, y + r * 1.15, r * 0.85, r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body
    const grd = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
    grd.addColorStop(0, "#fff6e8");
    grd.addColorStop(0.45, pal.accent);
    grd.addColorStop(1, pal.accentDeep);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(x, y, r * 0.85, r, 0, 0, Math.PI * 2);
    ctx.fill();
    // Fins
    ctx.fillStyle = mix(pal.accent, "#fff", 0.15);
    ctx.beginPath();
    ctx.ellipse(x - r * 0.7, y - r * 0.35, r * 0.32, r * 0.48, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + r * 0.7, y - r * 0.35, r * 0.32, r * 0.48, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  drawLattice3D(ctx, session, pal) {
    const level = session.level;
    const tiles = [];
    for (let y = 0; y < level.h; y++) {
      for (let x = 0; x < level.w; x++) {
        const c = level.grid[y][x];
        if (c.t === TILE.VOID) continue;
        if (session.flags.crumbled?.has(`${x},${y}`)) continue;
        tiles.push({ x, y, c, z: x + y });
      }
    }
    tiles.sort((a, b) => a.z - b.z || a.x - b.x);

    for (const t of tiles) {
      const lit = session.wakeCells.has(`${t.x},${t.y}`);
      const glow = session.complete ? Math.min(1, session.completeT / 1.1) : 0;
      if (t.c.t === TILE.PILLAR) {
        this.drawPillar3D(ctx, t.x, t.y, pal);
        continue;
      }
      if (t.c.t === TILE.RIFT) {
        this.drawRift3D(ctx, t.x, t.y, pal);
        continue;
      }
      if (t.c.t === TILE.SEAL && !session.flags.sealsOpen.has(t.c.sealId)) {
        this.drawSealBlock(ctx, t.x, t.y, pal);
        continue;
      }
      const isLit = lit || glow > 0.15;
      this.drawBlock(ctx, t.x, t.y, isLit, pal, glow);
      this.drawTileDecor(ctx, t.x, t.y, t.c, session, pal, isLit);
    }
  }

  drawBlock(ctx, gx, gy, lit, pal, glow = 0) {
    const { tw, th, depth } = this.layout;
    const p = this.toIso(gx, gy);
    const topY = p.y - depth;
    const hw = tw / 2;
    const hh = th / 2;

    // Drop shadow
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 4);
    ctx.lineTo(p.x + hw, p.y + hh + 4);
    ctx.lineTo(p.x, p.y + th + 4);
    ctx.lineTo(p.x - hw, p.y + hh + 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    const top = lit ? pal.floorLit : pal.floor;
    const left = lit ? pal.sideLLit : pal.sideL;
    const right = lit ? pal.sideRLit : pal.sideR;

    // Left face
    ctx.beginPath();
    ctx.moveTo(p.x - hw, p.y + hh);
    ctx.lineTo(p.x, p.y + th);
    ctx.lineTo(p.x, topY + th);
    ctx.lineTo(p.x - hw, topY + hh);
    ctx.closePath();
    ctx.fillStyle = left;
    ctx.fill();

    // Right face
    ctx.beginPath();
    ctx.moveTo(p.x + hw, p.y + hh);
    ctx.lineTo(p.x, p.y + th);
    ctx.lineTo(p.x, topY + th);
    ctx.lineTo(p.x + hw, topY + hh);
    ctx.closePath();
    ctx.fillStyle = right;
    ctx.fill();

    // Top face
    ctx.beginPath();
    ctx.moveTo(p.x, topY);
    ctx.lineTo(p.x + hw, topY + hh);
    ctx.lineTo(p.x, topY + th);
    ctx.lineTo(p.x - hw, topY + hh);
    ctx.closePath();
    ctx.fillStyle = top;
    ctx.fill();

    // Rim highlight
    ctx.strokeStyle = rgba(lit ? pal.rim : "#ffffff", lit ? 0.55 : 0.08);
    ctx.lineWidth = lit ? 1.6 : 1;
    ctx.stroke();

    // Soft top sheen
    ctx.beginPath();
    ctx.moveTo(p.x, topY + 2);
    ctx.lineTo(p.x + hw * 0.55, topY + hh * 0.55);
    ctx.lineTo(p.x, topY + hh);
    ctx.lineTo(p.x - hw * 0.35, topY + hh * 0.45);
    ctx.closePath();
    ctx.fillStyle = rgba("#ffffff", lit ? 0.22 : 0.06);
    ctx.fill();

    if (lit && glow > 0) {
      ctx.fillStyle = rgba(pal.accent, 0.12 * glow);
      ctx.beginPath();
      ctx.moveTo(p.x, topY);
      ctx.lineTo(p.x + hw, topY + hh);
      ctx.lineTo(p.x, topY + th);
      ctx.lineTo(p.x - hw, topY + hh);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawPillar3D(ctx, gx, gy, pal) {
    const { tw, th, depth } = this.layout;
    const p = this.toIso(gx, gy);
    const h = depth * 1.85;
    const topY = p.y - h;
    const hw = tw * 0.28;
    const hh = th * 0.28;

    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + 2, hw * 1.2, hh * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Column body as diamond prism
    ctx.fillStyle = pal.pillar;
    ctx.beginPath();
    ctx.moveTo(p.x - hw, p.y);
    ctx.lineTo(p.x, p.y + hh);
    ctx.lineTo(p.x, topY + hh);
    ctx.lineTo(p.x - hw, topY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = mix(pal.pillar, "#000", 0.2);
    ctx.beginPath();
    ctx.moveTo(p.x + hw, p.y);
    ctx.lineTo(p.x, p.y + hh);
    ctx.lineTo(p.x, topY + hh);
    ctx.lineTo(p.x + hw, topY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = mix(pal.pillar, pal.accent, 0.25);
    ctx.beginPath();
    ctx.moveTo(p.x, topY - hh * 0.2);
    ctx.lineTo(p.x + hw, topY);
    ctx.lineTo(p.x, topY + hh);
    ctx.lineTo(p.x - hw, topY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = rgba(pal.accent, 0.35);
    ctx.beginPath();
    ctx.arc(p.x, topY, hw * 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  drawRift3D(ctx, gx, gy, pal) {
    const { tw, th } = this.layout;
    const p = this.toIso(gx, gy);
    const hw = tw / 2;
    const hh = th / 2;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + hw, p.y + hh);
    ctx.lineTo(p.x, p.y + th);
    ctx.lineTo(p.x - hw, p.y + hh);
    ctx.closePath();
    ctx.fillStyle = "#050308";
    ctx.fill();
    // Bold dark outer barrier
    ctx.strokeStyle = "rgba(0, 0, 0, 0.95)";
    ctx.lineWidth = 3.8;
    ctx.stroke();
    // Electric rift inner stroke
    ctx.strokeStyle = "#ff4f8b";
    ctx.lineWidth = 2.0;
    ctx.stroke();
    ctx.restore();
  }

  drawSealBlock(ctx, gx, gy, pal) {
    this.drawBlock(ctx, gx, gy, false, pal, 0);
    const p = this.cellToXY(gx, gy);
    const r = this.layout.tw * 0.17;

    // Dark protective backing disc so obstacle is 100% visible on any floor color
    ctx.save();
    ctx.fillStyle = "rgba(12, 8, 18, 0.78)";
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 1.32, 0, Math.PI * 2);
    ctx.fill();

    // Subtle pulsing warning rim
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 3.5);
    ctx.strokeStyle = `rgba(255, 180, 50, ${0.25 + pulse * 0.25})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r * 1.25, 0, Math.PI * 2);
    ctx.stroke();

    // High-visibility dual-stroke barrier ring (outer dark shield + luminous radiant ring)
    const ringCol = "#ffc83b";
    ctx.lineCap = "round";
    // Outer dark silhouette stroke
    ctx.strokeStyle = "rgba(10, 6, 14, 0.95)";
    ctx.lineWidth = 4.4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 1.72);
    ctx.stroke();
    // Inner luminous gold ring
    ctx.strokeStyle = ringCol;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 1.72);
    ctx.stroke();

    // Ring terminal stop dots
    ctx.fillStyle = "#fff4d0";
    ctx.beginPath();
    ctx.arc(p.x + r, p.y, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Central obstacle triangle with dark perimeter and radiant core
    const tr = r * 0.44;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - tr * 1.15);
    ctx.lineTo(p.x + tr * 0.95, p.y + tr * 0.75);
    ctx.lineTo(p.x - tr * 0.95, p.y + tr * 0.75);
    ctx.closePath();
    // Triangle dark border
    ctx.strokeStyle = "rgba(10, 6, 14, 0.98)";
    ctx.lineWidth = 3.6;
    ctx.stroke();
    // Triangle luminous fill
    ctx.fillStyle = ringCol;
    ctx.fill();
    // Triangle center highlight
    ctx.fillStyle = "#fff8dc";
    ctx.beginPath();
    ctx.arc(p.x, p.y + tr * 0.05, tr * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawTileDecor(ctx, gx, gy, cell, session, pal, lit) {
    const p = this.cellToXY(gx, gy);
    const s = this.layout.tw * 0.12;
    const tile = lit ? pal.floorLit : pal.floor;
    const ink = contrastOn(tile, "#fff8ee", "#161018");
    const mark = hazardOn(tile, pal.accent, pal.rim, pal.accentDeep);
    if (cell.t === TILE.WELL) {
      const on = session.flags.wells.has(cell.wellId);
      const col = on ? hazardOn(tile, "#5cf0e4", "#b8fff4", "#0c3c40") : mark;
      strokeHalo(ctx, ink, col, 3.6, 2.2, () => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, s * 1.15, 0, Math.PI * 2);
        ctx.stroke();
      });
      ctx.fillStyle = on ? col : rgba(ink, 0.35);
      ctx.beginPath();
      ctx.arc(p.x, p.y, s * 0.42, 0, Math.PI * 2);
      ctx.fill();
    }
    if (cell.t === TILE.ANCHOR) {
      const on = session.flags.anchors.has(cell.anchorId);
      ctx.fillStyle = on ? mark : rgba(ink, 0.55);
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * ((Math.PI * 2) / 5) + (on ? this.time * 0.4 : 0);
        ctx.beginPath();
        ctx.ellipse(p.x + Math.cos(a) * s * 0.9, p.y + Math.sin(a) * s * 0.7, s * 0.35, s * 0.55, a, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      if (session.level.objective === "sequence") {
        ctx.fillStyle = ink;
        ctx.font = `700 ${Math.max(10, s * 1.4)}px Sora, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.strokeStyle = contrastOn(tile, "#1a1014", "#fff8ee");
        ctx.lineWidth = 3;
        ctx.strokeText(String((cell.order ?? 0) + 1), p.x, p.y + 0.5);
        ctx.fillText(String((cell.order ?? 0) + 1), p.x, p.y + 0.5);
      }
    }
    if (cell.t === TILE.VANE) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(cell.vane === "ccw" ? -this.time : this.time);
      ctx.fillStyle = "rgba(10, 6, 16, 0.65)";
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 1.45, 0);
      ctx.lineTo(-s * 0.72, s * 0.78);
      ctx.lineTo(-s * 0.72, -s * 0.78);
      ctx.closePath();
      ctx.strokeStyle = "rgba(10, 6, 16, 0.95)";
      ctx.lineWidth = 3.2;
      ctx.stroke();
      ctx.fillStyle = "#ffe259";
      ctx.fill();
      ctx.restore();
    }
    if (cell.t === TILE.FOLD) {
      const on = session.flags.foldsActive;
      const col = on ? mark : ink;
      strokeHalo(ctx, ink, col, 3.2, 2, () => {
        ctx.beginPath();
        ctx.moveTo(p.x - s, p.y);
        ctx.quadraticCurveTo(p.x, p.y - s * 1.2, p.x + s, p.y);
        ctx.quadraticCurveTo(p.x, p.y + s * 1.2, p.x - s, p.y);
        ctx.stroke();
      });
    }
    if (cell.t === TILE.HEART) {
      ctx.fillStyle = session.flags.heart ? hazardOn(tile, "#ff6a88", "#ffc0d0", "#5a1020") : mark;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 1.6;
      const hs = s * 0.9;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y + hs);
      ctx.bezierCurveTo(p.x - hs * 1.6, p.y - hs * 0.2, p.x - hs * 0.5, p.y - hs * 1.4, p.x, p.y - hs * 0.2);
      ctx.bezierCurveTo(p.x + hs * 0.5, p.y - hs * 1.4, p.x + hs * 1.6, p.y - hs * 0.2, p.x, p.y + hs);
      ctx.fill();
      ctx.stroke();
    }
    if (cell.t === TILE.FRACTURE) {
      strokeHalo(ctx, ink, hazardOn(tile, "#ff7040", "#ffd0a0", "#4a1810"), 3.2, 1.8, () => {
        ctx.beginPath();
        ctx.moveTo(p.x - s, p.y - s * 0.2);
        ctx.lineTo(p.x - s * 0.1, p.y + s * 0.4);
        ctx.lineTo(p.x + s * 0.4, p.y - s * 0.5);
        ctx.lineTo(p.x + s, p.y + s * 0.2);
        ctx.stroke();
      });
    }
    if (cell.t === TILE.MIRROR) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(0.4);
      const glass = hazardOn(tile, "#e8fff8", "#ffffff", "#143838");
      ctx.fillStyle = glass;
      ctx.strokeStyle = ink;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -s * 1.15);
      ctx.lineTo(s * 0.78, s * 0.82);
      ctx.lineTo(-s * 0.78, s * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = mark;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      ctx.restore();
    }
    if (cell.t === TILE.ONEWAY) {
      const ang = { up: -Math.PI / 2, right: 0, down: Math.PI / 2, left: Math.PI }[cell.oneway] || 0;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang);
      ctx.fillStyle = "rgba(10, 6, 16, 0.65)";
      ctx.beginPath();
      ctx.arc(0, 0, s * 1.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(s * 1.25, 0);
      ctx.lineTo(-s * 0.72, s * 0.74);
      ctx.lineTo(-s * 0.28, 0);
      ctx.lineTo(-s * 0.72, -s * 0.74);
      ctx.closePath();
      ctx.strokeStyle = "rgba(10, 6, 16, 0.95)";
      ctx.lineWidth = 3.2;
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    }
  }

  drawNuri3D(ctx, session, pal, cosmetics) {
    const p = this.cellToXY(session.fx, session.fy);
    const s = this.layout.tw * 0.34;
    const skinId = cosmetics?.body || "nuri-dawn";
    const body = bodyColor(skinId, pal);
    const bob = Math.sin(this.time * 3.2) * 2 + session.bounce * 4;

    ctx.save();
    ctx.translate(p.x, p.y - s * 0.15 + bob);
    ctx.rotate(session.tilt);
    ctx.scale(session.stretch, session.squash);

    // Contact shadow on tile
    ctx.fillStyle = "rgba(0,0,0,0.28)";
    ctx.beginPath();
    ctx.ellipse(0, s * 0.95, s * 0.65, s * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ambient glow halo
    const haloGlow = skinId === "nuri-tide" ? "#48d8d0"
      : skinId === "nuri-dusk" ? "#c890f0"
      : skinId === "nuri-leaf" ? "#a8e050"
      : skinId === "nuri-star" ? "#88a8ff"
      : skinId === "nuri-pyra" ? "#ff5a36"
      : skinId === "nuri-zephyr" ? "#54c8ff"
      : skinId === "nuri-solas" ? "#f5b830"
      : pal.accent;

    const halo = ctx.createRadialGradient(0, 0, s * 0.2, 0, 0, s * 1.4);
    halo.addColorStop(0, rgba(haloGlow, 0.38));
    halo.addColorStop(1, "transparent");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, s * 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Unique Character Appendages (Ears, Horns, Halos, Wings)
    if (skinId === "nuri-tide") {
      // Kora (Tide): Sleek bioluminescent aquatic fins
      ctx.fillStyle = mix(body, "#60ffea", 0.4);
      ctx.beginPath();
      ctx.ellipse(-s * 0.64, -s * 0.35, s * 0.22, s * 0.54, -0.65, 0, Math.PI * 2);
      ctx.ellipse(s * 0.64, -s * 0.35, s * 0.22, s * 0.54, 0.65, 0, Math.PI * 2);
      ctx.fill();
    } else if (skinId === "nuri-dusk") {
      // Vesper (Dusk): Ethereal twilight phantom wings
      ctx.fillStyle = mix(body, "#f2b0ff", 0.35);
      ctx.beginPath();
      ctx.ellipse(-s * 0.68, -s * 0.45, s * 0.25, s * 0.55, -0.45, 0, Math.PI * 2);
      ctx.ellipse(s * 0.68, -s * 0.45, s * 0.25, s * 0.55, 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (skinId === "nuri-leaf") {
      // Sylva (Flora): Leaf sprout crests
      ctx.fillStyle = mix(body, "#d4ff80", 0.3);
      ctx.beginPath();
      ctx.ellipse(-s * 0.5, -s * 0.55, s * 0.18, s * 0.46, -0.4, 0, Math.PI * 2);
      ctx.ellipse(s * 0.5, -s * 0.55, s * 0.18, s * 0.46, 0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#387818";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, -s * 0.25); ctx.lineTo(-s * 0.5, -s * 0.75);
      ctx.moveTo(s * 0.5, -s * 0.25); ctx.lineTo(s * 0.5, -s * 0.75);
      ctx.stroke();
    } else if (skinId === "nuri-star") {
      // Astra (Cosmos): Orbital stellar halo ring
      ctx.strokeStyle = "rgba(200, 225, 255, 0.85)";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.45, s * 0.96, s * 0.32, -0.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(s * 0.8, -s * 0.5, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (skinId === "nuri-pyra") {
      // Pyra (Flame): Curved blazing flame horns
      ctx.fillStyle = "#ffaa20";
      ctx.beginPath();
      ctx.moveTo(-s * 0.4, -s * 0.35);
      ctx.quadraticCurveTo(-s * 0.7, -s * 0.9, -s * 0.42, -s * 0.95);
      ctx.quadraticCurveTo(-s * 0.2, -s * 0.7, -s * 0.15, -s * 0.35);
      ctx.moveTo(s * 0.4, -s * 0.35);
      ctx.quadraticCurveTo(s * 0.7, -s * 0.9, s * 0.42, -s * 0.95);
      ctx.quadraticCurveTo(s * 0.2, -s * 0.7, s * 0.15, -s * 0.35);
      ctx.fill();
    } else if (skinId === "nuri-zephyr") {
      // Zephyr (Gale): Swept feather wings
      ctx.fillStyle = mix(body, "#ffffff", 0.45);
      ctx.beginPath();
      ctx.ellipse(-s * 0.7, -s * 0.25, s * 0.22, s * 0.58, -0.85, 0, Math.PI * 2);
      ctx.ellipse(s * 0.7, -s * 0.25, s * 0.22, s * 0.58, 0.85, 0, Math.PI * 2);
      ctx.fill();
    } else if (skinId === "nuri-solas") {
      // Solas (Solar): Radiant sunburst crown
      ctx.strokeStyle = "#ffe260";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const ang = (i * 0.3) - Math.PI / 2;
        const rx = Math.cos(ang) * s * 0.9;
        const ry = Math.sin(ang) * s * 0.9;
        ctx.moveTo(rx * 0.65, ry * 0.65);
        ctx.lineTo(rx, ry);
      }
      ctx.stroke();
    } else {
      // Nuri (Origin): Warm rounded bunny/fox ears with soft inner glow
      ctx.fillStyle = mix(body, pal.accentDeep, 0.15);
      ctx.beginPath();
      ctx.ellipse(-s * 0.58, -s * 0.4, s * 0.28, s * 0.5, -0.55, 0, Math.PI * 2);
      ctx.ellipse(s * 0.58, -s * 0.4, s * 0.28, s * 0.5, 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe2c8";
      ctx.beginPath();
      ctx.ellipse(-s * 0.56, -s * 0.4, s * 0.13, s * 0.32, -0.55, 0, Math.PI * 2);
      ctx.ellipse(s * 0.56, -s * 0.4, s * 0.13, s * 0.32, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    // Body sphere with smooth ambient lighting
    const grd = ctx.createRadialGradient(-s * 0.2, -s * 0.25, s * 0.08, 0, 0, s);
    grd.addColorStop(0, "#fff8ec");
    grd.addColorStop(0.42, body);
    grd.addColorStop(1, mix(body, "#100818", 0.45));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.78, s * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Specular shine
    ctx.fillStyle = rgba("#fff", 0.45);
    ctx.beginPath();
    ctx.ellipse(-s * 0.18, -s * 0.28, s * 0.26, s * 0.14, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#1a1420";
    ctx.beginPath();
    ctx.arc(-s * 0.18, -s * 0.02, s * 0.09, 0, Math.PI * 2);
    ctx.arc(s * 0.2, -s * 0.02, s * 0.09, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-s * 0.15, -s * 0.05, s * 0.035, 0, Math.PI * 2);
    ctx.arc(s * 0.23, -s * 0.05, s * 0.035, 0, Math.PI * 2);
    ctx.fill();

    if (session.celebrating) {
      ctx.strokeStyle = haloGlow;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, s * 0.22, s * 0.16, 0.15, Math.PI - 0.15);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawEffects(ctx, effects, pal, cosmetics) {
    if (!effects) return;
    const petal = cosmetics?.wake === "wake-petals";
    for (const w of effects.wake.live) {
      const a = w.life / w.max;
      ctx.fillStyle = rgba(pal.accent, 0.2 * a);
      ctx.beginPath();
      if (petal) ctx.ellipse(w.x, w.y, w.w * 0.3, w.w * 0.5, a * 2, 0, Math.PI * 2);
      else ctx.arc(w.x, w.y, w.w * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    for (const m of effects.motes.live) {
      const a = (m.life / m.max) * m.a;
      if (cosmetics?.mote === "mote-rings") {
        ctx.strokeStyle = rgba(pal.accent, a);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * 1.3, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = rgba(pal.floorLit || pal.accent, a);
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  drawSwipeCue(ctx, session, pal) {
    const p = this.cellToXY(session.fx, session.fy);
    const t = (Math.sin(this.time * 3) + 1) / 2;
    ctx.save();
    ctx.globalAlpha = 0.4 + t * 0.4;
    ctx.strokeStyle = pal.ink;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    const x = p.x + 26 + t * 14;
    ctx.beginPath();
    ctx.moveTo(p.x + 14, p.y - 8);
    ctx.lineTo(x, p.y - 2);
    ctx.lineTo(p.x + 14, p.y + 4);
    ctx.stroke();
    ctx.restore();
  }

  drawCompleteWash(ctx, vw, vh, pal, t) {
    ctx.save();
    ctx.globalAlpha = Math.min(0.28, t * 0.22);
    const g = ctx.createRadialGradient(vw / 2, vh / 2, 20, vw / 2, vh / 2, Math.max(vw, vh) * 0.7);
    g.addColorStop(0, pal.floorLit || pal.accent);
    g.addColorStop(1, "transparent");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
    ctx.restore();
  }

  drawDebug(session, showGrid, showSol) {
    if (!session) return;
    const ctx = this.ctx;
    if (showGrid) {
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      for (let y = 0; y < session.level.h; y++) {
        for (let x = 0; x < session.level.w; x++) {
          const p = this.cellToXY(x, y);
          ctx.strokeRect(p.x - 4, p.y - 4, 8, 8);
        }
      }
    }
    if (showSol && session.level.solution) {
      ctx.fillStyle = "#fff";
      ctx.font = "12px monospace";
      ctx.fillText(session.level.solution.join(" → "), 12, this.canvas.clientHeight - 8);
    }
  }
  drawPathHint(ctx, session, pal) {
    if (!session || session.moving || session.complete || session.failed) return;
    const dirs = ["up", "down", "left", "right"];
    let bestDir = null;
    let bestSlide = null;

    if (session.level.solution && session.moves < session.level.solution.length) {
      const solDir = session.level.solution[session.moves];
      const s = simulateSlide(session.level, session.px, session.py, solDir, session.flags);
      if (s.path.length >= 2) {
        bestDir = solDir;
        bestSlide = s;
      }
    }

    if (!bestSlide) {
      let maxNew = 0;
      for (const d of dirs) {
        const s = simulateSlide(session.level, session.px, session.py, d, session.flags);
        if (s.path.length < 2) continue;
        let newCount = 0;
        for (const pt of s.path) {
          if (!session.wakeCells.has(`${pt.x},${pt.y}`)) newCount++;
        }
        if (newCount > maxNew || (newCount > 0 && !bestSlide)) {
          maxNew = newCount;
          bestDir = d;
          bestSlide = s;
        }
      }
    }

    if (!bestSlide || bestSlide.path.length < 2) return;

    ctx.save();
    const pulse = (Math.sin(this.time * 4) + 1) * 0.5;
    ctx.strokeStyle = rgba(pal.floorLit || pal.accent, 0.45 + pulse * 0.4);
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -this.time * 24;

    ctx.beginPath();
    for (let i = 0; i < bestSlide.path.length; i++) {
      const pt = bestSlide.path[i];
      const scr = this.cellToXY(pt.x, pt.y);
      if (i === 0) ctx.moveTo(scr.x, scr.y);
      else ctx.lineTo(scr.x, scr.y);
    }
    ctx.stroke();

    const dest = bestSlide.path[bestSlide.path.length - 1];
    const destScr = this.cellToXY(dest.x, dest.y);
    ctx.fillStyle = rgba(pal.rim || "#ffffff", 0.7 + pulse * 0.3);
    ctx.beginPath();
    ctx.arc(destScr.x, destScr.y, 4 + pulse * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function mix(a, b, t) {
  return lerpColor(a, b, t);
}

function lum(hex) {
  try {
    const { r, g, b } = hexToRgb(hex);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  } catch {
    return 0.5;
  }
}

function contrastOn(bg, light, dark) {
  return lum(bg) > 0.48 ? dark : light;
}

function hazardOn(bg, preferred, light, dark) {
  if (Math.abs(lum(bg) - lum(preferred)) >= 0.28) return preferred;
  return contrastOn(bg, light, dark);
}

function strokeHalo(ctx, halo, color, outer, inner, draw) {
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = halo;
  ctx.lineWidth = outer;
  draw();
  ctx.strokeStyle = color;
  ctx.lineWidth = inner;
  draw();
}

function lerpColor(a, b, t) {
  const pa = parseInt(String(a).replace("#", "").slice(0, 6), 16);
  const pb = parseInt(String(b).replace("#", "").slice(0, 6), 16);
  const ar = (pa >> 16) & 255,
    ag = (pa >> 8) & 255,
    ab = pa & 255;
  const br = (pb >> 16) & 255,
    bg = (pb >> 8) & 255,
    bb = pb & 255;
  const r = Math.round(lerp(ar, br, t));
  const g = Math.round(lerp(ag, bg, t));
  const bl = Math.round(lerp(ab, bb, t));
  return `rgb(${r},${g},${bl})`;
}

function bodyColor(id, pal) {
  if (id === "nuri-tide") return "#40d6ca";
  if (id === "nuri-dusk") return "#c68cf4";
  if (id === "nuri-leaf") return "#9cd646";
  if (id === "nuri-star") return "#7ea4ff";
  if (id === "nuri-pyra") return "#ff5533";
  if (id === "nuri-zephyr") return "#4ec0f8";
  if (id === "nuri-solas") return "#f8be28";
  return "#f6a25e";
}
