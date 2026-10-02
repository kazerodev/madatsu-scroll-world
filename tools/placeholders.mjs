import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const scenes = [
  { label: "01  THE DRAWER", bg: "0x1a1712" },
  { label: "02  THE CHECK", bg: "0x13213F" },
  { label: "03  THE OFFER", bg: "0x1d1a2c" },
  { label: "04  THE DISPLAY", bg: "0x0f1a2a" }
];

const font = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf";
const fps = 24;
const seconds = 5;
const frames = fps * seconds;

mkdirSync("production/raw", { recursive: true });
mkdirSync("production/tmp", { recursive: true });

function run(args) {
  execFileSync("ffmpeg", ["-y", "-v", "error", ...args], { stdio: "inherit" });
}

scenes.forEach((scene, i) => {
  const image = "production/tmp/ph" + (i + 1) + ".png";
  run([
    "-f", "lavfi", "-i", "color=c=" + scene.bg + ":s=2560x1440",
    "-vf",
    "drawbox=x=1080:y=420:w=400:h=560:color=0xF3EEE4@0.9:t=fill," +
    "drawbox=x=1100:y=440:w=360:h=520:color=0x8FD6CF@0.5:t=fill," +
    "drawbox=x=1060:y=400:w=440:h=600:color=0xF0A94B@0.8:t=6," +
    "drawtext=fontfile=" + font + ":text='" + scene.label + "':fontcolor=0xF3EEE4:fontsize=64:x=(w-text_w)/2:y=1110," +
    "drawtext=fontfile=" + font + ":text='PLACEHOLDER':fontcolor=0xF0A94B:fontsize=36:x=(w-text_w)/2:y=1200," +
    "vignette=PI/4",
    "-frames:v", "1", image
  ]);
});

function zoomClip(image, from, to, output) {
  const step = (to - from) / frames;
  run([
    "-i", image,
    "-vf", "zoompan=z='" + from + "+" + step + "*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=" + frames + ":s=1280x720:fps=" + fps,
    "-frames:v", String(frames), "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", output
  ]);
}

scenes.forEach((scene, i) => {
  zoomClip("production/tmp/ph" + (i + 1) + ".png", 1.0, 1.15, "production/raw/s" + (i + 1) + ".mp4");
});

for (let i = 1; i < scenes.length; i++) {
  const out = zoomOut(i);
  run([
    "-i", out.a, "-i", out.b,
    "-filter_complex", "[0:v][1:v]xfade=transition=fade:duration=3:offset=1",
    "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", "production/raw/t" + i + ".mp4"
  ]);
}

function zoomOut(i) {
  const a = "production/tmp/ta" + i + ".mp4";
  const b = "production/tmp/tb" + i + ".mp4";
  zoomClip("production/tmp/ph" + i + ".png", 1.15, 1.6, a);
  zoomClip("production/tmp/ph" + (i + 1) + ".png", 0.999, 1.0, b);
  return { a, b };
}

console.log("Placeholder clips written to production/raw (s1-s4, t1-t3)");
