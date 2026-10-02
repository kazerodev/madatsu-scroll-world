import { config } from "./config.js";

const body = document.body;
const film = document.querySelector("#film");
const video = document.querySelector(".world");
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
let targetTime = 0;
let shownTime = 0;
let videoReady = false;
let lastWidth = window.innerWidth;

setupContactLinks();
setupForm();

if (reduceMotion) {
  goStatic();
} else {
  start();
}

async function start() {
  try {
    const response = await fetch(config.manifest);
    const manifest = await response.json();
    buildSegments(manifest);
    setFilmHeight();
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("touchstart", primeVideo, { once: true, passive: true });
    railItems.forEach((item, i) => {
      item.querySelector("button").addEventListener("click", () => goToScene(i));
    });
    requestAnimationFrame(loop);

    let name = config.videoDesktop;
    if (isMobile) name = config.videoMobile;
    else if (window.innerWidth * window.devicePixelRatio > 1600) name = config.videoLarge;
    const url = await loadVideo(pickVideo(name));
    video.src = url;
    await waitFor(video, "loadeddata");
    video.currentTime = targetTime;
    shownTime = targetTime;
    videoReady = true;
    body.classList.add("is-ready");
  } catch (error) {
    console.warn("Falling back to the static version:", error);
    goStatic();
  }
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
  targetTime = time;

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

function loop() {
  shownTime += (targetTime - shownTime) * config.smoothing;
  if (Math.abs(targetTime - shownTime) < 0.002) shownTime = targetTime;
  if (videoReady && !video.seeking && Math.abs(video.currentTime - shownTime) > 0.01) {
    video.currentTime = shownTime;
  }
  requestAnimationFrame(loop);
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
  update();
}

function pickVideo(name) {
  if (video.canPlayType('video/mp4; codecs="avc1.640028"')) return name + ".mp4";
  return name + ".webm";
}

async function loadVideo(src) {
  const response = await fetch(src);
  if (!response.ok) throw new Error("Video not found: " + src);
  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total) showProgress(loaded / total);
  }
  showProgress(1);
  const type = src.endsWith(".webm") ? "video/webm" : "video/mp4";
  return URL.createObjectURL(new Blob(chunks, { type }));
}

function showProgress(amount) {
  const pct = Math.round(amount * 100);
  loaderFill.style.height = pct + "%";
  loaderPct.textContent = pct;
}

function waitFor(element, eventName) {
  return new Promise((resolve, reject) => {
    element.addEventListener(eventName, resolve, { once: true });
    element.addEventListener("error", reject, { once: true });
  });
}

function primeVideo() {
  video.play().then(() => video.pause()).catch(() => {});
}

function goStatic() {
  body.classList.add("is-static");
  body.classList.remove("is-ready");
  film.style.height = "";
  videoReady = false;
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
    window.open(whatsappLink(lines.join("\n")), "_blank", "noopener");
  });
}
