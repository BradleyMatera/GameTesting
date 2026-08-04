import { basicScene, ground, sphere, label, createServerRack, pulse } from '../../core/scene.js';
import { appendLog, createRunGuard, escapeHtml, qs, qsa } from './simulation-utils.js';

const scenarios = {
  'db-pool': {
    name: 'Checkout latency spike', severity: 'SEV-2', component: 'payments-db', rack: '1-3', correctRepair: 'pool-index',
    summary: 'Checkout p95 is rising while connection acquisition errors increase.',
    metrics: { latency: 2814, errorRate: 7.4, saturation: 98, throughput: 42 },
    degradation: { latency: 180, errorRate: .55, saturation: .3, throughput: -2 },
    evidence: {
      metrics: 'p95 latency: {latency}ms\nDB CPU: {saturation}%\nconnection pool: 100/100\ncheckout throughput: {throughput}/min',
      logs: 'timeout acquiring DB connection\nretry attempt 3\npool exhausted\ncheckout request cancelled',
      traces: 'EDGE → API → CHECKOUT WORKER → PAYMENTS DB\n92% of request time is waiting for a DB connection.',
      health: 'payments-db: degraded\ncheckout-worker: healthy\nqueue: healthy\nedge: healthy',
    },
  },
  'cache-stampede': {
    name: 'Catalog cache stampede', severity: 'SEV-2', component: 'catalog-cache', rack: '0-1', correctRepair: 'warm-cache',
    summary: 'A cache flush caused every catalog request to hit the origin database.',
    metrics: { latency: 1640, errorRate: 3.1, saturation: 94, throughput: 95 },
    degradation: { latency: 120, errorRate: .3, saturation: .5, throughput: -1 },
    evidence: {
      metrics: 'catalog p95: {latency}ms\norigin CPU: {saturation}%\ncache hit rate: 2%\nthroughput: {throughput}/min',
      logs: 'cache key namespace invalidated\nmiss ratio exceeded 95%\norigin read timeout\nrequest coalescing disabled',
      traces: 'EDGE → CATALOG API → CACHE MISS → ORIGIN DB\nDuplicate origin reads dominate the trace.',
      health: 'catalog-cache: critical\norigin-db: overloaded\napi: degraded\nedge: healthy',
    },
  },
  'queue-backlog': {
    name: 'Fulfillment queue backlog', severity: 'SEV-3', component: 'worker-pool', rack: '1-1', correctRepair: 'scale-workers',
    summary: 'Orders are accepted, but fulfillment events are waiting too long for workers.',
    metrics: { latency: 4200, errorRate: .8, saturation: 100, throughput: 18 },
    degradation: { latency: 260, errorRate: .08, saturation: 0, throughput: -1 },
    evidence: {
      metrics: 'oldest message: {latency}ms\nworker utilization: {saturation}%\nfailed jobs: {errorRate}%\nthroughput: {throughput}/min',
      logs: 'worker lease unavailable\nvisibility timeout extended\njob returned to queue\nautoscaling maximum reached',
      traces: 'ORDER API → QUEUE → WORKER POOL → SHIPPING API\nQueue wait accounts for 88% of total duration.',
      health: 'queue: backlog\nworker-pool: saturated\nshipping-api: healthy\norder-api: healthy',
    },
  },
  'expired-cert': {
    name: 'Expired integration certificate', severity: 'SEV-1', component: 'edge-gateway', rack: '0-0', correctRepair: 'renew-cert',
    summary: 'Partner API calls fail TLS validation after a certificate expiration.',
    metrics: { latency: 980, errorRate: 62, saturation: 24, throughput: 8 },
    degradation: { latency: 15, errorRate: 1.2, saturation: 0, throughput: -.5 },
    evidence: {
      metrics: 'partner p95: {latency}ms\nTLS failures: {errorRate}%\ngateway CPU: {saturation}%\nthroughput: {throughput}/min',
      logs: 'x509: certificate has expired\nTLS handshake failed\npartner request rejected\nretry disabled for certificate errors',
      traces: 'EDGE GATEWAY ⇥ TLS HANDSHAKE FAILED\nNo request reached the partner service.',
      health: 'edge-gateway: critical\npartner-api: unknown\ninternal-api: healthy\nDNS: healthy',
    },
  },
};
const repairs = [
  ['pool-index', 'Expand DB pool and restore hot index'],
  ['warm-cache', 'Warm cache and enable request coalescing'],
  ['scale-workers', 'Raise worker limit and drain queue'],
  ['renew-cert', 'Rotate certificate and reload gateway'],
  ['restart-api', 'Restart API instances'],
];

function interpolate(template, metrics) {
  return template.replace(/\{(\w+)\}/g, (_, key) => Number.isFinite(metrics[key]) ? Number(metrics[key].toFixed(1)) : metrics[key]);
}

export async function createCloudIncident({ stage, toast }) {
  stage.innerHTML = `<section class="game-root sim-product incident-world" style="--sim-accent:#ff4d6d;--sim-panel:#16090f;--sim-muted:#d6aab5">
    <canvas aria-label="3D cloud incident data center"></canvas>
    <aside class="incident-console sim-glass">
      <header><span data-severity>SEV-2 · ACTIVE INCIDENT</span><strong data-title>Checkout latency spike</strong><p data-incident-status></p></header>
      <div class="sim-field-grid"><label>Incident scenario<select data-scenario>${Object.entries(scenarios).map(([id, scenario]) => `<option value="${id}">${scenario.name}</option>`).join('')}</select></label><label>Incident clock<strong class="sim-pill" data-clock>00:00</strong></label></div>
      <div class="sim-kpis incident-metrics"><div class="sim-kpi"><span>LATENCY</span><strong data-metric="latency">--</strong></div><div class="sim-kpi"><span>ERROR</span><strong data-metric="errorRate">--</strong></div><div class="sim-kpi"><span>SATURATION</span><strong data-metric="saturation">--</strong></div><div class="sim-kpi"><span>THROUGHPUT</span><strong data-metric="throughput">--</strong></div></div>
      <div class="runbook"><button data-diagnostic="metrics">Inspect metrics</button><button data-diagnostic="logs">Query logs</button><button data-diagnostic="traces">Trace requests</button><button data-diagnostic="health">Check dependencies</button></div>
      <div class="incident-evidence" data-evidence><div class="sim-notice">Collect at least two independent evidence sources before applying a repair.</div></div>
      <pre data-output>Select a diagnostic or click a rack in the data center.</pre>
      <div class="incident-repair"><select data-repair>${repairs.map(([id, labelText]) => `<option value="${id}">${labelText}</option>`).join('')}</select><button data-action="repair" class="primary" disabled>Apply repair</button></div>
      <div class="sim-actions" style="margin-top:.45rem"><button data-action="advance">Advance one minute</button><button data-action="restart">Restart incident</button></div>
      <ol class="sim-log incident-timeline" data-log><li><time>--:--:--</time> Incident opened.</li></ol>
    </aside>
  </section>`;

  const canvas = qs(stage, 'canvas');
  const ctx = basicScene(canvas, { clear: '#0d090dff', radius: 22, target: [0, 2.1, 0], bloomWeight: .16 });
  const { scene, BABYLON, camera } = ctx;
  ground(scene, { width: 34, height: 22, color: '#16111a' });
  const racks = [];
  for (let row = 0; row < 2; row += 1) {
    for (let index = 0; index < 5; index += 1) {
      const rackId = `${row}-${index}`;
      const rack = createServerRack(scene, [-10 + index * 5, 0, -4 + row * 8], { name: `rack-${rackId}`, frame: '#252636' });
      const metadata = { rackId, service: ['edge-gateway','catalog-cache','api','worker-pool','queue','edge','api','worker','payments-db','catalog'][row * 5 + index] };
      rack.getChildMeshes().forEach(mesh => { mesh.isPickable = true; mesh.metadata = metadata; });
      racks.push({ rack, metadata });
    }
  }
  const alert = sphere(scene, 'incident-alert', 1.1, [5, 6, 4], '#ff4d6d', { emissive: '#ff4d6d', emissiveIntensity: 1.3 });
  pulse(alert, scene, { range: .15, speed: 5 });
  const alertLabel = label(scene, 'ACTIVE INCIDENT', [5, 7.5, 4], { width: 4.2, height: .72, fontSize: 46, border: '#ff4d6d' });

  const guard = createRunGuard();
  let scenarioId = 'db-pool';
  let metrics = {};
  let evidence = new Set();
  let resolved = false;
  let wrongRepairs = 0;
  let seconds = 0;
  let timer = null;

  const scenario = () => scenarios[scenarioId];
  function positionAlert() {
    const target = racks.find(item => item.metadata.rackId === scenario().rack)?.rack;
    if (!target) return;
    alert.position.set(target.position.x, 6, target.position.z);
    alertLabel.position.set(target.position.x, 7.5, target.position.z);
  }
  function severityTone() {
    if (resolved) return '#34d399';
    if (scenario().severity === 'SEV-1' || wrongRepairs > 0) return '#ff3158';
    return '#ff4d6d';
  }
  function renderMetrics() {
    qs(stage, '[data-metric="latency"]').textContent = `${Math.round(metrics.latency)} ms`;
    qs(stage, '[data-metric="errorRate"]').textContent = `${Math.max(0, metrics.errorRate).toFixed(1)}%`;
    qs(stage, '[data-metric="saturation"]').textContent = `${Math.min(100, metrics.saturation).toFixed(0)}%`;
    qs(stage, '[data-metric="throughput"]').textContent = `${Math.max(0, metrics.throughput).toFixed(0)}/min`;
  }
  function render() {
    const current = scenario();
    qs(stage, '[data-severity]').textContent = `${resolved ? 'RESOLVED' : current.severity} · ${resolved ? 'RECOVERED' : 'ACTIVE INCIDENT'}`;
    qs(stage, '[data-title]').textContent = current.name;
    qs(stage, '[data-incident-status]').textContent = resolved ? 'Service health is stable and the incident is ready for review.' : current.summary;
    qs(stage, '[data-clock]').textContent = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
    renderMetrics();
    qsa(stage, '[data-diagnostic]').forEach(button => button.classList.toggle('done', evidence.has(button.dataset.diagnostic)));
    qs(stage, '[data-action="repair"]').disabled = resolved || evidence.size < 2;
    qs(stage, '[data-evidence]').innerHTML = evidence.size
      ? [...evidence].map(key => `<div class="sim-notice" data-tone="success"><strong>${key.toUpperCase()}</strong><br>${escapeHtml(interpolate(current.evidence[key], metrics).split('\n')[0])}</div>`).join('')
      : '<div class="sim-notice">Collect at least two independent evidence sources before applying a repair.</div>';
    const color = severityTone();
    alert.material.emissiveColor = BABYLON.Color3.FromHexString(color);
    alert.material.albedoColor = BABYLON.Color3.FromHexString(color);
  }
  function degrade(minutes = 1) {
    if (resolved) return;
    const current = scenario();
    metrics.latency += current.degradation.latency * minutes;
    metrics.errorRate += current.degradation.errorRate * minutes;
    metrics.saturation += current.degradation.saturation * minutes;
    metrics.throughput += current.degradation.throughput * minutes;
    seconds += minutes * 60;
    appendLog(stage, '[data-log]', `Incident advanced ${minutes} minute${minutes === 1 ? '' : 's'}; customer impact increased.`, 'warning');
    render();
  }
  function startClock() {
    guard.cancel();
    const token = guard.begin();
    clearInterval(timer);
    timer = setInterval(() => {
      if (!guard.active(token) || resolved) return;
      seconds += 1;
      if (seconds % 30 === 0) {
        const current = scenario();
        metrics.latency += current.degradation.latency * .5;
        metrics.errorRate += current.degradation.errorRate * .5;
        metrics.saturation += current.degradation.saturation * .5;
        metrics.throughput += current.degradation.throughput * .5;
      }
      render();
    }, 1000);
  }
  function loadScenario(id) {
    scenarioId = id;
    metrics = { ...scenario().metrics };
    evidence = new Set();
    resolved = false;
    wrongRepairs = 0;
    seconds = 0;
    qsa(stage, '[data-diagnostic]').forEach(button => button.classList.remove('done', 'running'));
    qs(stage, '[data-output]').textContent = 'Select a diagnostic or click a rack in the data center.';
    qs(stage, '[data-log]').innerHTML = '<li><time>--:--:--</time> Incident opened.</li>';
    positionAlert();
    camera.setTarget(new BABYLON.Vector3(alert.position.x, 2.2, alert.position.z));
    startClock();
    render();
  }
  async function diagnostic(type, button) {
    if (resolved || button.classList.contains('running')) return;
    button.classList.add('running');
    qs(stage, '[data-output]').textContent = `Running ${type} diagnostic…`;
    const token = guard.begin();
    if (!(await guard.wait(token, 520))) return;
    button.classList.remove('running');
    evidence.add(type);
    const content = interpolate(scenario().evidence[type], metrics);
    qs(stage, '[data-output]').textContent = content;
    appendLog(stage, '[data-log]', `${type} evidence collected.`);
    render();
  }
  async function applyRepair() {
    if (evidence.size < 2 || resolved) return;
    const selected = qs(stage, '[data-repair]').value;
    const token = guard.begin();
    qs(stage, '[data-output]').textContent = 'Applying repair and verifying health…';
    if (!(await guard.wait(token, 700))) return;
    if (selected === scenario().correctRepair) {
      resolved = true;
      metrics = { latency: scenarioId === 'queue-backlog' ? 210 : 182, errorRate: .1, saturation: 44, throughput: scenarioId === 'queue-backlog' ? 96 : 118 };
      clearInterval(timer);
      appendLog(stage, '[data-log]', `Correct repair applied: ${repairs.find(([id]) => id === selected)[1]}.`, 'success');
      qs(stage, '[data-output]').textContent = `Repair verified.\n${repairs.find(([id]) => id === selected)[1]}\n\nLatency: ${metrics.latency}ms\nError rate: ${metrics.errorRate}%\nSaturation: ${metrics.saturation}%\nThroughput: ${metrics.throughput}/min`;
      toast('Incident resolved and verified');
    } else {
      wrongRepairs += 1;
      metrics.latency += 650;
      metrics.errorRate += 4.5;
      metrics.saturation = Math.min(100, metrics.saturation + 4);
      metrics.throughput = Math.max(0, metrics.throughput - 8);
      appendLog(stage, '[data-log]', `Incorrect repair applied: ${repairs.find(([id]) => id === selected)[1]}. Impact increased.`, 'danger');
      qs(stage, '[data-output]').textContent = `Repair did not address the evidence. Customer impact increased.\nReview the collected metrics, logs, traces, and dependency health before trying again.`;
      toast('Repair failed verification');
    }
    render();
  }

  stage.addEventListener('change', event => {
    if (event.target.matches('[data-scenario]')) loadScenario(event.target.value);
  });
  stage.addEventListener('click', event => {
    const diagnosticButton = event.target.closest('[data-diagnostic]');
    if (diagnosticButton) { diagnostic(diagnosticButton.dataset.diagnostic, diagnosticButton); return; }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'repair') applyRepair();
    else if (action === 'advance') degrade(1);
    else if (action === 'restart') loadScenario(scenarioId);
  });
  const pointerObserver = scene.onPointerObservable.add(event => {
    if (event.type !== BABYLON.PointerEventTypes.POINTERPICK) return;
    const metadata = event.pickInfo?.pickedMesh?.metadata;
    if (!metadata) return;
    const affected = metadata.rackId === scenario().rack;
    qs(stage, '[data-output]').textContent = `Rack ${metadata.rackId}\nService: ${metadata.service}\nState: ${resolved ? 'HEALTHY' : affected ? 'CRITICAL' : 'HEALTHY'}${affected ? `\nThis rack hosts the suspected component: ${scenario().component}.` : ''}`;
  });

  loadScenario('db-pool');
  return {
    dispose() { guard.cancel(); clearInterval(timer); scene.onPointerObservable.remove(pointerObserver); ctx.dispose(); },
    reset() { loadScenario('db-pool'); qs(stage, '[data-scenario]').value = 'db-pool'; },
    getStats() { return { ...ctx.stats('3D INCIDENT STATE SIM'), scene: `${scenario().severity} · ${evidence.size} evidence sources · ${resolved ? 'resolved' : 'active'}` }; },
  };
}
