const SIMULATIONS = {
  "agent-operations": {
    title: "Agent Operations Center",
    subtitle: "A visible multi-agent workplace driven by task state, queues, reviews, and blockers.",
    accent: "#b68cff",
    metrics: ["ACTIVE AGENTS", "OPEN TASKS", "REVIEWS", "SUCCESS RATE"],
    agents: [
      { name: "Scout", role: "Research", state: "working", task: "Verify source evidence" },
      { name: "Derek", role: "Sales", state: "review", task: "Prepare customer follow-up" },
      { name: "Frank", role: "Routing", state: "working", task: "Classify new request" },
      { name: "Nova", role: "Engineering", state: "blocked", task: "Await deployment approval" },
      { name: "Atlas", role: "Cloud", state: "idle", task: "Monitor provider health" },
      { name: "Mira", role: "QA", state: "working", task: "Run acceptance checks" },
    ],
    events: [
      "Scout attached two verified sources.",
      "Frank routed a recruiter request to the portfolio lane.",
      "Nova requested approval before production deployment.",
      "Mira rejected an answer without completion evidence.",
      "Atlas detected elevated provider latency.",
    ],
  },
  "llm-router": {
    title: "LLM Router & Failover",
    subtitle: "Model selection, quotas, retries, and provider recovery visualized as a live routing system.",
    accent: "#71e5ff",
    metrics: ["REQUESTS", "P95 LATENCY", "FALLBACKS", "CACHE HIT"],
    providers: [
      { name: "Groq 8B", health: 98, latency: 420, quota: 74 },
      { name: "Groq 70B", health: 94, latency: 910, quota: 42 },
      { name: "GPT-OSS 20B", health: 96, latency: 760, quota: 61 },
      { name: "Cloudflare", health: 91, latency: 1180, quota: 85 },
    ],
    events: [
      "Primary model returned 429; request moved to model-scoped cooldown.",
      "Retry-After honored before fallback attempt.",
      "Cached grounded answer served in 34 ms.",
      "Judge rejected low-evidence completion.",
      "Reservation reconciled against actual token usage.",
    ],
  },
  "cloud-incident": {
    title: "Cloud Support Incident",
    subtitle: "Investigate a realistic latency incident using telemetry, runbooks, and controlled remediation.",
    accent: "#ff9a62",
    metrics: ["ERROR RATE", "P95 LATENCY", "AFFECTED USERS", "RECOVERY"],
    services: [
      { name: "CloudFront", state: "healthy", value: "99.99%" },
      { name: "API Gateway", state: "warning", value: "1.8s" },
      { name: "Lambda", state: "warning", value: "812ms" },
      { name: "DynamoDB", state: "critical", value: "throttled" },
      { name: "Alarm Pipeline", state: "healthy", value: "active" },
    ],
    events: [
      "Read throttles increased after traffic spike.",
      "Lambda retries amplified downstream pressure.",
      "Runbook recommends capacity review before retry changes.",
      "Adaptive capacity recovered the hottest partition.",
      "Error rate returned below incident threshold.",
    ],
  },
  "voice-ops": {
    title: "Voice Operations Center",
    subtitle: "A transparent call-routing simulation with transcripts, escalation, and appointment outcomes.",
    accent: "#88f5a7",
    metrics: ["LIVE CALLS", "AVG HANDLE", "BOOKED", "ESCALATED"],
    calls: [
      { caller: "815-***-0142", intent: "Estimate request", state: "connected", duration: 43 },
      { caller: "608-***-8821", intent: "Schedule change", state: "routing", duration: 18 },
      { caller: "779-***-3904", intent: "Service question", state: "review", duration: 72 },
    ],
    events: [
      "Caller consent captured before recording.",
      "Estimate request routed to sales agent.",
      "Calendar availability checked for next Tuesday.",
      "Low-confidence answer escalated to a person.",
      "Call summary stored with action items.",
    ],
  },
  "projecthub-rag": {
    title: "ProjectHub Retrieval Visualizer",
    subtitle: "Watch a grounded answer move through classification, retrieval, ranking, context, and verification.",
    accent: "#ffd36e",
    metrics: ["CHUNKS FOUND", "EVIDENCE", "MODEL TIME", "CONFIDENCE"],
    stages: ["Classify", "Retrieve", "Rank", "Build context", "Generate", "Judge"],
    events: [
      "Question classified as AWS internship experience.",
      "Deterministic facts loaded before model call.",
      "Four project documents matched the query.",
      "Low-relevance chunk removed during ranking.",
      "Answer promoted after evidence check passed.",
    ],
  },
  "release-pipeline": {
    title: "Git Release Pipeline",
    subtitle: "A safe development-to-production workflow with tests, review gates, and rollback awareness.",
    accent: "#ff7fa8",
    metrics: ["CHECKS", "COVERAGE", "DEPLOY TIME", "RISK"],
    stages: ["Feature branch", "Unit tests", "Pull request", "Review", "Staging", "Production"],
    events: [
      "Feature branch created from latest development SHA.",
      "Unit test failed on mobile navigation behavior.",
      "Fix pushed and required checks restarted.",
      "Staging smoke test passed.",
      "Production deployment completed with rollback SHA recorded.",
    ],
  },
};

function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function metricValue(label, tick, random) {
  const jitter = Math.round(random() * 8);
  if (label.includes("LATENCY")) return `${620 + ((tick * 43 + jitter * 19) % 690)} ms`;
  if (label.includes("RATE") || label.includes("CONFIDENCE") || label.includes("RECOVERY") || label.includes("COVERAGE") || label.includes("CACHE")) return `${82 + ((tick + jitter) % 17)}%`;
  if (label.includes("HANDLE") || label.includes("TIME")) return `${2 + ((tick + jitter) % 5)}m ${10 + ((tick * 7) % 49)}s`;
  if (label.includes("RISK")) return ["LOW", "LOW", "MEDIUM"][tick % 3];
  return String(3 + ((tick * 3 + jitter) % 28));
}

function stateClass(value) {
  return String(value || "healthy").toLowerCase().replace(/\s+/g, "-");
}

function createMetricCards(config) {
  return config.metrics.map((label, index) => `
    <article class="sim-metric" data-metric="${index}">
      <span>${label}</span>
      <strong>--</strong>
      <small>LIVE SIMULATION</small>
    </article>
  `).join("");
}

function createCenter(config) {
  if (config.agents) {
    return `<div class="agent-floor">${config.agents.map((agent, index) => `
      <button class="agent-card ${stateClass(agent.state)}" data-agent="${index}" type="button">
        <span class="agent-avatar">${agent.name.slice(0, 2).toUpperCase()}</span>
        <span><strong>${agent.name}</strong><small>${agent.role}</small></span>
        <em>${agent.state}</em>
        <p>${agent.task}</p>
      </button>
    `).join("")}</div>`;
  }

  if (config.providers) {
    return `<div class="provider-grid">${config.providers.map((provider, index) => `
      <button class="provider-card" data-provider="${index}" type="button">
        <div><strong>${provider.name}</strong><span>${provider.latency} ms</span></div>
        <label>HEALTH <meter min="0" max="100" value="${provider.health}"></meter></label>
        <label>DAILY QUOTA <meter min="0" max="100" value="${provider.quota}"></meter></label>
        <small>Click to simulate outage</small>
      </button>
    `).join("")}</div>`;
  }

  if (config.services) {
    return `<div class="service-stack">${config.services.map((service, index) => `
      <button class="service-row ${stateClass(service.state)}" data-service="${index}" type="button">
        <span>${String(index + 1).padStart(2, "0")}</span>
        <strong>${service.name}</strong>
        <em>${service.state}</em>
        <b>${service.value}</b>
      </button>
    `).join("")}</div>`;
  }

  if (config.calls) {
    return `<div class="call-board">${config.calls.map((call, index) => `
      <article class="call-row ${stateClass(call.state)}">
        <span class="call-wave" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--h:${10 + ((i * 13 + index * 7) % 34)}px"></i>`).join("")}</span>
        <div><strong>${call.caller}</strong><small>${call.intent}</small></div>
        <em>${call.state}</em>
        <b data-duration="${index}">${call.duration}s</b>
      </article>
    `).join("")}</div>`;
  }

  if (config.stages) {
    return `<div class="pipeline-track">${config.stages.map((stage, index) => `
      <button class="pipeline-node${index === 0 ? " active" : ""}" data-stage="${index}" type="button">
        <span>${String(index + 1).padStart(2, "0")}</span><strong>${stage}</strong><small>WAITING</small>
      </button>
    `).join("")}</div>`;
  }

  return "";
}

export function createSystemSimulation({ stage, demo, onSelect, onReady }) {
  const config = SIMULATIONS[demo.id];
  const random = seeded(demo.id.length * 901);
  let tick = 0;
  let paused = false;
  let interval;

  stage.innerHTML = `
    <section class="demo-surface simulation-surface" style="--demo-accent:${config.accent}">
      <header class="surface-header">
        <div><p class="surface-kicker">REALISTIC BROWSER SIMULATION</p><h2>${config.title}</h2><p>${config.subtitle}</p></div>
        <div class="surface-actions">
          <button data-action="step" type="button">STEP</button>
          <button data-action="pause" type="button">PAUSE</button>
          <button data-action="reset" type="button">RESET</button>
        </div>
      </header>
      <div class="sim-metrics">${createMetricCards(config)}</div>
      <div class="simulation-layout">
        <section class="simulation-center">${createCenter(config)}</section>
        <aside class="event-stream">
          <div class="event-stream-heading"><span>EVENT LOG</span><strong>SIMULATED</strong></div>
          <ol></ol>
        </aside>
      </div>
    </section>
  `;

  const metricNodes = [...stage.querySelectorAll(".sim-metric strong")];
  const eventList = stage.querySelector(".event-stream ol");
  const pauseButton = stage.querySelector('[data-action="pause"]');

  function addEvent(message, level = "info") {
    const item = document.createElement("li");
    item.className = level;
    item.innerHTML = `<time>${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time><span>${message}</span>`;
    eventList.prepend(item);
    while (eventList.children.length > 8) eventList.lastElementChild.remove();
  }

  function advance() {
    tick += 1;
    metricNodes.forEach((node, index) => {
      node.textContent = metricValue(config.metrics[index], tick + index, random);
    });

    if (config.agents) {
      const cards = [...stage.querySelectorAll(".agent-card")];
      const card = cards[tick % cards.length];
      const states = ["working", "review", "idle", "blocked"];
      card.classList.remove(...states);
      const next = states[(tick + Math.floor(random() * 3)) % states.length];
      card.classList.add(next);
      card.querySelector("em").textContent = next;
    }

    if (config.calls) {
      stage.querySelectorAll("[data-duration]").forEach((node) => {
        node.textContent = `${Number(node.textContent.replace("s", "")) + 1}s`;
      });
    }

    if (config.stages) {
      const nodes = [...stage.querySelectorAll(".pipeline-node")];
      const activeIndex = tick % nodes.length;
      nodes.forEach((node, index) => {
        node.classList.toggle("active", index === activeIndex);
        node.classList.toggle("complete", index < activeIndex);
        node.querySelector("small").textContent = index < activeIndex ? "COMPLETE" : index === activeIndex ? "RUNNING" : "WAITING";
      });
    }

    addEvent(config.events[tick % config.events.length], tick % 5 === 0 ? "warn" : "info");
  }

  stage.querySelector('[data-action="step"]').addEventListener("click", advance);
  pauseButton.addEventListener("click", () => {
    paused = !paused;
    pauseButton.textContent = paused ? "RESUME" : "PAUSE";
  });
  stage.querySelector('[data-action="reset"]').addEventListener("click", () => {
    tick = 0;
    eventList.replaceChildren();
    addEvent("Simulation state reset to a known baseline.");
    advance();
  });

  stage.querySelectorAll("[data-provider]").forEach((button) => {
    button.addEventListener("click", () => {
      button.classList.toggle("offline");
      addEvent(`${button.querySelector("strong").textContent} ${button.classList.contains("offline") ? "taken offline; fallback engaged." : "restored to service."}`, "warn");
    });
  });

  stage.querySelectorAll("[data-agent], [data-service], [data-stage]").forEach((button) => {
    button.addEventListener("click", () => {
      const title = button.querySelector("strong")?.textContent || "System component";
      onSelect?.({
        index: "LIVE NODE",
        title,
        kicker: "SIMULATED STATE WITH REAL RULES",
        copy: "This component is driven by the demo state machine. Its status changes because of timed events, dependencies, and user actions rather than decorative animation alone.",
        tags: ["State machine", "Event queue", "Inspectable"],
      });
    });
  });

  interval = window.setInterval(() => {
    if (!paused) advance();
  }, 1800);

  advance();
  onReady?.({ engineType: "DOM SIM" });

  return {
    dispose() {
      clearInterval(interval);
      stage.replaceChildren();
    },
    getStats() {
      return { fps: "60", meshes: stage.querySelectorAll("button, article, li").length };
    },
    setGuidedOrbit(value) {
      paused = !value;
      pauseButton.textContent = paused ? "RESUME" : "PAUSE";
    },
    resetCamera() {
      stage.querySelector('[data-action="reset"]').click();
    },
  };
}
