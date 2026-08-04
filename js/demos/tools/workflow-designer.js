import {
  controllerForDom, copyText, createHistory, createStorage,
  downloadText, escapeHtml, qs, qsa, safeJsonParse, uid, wait
} from './tool-utils.js';

const nodeTypes = {
  trigger: { icon: '▶', name: 'Trigger', color: '#2563eb', defaults: { instructions: 'Accept a new request and create workflow context.', retries: 0, timeout: 5 } },
  agent: { icon: 'A', name: 'Agent', color: '#7c3aed', defaults: { instructions: 'Complete the assigned reasoning or production task.', retries: 1, timeout: 30 } },
  tool: { icon: '⌕', name: 'Tool call', color: '#0ea5e9', defaults: { instructions: 'Call a connected tool and add its result to context.', retries: 2, timeout: 15 } },
  branch: { icon: '◇', name: 'Condition', color: '#f59e0b', defaults: { instructions: 'confidence >= 0.80', retries: 0, timeout: 1 } },
  approval: { icon: '!', name: 'Human approval', color: '#ef4444', defaults: { instructions: 'Review the current artifact before release.', retries: 0, timeout: 120 } },
  transform: { icon: 'ƒ', name: 'Transform', color: '#14b8a6', defaults: { instructions: 'Normalize the prior result into the required schema.', retries: 0, timeout: 5 } },
  output: { icon: '■', name: 'Output', color: '#10b981', defaults: { instructions: 'Publish the verified result.', retries: 0, timeout: 5 } }
};

const initialState = () => ({ version: 2, name: 'Untitled workflow', nodes: [], selectedId: null, simulation: { confidence: .86, forcedFailureId: '', context: 'Customer asks for a verified project summary.' }, lastRun: null });

function createNode(type, index) {
  const spec = nodeTypes[type];
  return { id: uid(type), type, name: spec.name, instructions: spec.defaults.instructions, retries: spec.defaults.retries, timeout: spec.defaults.timeout, successNext: '', failureNext: '', outcome: 'auto', x: index };
}

function normalizeConnections(state) {
  const ids = new Set(state.nodes.map(node => node.id));
  state.nodes.forEach((node, index) => {
    if (node.successNext && !ids.has(node.successNext)) node.successNext = '';
    if (node.failureNext && !ids.has(node.failureNext)) node.failureNext = '';
    if (!node.successNext && index < state.nodes.length - 1) node.successNext = state.nodes[index + 1].id;
  });
}

function validateWorkflow(state) {
  const findings = [];
  if (!state.nodes.length) findings.push({ tone: 'danger', title: 'Workflow is empty', detail: 'Add a trigger, at least one processing node, and an output.' });
  const triggers = state.nodes.filter(node => node.type === 'trigger');
  if (state.nodes.length && triggers.length !== 1) findings.push({ tone: 'danger', title: 'Exactly one trigger is required', detail: `Current trigger count: ${triggers.length}.` });
  if (state.nodes.length && !state.nodes.some(node => node.type === 'output')) findings.push({ tone: 'danger', title: 'No output node', detail: 'Add a verified result or another output destination.' });
  const ids = new Set(state.nodes.map(node => node.id));
  state.nodes.forEach(node => {
    if (node.successNext && !ids.has(node.successNext)) findings.push({ tone: 'danger', title: `${node.name} has a broken success route`, detail: 'Choose an existing destination.' });
    if (node.failureNext && !ids.has(node.failureNext)) findings.push({ tone: 'danger', title: `${node.name} has a broken failure route`, detail: 'Choose an existing destination.' });
    if (node.type === 'branch' && (!node.successNext || !node.failureNext)) findings.push({ tone: 'warning', title: `${node.name} needs two routes`, detail: 'Configure true and false destinations.' });
    if (node.type !== 'output' && !node.successNext) findings.push({ tone: 'warning', title: `${node.name} has no success destination`, detail: 'Execution will stop at this node.' });
  });
  const start = triggers[0];
  if (start) {
    const reachable = new Set();
    const visit = id => {
      if (!id || reachable.has(id)) return;
      reachable.add(id);
      const node = state.nodes.find(item => item.id === id);
      if (!node) return;
      visit(node.successNext); visit(node.failureNext);
    };
    visit(start.id);
    state.nodes.filter(node => !reachable.has(node.id)).forEach(node => findings.push({ tone: 'warning', title: `${node.name} is unreachable`, detail: 'Connect it to the trigger path or remove it.' }));
  }
  if (!findings.length) findings.push({ tone: 'success', title: 'Workflow is executable', detail: 'All nodes are reachable and required destinations are configured.' });
  return findings;
}

function evaluateCondition(expression, simulation) {
  const match = String(expression).match(/^\s*(confidence)\s*(>=|<=|>|<|==)\s*(0(?:\.\d+)?|1(?:\.0+)?)\s*$/i);
  if (!match) return { valid: false, result: false, message: 'Use a condition like confidence >= 0.80.' };
  const left = Number(simulation.confidence), right = Number(match[3]);
  const result = ({ '>=': left >= right, '<=': left <= right, '>': left > right, '<': left < right, '==': left === right })[match[2]];
  return { valid: true, result, message: `confidence ${left.toFixed(2)} ${match[2]} ${right.toFixed(2)} is ${result}` };
}

function exportMarkdown(state) {
  const lines = [`# ${state.name}`, '', '## Nodes'];
  state.nodes.forEach((node, index) => {
    const success = state.nodes.find(item => item.id === node.successNext)?.name || 'stop';
    const failure = state.nodes.find(item => item.id === node.failureNext)?.name || 'stop';
    lines.push(`${index + 1}. **${node.name}** (${node.type})`, `   - Instructions: ${node.instructions}`, `   - Timeout: ${node.timeout}s`, `   - Retries: ${node.retries}`, `   - Success: ${success}`, `   - Failure: ${failure}`);
  });
  return lines.join('\n');
}

export function createWorkflowDesigner({ stage, toast }) {
  stage.innerHTML = `<section class="tool-product workflow-product" style="--tool-bg:#171226;--tool-text:#f4efff;--tool-line:#44385a;--tool-accent:#a78bfa;--tool-panel:#211832;--tool-control:#171226;--tool-muted:#b9a9cb">
    <header class="tool-product__toolbar"><div><h2>Agent Workflow Designer</h2><p>Configure real success and failure routes, validate the graph, pause for approvals, and export reusable workflow JSON.</p></div>
      <button data-action="new">New</button><button data-action="undo">Undo</button><button data-action="redo">Redo</button><button data-action="validate">Validate</button>
      <button data-action="run" class="primary">Run</button><button data-action="stop" disabled>Stop</button><button data-action="save">Save</button><button data-action="load">Load</button><button data-action="import">Import</button><button data-action="export">Export</button>
    </header>
    <div class="tool-product__workspace tool-split-3 workflow-layout">
      <aside class="tool-panel workflow-library"><h3 class="tool-panel__heading">NODE LIBRARY</h3>${Object.entries(nodeTypes).map(([type, spec]) => `<button data-add-node="${type}" style="--node:${spec.color}"><i>${spec.icon}</i><span><b>${spec.name}</b><small>${type}</small></span></button>`).join('')}</aside>
      <main class="workflow-main"><div class="workflow-canvas" data-canvas><div class="tool-empty">Add nodes from the library. Select a node to configure its instructions and routes.</div></div></main>
      <aside class="tool-panel tool-inspector workflow-trace"><section><h3>PROJECT</h3><label>Name<input data-project-name></label><div class="tool-field-grid"><label>Confidence<input data-sim-field="confidence" type="number" min="0" max="1" step="0.01"></label><label>Force failure<select data-sim-field="forcedFailureId"></select></label></div><label>Initial context<textarea data-sim-field="context" rows="3"></textarea></label></section><section><h3>SELECTED NODE</h3><div data-inspector><p>Select a node.</p></div></section><section><h3>VALIDATION</h3><div data-findings></div></section><section><h3>EXECUTION TRACE</h3><ol data-log><li>Ready.</li></ol></section></aside>
    </div>
    <footer class="tool-product__statusbar"><span data-status>Ready.</span><span style="margin-left:auto" data-run-metrics>0 nodes · 0 estimated context tokens</span></footer>
    <div class="tool-modal" data-import-modal hidden><div class="tool-modal__card"><h3>Import workflow JSON</h3><textarea class="tool-code" data-import-text rows="16"></textarea><div class="tool-button-row"><button data-action="apply-import" class="primary">Import</button><button data-action="close-import">Cancel</button></div><div data-import-error></div></div></div>
    <div class="tool-modal" data-approval-modal hidden><div class="tool-modal__card"><h3>Human approval required</h3><p data-approval-copy></p><div class="tool-button-row"><button data-approval="approve" class="primary">Approve and continue</button><button data-approval="reject" class="danger">Reject</button></div></div></div>
  </section>`;
  const storage = createStorage('game-testing:workflow-designer:v2');
  let history, running = false, stopRequested = false, approvalResolver = null;
  const canvas = qs(stage, '[data-canvas]');
  const setStatus = text => { qs(stage, '[data-status]').textContent = text; };
  const current = () => history.current();
  function updateButtons(status = history.status()) {
    qs(stage, '[data-action="undo"]').disabled = !status.canUndo || running;
    qs(stage, '[data-action="redo"]').disabled = !status.canRedo || running;
    qs(stage, '[data-action="run"]').disabled = running;
    qs(stage, '[data-action="stop"]').disabled = !running;
  }
  function renderCanvas(state) {
    if (!state.nodes.length) { canvas.innerHTML = '<div class="tool-empty"><strong>No workflow yet.</strong><br>Add a trigger, processing nodes, routes, and an output.</div>'; return; }
    canvas.innerHTML = state.nodes.map(node => {
      const spec = nodeTypes[node.type];
      const success = state.nodes.find(item => item.id === node.successNext)?.name || 'STOP';
      const failure = state.nodes.find(item => item.id === node.failureNext)?.name || 'STOP';
      return `<article draggable="true" data-node-id="${node.id}" class="${node.type}${state.selectedId === node.id ? ' selected' : ''}" style="--node:${spec.color}"><i>${spec.icon}</i><span><b>${escapeHtml(node.name)}</b><small>${escapeHtml(node.type)} · ${node.timeout}s · ${node.retries} retries</small><em>✓ ${escapeHtml(success)}${node.failureNext ? ` · ✕ ${escapeHtml(failure)}` : ''}</em></span><div><button data-move="up" aria-label="Move earlier">←</button><button data-move="down" aria-label="Move later">→</button><button data-delete-node aria-label="Delete node">×</button></div></article>`;
    }).join('');
  }
  function renderInspector(state) {
    qs(stage, '[data-project-name]').value = state.name;
    qs(stage, '[data-sim-field="confidence"]').value = state.simulation.confidence;
    qs(stage, '[data-sim-field="context"]').value = state.simulation.context;
    qs(stage, '[data-sim-field="forcedFailureId"]').innerHTML = `<option value="">No forced failure</option>${state.nodes.map(node => `<option value="${node.id}" ${state.simulation.forcedFailureId === node.id ? 'selected' : ''}>${escapeHtml(node.name)}</option>`).join('')}`;
    qs(stage, '[data-run-metrics]').textContent = `${state.nodes.length} nodes · ${state.nodes.filter(node => ['agent', 'tool', 'transform'].includes(node.type)).length * 640} estimated context tokens`;
    const node = state.nodes.find(item => item.id === state.selectedId);
    const inspector = qs(stage, '[data-inspector]');
    if (!node) inspector.innerHTML = '<p>Select a node to configure its behavior and routing.</p>';
    else inspector.innerHTML = `<label>Name<input data-node-field="name" value="${escapeHtml(node.name)}"></label><label>Instructions<textarea data-node-field="instructions" rows="4">${escapeHtml(node.instructions)}</textarea></label><div class="tool-field-grid"><label>Timeout seconds<input data-node-field="timeout" type="number" min="1" max="600" value="${node.timeout}"></label><label>Retries<input data-node-field="retries" type="number" min="0" max="8" value="${node.retries}"></label></div><label>Simulated outcome<select data-node-field="outcome"><option value="auto" ${node.outcome === 'auto' ? 'selected' : ''}>Automatic</option><option value="pass" ${node.outcome === 'pass' ? 'selected' : ''}>Always pass</option><option value="fail" ${node.outcome === 'fail' ? 'selected' : ''}>Always fail</option></select></label><div class="tool-field-grid"><label>${node.type === 'branch' ? 'True route' : 'Success route'}<select data-node-field="successNext"><option value="">Stop</option>${state.nodes.filter(item => item.id !== node.id).map(item => `<option value="${item.id}" ${node.successNext === item.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label><label>${node.type === 'branch' ? 'False route' : 'Failure route'}<select data-node-field="failureNext"><option value="">Stop</option>${state.nodes.filter(item => item.id !== node.id).map(item => `<option value="${item.id}" ${node.failureNext === item.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select></label></div>`;
    qs(stage, '[data-findings]').innerHTML = validateWorkflow(state).map(item => `<div class="tool-notice" data-tone="${item.tone}"><strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.detail)}</div>`).join('');
    updateButtons();
  }
  function render(state) { normalizeConnections(state); renderCanvas(state); renderInspector(state); }
  history = createHistory(initialState(), (state, status) => { render(state); updateButtons(status); });
  render(current());
  function commit(mutator, message = 'Workflow updated.') { if (running) return; const state = current(); mutator(state); normalizeConnections(state); history.push(state); setStatus(message); }
  function addNode(type) { commit(state => { const node = createNode(type, state.nodes.length); const prior = state.nodes.at(-1); if (prior && prior.type !== 'output' && !prior.successNext) prior.successNext = node.id; state.nodes.push(node); state.selectedId = node.id; }, `${nodeTypes[type].name} added.`); }
  function importWorkflow(text) {
    const { value: parsed, error } = safeJsonParse(text);
    if (error || !parsed || !Array.isArray(parsed.nodes)) throw new Error('Expected an object with a nodes array.');
    const state = initialState();
    state.name = String(parsed.name || 'Imported workflow').slice(0, 80);
    state.nodes = parsed.nodes.map((node, index) => {
      if (!nodeTypes[node.type]) throw new Error(`Unsupported node type: ${node.type}`);
      return { ...createNode(node.type, index), ...node, id: String(node.id || uid(node.type)), retries: Math.max(0, Number(node.retries) || 0), timeout: Math.max(1, Number(node.timeout) || 1) };
    });
    state.simulation = { ...state.simulation, ...(parsed.simulation || {}) };
    state.selectedId = state.nodes[0]?.id || null;
    normalizeConnections(state); history.reset(state); setStatus('Imported workflow loaded.');
  }
  function log(message, tone = '') {
    const list = qs(stage, '[data-log]');
    list.insertAdjacentHTML('beforeend', `<li data-tone="${tone}"><time>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time> ${escapeHtml(message)}</li>`);
    list.scrollTop = list.scrollHeight;
  }
  async function requestApproval(node, context) {
    const modal = qs(stage, '[data-approval-modal]');
    qs(stage, '[data-approval-copy]').textContent = `${node.name}: ${node.instructions}\n\nCurrent context: ${context.slice(-240)}`;
    modal.hidden = false;
    return new Promise(resolve => { approvalResolver = result => { modal.hidden = true; approvalResolver = null; resolve(result); }; });
  }
  async function runWorkflow() {
    const state = current();
    const blockers = validateWorkflow(state).filter(item => item.tone === 'danger');
    if (blockers.length) return toast(`Fix ${blockers.length} blocking workflow issue${blockers.length === 1 ? '' : 's'} first.`);
    running = true; stopRequested = false; updateButtons();
    qsa(stage, '[data-node-id]').forEach(element => element.classList.remove('running', 'passed', 'failed', 'warning'));
    qs(stage, '[data-log]').innerHTML = '';
    let context = state.simulation.context;
    let currentId = state.nodes.find(node => node.type === 'trigger')?.id;
    const visited = new Map(), runRecord = [];
    setStatus('Workflow running…');
    while (currentId && !stopRequested) {
      const node = state.nodes.find(item => item.id === currentId);
      if (!node) break;
      visited.set(node.id, (visited.get(node.id) || 0) + 1);
      if (visited.get(node.id) > 5) { log(`Stopped: loop protection triggered at ${node.name}.`, 'danger'); break; }
      const element = qs(stage, `[data-node-id="${node.id}"]`);
      element?.classList.add('running'); setStatus(`Running ${node.name}…`); log(`Started ${node.name}.`);
      let passed = true, detail = '';
      if (node.type === 'branch') {
        const result = evaluateCondition(node.instructions, state.simulation); passed = result.valid && result.result; detail = result.message; log(result.message, result.valid ? 'info' : 'danger');
      } else if (node.type === 'approval') {
        passed = await requestApproval(node, context); detail = passed ? 'Approved by user' : 'Rejected by user'; log(detail, passed ? 'success' : 'danger');
      } else {
        let attempt = 0; passed = false;
        while (attempt <= node.retries && !passed && !stopRequested) {
          attempt += 1; await wait(Math.min(900, 160 + node.timeout * 12));
          const forced = state.simulation.forcedFailureId === node.id;
          passed = node.outcome === 'pass' || (node.outcome === 'auto' && !forced);
          detail = passed ? `Completed on attempt ${attempt}` : `Attempt ${attempt} failed`;
          log(`${node.name}: ${detail}.`, passed ? 'success' : 'warning');
          if (!passed && attempt <= node.retries) await wait(220 * attempt);
        }
        if (passed) context += `\n[${node.name}] ${node.instructions}`;
      }
      element?.classList.remove('running'); element?.classList.add(passed ? 'passed' : 'failed');
      runRecord.push({ nodeId: node.id, node: node.name, passed, detail, at: new Date().toISOString() });
      if (node.type === 'output' && passed) { log('Verified output published.', 'success'); currentId = ''; }
      else currentId = passed ? node.successNext : node.failureNext;
      if (!currentId && node.type !== 'output') log(`${node.name} ended the workflow because no ${passed ? 'success' : 'failure'} route is configured.`, 'warning');
    }
    if (stopRequested) log('Run stopped by user.', 'warning');
    running = false; stopRequested = false; updateButtons();
    state.lastRun = { at: new Date().toISOString(), context, trace: runRecord };
    history.replace(state); setStatus(`Run finished: ${runRecord.length} nodes visited.`); toast('Workflow run finished');
  }
  let draggedId = null;
  stage.addEventListener('dragstart', event => { const node = event.target.closest('[data-node-id]'); if (node) { draggedId = node.dataset.nodeId; event.dataTransfer.effectAllowed = 'move'; } });
  stage.addEventListener('dragover', event => { if (event.target.closest('[data-node-id]')) event.preventDefault(); });
  stage.addEventListener('drop', event => {
    const target = event.target.closest('[data-node-id]');
    if (!target || !draggedId || target.dataset.nodeId === draggedId) return;
    event.preventDefault();
    commit(state => { const from = state.nodes.findIndex(node => node.id === draggedId), to = state.nodes.findIndex(node => node.id === target.dataset.nodeId); const [moved] = state.nodes.splice(from, 1); state.nodes.splice(to, 0, moved); }, 'Node reordered.');
    draggedId = null;
  });
  stage.addEventListener('change', event => {
    const field = event.target.dataset.nodeField;
    if (field) return commit(state => { const node = state.nodes.find(item => item.id === state.selectedId); if (!node) return; node[field] = ['timeout', 'retries'].includes(field) ? Math.max(field === 'timeout' ? 1 : 0, Number(event.target.value) || 0) : event.target.value; }, 'Node configuration updated.');
    const simField = event.target.dataset.simField;
    if (simField) return commit(state => { state.simulation[simField] = simField === 'confidence' ? Math.min(1, Math.max(0, Number(event.target.value) || 0)) : event.target.value; }, 'Simulation input updated.');
  });
  stage.addEventListener('input', event => {
    if (event.target.matches('[data-project-name]')) { const state = current(); state.name = event.target.value; history.replace(state); }
    if (event.target.matches('[data-sim-field="context"]')) { const state = current(); state.simulation.context = event.target.value; history.replace(state); }
    if (event.target.matches('[data-node-field="name"],[data-node-field="instructions"]')) { const state = current(); const node = state.nodes.find(item => item.id === state.selectedId); if (!node) return; node[event.target.dataset.nodeField] = event.target.value; history.replace(state); }
  });
  stage.addEventListener('click', async event => {
    const add = event.target.closest('[data-add-node]'); if (add) return addNode(add.dataset.addNode);
    const nodeElement = event.target.closest('[data-node-id]');
    if (nodeElement && !event.target.closest('button')) { const state = current(); state.selectedId = nodeElement.dataset.nodeId; history.replace(state); return; }
    if (event.target.closest('[data-delete-node]')) return commit(state => { const id = event.target.closest('[data-node-id]').dataset.nodeId; state.nodes = state.nodes.filter(node => node.id !== id); state.nodes.forEach(node => { if (node.successNext === id) node.successNext = ''; if (node.failureNext === id) node.failureNext = ''; }); state.selectedId = state.nodes[0]?.id || null; }, 'Node deleted.');
    const move = event.target.closest('[data-move]');
    if (move) return commit(state => { const id = move.closest('[data-node-id]').dataset.nodeId, index = state.nodes.findIndex(node => node.id === id), delta = move.dataset.move === 'up' ? -1 : 1, target = index + delta; if (target < 0 || target >= state.nodes.length) return; [state.nodes[index], state.nodes[target]] = [state.nodes[target], state.nodes[index]]; }, 'Node reordered.');
    const approval = event.target.closest('[data-approval]'); if (approval && approvalResolver) return approvalResolver(approval.dataset.approval === 'approve');
    const action = event.target.closest('[data-action]')?.dataset.action; if (!action) return;
    if (action === 'new') { if (current().nodes.length && !confirm('Start a new workflow and discard unsaved changes?')) return; history.reset(initialState()); setStatus('New workflow ready.'); }
    else if (action === 'undo') history.undo();
    else if (action === 'redo') history.redo();
    else if (action === 'validate') { const blockers = validateWorkflow(current()).filter(item => item.tone === 'danger').length; toast(blockers ? `${blockers} blocking issue${blockers === 1 ? '' : 's'}` : 'Workflow validation passed'); }
    else if (action === 'run') runWorkflow();
    else if (action === 'stop') { stopRequested = true; approvalResolver?.(false); setStatus('Stopping after current step…'); }
    else if (action === 'save') { storage.save(current()); toast('Workflow saved locally'); setStatus('Workflow saved in this browser.'); }
    else if (action === 'load') { const saved = storage.load(); if (!saved) return toast('No saved workflow found.'); try { importWorkflow(JSON.stringify(saved)); toast('Saved workflow loaded'); } catch (error) { toast(error.message); } }
    else if (action === 'import') qs(stage, '[data-import-modal]').hidden = false;
    else if (action === 'close-import') qs(stage, '[data-import-modal]').hidden = true;
    else if (action === 'apply-import') { const box = qs(stage, '[data-import-error]'); try { importWorkflow(qs(stage, '[data-import-text]').value); box.innerHTML = ''; qs(stage, '[data-import-modal]').hidden = true; toast('Workflow imported'); } catch (error) { box.innerHTML = `<div class="tool-notice" data-tone="danger">${escapeHtml(error.message)}</div>`; } }
    else if (action === 'export') { const state = current(); downloadText('agent-workflow.json', JSON.stringify(state, null, 2)); downloadText('agent-workflow.md', exportMarkdown(state), 'text/markdown'); try { await copyText(JSON.stringify(state, null, 2)); } catch {} toast('Workflow JSON and Markdown exported'); }
  });
  return controllerForDom(stage, () => history.reset(initialState()), () => approvalResolver?.(false), 'AGENT WORKFLOW PRODUCT', () => `${current().nodes.length} configured nodes`);
}
