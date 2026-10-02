import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import path from "node:path";

const joined = "production/tmp/joined.mp4";
const sizes = [
  { width: 1280, quality: 60 },
  { width: 854, quality: 55 }
];
const strides = [8, 4, 2, 1];

for (const size of sizes) {
  const tmp = "production/tmp/frames-" + size.width;
  const out = "media/frames/" + size.width;
  rmSync(tmp, { recursive: true, force: true });
  rmSync(out, { recursive: true, force: true });
  mkdirSync(tmp, { recursive: true });
  mkdirSync(out, { recursive: true });

  execFileSync("ffmpeg", [
    "-y", "-v", "error", "-i", joined,
    "-vf", "scale=" + size.width + ":-2",
    "-c:v", "libwebp", "-quality", String(size.quality), "-compression_level", "4",
    path.join(tmp, "f%05d.webp")
  ]);

  const files = readdirSync(tmp).filter((f) => f.endsWith(".webp")).sort();
  const index = { width: size.width, count: files.length, chunks: [], frames: [] };
  const done = new Set();

  strides.forEach((stride, chunkNumber) => {
    const parts = [];
    let offset = 0;
    for (let i = 0; i < files.length; i += stride) {
      if (done.has(i)) continue;
      const data = readFileSync(path.join(tmp, files[i]));
      parts.push(data);
      index.frames[i] = [chunkNumber, offset, data.length];
      offset += data.length;
      done.add(i);
    }
    const name = "chunk-" + chunkNumber + ".bin";
    writeFileSync(path.join(out, name), Buffer.concat(parts));
    index.chunks.push(name);
    console.log(size.width + " " + name + ": " + parts.length + " frames, " + (offset / 1e6).toFixed(1) + " MB");
  });

  writeFileSync(path.join(out, "index.json"), JSON.stringify(index));
}
