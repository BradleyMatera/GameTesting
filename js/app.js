import { demos, categories, byId } from './registry.js';

const $ = selector => document.querySelector(selector);
let stage = $('#stage');
const list = $('#demo-list');
const categoryTabs = $('#category-tabs');
const search = $('#search');
let active = null;
let controller = null;
let activeCategory = 'All';
let telemetryTimer = null;
let loadSequence = 0;

const simulationGuides = {
  'agent-operations': {
    title: 'Run the operations floor',
    description: 'Start the shift, watch work move through four departments, then select an agent when you need to inspect or interrupt the system.',
    steps: [
      ['01', 'Control the shift', 'Start, pause, step, or add work.', '.agent-ops-control'],
      ['02', 'Inspect an agent', 'Select a person to see skills, assignment, and blockers.', '.agent-detail'],
      ['03', 'Read the event trail', 'Confirm exactly how tasks moved and completed.', '[data-log]'],
    ],
  },
  'llm-router': {
    title: 'Route one request across providers',
    description: 'Enter a prompt, choose a policy, configure provider health, and watch the request fail over through the ranked network.',
    steps: [
      ['01', 'Create the request', 'Choose prompt, policy, and deterministic seed.', '.router-request'],
      ['02', 'Configure providers', 'Enable providers and inject realistic failure modes.', '[data-providers]'],
      ['03', 'Inspect the route', 'Review attempts, total latency, quota, and final answer.', '.router-trace'],
    ],
  },
  'cloud-incident': {
    title: 'Diagnose before you repair',
    description: 'Collect independent evidence, identify the failing service in the 3D data center, then apply and verify the correct repair.',
    steps: [
      ['01', 'Collect evidence', 'Inspect metrics, logs, traces, and dependencies.', '.runbook'],
      ['02', 'Build the diagnosis', 'Compare evidence and the selected rack.', '[data-evidence]'],
      ['03', 'Repair and verify', 'Choose a repair only after the evidence gate unlocks.', '.incident-repair'],
    ],
  },
  'voice-ops': {
    title: 'Manage the live call floor',
    description: 'Choose the next caller, operate the active call, then save the appointment, notes, transfer, or resolution.',
    steps: [
      ['01', 'Work the queue', 'Answer the highest-priority waiting call.', '.call-queue'],
      ['02', 'Operate the call', 'Answer, hold, resume, transfer, or resolve.', '.call-focus'],
      ['03', 'Finish the outcome', 'Save intelligence, appointment, and operator notes.', '.call-intelligence'],
    ],
  },
  'projecthub-rag': {
    title: 'Trace a grounded answer',
    description: 'Ask a recruiter question, tune retrieval, inspect the evidence and context, then verify the final claims and citations.',
    steps: [
      ['01', 'Ask and configure', 'Set the question, Top K, and evidence threshold.', '.rag-query'],
      ['02', 'Review evidence', 'Include or exclude retrieved sources.', '[data-documents]'],
      ['03', 'Judge the answer', 'Check citations, unsupported claims, and coverage.', '.answer-preview'],
    ],
  },
  'release-pipeline': {
    title: 'Ship or safely stop the release',
    description: 'Set the version and failure condition, run every release gate, repair failures, then deploy or roll back production.',
    steps: [
      ['01', 'Configure the release', 'Choose version, gates, and an optional forced failure.', '.pipeline-controls'],
      ['02', 'Follow every gate', 'Watch the current phase and failure location.', '.git-graph'],
      ['03', 'Verify production', 'Read artifacts, logs, deployment state, and rollback readiness.', '.pipeline-bottom'],
    ],
  },
};

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
}

function mountSimulationGuide(demo, localStage) {
  const config = simulationGuides[demo.id];
  const root = localStage.querySelector('.sim-product');
  if (!config || !root) return;
  const key = `simulation-guide-seen:${demo.id}`;
  const guide = document.createElement('aside');
  guide.className = 'sim-mission-guide';
  guide.dataset.open = sessionStorage.getItem(key) ? 'false' : 'true';
  guide.innerHTML = `<button class="sim-mission-guide__toggle" type="button" aria-expanded="${guide.dataset.open}">Mission guide</button>
    <div class="sim-mission-guide__panel">
      <span>HOW TO USE THIS SIMULATION</span>
      <h3>${escapeHtml(config.title)}</h3>
      <p>${escapeHtml(config.description)}</p>
      <div class="sim-mission-steps">${config.steps.map(([number, title, detail, target]) => `<button type="button" data-guide-target="${escapeHtml(target)}"><i>${number}</i><span><strong>${escapeHtml(title)}</strong><small>${escapeHtml(detail)}</small></span></button>`).join('')}</div>
    </div>`;
  root.append(guide);
  const toggle = guide.querySelector('.sim-mission-guide__toggle');
  toggle.addEventListener('click', () => {
    const open = guide.dataset.open !== 'true';
    guide.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    if (!open) sessionStorage.setItem(key, '1');
  });
  guide.addEventListener('click', event => {
    const button = event.target.closest('[data-guide-target]');
    if (!button) return;
    const target = localStage.querySelector(button.dataset.guideTarget);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    target.classList.remove('sim-focus-flash');
    requestAnimationFrame(() => target.classList.add('sim-focus-flash'));
    setTimeout(() => target.classList.remove('sim-focus-flash'), 1300);
  });
}

function renderCategories() {
  categoryTabs.innerHTML = categories.map(category => `<button type="button" data-category="${category}" class="${category === activeCategory ? 'active' : ''}">${category}</button>`).join('');
  categoryTabs.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    activeCategory = button.dataset.category;
    renderCategories();
    renderList();
  }));
}

function filtered() {
  const query = search.value.trim().toLowerCase();
  return demos.filter(demo => (activeCategory === 'All' || demo.category === activeCategory)
    && (!query || `${demo.title} ${demo.category} ${demo.summary}`.toLowerCase().includes(query)));
}

function renderList() {
  const items = filtered();
  list.innerHTML = items.length ? items.map(demo => {
    const index = demos.indexOf(demo) + 1;
    return `<button type="button" data-demo="${demo.id}" class="${demo.id === active?.id ? 'active' : ''}" style="--demo-accent:${demo.accent}">
      <span class="demo-no">${String(index).padStart(2, '0')}</span>
      <span><strong>${escapeHtml(demo.title)}</strong><small>${escapeHtml(demo.category)}</small></span><em></em>
    </button>`;
  }).join('') : '<p class="empty-list">No matching demos.</p>';
  list.querySelectorAll('[data-demo]').forEach(button => button.addEventListener('click', () => selectDemo(button.dataset.demo)));
  requestAnimationFrame(() => list.querySelector('.active')?.scrollIntoView({ block: 'nearest' }));
  $('#topbar-status').textContent = `${items.length} OF ${demos.length} EXPERIENCES READY`;
}

function replaceStage() {
  const replacement = stage.cloneNode(false);
  replacement.innerHTML = '<div class="stage-loading"><span></span><strong>BUILDING EXPERIENCE</strong></div>';
  stage.replaceWith(replacement);
  stage = replacement;
  return replacement;
}

async function selectDemo(id, options = {}) {
  const demo = byId.get(id) ?? demos[0];
  if (active?.id === demo.id && !options.force) return;
  const sequence = ++loadSequence;
  clearInterval(telemetryTimer);
  telemetryTimer = null;
  const previousController = controller;
  controller = null;
  try { previousController?.dispose?.(); } catch (error) { console.warn('Dispose failed', error); }

  const localStage = replaceStage();
  active = demo;
  if (location.hash.slice(1) !== demo.id) history.replaceState(null, '', `#${demo.id}`);
  document.documentElement.style.setProperty('--active-accent', demo.accent);
  $('#demo-index').textContent = String(demos.indexOf(demo) + 1).padStart(2, '0');
  $('#demo-category').textContent = demo.category.toUpperCase();
  $('#demo-title').textContent = demo.title;
  $('#demo-summary').textContent = demo.summary;
  $('#controls-label').textContent = demo.controls;
  $('#engine-label').textContent = demo.engine;
  $('#fps-label').textContent = '--';
  $('#scene-label').textContent = '--';
  renderList();
  closeLibrary();
  await new Promise(resolve => requestAnimationFrame(resolve));

  try {
    const nextController = await demo.factory({ stage: localStage, demo, toast, selectDemo });
    if (sequence !== loadSequence || localStage !== stage) {
      try { nextController?.dispose?.(); } catch (error) { console.warn('Late demo cleanup failed', error); }
      return;
    }
    controller = nextController;
    mountSimulationGuide(demo, localStage);
    stage.focus({ preventScroll: true });
    updateTelemetry();
    telemetryTimer = setInterval(updateTelemetry, 750);
  } catch (error) {
    if (sequence !== loadSequence || localStage !== stage) return;
    console.error(error);
    stage.innerHTML = `<div class="stage-error"><strong>Experience failed to start</strong><p>${escapeHtml(error.message || String(error))}</p><button type="button" data-retry>Retry</button></div>`;
    stage.querySelector('[data-retry]').addEventListener('click', () => selectDemo(demo.id, { force: true }));
    $('#engine-label').textContent = 'ERROR';
  }
}

function updateTelemetry() {
  if (!controller || !active) return;
  const stats = controller.getStats?.() ?? {};
  $('#engine-label').textContent = stats.engine ?? active.engine;
  $('#fps-label').textContent = stats.fps ?? 'N/A';
  $('#scene-label').textContent = stats.scene ?? stats.elements ?? 'READY';
}

function reset() {
  if (controller?.reset) controller.reset();
  else if (active) selectDemo(active.id, { force: true });
  toast('Demo reset');
}

function move(delta) {
  const index = demos.indexOf(active);
  const next = demos[(index + delta + demos.length) % demos.length];
  selectDemo(next.id);
}

function toast(message) {
  const element = document.createElement('div');
  element.className = 'toast';
  element.textContent = message;
  $('#toast-region').append(element);
  setTimeout(() => element.remove(), 2200);
}

const library = $('#library');
const scrim = $('#mobile-scrim');
function openLibrary() {
  library.classList.add('open');
  scrim.hidden = false;
  $('#menu-button').setAttribute('aria-expanded', 'true');
}
function closeLibrary() {
  library.classList.remove('open');
  scrim.hidden = true;
  $('#menu-button').setAttribute('aria-expanded', 'false');
}

$('#menu-button').addEventListener('click', () => library.classList.contains('open') ? closeLibrary() : openLibrary());
scrim.addEventListener('click', closeLibrary);
search.addEventListener('input', renderList);
$('#reset-demo').addEventListener('click', reset);
$('#previous-demo').addEventListener('click', () => move(-1));
$('#next-demo').addEventListener('click', () => move(1));
$('#fullscreen-demo').addEventListener('click', async () => {
  if (!document.fullscreenElement) await stage.requestFullscreen?.();
  else await document.exitFullscreen?.();
});
window.addEventListener('hashchange', () => selectDemo(location.hash.slice(1)));
window.addEventListener('keydown', event => {
  if (event.target.matches('input,textarea,select')) return;
  if (event.key === '[') move(-1);
  if (event.key === ']') move(1);
  if (event.key === 'Escape') closeLibrary();
});
window.addEventListener('beforeunload', () => {
  clearInterval(telemetryTimer);
  controller?.dispose?.();
});

renderCategories();
renderList();
selectDemo(location.hash.slice(1) || demos[0].id);
