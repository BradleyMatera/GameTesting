# Brad Matera // Interactive Systems Lab

A public frontend showcase containing **25 working interactive demos** across 3D experiences, realistic software simulations, complete website concepts, useful browser tools, and playable games.

## Live site

https://bradleymatera.github.io/GameTesting/

GitHub Pages deploys automatically from `main` through `.github/workflows/deploy-pages.yml`.

## Second-generation overhaul

The current release replaces the repeated simulation, tool, and game shells with purpose-built interaction models:

- Six separate simulation engines for office operations, provider routing, incident response, live calls, retrieval evidence, and Git delivery.
- Seven separate tool interfaces for graph editing, workflow execution, SEO reporting, accessibility inspection, request tracing, shader editing, and procedural mapping.
- Six separate game systems covering real-time management, projectile physics, tile exploration, tower defense, genetic evolution, and logistics routing.
- A responsive `production-v2.css` visual system that preserves the shared gallery while giving every demo its own workspace and playfield.
- Fullscreen presentation, compact DOM-demo headers, active-demo auto-scrolling, and truthful reset or pause behavior.

## Demo catalog

### Experience

1. Digital Command Center — Babylon.js 3D portfolio system map

### Realistic system simulations

2. Agent Operations Center
3. LLM Router & Failover
4. Cloud Support Incident
5. Voice Operations Center
6. ProjectHub Retrieval Visualizer
7. Git Release Pipeline

These simulations use visible states, event queues, timed transitions, failures, approvals, retries, quotas, and inspectable components. They are labeled simulations and do not pretend to be connected to production systems.

### Complete website demos

8. Matera Digital Agency
9. Bradley's Fairway Storefront
10. Ethics Engine LMS
11. Construction ERP
12. Interactive Recruiter Portfolio

The website demos are responsive, navigable frontend experiences with working filters, cart behavior, course progress, scenario feedback, dashboards, support-ticket interaction, and portfolio filtering.

### Interactive tools

13. Cloud Architecture Builder
14. Agent Workflow Designer
15. SEO / AEO Auditor
16. Accessibility Testing Lab
17. API Failure Laboratory
18. Shader & Material Lab
19. Procedural World Generator

### Playable browser games

20. Cloud Ops Crisis
21. Fairway Target Challenge
22. Code Dungeon
23. Data Center Defense
24. Digital Species Evolution
25. PCS Logistics Challenge

## Project structure

```text
.
├── index.html
├── styles.css
├── lab-expansion.css
├── production-v2.css
├── js/
│   ├── app.js
│   ├── demo-registry.js
│   └── demos/
│       ├── digital-command-center.js
│       ├── system-simulations.js
│       ├── website-showcases.js
│       ├── interactive-tools.js
│       └── browser-games.js
└── .github/workflows/
    ├── deploy-pages.yml
    └── validate.yml
```

## Design and asset approach

The current release is intentionally self-contained:

- Babylon.js procedural geometry
- Canvas-generated game and tool visuals
- CSS illustrations and interface graphics
- Inline symbols and original fictional brands
- No hotlinked stock images
- No copied commercial game or anime characters
- No unexplained third-party assets

Future downloaded assets must be stored in the repository with source, creator, license, download date, modifications, and demo usage documented.

## Adding another demo

Every demo factory receives the shared gallery context:

```js
export function createExample({ stage, canvas, demo, onSelect, onReady }) {
  // Build the demo and call onReady when it is usable.

  return {
    dispose() {},
    getStats() {
      return { fps: "60", meshes: 0 };
    },
    setGuidedOrbit() {},
    resetCamera() {},
  };
}
```

Then:

1. Add the module under `js/demos/`.
2. Import its factory in `js/demo-registry.js`.
3. Add a registry entry with an ID, category, description, and controls.
4. Verify desktop, mobile, keyboard access, reduced motion, and cleanup behavior.

## Local preview

Because the app uses JavaScript modules, serve it through HTTP:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Technology

- Babylon.js 9.18.0
- Vanilla JavaScript modules
- Canvas 2D
- Responsive HTML and CSS
- GitHub Pages
- GitHub Actions

Babylon.js is loaded from a pinned CDN build for the 3D command center. The remaining demos run from repository-owned HTML, CSS, and JavaScript without external runtime assets.
