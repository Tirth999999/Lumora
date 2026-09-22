import { WORLDS, OBJECTIVE } from "../config/game.js";
import { hashString } from "../core/math.js";
import { generateValidated, tutorialLevel } from "../generation/generator.js";

class WorldConfigBuilder {
  constructor(index) {
    this.index = index;
  }
  ramp(easy, hard) {
    return easy + Math.round((hard - easy) * (this.index / 9));
  }
  build() {
    throw new Error("Must implement build()");
  }
}

class EmberwakeBuilder extends WorldConfigBuilder {
  build() {
    return {
      w: 9 + (this.index > 3 ? 1 : 0) + (this.index > 7 ? 2 : 0),
      h: 9 + (this.index > 3 ? 1 : 0) + (this.index > 7 ? 2 : 0),
      pillars: 2 + Math.floor(this.index / 4),
      objective: OBJECTIVE.RESTORE,
      mechanics: ["restore"],
      minMoves: Math.max(10, this.ramp(10, 15)),
      maxMoves: this.ramp(20, 30),
      minTiles: 16 + (this.index > 3 ? 4 : 0),
      maxTiles: this.ramp(25, 45),
      density: 0.42 + this.index * 0.02,
      maxScore: this.ramp(150, 300),
    };
  }
}

class TidecrestBuilder extends WorldConfigBuilder {
  build() {
    return {
      w: 10 + (this.index > 6 ? 2 : 0),
      h: 9 + (this.index > 4 ? 2 : 0),
      pillars: 3 + Math.floor(this.index / 5),
      wells: 1 + (this.index > 5 ? 1 : 0),
      rifts: this.index > 3 ? 1 : 0,
      objective: this.index % 5 === 4 ? OBJECTIVE.SAFE : this.index % 3 === 2 ? OBJECTIVE.WELLS : OBJECTIVE.RESTORE,
      mechanics: ["well", this.index > 3 ? "rift" : "restore"],
      riftsFail: true,
      minMoves: Math.max(10, this.ramp(10, 16)),
      maxMoves: this.ramp(22, 30),
      minTiles: 18,
      maxTiles: this.ramp(26, 46),
      density: 0.48 + this.index * 0.018,
    };
  }
}

class DuskveilBuilder extends WorldConfigBuilder {
  build() {
    return {
      w: 10 + (this.index > 7 ? 2 : 0),
      h: 10,
      pillars: 3 + (this.index > 5 ? 1 : 0),
      anchors: 3 + (this.index > 6 ? 1 : 0),
      seals: 1 + (this.index > 7 ? 1 : 0),
      objective: this.index % 2 === 0 ? OBJECTIVE.SEQUENCE : OBJECTIVE.RESTORE,
      mechanics: ["seal", "sequence"],
      minMoves: Math.max(10, this.ramp(11, 17)),
      maxMoves: this.ramp(24, 32),
      minTiles: 19,
      maxTiles: this.ramp(28, 46),
      density: 0.5 + this.index * 0.015,
    };
  }
}

class CanopyBuilder extends WorldConfigBuilder {
  build() {
    return {
      w: 10 + (this.index > 6 ? 2 : 0),
      h: 10,
      pillars: 3 + Math.floor(this.index / 5),
      vanes: 2 + (this.index > 3 ? 1 : 0) + (this.index > 7 ? 1 : 0),
      objective: OBJECTIVE.RESTORE,
      mechanics: ["vane", this.index > 5 ? "well" : "vane"],
      wells: this.index > 5 ? 1 : 0,
      minMoves: Math.max(10, this.ramp(11, 17)),
      maxMoves: this.ramp(24, 32),
      minTiles: 19,
      maxTiles: this.ramp(28, 46),
      density: 0.52 + this.index * 0.014,
    };
  }
}

class StarloomBuilder extends WorldConfigBuilder {
  build() {
    return {
      w: 10 + (this.index > 5 ? 2 : 0),
      h: 10 + (this.index > 8 ? 2 : 0),
      pillars: 3 + (this.index > 4 ? 1 : 0),
      objective: this.index % 4 === 3 ? OBJECTIVE.FOLD : OBJECTIVE.RESTORE,
      mechanics: ["fold", this.index > 3 ? "vane" : "fold"],
      vanes: this.index > 3 ? 1 : 0,
      minMoves: Math.max(10, this.ramp(11, 18)),
      maxMoves: this.ramp(24, 32),
      minTiles: 19,
      maxTiles: this.ramp(28, 48),
      density: 0.5 + this.index * 0.016,
    };
  }
}

class CinderfallBuilder extends WorldConfigBuilder {
  build() {
    return {
      w: 10 + (this.index > 5 ? 2 : 0),
      h: 9 + (this.index > 3 ? 2 : 0),
      pillars: 3 + Math.floor(this.index / 4),
      fractures: 3 + Math.floor(this.index / 3),
      objective: OBJECTIVE.RESTORE,
      mechanics: ["fracture"],
      minMoves: Math.max(10, this.ramp(11, 18)),
      maxMoves: this.ramp(24, 32),
      minTiles: 19,
      maxTiles: this.ramp(26, 44),
      density: 0.5 + this.index * 0.015,
    };
  }
}

class MirrorfenBuilder extends WorldConfigBuilder {
  build() {
    return {
      w: 10 + (this.index > 6 ? 2 : 0),
      h: 10,
      pillars: 3 + (this.index > 4 ? 1 : 0),
      mirrors: 2 + (this.index > 3 ? 1 : 0) + (this.index > 7 ? 1 : 0),
      objective: OBJECTIVE.RESTORE,
      mechanics: ["mirror", this.index > 5 ? "vane" : "mirror"],
      vanes: this.index > 5 ? 1 : 0,
      minMoves: Math.max(10, this.ramp(11, 18)),
      maxMoves: this.ramp(24, 32),
      minTiles: 19,
      maxTiles: this.ramp(28, 46),
      density: 0.5 + this.index * 0.014,
    };
  }
}

class ZephyrrowBuilder extends WorldConfigBuilder {
  build() {
    return {
      w: 10 + (this.index > 5 ? 2 : 0),
      h: 10,
      pillars: 3,
      oneways: 3 + Math.floor(this.index / 3),
      objective: OBJECTIVE.RESTORE,
      mechanics: ["oneway"],
      minMoves: Math.max(10, this.ramp(11, 18)),
      maxMoves: this.ramp(24, 32),
      minTiles: 19,
      maxTiles: this.ramp(28, 46),
      density: 0.52 + this.index * 0.014,
    };
  }
}

class HollowmereBuilder extends WorldConfigBuilder {
  build() {
    return {
      w: 10,
      h: 9 + (this.index > 4 ? 2 : 0),
      pillars: 3 + (this.index > 6 ? 1 : 0),
      rifts: 2 + (this.index > 3 ? 1 : 0) + (this.index > 7 ? 1 : 0),
      wells: this.index > 5 ? 1 : 0,
      objective: OBJECTIVE.SAFE,
      mechanics: ["rift", this.index > 5 ? "well" : "rift"],
      riftsFail: true,
      minMoves: Math.max(10, this.ramp(11, 17)),
      maxMoves: this.ramp(24, 30),
      minTiles: 18,
      maxTiles: this.ramp(26, 44),
      density: 0.48 + this.index * 0.016,
    };
  }
}

class PrismarchBuilder extends WorldConfigBuilder {
  build() {
    return {
      w: 10 + (this.index > 6 ? 2 : 0),
      h: 10,
      pillars: 3 + (this.index > 5 ? 1 : 0),
      anchors: 3 + (this.index > 4 ? 1 : 0),
      objective: OBJECTIVE.SEQUENCE,
      mechanics: ["sequence"],
      minMoves: Math.max(10, this.ramp(11, 18)),
      maxMoves: this.ramp(24, 32),
      minTiles: 19,
      maxTiles: this.ramp(28, 46),
      density: 0.5 + this.index * 0.015,
    };
  }
}

class BrasslockBuilder extends WorldConfigBuilder {
  build() {
    return {
      w: 10 + (this.index > 6 ? 2 : 0),
      h: 10,
      pillars: 3 + (this.index > 4 ? 1 : 0),
      seals: 2 + (this.index > 4 ? 1 : 0),
      objective: OBJECTIVE.RESTORE,
      mechanics: ["seal"],
      minMoves: Math.max(10, this.ramp(11, 18)),
      maxMoves: this.ramp(24, 32),
      minTiles: 19,
      maxTiles: this.ramp(28, 46),
      density: 0.5 + this.index * 0.015,
    };
  }
}

class AuroraloomBuilder extends WorldConfigBuilder {
  build() {
    return {
      w: 10 + (this.index > 5 ? 2 : 0),
      h: 10,
      pillars: 3,
      objective: OBJECTIVE.RESTORE,
      mechanics: ["heart", "fold", this.index > 5 ? "vane" : "fold"],
      vanes: this.index > 5 ? 1 : 0,
      minMoves: Math.max(10, this.ramp(12, 18)),
      maxMoves: this.ramp(26, 34),
      minTiles: 20,
      maxTiles: this.ramp(28, 48),
      density: 0.52 + this.index * 0.014,
    };
  }
}

class RootspireBuilder extends WorldConfigBuilder {
  build() {
    return {
      w: 10 + (this.index > 4 ? 2 : 0),
      h: 10 + (this.index > 7 ? 2 : 0),
      pillars: 4 + Math.floor(this.index / 3),
      objective: OBJECTIVE.RESTORE,
      mechanics: ["restore"],
      minMoves: Math.max(10, this.ramp(12, 18)),
      maxMoves: this.ramp(24, 32),
      minTiles: 20,
      maxTiles: this.ramp(28, 48),
      density: 0.56 + this.index * 0.012,
    };
  }
}

class StormglassBuilder extends WorldConfigBuilder {
  build() {
    return {
      w: 10 + (this.index > 6 ? 2 : 0),
      h: 10,
      pillars: 3,
      oneways: 3 + Math.floor(this.index / 4),
      rifts: 2 + (this.index > 4 ? 1 : 0),
      vanes: this.index > 6 ? 1 : 0,
      objective: OBJECTIVE.SAFE,
      mechanics: ["oneway", "rift", this.index > 6 ? "vane" : "rift"],
      riftsFail: true,
      minMoves: Math.max(10, this.ramp(11, 18)),
      maxMoves: this.ramp(24, 32),
      minTiles: 19,
      maxTiles: this.ramp(26, 44),
      density: 0.5 + this.index * 0.014,
    };
  }
}

class DuskforgeBuilder extends WorldConfigBuilder {
  build() {
    return {
      w: 10 + (this.index > 5 ? 2 : 0),
      h: 10,
      pillars: 3 + (this.index > 6 ? 1 : 0),
      fractures: 3 + Math.floor(this.index / 4),
      rifts: 2 + (this.index > 5 ? 1 : 0),
      objective: OBJECTIVE.SAFE,
      mechanics: ["fracture", "rift"],
      riftsFail: true,
      minMoves: Math.max(10, this.ramp(12, 18)),
      maxMoves: this.ramp(24, 32),
      minTiles: 19,
      maxTiles: this.ramp(26, 44),
      density: 0.5 + this.index * 0.014,
    };
  }
}

class LevelConfigFactory {
  static create(worldId, index) {
    const builders = {
      emberwake: EmberwakeBuilder,
      tidecrest: TidecrestBuilder,
      duskveil: DuskveilBuilder,
      canopy: CanopyBuilder,
      starloom: StarloomBuilder,
      cinderfall: CinderfallBuilder,
      mirrorfen: MirrorfenBuilder,
      zephyrrow: ZephyrrowBuilder,
      hollowmere: HollowmereBuilder,
      prismarch: PrismarchBuilder,
      brasslock: BrasslockBuilder,
      auroraloom: AuroraloomBuilder,
      rootspire: RootspireBuilder,
      stormglass: StormglassBuilder,
      duskforge: DuskforgeBuilder,
    };
    
    const BuilderClass = builders[worldId] || EmberwakeBuilder;
    const builder = new BuilderClass(index);
    const config = builder.build();
    
    config.worldId = worldId;
    config.index = index;
    config.palette = worldId;
    config.title = `${WORLDS.find((w) => w.id === worldId)?.name || "Lattice"} ${index + 1}`;
    config.radius = 2.4 + index * 0.04; // increased slightly for larger maps
    config.maxStates = 120000; // Increased massively for 10-30 step maps to prevent solver timeouts
    
    return config;
  }
}

export function levelParams(worldId, index) {
  return LevelConfigFactory.create(worldId, index);
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
