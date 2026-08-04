import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const server = spawn('python3', ['-m', 'http.server', '8080'], { stdio: 'ignore' });
await new Promise(resolve => setTimeout(resolve, 1400));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const ids = ['agent-operations', 'llm-router', 'cloud-incident', 'voice-ops', 'projecthub-rag', 'release-pipeline'];
const errors = [];
page.on('pageerror', error => errors.push(error.stack || error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await fs.mkdir('simulation-screenshots', { recursive: true });

for (const id of ids) {
  errors.length = 0;
  await page.goto(`http://127.0.0.1:8080/#${id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1100);
  if (await page.locator('.stage-error').count()) throw new Error(`${id}: ${await page.locator('.stage-error').innerText()}`);
  const root = page.locator('.sim-product');
  if (!(await root.count())) throw new Error(`${id}: missing simulation root`);
  const guide = page.locator('.sim-mission-guide');
  if (!(await guide.count())) throw new Error(`${id}: missing mission guide`);
  if (await guide.locator('[data-guide-target]').count() !== 3) throw new Error(`${id}: mission guide must contain three steps`);
  const visual = await root.evaluate(element => {
    const before = getComputedStyle(element, '::before');
    const canvas = element.querySelector('canvas');
    const guideElement = element.querySelector('.sim-mission-guide');
    return {
      backgroundImage: before.backgroundImage,
      rootWidth: element.clientWidth,
      rootHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      guideZ: Number(getComputedStyle(guideElement).zIndex || 0),
      canvasZ: canvas ? Number(getComputedStyle(canvas).zIndex || 0) : -1,
      guidePointer: getComputedStyle(guideElement).pointerEvents,
    };
  });
  if (!visual.backgroundImage.includes('simulation-scenes.svg')) throw new Error(`${id}: cinematic artwork is not loaded`);
  if (visual.scrollWidth > visual.rootWidth + 3) throw new Error(`${id}: visual shell has horizontal overflow ${visual.scrollWidth}/${visual.rootWidth}`);
  if (visual.guideZ <= visual.canvasZ) throw new Error(`${id}: mission guide is behind the scene canvas`);
  if (visual.guidePointer === 'none') throw new Error(`${id}: mission guide cannot receive input`);

  const toggle = guide.locator('.sim-mission-guide__toggle');
  if (await guide.getAttribute('data-open') !== 'true') await toggle.click();
  const firstStep = guide.locator('[data-guide-target]').first();
  const targetSelector = await firstStep.getAttribute('data-guide-target');
  await firstStep.click();
  await page.waitForTimeout(80);
  const focused = page.locator(targetSelector);
  if (!(await focused.count())) throw new Error(`${id}: guide target ${targetSelector} does not exist`);
  if (!(await focused.first().evaluate(element => element.classList.contains('sim-focus-flash')))) throw new Error(`${id}: guide step did not highlight its target`);

  await page.screenshot({ path: `simulation-screenshots/${id}.png`, fullPage: false });
  if (errors.length) throw new Error(`${id}: browser errors: ${errors.join(' | ')}`);
  console.log(`PASS ${id} cinematic shell`);
}

await page.setViewportSize({ width: 390, height: 844 });
for (const id of ids) {
  await page.goto(`http://127.0.0.1:8080/#${id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  if (width > 392) throw new Error(`${id}: mobile cinematic shell overflows horizontally (${width}px)`);
  const toggle = page.locator('.sim-mission-guide__toggle');
  if (!(await toggle.count()) || !(await toggle.isVisible())) throw new Error(`${id}: mobile mission guide is not visible`);
}

await browser.close();
server.kill('SIGTERM');
console.log('Validated cinematic artwork, mission navigation, stacking, screenshots, and mobile layout for all six simulations.');
