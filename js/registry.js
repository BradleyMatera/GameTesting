import { createDigitalCommandCenter } from './demos/experience.js';
import { createAgentOperations, createLlmRouter, createCloudIncident, createVoiceOps, createProjectHubRag, createReleasePipeline } from './demos/simulations.js';
import { createMateraDigital, createFairwayStore, createEthicsLms, createConstructionErp, createRecruiterPortfolio } from './demos/websites.js';
import { createArchitectureBuilder, createWorkflowDesigner, createSeoAuditor, createAccessibilityLab, createApiFailureLab, createShaderLab, createWorldGenerator } from './demos/tools.js';
import { createCloudOpsGame, createGolfGame, createCodeDungeon, createDataCenterDefense, createEvolutionGame, createPcsLogistics } from './demos/games.js';

const d = (id, title, category, summary, accent, controls, factory, engine) => ({ id, title, category, summary, accent, controls, factory, engine });

export const demos = [
  d('digital-command-center','Digital Command Center','Experience','Explore a cinematic 3D map of Brad’s cloud, AI, and frontend systems.','#67e8f9','Drag to orbit · Wheel to zoom · Select a system',createDigitalCommandCenter,'BABYLON.JS 3D'),
  d('agent-operations','Agent Operations Center','Simulations','A 3D office where agents receive tasks, move between departments, and surface blockers.','#8b5cf6','Start shift · Select agents · Watch task flow',createAgentOperations,'3D STATE SIMULATION'),
  d('llm-router','LLM Router & Failover','Simulations','Route requests through a live 3D provider network with latency, quotas, and failover.','#22d3ee','Send request · Toggle providers · Inspect route',createLlmRouter,'3D NETWORK SIMULATION'),
  d('cloud-incident','Cloud Support Incident','Simulations','Diagnose a failing cloud stack inside an explorable data center and apply a runbook.','#fb7185','Inspect racks · Run diagnostics · Apply repair',createCloudIncident,'3D INCIDENT SIMULATION'),
  d('voice-ops','Voice Operations Center','Simulations','Manage realistic inbound calls, routing, transcripts, escalations, and appointments.','#f97316','Answer · Transfer · Schedule · Resolve',createVoiceOps,'CALL STATE SIMULATION'),
  d('projecthub-rag','ProjectHub Retrieval Visualizer','Simulations','Watch a recruiter question become classified evidence, context, citations, and a grounded answer.','#38bdf8','Run query · Inspect evidence · Verify citations',createProjectHubRag,'RETRIEVAL SIMULATION'),
  d('release-pipeline','Git Release Pipeline','Simulations','Move a feature through commits, CI, review, staging, production, and rollback.','#34d399','Run pipeline · Fix failure · Approve release',createReleasePipeline,'DELIVERY SIMULATION'),
  d('matera-digital','Matera Digital Agency','Websites','A complete editorial agency site with services, case studies, process, and project intake.','#f43f5e','Navigate pages · Open a case study · Start a project',createMateraDigital,'RESPONSIVE WEBSITE'),
  d('fairway-store','Bradley’s Fairway Storefront','Websites','A complete golf retail experience with product media, filters, details, and cart.','#84cc16','Filter products · View details · Add to cart',createFairwayStore,'ECOMMERCE WEBSITE'),
  d('ethics-lms','Ethics Engine LMS','Websites','A premium learning platform with courses, lessons, scenarios, progress, and certificates.','#8b5cf6','Open course · Complete scenario · View certificate',createEthicsLms,'LEARNING PLATFORM'),
  d('construction-erp','Construction ERP','Websites','A realistic construction operations product covering jobs, field, equipment, financials, and support.','#f59e0b','Change module · Inspect job · Create ticket',createConstructionErp,'BUSINESS APPLICATION'),
  d('recruiter-portfolio','Recruiter Portfolio','Websites','A recruiter-first portfolio with verified projects, career evidence, skills, and certification proof.','#2563eb','Filter evidence · Open project · View timeline',createRecruiterPortfolio,'PORTFOLIO WEBSITE'),
  d('architecture-builder','Cloud Architecture Builder','Tools','Drag cloud services onto a canvas, connect them, simulate a request, and review cost and resilience.','#2563eb','Add nodes · Drag · Connect · Simulate',createArchitectureBuilder,'GRAPH EDITOR'),
  d('workflow-designer','Agent Workflow Designer','Tools','Build, reorder, validate, and execute a multi-agent workflow with approvals and branches.','#7c3aed','Add nodes · Reorder · Run · Inspect trace',createWorkflowDesigner,'WORKFLOW EDITOR'),
  d('seo-auditor','SEO / AEO Auditor','Tools','Analyze a page with prioritized technical, content, entity, accessibility, AEO, and GEO findings.','#0f766e','Load sample · Run audit · Expand findings',createSeoAuditor,'ANALYSIS TOOL'),
  d('accessibility-lab','Accessibility Testing Lab','Tools','Toggle accessibility failures and inspect focus, names, headings, contrast, and WCAG guidance.','#db2777','Toggle issues · Tab preview · Inspect tree',createAccessibilityLab,'ACCESSIBILITY TOOL'),
  d('api-failure-lab','API Failure Laboratory','Tools','Inject latency, 429s, malformed data, outages, retries, fallback, and circuit-breaker behavior.','#dc2626','Choose failure · Send request · Inspect timeline',createApiFailureLab,'NETWORK LAB'),
  d('shader-lab','Shader & Material Lab','Tools','Edit a live Babylon.js material, switch models and environments, and inspect GPU performance.','#c026d3','Change material · Edit shader · Switch model',createShaderLab,'BABYLON.JS MATERIAL LAB'),
  d('world-generator','Procedural World Generator','Tools','Generate and explore a seeded 3D terrain with biomes, water, roads, structures, and weather.','#16a34a','Change seed · Regenerate · Orbit world',createWorldGenerator,'BABYLON.JS WORLD TOOL'),
  d('cloud-ops-crisis','Cloud Ops Crisis','Games','Keep a 3D cloud service alive through traffic surges, incidents, limited budget, and architecture choices.','#22d3ee','Start shift · Scale · Deploy cache · Repair',createCloudOpsGame,'BABYLON.JS 3D GAME'),
  d('golf-challenge','Fairway Target Challenge','Games','Play three shots on a 3D course with club choice, wind, projectile flight, landing, and roll.','#a3e635','Choose club · Aim · Set power · Swing',createGolfGame,'BABYLON.JS PHYSICS GAME'),
  d('code-dungeon','Code Dungeon','Games','Explore a lit 3D dungeon, collect failing tests, avoid regressions, and reach production.','#a78bfa','WASD / arrows · Collect bugs · Reach portal',createCodeDungeon,'BABYLON.JS 3D GAME'),
  d('data-center-defense','Data Center Defense','Games','Place 3D cache towers, stop packet waves, upgrade defenses, and protect the origin.','#f97316','Select tower · Place · Start wave · Upgrade',createDataCenterDefense,'BABYLON.JS TOWER DEFENSE'),
  d('digital-evolution','Digital Species Evolution','Games','Run a 3D ecosystem where creatures inherit speed, size, senses, energy, and mutation.','#34d399','Start ecosystem · Select creature · Change pressure',createEvolutionGame,'BABYLON.JS EVOLUTION SIM'),
  d('pcs-logistics','PCS Logistics Challenge','Games','Operate a 3D regional logistics company with trucks, contracts, routes, fuel, deadlines, and reputation.','#fbbf24','Select truck · Accept load · Dispatch · Maintain',createPcsLogistics,'BABYLON.JS LOGISTICS GAME'),
];

export const categories = ['All','Experience','Simulations','Websites','Tools','Games'];
export const byId = new Map(demos.map(item => [item.id, item]));
