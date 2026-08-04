import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';

const server = spawn('python3', ['-m', 'http.server', '8080'], { stdio: 'ignore' });
await new Promise(resolve => setTimeout(resolve, 1500));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

const registryText = await fs.readFile('js/registry.js', 'utf8');
const ids = [...registryText.matchAll(/d\('([^']+)'/g)].map(match => match[1]);
if (ids.length !== 25) throw new Error(`Expected 25 demos, found ${ids.length}`);
await fs.mkdir('test-screenshots', { recursive: true });

for (const [index, id] of ids.entries()) {
  errors.length = 0;
  await page.goto(`http://127.0.0.1:8080/#${id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const failure = await page.locator('.stage-error').count();
  if (failure) throw new Error(`${id}: stage error: ${await page.locator('.stage-error').innerText()}`);
  const title = await page.locator('#demo-title').innerText();
  if (!title.trim()) throw new Error(`${id}: missing title`);
  const surface = page.locator('#stage > *').first();
  if (!(await surface.count())) throw new Error(`${id}: empty stage`);
  if (id.startsWith('cloud-ops') || ['golf-challenge','code-dungeon','data-center-defense','digital-evolution','pcs-logistics'].includes(id)) {
    const start = page.locator('[data-start]').first();
    if (await start.count()) { await start.click(); await page.waitForTimeout(500); }
    if (!(await page.locator('#stage canvas').count())) throw new Error(`${id}: missing Babylon canvas`);
  }
  if (errors.length) throw new Error(`${id}: ${errors.join(' | ')}`);
  if ([0,7,12,19,20,21,22,23,24].includes(index)) {
    await page.screenshot({ path: `test-screenshots/${String(index+1).padStart(2,'0')}-${id}.png`, fullPage: false });
  }
  console.log(`PASS ${id}`);
}

await page.setViewportSize({ width: 390, height: 844 });
for (const id of ['digital-command-center','matera-digital','architecture-builder','cloud-ops-crisis','pcs-logistics']) {
  await page.goto(`http://127.0.0.1:8080/#${id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  if (width > 392) throw new Error(`${id}: mobile horizontal overflow ${width}`);
}

await browser.close();
server.kill('SIGTERM');
console.log('Validated 25 demos and representative mobile layouts.');
