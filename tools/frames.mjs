import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const files = process.argv.slice(2);
const outDir = "production/frames";

if (files.length === 0) {
  console.log("Usage: node tools/frames.mjs production/raw/s1.mp4 production/raw/s2.mp4 ...");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

for (const file of files) {
  const name = path.basename(file, path.extname(file));
  const first = path.join(outDir, name + "_first.png");
  const last = path.join(outDir, name + "_last.png");

  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", file, "-frames:v", "1", first]);
  execFileSync("ffmpeg", ["-y", "-v", "error", "-sseof", "-0.25", "-i", file, "-update", "1", last]);

  console.log(name + ": " + first + " | " + last);
}
