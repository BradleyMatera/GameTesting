import {
  clamp, controllerForDom, copyText, createHistory, createStorage,
  deepClone, downloadText, escapeHtml, qs, qsa, safeJsonParse, uid, wait
} from './tool-utils.js';

const services = {
  cdn: { name: 'CloudFront CDN', icon: '◎', color: '#0ea5e9', baseCost: 4, latency: 8, availability: 99.95, role: 'edge' },
  api: { name: 'API Gateway', icon: '⇄', color: '#8b5cf6', baseCost: 8, latency: 18, availability: 99.95, role: 'compute' },
  lambda: { name: 'Lambda', icon: 'λ', color: '#f97316', baseCost: 7, latency: 35, availability: 99.90, role: 'compute' },
  container: { name: 'Container Service', icon: '⬡', color: '#6366f1', baseCost: 28, latency: 24, availability: 99.90, role: 'compute' },
  db: { name: 'DynamoDB', icon: '▤', color: '#10b981', baseCost: 18, latency: 12, availability: 99.99, role: 'data' },
  sql: { name: 'PostgreSQL', icon: '◫', color: '#0891b2', baseCost: 42, latency: 20, availability: 99.95, role: 'data' },
  queue: { name: 'SQS Queue', icon: '≡', color: '#f59e0b', baseCost: 5, latency: 28, availability: 99.99, role: 'event' },
  cache: { name: 'Redis Cache', icon: '⚡', color: '#ef4444', baseCost: 22, latency: 3, availability: 99.90, role: 'data' },
  monitor: { name: 'Observability', icon: '◉', color: '#2563eb', baseCost: 12, latency: 1, availability: 100, role: 'operations' }
};

const sizes = {
  small: { label: 'Small', cost: 1, latency: 1.12 },
  medium: { label: 'Medium', cost: 1.8, latency: 1 },
  large: { label: 'Large', cost: 3.2, latency: .82 }
};

const initialState = () => ({
  version: 2,
  name: 'Untitled architecture',
  nodes: [],
  links: [],
  selectedId: null,
  lastRun: null
});

function defaultNode(type, index) {
  const service = services[type];
  return {
    id: uid(type), type, label: service.name,
    x: 70 + (index % 3) * 190,
    y: 65 + Math.floor(index / 3) * 125,
    region: 'us-central-1', az: `a${(index % 3) + 1}`,
    size: 'medium', monthlyRequests: 100000,
    entry: index === 0
  };
}

function validateState(state) {
  const findings = [];
  const nodeIds = new Set(state.nodes.map(node => node.id));
  const outgoing = new Map(state.nodes.map(node => [node.id, []]));
  const incoming = new Map(state.nodes.map(node => [node.id, []]));
  for (const link of state.links) {
    if (!nodeIds.has(link.from) || !nodeIds.has(link.to)) {
      findings.push({ tone: 'danger', title: 'Broken connection', detail: 'A connection references a deleted node.' });
      continue;
    }
    outgoing.get(link.from).push(link.to);
    incoming.get(link.to).push(link.from);
  }
  if (!state.nodes.length) findings.push({ tone: 'danger', title: 'Empty architecture', detail: 'Add at least two services to build a request path.' });
  const entries = state.nodes.filter(node => node.entry);
  if (state.nodes.length && entries.length === 0) findings.push({ tone: 'danger', title: 'No entry point', detail: 'Mark one service as the public or internal entry point.' });
  if (entries.length > 1) findings.push({ tone: 'warning', title: 'Multiple entry points', detail: 'This is valid, but simulations use the first entry point unless you select a target.' });
  const color = new Map();
  let cyclic = false;
  const visit = id => {
    color.set(id, 1);
    for (const next of outgoing.get(id) || []) {
      if (color.get(next) === 1) cyclic = true;
      if (!color.get(next)) visit(next);
    }
    color.set(id, 2);
  };
  state.nodes.forEach(node => { if (!color.get(node.id)) visit(node.id); });
  if (cyclic) findings.push({ tone: 'danger', title: 'Request cycle detected', detail: 'Remove the loop or change one connection to an asynchronous event path.' });
  for (const node of state.nodes) {
    const isolated = !(outgoing.get(node.id)?.length || incoming.get(node.id)?.length);
    if (state.nodes.length > 1 && isolated) findings.push({ tone: 'warning', title: `${node.label} is isolated`, detail: 'Connect it or remove it so the topology and simulation agree.' });
  }
  if (state.nodes.length && !state.nodes.some(node => node.type === 'monitor')) findings.push({ tone: 'warning', title: 'No observability', detail: 'Add logs, metrics, traces, or an observability service.' });
  if (state.nodes.some(node => ['db', 'sql'].includes(node.type)) && !state.nodes.some(node => node.type === 'queue')) findings.push({ tone: 'warning', title: 'Tight data dependency', detail: 'A queue can isolate writes and absorb traffic spikes.' });
  const regions = new Set(state.nodes.map(node => node.region));
  if (state.nodes.length >= 4 && regions.size === 1) findings.push({ tone: 'warning', title: 'Single-region design', detail: 'Consider a second region for disaster recovery.' });
  if (!findings.length) findings.push({ tone: 'success', title: 'Architecture is ready to simulate', detail: 'The graph has an entry point, connected services, and no blocking validation errors.' });
  return findings;
}

function graphPath(state, targetId = null) {
  const entry = state.nodes.find(node => node.entry) || state.nodes[0];
  if (!entry) return [];
  const outgoing = new Map(state.nodes.map(node => [node.id, []]));
  state.links.forEach(link => outgoing.get(link.from)?.push(link.to));
  const sinks = state.nodes.filter(node => !(outgoing.get(node.id)?.length));
  const target = targetId && targetId !== entry.id ? targetId : sinks[0]?.id || state.nodes.at(-1)?.id;
  const queue = [[entry.id]];
  const seen = new Set([entry.id]);
  while (queue.length) {
    const path = queue.shift();
    const last = path.at(-1);
    if (last === target) return path;
    for (const next of outgoing.get(last) || []) {
      if (!seen.has(next)) { seen.add(next); queue.push([...path, next]); }
    }
  }
  return [entry.id];
}

function calculateMetrics(state) {
  const cost = state.nodes.reduce((sum, node) => {
    const service = services[node.type];
    const requestFactor = 1 + Math.max(0, node.monthlyRequests) / 1000000;
    return sum + service.baseCost * sizes[node.size].cost * requestFactor;
  }, 0);
  const path = graphPath(state, state.selectedId);
  const latency = path.reduce((sum, id) => {
    const node = state.nodes.find(item => item.id === id);
    return sum + services[node.type].latency * sizes[node.size].latency;
  }, 0);
  const availability = path.length ? path.reduce((product, id) => product * (services[state.nodes.find(node => node.id === id).type].availability / 100), 1) * 100 : 0;
  return { cost, latency, availability, path };
}

function markdownFor(state) {
  const metrics = calculateMetrics(state);
  const lines = [`# ${state.name}`, '', '## Services'];
  state.nodes.forEach(node => lines.push(`- **${node.label}** (${services[node.type].name}) · ${node.region}/${node.az} · ${sizes[node.size].label} · ${node.monthlyRequests.toLocaleString()} requests/mo${node.entry ? ' · entry point' : ''}`));
  lines.push('', '## Connections');
  state.links.forEach(link => {
    const from = state.nodes.find(node => node.id === link.from)?.label || link.from;
    const to = state.nodes.find(node => node.id === link.to)?.label || link.to;
    lines.push(`- ${from} → ${to} (${link.kind})`);
  });
  lines.push('', '## Estimated profile', `- Monthly cost: $${metrics.cost.toFixed(2)}`, `- Selected-path latency: ${Math.round(metrics.latency)} ms`, `- Selected-path availability: ${metrics.availability.toFixed(3)}%`);
  return lines.join('\n');
}

export function createArchitectureBuilder({ stage, toast }) {
  stage.innerHTML = `<section class="tool-product architecture-product" style="--tool-bg:#eef4fb;--tool-text:#12233c;--tool-line:#cbd8e8;--tool-accent:#2563eb;--tool-panel:#fff">
    <header class="tool-product__toolbar">
      <div><h2>Cloud Architecture Builder</h2><p>Build a connected topology, validate it, simulate the real graph path, and export reusable documentation.</p></div>
      <button data-action="new">New</button><button data-action="undo">Undo</button><button data-action="redo">Redo</button>
      <button data-action="validate">Validate</button><button data-action="simulate" class="primary">Simulate</button>
      <button data-action="save">Save</button><button data-action="load">Load</button><button data-action="import">Import</button><button data-action="export">Export</button>
    </header>
    <div class="tool-product__workspace tool-split-3 architecture-layout">
      <aside class="tool-panel service-palette" data-palette>
        <h3 class="tool-panel__heading">SERVICE LIBRARY</h3>
        ${Object.entries(services).map(([id, service]) => `<button data-add-service="${id}" style="--service:${service.color}"><i>${service.icon}</i><span><b>${service.name}</b><small>${service.role} · from $${service.baseCost}/mo</small></span></button>`).join('')}
      </aside>
      <main class="architecture-board" data-board tabindex="0" aria-label="Architecture canvas">
        <svg data-links aria-hidden="true"></svg><div class="board-grid"></div>
        <div class="tool-empty" data-empty><strong>Start with an entry service.</strong><br>Add services, drag them into place, then connect them from the inspector.</div>
        <i class="request-packet" data-packet hidden></i>
      </main>
      <aside class="tool-panel tool-inspector architecture-inspector">
        <section><h3>PROJECT</h3><label>Name<input data-project-name></label><div class="tool-kpis" data-kpis></div></section>
        <section><h3>SELECTED SERVICE</h3><div data-inspector><p>Select a service to configure it.</p></div></section>
        <section><h3>VALIDATION</h3><div data-findings></div></section>
      </aside>
    </div>
    <footer class="tool-product__statusbar"><span data-status>Ready.</span><span style="margin-left:auto">Tip: select a destination before simulation to test a specific route.</span></footer>
    <div class="tool-modal" data-import-modal hidden><div class="tool-modal__card"><h3>Import architecture JSON</h3><p>Paste a prior export. The importer validates node types and connection references before replacing the canvas.</p><textarea class="tool-code" data-import-text rows="16"></textarea><div class="tool-button-row"><button data-action="apply-import" class="primary">Import project</button><button data-action="close-import">Cancel</button></div><div data-import-error></div></div></div>
  </section>`;

  const storage = createStorage('game-testing:architecture-builder:v2');
  let running = false;
  let history;
  const board = qs(stage, '[data-board]');
  const packet = qs(stage, '[data-packet]');
  const setStatus = message => { qs(stage, '[data-status]').textContent = message; };
  const current = () => history.current();
  function updateHistoryButtons(status = history.status()) {
    qs(stage, '[data-action="undo"]').disabled = !status.canUndo || running;
    qs(stage, '[data-action="redo"]').disabled = !status.canRedo || running;
  }
  function renderLinks(state) {
    const svg = qs(stage, '[data-links]');
    svg.innerHTML = state.links.map(link => {
      const from = state.nodes.find(node => node.id === link.from);
      const to = state.nodes.find(node => node.id === link.to);
      if (!from || !to) return '';
      const color = link.kind === 'event' ? '#f59e0b' : link.kind === 'data' ? '#10b981' : '#2563eb';
      return `<path data-link-id="${link.id}" d="M${from.x + 145} ${from.y + 39} C${from.x + 205} ${from.y + 39},${to.x - 60} ${to.y + 39},${to.x} ${to.y + 39}" style="stroke:${color}"/>`;
    }).join('');
  }
  function renderNodes(state) {
    qsa(board, '.architecture-node').forEach(node => node.remove());
    state.nodes.forEach(node => {
      const service = services[node.type];
      const element = document.createElement('article');
      element.className = `architecture-node${node.id === state.selectedId ? ' selected' : ''}`;
      element.dataset.nodeId = node.id;
      element.style.cssText = `--service:${service.color};transform:translate(${node.x}px,${node.y}px)`;
      element.tabIndex = 0;
      element.innerHTML = `<i>${service.icon}</i><span><b>${escapeHtml(node.label)}</b><small>${escapeHtml(node.region)} · ${escapeHtml(node.az)}${node.entry ? ' · ENTRY' : ''}</small></span><em aria-hidden="true">⋮⋮</em>`;
      board.append(element);
    });
    qs(stage, '[data-empty]').hidden = state.nodes.length > 0;
  }
  function renderInspector(state) {
    qs(stage, '[data-project-name]').value = state.name;
    const metrics = calculateMetrics(state);
    qs(stage, '[data-kpis]').innerHTML = [['MONTHLY', `$${metrics.cost.toFixed(0)}`], ['PATH LATENCY', `${Math.round(metrics.latency)} ms`], ['AVAILABILITY', `${metrics.availability.toFixed(3)}%`], ['SERVICES', state.nodes.length]].map(([label, value]) => `<div class="tool-kpi"><span>${label}</span><strong>${value}</strong></div>`).join('');
    const selected = state.nodes.find(node => node.id === state.selectedId);
    const inspector = qs(stage, '[data-inspector]');
    if (!selected) inspector.innerHTML = '<p>Select a service to edit its name, capacity, region, entry-point status, and connections.</p>';
    else {
      const connected = state.links.filter(link => link.from === selected.id || link.to === selected.id);
      inspector.innerHTML = `<div class="inspected-service" style="--service:${services[selected.type].color}"><i>${services[selected.type].icon}</i><span><b>${escapeHtml(selected.label)}</b><small>${escapeHtml(services[selected.type].name)}</small></span></div>
        <div class="tool-field-grid"><label>Label<input data-node-field="label" value="${escapeHtml(selected.label)}"></label><label>Size<select data-node-field="size">${Object.entries(sizes).map(([id, size]) => `<option value="${id}" ${id === selected.size ? 'selected' : ''}>${size.label}</option>`).join('')}</select></label></div>
        <div class="tool-field-grid"><label>Region<input data-node-field="region" value="${escapeHtml(selected.region)}"></label><label>Availability zone<input data-node-field="az" value="${escapeHtml(selected.az)}"></label></div>
        <label>Monthly requests<input data-node-field="monthlyRequests" type="number" min="0" step="10000" value="${selected.monthlyRequests}"></label>
        <label class="architecture-checkbox"><input data-node-field="entry" type="checkbox" ${selected.entry ? 'checked' : ''}> Entry point</label>
        <h3>CONNECT THIS SERVICE</h3>
        <div class="tool-field-grid"><label>Target<select data-connect-target><option value="">Choose target</option>${state.nodes.filter(node => node.id !== selected.id).map(node => `<option value="${node.id}">${escapeHtml(node.label)}</option>`).join('')}</select></label><label>Connection<select data-connect-kind><option value="request">Request</option><option value="event">Event</option><option value="data">Data</option></select></label></div>
        <button data-action="connect-selected" class="primary">Add connection</button>
        <table class="tool-table"><thead><tr><th>Connection</th><th>Type</th><th></th></tr></thead><tbody>${connected.length ? connected.map(link => {
          const outbound = link.from === selected.id;
          const other = state.nodes.find(node => node.id === (outbound ? link.to : link.from));
          return `<tr><td>${outbound ? '→' : '←'} ${escapeHtml(other?.label || 'Missing node')}</td><td>${link.kind}</td><td><button data-remove-link="${link.id}" aria-label="Remove connection">×</button></td></tr>`;
        }).join('') : '<tr><td colspan="3">No connections.</td></tr>'}</tbody></table>
        <div class="tool-button-row"><button data-action="duplicate-selected">Duplicate</button><button data-action="delete-selected" class="danger">Delete service</button></div>`;
    }
    const findings = validateState(state);
    qs(stage, '[data-findings]').innerHTML = findings.map(finding => `<div class="tool-notice" data-tone="${finding.tone}"><strong>${escapeHtml(finding.title)}</strong><br>${escapeHtml(finding.detail)}</div>`).join('');
    updateHistoryButtons();
  }
  function render(state) { renderNodes(state); renderLinks(state); renderInspector(state); }
  history = createHistory(initialState(), (state, status) => { render(state); updateHistoryButtons(status); });
  render(current());
  function commit(mutator, statusMessage = 'Project updated.') {
    if (running) return;
    const state = current();
    mutator(state);
    history.push(state);
    setStatus(statusMessage);
  }
  function addService(type) {
    commit(state => { const node = defaultNode(type, state.nodes.length); state.nodes.push(node); state.selectedId = node.id; }, `${services[type].name} added.`);
  }
  function changeSelected(field, rawValue) {
    commit(state => {
      const node = state.nodes.find(item => item.id === state.selectedId);
      if (!node) return;
      if (field === 'monthlyRequests') node[field] = Math.max(0, Number(rawValue) || 0);
      else if (field === 'entry') node[field] = Boolean(rawValue);
      else node[field] = String(rawValue).trim() || node[field];
    }, 'Service configuration updated.');
  }
  function deleteSelected() {
    commit(state => { const id = state.selectedId; state.nodes = state.nodes.filter(node => node.id !== id); state.links = state.links.filter(link => link.from !== id && link.to !== id); state.selectedId = state.nodes[0]?.id || null; }, 'Service and its connections deleted.');
  }
  function importProject(text) {
    const { value: parsed, error } = safeJsonParse(text);
    if (error || !parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.links)) throw new Error('Expected an object containing nodes and links arrays.');
    const state = initialState();
    state.name = String(parsed.name || 'Imported architecture').slice(0, 80);
    state.nodes = parsed.nodes.map((node, index) => {
      if (!services[node.type]) throw new Error(`Unsupported service type: ${node.type}`);
      return { ...defaultNode(node.type, index), ...node, id: String(node.id || uid(node.type)), x: Number(node.x) || 0, y: Number(node.y) || 0, monthlyRequests: Math.max(0, Number(node.monthlyRequests) || 0), size: sizes[node.size] ? node.size : 'medium' };
    });
    const ids = new Set(state.nodes.map(node => node.id));
    state.links = parsed.links.map(link => ({ id: String(link.id || uid('link')), from: String(link.from), to: String(link.to), kind: ['request', 'event', 'data'].includes(link.kind) ? link.kind : 'request' })).filter(link => ids.has(link.from) && ids.has(link.to) && link.from !== link.to);
    state.selectedId = state.nodes[0]?.id || null;
    history.reset(state);
    setStatus('Imported architecture loaded.');
  }
  let drag = null;
  board.addEventListener('pointerdown', event => {
    const nodeElement = event.target.closest('[data-node-id]');
    if (!nodeElement || running) return;
    const state = current();
    const node = state.nodes.find(item => item.id === nodeElement.dataset.nodeId);
    if (!node) return;
    if (state.selectedId !== node.id) { state.selectedId = node.id; history.replace(state); }
    const rect = board.getBoundingClientRect();
    drag = { id: node.id, startX: event.clientX, startY: event.clientY, nodeX: node.x, nodeY: node.y, rect, pointerId: event.pointerId, moved: false };
    nodeElement.setPointerCapture?.(event.pointerId);
  });
  board.addEventListener('pointermove', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
    const state = current();
    const node = state.nodes.find(item => item.id === drag.id);
    if (!node) return;
    node.x = clamp(drag.nodeX + dx, 0, Math.max(0, drag.rect.width - 155));
    node.y = clamp(drag.nodeY + dy, 0, Math.max(0, drag.rect.height - 82));
    const element = qs(board, `[data-node-id="${node.id}"]`);
    if (element) element.style.transform = `translate(${node.x}px,${node.y}px)`;
    renderLinks(state);
    drag.preview = state;
  });
  board.addEventListener('pointerup', event => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (drag.moved && drag.preview) history.push(drag.preview);
    drag = null;
  });
  stage.addEventListener('input', event => {
    const project = event.target.closest('[data-project-name]');
    if (project) { const state = current(); state.name = project.value; history.replace(state); }
  });
  stage.addEventListener('change', event => {
    const field = event.target.dataset.nodeField;
    if (field) changeSelected(field, field === 'entry' ? event.target.checked : event.target.value);
  });
  stage.addEventListener('click', async event => {
    const add = event.target.closest('[data-add-service]');
    if (add) return addService(add.dataset.addService);
    const removeLink = event.target.closest('[data-remove-link]');
    if (removeLink) return commit(state => { state.links = state.links.filter(link => link.id !== removeLink.dataset.removeLink); }, 'Connection removed.');
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'new') {
      if (current().nodes.length && !confirm('Start a new architecture and discard unsaved canvas changes?')) return;
      history.reset(initialState()); setStatus('New architecture ready.');
    } else if (action === 'undo') history.undo();
    else if (action === 'redo') history.redo();
    else if (action === 'delete-selected') deleteSelected();
    else if (action === 'duplicate-selected') {
      commit(state => { const source = state.nodes.find(node => node.id === state.selectedId); if (!source) return; const copy = { ...deepClone(source), id: uid(source.type), label: `${source.label} copy`, x: source.x + 35, y: source.y + 35, entry: false }; state.nodes.push(copy); state.selectedId = copy.id; }, 'Service duplicated.');
    } else if (action === 'connect-selected') {
      const target = qs(stage, '[data-connect-target]')?.value;
      const kind = qs(stage, '[data-connect-kind]')?.value || 'request';
      if (!target) return toast('Choose a target service.');
      commit(state => { const from = state.selectedId; if (from === target || state.links.some(link => link.from === from && link.to === target && link.kind === kind)) return; state.links.push({ id: uid('link'), from, to: target, kind }); }, 'Connection added.');
    } else if (action === 'validate') {
      const findings = validateState(current());
      const blocking = findings.filter(finding => finding.tone === 'danger').length;
      toast(blocking ? `${blocking} blocking architecture issue${blocking === 1 ? '' : 's'}` : 'Architecture validation passed');
      setStatus(blocking ? 'Validation found blocking issues.' : 'Validation passed.');
    } else if (action === 'simulate') {
      const state = current();
      if (validateState(state).some(finding => finding.tone === 'danger')) return toast('Fix blocking validation issues before simulation.');
      const path = graphPath(state, state.selectedId);
      if (path.length < 2) return toast('Connect the entry point to another service first.');
      running = true; updateHistoryButtons(); packet.hidden = false; setStatus('Request simulation running…');
      for (const id of path) {
        const node = state.nodes.find(item => item.id === id);
        const element = qs(board, `[data-node-id="${id}"]`);
        element?.classList.add('request-active'); packet.style.transform = `translate(${node.x + 65}px,${node.y + 30}px)`; await wait(520); element?.classList.remove('request-active');
      }
      packet.hidden = true; running = false; updateHistoryButtons();
      const metrics = calculateMetrics(state);
      state.lastRun = { at: new Date().toISOString(), path, latency: metrics.latency };
      history.replace(state);
      setStatus(`Simulation complete: ${path.length} services, ${Math.round(metrics.latency)} ms estimated latency.`);
      toast('Request followed the connected graph successfully.');
    } else if (action === 'save') { storage.save(current()); setStatus('Project saved in this browser.'); toast('Architecture saved locally'); }
    else if (action === 'load') {
      const saved = storage.load();
      if (!saved) return toast('No saved architecture found.');
      try { importProject(JSON.stringify(saved)); toast('Saved architecture loaded'); } catch (error) { toast(error.message); }
    } else if (action === 'import') qs(stage, '[data-import-modal]').hidden = false;
    else if (action === 'close-import') qs(stage, '[data-import-modal]').hidden = true;
    else if (action === 'apply-import') {
      const errorBox = qs(stage, '[data-import-error]');
      try { importProject(qs(stage, '[data-import-text]').value); errorBox.innerHTML = ''; qs(stage, '[data-import-modal]').hidden = true; toast('Architecture imported'); }
      catch (error) { errorBox.innerHTML = `<div class="tool-notice" data-tone="danger">${escapeHtml(error.message)}</div>`; }
    } else if (action === 'export') {
      const state = current();
      downloadText('cloud-architecture.json', JSON.stringify(state, null, 2));
      downloadText('cloud-architecture.md', markdownFor(state), 'text/markdown');
      try { await copyText(JSON.stringify(state, null, 2)); } catch {}
      setStatus('JSON and Markdown exports downloaded.'); toast('Architecture exported');
    }
  });
  return controllerForDom(stage, () => history.reset(initialState()), null, 'CLOUD ARCHITECTURE PRODUCT', () => `${current().nodes.length} services · ${current().links.length} connections`);
}
