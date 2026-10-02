import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outDir = "test-results";
const types = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".jpg": "image/jpeg",
  ".png": "image/png"
};

const server = createServer(async (req, res) => {
  const url = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(root, url === "/" ? "index.html" : url);
  try {
    const data = await readFile(file);
    res.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Content-Length": data.length });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
});

await new Promise((resolve) => server.listen(4173, resolve));
await mkdir(outDir, { recursive: true });

const base = "http://localhost:4173/";
const browser = await chromium.launch();
let failures = 0;

function check(ok, message) {
  console.log((ok ? "PASS " : "FAIL ") + message);
  if (!ok) failures++;
}

async function settle(page) {
  await page.waitForTimeout(700);
  await page.waitForFunction(() => !document.querySelector(".world").seeking);
}

async function scrollTo(page, progress) {
  await page.evaluate((p) => {
    const film = document.querySelector("#film");
    const max = film.offsetHeight - window.innerHeight;
    window.scrollTo(0, film.offsetTop + p * max);
  }, progress);
  await settle(page);
}

async function desktopTest() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("console", (msg) => { if (msg.type() === "error") errors.push(msg.text()); });
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto(base);
  await page.waitForSelector("body.is-ready", { timeout: 30000 });
  check(true, "video loaded (desktop)");

  const seekable = await page.evaluate(() => {
    const v = document.querySelector(".world");
    return v.seekable.length ? v.seekable.end(0) : 0;
  });
  check(seekable > 1, "video is seekable (" + seekable.toFixed(1) + " s)");

  await page.screenshot({ path: outDir + "/desktop-start.png" });

  const steps = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
  const forward = [];
  for (const p of steps) {
    await scrollTo(page, p);
    forward.push(await page.evaluate(() => document.querySelector(".world").currentTime));
  }
  const goesUp = forward.every((t, i) => i === 0 || t >= forward[i - 1]);
  check(goesUp, "scrolling down moves time forward: " + forward.map((t) => t.toFixed(1)).join(", "));

  const backward = [];
  for (const p of [...steps].reverse()) {
    await scrollTo(page, p);
    backward.push(await page.evaluate(() => document.querySelector(".world").currentTime));
  }
  const goesDown = backward.every((t, i) => i === 0 || t <= backward[i - 1]);
  check(goesDown, "scrolling up moves time backward: " + backward.map((t) => t.toFixed(1)).join(", "));

  const sameAfterReturn = Math.abs(forward[5] - backward[5]) < 0.15;
  check(sameAfterReturn, "same scroll position shows the same frame both ways");

  const manifest = await page.evaluate(() => fetch("media/manifest.json").then((r) => r.json()));
  const seamTimes = manifest.clips.slice(1).map((c) => c.start);
  for (let i = 0; i < seamTimes.length; i++) {
    const t = seamTimes[i];
    for (const [label, offset] of [["before", -0.12], ["after", 0.12]]) {
      await page.evaluate((time) => {
        const v = document.querySelector(".world");
        v.currentTime = time;
      }, t + offset);
      await page.waitForTimeout(300);
      await page.locator(".world").screenshot({ path: outDir + "/seam-" + (i + 1) + "-" + label + ".png" });
    }
  }
  check(true, "seam screenshots saved in " + outDir);

  for (let i = 0; i < 4; i++) {
    await page.click(".rail-steps li:nth-child(" + (i + 1) + ") button");
    await page.waitForTimeout(1500);
    await settle(page);
    const visible = await page.evaluate((index) => {
      const slab = document.querySelectorAll(".scene .slab")[index];
      return Number(getComputedStyle(slab).opacity);
    }, i);
    check(visible > 0.9, "rail button " + (i + 1) + " shows scene " + (i + 1) + " text");
    await page.screenshot({ path: outDir + "/desktop-scene-" + (i + 1) + ".png" });
  }

  await scrollTo(page, 1);
  const ctaVisible = await page.locator(".slab-final .btn-main").isVisible();
  check(ctaVisible, "final CTA is visible at the end of the film");

  check(errors.length === 0, "no console errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  await page.close();
}

async function mobileTest() {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(base);
  await page.waitForSelector("body.is-ready", { timeout: 30000 });
  const src = await page.evaluate(() => document.querySelector(".world").videoWidth);
  check(src === 854, "phone gets the lighter video (" + src + " px wide)");
  await page.screenshot({ path: outDir + "/mobile-start.png" });
  await scrollTo(page, 0.45);
  await page.screenshot({ path: outDir + "/mobile-middle.png" });
  await scrollTo(page, 1);
  await page.screenshot({ path: outDir + "/mobile-end.png" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check(!overflow, "no horizontal scroll on phone");
  await page.close();
}

async function reducedMotionTest() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto(base);
  await page.waitForTimeout(500);
  const isStatic = await page.evaluate(() => document.body.classList.contains("is-static"));
  check(isStatic, "reduced motion shows the static version");
  const stills = await page.locator(".scene-still").evaluateAll((imgs) => imgs.filter((img) => img.offsetHeight > 0).length);
  check(stills === 4, "reduced motion shows 4 scene images");
  await page.screenshot({ path: outDir + "/reduced-motion.png", fullPage: true });
  await context.close();
}

try {
  await desktopTest();
  await mobileTest();
  await reducedMotionTest();
} finally {
  await browser.close();
  server.close();
}

console.log(failures === 0 ? "\nAll checks passed." : "\n" + failures + " check(s) failed.");
process.exit(failures === 0 ? 0 : 1);
