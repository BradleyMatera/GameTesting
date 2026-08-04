import { chromium } from 'playwright';
import { spawn } from 'node:child_process';

const server = spawn('python3', ['-m', 'http.server', '8080'], { stdio: 'ignore' });
await new Promise(resolve => setTimeout(resolve, 1400));
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
let errors = [];
page.on('pageerror', error => errors.push(error.stack || error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(`console.error: ${message.text()}`); });

async function assertClean(label) {
  await page.waitForTimeout(220);
  if (errors.length) {
    const details = errors.join('\n---\n');
    errors = [];
    throw new Error(`${label}: browser errors:\n${details}`);
  }
}

async function open(id) {
  if (errors.length) await assertClean(`before ${id}`);
  await page.goto(`http://127.0.0.1:8080/#${id}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(650);
  if (await page.locator('.stage-error').count()) throw new Error(`${id}: ${await page.locator('.stage-error').innerText()}`);
  await assertClean(`${id} startup`);
}

await open('agent-operations');
if (Number(await page.locator('[data-queue]').innerText()) !== 8) throw new Error('Agent Operations: expected eight initial queued tasks.');
await page.locator('[data-action="step"]').click();
if (Number(await page.locator('[data-active]').innerText()) < 1) throw new Error('Agent Operations: one cycle did not assign work.');
await page.locator('[data-action="block"]').click();
if (Number(await page.locator('[data-blocked]').innerText()) !== 1) throw new Error('Agent Operations: blocker did not stop a selected task.');
await page.locator('[data-action="resolve"]').click();
if (Number(await page.locator('[data-blocked]').innerText()) !== 0) throw new Error('Agent Operations: blocker did not resolve.');
await page.locator('[data-action="step"]').evaluate((button) => {
  for (let index = 0; index < 34; index += 1) button.click();
});
await page.waitForTimeout(250);
if (Number(await page.locator('[data-done]').innerText()) < 1) throw new Error('Agent Operations: tasks never reached delivery.');
const beforeAdd = Number(await page.locator('[data-queue]').innerText());
await page.locator('[data-new-task]').fill('Verify simulation release evidence');
await page.locator('[data-action="add-task"]').click();
if (Number(await page.locator('[data-queue]').innerText()) !== beforeAdd + 1) throw new Error('Agent Operations: adding a task did not update the queue.');
await assertClean('agent-operations workflow');
console.log('PASS agent-operations');

await open('llm-router');
await page.locator('[data-policy]').selectOption('fastest');
await page.locator('[data-provider-failure="groq"]').selectOption('rate-limit');
await page.locator('[data-action="send"]').click();
await page.waitForFunction(() => ['SUCCESS', 'FAILED'].includes(document.querySelector('[data-result-state]')?.textContent), null, { timeout: 8000 });
if (await page.locator('[data-result-state]').innerText() !== 'SUCCESS') throw new Error('LLM Router: failover request did not succeed.');
if (!(await page.locator('[data-answer]').innerText()).includes('Cloudflare')) throw new Error('LLM Router: request did not fail over from Groq to Cloudflare.');
if (Number(await page.locator('[data-attempt-count]').innerText()) !== 2) throw new Error('LLM Router: expected two attempts after one provider failure.');
await page.locator('[data-action="send"]').click();
await page.waitForFunction(() => document.querySelector('[data-result-state]')?.textContent === 'SUCCESS', null, { timeout: 8000 });
if ((await page.locator('[data-provider-card="groq"] .sim-pill').innerText()) !== 'OPEN') throw new Error('LLM Router: repeated failures did not open the circuit.');
await page.locator('[data-action="reset-circuits"]').click();
if ((await page.locator('[data-provider-card="groq"] .sim-pill').innerText()) !== 'CLOSED') throw new Error('LLM Router: circuit reset failed.');
await assertClean('llm-router workflow');
console.log('PASS llm-router');

await open('cloud-incident');
await page.locator('[data-diagnostic="metrics"]').click();
await page.waitForFunction(() => document.querySelector('[data-diagnostic="metrics"]')?.classList.contains('done'), null, { timeout: 3000 });
await page.locator('[data-diagnostic="logs"]').click();
await page.waitForFunction(() => document.querySelector('[data-diagnostic="logs"]')?.classList.contains('done'), null, { timeout: 3000 });
if (await page.locator('[data-action="repair"]').isDisabled()) throw new Error('Cloud Incident: repair remained disabled after two evidence sources.');
await page.locator('[data-repair]').selectOption('restart-api');
await page.locator('[data-action="repair"]').click();
await page.waitForFunction(() => document.querySelector('[data-output]')?.textContent.includes('did not address'), null, { timeout: 4000 });
await page.locator('[data-repair]').selectOption('pool-index');
await page.locator('[data-action="repair"]').click();
await page.waitForFunction(() => document.querySelector('[data-severity]')?.textContent.includes('RESOLVED'), null, { timeout: 4000 });
if (!(await page.locator('[data-output]').innerText()).includes('Repair verified')) throw new Error('Cloud Incident: correct repair did not verify recovery.');
await assertClean('cloud-incident workflow');
console.log('PASS cloud-incident');

await open('voice-ops');
await page.locator('[data-action="answer"]').click();
if (await page.locator('[data-state-label]').innerText() !== 'ACTIVE CALL') throw new Error('Voice Ops: selected waiting call was not answered.');
await page.locator('[data-action="hold"]').click();
if (await page.locator('[data-state-label]').innerText() !== 'CALL ON HOLD') throw new Error('Voice Ops: active call did not enter hold.');
await page.locator('[data-action="resume"]').click();
if (await page.locator('[data-state-label]').innerText() !== 'ACTIVE CALL') throw new Error('Voice Ops: held call did not resume.');
await page.locator('[data-appointment]').selectOption({ label: 'Thursday at 10:00 AM' });
await page.locator('[data-action="schedule"]').click();
if (!(await page.locator('[data-call-status]').innerText()).includes('Thursday at 10:00 AM')) throw new Error('Voice Ops: appointment did not persist on the call.');
await page.locator('[data-action="resolve"]').click();
if (await page.locator('[data-state-label]').innerText() !== 'RESOLVED CALL') throw new Error('Voice Ops: call did not resolve.');
const callCount = await page.locator('[data-call]').count();
await page.locator('[data-action="add-call"]').click();
if (await page.locator('[data-call]').count() !== callCount + 1) throw new Error('Voice Ops: incoming call was not added to the queue.');
await assertClean('voice-ops workflow');
console.log('PASS voice-ops');

await open('projecthub-rag');
await page.locator('[data-query]').fill('Where is Brad located and what hours is he available?');
await page.locator('[data-action="run"]').click();
await page.waitForFunction(() => document.querySelector('[data-judge]')?.textContent.includes('PASS'), null, { timeout: 8000 });
if (await page.locator('[data-class]').innerText() !== 'availability') throw new Error('ProjectHub RAG: availability question was misclassified.');
const answerText = await page.locator('[data-answer]').innerText();
if (!answerText.includes('Davis, Illinois') || !answerText.includes('7:30 AM')) throw new Error('ProjectHub RAG: answer did not use availability evidence.');
await page.locator('[data-unsupported]').check();
await page.locator('[data-action="rebuild"]').click();
if (!(await page.locator('[data-judge]').innerText()).includes('FAIL')) throw new Error('ProjectHub RAG: judge accepted an unsupported claim.');
await page.locator('[data-unsupported]').uncheck();
await page.locator('[data-action="rebuild"]').click();
if (!(await page.locator('[data-judge]').innerText()).includes('PASS')) throw new Error('ProjectHub RAG: judge did not pass the corrected answer.');
await assertClean('projecthub-rag workflow');
console.log('PASS projecthub-rag');

await open('release-pipeline');
await page.locator('[data-failure]').selectOption('tests');
await page.locator('[data-action="run"]').click();
await page.waitForFunction(() => document.querySelector('[data-status]')?.textContent === 'BLOCKED', null, { timeout: 8000 });
if (await page.locator('[data-current-phase]').innerText() !== 'TESTS') throw new Error('Release Pipeline: forced test failure stopped at the wrong phase.');
await page.locator('[data-action="fix"]').click();
await page.locator('[data-action="run"]').click();
await page.waitForFunction(() => document.querySelector('[data-status]')?.textContent === 'DEPLOYED', null, { timeout: 12000 });
if (await page.locator('[data-release-state]').innerText() !== 'v2.5.0') throw new Error('Release Pipeline: resumed pipeline did not deploy target version.');
await page.locator('[data-action="rollback"]').click();
if (await page.locator('[data-release-state]').innerText() !== 'v2.4.0') throw new Error('Release Pipeline: rollback did not restore previous production version.');
await assertClean('release-pipeline workflow');
console.log('PASS release-pipeline');

await browser.close();
server.kill('SIGTERM');
console.log('Validated complete operational workflows for all six simulations.');
