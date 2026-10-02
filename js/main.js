import { config } from "./config.js";

const body = document.body;
const film = document.querySelector("#film");
const canvas = document.querySelector(".world");
const ctx = canvas.getContext("2d");
const slabs = [...document.querySelectorAll(".scene .slab")];
const railItems = [...document.querySelectorAll(".rail-steps li")];
const railNow = document.querySelector(".rail-now");
const railFill = document.querySelector(".rail-fill");
const loaderFill = document.querySelector(".loader-fill");
const loaderPct = document.querySelector(".loader-pct");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 860px), (pointer: coarse)").matches;
const isTouch = window.matchMedia("(pointer: coarse)").matches;

let segments = [];
let totalWeight = 0;
let fps = 24;
let targetFrame = 0;
let shownFrame = 0;
let drawnFrame = -1;
let frames = [];
let lastWidth = window.innerWidth;
let lastTime = performance.now();

setupContactLinks();
setupForm();
setupTilt();

if (reduceMotion) {
  goStatic();
} else {
  start();
}

async function start() {
  try {
    const manifest = await fetch(config.manifest).then((r) => r.json());
    fps = manifest.fps;
    buildSegments(manifest);
    setFilmHeight();
    sizeCanvas();
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", onResize);
    railItems.forEach((item, i) => {
      item.querySelector("button").addEventListener("click", () => goToScene(i));
    });

    const folder = isMobile ? config.framesMobile : config.framesDesktop;
    const index = await fetch(folder + "/index.json").then((r) => r.json());
    frames = new Array(index.count).fill(null);

    await loadChunk(folder, index, 0, (p) => showProgress(p));
    body.classList.add("is-ready");
    requestAnimationFrame(loop);

    for (let c = 1; c < index.chunks.length; c++) {
      await loadChunk(folder, index, c, null);
    }
  } catch (error) {
    console.warn("Falling back to the static version:", error);
    goStatic();
  }
}

async function loadChunk(folder, index, chunkNumber, onProgress) {
  const response = await fetch(folder + "/" + index.chunks[chunkNumber]);
  if (!response.ok) throw new Error("Missing " + index.chunks[chunkNumber]);
  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const parts = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    parts.push(value);
    loaded += value.length;
    if (onProgress && total) onProgress(loaded / total);
  }
  const blob = new Blob(parts);
  const jobs = [];
  index.frames.forEach((entry, i) => {
    if (entry[0] !== chunkNumber) return;
    const url = URL.createObjectURL(blob.slice(entry[1], entry[1] + entry[2], "image/webp"));
    const img = new Image();
    jobs.push(new Promise((resolve) => {
      img.onload = () => { frames[i] = img; resolve(); };
      img.onerror = resolve;
    }));
    img.src = url;
  });
  await Promise.all(jobs);
  drawnFrame = -1;
  if (onProgress) onProgress(1);
}

function buildSegments(manifest) {
  const last = manifest.clips.length - 1;
  totalWeight = 0;
  segments = manifest.clips.map((clip, i) => {
    let weight = config.transitionScroll;
    if (clip.type === "scene") weight = i === last ? config.lastSceneScroll : config.sceneScroll;
    const segment = { ...clip, weight, from: totalWeight };
    totalWeight += weight;
    return segment;
  });
}

function setFilmHeight() {
  film.style.height = (totalWeight + 1) * window.innerHeight + "px";
}

function sizeCanvas() {
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvas.clientWidth * ratio);
  canvas.height = Math.round(canvas.clientHeight * ratio);
  drawnFrame = -1;
}

function getProgress() {
  const max = film.offsetHeight - window.innerHeight;
  const scrolled = -film.getBoundingClientRect().top;
  return Math.min(Math.max(scrolled / max, 0), 1);
}

function findPosition(progress) {
  const pos = progress * totalWeight;
  let segment = segments[segments.length - 1];
  for (const s of segments) {
    if (pos <= s.from + s.weight) {
      segment = s;
      break;
    }
  }
  const q = Math.min(Math.max((pos - segment.from) / segment.weight, 0), 1);
  const time = segment.start + q * (segment.end - segment.start);
  return { segment, q, time };
}

function update() {
  if (segments.length === 0) return;
  const progress = getProgress();
  const { segment, q, time } = findPosition(progress);
  targetFrame = time * fps;

  const scenes = segments.filter((s) => s.type === "scene");
  const sceneIndex = scenes.indexOf(segment);
  let active = scenes.filter((s) => s.from <= segment.from).length - 1;
  if (active < 0) active = 0;

  slabs.forEach((slab, i) => {
    let opacity = 0;
    if (i === sceneIndex) opacity = slabOpacity(i, q, scenes.length);
    slab.style.opacity = opacity;
    slab.style.transform = "translateY(" + (1 - opacity) * 24 + "px)";
    slab.style.visibility = opacity > 0 ? "visible" : "hidden";
  });

  railItems.forEach((item, i) => item.classList.toggle("is-active", i === active));
  railNow.textContent = String(active + 1).padStart(3, "0");
  railFill.style.height = progress * 100 + "%";
  body.classList.toggle("has-scrolled", window.scrollY > 30);
}

function slabOpacity(index, q, count) {
  const fadeIn = index === 0 ? 1 : smooth((q - 0.05) / 0.25);
  const fadeOut = index === count - 1 ? 1 : 1 - smooth((q - 0.75) / 0.2);
  return Math.min(fadeIn, fadeOut);
}

function smooth(x) {
  const t = Math.min(Math.max(x, 0), 1);
  return t * t * (3 - 2 * t);
}

function loop(now) {
  const dt = Math.min(now - lastTime, 100);
  lastTime = now;
  const ease = 1 - Math.pow(1 - config.smoothing, dt / 16.7);
  shownFrame += (targetFrame - shownFrame) * ease;
  if (Math.abs(targetFrame - shownFrame) < 0.01) shownFrame = targetFrame;
  draw(Math.round(shownFrame));
  requestAnimationFrame(loop);
}

function nearestLoaded(i) {
  if (frames[i]) return i;
  for (let d = 1; d < 16; d++) {
    if (frames[i - d]) return i - d;
    if (frames[i + d]) return i + d;
  }
  return -1;
}

function draw(i) {
  const index = Math.min(Math.max(i, 0), frames.length - 1);
  const found = nearestLoaded(index);
  if (found < 0 || found === drawnFrame) return;
  const img = frames[found];
  const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
  drawnFrame = found;
  canvas.dataset.frame = found;
}

function goToScene(index) {
  const scene = segments.filter((s) => s.type === "scene")[index];
  if (!scene) return;
  const progress = (scene.from + scene.weight * 0.4) / totalWeight;
  const max = film.offsetHeight - window.innerHeight;
  window.scrollTo({ top: film.offsetTop + progress * max, behavior: "smooth" });
}

function onResize() {
  if (isTouch && window.innerWidth === lastWidth) return;
  lastWidth = window.innerWidth;
  setFilmHeight();
  sizeCanvas();
  update();
}

function showProgress(amount) {
  const pct = Math.round(amount * 100);
  loaderFill.style.height = pct + "%";
  loaderPct.textContent = pct;
}

function goStatic() {
  body.classList.add("is-static");
  body.classList.remove("is-ready");
  film.style.height = "";
  slabs.forEach((slab) => {
    slab.style.opacity = "";
    slab.style.transform = "";
    slab.style.visibility = "";
  });
}

function whatsappLink(text) {
  return "https://wa.me/" + config.whatsapp + "?text=" + encodeURIComponent(text);
}

function setupContactLinks() {
  document.querySelectorAll("[data-whatsapp]").forEach((link) => {
    link.href = whatsappLink("Hi MADATSU! I have some cards I'd like to sell. Can I send you photos?");
    link.target = "_blank";
    link.rel = "noopener";
  });
  document.querySelectorAll("[data-email]").forEach((link) => {
    link.href = "mailto:" + config.email + "?subject=" + encodeURIComponent("Cards to sell");
  });
}

function setupForm() {
  const form = document.querySelector("#offer-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const lines = [
      "Hi MADATSU! I'd like an offer for my cards.",
      "Name: " + data.get("name"),
      "Game: " + data.get("game"),
      "Language: " + data.get("language"),
      "Amount: " + data.get("amount") + " cards"
    ];
    if (data.get("cards")) lines.push("Best cards: " + data.get("cards"));
    lines.push("I'll send photos here.");
    const link = document.createElement("a");
    link.href = whatsappLink(lines.join("\n"));
    link.target = "_blank";
    link.rel = "noopener";
    link.click();
  });
}

function setupTilt() {
  const card = document.querySelector("[data-tilt]");
  if (!card || reduceMotion) return;
  card.addEventListener("pointermove", (event) => {
    const box = card.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    card.style.setProperty("--ry", (x - 0.5) * 18 + "deg");
    card.style.setProperty("--rx", (0.5 - y) * 18 + "deg");
    card.style.setProperty("--gx", x * 100 + "%");
    card.style.setProperty("--gy", y * 100 + "%");
  });
  card.addEventListener("pointerleave", () => {
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
    card.style.setProperty("--gx", "50%");
    card.style.setProperty("--gy", "30%");
  });
}
