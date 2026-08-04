import { appendLog, domController, escapeHtml, formatDuration, qs, qsa, uid } from './simulation-utils.js';

const initialCalls = [
  { name: 'Sarah Mitchell', number: '815-555-0128', intent: 'Schedule consultation', sentiment: 'Positive', priority: 'normal', agent: 'Maya', waitSeconds: 8 },
  { name: 'Derek Wallace', number: '608-555-0184', intent: 'Support escalation', sentiment: 'Concerned', priority: 'urgent', agent: 'Derek', waitSeconds: 24 },
  { name: 'Unknown caller', number: '312-555-0199', intent: 'Pricing inquiry', sentiment: 'Neutral', priority: 'normal', agent: 'Frank', waitSeconds: 41 },
];
const incomingTemplates = [
  ['Morgan Lee', '779-555-0142', 'Project status', 'Neutral'],
  ['Jamie Carter', '815-555-0177', 'New website lead', 'Positive'],
  ['Taylor Brooks', '608-555-0104', 'Billing question', 'Concerned'],
];

function makeCall(definition, index = 0) {
  return {
    id: uid('call'), ...definition, state: 'waiting', activeSeconds: 0,
    answeredAt: null, notes: '', notesDraft: '', appointment: '', appointmentDraft: '',
    events: ['Call entered the queue.'],
    transcript: [
      { speaker: 'System', text: `Intent detected: ${definition.intent}.` },
      { speaker: 'Caller', text: definition.intent === 'Support escalation' ? 'My API stopped responding after the deployment.' : definition.intent === 'Pricing inquiry' ? 'What does a custom site usually cost?' : 'I would like help with this request.' },
    ],
    createdOrder: index,
  };
}

export function createVoiceOps({ stage, toast }) {
  stage.innerHTML = `<section class="voice-product sim-product" style="--sim-accent:#f97316;--sim-bg:#f0f3f7;--sim-text:#192432;--sim-muted:#6f7e8c;--sim-control:#fff;--sim-line:#d4dee8">
    <header><div><span>VOICE OPS</span><strong>Live Call Floor</strong></div><div class="voice-kpis"><b data-kpi="active">0 ACTIVE</b><b data-kpi="waiting">0 WAITING</b><b data-kpi="held">0 HELD</b><b data-kpi="sla">100% SLA</b></div></header>
    <div class="voice-layout">
      <aside class="call-queue"><header><button data-action="add-call">Add incoming call</button><button data-action="answer-next">Answer next</button></header><div data-call-list></div></aside>
      <main class="call-focus">
        <div class="caller-card"><div class="avatar" data-avatar>--</div><div><small data-state-label>NO CALL SELECTED</small><h2 data-caller>Select a call</h2><p data-number>Choose a caller from the queue.</p></div><div class="call-time" data-time>00:00</div></div>
        <div class="call-state-line"><strong data-call-status>Waiting for selection.</strong><span class="sim-pill" data-priority>--</span><span class="sim-pill" data-assigned>--</span></div>
        <div class="waveform" data-waveform>${Array.from({ length: 52 }, (_, index) => `<i style="--h:${18 + (index * 17) % 64}%"></i>`).join('')}</div>
        <div class="transcript" data-transcript><p>No transcript selected.</p></div>
        <div class="call-actions"><button data-action="answer" class="primary">Answer</button><button data-action="hold">Hold</button><button data-action="resume">Resume</button><button data-action="transfer">Transfer</button><button data-action="resolve">Resolve</button></div>
      </main>
      <aside class="call-intelligence">
        <h3>CALL INTELLIGENCE</h3><dl><div><dt>INTENT</dt><dd data-intent>--</dd></div><div><dt>SENTIMENT</dt><dd data-sentiment>--</dd></div><div><dt>ASSIGNED</dt><dd data-agent>--</dd></div><div><dt>QUEUE WAIT</dt><dd data-wait>--</dd></div></dl>
        <div class="voice-fields"><label>Transfer destination<select data-transfer><option value="Sales">Sales</option><option value="Technical Support">Technical Support</option><option value="Billing">Billing</option><option value="Brad">Brad</option></select></label><label>Appointment<select data-appointment><option value="">No appointment</option><option>Thursday at 10:00 AM</option><option>Thursday at 2:00 PM</option><option>Friday at 9:30 AM</option></select></label><button data-action="schedule">Save appointment</button><label>Agent notes<textarea data-notes placeholder="Add useful call notes"></textarea></label><button data-action="save-notes">Save notes</button></div>
        <h3>CALL EVENTS</h3><ol class="sim-log" data-events><li><time>--:--:--</time> Select a call.</li></ol>
      </aside>
    </div>
  </section>`;

  let calls = initialCalls.map(makeCall);
  let selectedId = calls[0].id;
  let incomingIndex = 0;
  let disposed = false;

  const selectedCall = () => calls.find(call => call.id === selectedId) || null;
  const activeCall = () => calls.find(call => call.state === 'active') || null;
  function initials(name) {
    if (name === 'Unknown caller') return '??';
    return name.split(/\s+/).map(part => part[0]).slice(0, 2).join('').toUpperCase();
  }
  function recordCallEvent(call, message) {
    call.events.unshift(message);
    appendLog(stage, '[data-events]', message);
  }
  function stateLabel(call) {
    return ({ waiting: 'WAITING CALL', active: 'ACTIVE CALL', held: 'CALL ON HOLD', transferred: 'TRANSFERRED CALL', resolved: 'RESOLVED CALL' })[call.state] || call.state.toUpperCase();
  }
  function renderQueue() {
    const ordered = [...calls].sort((a, b) => {
      const stateOrder = { active: 0, held: 1, transferred: 2, waiting: 3, resolved: 4 };
      return stateOrder[a.state] - stateOrder[b.state] || (b.priority === 'urgent') - (a.priority === 'urgent') || b.waitSeconds - a.waitSeconds;
    });
    qs(stage, '[data-call-list]').innerHTML = ordered.map(call => `<button data-call="${call.id}" data-state="${call.state}" class="${call.id === selectedId ? 'active' : ''}"><i></i><span><strong>${escapeHtml(call.name)}</strong><small>${escapeHtml(call.intent)} · ${call.state}</small></span><em>${formatDuration(call.state === 'waiting' ? call.waitSeconds : call.activeSeconds)}</em></button>`).join('');
  }
  function renderMetrics() {
    const waiting = calls.filter(call => call.state === 'waiting' || call.state === 'transferred').length;
    const active = calls.filter(call => call.state === 'active').length;
    const held = calls.filter(call => call.state === 'held').length;
    const answered = calls.filter(call => call.answeredAt !== null);
    const withinSla = answered.filter(call => call.answeredAt <= 30).length;
    const sla = answered.length ? Math.round(withinSla / answered.length * 100) : 100;
    qs(stage, '[data-kpi="active"]').textContent = `${active} ACTIVE`;
    qs(stage, '[data-kpi="waiting"]').textContent = `${waiting} WAITING`;
    qs(stage, '[data-kpi="held"]').textContent = `${held} HELD`;
    qs(stage, '[data-kpi="sla"]').textContent = `${sla}% SLA`;
  }
  function syncEditableFields(call) {
    const appointmentField = qs(stage, '[data-appointment]');
    const notesField = qs(stage, '[data-notes]');
    if (document.activeElement !== appointmentField) appointmentField.value = call.appointmentDraft;
    if (document.activeElement !== notesField) notesField.value = call.notesDraft;
  }
  function renderSelected() {
    const call = selectedCall();
    const buttons = Object.fromEntries(qsa(stage, '[data-action]').map(button => [button.dataset.action, button]));
    if (!call) {
      qs(stage, '[data-caller]').textContent = 'Select a call';
      return;
    }
    qs(stage, '[data-avatar]').textContent = initials(call.name);
    qs(stage, '[data-state-label]').textContent = stateLabel(call);
    qs(stage, '[data-caller]').textContent = call.name;
    qs(stage, '[data-number]').textContent = call.number;
    qs(stage, '[data-time]').textContent = formatDuration(call.state === 'waiting' ? call.waitSeconds : call.activeSeconds);
    qs(stage, '[data-call-status]').textContent = call.appointment ? `${stateLabel(call)} · appointment ${call.appointment}` : stateLabel(call);
    qs(stage, '[data-priority]').textContent = call.priority.toUpperCase();
    qs(stage, '[data-assigned]').textContent = call.agent;
    qs(stage, '[data-intent]').textContent = call.intent;
    qs(stage, '[data-sentiment]').textContent = call.sentiment;
    qs(stage, '[data-agent]').textContent = call.agent;
    qs(stage, '[data-wait]').textContent = formatDuration(call.waitSeconds);
    syncEditableFields(call);
    qs(stage, '[data-transcript]').innerHTML = call.transcript.map(line => `<p><b>${escapeHtml(line.speaker)}:</b> ${escapeHtml(line.text)}</p>`).join('');
    qs(stage, '[data-events]').innerHTML = call.events.map(message => `<li><time>${formatDuration(call.activeSeconds)}</time> ${escapeHtml(message)}</li>`).join('');
    buttons.answer.disabled = !['waiting', 'transferred'].includes(call.state) || Boolean(activeCall() && activeCall().id !== call.id);
    buttons.hold.disabled = call.state !== 'active';
    buttons.resume.disabled = call.state !== 'held' || Boolean(activeCall());
    buttons.transfer.disabled = !['active', 'held'].includes(call.state);
    buttons.resolve.disabled = !['active', 'held', 'transferred'].includes(call.state);
    buttons.schedule.disabled = call.state === 'resolved';
    buttons['save-notes'].disabled = call.state === 'resolved';
    qsa(stage, '[data-waveform] i').forEach((bar, index) => {
      const height = call.state === 'active' ? 20 + ((index * 19 + call.activeSeconds * 7) % 70) : 8;
      bar.style.setProperty('--h', `${height}%`);
    });
  }
  function render() { renderQueue(); renderMetrics(); renderSelected(); }
  function select(id) { selectedId = id; render(); }
  function answer(call) {
    if (!call || !['waiting', 'transferred'].includes(call.state)) return;
    if (activeCall() && activeCall().id !== call.id) return toast('Hold or resolve the active call first.');
    call.state = 'active';
    call.answeredAt ??= call.waitSeconds;
    call.transcript.push({ speaker: 'Agent', text: `Thanks for calling. I can help with ${call.intent.toLowerCase()}.` });
    recordCallEvent(call, `Call answered by ${call.agent}.`);
    toast(`Answered ${call.name}`);
    render();
  }
  function answerNext() {
    const next = [...calls].filter(call => ['waiting', 'transferred'].includes(call.state)).sort((a, b) => (b.priority === 'urgent') - (a.priority === 'urgent') || b.waitSeconds - a.waitSeconds)[0];
    if (!next) return toast('No waiting calls.');
    selectedId = next.id;
    answer(next);
  }
  function transition(action) {
    const call = selectedCall();
    if (!call) return;
    if (action === 'hold' && call.state === 'active') {
      call.state = 'held'; recordCallEvent(call, 'Caller placed on hold.');
    } else if (action === 'resume' && call.state === 'held' && !activeCall()) {
      call.state = 'active'; recordCallEvent(call, 'Call resumed from hold.');
    } else if (action === 'transfer' && ['active', 'held'].includes(call.state)) {
      const destination = qs(stage, '[data-transfer]').value;
      call.state = 'transferred'; call.agent = destination;
      call.transcript.push({ speaker: 'System', text: `Transferred to ${destination}.` });
      recordCallEvent(call, `Transferred to ${destination}; returned to the waiting queue.`);
      toast(`Transferred to ${destination}`);
    } else if (action === 'resolve' && ['active', 'held', 'transferred'].includes(call.state)) {
      call.state = 'resolved';
      call.transcript.push({ speaker: 'Agent', text: 'I have completed the requested next step. Thank you for calling.' });
      recordCallEvent(call, 'Call resolved and final summary saved.');
      toast('Call resolved');
    }
    render();
  }
  function addIncoming() {
    const template = incomingTemplates[incomingIndex % incomingTemplates.length];
    incomingIndex += 1;
    const call = makeCall({ name: template[0], number: template[1], intent: template[2], sentiment: template[3], priority: incomingIndex % 3 === 0 ? 'urgent' : 'normal', agent: incomingIndex % 2 ? 'Maya' : 'Derek', waitSeconds: 0 }, calls.length);
    calls.push(call); selectedId = call.id;
    toast(`Incoming call from ${call.name}`);
    render();
  }
  function reset() {
    calls = initialCalls.map(makeCall);
    selectedId = calls[0].id;
    incomingIndex = 0;
    render();
  }

  stage.addEventListener('change', interaction => {
    const call = selectedCall();
    if (!call || call.state === 'resolved') return;
    if (interaction.target.matches('[data-appointment]')) call.appointmentDraft = interaction.target.value;
  });
  stage.addEventListener('input', interaction => {
    const call = selectedCall();
    if (!call || call.state === 'resolved') return;
    if (interaction.target.matches('[data-notes]')) call.notesDraft = interaction.target.value;
  });
  stage.addEventListener('click', interaction => {
    const callButton = interaction.target.closest('[data-call]');
    if (callButton) { select(callButton.dataset.call); return; }
    const action = interaction.target.closest('[data-action]')?.dataset.action;
    const call = selectedCall();
    if (action === 'add-call') addIncoming();
    else if (action === 'answer-next') answerNext();
    else if (action === 'answer') answer(call);
    else if (['hold', 'resume', 'transfer', 'resolve'].includes(action)) transition(action);
    else if (action === 'schedule') {
      if (!call || call.state === 'resolved') return;
      const selectedAppointment = qs(stage, '[data-appointment]').value || call.appointmentDraft;
      if (!selectedAppointment) return toast('Choose an appointment time.');
      call.appointmentDraft = selectedAppointment;
      call.appointment = selectedAppointment;
      recordCallEvent(call, `Appointment scheduled for ${call.appointment}.`);
      toast('Appointment saved'); render();
    } else if (action === 'save-notes') {
      if (!call || call.state === 'resolved') return;
      call.notesDraft = qs(stage, '[data-notes]').value;
      call.notes = call.notesDraft.trim();
      call.notesDraft = call.notes;
      recordCallEvent(call, call.notes ? 'Agent notes saved.' : 'Agent notes cleared.');
      toast('Call notes saved'); render();
    }
  });

  const timer = setInterval(() => {
    if (disposed) return;
    calls.forEach(call => {
      if (['waiting', 'transferred'].includes(call.state)) call.waitSeconds += 1;
      if (['active', 'held'].includes(call.state)) call.activeSeconds += 1;
    });
    render();
  }, 1000);
  render();
  return domController(stage, reset, () => { disposed = true; clearInterval(timer); }, 'VOICE CALL STATE SIMULATION', () => `${calls.filter(call => call.state !== 'resolved').length} open calls · ${calls.filter(call => call.state === 'resolved').length} resolved`);
}
