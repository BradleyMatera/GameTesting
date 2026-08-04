import { categories, demos, getDemo, getDemosByCategory } from "./demo-registry.js";

const canvas = document.querySelector("#renderCanvas");
const stage = document.querySelector("#demo-stage");
const loadingScreen = document.querySelector("#loading-screen");
const errorScreen = document.querySelector("#error-screen");
const demoNav = document.querySelector("#demo-nav");
const categoryNav = document.querySelector("#category-nav");
const searchInput = document.querySelector("#demo-search");
const library = document.querySelector("#demo-library");
const libraryToggle = document.querySelector("#library-toggle");
const demoCount = document.querySelector("#demo-count");
const title = document.querySelector("#demo-title");
const description = document.querySelector("#demo-description");
const demoNumber = document.querySelector("#demo-number");
const demoCategory = document.querySelector("#demo-category");
const controlHint = document.querySelector("#control-hint");
const tourToggle = document.querySelector("#tour-toggle");
const resetButton = document.querySelector("#reset-view");
const previousButton = document.querySelector("#previous-demo");
const nextButton = document.querySelector("#next-demo");
const fpsCounter = document.querySelector("#fps-counter");
const meshCounter = document.querySelector("#mesh-counter");
const engineMode = document.querySelector("#engine-mode");

const detailPanel = document.querySelector("#detail-panel");
const detailIndex = document.querySelector("#detail-index");
const detailTitle = document.querySelector("#detail-title");
const detailKicker = document.querySelector("#detail-kicker");
const detailCopy = document.querySelector("#detail-copy");
const detailTags = document.querySelector("#detail-tags");

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
  detailTags.replaceChildren(
    ...tags.map((tag) => {
      const item = document.createElement("span");
      item.textContent = tag;
      return item;
    }),
  );
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
    button.innerHTML = `
      <span class="demo-number">${demo.number}</span>
      <span class="demo-name">${demo.shortTitle}<small>${demo.category} • ${demo.status}</small></span>
      <span class="demo-arrow" aria-hidden="true">→</span>
    `;
    button.addEventListener("click", () => loadDemo(demo.id));
    demoNav.append(button);
  });
}

function setControlMode(demo) {
  guidedMode = false;
  tourToggle.setAttribute("aria-pressed", "false");
  resetButton.textContent = demo.category === "Games" ? "Restart" : "Reset demo";
  controlHint.textContent = demo.controls;

  if (demo.mode === "babylon") {
    tourToggle.hidden = false;
    tourToggle.innerHTML = '<span class="button-icon" aria-hidden="true">▶</span> Guided orbit';
  } else if (demo.category === "Systems") {
    tourToggle.hidden = false;
    tourToggle.innerHTML = '<span class="button-icon" aria-hidden="true">Ⅱ</span> Pause simulation';
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

  demoNumber.textContent = demo.number;
  demoCategory.textContent = demo.category.toUpperCase();
  title.innerHTML = titleMarkup(demo.title);
  description.textContent = demo.description;
  setControlMode(demo);
  renderDemoNav();
  updateSequenceControls();
  renderDetail({
    index: `${demo.category.toUpperCase()} ${demo.number}`,
    title: demo.title,
    kicker: "INTERACTIVE FRONTEND DEMO",
    copy: demo.description,
    tags: [demo.category, demo.mode === "babylon" ? "Babylon.js" : "JavaScript", demo.category === "Games" ? "Playable" : "Responsive"],
  });

  try {
    if (demo.mode === "babylon" && !window.BABYLON) throw new Error("Babylon.js did not load.");

    const controller = await demo.create({
      canvas,
      stage,
      demo,
      onSelect: renderDetail,
      onReady: ({ engineType }) => {
        if (sequence !== loadSequence) return;
        engineMode.textContent = engineType;
        loadingScreen.classList.add("done");
      },
    });

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
    tourToggle.innerHTML = guidedMode
      ? '<span class="button-icon" aria-hidden="true">Ⅱ</span> Pause orbit'
      : '<span class="button-icon" aria-hidden="true">▶</span> Guided orbit';
  } else {
    tourToggle.innerHTML = guidedMode
      ? '<span class="button-icon" aria-hidden="true">▶</span> Resume simulation'
      : '<span class="button-icon" aria-hidden="true">Ⅱ</span> Pause simulation';
  }
  activeController?.setGuidedOrbit?.(guidedMode);
});

resetButton.addEventListener("click", () => activeController?.resetCamera?.());
previousButton.addEventListener("click", () => moveDemo(-1));
nextButton.addEventListener("click", () => moveDemo(1));

window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLSelectElement) return;
  if (event.key === "[") moveDemo(-1);
  if (event.key === "]") moveDemo(1);
  if (event.key === "Escape") {
    library.classList.remove("open");
    libraryToggle.setAttribute("aria-expanded", "false");
  }
});

async function boot() {
  renderCategoryNav();
  renderDemoNav();
  try {
    const requested = new URLSearchParams(window.location.search).get("demo");
    await loadDemo(requested, { updateHistory: Boolean(requested) });
  } catch (error) {
    console.error(error);
    loadingScreen.classList.add("done");
    errorScreen.hidden = false;
  }
}

window.addEventListener("DOMContentLoaded", boot);
window.addEventListener("beforeunload", () => {
  clearInterval(telemetryTimer);
  activeController?.dispose?.();
});
