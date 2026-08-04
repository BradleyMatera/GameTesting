const TOOL_CONFIG = {
  "architecture-builder": { title: "Cloud Architecture Builder", accent: "#71e5ff", description: "Place services, connect a request path, and inspect cost, reliability, and latency tradeoffs." },
  "workflow-designer": { title: "Agent Workflow Designer", accent: "#b68cff", description: "Build an agent process from triggers, tools, approvals, branches, and completion rules." },
  "seo-auditor": { title: "SEO / AEO Auditor", accent: "#88f5a7", description: "Analyze page content for structure, answerability, metadata, entities, and conversion clarity." },
  "accessibility-lab": { title: "Accessibility Lab", accent: "#ffd36e", description: "Toggle common interface failures and see how keyboard, contrast, labels, motion, and hierarchy change." },
  "api-failure-lab": { title: "API Failure Laboratory", accent: "#ff7fa8", description: "Configure latency, rate limits, timeouts, retries, and fallback behavior, then run the request." },
  "shader-lab": { title: "Shader & Material Lab", accent: "#ff9a62", description: "Manipulate animated procedural material controls and inspect the generated visual response." },
  "procedural-world": { title: "Procedural World Generator", accent: "#62d7ff", description: "Generate repeatable terrain, settlements, roads, water, and resources from a deterministic seed." },
};

const ARCH_SERVICES = [
  { id: "cdn", name: "CDN", icon: "◎", cost: 3, latency: -42, reliability: 2 },
  { id: "api", name: "API Gateway", icon: "⇄", cost: 5, latency: 18, reliability: 1 },
  { id: "function", name: "Functions", icon: "λ", cost: 4, latency: 36, reliability: 1 },
  { id: "database", name: "Database", icon: "▤", cost: 12, latency: 22, reliability: 3 },
  { id: "queue", name: "Queue", icon: "≡", cost: 4, latency: 65, reliability: 5 },
  { id: "cache", name: "Cache", icon: "⚡", cost: 6, latency: -58, reliability: 2 },
  { id: "monitor", name: "Monitoring", icon: "◉", cost: 2, latency: 0, reliability: 4 },
];

const WORKFLOW_NODES = [
  { type: "trigger", name: "New request", icon: "▶" },
  { type: "agent", name: "Research agent", icon: "R" },
  { type: "agent", name: "Builder agent", icon: "B" },
  { type: "tool", name: "Search sources", icon: "⌕" },
  { type: "tool", name: "Run tests", icon: "✓" },
  { type: "approval", name: "Human approval", icon: "!" },
  { type: "branch", name: "Confidence branch", icon: "◇" },
  { type: "output", name: "Verified result", icon: "■" },
];

function toolShell(config, inner) {
  return `<section class="demo-surface tool-surface" style="--demo-accent:${config.accent}">
    <header class="surface-header tool-header"><div><p class="surface-kicker">INTERACTIVE FRONTEND TOOL</p><h2>${config.title}</h2><p>${config.description}</p></div><span class="local-badge">RUNS LOCALLY</span></header>
    ${inner}
  </section>`;
}

function architectureTemplate(config) {
  return toolShell(config, `<div class="tool-workspace architecture-workspace">
    <aside class="tool-palette"><header><span>SERVICE PALETTE</span><small>Click to add</small></header>${ARCH_SERVICES.map((service) => `<button data-add-service="${service.id}"><i>${service.icon}</i><span><strong>${service.name}</strong><small>+$${service.cost}/mo</small></span><b>+</b></button>`).join("")}</aside>
    <main class="architecture-canvas"><div class="canvas-toolbar"><button data-arch-action="simulate">▶ Simulate request</button><button data-arch-action="clear">Clear</button><span>Click deployed nodes to remove them</span></div><div class="request-lane"><span class="request-origin">USER</span><div class="deployed-services" data-deployed></div><span class="request-destination">RESPONSE</span><i class="request-packet" data-request-packet></i></div><div class="empty-canvas" data-empty-state><strong>Start with a CDN or API Gateway</strong><span>Build a request path from left to right.</span></div></main>
    <aside class="architecture-score"><header>ARCHITECTURE ESTIMATE</header><article><span>MONTHLY BASE</span><strong data-arch-cost>$0</strong></article><article><span>LATENCY</span><strong data-arch-latency>140 ms</strong></article><article><span>RELIABILITY</span><strong data-arch-reliability>88%</strong></article><article><span>REQUEST STATUS</span><strong data-arch-status>NOT RUN</strong></article><p data-arch-advice>Add monitoring and a queue to improve recoverability. Add a cache to lower read latency.</p></aside>
  </div>`);
}

function workflowTemplate(config) {
  return toolShell(config, `<div class="tool-workspace workflow-workspace">
    <aside class="tool-palette"><header><span>WORKFLOW NODES</span><small>Click to append</small></header>${WORKFLOW_NODES.map((node, index) => `<button data-add-workflow="${index}"><i class="${node.type}">${node.icon}</i><span><strong>${node.name}</strong><small>${node.type}</small></span><b>+</b></button>`).join("")}</aside>
    <main class="workflow-canvas"><div class="canvas-toolbar"><button data-workflow-action="run">▶ Run workflow</button><button data-workflow-action="clear">Clear</button><span data-workflow-status>Ready</span></div><ol data-workflow-lane></ol><div class="empty-canvas" data-workflow-empty><strong>Design an observable workflow</strong><span>Every node will expose waiting, running, complete, or failed state.</span></div></main>
    <aside class="workflow-inspector"><header>RUN INSPECTOR</header><article><span>NODES</span><strong data-workflow-count>0</strong></article><article><span>EST. CONTEXT</span><strong data-workflow-context>0 tokens</strong></article><article><span>APPROVAL GATES</span><strong data-workflow-approvals>0</strong></article><div class="mini-log" data-workflow-log><p>No run events yet.</p></div></aside>
  </div>`);
}

function seoTemplate(config) {
  const sample = `<title>Cloud Support and Full-Stack Engineering | Brad Matera</title>\n<meta name="description" content="Explore verified cloud, agent, and web engineering work by Brad Matera.">\n<h1>Systems that prove they work</h1>\n<h2>Cloud support engineering</h2>\n<p>I build observable software, grounded AI tools, and accessible web experiences.</p>\n<a href="/projects">View verified projects</a>`;
  return toolShell(config, `<div class="audit-layout">
    <section class="audit-input"><header><div><span>PAGE SOURCE / CONTENT</span><small>Paste HTML or copy</small></div><button data-seo-sample>Load sample</button></header><textarea data-seo-input spellcheck="false">${sample.replace(/</g, "&lt;")}</textarea><button class="audit-run" data-seo-run>RUN FULL AUDIT</button></section>
    <section class="audit-results"><header><div><span>READINESS SCORE</span><strong data-seo-score>--</strong></div><i><b data-seo-ring></b></i></header><div class="audit-checks" data-seo-checks><p>Run the audit to inspect structure, metadata, answerability, entities, links, and calls to action.</p></div></section>
    <aside class="audit-preview"><header>SEARCH / ANSWER PREVIEW</header><article><a data-preview-title>Cloud Support and Full-Stack Engineering | Brad Matera</a><span>bradleymatera.dev › systems</span><p data-preview-description>Explore verified cloud, agent, and web engineering work by Brad Matera.</p></article><div class="answer-card"><span>DIRECT ANSWER CANDIDATE</span><p data-answer-preview>Your strongest concise answer will appear here after analysis.</p></div></aside>
  </div>`);
}

function accessibilityTemplate(config) {
  return toolShell(config, `<div class="a11y-layout">
    <aside class="a11y-controls"><header>ISSUE CONTROLS</header>${[
      ["contrast", "Low contrast"], ["labels", "Remove labels"], ["focus", "Hide focus"], ["headings", "Break headings"], ["motion", "Forced motion"], ["target", "Tiny targets"]
    ].map(([id, label]) => `<label><span>${label}</span><input type="checkbox" data-a11y-toggle="${id}"><i></i></label>`).join("")}<button data-a11y-keyboard>START KEYBOARD TEST</button></aside>
    <main class="a11y-preview" data-a11y-preview><div class="preview-site"><nav><strong>NORTHSTAR</strong><div><a href="#">Services</a><a href="#">Work</a><a href="#">Contact</a></div></nav><section><p>ACCESSIBLE BY DEFAULT</p><h2 data-heading>Technology should work for everyone.</h2><span>Test this interface while deliberately introducing common accessibility failures.</span><form><label data-form-label>Name<input aria-label="Name" placeholder="Your name"></label><label data-form-label>Email<input aria-label="Email" type="email" placeholder="you@example.com"></label><button type="button">Request information</button></form></section><div class="motion-orbit"><i></i><i></i><strong>A11Y</strong></div></div></main>
    <aside class="a11y-report"><header>LIVE REPORT</header><strong data-a11y-score>100</strong><span>ACCESSIBILITY SCORE</span><ol data-a11y-list><li class="pass">No deliberate failures enabled.</li></ol><p>Use Tab after starting the keyboard test. This is an educational simulation, not a replacement for automated and manual auditing.</p></aside>
  </div>`);
}

function apiTemplate(config) {
  return toolShell(config, `<div class="api-layout">
    <section class="api-controls"><header>FAILURE CONFIGURATION</header><label>Base latency <output data-latency-output>400 ms</output><input type="range" min="50" max="3000" step="50" value="400" data-api-latency></label><label>Failure mode<select data-api-mode><option value="none">Healthy response</option><option value="429">429 rate limit</option><option value="timeout">Timeout</option><option value="500">500 server error</option><option value="malformed">Malformed JSON</option></select></label><label>Retry policy<select data-api-retries><option value="0">No retries</option><option value="1">1 retry</option><option value="3" selected>3 retries with backoff</option></select></label><label class="switch-label"><span>Fallback provider</span><input type="checkbox" checked data-api-fallback><i></i></label><button data-api-run>RUN REQUEST</button></section>
    <main class="api-visual"><div class="api-node client"><span>01</span><strong>CLIENT</strong><small>POST /answer</small></div><div class="api-wire"><i data-api-packet></i></div><div class="api-node primary"><span>02</span><strong>PRIMARY API</strong><small data-primary-state>READY</small></div><div class="api-wire"><i></i></div><div class="api-node fallback"><span>03</span><strong>FALLBACK</strong><small data-fallback-state>STANDBY</small></div><div class="api-response" data-api-response><span>RESPONSE</span><strong>Not started</strong><pre>{}</pre></div></main>
    <aside class="api-log"><header><span>REQUEST TRACE</span><button data-api-clear>Clear</button></header><ol data-api-log><li><time>--</time><span>Configure a failure and run the request.</span></li></ol></aside>
  </div>`);
}

function shaderTemplate(config) {
  return toolShell(config, `<div class="shader-layout">
    <section class="shader-preview"><canvas width="900" height="620" data-shader-canvas></canvas><div class="shader-label"><span>PROCEDURAL MATERIAL</span><strong data-shader-name>NEURAL PLASMA</strong></div></section>
    <aside class="shader-controls"><header>MATERIAL CONTROLS</header><label>Pattern<select data-shader-pattern><option value="plasma">Neural plasma</option><option value="grid">Data grid</option><option value="rings">Signal rings</option><option value="terrain">Topographic</option></select></label><label>Speed <output data-shader-speed-output>1.0</output><input type="range" min="0" max="3" step="0.1" value="1" data-shader-speed></label><label>Scale <output data-shader-scale-output>3.0</output><input type="range" min="1" max="10" step="0.1" value="3" data-shader-scale></label><label>Distortion <output data-shader-distort-output>0.35</output><input type="range" min="0" max="1" step="0.01" value="0.35" data-shader-distort></label><label>Glow <output data-shader-glow-output>0.70</output><input type="range" min="0" max="1" step="0.01" value="0.7" data-shader-glow></label><button data-shader-randomize>RANDOMIZE MATERIAL</button></aside>
    <aside class="shader-code"><header>GENERATED PARAMETERS</header><pre data-shader-code></pre><p>Rendered with Canvas 2D procedural math so the experiment remains lightweight and works without external textures.</p></aside>
  </div>`);
}

function worldTemplate(config) {
  return toolShell(config, `<div class="world-layout">
    <section class="world-preview"><canvas width="1000" height="680" data-world-canvas></canvas><div class="world-legend"><span><i class="water"></i>Water</span><span><i class="plains"></i>Plains</span><span><i class="forest"></i>Forest</span><span><i class="mountain"></i>Mountain</span><span><i class="town"></i>Settlement</span></div></section>
    <aside class="world-controls"><header>WORLD PARAMETERS</header><label>Seed<div><input value="MATERA-2026" data-world-seed><button data-world-random>↻</button></div></label><label>Water level <output data-water-output>38%</output><input type="range" min="20" max="60" value="38" data-world-water></label><label>Forest density <output data-forest-output>45%</output><input type="range" min="0" max="90" value="45" data-world-forest></label><label>Settlements <output data-town-output>5</output><input type="range" min="0" max="12" value="5" data-world-towns></label><label class="switch-label"><span>Road network</span><input type="checkbox" checked data-world-roads><i></i></label><button data-world-generate>GENERATE WORLD</button></aside>
    <aside class="world-stats"><header>GENERATED REGION</header><article><span>LAND AREA</span><strong data-land-stat>--</strong></article><article><span>FOREST</span><strong data-forest-stat>--</strong></article><article><span>SETTLEMENTS</span><strong data-town-stat>--</strong></article><article><span>TRADE ROUTES</span><strong data-road-stat>--</strong></article><p>Every map is deterministic. Reusing the same seed and controls recreates the same world.</p></aside>
  </div>`);
}

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rng(seed) {
  let state = seed >>> 0;
  return () => ((state = Math.imul(state, 1664525) + 1013904223 >>> 0) / 4294967296);
}

function wireArchitecture(stage) {
  const deployed = [];
  const lane = stage.querySelector("[data-deployed]");
  const update = () => {
    lane.innerHTML = deployed.map((service, index) => `<button data-remove-service="${index}"><i>${service.icon}</i><strong>${service.name}</strong><small>${index + 1}</small></button>`).join("<span class='service-link'>→</span>");
    stage.querySelector("[data-empty-state]").hidden = deployed.length > 0;
    const cost = deployed.reduce((sum, service) => sum + service.cost, 0);
    const latency = Math.max(22, 140 + deployed.reduce((sum, service) => sum + service.latency, 0));
    const reliability = Math.min(99.99, 88 + deployed.reduce((sum, service) => sum + service.reliability, 0));
    stage.querySelector("[data-arch-cost]").textContent = `$${cost}/mo`;
    stage.querySelector("[data-arch-latency]").textContent = `${latency} ms`;
    stage.querySelector("[data-arch-reliability]").textContent = `${reliability.toFixed(2)}%`;
    lane.querySelectorAll("[data-remove-service]").forEach((button) => button.addEventListener("click", () => { deployed.splice(Number(button.dataset.removeService), 1); update(); }));
  };
  stage.querySelectorAll("[data-add-service]").forEach((button) => button.addEventListener("click", () => { deployed.push(ARCH_SERVICES.find((service) => service.id === button.dataset.addService)); update(); }));
  stage.querySelector('[data-arch-action="clear"]').addEventListener("click", () => { deployed.splice(0); update(); });
  stage.querySelector('[data-arch-action="simulate"]').addEventListener("click", () => {
    const packet = stage.querySelector("[data-request-packet]");
    const status = stage.querySelector("[data-arch-status]");
    if (!deployed.length) { status.textContent = "NO PATH"; return; }
    packet.classList.remove("run"); void packet.offsetWidth; packet.classList.add("run");
    status.textContent = "RUNNING";
    setTimeout(() => { status.textContent = deployed.some((service) => service.id === "database" || service.id === "function") ? "200 OK" : "204 EMPTY"; }, 1400);
  });
  update();
}

function wireWorkflow(stage) {
  const nodes = [];
  let runTimer;
  const lane = stage.querySelector("[data-workflow-lane]");
  const log = stage.querySelector("[data-workflow-log]");
  const render = () => {
    lane.innerHTML = nodes.map((node, index) => `<li data-work-node="${index}" class="${node.state || "waiting"}"><button data-remove-node="${index}" title="Remove node">×</button><i class="${node.type}">${node.icon}</i><span><strong>${node.name}</strong><small>${node.state || "waiting"}</small></span></li>`).join("");
    stage.querySelector("[data-workflow-empty]").hidden = nodes.length > 0;
    stage.querySelector("[data-workflow-count]").textContent = nodes.length;
    stage.querySelector("[data-workflow-context]").textContent = `${nodes.length * 640} tokens`;
    stage.querySelector("[data-workflow-approvals]").textContent = nodes.filter((node) => node.type === "approval").length;
    lane.querySelectorAll("[data-remove-node]").forEach((button) => button.addEventListener("click", () => { nodes.splice(Number(button.dataset.removeNode), 1); render(); }));
  };
  stage.querySelectorAll("[data-add-workflow]").forEach((button) => button.addEventListener("click", () => { nodes.push({ ...WORKFLOW_NODES[Number(button.dataset.addWorkflow)] }); render(); }));
  stage.querySelector('[data-workflow-action="clear"]').addEventListener("click", () => { clearInterval(runTimer); nodes.splice(0); log.innerHTML = "<p>Workflow cleared.</p>"; render(); });
  stage.querySelector('[data-workflow-action="run"]').addEventListener("click", () => {
    clearInterval(runTimer); if (!nodes.length) return;
    nodes.forEach((node) => { node.state = "waiting"; }); let index = 0; log.replaceChildren();
    const step = () => { nodes.forEach((node, i) => { node.state = i < index ? "complete" : i === index ? "running" : "waiting"; }); render(); if (index < nodes.length) log.insertAdjacentHTML("afterbegin", `<p><b>${String(index + 1).padStart(2, "0")}</b> ${nodes[index].name} entered running state.</p>`); index += 1; if (index > nodes.length) { clearInterval(runTimer); stage.querySelector("[data-workflow-status]").textContent = "Run complete"; } };
    stage.querySelector("[data-workflow-status]").textContent = "Running"; step(); runTimer = setInterval(step, 850);
  });
  render();
  return () => clearInterval(runTimer);
}

function wireSeo(stage) {
  const input = stage.querySelector("[data-seo-input]");
  const run = () => {
    const value = input.value;
    const checks = [
      [/<title>[^<]{20,65}<\/title>/i.test(value), "Descriptive title between 20 and 65 characters"],
      [/meta name=["']description["']/i.test(value), "Meta description is present"],
      [/<h1[\s>]/i.test(value), "One primary H1 communicates the page purpose"],
      [/<h2[\s>]/i.test(value), "Supporting H2 structure is present"],
      [/<p[\s>][\s\S]{40,}<\/p>/i.test(value), "Substantive explanatory copy is available"],
      [/<a[\s>]/i.test(value), "A crawlable next action is present"],
      [/(Brad Matera|AWS|cloud|engineering|agent)/i.test(value), "Recognizable entities and topic language are present"],
      [/(what|how|why|build|explore|verified|systems)/i.test(value), "Content contains answer-oriented language"],
    ];
    const passed = checks.filter(([ok]) => ok).length;
    const score = Math.round((passed / checks.length) * 100);
    stage.querySelector("[data-seo-score]").textContent = score;
    stage.querySelector("[data-seo-ring]").style.setProperty("--score", `${score * 3.6}deg`);
    stage.querySelector("[data-seo-checks]").innerHTML = checks.map(([ok, label]) => `<article class="${ok ? "pass" : "fail"}"><span>${ok ? "✓" : "!"}</span><p>${label}</p><b>${ok ? "PASS" : "FIX"}</b></article>`).join("");
    const title = value.match(/<title>([^<]+)<\/title>/i)?.[1] || "Untitled page";
    const description = value.match(/meta name=["']description["'] content=["']([^"']+)/i)?.[1] || "No meta description found.";
    const answer = value.match(/<p[^>]*>([^<]{35,})<\/p>/i)?.[1] || "No concise explanatory paragraph was found.";
    stage.querySelector("[data-preview-title]").textContent = title;
    stage.querySelector("[data-preview-description]").textContent = description;
    stage.querySelector("[data-answer-preview]").textContent = answer;
  };
  stage.querySelector("[data-seo-run]").addEventListener("click", run);
  stage.querySelector("[data-seo-sample]").addEventListener("click", run);
  run();
}

function wireAccessibility(stage) {
  const issues = { contrast: "Text contrast falls below a readable target.", labels: "Form controls no longer expose visible labels.", focus: "Keyboard focus is hidden.", headings: "Heading hierarchy skips levels.", motion: "Motion ignores reduced-motion preference.", target: "Interactive targets are too small." };
  const preview = stage.querySelector("[data-a11y-preview]");
  const update = () => {
    const active = [...stage.querySelectorAll("[data-a11y-toggle]:checked")].map((input) => input.dataset.a11yToggle);
    preview.className = `a11y-preview ${active.map((id) => `issue-${id}`).join(" ")}`;
    stage.querySelectorAll("[data-form-label]").forEach((label) => label.classList.toggle("visually-remove-label", active.includes("labels")));
    stage.querySelector("[data-heading]").outerHTML = active.includes("headings") ? '<h4 data-heading>Technology should work for everyone.</h4>' : '<h2 data-heading>Technology should work for everyone.</h2>';
    const score = Math.max(12, 100 - active.length * 14);
    stage.querySelector("[data-a11y-score]").textContent = score;
    stage.querySelector("[data-a11y-list]").innerHTML = active.length ? active.map((id) => `<li class="fail">${issues[id]}</li>`).join("") : '<li class="pass">No deliberate failures enabled.</li>';
  };
  stage.querySelectorAll("[data-a11y-toggle]").forEach((input) => input.addEventListener("change", update));
  stage.querySelector("[data-a11y-keyboard]").addEventListener("click", () => { stage.querySelector(".preview-site a, .preview-site input, .preview-site button")?.focus(); });
  update();
}

function wireApi(stage) {
  const latency = stage.querySelector("[data-api-latency]");
  const log = stage.querySelector("[data-api-log]");
  let timers = [];
  const addLog = (message, level = "") => { log.insertAdjacentHTML("afterbegin", `<li class="${level}"><time>${new Date().toLocaleTimeString([], { minute: "2-digit", second: "2-digit" })}</time><span>${message}</span></li>`); };
  latency.addEventListener("input", () => { stage.querySelector("[data-latency-output]").textContent = `${latency.value} ms`; });
  stage.querySelector("[data-api-clear]").addEventListener("click", () => log.replaceChildren());
  stage.querySelector("[data-api-run]").addEventListener("click", () => {
    timers.forEach(clearTimeout); timers = []; const mode = stage.querySelector("[data-api-mode]").value; const retries = Number(stage.querySelector("[data-api-retries]").value); const fallback = stage.querySelector("[data-api-fallback]").checked; const delay = Math.min(Number(latency.value), 1600);
    stage.querySelector("[data-primary-state]").textContent = "REQUESTING"; stage.querySelector("[data-fallback-state]").textContent = "STANDBY"; stage.querySelector("[data-api-response] strong").textContent = "Pending"; addLog("Request dispatched to primary provider.");
    const finish = (provider) => { stage.querySelector("[data-api-response] strong").textContent = "200 OK"; stage.querySelector("[data-api-response] pre").textContent = JSON.stringify({ provider, verified: true, latency_ms: delay }, null, 2); addLog(`${provider} returned a valid response.`, "success"); };
    timers.push(setTimeout(() => {
      if (mode === "none") { stage.querySelector("[data-primary-state]").textContent = "200 OK"; finish("primary"); return; }
      stage.querySelector("[data-primary-state]").textContent = mode.toUpperCase(); addLog(`Primary failed with ${mode}.`, "error");
      let attempt = 0;
      const retry = () => { if (attempt < retries) { attempt += 1; addLog(`Retry ${attempt}/${retries} after backoff.`, "warn"); timers.push(setTimeout(retry, 400 + attempt * 240)); } else if (fallback) { stage.querySelector("[data-fallback-state]").textContent = "REQUESTING"; addLog("Retry budget exhausted; fallback engaged.", "warn"); timers.push(setTimeout(() => { stage.querySelector("[data-fallback-state]").textContent = "200 OK"; finish("fallback"); }, 650)); } else { stage.querySelector("[data-api-response] strong").textContent = "FAILED"; stage.querySelector("[data-api-response] pre").textContent = JSON.stringify({ error: mode, retries }, null, 2); addLog("Request failed without a fallback.", "error"); } };
      retry();
    }, delay));
  });
  return () => timers.forEach(clearTimeout);
}

function wireShader(stage) {
  const canvas = stage.querySelector("[data-shader-canvas]"); const ctx = canvas.getContext("2d"); let frame; let time = 0;
  const controls = { pattern: stage.querySelector("[data-shader-pattern]"), speed: stage.querySelector("[data-shader-speed]"), scale: stage.querySelector("[data-shader-scale]"), distort: stage.querySelector("[data-shader-distort]"), glow: stage.querySelector("[data-shader-glow]") };
  const updateText = () => { stage.querySelector("[data-shader-speed-output]").textContent = Number(controls.speed.value).toFixed(1); stage.querySelector("[data-shader-scale-output]").textContent = Number(controls.scale.value).toFixed(1); stage.querySelector("[data-shader-distort-output]").textContent = Number(controls.distort.value).toFixed(2); stage.querySelector("[data-shader-glow-output]").textContent = Number(controls.glow.value).toFixed(2); stage.querySelector("[data-shader-name]").textContent = controls.pattern.selectedOptions[0].textContent.toUpperCase(); stage.querySelector("[data-shader-code]").textContent = `pattern: ${controls.pattern.value}\nspeed: ${controls.speed.value}\nscale: ${controls.scale.value}\ndistortion: ${controls.distort.value}\nglow: ${controls.glow.value}`; };
  Object.values(controls).forEach((control) => control.addEventListener("input", updateText));
  stage.querySelector("[data-shader-randomize]").addEventListener("click", () => { controls.pattern.selectedIndex = Math.floor(Math.random() * 4); controls.speed.value = (Math.random() * 2.7 + 0.2).toFixed(1); controls.scale.value = (Math.random() * 7 + 2).toFixed(1); controls.distort.value = Math.random().toFixed(2); controls.glow.value = (Math.random() * 0.7 + 0.25).toFixed(2); updateText(); });
  const draw = () => { const w = canvas.width; const h = canvas.height; const scale = Number(controls.scale.value); const distortion = Number(controls.distort.value); const glow = Number(controls.glow.value); time += Number(controls.speed.value) * 0.018; const image = ctx.createImageData(w / 4, h / 4); const iw = image.width; const ih = image.height; for (let y = 0; y < ih; y += 1) { for (let x = 0; x < iw; x += 1) { const nx = x / iw * scale; const ny = y / ih * scale; let v; if (controls.pattern.value === "grid") v = Math.sin(nx * 10 + time) * Math.sin(ny * 10 - time); else if (controls.pattern.value === "rings") v = Math.sin(Math.hypot(nx - scale / 2, ny - scale / 2) * 12 - time * 5); else if (controls.pattern.value === "terrain") v = Math.sin(nx * 3 + Math.sin(ny * 2 + time)) + Math.cos(ny * 4 - time); else v = Math.sin(nx * 3 + time + Math.sin(ny * 2)) + Math.cos(ny * 4 - time + Math.sin(nx * distortion * 5)); const index = (y * iw + x) * 4; const n = (v + 2) / 4; image.data[index] = 20 + n * 235 * glow; image.data[index + 1] = 60 + (1 - n) * 170; image.data[index + 2] = 120 + n * 135; image.data[index + 3] = 255; } } const off = document.createElement("canvas"); off.width = iw; off.height = ih; off.getContext("2d").putImageData(image, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, w, h); frame = requestAnimationFrame(draw); };
  updateText(); draw(); return () => cancelAnimationFrame(frame);
}

function wireWorld(stage) {
  const canvas = stage.querySelector("[data-world-canvas]"); const ctx = canvas.getContext("2d");
  const controls = { seed: stage.querySelector("[data-world-seed]"), water: stage.querySelector("[data-world-water]"), forest: stage.querySelector("[data-world-forest]"), towns: stage.querySelector("[data-world-towns]"), roads: stage.querySelector("[data-world-roads]") };
  const generate = () => { const random = rng(hashString(`${controls.seed.value}-${controls.water.value}-${controls.forest.value}-${controls.towns.value}`)); const cols = 64; const rows = 44; const cw = canvas.width / cols; const ch = canvas.height / rows; const water = Number(controls.water.value) / 100; const forest = Number(controls.forest.value) / 100; const map = []; let land = 0; let forestCount = 0; for (let y = 0; y < rows; y += 1) { map[y] = []; for (let x = 0; x < cols; x += 1) { const edge = Math.min(x, y, cols - x, rows - y) / 10; const noise = (Math.sin(x * 0.21 + random() * 2) + Math.cos(y * 0.27 + random() * 2) + Math.sin((x + y) * 0.11)) / 3; const elevation = noise * 0.25 + random() * 0.55 + Math.min(1, edge) * 0.2; let type = elevation < water ? "water" : elevation > 0.82 ? "mountain" : random() < forest ? "forest" : "plains"; map[y][x] = type; if (type !== "water") land += 1; if (type === "forest") forestCount += 1; ctx.fillStyle = { water: "#0b4461", plains: "#5d8154", forest: "#244f3a", mountain: "#77786f" }[type]; ctx.fillRect(x * cw, y * ch, cw + 1, ch + 1); } } const settlements = []; let attempts = 0; while (settlements.length < Number(controls.towns.value) && attempts < 500) { attempts += 1; const x = Math.floor(random() * cols); const y = Math.floor(random() * rows); if (map[y][x] !== "water" && map[y][x] !== "mountain" && settlements.every((town) => Math.hypot(town.x - x, town.y - y) > 6)) settlements.push({ x, y }); } if (controls.roads.checked && settlements.length > 1) { ctx.strokeStyle = "rgba(239,210,143,.8)"; ctx.lineWidth = 3; for (let i = 1; i < settlements.length; i += 1) { ctx.beginPath(); ctx.moveTo((settlements[i - 1].x + .5) * cw, (settlements[i - 1].y + .5) * ch); ctx.lineTo((settlements[i].x + .5) * cw, (settlements[i].y + .5) * ch); ctx.stroke(); } } settlements.forEach((town, index) => { ctx.fillStyle = "#ffe59c"; ctx.beginPath(); ctx.arc((town.x + .5) * cw, (town.y + .5) * ch, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#091018"; ctx.font = "bold 9px sans-serif"; ctx.fillText(String(index + 1), town.x * cw + 2, town.y * ch + 4); }); const total = cols * rows; stage.querySelector("[data-land-stat]").textContent = `${Math.round(land / total * 100)}%`; stage.querySelector("[data-forest-stat]").textContent = `${Math.round(forestCount / total * 100)}%`; stage.querySelector("[data-town-stat]").textContent = settlements.length; stage.querySelector("[data-road-stat]").textContent = controls.roads.checked ? Math.max(0, settlements.length - 1) : 0; };
  controls.water.addEventListener("input", () => { stage.querySelector("[data-water-output]").textContent = `${controls.water.value}%`; }); controls.forest.addEventListener("input", () => { stage.querySelector("[data-forest-output]").textContent = `${controls.forest.value}%`; }); controls.towns.addEventListener("input", () => { stage.querySelector("[data-town-output]").textContent = controls.towns.value; }); stage.querySelector("[data-world-random]").addEventListener("click", () => { controls.seed.value = Math.random().toString(36).slice(2, 10).toUpperCase(); generate(); }); stage.querySelector("[data-world-generate]").addEventListener("click", generate); generate();
}

function templateFor(config, id) {
  if (id === "architecture-builder") return architectureTemplate(config);
  if (id === "workflow-designer") return workflowTemplate(config);
  if (id === "seo-auditor") return seoTemplate(config);
  if (id === "accessibility-lab") return accessibilityTemplate(config);
  if (id === "api-failure-lab") return apiTemplate(config);
  if (id === "shader-lab") return shaderTemplate(config);
  return worldTemplate(config);
}

export function createInteractiveTool({ stage, demo, onReady }) {
  const config = TOOL_CONFIG[demo.id]; let cleanup = () => {};
  stage.innerHTML = templateFor(config, demo.id);
  if (demo.id === "architecture-builder") wireArchitecture(stage);
  else if (demo.id === "workflow-designer") cleanup = wireWorkflow(stage);
  else if (demo.id === "seo-auditor") wireSeo(stage);
  else if (demo.id === "accessibility-lab") wireAccessibility(stage);
  else if (demo.id === "api-failure-lab") cleanup = wireApi(stage);
  else if (demo.id === "shader-lab") cleanup = wireShader(stage);
  else wireWorld(stage);
  onReady?.({ engineType: demo.id === "shader-lab" || demo.id === "procedural-world" ? "CANVAS 2D" : "DOM TOOL" });
  return { dispose() { cleanup(); stage.replaceChildren(); }, getStats() { return { fps: "60", meshes: stage.querySelectorAll("button, article, canvas, li").length }; }, setGuidedOrbit() {}, resetCamera() { stage.querySelector("main, section")?.scrollTo?.({ top: 0, behavior: "smooth" }); } };
}
