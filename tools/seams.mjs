import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

const files = process.argv.slice(2);
const outDir = "production/frames";

if (files.length < 2) {
  console.log("Usage: node tools/seams.mjs s1.mp4 t1.mp4 s2.mp4 ...");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

function grab(file, where, out) {
  if (where === "first") {
    execFileSync("ffmpeg", ["-y", "-v", "error", "-i", file, "-frames:v", "1", out]);
  } else {
    execFileSync("ffmpeg", ["-y", "-v", "error", "-sseof", "-0.25", "-i", file, "-update", "1", out]);
  }
}

function ssim(a, b) {
  const result = spawnSync("ffmpeg", [
    "-v", "info", "-i", a, "-i", b,
    "-lavfi", "[1:v][0:v]scale2ref[b][a];[a][b]ssim",
    "-f", "null", "-"
  ], { encoding: "utf8" });
  const match = result.stderr.match(/All:([0-9.]+)/);
  return match ? Number(match[1]) : null;
}

for (let i = 0; i < files.length - 1; i++) {
  const a = files[i];
  const b = files[i + 1];
  const nameA = path.basename(a, path.extname(a));
  const nameB = path.basename(b, path.extname(b));
  const lastA = path.join(outDir, nameA + "_last.png");
  const firstB = path.join(outDir, nameB + "_first.png");
  const compare = path.join(outDir, "seam_" + nameA + "_" + nameB + ".jpg");

  grab(a, "last", lastA);
  grab(b, "first", firstB);

  execFileSync("ffmpeg", [
    "-y", "-v", "error", "-i", lastA, "-i", firstB,
    "-filter_complex", "[0:v]scale=640:-2[a];[1:v]scale=640:-2[b];[a][b]hstack",
    compare
  ]);

  const score = ssim(lastA, firstB);
  let verdict = "check by eye";
  if (score !== null && score > 0.9) verdict = "good";
  if (score !== null && score < 0.75) verdict = "probably a visible jump";

  console.log(nameA + " -> " + nameB + "  SSIM " + (score === null ? "?" : score.toFixed(3)) + "  " + verdict + "  (" + compare + ")");
}
