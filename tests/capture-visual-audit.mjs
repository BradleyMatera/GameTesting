import { chromium } from "playwright";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8080";
const outputRoot = process.env.AUDIT_OUTPUT || "audit-screenshots";
const registry = await readFile(new URL("../js/demo-registry.js", import.meta.url), "utf8");
const demoIds = [...registry.matchAll(/\bdemo\(\s*"([^"]+)"/g)].map((match) => match[1]);

if (demoIds.length !== 25) {
  throw new Error(`Expected 25 registered demos, found ${demoIds.length}`);
}

const websiteIds = new Set([
  "matera-digital",
  "fairway-store",
  "ethics-lms",
  "construction-erp",
  "recruiter-portfolio",
]);
const toolIds = new Set([
  "architecture-builder",
  "workflow-designer",
  "seo-auditor",
  "accessibility-lab",
  "api-failure-lab",
  "shader-lab",
  "procedural-world",
]);
const gameIds = new Set([
  "cloud-ops-crisis",
  "golf-challenge",
  "code-dungeon",
  "data-center-defense",
  "digital-evolution",
  "pcs-logistics",
]);

const records = [];
const failures = [];

function safeName(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "state";
}

async function ensureDirectories() {
  for (const folder of ["desktop", "mobile", "states"]) {
    await mkdir(path.join(outputRoot, folder), { recursive: true });
  }
}

async function loadDemo(page, id) {
  const response = await page.goto(`${baseUrl}/?demo=${encodeURIComponent(id)}`, {
    waitUntil: "networkidle",
    timeout: 40_000,
  });
  if (!response?.ok()) throw new Error(`HTTP ${response?.status()} while loading ${id}`);

  await page.waitForFunction(
    () => document.querySelector("#loading-screen")?.classList.contains("done"),
    null,
    { timeout: 25_000 },
  );

  if (await page.locator("#error-screen").isVisible()) {
    throw new Error(`Error screen visible: ${await page.locator("#error-screen").innerText()}`);
  }

  await page.waitForTimeout(id === "digital-command-center" ? 1800 : 500);
  await page.addStyleTag({
    content: `
      html { scroll-behavior: auto !important; }
      *, *::before, *::after { transition-duration: 0s !important; caret-color: transparent !important; }
    `,
  });
}

async function capture(page, folder, index, id, state, options = {}) {
  const filename = `${String(index + 1).padStart(2, "0")}-${id}-${safeName(state)}.jpg`;
  const filepath = path.join(outputRoot, folder, filename);
  await page.screenshot({
    path: filepath,
    type: "jpeg",
    quality: 88,
    fullPage: options.fullPage ?? true,
  });
  records.push({ demo: id, viewport: folder, state, file: `${folder}/${filename}` });
  console.log(`CAPTURE ${folder}/${filename}`);
}

async function captureScrollableBottom(page, folder, index, id, label) {
  const scrolled = await page.evaluate(() => {
    const candidates = [document.querySelector("#demo-stage"), document.scrollingElement].filter(Boolean);
    let changed = false;
    for (const element of candidates) {
      if (element.scrollHeight > element.clientHeight + 120) {
        element.scrollTop = element.scrollHeight;
        changed = true;
      }
    }
    return changed;
  });
  if (scrolled) {
    await page.waitForTimeout(150);
    await capture(page, folder, index, id, `${label}-bottom`, { fullPage: false });
  }
}

async function listMeaningfulControls(page) {
  return page.locator("#demo-stage button, #demo-stage [role='tab'], #demo-stage a[href]").evaluateAll((elements) => {
    const seen = new Set();
    const output = [];
    const preferredData = [
      "data-page",
      "data-tab",
      "data-view",
      "data-section",
      "data-filter",
      "data-lesson",
      "data-add-product",
      "data-add-service",
      "data-add-workflow",
      "data-a11y-toggle",
      "data-game-start",
      "data-world-generate",
      "data-seo-run",
    ];

    for (const element of elements) {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || rect.width < 4 || rect.height < 4) continue;
      if (element.disabled || element.getAttribute("aria-disabled") === "true") continue;

      const label = (element.getAttribute("aria-label") || element.textContent || "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80);
      if (!label) continue;

      const href = element.getAttribute("href") || "";
      if (/^(https?:|mailto:|tel:)/i.test(href)) continue;

      let selector = "";
      if (element.id) {
        selector = `#${CSS.escape(element.id)}`;
      } else {
        for (const attr of preferredData) {
          if (element.hasAttribute(attr)) {
            selector = `[${attr}="${CSS.escape(element.getAttribute(attr) || "")}"]`;
            break;
          }
        }
      }

      const role = element.getAttribute("role") || (element.tagName === "A" ? "link" : "button");
      const fingerprint = `${selector}|${role}|${label}`;
      if (seen.has(fingerprint)) continue;
      seen.add(fingerprint);
      output.push({ selector, role, label, href });
    }

    return output;
  });
}

async function clickControl(page, control) {
  let locator;
  if (control.selector) {
    locator = page.locator(`#demo-stage ${control.selector}`).first();
  } else {
    locator = page.getByRole(control.role, { name: control.label, exact: true }).first();
  }
  if (!(await locator.count()) || !(await locator.isVisible())) return false;
  await locator.scrollIntoViewIfNeeded();
  await locator.click({ timeout: 5000 });
  await page.waitForTimeout(500);
  return true;
}

async function captureInteractionStates(page, index, id) {
  if (gameIds.has(id)) {
    const start = page.locator("[data-game-start]").first();
    if (await start.count()) {
      await start.click();
      await page.waitForTimeout(1400);
      await capture(page, "states", index, id, "game-running", { fullPage: false });
    }
    return;
  }

  if (id === "architecture-builder") {
    for (const service of ["cdn", "api", "compute", "database"]) {
      const button = page.locator(`[data-add-service="${service}"]`).first();
      if (await button.count()) await button.click();
    }
    await page.waitForTimeout(300);
    await capture(page, "states", index, id, "four-service-architecture");
  }

  if (id === "workflow-designer") {
    for (const step of ["0", "1", "2", "3"]) {
      const button = page.locator(`[data-add-workflow="${step}"]`).first();
      if (await button.count()) await button.click();
    }
    await page.waitForTimeout(300);
    await capture(page, "states", index, id, "four-step-workflow");
  }

  if (id === "seo-auditor") {
    const run = page.locator("[data-seo-run]").first();
    if (await run.count()) {
      await run.click();
      await page.waitForTimeout(350);
      await capture(page, "states", index, id, "audit-results");
    }
  }

  if (id === "accessibility-lab") {
    const toggles = page.locator("[data-a11y-toggle]");
    const count = Math.min(await toggles.count(), 4);
    for (let i = 0; i < count; i += 1) await toggles.nth(i).check().catch(() => {});
    await page.waitForTimeout(250);
    await capture(page, "states", index, id, "issues-enabled");
  }

  if (id === "procedural-world") {
    const generate = page.locator("[data-world-generate]").first();
    if (await generate.count()) {
      await generate.click();
      await page.waitForTimeout(450);
      await capture(page, "states", index, id, "generated-world");
    }
  }

  if (id === "shader-lab") {
    const ranges = page.locator("#demo-stage input[type='range']");
    const count = await ranges.count();
    for (let i = 0; i < count; i += 1) {
      const max = await ranges.nth(i).getAttribute("max");
      if (max) await ranges.nth(i).fill(max).catch(() => {});
    }
    await page.waitForTimeout(300);
    await capture(page, "states", index, id, "maximum-controls");
  }

  const shouldCrawl = websiteIds.has(id) || toolIds.has(id) || (!gameIds.has(id) && id !== "digital-command-center");
  if (!shouldCrawl) return;

  await loadDemo(page, id);
  const controls = await listMeaningfulControls(page);
  const limit = websiteIds.has(id) ? 20 : 8;

  for (const control of controls.slice(0, limit)) {
    try {
      await loadDemo(page, id);
      if (!(await clickControl(page, control))) continue;
      await capture(page, "states", index, id, `control-${control.label}`, { fullPage: true });
    } catch (error) {
      records.push({ demo: id, viewport: "states", state: `control-${control.label}`, skipped: error.message });
    }
  }
}

await ensureDirectories();
const browser = await chromium.launch({ headless: true });

const desktopContext = await browser.newContext({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
});
const desktopPage = await desktopContext.newPage();

desktopPage.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
desktopPage.on("console", (message) => {
  if (message.type() === "error") failures.push(`console: ${message.text()}`);
});

for (const [index, id] of demoIds.entries()) {
  try {
    await loadDemo(desktopPage, id);
    await capture(desktopPage, "desktop", index, id, "initial");
    await captureScrollableBottom(desktopPage, "desktop", index, id, "initial");
    await captureInteractionStates(desktopPage, index, id);
  } catch (error) {
    failures.push(`${id}: ${error.message}`);
    records.push({ demo: id, viewport: "desktop", state: "capture-failed", error: error.message });
  }
}

await desktopContext.close();

const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  colorScheme: "dark",
  isMobile: true,
  hasTouch: true,
});
const mobilePage = await mobileContext.newPage();

for (const [index, id] of demoIds.entries()) {
  try {
    await loadDemo(mobilePage, id);
    await capture(mobilePage, "mobile", index, id, "initial", { fullPage: false });
    await captureScrollableBottom(mobilePage, "mobile", index, id, "initial");
  } catch (error) {
    failures.push(`${id} mobile: ${error.message}`);
    records.push({ demo: id, viewport: "mobile", state: "capture-failed", error: error.message });
  }
}

await mobileContext.close();
await browser.close();

await writeFile(
  path.join(outputRoot, "index.json"),
  JSON.stringify({ generatedAt: new Date().toISOString(), demoIds, records, failures }, null, 2),
  "utf8",
);

const summary = [
  "# Visual Audit Screenshot Index",
  "",
  `Captured ${records.filter((record) => record.file).length} screenshots across ${demoIds.length} demos.`,
  "",
  ...records.map((record) => record.file ? `- ${record.demo} | ${record.viewport} | ${record.state} | ${record.file}` : `- ${record.demo} | ${record.state} | ERROR: ${record.error || record.skipped}`),
  "",
  failures.length ? `Failures: ${failures.join(" | ")}` : "Failures: none",
];
await writeFile(path.join(outputRoot, "INDEX.md"), summary.join("\n"), "utf8");

console.log(`Captured ${records.filter((record) => record.file).length} screenshots.`);
if (failures.length) {
  console.warn(`Capture completed with ${failures.length} browser warnings/errors. See index.json.`);
}
