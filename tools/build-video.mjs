import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

const names = process.argv.length > 2 ? process.argv.slice(2) : ["s1", "t1", "s2", "t2", "s3", "t3", "s4"];
const rawDir = "production/raw";
const tmpDir = "production/tmp";
const fps = 24;
const fade = 4 / fps;

mkdirSync(tmpDir, { recursive: true });
mkdirSync("media/stills", { recursive: true });

function run(args) {
  execFileSync("ffmpeg", ["-y", "-v", "error", ...args], { stdio: "inherit" });
}

function duration(file) {
  const out = execFileSync("ffprobe", [
    "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file
  ], { encoding: "utf8" });
  return Number(out.trim());
}

const clips = [];

for (const name of names) {
  const input = path.join(rawDir, name + ".mp4");
  if (!existsSync(input)) {
    console.log("Missing " + input);
    process.exit(1);
  }
  const output = path.join(tmpDir, name + ".mp4");
  run([
    "-i", input, "-an",
    "-vf", "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,fps=" + fps + ",format=yuv420p,settb=AVTB",
    "-c:v", "libx264", "-preset", "fast", "-crf", "14", output
  ]);
  clips.push({ name, file: output, length: duration(output) });
  console.log("Prepared " + name + " (" + clips[clips.length - 1].length.toFixed(2) + " s)");
}

const manifest = { fps, clips: [] };
let offset = 0;

for (let i = 0; i < clips.length; i++) {
  const clip = clips[i];
  const isFirst = i === 0;
  const isLast = i === clips.length - 1;
  const start = offset + (isFirst ? 0 : fade / 2);
  const end = offset + clip.length - (isLast ? 0 : fade / 2);
  manifest.clips.push({
    name: clip.name,
    type: clip.name.startsWith("s") ? "scene" : "transition",
    start: Number(start.toFixed(3)),
    end: Number(end.toFixed(3))
  });
  if (!isLast) offset += clip.length - fade;
}

manifest.duration = manifest.clips[manifest.clips.length - 1].end;

const joined = path.join(tmpDir, "joined.mp4");

if (clips.length === 1) {
  run(["-i", clips[0].file, "-c", "copy", joined]);
} else {
  const inputs = [];
  clips.forEach((clip) => inputs.push("-i", clip.file));
  let filter = "";
  let last = "[0:v]";
  let at = 0;
  for (let i = 1; i < clips.length; i++) {
    at += clips[i - 1].length - fade;
    const label = "[v" + i + "]";
    filter += last + "[" + i + ":v]xfade=transition=fade:duration=" + fade.toFixed(4) + ":offset=" + at.toFixed(4) + label + ";";
    last = label;
  }
  filter = filter.slice(0, -1);
  run([...inputs, "-filter_complex", filter, "-map", last, "-c:v", "libx264", "-preset", "fast", "-crf", "14", "-pix_fmt", "yuv420p", joined]);
}

execFileSync("node", ["tools/pack-frames.mjs"], { stdio: "inherit" });

run(["-i", joined, "-frames:v", "1", "-vf", "scale=1920:-2", "-q:v", "3", "media/stills/poster.jpg"]);

let sceneNumber = 1;
for (const clip of manifest.clips) {
  if (clip.type !== "scene") continue;
  const middle = (clip.start + clip.end) / 2;
  run(["-ss", middle.toFixed(3), "-i", joined, "-frames:v", "1", "-q:v", "3", "media/stills/scene-" + sceneNumber + ".jpg"]);
  sceneNumber++;
}

writeFileSync("media/manifest.json", JSON.stringify(manifest, null, 2));

console.log("Done: media/frames/1280, media/frames/854, media/manifest.json");
console.log("Total length " + manifest.duration + " s");
