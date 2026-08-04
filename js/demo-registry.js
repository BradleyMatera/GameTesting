import { createDigitalCommandCenter } from "./demos/digital-command-center.js";
import { createSystemSimulation } from "./demos/system-simulations.js";
import { createWebsiteShowcase } from "./demos/website-showcases.js";
import { createInteractiveTool } from "./demos/interactive-tools.js";
import { createBrowserGame } from "./demos/browser-games.js";

const demo = (id, number, title, shortTitle, category, description, create, options = {}) => ({
  id,
  number,
  title,
  shortTitle,
  category,
  description,
  create,
  enabled: true,
  status: options.status || "LIVE",
  mode: options.mode || "interactive",
  controls: options.controls || "Interact with the controls inside the demo",
});

export const demos = [
  demo(
    "digital-command-center",
    "01",
    "Digital Command Center",
    "Command Center",
    "Experiences",
    "An explorable 3D map of Brad Matera's cloud systems, AI agents, web engineering, and interactive technology.",
    createDigitalCommandCenter,
    { mode: "babylon", controls: "Drag to rotate • Scroll to zoom • Select a glowing system node" },
  ),

  demo("agent-operations", "02", "Agent Operations Center", "Agent Operations", "Systems", "A visible multi-agent workplace driven by task state, queues, reviews, approvals, and blockers.", createSystemSimulation),
  demo("llm-router", "03", "LLM Router & Failover", "LLM Router", "Systems", "Model selection, quotas, retry budgets, cooldowns, evidence checks, and provider recovery as a live routing system.", createSystemSimulation),
  demo("cloud-incident", "04", "Cloud Support Incident", "Cloud Incident", "Systems", "Investigate a realistic cloud latency incident using telemetry, service health, runbooks, and controlled remediation.", createSystemSimulation),
  demo("voice-ops", "05", "Voice Operations Center", "Voice Operations", "Systems", "A transparent call-routing simulation with consent, intent detection, escalation, transcripts, and appointment outcomes.", createSystemSimulation),
  demo("projecthub-rag", "06", "ProjectHub Retrieval Visualizer", "RAG Visualizer", "Systems", "Watch a grounded answer move through classification, retrieval, ranking, context construction, generation, and judging.", createSystemSimulation),
  demo("release-pipeline", "07", "Git Release Pipeline", "Release Pipeline", "Systems", "A safe development-to-production workflow with branches, tests, review gates, staging, deployment, and rollback awareness.", createSystemSimulation),

  demo("matera-digital", "08", "Matera Digital Agency", "Matera Digital", "Websites", "A complete premium technology agency concept built around direct communication, practical engineering, and verified delivery.", createWebsiteShowcase),
  demo("fairway-store", "09", "Bradley's Fairway Storefront", "Fairway Store", "Websites", "A complete golf retail experience with editorial merchandising, filters, products, cart behavior, and simulated checkout.", createWebsiteShowcase),
  demo("ethics-lms", "10", "Ethics Engine LMS", "Ethics LMS", "Websites", "A complete learning platform with lessons, progress, decision scenarios, learner feedback, and instructor analytics.", createWebsiteShowcase),
  demo("construction-erp", "11", "Construction ERP", "Construction ERP", "Websites", "A realistic field and finance operations interface connecting jobs, reports, equipment, costs, and support tickets.", createWebsiteShowcase),
  demo("recruiter-portfolio", "12", "Interactive Recruiter Portfolio", "Recruiter Portfolio", "Websites", "A recruiter-first portfolio that organizes verified experience, systems, certifications, and evidence by hiring question.", createWebsiteShowcase),

  demo("architecture-builder", "13", "Cloud Architecture Builder", "Architecture Builder", "Tools", "Place services, assemble a request path, and inspect cost, latency, reliability, and recoverability tradeoffs.", createInteractiveTool),
  demo("workflow-designer", "14", "Agent Workflow Designer", "Workflow Designer", "Tools", "Build and run an observable agent process from triggers, tools, agents, approvals, branches, and completion rules.", createInteractiveTool),
  demo("seo-auditor", "15", "SEO / AEO Auditor", "SEO Auditor", "Tools", "Analyze page content for metadata, structure, answerability, entities, internal actions, and search-result readiness.", createInteractiveTool),
  demo("accessibility-lab", "16", "Accessibility Testing Lab", "Accessibility Lab", "Tools", "Introduce common accessibility failures and observe how contrast, focus, labels, hierarchy, motion, and target size change.", createInteractiveTool),
  demo("api-failure-lab", "17", "API Failure Laboratory", "API Failure Lab", "Tools", "Configure latency, rate limits, timeouts, malformed responses, retry policies, and provider fallback behavior.", createInteractiveTool),
  demo("shader-lab", "18", "Shader & Material Lab", "Shader Lab", "Tools", "Manipulate procedural visual controls including pattern, speed, scale, distortion, and glow without external textures.", createInteractiveTool),
  demo("procedural-world", "19", "Procedural World Generator", "World Generator", "Tools", "Generate deterministic terrain, water, forests, settlements, roads, and regional statistics from a repeatable seed.", createInteractiveTool),

  demo("cloud-ops-crisis", "20", "Cloud Ops Crisis", "Cloud Ops Crisis", "Games", "Keep a live service online while traffic rises, incidents spread, capacity falls behind, and the budget tightens.", createBrowserGame, { controls: "Use the service controls to scale, cache, and repair incidents" }),
  demo("golf-challenge", "21", "Fairway Target Challenge", "Target Golf", "Games", "A target-golf game with club selection, launch angle, power, wind, scoring, and three-shot rounds.", createBrowserGame, { controls: "Set club, angle, and power, then swing" }),
  demo("code-dungeon", "22", "Code Dungeon", "Code Dungeon", "Games", "Navigate a procedural software dungeon, collect failing tests, avoid regressions, and unlock production.", createBrowserGame, { controls: "WASD or arrow keys • Collect every bug • Reach the PROD portal" }),
  demo("data-center-defense", "23", "Data Center Defense", "Data Center Defense", "Games", "Protect an origin server from escalating traffic storms by placing cache defenses across three request lanes.", createBrowserGame, { controls: "Click empty sockets to place cache nodes • Survive six waves" }),
  demo("digital-evolution", "24", "Digital Species Evolution", "Digital Evolution", "Games", "Autonomous organisms seek energy, reproduce, mutate, die, and pass successful traits into later generations.", createBrowserGame, { controls: "Adjust mutation and speed • Add food • Observe evolving traits" }),
  demo("pcs-logistics", "25", "PCS Logistics Challenge", "PCS Logistics", "Games", "Route a small regional fleet while balancing contracts, fuel, distance, deadlines, cash, and reputation.", createBrowserGame, { controls: "Assign available trucks to contracts, then advance the day" }),
];

export const categories = ["All", "Experiences", "Systems", "Websites", "Tools", "Games"];

export function getDemo(id) {
  return demos.find((item) => item.id === id && item.enabled) ?? demos.find((item) => item.enabled);
}

export function getDemosByCategory(category) {
  return category === "All" ? demos : demos.filter((item) => item.category === category);
}
