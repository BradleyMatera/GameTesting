import { basicScene, ground, box, label, createAgent, createDesk } from '../../core/scene.js';
import { appendLog, clamp, createRunGuard, escapeHtml, qs, qsa, uid } from './simulation-utils.js';

const departments = {
  research: { label: 'Research', color: '#8b5cf6', position: [-9, 0, -5] },
  build: { label: 'Build', color: '#38bdf8', position: [0, 0, -5] },
  review: { label: 'Review', color: '#f59e0b', position: [9, 0, -5] },
  delivery: { label: 'Delivery', color: '#34d399', position: [0, 0, 6] },
};
const agentDefinitions = [
  { id: 'derek', name: 'Derek', role: 'Research lead', color: '#8b5cf6', skills: ['research', 'review'], home: [-10, 0, -1] },
  { id: 'maya', name: 'Maya', role: 'Frontend builder', color: '#38bdf8', skills: ['build', 'delivery'], home: [-3, 0, -1] },
  { id: 'frank', name: 'Frank', role: 'Classifier', color: '#22c55e', skills: ['research', 'build'], home: [3, 0, -1] },
  { id: 'nora', name: 'Nora', role: 'Evidence reviewer', color: '#f59e0b', skills: ['review', 'delivery'], home: [9, 0, -1] },
];
const initialTasks = [
  ['Verify employer source', 2], ['Build recruiter evidence view', 3], ['Classify project question', 1],
  ['Review provider fallback', 2], ['Generate release notes', 1], ['Test mobile flow', 2],
  ['Resolve evidence conflict', 3], ['Publish verified artifact', 2],
];

function makeTask(title, complexity = 2) {
  return {
    id: uid('task'), title, complexity: clamp(Number(complexity) || 2, 1, 5),
    workflow: ['research', 'build', 'review', 'delivery'], phaseIndex: 0,
    state: 'queued', agentId: null, remaining: 0, elapsed: 0, blockedReason: '',
    startedAt: null, completedAt: null,
  };
}

export async function createAgentOperations({ stage, toast }) {
  stage.innerHTML = `<section class="game-root sim-product agent-office" style="--sim-accent:#8b5cf6;--sim-panel:#071323;--sim-muted:#a9b7c8">
    <canvas aria-label="3D agent operations office"></canvas>
    <div class="agent-ops-hud">
      <section><span>LIVE OPERATIONS SIMULATION</span><strong>Agent Operations Center</strong><p data-ops-status>The shift is paused. Tasks will move through research, build, review, and delivery based on agent skills.</p></section>
      <aside class="agent-ops-control sim-glass">
        <div class="sim-kpis">
          <div class="sim-kpi"><span>QUEUED</span><strong data-queue>0</strong></div>
          <div class="sim-kpi"><span>ACTIVE</span><strong data-active>0</strong></div>
          <div class="sim-kpi"><span>BLOCKED</span><strong data-blocked>0</strong></div>
          <div class="sim-kpi"><span>DONE</span><strong data-done>0</strong></div>
          <div class="sim-kpi"><span>UTILIZATION</span><strong data-utilization>0%</strong></div>
        </div>
        <div class="sim-actions"><button data-action="start" class="primary">Start shift</button><button data-action="pause">Pause</button><button data-action="step">Run one cycle</button><button data-action="block" class="danger">Inject blocker</button><button data-action="resolve">Resolve blocker</button></div>
        <div class="sim-field-grid"><label>New task<input data-new-task value="Prepare verified recruiter summary"></label><label>Complexity<select data-complexity><option value="1">1 · quick</option><option value="2" selected>2 · normal</option><option value="3">3 · involved</option><option value="4">4 · large</option><option value="5">5 · critical</option></select></label></div>
        <div class="sim-field-grid"><button data-action="add-task">Add task</button><label>Cycle speed<select data-speed><option value="1400">Slow</option><option value="850" selected>Normal</option><option value="420">Fast</option></select></label></div>
      </aside>
      <section class="agent-detail sim-glass"><h3>SELECTED AGENT</h3><div data-agent-detail>Select an agent in the office or the roster.</div><div data-roster></div></section>
      <ol class="sim-log sim-glass" data-log><li><time>--:--:--</time> Office ready.</li></ol>
    </div>
  </section>`;

  const canvas = qs(stage, 'canvas');
  const ctx = basicScene(canvas, { clear: '#07101bff', radius: 23, target: [0, 2, 0], bloomWeight: .12 });
  const { scene, BABYLON, camera } = ctx;
  ground(scene, { width: 34, height: 24, color: '#d9e0e7' });
  box(scene, 'carpet', [16, .03, 12], [0, .035, 0], '#1e3a5f', { roughness: .95 });
  Object.entries(departments).forEach(([id, department]) => {
    box(scene, `pad-${id}`, [7, .08, 5], [department.position[0], .05, department.position[2]], department.color, { emissive: department.color, emissiveIntensity: .08, roughness: .9 });
    label(scene, department.label.toUpperCase(), [department.position[0], 4.7, department.position[2]], { width: 3.7, height: .7, fontSize: 54, border: department.color });
  });
  [[-9,-5],[-6,-5],[0,-5],[3,-5],[9,-5],[6,-5],[-2,6],[2,6]].forEach((position, index) => createDesk(scene, [position[0], 0, position[1]], { name: `desk-${index}`, rotation: index < 6 ? 0 : Math.PI, screen: ['#a78bfa','#67e8f9','#34d399','#fbbf24'][index % 4] }));

  const agents = agentDefinitions.map(definition => {
    const node = createAgent(scene, definition.home, { name: `agent-${definition.name}`, color: definition.color, accent: definition.color });
    const agent = { ...definition, node, state: 'idle', taskId: null, busyCycles: 0, totalCycles: 0 };
    node.getChildMeshes().forEach(mesh => { mesh.isPickable = true; mesh.metadata = { agentId: agent.id }; });
    label(scene, `${definition.name.toUpperCase()} · ${definition.role.toUpperCase()}`, [definition.home[0], 3.5, definition.home[2]], { width: 4.2, height: .65, fontSize: 40, border: definition.color });
    return agent;
  });

  const guard = createRunGuard();
  let tasks = initialTasks.map(([title, complexity]) => makeTask(title, complexity));
  let completed = [];
  let selectedAgentId = agents[0].id;
  let running = false;
  let timer = null;
  let cycle = 0;

  const taskForAgent = agent => tasks.find(task => task.id === agent.taskId);
  const phaseFor = task => task.workflow[task.phaseIndex];
  const moveAgent = (agent, departmentId) => {
    const target = departments[departmentId]?.position || agent.home;
    BABYLON.Animation.CreateAndStartAnimation(`move-${agent.id}-${cycle}`, agent.node, 'position', 30, 28, agent.node.position.clone(), new BABYLON.Vector3(target[0], 0, target[2]), BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
  };
  function releaseAgent(agent) {
    agent.state = 'idle';
    agent.taskId = null;
    moveAgent(agent, null);
  }
  function assignWork() {
    for (const agent of agents) {
      if (agent.state !== 'idle') continue;
      const task = tasks.find(candidate => candidate.state === 'queued' && agent.skills.includes(phaseFor(candidate)));
      if (!task) continue;
      task.state = 'active';
      task.agentId = agent.id;
      task.startedAt ||= Date.now();
      task.remaining = task.complexity + task.phaseIndex;
      agent.state = 'working';
      agent.taskId = task.id;
      moveAgent(agent, phaseFor(task));
      appendLog(stage, '[data-log]', `${agent.name} started ${phaseFor(task)} for “${task.title}”.`);
    }
  }
  function processWork() {
    for (const agent of agents) {
      agent.totalCycles += 1;
      const task = taskForAgent(agent);
      if (!task || agent.state === 'idle') continue;
      agent.busyCycles += 1;
      task.elapsed += 1;
      if (task.state === 'blocked') continue;
      task.remaining -= 1;
      if (task.remaining > 0) continue;
      const completedPhase = phaseFor(task);
      task.phaseIndex += 1;
      task.agentId = null;
      releaseAgent(agent);
      if (task.phaseIndex >= task.workflow.length) {
        task.state = 'done';
        task.completedAt = Date.now();
        tasks = tasks.filter(item => item.id !== task.id);
        completed.push(task);
        appendLog(stage, '[data-log]', `Delivered “${task.title}” after ${task.elapsed} cycles.`, 'success');
      } else {
        task.state = 'queued';
        appendLog(stage, '[data-log]', `${completedPhase} finished for “${task.title}”; queued for ${phaseFor(task)}.`);
      }
    }
  }
  function runCycle() {
    cycle += 1;
    processWork();
    assignWork();
    if (!tasks.length && agents.every(agent => agent.state === 'idle')) {
      pause();
      appendLog(stage, '[data-log]', 'Shift complete. Every queued task was delivered.', 'success');
      toast('Agent shift completed');
    }
    render();
  }
  function start() {
    if (running) return;
    running = true;
    const token = guard.begin();
    const schedule = () => {
      if (!guard.active(token) || !running) return;
      runCycle();
      timer = setTimeout(schedule, Number(qs(stage, '[data-speed]').value));
    };
    schedule();
    render();
  }
  function pause() {
    running = false;
    guard.cancel();
    clearTimeout(timer);
    timer = null;
    render();
  }
  function selectedAgent() { return agents.find(agent => agent.id === selectedAgentId) || agents[0]; }
  function injectBlocker() {
    const agent = selectedAgent();
    const task = taskForAgent(agent) || tasks.find(item => item.state === 'active');
    if (!task) return toast('Select a working agent before injecting a blocker.');
    task.state = 'blocked';
    task.blockedReason = phaseFor(task) === 'review' ? 'Evidence conflict requires a decision.' : 'Required dependency is unavailable.';
    const owner = agents.find(item => item.id === task.agentId);
    if (owner) owner.state = 'blocked';
    appendLog(stage, '[data-log]', `Blocker injected on “${task.title}”: ${task.blockedReason}`, 'danger');
    render();
  }
  function resolveBlocker() {
    const agent = selectedAgent();
    const task = taskForAgent(agent) || tasks.find(item => item.state === 'blocked');
    if (!task || task.state !== 'blocked') return toast('No blocked task is selected.');
    task.state = 'active';
    task.blockedReason = '';
    const owner = agents.find(item => item.id === task.agentId);
    if (owner) owner.state = 'working';
    appendLog(stage, '[data-log]', `Blocker resolved for “${task.title}”.`, 'success');
    render();
  }
  function render() {
    const queued = tasks.filter(task => task.state === 'queued').length;
    const active = tasks.filter(task => task.state === 'active').length;
    const blocked = tasks.filter(task => task.state === 'blocked').length;
    const busy = agents.filter(agent => agent.state !== 'idle').length;
    qs(stage, '[data-queue]').textContent = queued;
    qs(stage, '[data-active]').textContent = active;
    qs(stage, '[data-blocked]').textContent = blocked;
    qs(stage, '[data-done]').textContent = completed.length;
    qs(stage, '[data-utilization]').textContent = `${Math.round(busy / agents.length * 100)}%`;
    qs(stage, '[data-ops-status]').textContent = running
      ? `${busy} agents are processing cycle ${cycle}. ${tasks.length} tasks remain in the system.`
      : tasks.length ? `Shift paused with ${tasks.length} tasks preserved.` : 'Shift complete. No tasks remain.';
    const selected = selectedAgent();
    const selectedTask = taskForAgent(selected);
    qs(stage, '[data-agent-detail]').innerHTML = `<div class="sim-notice" data-tone="${selected.state === 'blocked' ? 'danger' : selected.state === 'working' ? 'success' : ''}"><strong>${escapeHtml(selected.name)} · ${escapeHtml(selected.role)}</strong><br>State: ${selected.state}<br>Skills: ${selected.skills.map(skill => departments[skill].label).join(', ')}${selectedTask ? `<br>Task: ${escapeHtml(selectedTask.title)}<br>Phase: ${departments[phaseFor(selectedTask)].label}<br>Remaining: ${selectedTask.remaining} cycles${selectedTask.blockedReason ? `<br>Blocker: ${escapeHtml(selectedTask.blockedReason)}` : ''}` : '<br>No assigned task.'}</div>`;
    qs(stage, '[data-roster]').innerHTML = agents.map(agent => {
      const task = taskForAgent(agent);
      const utilization = agent.totalCycles ? Math.round(agent.busyCycles / agent.totalCycles * 100) : 0;
      return `<div class="agent-row"><button data-select-agent="${agent.id}" style="border-color:${agent.color}">${escapeHtml(agent.name)}</button><span>${agent.state}${task ? ` · ${escapeHtml(task.title)}` : ''} · ${utilization}% utilized</span></div>`;
    }).join('');
    qsa(stage, '[data-action="start"]').forEach(button => { button.disabled = running || !tasks.length; });
    qs(stage, '[data-action="pause"]').disabled = !running;
    qs(stage, '[data-action="resolve"]').disabled = !tasks.some(task => task.state === 'blocked');
  }
  function reset() {
    pause();
    cycle = 0;
    tasks = initialTasks.map(([title, complexity]) => makeTask(title, complexity));
    completed = [];
    selectedAgentId = agents[0].id;
    agents.forEach(agent => {
      agent.state = 'idle'; agent.taskId = null; agent.busyCycles = 0; agent.totalCycles = 0;
      agent.node.position.set(agent.home[0], agent.home[1], agent.home[2]);
    });
    qs(stage, '[data-log]').innerHTML = '<li><time>--:--:--</time> Office reset.</li>';
    render();
  }

  stage.addEventListener('click', event => {
    const select = event.target.closest('[data-select-agent]');
    if (select) { selectedAgentId = select.dataset.selectAgent; render(); return; }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'start') start();
    else if (action === 'pause') pause();
    else if (action === 'step') { if (!running) runCycle(); }
    else if (action === 'block') injectBlocker();
    else if (action === 'resolve') resolveBlocker();
    else if (action === 'add-task') {
      const title = qs(stage, '[data-new-task]').value.trim();
      if (!title) return toast('Enter a task name.');
      tasks.push(makeTask(title, Number(qs(stage, '[data-complexity]').value)));
      appendLog(stage, '[data-log]', `Queued new task: “${title}”.`);
      render();
    }
  });
  const pointerObserver = scene.onPointerObservable.add(event => {
    if (event.type !== BABYLON.PointerEventTypes.POINTERPICK) return;
    const agentId = event.pickInfo?.pickedMesh?.metadata?.agentId;
    if (!agentId) return;
    selectedAgentId = agentId;
    const agent = selectedAgent();
    camera.setTarget(agent.node.position.add(new BABYLON.Vector3(0, 1.4, 0)));
    render();
  });
  render();
  return {
    dispose() { pause(); scene.onPointerObservable.remove(pointerObserver); ctx.dispose(); },
    reset,
    getStats() { return { ...ctx.stats('3D AGENT OPERATIONS'), scene: `${agents.length} agents · ${tasks.length} open tasks · ${completed.length} delivered` }; },
  };
}
