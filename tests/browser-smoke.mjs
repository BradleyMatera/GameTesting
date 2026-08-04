import { chromium } from "playwright";
import { readFile } from "node:fs/promises";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:8080";
const registry = await readFile(new URL("../js/demo-registry.js", import.meta.url), "utf8");
const demoIds = [...registry.matchAll(/\bdemo\(\s*"([^"]+)"/g)].map((match) => match[1]);

if (demoIds.length !== 25) {
  throw new Error(`Expected 25 registered demos, found ${demoIds.length}`);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const failures = [];
let pageErrors = [];

page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") pageErrors.push(`console: ${message.text()}`);
});

async function assertDemo(id) {
  pageErrors = [];
  const response = await page.goto(`${baseUrl}/?demo=${encodeURIComponent(id)}`, {
    waitUntil: "networkidle",
    timeout: 30_000,
  });

  if (!response?.ok()) {
    throw new Error(`HTTP ${response?.status()} while loading ${id}`);
  }

  await page.waitForFunction(() => document.querySelector("#loading-screen")?.classList.contains("done"), null, {
    timeout: 20_000,
  });

  const errorVisible = await page.locator("#error-screen").isVisible();
  if (errorVisible) {
    const text = await page.locator("#error-screen").innerText();
    throw new Error(`Error screen visible: ${text}`);
  }

  const activeId = await page.locator(".demo-button.active").getAttribute("data-demo-id");
  if (activeId !== id) {
    throw new Error(`Expected active demo ${id}, received ${activeId}`);
  }

  const title = (await page.locator("#demo-title").innerText()).trim();
  if (!title) throw new Error("Demo title is empty");

  if (id === "digital-command-center") {
    await page.locator("#renderCanvas").waitFor({ state: "visible" });
    await page.waitForFunction(() => document.querySelector("#engine-mode")?.textContent !== "INITIALIZING");
  } else {
    await page.locator("#demo-stage .demo-surface").waitFor({ state: "visible" });
  }

  if (id === "fairway-store") {
    await page.locator("[data-add-product]").first().click();
    const cartCount = await page.locator("[data-cart-count]").innerText();
    if (cartCount !== "1") throw new Error("Store cart did not update");
  }

  if (id === "ethics-lms") {
    await page.locator("[data-lesson='1']").click();
    const progress = await page.locator("[data-course-percent]").innerText();
    if (progress !== "40%") throw new Error(`Unexpected LMS progress: ${progress}`);
  }

  if (id === "architecture-builder") {
    await page.locator("[data-add-service='cdn']").click();
    await page.locator("[data-add-service='api']").click();
    const deployed = await page.locator("[data-deployed] button").count();
    if (deployed !== 2) throw new Error(`Expected 2 deployed services, found ${deployed}`);
  }

  if (id === "workflow-designer") {
    await page.locator("[data-add-workflow='0']").click();
    await page.locator("[data-add-workflow='1']").click();
    const count = await page.locator("[data-workflow-count]").innerText();
    if (count !== "2") throw new Error(`Expected workflow count 2, found ${count}`);
  }

  if (id === "seo-auditor") {
    await page.locator("[data-seo-run]").click();
    const score = Number(await page.locator("[data-seo-score]").innerText());
    if (!Number.isFinite(score) || score < 50) throw new Error(`Invalid SEO score: ${score}`);
  }

  if (id === "accessibility-lab") {
    await page.locator("[data-a11y-toggle='contrast']").check();
    const score = Number(await page.locator("[data-a11y-score]").innerText());
    if (score >= 100) throw new Error("Accessibility score did not react to an enabled issue");
  }

  if (id === "procedural-world") {
    await page.locator("[data-world-generate]").click();
    const land = await page.locator("[data-land-stat]").innerText();
    if (!land.endsWith("%")) throw new Error(`World statistics did not render: ${land}`);
  }

  if (["cloud-ops-crisis", "golf-challenge", "code-dungeon", "data-center-defense", "digital-evolution", "pcs-logistics"].includes(id)) {
    await page.locator("[data-game-start]").click();
    await page.waitForTimeout(180);
    const overlayHidden = await page.locator("[data-game-overlay]").isHidden();
    if (!overlayHidden) throw new Error("Game start did not dismiss the overlay");
  }

  if (pageErrors.length) {
    throw new Error(pageErrors.join(" | "));
  }

  console.log(`PASS ${id}`);
}

for (const id of demoIds) {
  try {
    await assertDemo(id);
  } catch (error) {
    failures.push(`${id}: ${error.message}`);
    console.error(`FAIL ${id}: ${error.message}`);
  }
}

const mobilePage = await context.newPage();
await mobilePage.setViewportSize({ width: 390, height: 844 });
for (const id of ["digital-command-center", "matera-digital", "architecture-builder", "cloud-ops-crisis"]) {
  const response = await mobilePage.goto(`${baseUrl}/?demo=${id}`, { waitUntil: "networkidle", timeout: 30_000 });
  if (!response?.ok()) failures.push(`${id} mobile: HTTP ${response?.status()}`);
  await mobilePage.waitForFunction(() => document.querySelector("#loading-screen")?.classList.contains("done"), null, { timeout: 20_000 });
  if (await mobilePage.locator("#error-screen").isVisible()) failures.push(`${id} mobile: error screen visible`);
  const horizontalOverflow = await mobilePage.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
  if (horizontalOverflow) failures.push(`${id} mobile: document has horizontal overflow`);
  console.log(`MOBILE ${id}`);
}

await browser.close();

if (failures.length) {
  throw new Error(`Browser smoke failures:\n${failures.join("\n")}`);
}

console.log(`Validated ${demoIds.length} desktop demos and 4 representative mobile layouts.`);
