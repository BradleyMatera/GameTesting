import { basicScene, ground, cylinder, sphere, label, line, createServerRack, animateAlong, pulse } from '../../core/scene.js';
import { appendLog, createRunGuard, escapeHtml, qs, qsa, seeded } from './simulation-utils.js';

const providerDefinitions = [
  { id: 'groq', name: 'Groq', color: '#f97316', position: [-10, 0, -5], latency: 190, quota: 12000, cost: .12, quality: 82 },
  { id: 'cloudflare', name: 'Cloudflare', color: '#fbbf24', position: [10, 0, -5], latency: 340, quota: 16000, cost: .08, quality: 74 },
  { id: 'gemini', name: 'Gemini', color: '#38bdf8', position: [-10, 0, 7], latency: 460, quota: 9000, cost: .22, quality: 90 },
  { id: 'local', name: 'Local GPU', color: '#a78bfa', position: [10, 0, 7], latency: 760, quota: 24000, cost: .03, quality: 78 },
];
const failureOptions = [
  ['healthy', 'Healthy'], ['flaky', 'Flaky'], ['rate-limit', 'Always 429'],
  ['timeout', 'Always timeout'], ['malformed', 'Malformed JSON'], ['outage', 'Provider outage'],
];

function newProviders() {
  return providerDefinitions.map(definition => ({
    ...definition, enabled: true, remainingQuota: definition.quota, failureMode: 'healthy',
    consecutiveFailures: 0, circuit: 'closed', requests: 0, successes: 0,
  }));
}
function tokenEstimate(prompt) {
  return Math.max(96, Math.ceil(prompt.trim().split(/\s+/).filter(Boolean).length * 8.2));
}
function rankProvider(provider, policy) {
  if (policy === 'fastest') return provider.latency;
  if (policy === 'cheapest') return provider.cost * 10000 + provider.latency * .05;
  if (policy === 'quality') return (100 - provider.quality) * 100 + provider.latency * .1;
  return provider.latency * .36 + provider.cost * 2200 + (100 - provider.quality) * 12 + provider.consecutiveFailures * 240;
}
function evaluateFailure(provider, random) {
  const mode = provider.failureMode;
  if (mode === 'healthy') return { ok: true, status: 200 };
  if (mode === 'rate-limit') return { ok: false, status: 429, reason: 'rate limit exceeded' };
  if (mode === 'timeout') return { ok: false, status: 'TIMEOUT', reason: 'provider exceeded timeout budget' };
  if (mode === 'malformed') return { ok: false, status: 'BAD JSON', reason: 'response schema validation failed' };
  if (mode === 'outage') return { ok: false, status: 503, reason: 'provider unavailable' };
  const roll = random();
  if (roll < .25) return { ok: false, status: 429, reason: 'intermittent quota rejection' };
  if (roll < .43) return { ok: false, status: 'TIMEOUT', reason: 'intermittent timeout' };
  if (roll < .52) return { ok: false, status: 'BAD JSON', reason: 'intermittent malformed response' };
  return { ok: true, status: 200 };
}

export async function createLlmRouter({ stage, toast }) {
  stage.innerHTML = `<section class="game-root sim-product router-world" style="--sim-accent:#67e8f9;--sim-panel:#030811;--sim-muted:#9db0c8">
    <canvas aria-label="3D LLM routing network"></canvas>
    <div class="router-console sim-glass">
      <header><span>MODEL ROUTING NETWORK</span><strong>LLM Router & Failover</strong><small data-router-state>Ready for a request.</small></header>
      <div class="router-request"><input data-prompt value="Explain Brad's cloud support experience with verified sources." aria-label="Request"><button data-action="send" class="primary">Route request</button><button data-action="cancel">Cancel</button></div>
      <div class="sim-field-grid"><label>Routing policy<select data-policy><option value="balanced">Balanced</option><option value="fastest">Fastest</option><option value="cheapest">Cheapest</option><option value="quality">Highest quality</option></select></label><label>Deterministic seed<input data-seed type="number" value="42"></label></div>
      <div class="router-provider-grid" data-providers></div>
      <div class="router-trace"><section><div class="sim-kpis"><div class="sim-kpi"><span>TOKENS</span><strong data-tokens>0</strong></div><div class="sim-kpi"><span>ATTEMPTS</span><strong data-attempt-count>0</strong></div><div class="sim-kpi"><span>LATENCY</span><strong data-total-latency>--</strong></div><div class="sim-kpi"><span>RESULT</span><strong data-result-state>--</strong></div></div><ol class="sim-log router-attempts" data-trace><li><time>--:--:--</time> No route executed.</li></ol></section><section><div class="sim-notice" data-tone="" data-answer>Enable providers, choose failure modes, and route a request.</div><div class="sim-actions" style="margin-top:.4rem"><button data-action="reset-circuits">Reset circuits</button><button data-action="restore-quota">Restore quota</button></div></section></div>
    </div>
  </section>`;

  const canvas = qs(stage, 'canvas');
  const ctx = basicScene(canvas, { clear: '#020617ff', radius: 24, target: [0, 2, 0], bloomWeight: .28, glow: .8 });
  const { scene, BABYLON, camera } = ctx;
  ground(scene, { width: 36, height: 24, color: '#060d1b' });
  cylinder(scene, 'ingress', 3.2, 1.1, [0, .55, 0], '#1e293b', { metallic: .7, roughness: .24, emissive: '#67e8f9', emissiveIntensity: .25 });
  const core = sphere(scene, 'router-core', 1.8, [0, 2.2, 0], '#67e8f9', { emissive: '#67e8f9', emissiveIntensity: .95, metallic: .15, roughness: .2 });
  pulse(core, scene, { range: .05, speed: 3 });
  label(scene, 'POLICY ROUTER', [0, 4.6, 0], { width: 4.4, height: .75, fontSize: 50 });

  let providers = newProviders();
  let requestNumber = 0;
  let packets = [];
  let running = false;
  const guard = createRunGuard();
  providers.forEach(provider => {
    createServerRack(scene, provider.position, { name: `provider-${provider.id}`, frame: '#17233a', panel: '#050b14' });
    const beacon = sphere(scene, `${provider.id}-beacon`, .7, [provider.position[0], 5, provider.position[2]], provider.color, { emissive: provider.color, emissiveIntensity: 1 });
    beacon.metadata = { providerId: provider.id };
    beacon.isPickable = true;
    label(scene, provider.name.toUpperCase(), [provider.position[0], 6.3, provider.position[2]], { width: 3.5, height: .7, fontSize: 48, border: provider.color });
    line(scene, [[0,1.5,0],[provider.position[0]*.52,2.7,provider.position[2]*.52],[provider.position[0],2.3,provider.position[2]]], provider.color, .045);
  });

  function providerCard(provider) {
    return `<article class="router-provider-card" style="--provider:${provider.color}" data-provider-card="${provider.id}">
      <header><input type="checkbox" data-provider-enabled="${provider.id}" ${provider.enabled ? 'checked' : ''}><strong>${provider.name}</strong><span class="sim-pill">${provider.circuit.toUpperCase()}</span></header>
      <select data-provider-failure="${provider.id}">${failureOptions.map(([id, labelText]) => `<option value="${id}" ${provider.failureMode === id ? 'selected' : ''}>${labelText}</option>`).join('')}</select>
      <dl><div><dt>LATENCY</dt><dd>${provider.latency} ms</dd></div><div><dt>QUALITY</dt><dd>${provider.quality}/100</dd></div><div><dt>COST</dt><dd>$${provider.cost.toFixed(2)}/1K</dd></div><div><dt>QUOTA</dt><dd>${provider.remainingQuota.toLocaleString()}</dd></div><div><dt>SUCCESS</dt><dd>${provider.requests ? Math.round(provider.successes/provider.requests*100) : 0}%</dd></div><div><dt>FAILURES</dt><dd>${provider.consecutiveFailures}</dd></div></dl>
    </article>`;
  }
  function renderProviders() {
    qs(stage, '[data-providers]').innerHTML = providers.map(providerCard).join('');
  }
  function setStatus(text) { qs(stage, '[data-router-state]').textContent = text; }
  function candidateProviders(tokens, policy) {
    return providers.filter(provider => provider.enabled && provider.circuit !== 'open' && provider.remainingQuota >= tokens)
      .sort((a, b) => rankProvider(a, policy) - rankProvider(b, policy));
  }
  function packetTo(provider, attempt) {
    const packet = sphere(scene, `packet-${requestNumber}-${attempt}`, .45, [0, 2.2, 0], provider.color, { emissive: provider.color, emissiveIntensity: 1.3, roughness: .15 });
    packets.push(packet);
    animateAlong(scene, packet, [[0,2.2,0],[provider.position[0]*.52,3,provider.position[2]*.52],[provider.position[0],3,provider.position[2]]], Math.max(480, provider.latency * 2.2), false);
    return packet;
  }
  async function routeRequest() {
    if (running) return;
    const prompt = qs(stage, '[data-prompt]').value.trim();
    if (!prompt) return toast('Enter a request first.');
    const tokens = tokenEstimate(prompt);
    const policy = qs(stage, '[data-policy]').value;
    const random = seeded(Number(qs(stage, '[data-seed]').value) + requestNumber * 101);
    const candidates = candidateProviders(tokens, policy);
    if (!candidates.length) {
      qs(stage, '[data-answer]').dataset.tone = 'danger';
      qs(stage, '[data-answer]').textContent = 'No provider can accept this request. Check enabled state, open circuits, and quota.';
      setStatus('Request rejected before routing.');
      return;
    }
    running = true;
    requestNumber += 1;
    const token = guard.begin();
    qs(stage, '[data-trace]').innerHTML = '';
    qs(stage, '[data-tokens]').textContent = tokens;
    qs(stage, '[data-attempt-count]').textContent = '0';
    qs(stage, '[data-total-latency]').textContent = '--';
    qs(stage, '[data-result-state]').textContent = 'RUNNING';
    qs(stage, '[data-answer]').dataset.tone = '';
    qs(stage, '[data-answer]').textContent = `Policy ranked ${candidates.map(provider => provider.name).join(' → ')}.`;
    setStatus(`Routing request ${requestNumber} with ${policy} policy.`);
    let totalLatency = 0;
    let selected = null;
    let attempts = 0;
    for (const provider of candidates) {
      if (!guard.active(token)) break;
      attempts += 1;
      provider.requests += 1;
      provider.remainingQuota -= tokens;
      renderProviders();
      const packet = packetTo(provider, attempts);
      appendLog(stage, '[data-trace]', `Attempt ${attempts}: reserved ${tokens} tokens on ${provider.name}.`);
      setStatus(`Attempt ${attempts}: waiting for ${provider.name}.`);
      const simulatedLatency = provider.failureMode === 'timeout' ? provider.latency + 900 : provider.latency + Math.round(random() * 120);
      totalLatency += simulatedLatency;
      if (!(await guard.wait(token, Math.min(1350, simulatedLatency)))) break;
      packet.dispose();
      packets = packets.filter(item => item !== packet);
      const outcome = evaluateFailure(provider, random);
      if (outcome.ok) {
        provider.successes += 1;
        provider.consecutiveFailures = 0;
        provider.circuit = 'closed';
        selected = provider;
        appendLog(stage, '[data-trace]', `${provider.name} returned a schema-valid answer.`, 'success');
        break;
      }
      provider.consecutiveFailures += 1;
      if (provider.consecutiveFailures >= 2) provider.circuit = 'open';
      appendLog(stage, '[data-trace]', `${provider.name} failed with ${outcome.status}: ${outcome.reason}.${provider.circuit === 'open' ? ' Circuit opened.' : ''}`, 'danger');
      renderProviders();
    }
    if (!guard.active(token)) {
      running = false;
      setStatus('Request cancelled.');
      qs(stage, '[data-result-state]').textContent = 'CANCELLED';
      return;
    }
    running = false;
    qs(stage, '[data-attempt-count]').textContent = attempts;
    qs(stage, '[data-total-latency]').textContent = `${totalLatency} ms`;
    if (selected) {
      qs(stage, '[data-result-state]').textContent = 'SUCCESS';
      qs(stage, '[data-answer]').dataset.tone = 'success';
      qs(stage, '[data-answer]').innerHTML = `<strong>${escapeHtml(selected.name)} completed the request.</strong><br>Policy: ${escapeHtml(policy)} · Quality: ${selected.quality}/100 · Cost estimate: $${(tokens/1000*selected.cost).toFixed(4)} · Remaining quota: ${selected.remainingQuota.toLocaleString()} tokens.<br><br>Grounded response: Brad completed an AWS Cloud Support Associate internship using isolated lab accounts and holds AWS Solutions Architect – Associate and AI Practitioner certifications.`;
      setStatus(`Request completed through ${selected.name} after ${attempts} attempt${attempts === 1 ? '' : 's'}.`);
      toast(`Route complete through ${selected.name}`);
    } else {
      qs(stage, '[data-result-state]').textContent = 'FAILED';
      qs(stage, '[data-answer]').dataset.tone = 'danger';
      qs(stage, '[data-answer]').textContent = `All ${attempts} eligible providers failed. Open circuits and quota were preserved for the next request.`;
      setStatus('All eligible providers failed.');
      toast('Request exhausted all providers');
    }
    renderProviders();
  }
  function cancel() {
    if (!running) return;
    guard.cancel();
    running = false;
    packets.forEach(packet => packet.dispose());
    packets = [];
    setStatus('Request cancelled by user.');
    qs(stage, '[data-result-state]').textContent = 'CANCELLED';
  }
  function reset() {
    cancel();
    providers = newProviders();
    requestNumber = 0;
    qs(stage, '[data-trace]').innerHTML = '<li><time>--:--:--</time> Router reset.</li>';
    qs(stage, '[data-tokens]').textContent = '0';
    qs(stage, '[data-attempt-count]').textContent = '0';
    qs(stage, '[data-total-latency]').textContent = '--';
    qs(stage, '[data-result-state]').textContent = '--';
    qs(stage, '[data-answer]').dataset.tone = '';
    qs(stage, '[data-answer]').textContent = 'All providers are healthy with restored quota.';
    setStatus('Ready for a request.');
    renderProviders();
  }

  stage.addEventListener('change', event => {
    const enabledId = event.target.dataset.providerEnabled;
    if (enabledId) { providers.find(provider => provider.id === enabledId).enabled = event.target.checked; renderProviders(); }
    const failureId = event.target.dataset.providerFailure;
    if (failureId) { providers.find(provider => provider.id === failureId).failureMode = event.target.value; renderProviders(); }
  });
  stage.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'send') routeRequest();
    else if (action === 'cancel') cancel();
    else if (action === 'reset-circuits') {
      providers.forEach(provider => { provider.circuit = 'closed'; provider.consecutiveFailures = 0; });
      renderProviders(); toast('Provider circuits reset');
    } else if (action === 'restore-quota') {
      providers.forEach(provider => { provider.remainingQuota = provider.quota; });
      renderProviders(); toast('Provider quota restored');
    }
  });
  const pointerObserver = scene.onPointerObservable.add(event => {
    if (event.type !== BABYLON.PointerEventTypes.POINTERPICK) return;
    const providerId = event.pickInfo?.pickedMesh?.metadata?.providerId;
    if (!providerId) return;
    const provider = providers.find(item => item.id === providerId);
    camera.setTarget(new BABYLON.Vector3(provider.position[0], 2.2, provider.position[2]));
    toast(`${provider.name}: ${provider.circuit}, ${provider.remainingQuota.toLocaleString()} tokens remaining`);
  });
  renderProviders();
  return {
    dispose() { cancel(); scene.onPointerObservable.remove(pointerObserver); ctx.dispose(); },
    reset,
    getStats() { return { ...ctx.stats('3D DETERMINISTIC ROUTER'), scene: `${providers.filter(provider => provider.enabled).length} enabled · ${providers.filter(provider => provider.circuit === 'open').length} open circuits` }; },
  };
}
