# Brad Matera // Babylon.js Lab

A public, expandable Babylon.js experiment gallery built around my work in cloud systems, AI agents, web engineering, and interactive technology.

## Demo 01: Digital Command Center

The first scene is a procedural 3D command table with four explorable system nodes:

- Cloud Systems
- Agent Operations
- Web Engineering
- Interactive Builds

The scene uses Babylon.js primitives, materials, animation, glow, dynamic textures, a point cloud, pointer picking, and responsive camera controls. It does not depend on external 3D models or stock artwork.

## Live site

After GitHub Pages is enabled with **Settings → Pages → Source: GitHub Actions**, pushes to `main` deploy automatically to:

`https://bradleymatera.github.io/GameTesting/`

## Project structure

```text
.
├── index.html
├── styles.css
├── js/
│   ├── app.js
│   ├── demo-registry.js
│   └── demos/
│       └── digital-command-center.js
└── .github/workflows/
    └── deploy-pages.yml
```

## Adding the next demo

1. Add a new scene module under `js/demos/`.
2. Export an async scene factory with the same controller interface as `createDigitalCommandCenter`.
3. Import it in `js/demo-registry.js`.
4. Add or enable its registry entry.

The shell, navigation, controls, telemetry, and GitHub Pages deployment can remain unchanged.

## Local preview

Because the app uses JavaScript modules, serve it through a local HTTP server instead of opening `index.html` directly:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Technology

- Babylon.js 9.18.0
- Vanilla JavaScript modules
- HTML and CSS
- GitHub Pages / GitHub Actions

Babylon.js is loaded from a pinned CDN build for this small public experiment. A larger production application should move to the ES module packages and bundle its dependencies.
