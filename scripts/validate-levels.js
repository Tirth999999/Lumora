import { tutorialLevel } from "../src/generation/generator.js";
import { getLevel, getDailyLevel } from "../src/levels/catalog.js";
import { WORLDS } from "../src/config/game.js";

let fails = 0;
function check(name, level) {
  const ok = level && level.solution && level.solution.length >= 1;
  if (!ok) {
    fails++;
    console.error("FAIL", name, level?.difficulty, level?.solution);
  } else {
    console.log("OK", name, level.solution.join(","), "score", level.difficulty?.score);
  }
}

for (let i = 0; i < 3; i++) check("tutorial " + i, tutorialLevel(i));

for (const w of WORLDS) {
  for (let i = 0; i < w.levels; i++) {
    check(`${w.id}:${i}`, getLevel(w.id, i));
  }
}
check("daily", getDailyLevel("2026-09-16"));
if (fails) {
  console.error("failures", fails);
  process.exit(1);
}
console.log("all levels validated");
