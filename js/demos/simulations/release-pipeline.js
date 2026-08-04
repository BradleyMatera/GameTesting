import { createRunGuard, domController, escapeHtml, qs, qsa } from './simulation-utils.js';

const phases = [
  { id: 'source', name: 'Source', detail: 'Commit and branch', icon: '⑂' },
  { id: 'build', name: 'Build', detail: 'Production bundle', icon: 'B' },
  { id: 'tests', name: 'Tests', detail: 'Unit and browser suites', icon: '✓', gate: 'tests' },
  { id: 'security', name: 'Security', detail: 'Dependency and secret scan', icon: '◆', gate: 'security' },
  { id: 'review', name: 'Review', detail: 'Human approval', icon: '◎', gate: 'review' },
  { id: 'staging', name: 'Staging', detail: 'Preview deployment', icon: 'S' },
  { id: 'acceptance', name: 'Acceptance', detail: 'Production evidence', icon: 'A', gate: 'acceptance' },
  { id: 'production', name: 'Production', detail: 'GitHub Pages', icon: 'P' },
];
const failureLabels = {
  none: 'No forced failure', tests: 'Unit test regression', security: 'Leaked test credential',
  staging: 'Staging health check failure', acceptance: 'Acceptance evidence missing',
};

export function createReleasePipeline({ stage, toast }) {
  stage.innerHTML = `<section class="release-product sim-product" style="--sim-accent:#34d399;--sim-bg:#07131d;--sim-text:#e9f7f0;--sim-muted:#8fa9a0;--sim-control:#0d1b29;--sim-line:#294355">
    <header><div><span>DELIVERY CONTROL</span><strong>Git Release Pipeline</strong></div><div class="pipeline-controls"><label>Target version<input data-version value="v2.5.0"></label><label>Forced condition<select data-failure>${Object.entries(failureLabels).map(([id, label]) => `<option value="${id}">${label}</option>`).join('')}</select></label><button data-action="run" class="primary">Run pipeline</button><button data-action="cancel">Cancel</button><button data-action="fix" disabled>Fix failure</button><button data-action="rollback" disabled>Rollback</button></div></header>
    <div class="git-graph"><svg viewBox="0 0 1000 250" preserveAspectRatio="none"><path d="M40 125 C170 125 170 45 300 45 S440 125 560 125 S720 205 840 205 S910 125 970 125"/><path class="main-line" d="M40 125 H970"/></svg>${phases.map((phase, index) => `<article data-phase="${index}" style="--x:${4 + index * 13.1}%"><i>${phase.icon}</i><strong>${phase.name}</strong><small>${phase.detail}</small><b>WAITING</b></article>`).join('')}</div>
    <div class="pipeline-bottom"><section><h3>PIPELINE LOG</h3><pre data-pipeline-log>$ Ready to validate and release the current source.</pre><div class="release-artifacts" data-artifacts></div></section><aside><h3>RELEASE GATES</h3><div class="release-gates"><label><input type="checkbox" data-gate="tests" checked> Tests must pass</label><label><input type="checkbox" data-gate="security" checked> Security scan must pass</label><label><input type="checkbox" data-gate="review" checked> Reviewer approval required</label><label><input type="checkbox" data-gate="acceptance" checked> Acceptance proof required</label></div><div class="release-state"><span>PRODUCTION</span><strong data-release-state>v2.4.0</strong><small data-release-health>Healthy · no active rollout</small></div><div class="sim-kpis" style="margin-top:.55rem"><div class="sim-kpi"><span>PHASE</span><strong data-current-phase>READY</strong></div><div class="sim-kpi"><span>DURATION</span><strong data-duration>0.0s</strong></div><div class="sim-kpi"><span>COMMIT</span><strong data-commit>--</strong></div><div class="sim-kpi"><span>STATUS</span><strong data-status>READY</strong></div></div></aside></div>
  </section>`;

  const guard = createRunGuard();
  let running = false;
  let failedIndex = null;
  let completedThrough = -1;
  let deployedVersion = 'v2.4.0';
  let previousVersion = null;
  let elapsedMilliseconds = 0;
  let artifacts = {};
  let releaseNumber = 0;

  const logElement = () => qs(stage, '[data-pipeline-log]');
  function log(message, symbol = '>') {
    logElement().textContent += `\n${symbol} ${message}`;
    logElement().scrollTop = logElement().scrollHeight;
  }
  function phaseElements() { return qsa(stage, '[data-phase]'); }
  function setPhaseState(index, state, label = state.toUpperCase()) {
    const element = phaseElements()[index];
    element.className = state;
    qs(element, 'b').textContent = label;
  }
  function gatePasses(phase) {
    return !phase.gate || qs(stage, `[data-gate="${phase.gate}"]`).checked;
  }
  function forcedFailure(phase) {
    const forced = qs(stage, '[data-failure]').value;
    return forced !== 'none' && forced === phase.id;
  }
  function renderArtifacts() {
    const entries = Object.entries(artifacts);
    qs(stage, '[data-artifacts]').innerHTML = entries.length ? entries.map(([label, value]) => `<div><span>${escapeHtml(label.toUpperCase())}</span><strong>${escapeHtml(String(value))}</strong></div>`).join('') : '<div><span>ARTIFACTS</span><strong>None generated</strong></div>';
  }
  function render() {
    qs(stage, '[data-release-state]').textContent = deployedVersion;
    qs(stage, '[data-duration]').textContent = `${(elapsedMilliseconds / 1000).toFixed(1)}s`;
    qs(stage, '[data-current-phase]').textContent = running ? phases[Math.max(0, completedThrough + 1)]?.name.toUpperCase() || 'PRODUCTION' : failedIndex !== null ? phases[failedIndex].name.toUpperCase() : completedThrough === phases.length - 1 ? 'COMPLETE' : 'READY';
    qs(stage, '[data-status]').textContent = running ? 'RUNNING' : failedIndex !== null ? 'BLOCKED' : completedThrough === phases.length - 1 ? 'DEPLOYED' : 'READY';
    qs(stage, '[data-action="run"]').disabled = running;
    qs(stage, '[data-action="cancel"]').disabled = !running;
    qs(stage, '[data-action="fix"]').disabled = running || failedIndex === null;
    qs(stage, '[data-action="rollback"]').disabled = running || !previousVersion;
    qs(stage, '[data-action="run"]').textContent = failedIndex !== null ? 'Resume pipeline' : completedThrough === phases.length - 1 ? 'Run new release' : 'Run pipeline';
    renderArtifacts();
  }
  function failureReason(phase) {
    if (!gatePasses(phase)) return `${phase.name} gate is disabled or incomplete.`;
    if (phase.id === 'tests') return 'Browser workflow regression: selected service could not be connected.';
    if (phase.id === 'security') return 'Secret scanner found a test credential in a generated fixture.';
    if (phase.id === 'staging') return 'Staging health check returned 502 from the release candidate.';
    if (phase.id === 'acceptance') return 'Acceptance proof is missing for the production workflow.';
    return `${phase.name} failed verification.`;
  }
  function produceArtifact(phase) {
    if (phase.id === 'source') artifacts.commit = `r${String(releaseNumber).padStart(3, '0')}-${Math.abs((releaseNumber * 7919 + 4393) % 0xffffff).toString(16).padStart(6, '0')}`;
    if (phase.id === 'build') { artifacts.bundle = '418 KB'; artifacts.integrity = 'sha256 verified'; }
    if (phase.id === 'tests') artifacts.tests = '32 workflow checks passed';
    if (phase.id === 'security') artifacts.security = '0 blocking findings';
    if (phase.id === 'review') artifacts.review = '1 approval';
    if (phase.id === 'staging') artifacts.preview = 'staging/GameTesting';
    if (phase.id === 'acceptance') artifacts.acceptance = '25 demos + 13 workflows';
    if (phase.id === 'production') artifacts.production = qs(stage, '[data-version]').value.trim();
    qs(stage, '[data-commit]').textContent = artifacts.commit || '--';
  }
  async function runPipeline() {
    if (running) return;
    const targetVersion = qs(stage, '[data-version]').value.trim();
    if (!/^v?\d+\.\d+\.\d+$/.test(targetVersion)) return toast('Use a semantic version such as v2.5.0.');
    if (completedThrough === phases.length - 1 && failedIndex === null) {
      completedThrough = -1;
      artifacts = {};
      phaseElements().forEach(element => { element.className = ''; qs(element, 'b').textContent = 'WAITING'; });
      logElement().textContent = '$ Starting a new release candidate.';
    }
    releaseNumber += 1;
    running = true;
    const token = guard.begin();
    let startIndex = failedIndex !== null ? failedIndex : completedThrough + 1;
    failedIndex = null;
    render();
    const started = performance.now();
    for (let index = startIndex; index < phases.length; index += 1) {
      if (!guard.active(token)) break;
      const phase = phases[index];
      setPhaseState(index, 'active', 'RUNNING');
      log(`${phase.name}: started`);
      const phaseDuration = 420 + index * 55;
      if (!(await guard.wait(token, phaseDuration))) break;
      elapsedMilliseconds += phaseDuration;
      const failed = !gatePasses(phase) || forcedFailure(phase);
      if (failed) {
        setPhaseState(index, 'failed', phase.gate && !gatePasses(phase) ? 'BLOCKED' : 'FAILED');
        failedIndex = index;
        log(`${phase.name}: ${failureReason(phase)}`, '✗');
        qs(stage, '[data-release-health]').textContent = `Release blocked at ${phase.name}`;
        running = false;
        render();
        toast(`Pipeline stopped at ${phase.name}`);
        return;
      }
      produceArtifact(phase);
      setPhaseState(index, 'passed', 'PASSED');
      completedThrough = index;
      log(`${phase.name}: passed`, '✓');
      render();
    }
    if (!guard.active(token)) {
      running = false;
      log('Pipeline cancelled by user.', '!');
      qs(stage, '[data-release-health]').textContent = 'Release cancelled; production unchanged';
      render();
      return;
    }
    elapsedMilliseconds += performance.now() - started;
    running = false;
    previousVersion = deployedVersion;
    deployedVersion = targetVersion.startsWith('v') ? targetVersion : `v${targetVersion}`;
    qs(stage, '[data-release-health]').textContent = 'Healthy · 100% rollout';
    log(`Production now serves ${deployedVersion}.`, '✓');
    render();
    toast(`Release ${deployedVersion} deployed`);
  }
  function cancel() {
    if (!running) return;
    guard.cancel(); running = false;
    phaseElements().forEach(element => { if (element.classList.contains('active')) { element.className = ''; qs(element, 'b').textContent = 'WAITING'; } });
    render();
  }
  function fixFailure() {
    if (failedIndex === null) return;
    const phase = phases[failedIndex];
    if (phase.gate) qs(stage, `[data-gate="${phase.gate}"]`).checked = true;
    if (qs(stage, '[data-failure]').value === phase.id) qs(stage, '[data-failure]').value = 'none';
    setPhaseState(failedIndex, '', 'READY');
    log(`${phase.name}: corrective action applied. Pipeline can resume.`, '✓');
    qs(stage, '[data-release-health]').textContent = `Fix ready for ${phase.name}`;
    render();
    toast(`${phase.name} failure fixed`);
  }
  function rollback() {
    if (!previousVersion || running) return;
    const rolledBackFrom = deployedVersion;
    deployedVersion = previousVersion;
    previousVersion = null;
    artifacts.rollback = `${rolledBackFrom} → ${deployedVersion}`;
    qs(stage, '[data-release-health]').textContent = 'Rollback complete · healthy';
    log(`Rolled production back from ${rolledBackFrom} to ${deployedVersion}.`, '↶');
    render();
    toast(`Rolled back to ${deployedVersion}`);
  }
  function reset() {
    cancel();
    failedIndex = null; completedThrough = -1; deployedVersion = 'v2.4.0'; previousVersion = null;
    elapsedMilliseconds = 0; artifacts = {}; releaseNumber = 0;
    phaseElements().forEach(element => { element.className = ''; qs(element, 'b').textContent = 'WAITING'; });
    qsa(stage, '[data-gate]').forEach(input => { input.checked = true; });
    qs(stage, '[data-failure]').value = 'none';
    qs(stage, '[data-version]').value = 'v2.5.0';
    logElement().textContent = '$ Ready to validate and release the current source.';
    qs(stage, '[data-release-health]').textContent = 'Healthy · no active rollout';
    qs(stage, '[data-commit]').textContent = '--';
    render();
  }

  stage.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'run') runPipeline();
    else if (action === 'cancel') cancel();
    else if (action === 'fix') fixFailure();
    else if (action === 'rollback') rollback();
  });
  render();
  return domController(stage, reset, () => guard.cancel(), 'RESUMABLE RELEASE STATE SIMULATION', () => `${completedThrough + 1}/${phases.length} phases · ${failedIndex !== null ? 'blocked' : deployedVersion}`);
}
