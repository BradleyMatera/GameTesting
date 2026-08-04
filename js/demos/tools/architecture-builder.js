import {
  clamp, controllerForDom, copyText, createHistory, createStorage,
  downloadText, escapeHtml, qs, qsa, safeJsonParse, uid, wait
} from './tool-utils.js';

const services = {
  cdn: { name: 'CloudFront CDN', icon: '◎', color: '#0ea5e9', cost: 4, latency: 8, availability: 99.95, role: 'edge' },
  api: { name: 'API Gateway', icon: '⇄', color: '#8b5cf6', cost: 8, latency: 18, availability: 99.95, role: 'compute' },
  lambda: { name: 'Lambda', icon: 'λ', color: '#f97316', cost: 7, latency: 35, availability: 99.90, role: 'compute' },
  container: { name: 'Container Service', icon: '⬡', color: '#6366f1', cost: 28, latency: 24, availability: 99.90, role: 'compute' },
  db: { name: 'DynamoDB', icon: '▤', color: '#10b981', cost: 18, latency: 12, availability: 99.99, role: 'data' },
  sql: { name: 'PostgreSQL', icon: '◫', color: '#0891b2', cost: 42, latency: 20, availability: 99.95, role: 'data' },
  queue: { name: 'SQS Queue', icon: '≡', color: '#f59e0b', cost: 5, latency: 28, availability: 99.99, role: 'event' },
  cache: { name: 'Redis Cache', icon: '⚡', color: '#ef4444', cost: 22, latency: 3, availability: 99.90, role: 'data' },
  monitor: { name: 'Observability', icon: '◉', color: '#2563eb', cost: 12, latency: 1, availability: 100, role: 'operations' },
};
const sizes = {
  small: { label: 'Small', cost: 1, latency: 1.12 },
  medium: { label: 'Medium', cost: 1.8, latency: 1 },
  large: { label: 'Large', cost: 3.2, latency: .82 },
};
const blank = () => ({ version: 2, name: 'Untitled architecture', nodes: [], links: [], selectedId: null, lastRun: null });
const newNode = (type, index) => ({
  id: uid(type), type, label: services[type].name,
  x: 70 + (index % 3) * 190, y: 65 + Math.floor(index / 3) * 125,
  region: 'us-central-1', az: `a${index % 3 + 1}`, size: 'medium',
  monthlyRequests: 100000, entry: index === 0,
});

function maps(state) {
  const outgoing = new Map(state.nodes.map(node => [node.id, []]));
  const incoming = new Map(state.nodes.map(node => [node.id, []]));
  state.links.forEach(link => { outgoing.get(link.from)?.push(link.to); incoming.get(link.to)?.push(link.from); });
  return { outgoing, incoming };
}
function pathFor(state, targetId = null) {
  const entry = state.nodes.find(node => node.entry) || state.nodes[0];
  if (!entry) return [];
  const { outgoing } = maps(state);
  const sinks = state.nodes.filter(node => !(outgoing.get(node.id)?.length));
  const target = targetId && targetId !== entry.id ? targetId : sinks[0]?.id || state.nodes.at(-1)?.id;
  const queue = [[entry.id]], seen = new Set([entry.id]);
  while (queue.length) {
    const path = queue.shift(), last = path.at(-1);
    if (last === target) return path;
    for (const next of outgoing.get(last) || []) if (!seen.has(next)) { seen.add(next); queue.push([...path, next]); }
  }
  return [entry.id];
}
function metrics(state) {
  const path = pathFor(state, state.selectedId);
  const cost = state.nodes.reduce((sum, node) => sum + services[node.type].cost * sizes[node.size].cost * (1 + Math.max(0, node.monthlyRequests) / 1000000), 0);
  const latency = path.reduce((sum, id) => { const node = state.nodes.find(item => item.id === id); return sum + services[node.type].latency * sizes[node.size].latency; }, 0);
  const availability = path.length ? path.reduce((total, id) => total * services[state.nodes.find(node => node.id === id).type].availability / 100, 1) * 100 : 0;
  return { path, cost, latency, availability };
}
function validate(state) {
  const findings = [], ids = new Set(state.nodes.map(node => node.id)), { outgoing, incoming } = maps(state);
  if (!state.nodes.length) findings.push(['danger', 'Empty architecture', 'Add at least two services.']);
  const entries = state.nodes.filter(node => node.entry);
  if (state.nodes.length && !entries.length) findings.push(['danger', 'No entry point', 'Mark one service as the entry point.']);
  if (entries.length > 1) findings.push(['warning', 'Multiple entry points', 'Simulation starts from the first entry point.']);
  state.links.forEach(link => { if (!ids.has(link.from) || !ids.has(link.to)) findings.push(['danger', 'Broken connection', 'A link points to a deleted service.']); });
  state.nodes.forEach(node => { if (state.nodes.length > 1 && !(outgoing.get(node.id)?.length || incoming.get(node.id)?.length)) findings.push(['warning', `${node.label} is isolated`, 'Connect it or remove it.']); });
  const colors = new Map(); let cycle = false;
  const visit = id => { colors.set(id, 1); for (const next of outgoing.get(id) || []) { if (colors.get(next) === 1) cycle = true; else if (!colors.get(next)) visit(next); } colors.set(id, 2); };
  state.nodes.forEach(node => { if (!colors.get(node.id)) visit(node.id); });
  if (cycle) findings.push(['danger', 'Request cycle detected', 'Remove the loop or model it as an event.']);
  if (state.nodes.length && !state.nodes.some(node => node.type === 'monitor')) findings.push(['warning', 'No observability', 'Add logging, metrics, or traces.']);
  if (!findings.length) findings.push(['success', 'Architecture is ready', 'The connected graph can be simulated.']);
  return findings;
}
function markdown(state) {
  const result = metrics(state), lines = [`# ${state.name}`, '', '## Services'];
  state.nodes.forEach(node => lines.push(`- **${node.label}** · ${services[node.type].name} · ${node.region}/${node.az} · ${sizes[node.size].label}${node.entry ? ' · entry point' : ''}`));
  lines.push('', '## Connections');
  state.links.forEach(link => lines.push(`- ${state.nodes.find(node => node.id === link.from)?.label} → ${state.nodes.find(node => node.id === link.to)?.label} (${link.kind})`));
  lines.push('', '## Estimate', `- Monthly cost: $${result.cost.toFixed(2)}`, `- Path latency: ${Math.round(result.latency)} ms`, `- Path availability: ${result.availability.toFixed(3)}%`);
  return lines.join('\n');
}

export function createArchitectureBuilder({ stage, toast }) {
  stage.innerHTML = `<section class="tool-product architecture-product" style="--tool-bg:#eef4fb;--tool-text:#12233c;--tool-line:#cbd8e8;--tool-accent:#2563eb;--tool-panel:#fff">
    <header class="tool-product__toolbar"><div><h2>Cloud Architecture Builder</h2><p>Configure services, connect a real graph, validate it, simulate a path, and export the project.</p></div><button data-action="new">New</button><button data-action="undo">Undo</button><button data-action="redo">Redo</button><button data-action="validate">Validate</button><button data-action="simulate" class="primary">Simulate</button><button data-action="save">Save</button><button data-action="load">Load</button><button data-action="import">Import</button><button data-action="export">Export</button></header>
    <div class="tool-product__workspace tool-split-3 architecture-layout">
      <aside class="tool-panel service-palette"><h3 class="tool-panel__heading">SERVICE LIBRARY</h3>${Object.entries(services).map(([id, service]) => `<button data-add-service="${id}" style="--service:${service.color}"><i>${service.icon}</i><span><b>${service.name}</b><small>${service.role} · from $${service.cost}/mo</small></span></button>`).join('')}</aside>
      <main class="architecture-board" data-board tabindex="0"><svg data-links aria-hidden="true"></svg><div class="board-grid"></div><div class="tool-empty" data-empty><strong>Start with an entry service.</strong><br>Add services, select a card to configure it, and drag only from the dotted handle.</div><i class="request-packet" data-packet hidden></i></main>
      <aside class="tool-panel tool-inspector architecture-inspector"><section><h3>PROJECT</h3><label>Name<input data-project-name></label><div class="tool-kpis" data-kpis></div></section><section><h3>SELECTED SERVICE</h3><div data-inspector><p>Select a service.</p></div></section><section><h3>VALIDATION</h3><div data-findings></div></section></aside>
    </div>
    <footer class="tool-product__statusbar"><span data-status>Ready.</span><span style="margin-left:auto">Select a destination to simulate that route.</span></footer>
    <div class="tool-modal" data-import-modal hidden><div class="tool-modal__card"><h3>Import architecture JSON</h3><textarea class="tool-code" data-import-text rows="16"></textarea><div class="tool-button-row"><button data-action="apply-import" class="primary">Import</button><button data-action="close-import">Cancel</button></div><div data-import-error></div></div></div>
  </section>`;
  const storage = createStorage('game-testing:architecture-builder:v2'), board = qs(stage, '[data-board]'), packet = qs(stage, '[data-packet]');
  let history, running = false, drag = null;
  const current = () => history.current();
  const status = text => { const element = qs(stage, '[data-status]'); if (element) element.textContent = text; };
  const updateButtons = state => { qs(stage, '[data-action="undo"]').disabled = !state.canUndo || running; qs(stage, '[data-action="redo"]').disabled = !state.canRedo || running; };
  function drawLinks(state) {
    qs(stage, '[data-links]').innerHTML = state.links.map(link => { const from = state.nodes.find(node => node.id === link.from), to = state.nodes.find(node => node.id === link.to); if (!from || !to) return ''; const color = link.kind === 'event' ? '#f59e0b' : link.kind === 'data' ? '#10b981' : '#2563eb'; return `<path data-link-id="${link.id}" d="M${from.x + 145} ${from.y + 39} C${from.x + 205} ${from.y + 39},${to.x - 60} ${to.y + 39},${to.x} ${to.y + 39}" style="stroke:${color}"/>`; }).join('');
  }
  function drawNodes(state) {
    qsa(board, '.architecture-node').forEach(element => element.remove());
    state.nodes.forEach(node => { const service = services[node.type], element = document.createElement('article'); element.className = `architecture-node${node.id === state.selectedId ? ' selected' : ''}`; element.dataset.nodeId = node.id; element.tabIndex = 0; element.style.cssText = `--service:${service.color};transform:translate(${node.x}px,${node.y}px)`; element.innerHTML = `<i>${service.icon}</i><span><b>${escapeHtml(node.label)}</b><small>${escapeHtml(node.region)} · ${escapeHtml(node.az)}${node.entry ? ' · ENTRY' : ''}</small></span><em data-drag-handle title="Drag service" aria-label="Drag service">⋮⋮</em>`; board.append(element); });
    qs(stage, '[data-empty]').hidden = state.nodes.length > 0;
  }
  function drawInspector(state) {
    qs(stage, '[data-project-name]').value = state.name;
    const estimate = metrics(state);
    qs(stage, '[data-kpis]').innerHTML = [['MONTHLY', `$${estimate.cost.toFixed(0)}`], ['PATH LATENCY', `${Math.round(estimate.latency)} ms`], ['AVAILABILITY', `${estimate.availability.toFixed(3)}%`], ['SERVICES', state.nodes.length]].map(([label, value]) => `<div class="tool-kpi"><span>${label}</span><strong>${value}</strong></div>`).join('');
    const selected = state.nodes.find(node => node.id === state.selectedId), inspector = qs(stage, '[data-inspector]');
    if (!selected) inspector.innerHTML = '<p>Select a service to edit it and create connections.</p>';
    else inspector.innerHTML = `<div class="inspected-service" style="--service:${services[selected.type].color}"><i>${services[selected.type].icon}</i><span><b>${escapeHtml(selected.label)}</b><small>${escapeHtml(services[selected.type].name)}</small></span></div><div class="tool-field-grid"><label>Label<input data-node-field="label" value="${escapeHtml(selected.label)}"></label><label>Size<select data-node-field="size">${Object.entries(sizes).map(([id, size]) => `<option value="${id}" ${selected.size === id ? 'selected' : ''}>${size.label}</option>`).join('')}</select></label></div><div class="tool-field-grid"><label>Region<input data-node-field="region" value="${escapeHtml(selected.region)}"></label><label>Zone<input data-node-field="az" value="${escapeHtml(selected.az)}"></label></div><label>Monthly requests<input data-node-field="monthlyRequests" type="number" min="0" step="10000" value="${selected.monthlyRequests}"></label><label class="architecture-checkbox"><input data-node-field="entry" type="checkbox" ${selected.entry ? 'checked' : ''}> Entry point</label><div class="tool-field-grid"><label>Target<select data-connect-target><option value="">Choose target</option>${state.nodes.filter(node => node.id !== selected.id).map(node => `<option value="${node.id}">${escapeHtml(node.label)}</option>`).join('')}</select></label><label>Connection<select data-connect-kind><option value="request">Request</option><option value="event">Event</option><option value="data">Data</option></select></label></div><button data-action="connect-selected" class="primary">Add connection</button><table class="tool-table"><tbody>${state.links.filter(link => link.from === selected.id || link.to === selected.id).map(link => { const outbound = link.from === selected.id, other = state.nodes.find(node => node.id === (outbound ? link.to : link.from)); return `<tr><td>${outbound ? '→' : '←'} ${escapeHtml(other?.label || 'Missing')}</td><td>${link.kind}</td><td><button data-remove-link="${link.id}">×</button></td></tr>`; }).join('') || '<tr><td>No connections.</td></tr>'}</tbody></table><div class="tool-button-row"><button data-action="duplicate-selected">Duplicate</button><button data-action="delete-selected" class="danger">Delete</button></div>`;
    qs(stage, '[data-findings]').innerHTML = validate(state).map(([tone, title, detail]) => `<div class="tool-notice" data-tone="${tone}"><strong>${escapeHtml(title)}</strong><br>${escapeHtml(detail)}</div>`).join('');
    updateButtons(history.status());
  }
  function render(state) { drawNodes(state); drawLinks(state); drawInspector(state); }
  history = createHistory(blank(), (state, historyState) => { render(state); updateButtons(historyState); }); render(current());
  function commit(mutator, message) { if (running) return; const state = current(); mutator(state); history.push(state); status(message); }
  function importState(text) { const parsed = safeJsonParse(text); if (parsed.error || !parsed.value || !Array.isArray(parsed.value.nodes) || !Array.isArray(parsed.value.links)) throw new Error('Expected nodes and links arrays.'); const state = blank(); state.name = String(parsed.value.name || 'Imported architecture').slice(0, 80); state.nodes = parsed.value.nodes.map((node, index) => { if (!services[node.type]) throw new Error(`Unsupported service type: ${node.type}`); return { ...newNode(node.type, index), ...node, id: String(node.id || uid(node.type)), size: sizes[node.size] ? node.size : 'medium', monthlyRequests: Math.max(0, Number(node.monthlyRequests) || 0) }; }); const ids = new Set(state.nodes.map(node => node.id)); state.links = parsed.value.links.map(link => ({ id: String(link.id || uid('link')), from: String(link.from), to: String(link.to), kind: ['request', 'event', 'data'].includes(link.kind) ? link.kind : 'request' })).filter(link => ids.has(link.from) && ids.has(link.to) && link.from !== link.to); state.selectedId = state.nodes[0]?.id || null; history.reset(state); status('Imported architecture loaded.'); }
  board.addEventListener('pointerdown', event => {
    const element = event.target.closest('[data-node-id]'); if (!element || running) return;
    const state = current(), node = state.nodes.find(item => item.id === element.dataset.nodeId); if (!node) return;
    if (state.selectedId !== node.id) { state.selectedId = node.id; history.replace(state); }
    if (!event.target.closest('[data-drag-handle]') || event.button !== 0) return;
    const rect = board.getBoundingClientRect(); drag = { id: node.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, nodeX: node.x, nodeY: node.y, rect, moved: false, preview: null };
    try { element.setPointerCapture(event.pointerId); } catch { /* Pointer capture is optional; document-level movement still works. */ }
    event.preventDefault();
  });
  board.addEventListener('pointermove', event => { if (!drag || event.pointerId !== drag.pointerId) return; const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY, state = current(), node = state.nodes.find(item => item.id === drag.id); if (!node) return; drag.moved ||= Math.abs(dx) + Math.abs(dy) > 4; node.x = clamp(drag.nodeX + dx, 0, Math.max(0, drag.rect.width - 155)); node.y = clamp(drag.nodeY + dy, 0, Math.max(0, drag.rect.height - 82)); const element = qs(board, `[data-node-id="${node.id}"]`); if (element) element.style.transform = `translate(${node.x}px,${node.y}px)`; drawLinks(state); drag.preview = state; });
  const endDrag = event => { if (!drag || event.pointerId !== drag.pointerId) return; if (drag.moved && drag.preview) history.push(drag.preview); drag = null; };
  board.addEventListener('pointerup', endDrag); board.addEventListener('pointercancel', endDrag);
  stage.addEventListener('input', event => { if (event.target.matches('[data-project-name]')) { const state = current(); state.name = event.target.value; history.replace(state); } });
  stage.addEventListener('change', event => { const field = event.target.dataset.nodeField; if (!field) return; commit(state => { const node = state.nodes.find(item => item.id === state.selectedId); if (!node) return; node[field] = field === 'entry' ? event.target.checked : field === 'monthlyRequests' ? Math.max(0, Number(event.target.value) || 0) : event.target.value; }, 'Service updated.'); });
  stage.addEventListener('click', async event => {
    const add = event.target.closest('[data-add-service]'); if (add) return commit(state => { const node = newNode(add.dataset.addService, state.nodes.length); state.nodes.push(node); state.selectedId = node.id; }, `${services[add.dataset.addService].name} added.`);
    const remove = event.target.closest('[data-remove-link]'); if (remove) return commit(state => { state.links = state.links.filter(link => link.id !== remove.dataset.removeLink); }, 'Connection removed.');
    const action = event.target.closest('[data-action]')?.dataset.action; if (!action) return;
    if (action === 'new') { if (current().nodes.length && !confirm('Start a new architecture?')) return; history.reset(blank()); status('New architecture ready.'); }
    else if (action === 'undo') history.undo(); else if (action === 'redo') history.redo();
    else if (action === 'connect-selected') { const target = qs(stage, '[data-connect-target]')?.value, kind = qs(stage, '[data-connect-kind]')?.value || 'request'; if (!target) return toast('Choose a target service.'); commit(state => { if (!state.links.some(link => link.from === state.selectedId && link.to === target && link.kind === kind)) state.links.push({ id: uid('link'), from: state.selectedId, to: target, kind }); }, 'Connection added.'); }
    else if (action === 'delete-selected') commit(state => { const id = state.selectedId; state.nodes = state.nodes.filter(node => node.id !== id); state.links = state.links.filter(link => link.from !== id && link.to !== id); state.selectedId = state.nodes[0]?.id || null; }, 'Service deleted.');
    else if (action === 'duplicate-selected') commit(state => { const source = state.nodes.find(node => node.id === state.selectedId); if (!source) return; const copy = { ...source, id: uid(source.type), label: `${source.label} copy`, x: source.x + 35, y: source.y + 35, entry: false }; state.nodes.push(copy); state.selectedId = copy.id; }, 'Service duplicated.');
    else if (action === 'validate') { const blockers = validate(current()).filter(item => item[0] === 'danger').length; toast(blockers ? `${blockers} blocking issue${blockers === 1 ? '' : 's'}` : 'Architecture validation passed'); }
    else if (action === 'simulate') { const state = current(); if (validate(state).some(item => item[0] === 'danger')) return toast('Fix blocking validation issues first.'); const path = pathFor(state, state.selectedId); if (path.length < 2) return toast('Connect the entry point to another service.'); running = true; updateButtons(history.status()); packet.hidden = false; status('Request simulation running…'); for (const id of path) { const node = state.nodes.find(item => item.id === id), element = qs(board, `[data-node-id="${id}"]`); element?.classList.add('request-active'); packet.style.transform = `translate(${node.x + 65}px,${node.y + 30}px)`; await wait(420); element?.classList.remove('request-active'); } packet.hidden = true; running = false; const result = metrics(state); state.lastRun = { at: new Date().toISOString(), path, latency: result.latency }; history.replace(state); status(`Simulation complete: ${path.length} services, ${Math.round(result.latency)} ms estimated latency.`); toast('Connected request path completed'); }
    else if (action === 'save') { storage.save(current()); toast('Architecture saved locally'); }
    else if (action === 'load') { const saved = storage.load(); if (!saved) return toast('No saved architecture found.'); try { importState(JSON.stringify(saved)); toast('Saved architecture loaded'); } catch (error) { toast(error.message); } }
    else if (action === 'import') qs(stage, '[data-import-modal]').hidden = false; else if (action === 'close-import') qs(stage, '[data-import-modal]').hidden = true;
    else if (action === 'apply-import') { const box = qs(stage, '[data-import-error]'); try { importState(qs(stage, '[data-import-text]').value); box.innerHTML = ''; qs(stage, '[data-import-modal]').hidden = true; toast('Architecture imported'); } catch (error) { box.innerHTML = `<div class="tool-notice" data-tone="danger">${escapeHtml(error.message)}</div>`; } }
    else if (action === 'export') { const state = current(); downloadText('cloud-architecture.json', JSON.stringify(state, null, 2)); downloadText('cloud-architecture.md', markdown(state), 'text/markdown'); try { await copyText(JSON.stringify(state, null, 2)); } catch {} toast('Architecture exported'); }
  });
  return controllerForDom(stage, () => history.reset(blank()), null, 'CLOUD ARCHITECTURE PRODUCT', () => `${current().nodes.length} services · ${current().links.length} connections`);
}
