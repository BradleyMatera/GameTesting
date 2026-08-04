import { categories, demos, getDemo, getDemosByCategory } from "./demo-registry.js";

const productionStyles = document.createElement("link");
productionStyles.rel = "stylesheet";
productionStyles.href = "./production-v2.css";
document.head.append(productionStyles);

const $ = (selector) => document.querySelector(selector);
const canvas = $("#renderCanvas");
const stage = $("#demo-stage");
const loadingScreen = $("#loading-screen");
const errorScreen = $("#error-screen");
const demoNav = $("#demo-nav");
const categoryNav = $("#category-nav");
const searchInput = $("#demo-search");
const library = $("#demo-library");
const libraryToggle = $("#library-toggle");
const demoCount = $("#demo-count");
const title = $("#demo-title");
const description = $("#demo-description");
const demoNumber = $("#demo-number");
const demoCategory = $("#demo-category");
const controlHint = $("#control-hint");
const tourToggle = $("#tour-toggle");
const resetButton = $("#reset-view");
const previousButton = $("#previous-demo");
const nextButton = $("#next-demo");
const fpsCounter = $("#fps-counter");
const meshCounter = $("#mesh-counter");
const engineMode = $("#engine-mode");
const detailIndex = $("#detail-index");
const detailTitle = $("#detail-title");
const detailKicker = $("#detail-kicker");
const detailCopy = $("#detail-copy");
const detailTags = $("#detail-tags");
const controlRow = $("#lab-controls");

const fullscreenButton = document.createElement("button");
fullscreenButton.id = "fullscreen-demo";
fullscreenButton.className = "secondary-control fullscreen-control";
fullscreenButton.type = "button";
fullscreenButton.textContent = "Full screen";
controlRow.append(fullscreenButton);

let activeController = null;
let activeDemo = null;
let activeCategory = "All";
let guidedMode = false;
let telemetryTimer = null;
let visibleDemos = [...demos];
let loadSequence = 0;

function titleMarkup(value) {
  const words = value.toUpperCase().split(" ");
  if (words.length === 1) return words[0];
  const split = Math.max(1, Math.ceil(words.length / 2));
  return `${words.slice(0, split).join(" ")}<br><em>${words.slice(split).join(" ")}</em>`;
}

function renderDetail(detail) {
  if (!detail) return;
  detailIndex.textContent = detail.index || "DEMO";
  detailTitle.textContent = detail.title || activeDemo?.title || "Interactive demo";
  detailKicker.textContent = detail.kicker || "WORKING FRONTEND EXPERIENCE";
  detailCopy.textContent = detail.copy || activeDemo?.description || "";
  const tags = detail.tags || [activeDemo?.category || "Interactive", "Browser", "Brad Matera"];
  detailTags.replaceChildren(...tags.map((tag) => {
    const item = document.createElement("span");
    item.textContent = tag;
    return item;
  }));
}

function renderCategoryNav() {
  categoryNav.replaceChildren();
  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = category === activeCategory ? "active" : "";
    button.textContent = category;
    button.addEventListener("click", () => {
      activeCategory = category;
      renderCategoryNav();
      renderDemoNav();
    });
    categoryNav.append(button);
  });
}

function filteredDemos() {
  const query = searchInput.value.trim().toLowerCase();
  return getDemosByCategory(activeCategory).filter((demo) => {
    if (!query) return true;
    return [demo.title, demo.shortTitle, demo.category, demo.description].join(" ").toLowerCase().includes(query);
  });
}

function renderDemoNav() {
  visibleDemos = filteredDemos();
  demoCount.textContent = `${visibleDemos.length} / ${demos.length}`;
  demoNav.replaceChildren();
  if (!visibleDemos.length) {
    const empty = document.createElement("p");
    empty.className = "nav-empty";
    empty.textContent = "No demos match that filter.";
    demoNav.append(empty);
    return;
  }
  let currentCategory = "";
  visibleDemos.forEach((demo) => {
    if (activeCategory === "All" && demo.category !== currentCategory) {
      currentCategory = demo.category;
      const heading = document.createElement("p");
      heading.className = "demo-group-heading";
      heading.textContent = currentCategory;
      demoNav.append(heading);
    }
    const button = document.createElement("button");
    button.className = `demo-button${demo.id === activeDemo?.id ? " active" : ""}`;
    button.type = "button";
    button.dataset.demoId = demo.id;
    button.innerHTML = `<span class="demo-number">${demo.number}</span><span class="demo-name">${demo.shortTitle}<small>${demo.category} • ${demo.status}</small></span><span class="demo-arrow" aria-hidden="true">→</span>`;
    button.addEventListener("click", () => loadDemo(demo.id));
    demoNav.append(button);
  });
  requestAnimationFrame(() => demoNav.querySelector(".demo-button.active")?.scrollIntoView({ block: "nearest" }));
}

function setControlMode(demo) {
  guidedMode = false;
  tourToggle.setAttribute("aria-pressed", "false");
  resetButton.textContent = demo.category === "Games" ? "Restart" : "Reset";
  controlHint.textContent = demo.controls;
  if (demo.mode === "babylon") {
    tourToggle.hidden = false;
    tourToggle.innerHTML = '<span class="button-icon" aria-hidden="true">▶</span> Guided orbit';
  } else if (demo.category === "Systems") {
    tourToggle.hidden = false;
    tourToggle.innerHTML = '<span class="button-icon" aria-hidden="true">Ⅱ</span> Pause';
  } else {
    tourToggle.hidden = true;
  }
}

function updateSequenceControls() {
  const index = demos.findIndex((demo) => demo.id === activeDemo?.id);
  previousButton.disabled = index <= 0;
  nextButton.disabled = index < 0 || index >= demos.length - 1;
  previousButton.title = index > 0 ? `Previous: ${demos[index - 1].title}` : "First demo";
  nextButton.title = index < demos.length - 1 ? `Next: ${demos[index + 1].title}` : "Last demo";
}

async function loadDemo(id, { updateHistory = true } = {}) {
  const demo = getDemo(id);
  if (!demo) return;
  const sequence = ++loadSequence;
  loadingScreen.classList.remove("done");
  errorScreen.hidden = true;
  clearInterval(telemetryTimer);
  activeController?.dispose?.();
  activeController = null;
  activeDemo = demo;
  canvas.hidden = demo.mode !== "babylon";
  stage.hidden = demo.mode === "babylon";
  stage.replaceChildren();
  document.body.dataset.demoMode = demo.mode;
  document.body.dataset.demoCategory = demo.category.toLowerCase();
  document.body.dataset.demoId = demo.id;
  demoNumber.textContent = demo.number;
  demoCategory.textContent = demo.category.toUpperCase();
  title.innerHTML = titleMarkup(demo.title);
  description.textContent = demo.description;
  setControlMode(demo);
  renderDemoNav();
  updateSequenceControls();
  renderDetail({ index: `${demo.category.toUpperCase()} ${demo.number}`, title: demo.title, kicker: demo.category === "Games" ? "DISTINCT PLAYABLE MECHANIC" : "PURPOSE-BUILT INTERACTIVE SYSTEM", copy: demo.description, tags: [demo.category, demo.mode === "babylon" ? "Babylon.js" : "JavaScript", "Purpose-built"] });
  try {
    if (demo.mode === "babylon" && !window.BABYLON) throw new Error("Babylon.js did not load.");
    const controller = await demo.create({ canvas, stage, demo, onSelect: renderDetail, onReady: ({ engineType }) => {
      if (sequence !== loadSequence) return;
      engineMode.textContent = engineType;
      loadingScreen.classList.add("done");
    }});
    if (sequence !== loadSequence) {
      controller?.dispose?.();
      return;
    }
    activeController = controller;
    telemetryTimer = window.setInterval(() => {
      if (!activeController) return;
      const stats = activeController.getStats?.() || {};
      fpsCounter.textContent = stats.fps ?? "60";
      meshCounter.textContent = stats.meshes ?? stage.querySelectorAll("*").length;
    }, 500);
    if (updateHistory) {
      const url = new URL(window.location.href);
      url.searchParams.set("demo", demo.id);
      window.history.replaceState({ demo: demo.id }, "", url);
    }
    library.classList.remove("open");
    libraryToggle.setAttribute("aria-expanded", "false");
  } catch (error) {
    console.error(error);
    loadingScreen.classList.add("done");
    errorScreen.hidden = false;
    engineMode.textContent = "UNAVAILABLE";
    errorScreen.querySelector("p").textContent = `The ${demo.title} demo failed to start. ${error.message}`;
  }
}

function moveDemo(direction) {
  const index = demos.findIndex((demo) => demo.id === activeDemo?.id);
  const target = demos[index + direction];
  if (target) loadDemo(target.id);
}

searchInput.addEventListener("input", renderDemoNav);
libraryToggle.addEventListener("click", () => {
  const open = library.classList.toggle("open");
  libraryToggle.setAttribute("aria-expanded", String(open));
});
tourToggle.addEventListener("click", () => {
  guidedMode = !guidedMode;
  tourToggle.setAttribute("aria-pressed", String(guidedMode));
  if (activeDemo?.mode === "babylon") {
    tourToggle.innerHTML = guidedMode ? '<span class="button-icon" aria-hidden="true">Ⅱ</span> Pause orbit' : '<span class="button-icon" aria-hidden="true">▶</span> Guided orbit';
  } else {
    tourToggle.innerHTML = guidedMode ? '<span class="button-icon" aria-hidden="true">▶</span> Resume' : '<span class="button-icon" aria-hidden="true">Ⅱ</span> Pause';
  }
  activeController?.setGuidedOrbit?.(guidedMode);
});
resetButton.addEventListener("click", () => activeController?.resetCamera?.());
previousButton.addEventListener("click", () => moveDemo(-1));
nextButton.addEventListener("click", () => moveDemo(1));
fullscreenButton.addEventListener("click", async () => {
  const target = activeDemo?.mode === "babylon" ? $(".app-shell") : stage;
  if (!document.fullscreenElement) await target.requestFullscreen?.();
  else await document.exitFullscreen?.();
});
document.addEventListener("fullscreenchange", () => { fullscreenButton.textContent = document.fullscreenElement ? "Exit full screen" : "Full screen"; });
window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
  if (event.key === "[") moveDemo(-1);
  if (event.key === "]") moveDemo(1);
  if (event.key.toLowerCase() === "f") fullscreenButton.click();
  if (event.key === "Escape") {
    library.classList.remove("open");
    libraryToggle.setAttribute("aria-expanded", "false");
  }
});

async function boot() {
  renderCategoryNav();
  renderDemoNav();
  const requested = new URLSearchParams(window.location.search).get("demo");
  await loadDemo(requested, { updateHistory: Boolean(requested) });
}
window.addEventListener("DOMContentLoaded", () => boot().catch((error) => {
  console.error(error);
  loadingScreen.classList.add("done");
  errorScreen.hidden = false;
}));
window.addEventListener("beforeunload", () => {
  clearInterval(telemetryTimer);
  activeController?.dispose?.();
});
