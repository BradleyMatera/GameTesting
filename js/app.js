import { demos, getDemo } from "./demo-registry.js";

const canvas = document.querySelector("#renderCanvas");
const loadingScreen = document.querySelector("#loading-screen");
const errorScreen = document.querySelector("#error-screen");
const demoNav = document.querySelector("#demo-nav");
const title = document.querySelector("#demo-title");
const description = document.querySelector("#demo-description");
const tourToggle = document.querySelector("#tour-toggle");
const resetButton = document.querySelector("#reset-view");
const fpsCounter = document.querySelector("#fps-counter");
const meshCounter = document.querySelector("#mesh-counter");
const engineMode = document.querySelector("#engine-mode");

const detailIndex = document.querySelector("#detail-index");
const detailTitle = document.querySelector("#detail-title");
const detailKicker = document.querySelector("#detail-kicker");
const detailCopy = document.querySelector("#detail-copy");
const detailTags = document.querySelector("#detail-tags");

let activeController = null;
let guidedOrbit = false;
let telemetryTimer = null;

function renderDemoNav(activeId) {
  demoNav.replaceChildren();

  for (const demo of demos) {
    const button = document.createElement("button");
    button.className = `demo-button${demo.id === activeId ? " active" : ""}`;
    button.type = "button";
    button.disabled = !demo.enabled;
    button.dataset.demoId = demo.id;
    button.innerHTML = `
      <span class="demo-number">${demo.number}</span>
      <span class="demo-name">${demo.shortTitle}<small>${demo.status}</small></span>
    `;

    if (demo.enabled) {
      button.addEventListener("click", () => loadDemo(demo.id));
    }

    demoNav.append(button);
  }
}

function renderDetail(detail) {
  detailIndex.textContent = detail.index;
  detailTitle.textContent = detail.title;
  detailKicker.textContent = detail.kicker;
  detailCopy.textContent = detail.copy;
  detailTags.replaceChildren(
    ...detail.tags.map((tag) => {
      const item = document.createElement("span");
      item.textContent = tag;
      return item;
    }),
  );
}

async function loadDemo(id) {
  const demo = getDemo(id);
  if (!demo || !window.BABYLON) return;

  activeController?.dispose();
  clearInterval(telemetryTimer);
  renderDemoNav(demo.id);

  title.innerHTML = demo.title
    .toUpperCase()
    .replace("DIGITAL COMMAND CENTER", "DIGITAL<br><em>COMMAND CENTER</em>");
  description.textContent = demo.description;

  guidedOrbit = false;
  tourToggle.setAttribute("aria-pressed", "false");
  tourToggle.innerHTML = '<span class="button-icon" aria-hidden="true">▶</span> Guided orbit';

  activeController = await demo.create({
    canvas,
    onSelect: renderDetail,
    onReady: ({ engineType }) => {
      engineMode.textContent = engineType;
      loadingScreen.classList.add("done");
    },
  });

  telemetryTimer = window.setInterval(() => {
    if (!activeController) return;
    const stats = activeController.getStats();
    fpsCounter.textContent = stats.fps;
    meshCounter.textContent = stats.meshes;
  }, 500);
}

tourToggle.addEventListener("click", () => {
  guidedOrbit = !guidedOrbit;
  tourToggle.setAttribute("aria-pressed", String(guidedOrbit));
  tourToggle.innerHTML = guidedOrbit
    ? '<span class="button-icon" aria-hidden="true">Ⅱ</span> Pause orbit'
    : '<span class="button-icon" aria-hidden="true">▶</span> Guided orbit';
  activeController?.setGuidedOrbit(guidedOrbit);
});

resetButton.addEventListener("click", () => activeController?.resetCamera());

async function boot() {
  renderDemoNav(demos[0].id);

  try {
    if (!window.BABYLON) {
      throw new Error("Babylon.js did not load.");
    }
    await loadDemo(new URLSearchParams(window.location.search).get("demo"));
  } catch (error) {
    console.error(error);
    loadingScreen.classList.add("done");
    errorScreen.hidden = false;
    engineMode.textContent = "UNAVAILABLE";
  }
}

window.addEventListener("DOMContentLoaded", boot);
window.addEventListener("beforeunload", () => {
  clearInterval(telemetryTimer);
  activeController?.dispose();
});
