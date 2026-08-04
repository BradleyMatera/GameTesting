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

function escapeHtml(value = '') {
  return String(value).replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  }[character]));
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
