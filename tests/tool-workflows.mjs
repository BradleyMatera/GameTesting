import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const server = spawn('python3', ['-m', 'http.server', '8080'], { stdio: 'ignore' });
await new Promise(resolve => setTimeout(resolve, 1400));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const failures = [];
page.on('pageerror', error => failures.push(error.message));
page.on('console', message => { if (message.type() === 'error') failures.push(message.text()); });

async function open(id) {
  failures.length = 0;
  await page.goto(`http://127.0.0.1:8080/#${id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  if (await page.locator('.stage-error').count()) throw new Error(`${id}: ${await page.locator('.stage-error').innerText()}`);
}

await open('architecture-builder');
await page.locator('[data-add-service="api"]').click();
await page.locator('[data-add-service="lambda"]').click();
await page.locator('.architecture-node').first().click();
await page.locator('[data-connect-target]').selectOption({ label: 'Lambda' });
await page.locator('[data-action="connect-selected"]').click();
if (await page.locator('[data-links] path').count() !== 1) throw new Error('Architecture: connection was not created.');
await page.locator('[data-action="simulate"]').click();
await page.waitForFunction(() => document.querySelector('[data-status]')?.textContent.includes('Simulation complete'), null, { timeout: 8000 });
await page.locator('[data-action="undo"]').click();
if (await page.locator('[data-links] path').count() !== 0) throw new Error('Architecture: undo did not remove the connection.');
await page.locator('[data-action="redo"]').click();
if (await page.locator('[data-links] path').count() !== 1) throw new Error('Architecture: redo did not restore the connection.');
console.log('PASS architecture-builder');

await open('workflow-designer');
await page.locator('[data-add-node="trigger"]').click();
await page.locator('[data-add-node="agent"]').click();
await page.locator('[data-add-node="approval"]').click();
await page.locator('[data-add-node="output"]').click();
await page.locator('[data-action="run"]').click();
await page.locator('[data-approval="approve"]').waitFor({ state: 'visible', timeout: 8000 });
await page.locator('[data-approval="approve"]').click();
await page.waitForFunction(() => document.querySelector('[data-status]')?.textContent.includes('Run finished'), null, { timeout: 12000 });
if (!(await page.locator('[data-log]').innerText()).includes('Verified output published')) throw new Error('Workflow: output was not reached.');
console.log('PASS workflow-designer');

await open('seo-auditor');
await page.locator('[data-action="sample"]').click();
await page.waitForFunction(() => Number(document.querySelector('[data-overall]')?.textContent) > 0);
const seoScore = Number(await page.locator('[data-overall]').innerText());
if (seoScore < 70) throw new Error(`SEO: sample score unexpectedly low (${seoScore}).`);
if (await page.locator('.seo-finding-card').count() < 15) throw new Error('SEO: full findings were not generated.');
await page.locator('[data-filter]').selectOption('fail');
if (await page.locator('.seo-finding-card[data-state="pass"]').count()) throw new Error('SEO: failure filter still shows passes.');
console.log('PASS seo-auditor');

await open('accessibility-lab');
await page.locator('[data-scenario]').selectOption('form');
await page.locator('[data-action="audit"]').click();
const failingScore = Number(await page.locator('[data-score]').innerText());
if (!(failingScore < 100)) throw new Error('Accessibility: injected failures did not lower the score.');
await page.locator('[data-action="fix"]').click();
if (Number(await page.locator('[data-score]').innerText()) !== 100) throw new Error('Accessibility: Fix all did not restore score 100.');
await page.locator('[data-action="keyboard"]').click();
await page.waitForFunction(() => document.querySelector('[data-focus-path]')?.textContent.startsWith('Completed'), null, { timeout: 10000 });
console.log('PASS accessibility-lab');

await open('api-failure-lab');
await page.locator('[data-field="scenario"]').selectOption('healthy');
await page.locator('[data-action="send"]').click();
await page.waitForFunction(() => document.querySelector('[data-status]')?.textContent === 'COMPLETE', null, { timeout: 8000 });
if (!(await page.locator('[data-response]').innerText()).includes('"ok": true')) throw new Error('API: healthy request did not produce a valid response.');
await page.locator('[data-field="scenario"]').selectOption('outage');
await page.locator('[data-field="fallback"]').uncheck();
await page.locator('[data-field="maxRetries"]').fill('0');
await page.locator('[data-action="send"]').click();
await page.waitForFunction(() => ['FAILED','COMPLETE'].includes(document.querySelector('[data-status]')?.textContent), null, { timeout: 8000 });
if (await page.locator('[data-result]').innerText() !== 'FAILED') throw new Error('API: outage without fallback did not fail.');
console.log('PASS api-failure-lab');

await open('shader-lab');
await page.locator('[data-code]').fill('metallic = 4.00;');
await page.locator('[data-action="compile"]').click();
if (!(await page.locator('[data-log]').innerText()).includes('Compile failed')) throw new Error('Shader: invalid source was accepted.');
await page.locator('[data-code]').fill('baseColor = #22d3ee;\nmetallic = 0.35;\nroughness = 0.08;\nemissive = 0.82;\nalpha = 0.72;\nwireframe = false;\nrotationSpeed = 0.22;');
await page.locator('[data-action="compile"]').click();
if (!(await page.locator('[data-log]').innerText()).includes('Compiled successfully')) throw new Error('Shader: valid source did not compile.');
await page.locator('[data-field="model"]').selectOption('torus');
if (!(await page.locator('[data-scene-stats]').innerText()).includes('torus')) throw new Error('Shader: model change was not applied.');
console.log('PASS shader-lab');

await open('world-generator');
await page.locator('[data-field="seed"]').fill('123456');
await page.locator('[data-action="generate"]').click();
const firstWorld = await page.locator('[data-world-summary]').innerText();
const firstName = await page.locator('[data-world-name]').innerText();
await page.locator('[data-action="generate"]').click();
if (await page.locator('[data-world-summary]').innerText() !== firstWorld || await page.locator('[data-world-name]').innerText() !== firstName) throw new Error('World: same seed and parameters were not reproducible.');
await page.locator('[data-field="terrain"]').selectOption('badlands');
await page.locator('[data-action="generate"]').click();
if (!(await page.locator('[data-world-config]').innerText()).includes('Badlands')) throw new Error('World: terrain selection was not applied.');
console.log('PASS world-generator');

if (failures.length) throw new Error(`Browser errors: ${failures.join(' | ')}`);
await browser.close();
server.kill('SIGTERM');
console.log('Validated complete workflows for all seven engineering tools.');
