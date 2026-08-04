const $ = (root, selector) => root.querySelector(selector);
const $$ = (root, selector) => [...root.querySelectorAll(selector)];

function controller(stage, cleanup, stats = () => ({ fps: "60", meshes: stage.querySelectorAll("*").length }), pause, reset) {
  return {
    dispose() { cleanup?.(); stage.replaceChildren(); },
    getStats: stats,
    setGuidedOrbit(value) { pause?.(!value); },
    resetCamera() { reset?.(); },
  };
}

function log(list, message, tone = "info") {
  const item = document.createElement("li");
  item.className = tone;
  item.innerHTML = `<time>${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time><span>${message}</span>`;
  list.prepend(item);
  while (list.children.length > 8) list.lastElementChild.remove();
}

function createAgentOperations({ stage, onSelect, onReady }) {
  const agents = [
    { name: "Scout", role: "Research", color: "#8edcff", zone: 0, task: "Verify source evidence" },
    { name: "Frank", role: "Routing", color: "#ffd36e", zone: 1, task: "Classify incoming request" },
    { name: "Nova", role: "Engineering", color: "#b68cff", zone: 2, task: "Build acceptance proof" },
    { name: "Mira", role: "QA", color: "#88f5a7", zone: 3, task: "Review completion evidence" },
    { name: "Atlas", role: "Cloud", color: "#ff9a62", zone: 4, task: "Watch provider health" },
  ];
  const zones = ["INBOX", "RESEARCH", "BUILD", "REVIEW", "DEPLOY"];
  let tick = 0;
  let paused = false;
  let timer;

  stage.innerHTML = `<section class="demo-surface sim-agent-ops">
    <header class="agent-command"><div><span>TEAM MATERA / LIVE FLOOR</span><h2>Agent Operations Center</h2></div><div class="agent-kpis"><b data-complete>12</b><small>completed</small><b data-blocked>1</b><small>blocked</small></div></header>
    <div class="agent-ops-grid">
      <aside class="agent-inbox"><h3>MISSION QUEUE</h3><button data-new-task>+ Add verified task</button><ol data-task-list>
        <li data-task><strong>Recruiter brief</strong><span>Needs evidence</span><em>HIGH</em></li>
        <li data-task><strong>Deploy storefront</strong><span>Waiting for QA</span><em>MED</em></li>
        <li data-task><strong>Provider health</strong><span>Continuous watch</span><em>LOW</em></li>
      </ol></aside>
      <main class="agent-office" aria-label="Animated agent office floor">
        ${zones.map((zone, i) => `<section class="office-zone zone-${i}"><span>${String(i + 1).padStart(2, "0")}</span><strong>${zone}</strong><i></i></section>`).join("")}
        <svg class="office-paths" viewBox="0 0 1000 520" aria-hidden="true"><path d="M105 255 H300 H500 H700 H895"/><path d="M300 255 V405 H700 V255"/></svg>
        <div class="agent-layer">${agents.map((agent, i) => `<button class="moving-agent" data-agent="${i}" style="--agent:${agent.color}"><i>${agent.name.slice(0,2).toUpperCase()}</i><span><strong>${agent.name}</strong><small>${agent.role}</small></span><em>WORKING</em></button>`).join("")}</div>
      </main>
      <aside class="agent-activity"><h3>OPERATIONS FEED</h3><ol data-log></ol><button data-pause>Pause floor</button></aside>
    </div>
  </section>`;

  const positions = [[9,42],[29,22],[49,42],[69,22],[88,42],[29,73],[69,73]];
  const feed = $(stage, "[data-log]");
  const render = () => {
    $$(stage, ".moving-agent").forEach((node, i) => {
      const agent = agents[i];
      const [x,y] = positions[agent.zone];
      node.style.left = `${x}%`;
      node.style.top = `${y}%`;
      node.querySelector("em").textContent = ["WORKING","WAITING","REVIEW","BLOCKED"][(tick + i) % 4];
    });
  };
  const advance = () => {
    tick += 1;
    const agent = agents[tick % agents.length];
    agent.zone = (agent.zone + 1 + (tick % 2)) % positions.length;
    const events = [
      `${agent.name} claimed a task from the mission queue.`,
      `${agent.name} attached an artifact for review.`,
      `${agent.name} moved work to the next verified stage.`,
      `${agent.name} requested human approval before deployment.`,
    ];
    log(feed, events[tick % events.length], tick % 5 === 0 ? "warn" : "info");
    $(stage, "[data-complete]").textContent = 12 + Math.floor(tick / 3);
    $(stage, "[data-blocked]").textContent = tick % 7 === 0 ? 2 : 1;
    render();
  };
  $$(stage, "[data-agent]").forEach((node) => node.addEventListener("click", () => {
    const agent = agents[Number(node.dataset.agent)];
    onSelect?.({ index: "ACTIVE AGENT", title: agent.name, kicker: agent.role.toUpperCase(), copy: `${agent.task}. This agent moves only when its task state changes, so the animation represents the simulation instead of decoration.`, tags: ["Task queue", "State machine", "Artifacts"] });
  }));
  $(stage, "[data-new-task]").addEventListener("click", () => {
    const li = document.createElement("li");
    li.dataset.task = "";
    li.innerHTML = `<strong>New customer build</strong><span>Unassigned</span><em>HIGH</em>`;
    $(stage, "[data-task-list]").prepend(li);
    log(feed, "A new customer build entered the queue.");
  });
  $(stage, "[data-pause]").addEventListener("click", (event) => { paused = !paused; event.currentTarget.textContent = paused ? "Resume floor" : "Pause floor"; });
  render(); advance();
  timer = setInterval(() => { if (!paused) advance(); }, 1800);
  onReady?.({ engineType: "AGENT STATE ENGINE" });
  return controller(stage, () => clearInterval(timer), undefined, (value) => { paused = value; }, () => { tick = 0; agents.forEach((a,i) => a.zone = i); feed.replaceChildren(); render(); });
}

function createLLMRouter({ stage, onSelect, onReady }) {
  const providers = [
    { id:"groq8", name:"Groq 8B", latency:190, quota:76, quality:78, x:740, y:70 },
    { id:"groq70", name:"Groq 70B", latency:620, quota:42, quality:92, x:740, y:190 },
    { id:"oss20", name:"GPT-OSS 20B", latency:480, quota:63, quality:88, x:740, y:310 },
    { id:"cf", name:"Cloudflare", latency:880, quota:89, quality:81, x:740, y:430 },
  ];
  let requests = 0;
  let paused = false;
  let timer;

  stage.innerHTML = `<section class="demo-surface sim-router">
    <header class="router-header"><div><span>MODEL TRAFFIC CONTROL</span><h2>LLM Router & Failover</h2></div><button data-send>Send grounded request</button></header>
    <div class="router-layout">
      <main class="router-map">
        <svg viewBox="0 0 1000 520" role="img" aria-label="LLM routing topology">
          <defs><filter id="routerGlow"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <path class="route-base" d="M120 260 H360 H540"/>
          ${providers.map((p) => `<path class="route-provider" data-route="${p.id}" d="M540 260 C640 260 650 ${p.y} ${p.x} ${p.y}"/>`).join("")}
          <g class="router-node input"><rect x="50" y="210" width="140" height="100" rx="18"/><text x="120" y="250">REQUEST</text><text x="120" y="280">verified context</text></g>
          <g class="router-node gate"><polygon points="360,190 430,260 360,330 290,260"/><text x="360" y="252">POLICY</text><text x="360" y="278">GATE</text></g>
          <g class="router-node judge"><circle cx="540" cy="260" r="68"/><text x="540" y="252">ROUTER</text><text x="540" y="278">+ JUDGE</text></g>
          ${providers.map((p) => `<g class="provider-node" data-node="${p.id}" transform="translate(${p.x},${p.y})"><rect x="0" y="-42" width="200" height="84" rx="14"/><text x="18" y="-10">${p.name}</text><text x="18" y="18">${p.latency}ms • Q${p.quality}</text><circle cx="176" cy="0" r="9"/></g>`).join("")}
          <circle class="route-packet" data-packet r="9" cx="120" cy="260"/>
        </svg>
        <div class="router-decision" data-decision><span>ROUTER IDLE</span><strong>Send a request to see the selection policy.</strong></div>
      </main>
      <aside class="router-providers">${providers.map((p) => `<button data-provider="${p.id}"><span><strong>${p.name}</strong><em>ONLINE</em></span><label>Quota <meter min="0" max="100" value="${p.quota}"></meter></label><small>${p.latency} ms • quality ${p.quality}</small></button>`).join("")}</aside>
      <aside class="router-trace"><h3>DECISION TRACE</h3><ol data-log></ol></aside>
    </div>
  </section>`;

  const feed = $(stage, "[data-log]");
  const packet = $(stage, "[data-packet]");
  function choose() {
    const online = providers.filter((p) => !$(stage, `[data-provider="${p.id}"]`).classList.contains("offline") && p.quota > 4);
    return [...online].sort((a,b) => (b.quality * 5 - b.latency/30 + b.quota) - (a.quality * 5 - a.latency/30 + a.quota))[0];
  }
  async function send() {
    if (paused) return;
    const selected = choose();
    requests += 1;
    if (!selected) { log(feed, "No provider available. Request held in queue.", "error"); return; }
    packet.classList.remove("animate"); void packet.getBoundingClientRect(); packet.classList.add("animate");
    $$(stage, ".route-provider").forEach((path) => path.classList.toggle("selected", path.dataset.route === selected.id));
    $$(stage, ".provider-node").forEach((node) => node.classList.toggle("selected", node.dataset.node === selected.id));
    selected.quota = Math.max(0, selected.quota - 3);
    $(stage, `[data-provider="${selected.id}"] meter`).value = selected.quota;
    $(stage, "[data-decision]").innerHTML = `<span>REQUEST ${String(requests).padStart(3,"0")}</span><strong>${selected.name} selected</strong><p>Best combined evidence quality, available quota, and latency budget.</p>`;
    log(feed, `Policy gate accepted grounded context.`);
    setTimeout(() => log(feed, `${selected.name} reserved quota and began generation.`), 450);
    setTimeout(() => log(feed, `Judge accepted response with evidence score ${selected.quality}%.`), 950);
  }
  $(stage, "[data-send]").addEventListener("click", send);
  $$(stage, "[data-provider]").forEach((button) => button.addEventListener("click", () => {
    button.classList.toggle("offline");
    const offline = button.classList.contains("offline");
    button.querySelector("em").textContent = offline ? "OFFLINE" : "ONLINE";
    $(stage, `[data-node="${button.dataset.provider}"]`).classList.toggle("offline", offline);
    log(feed, `${button.querySelector("strong").textContent} ${offline ? "taken offline; routing table recalculated." : "restored."}`, "warn");
    onSelect?.({ index: "PROVIDER", title: button.querySelector("strong").textContent, kicker: offline ? "OFFLINE" : "AVAILABLE", copy: "Provider state directly changes the routing decision, quota availability, and fallback path.", tags:["Quota","Latency","Quality"] });
  }));
  timer = setInterval(() => { if (!paused) providers.forEach((p) => p.quota = Math.min(100, p.quota + 0.5)); }, 1000);
  onReady?.({ engineType: "ROUTING POLICY ENGINE" });
  return controller(stage, () => clearInterval(timer), () => ({ fps:"60", meshes:providers.length + requests }), (value) => paused = value, () => { requests = 0; providers.forEach((p,i) => p.quota = [76,42,63,89][i]); feed.replaceChildren(); });
}

function createCloudIncident({ stage, onSelect, onReady }) {
  let t = 0;
  let severity = 72;
  let throttles = 86;
  let retries = 64;
  let paused = false;
  let timer;
  const points = Array.from({length:60}, (_,i) => 180 + Math.sin(i/5)*22 + i*2.2);

  stage.innerHTML = `<section class="demo-surface sim-incident">
    <header class="incident-top"><div><span>INC-2048 • SEV-2</span><h2>DynamoDB hot partition causing elevated API latency</h2></div><div><strong data-severity>72</strong><small>incident severity</small></div></header>
    <div class="incident-layout">
      <aside class="service-map"><h3>SERVICE DEPENDENCIES</h3>${["CloudFront","API Gateway","Lambda","DynamoDB","Alarm Pipeline"].map((name,i)=>`<button data-service="${i}" class="${i===3?"critical":i>0&&i<3?"warning":"healthy"}"><i></i><span><strong>${name}</strong><small>${i===3?"THROTTLED":i>0&&i<3?"DEGRADED":"HEALTHY"}</small></span></button>`).join("")}</aside>
      <main class="incident-observability">
        <div class="chart-head"><span>P95 LATENCY / LAST 60 SECONDS</span><strong data-latency>1,840 ms</strong></div>
        <canvas width="1000" height="360" data-chart></canvas>
        <div class="incident-metrics"><article><span>READ THROTTLES</span><strong data-throttles>86%</strong></article><article><span>LAMBDA RETRIES</span><strong data-retries>64%</strong></article><article><span>AFFECTED USERS</span><strong data-users>318</strong></article></div>
        <div class="log-console" data-console><p><time>22:41:08</time> Alarm threshold crossed: p95 latency &gt; 1200ms</p><p><time>22:41:12</time> DynamoDB partition key concentration detected</p></div>
      </main>
      <aside class="runbook"><h3>RESPONSE RUNBOOK</h3><ol>
        <li class="done"><b>1</b><span>Confirm customer impact<small>Completed</small></span></li>
        <li class="active"><b>2</b><span>Identify bottleneck<small>Hot partition found</small></span></li>
        <li><b>3</b><span>Apply mitigation<small>Choose an action</small></span></li>
        <li><b>4</b><span>Verify recovery<small>Pending</small></span></li>
      </ol><button data-action="capacity">Increase capacity</button><button data-action="retry">Reduce retry amplification</button><button data-action="cache">Enable read cache</button><button class="resolve" data-action="resolve">Verify and resolve</button></aside>
    </div>
  </section>`;

  const canvas = $(stage,"[data-chart]"); const ctx = canvas.getContext("2d");
  function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height); ctx.fillStyle="#071019"; ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.strokeStyle="rgba(113,229,255,.1)"; for(let y=40;y<340;y+=60){ctx.beginPath();ctx.moveTo(50,y);ctx.lineTo(960,y);ctx.stroke();}
    const grad=ctx.createLinearGradient(0,0,0,360);grad.addColorStop(0,"rgba(255,116,104,.35)");grad.addColorStop(1,"rgba(255,116,104,0)");
    ctx.beginPath(); points.forEach((p,i)=>{const x=50+i*15.4;const y=330-Math.min(290,p/7); i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.lineTo(960,340);ctx.lineTo(50,340);ctx.closePath();ctx.fillStyle=grad;ctx.fill();
    ctx.beginPath();points.forEach((p,i)=>{const x=50+i*15.4;const y=330-Math.min(290,p/7);i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.strokeStyle="#ff7468";ctx.lineWidth=4;ctx.stroke();
  }
  function tick() {
    t++; const trend = severity/30; points.push(Math.max(120, points.at(-1)+(Math.random()-.45)*35+trend)); points.shift();
    const latency=Math.round(420+severity*19); $(stage,"[data-latency]").textContent=`${latency.toLocaleString()} ms`;
    $(stage,"[data-severity]").textContent=Math.round(severity); $(stage,"[data-throttles]").textContent=`${Math.round(throttles)}%`; $(stage,"[data-retries]").textContent=`${Math.round(retries)}%`; $(stage,"[data-users]").textContent=Math.round(severity*4.4);
    draw();
  }
  $$(stage,"[data-service]").forEach((button)=>button.addEventListener("click",()=>onSelect?.({index:"DEPENDENCY",title:button.querySelector("strong").textContent,kicker:button.querySelector("small").textContent,copy:"Inspect latency, errors, retry behavior, and downstream impact before applying remediation.",tags:["Metrics","Logs","Runbook"]})));
  $$(stage,"[data-action]").forEach((button)=>button.addEventListener("click",()=>{
    const action=button.dataset.action; const consoleNode=$(stage,"[data-console]");
    if(action==="capacity"){severity-=15;throttles-=28;}
    if(action==="retry"){severity-=12;retries-=35;}
    if(action==="cache"){severity-=18;throttles-=18;}
    if(action==="resolve"&&severity<30){severity=5; consoleNode.insertAdjacentHTML("afterbegin",`<p class="ok"><time>${new Date().toLocaleTimeString()}</time> Recovery verified. Incident resolved.</p>`); $$(stage,".runbook li").forEach(li=>li.className="done");}
    else consoleNode.insertAdjacentHTML("afterbegin",`<p><time>${new Date().toLocaleTimeString()}</time> Applied mitigation: ${button.textContent}</p>`);
    severity=Math.max(0,severity); throttles=Math.max(0,throttles); retries=Math.max(0,retries); tick();
  }));
  draw(); timer=setInterval(()=>{if(!paused){severity=Math.min(100,severity+.25);tick();}},1100);
  onReady?.({engineType:"OBSERVABILITY SIM"});
  return controller(stage,()=>clearInterval(timer),undefined,(value)=>paused=value,()=>{severity=72;throttles=86;retries=64;tick();});
}

function createVoiceOps({ stage, onSelect, onReady }) {
  const calls=[
    {id:"C-1042",caller:"815-***-0142",intent:"Estimate request",sentiment:"Positive",agent:"Derek",duration:42},
    {id:"C-1043",caller:"608-***-8821",intent:"Schedule change",sentiment:"Neutral",agent:"Routing",duration:17},
    {id:"C-1044",caller:"779-***-3904",intent:"Service question",sentiment:"Concerned",agent:"Scout",duration:68},
  ];
  let active=0; let paused=false; let timer; let transcriptIndex=0;
  const transcript=["Thanks for calling PCS LLC. How can I help today?","I need an estimate for a hauling job next week.","I can collect the job details and check the schedule.","The pickup is near Freeport and delivery is in Rockford.","I found two available windows. Would Tuesday morning work?"];

  stage.innerHTML=`<section class="demo-surface sim-voice">
    <header class="voice-header"><div class="voice-brand"><i>V</i><span><strong>VOICE OPS</strong><small>CONSENT-AWARE CALL DESK</small></span></div><div class="voice-summary"><article><strong>3</strong><span>live</span></article><article><strong>91%</strong><span>resolved</span></article><article><strong>2:48</strong><span>avg handle</span></article></div></header>
    <div class="voice-layout">
      <aside class="call-queue"><h3>LIVE CALLS</h3>${calls.map((c,i)=>`<button data-call="${i}" class="${i===0?"active":""}"><i></i><span><strong>${c.caller}</strong><small>${c.intent}</small></span><time data-call-time="${i}">${c.duration}s</time></button>`).join("")}<h3>WAITING</h3><div class="waiting-call"><span>+1 815-***-2230</span><em>00:12</em></div></aside>
      <main class="call-console">
        <div class="caller-card"><div><span data-call-id>C-1042</span><h2 data-caller>815-***-0142</h2><p data-intent>Estimate request</p></div><div class="consent"><i></i><span>Recording consent captured</span></div></div>
        <canvas width="1100" height="180" data-wave></canvas>
        <section class="transcript"><header><span>LIVE TRANSCRIPT</span><strong data-confidence>94% confidence</strong></header><ol data-transcript></ol></section>
        <div class="call-actions"><button data-voice="answer">Answer</button><button data-voice="book">Book appointment</button><button data-voice="transfer">Transfer to person</button><button class="end" data-voice="end">End call</button></div>
      </main>
      <aside class="call-inspector"><h3>CALL INTELLIGENCE</h3><article><span>ASSIGNED AGENT</span><strong data-agent>Derek</strong></article><article><span>SENTIMENT</span><strong data-sentiment>Positive</strong></article><article><span>NEXT ACTION</span><strong data-next>Collect job details</strong></article><div class="appointment"><span>APPOINTMENT</span><strong data-appointment>Not booked</strong><small data-appointment-detail>Calendar has not been checked.</small></div><div class="voice-events"><h4>EVENTS</h4><ol data-log></ol></div></aside>
    </div>
  </section>`;
  const wave=$(stage,"[data-wave]");const ctx=wave.getContext("2d");let phase=0;
  function drawWave(){ctx.clearRect(0,0,wave.width,wave.height);ctx.fillStyle="#06111a";ctx.fillRect(0,0,wave.width,wave.height);ctx.strokeStyle="#73f2b1";ctx.lineWidth=3;ctx.beginPath();for(let x=0;x<wave.width;x+=4){const y=90+Math.sin(x*.035+phase)*22*Math.sin(x*.009+phase*.4)+Math.sin(x*.13+phase)*8;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();phase+=.12;}
  function selectCall(index){active=index;const c=calls[index];$$(stage,"[data-call]").forEach((b,i)=>b.classList.toggle("active",i===index));$(stage,"[data-call-id]").textContent=c.id;$(stage,"[data-caller]").textContent=c.caller;$(stage,"[data-intent]").textContent=c.intent;$(stage,"[data-agent]").textContent=c.agent;$(stage,"[data-sentiment]").textContent=c.sentiment;$(stage,"[data-transcript]").replaceChildren();transcriptIndex=0;onSelect?.({index:"ACTIVE CALL",title:c.intent,kicker:c.sentiment.toUpperCase(),copy:`Assigned to ${c.agent}. Caller consent, transcript confidence, and next actions remain visible throughout the call.`,tags:["Consent","Transcript","Escalation"]});}
  $$(stage,"[data-call]").forEach(b=>b.addEventListener("click",()=>selectCall(Number(b.dataset.call))));
  $$(stage,"[data-voice]").forEach(b=>b.addEventListener("click",()=>{const action=b.dataset.voice;const events=$(stage,"[data-log]");if(action==="book"){$(stage,"[data-appointment]").textContent="Tuesday, 9:30 AM";$(stage,"[data-appointment-detail]").textContent="Availability checked and held for confirmation.";log(events,"Appointment slot held and confirmation prepared.");}if(action==="transfer")log(events,"Call transferred with transcript and summary attached.","warn");if(action==="answer")log(events,"Agent joined the call and acknowledged caller intent.");if(action==="end")log(events,"Call ended; summary and action items stored.");}));
  timer=setInterval(()=>{if(paused)return;calls[active].duration++;$(stage,`[data-call-time="${active}"]`).textContent=`${calls[active].duration}s`;drawWave();if(transcriptIndex<transcript.length&&Math.random()>.55){const li=document.createElement("li");li.innerHTML=`<span>${transcriptIndex%2?"CALLER":"AGENT"}</span><p>${transcript[transcriptIndex++]}</p>`;$(stage,"[data-transcript]").append(li);}},350);
  drawWave();selectCall(0);onReady?.({engineType:"CALL STATE ENGINE"});
  return controller(stage,()=>clearInterval(timer),undefined,(v)=>paused=v,()=>selectCall(0));
}

function createRAG({ stage, onSelect, onReady }) {
  const docs=[
    {title:"AWS internship notes",score:96,excerpt:"Cloud Support Associate internship, isolated lab accounts, DynamoDB capstone..."},
    {title:"ProjectHub architecture",score:91,excerpt:"Deterministic facts, provider failover, judge promotion, grounded answers..."},
    {title:"Certification record",score:84,excerpt:"AWS Solutions Architect Associate and AWS AI Practitioner..."},
    {title:"Portfolio projects",score:72,excerpt:"Voice Ops, Ethics Engine, Project Car Match, storefront systems..."},
  ];
  let run=0; let paused=false;
  stage.innerHTML=`<section class="demo-surface sim-rag">
    <header class="rag-header"><div><span>PROJECTHUB / EVIDENCE MODE</span><h2>Grounded Answer Visualizer</h2></div><form data-query-form><input data-query value="What did Brad build during his AWS internship?" aria-label="Question"><button>Run retrieval</button></form></header>
    <div class="rag-layout">
      <aside class="rag-documents"><h3>VERIFIED SOURCES</h3>${docs.map((d,i)=>`<button data-doc="${i}"><strong>${d.title}</strong><span>${d.excerpt}</span><meter min="0" max="100" value="${d.score}"></meter><em>${d.score}%</em></button>`).join("")}</aside>
      <main class="rag-flow"><div class="query-bubble" data-query-bubble>What did Brad build during his AWS internship?</div><div class="rag-stages">${["CLASSIFY","RETRIEVE","RERANK","CONTEXT","GENERATE","JUDGE"].map((s,i)=>`<div data-stage="${i}"><span>${i+1}</span><strong>${s}</strong><small>waiting</small></div>`).join("")}</div><div class="context-window"><header><span>CONTEXT WINDOW</span><strong data-token-count>0 / 8,192 tokens</strong></header><div data-context><p>No evidence loaded.</p></div></div></main>
      <aside class="rag-answer"><h3>GROUNDED ANSWER</h3><div data-answer><p>Run retrieval to construct an answer from verified evidence.</p></div><div class="judge-card"><span>JUDGE</span><strong data-judge>WAITING</strong><small data-judge-copy>Evidence and completion checks have not run.</small></div></aside>
    </div>
  </section>`;
  async function runFlow(event){event?.preventDefault();if(paused)return;run++;const q=$(stage,"[data-query]").value.trim();$(stage,"[data-query-bubble]").textContent=q;const stages=$$(stage,"[data-stage]");stages.forEach(s=>{s.className="";s.querySelector("small").textContent="waiting";});$(stage,"[data-context]").replaceChildren();$(stage,"[data-answer]").innerHTML="<p>Building answer...</p>";$(stage,"[data-judge]").textContent="RUNNING";
    for(let i=0;i<stages.length;i++){if(paused)break;stages.forEach((s,j)=>{s.classList.toggle("active",j===i);if(j<i){s.classList.add("complete");s.querySelector("small").textContent="complete";}if(j===i)s.querySelector("small").textContent="running";});if(i===1){$(stage,"[data-context]").innerHTML=docs.slice(0,3).map(d=>`<article><strong>${d.title}</strong><p>${d.excerpt}</p><em>${d.score}% match</em></article>`).join("");$(stage,"[data-token-count]").textContent="1,846 / 8,192 tokens";}await new Promise(r=>setTimeout(r,380));}
    stages.at(-1).classList.add("complete");stages.at(-1).querySelector("small").textContent="complete";$(stage,"[data-answer]").innerHTML=`<p>During his AWS Cloud Support Associate internship, Brad built a DynamoDB metadata extractor with a static frontend delivered through S3 and CloudFront. The capstone used Lambda and DynamoDB in isolated lab accounts and included a frontend cost monitor.</p><footer><button data-cite="0">[1] AWS internship notes</button><button data-cite="1">[2] ProjectHub architecture</button></footer>`;$(stage,"[data-judge]").textContent="PASS • 94%";$(stage,"[data-judge-copy]").textContent="All factual claims are supported by retrieved evidence.";$(stage,"[data-answer]").querySelectorAll("[data-cite]").forEach(b=>b.addEventListener("click",()=>$(stage,`[data-doc="${b.dataset.cite}"]`).focus()));}
  $(stage,"[data-query-form]").addEventListener("submit",runFlow);$$(stage,"[data-doc]").forEach(b=>b.addEventListener("click",()=>{const d=docs[Number(b.dataset.doc)];onSelect?.({index:"RETRIEVED EVIDENCE",title:d.title,kicker:`${d.score}% MATCH`,copy:d.excerpt,tags:["Verified source","Retrieval score","Citation"]});}));
  onReady?.({engineType:"RETRIEVAL PIPELINE"});
  return controller(stage,undefined,()=>({fps:"60",meshes:docs.length+run}),(v)=>paused=v,()=>runFlow());
}

function createRelease({ stage, onSelect, onReady }) {
  let state=0;let paused=false;const states=["branch","tests","pr","review","staging","production"];
  stage.innerHTML=`<section class="demo-surface sim-release">
    <header class="release-header"><div><span>REPOSITORY: VOICE-OPS-PLATFORM</span><h2>Release Control Room</h2></div><div><strong data-sha>92be517</strong><small>current candidate</small></div></header>
    <div class="release-layout">
      <main class="git-graph"><svg viewBox="0 0 1000 540"><path class="main-line" d="M100 90 V470"/><path class="feature-line" d="M100 160 C260 160 260 270 420 270 C580 270 580 390 740 390 C860 390 860 470 930 470"/>${[[100,90,"main"],[100,160,"697db6e"],[420,270,"92be517"],[740,390,"PR #9"],[930,470,"prod"]].map(([x,y,l],i)=>`<g class="commit-node ${i===0?"complete":""}" data-commit="${i}"><circle cx="${x}" cy="${y}" r="18"/><text x="${x+35}" y="${y+6}">${l}</text></g>`).join("")}</svg><div class="release-status" data-release-status><span>FEATURE BRANCH</span><strong>Candidate is ready for checks.</strong></div></main>
      <aside class="checks-panel"><h3>REQUIRED CHECKS</h3>${["Unit tests","Integration tests","Mobile smoke","Security scan","Human review"].map((n,i)=>`<div data-check="${i}"><i></i><span><strong>${n}</strong><small>waiting</small></span></div>`).join("")}<pre data-check-log>$ awaiting workflow run...</pre></aside>
      <aside class="release-actions"><h3>RELEASE ACTIONS</h3><button data-release="tests">Run checks</button><button data-release="approve">Approve PR</button><button data-release="staging">Deploy staging</button><button data-release="production">Promote production</button><button class="rollback" data-release="rollback">Rollback</button><div class="deploy-card"><span>DEPLOYMENT</span><strong data-environment>development</strong><small data-deploy-copy>No production change has been made.</small></div></aside>
    </div>
  </section>`;
  const checkLog=$(stage,"[data-check-log]");
  function setState(next){state=next;$$(stage,"[data-commit]").forEach((n,i)=>{n.classList.toggle("complete",i<=Math.min(next,4));n.classList.toggle("active",i===Math.min(next,4));});const labels=["FEATURE BRANCH","CHECKS RUNNING","PULL REQUEST","REVIEW APPROVED","STAGING VERIFIED","PRODUCTION ACTIVE"];$(stage,"[data-release-status]").innerHTML=`<span>${labels[next]}</span><strong>${["Candidate is ready for checks.","Automated validation is executing.","PR #9 is open with evidence attached.","Required review was approved.","Staging smoke tests passed.","Production deployment is healthy."][next]}</strong>`;}
  async function runChecks(){if(paused)return;setState(1);checkLog.textContent="$ starting checks...";const checks=$$(stage,"[data-check]");for(let i=0;i<checks.length;i++){checks[i].className="running";checks[i].querySelector("small").textContent="running";await new Promise(r=>setTimeout(r,320));checks[i].className="pass";checks[i].querySelector("small").textContent="passed";checkLog.textContent+=`\n✓ ${checks[i].querySelector("strong").textContent}`;}setState(2);}
  $$(stage,"[data-release]").forEach(b=>b.addEventListener("click",async()=>{const a=b.dataset.release;if(a==="tests")await runChecks();if(a==="approve"&&state>=2)setState(3);if(a==="staging"&&state>=3){setState(4);$(stage,"[data-environment]").textContent="staging";$(stage,"[data-deploy-copy]").textContent="Smoke tests passed against the release candidate.";}if(a==="production"&&state>=4){setState(5);$(stage,"[data-environment]").textContent="production";$(stage,"[data-deploy-copy]").textContent="Deployment activated with rollback SHA recorded.";}if(a==="rollback"&&state===5){setState(4);$(stage,"[data-environment]").textContent="rolled back";$(stage,"[data-deploy-copy]").textContent="Previous verified production SHA restored.";}}));
  $$(stage,"[data-commit]").forEach(n=>n.addEventListener("click",()=>onSelect?.({index:"GIT OBJECT",title:n.querySelector("text").textContent,kicker:"TRACEABLE RELEASE EVIDENCE",copy:"Every release stage is tied to a commit, required check, approval, environment, and rollback target.",tags:["Git graph","CI checks","Rollback"]})));
  setState(0);onReady?.({engineType:"RELEASE STATE MACHINE"});
  return controller(stage,undefined,()=>({fps:"60",meshes:state+5}),(v)=>paused=v,()=>{state=0;$$(stage,"[data-check]").forEach(n=>{n.className="";n.querySelector("small").textContent="waiting";});setState(0);});
}

const creators={
  "agent-operations":createAgentOperations,
  "llm-router":createLLMRouter,
  "cloud-incident":createCloudIncident,
  "voice-ops":createVoiceOps,
  "projecthub-rag":createRAG,
  "release-pipeline":createRelease,
};

export function createSystemSimulation(context){
  const create=creators[context.demo.id];
  if(!create) throw new Error(`Unknown system simulation: ${context.demo.id}`);
  return create(context);
}
