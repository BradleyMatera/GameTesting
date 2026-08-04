const DETAILS = {
  core: {
    index: "CORE",
    title: "Brad Matera",
    kicker: "FULL-STACK SOFTWARE ENGINEER",
    copy:
      "This scene turns my real technical focus into an explorable system instead of a flat portfolio card. Select any glowing node to inspect the part it represents.",
    tags: ["Babylon.js", "JavaScript", "WebGL"],
  },
  cloud: {
    index: "NODE 01",
    title: "Cloud Systems",
    kicker: "AWS • INFRASTRUCTURE • RELIABILITY",
    copy:
      "Cloud architecture, support engineering, deployment workflows, and systems designed to stay understandable after the first successful launch.",
    tags: ["AWS", "CloudFront", "Lambda", "DynamoDB"],
  },
  agents: {
    index: "NODE 02",
    title: "Agent Operations",
    kicker: "AI AGENTS • ORCHESTRATION • VERIFICATION",
    copy:
      "Agent systems that expose what they are doing, coordinate real work, and prove outcomes instead of stopping at convincing progress.",
    tags: ["LLM Systems", "Tool Use", "Grounding", "Observability"],
  },
  web: {
    index: "NODE 03",
    title: "Web Engineering",
    kicker: "FRONT END • BACK END • ACCESSIBILITY",
    copy:
      "Modern interfaces backed by practical architecture, responsive behavior, accessibility, and deployment paths that real people can maintain.",
    tags: ["React", "TypeScript", "APIs", "Accessibility"],
  },
  interactive: {
    index: "NODE 04",
    title: "Interactive Builds",
    kicker: "WEBGPU • 3D • GAME TECHNOLOGY",
    copy:
      "Hands-on experiments that make browser technology visible: simulations, shaders, 3D worlds, and interfaces you can learn by touching.",
    tags: ["Babylon.js", "WebGPU", "Shaders", "Simulation"],
  },
};

const NODE_CONFIG = [
  { id: "cloud", label: "CLOUD SYSTEMS", color: "#71e5ff", position: [-6.8, 1.2, -2.6], shape: "server" },
  { id: "agents", label: "AGENT OPS", color: "#b68cff", position: [5.8, 1.5, -4.6], shape: "network" },
  { id: "web", label: "WEB ENGINEERING", color: "#ff9a62", position: [7.2, 1.05, 3.3], shape: "portal" },
  { id: "interactive", label: "INTERACTIVE BUILDS", color: "#88f5a7", position: [-5.7, 1.35, 5.0], shape: "diamond" },
];

function color3(hex) {
  return BABYLON.Color3.FromHexString(hex);
}

function emissiveMaterial(name, hex, scene, alpha = 1) {
  const material = new BABYLON.StandardMaterial(name, scene);
  const color = color3(hex);
  material.diffuseColor = color.scale(0.12);
  material.emissiveColor = color;
  material.specularColor = color.scale(0.4);
  material.alpha = alpha;
  return material;
}

function metalMaterial(name, diffuseHex, scene) {
  const material = new BABYLON.PBRMetallicRoughnessMaterial(name, scene);
  material.baseColor = color3(diffuseHex);
  material.metallic = 0.86;
  material.roughness = 0.28;
  return material;
}

function createLabel(text, hex, scene) {
  const plane = BABYLON.MeshBuilder.CreatePlane(`label-${text}`, { width: 3.5, height: 0.62 }, scene);
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  plane.isPickable = false;

  const texture = new BABYLON.DynamicTexture(`label-texture-${text}`, { width: 1024, height: 180 }, scene, true);
  texture.hasAlpha = true;
  texture.drawText(text, null, 116, "700 48px Arial", hex, "transparent", true, true);

  const material = new BABYLON.StandardMaterial(`label-material-${text}`, scene);
  material.diffuseTexture = texture;
  material.opacityTexture = texture;
  material.emissiveColor = color3(hex);
  material.disableLighting = true;
  plane.material = material;
  return plane;
}

function tagPickable(mesh, id) {
  mesh.isPickable = true;
  mesh.metadata = { nodeId: id };
  return mesh;
}

function createCore(scene) {
  const root = new BABYLON.TransformNode("matera-core", scene);

  const core = tagPickable(
    BABYLON.MeshBuilder.CreatePolyhedron("core-polyhedron", { type: 2, size: 2.1 }, scene),
    "core",
  );
  core.parent = root;
  core.material = metalMaterial("core-metal", "#10394b", scene);

  const inner = BABYLON.MeshBuilder.CreateSphere("core-energy", { diameter: 2.15, segments: 32 }, scene);
  inner.parent = root;
  inner.material = emissiveMaterial("core-energy-material", "#71e5ff", scene, 0.32);
  inner.isPickable = false;

  const ringA = BABYLON.MeshBuilder.CreateTorus("core-ring-a", { diameter: 5.2, thickness: 0.055, tessellation: 96 }, scene);
  ringA.parent = root;
  ringA.rotation.x = Math.PI / 2;
  ringA.material = emissiveMaterial("core-ring-a-material", "#71e5ff", scene, 0.84);

  const ringB = BABYLON.MeshBuilder.CreateTorus("core-ring-b", { diameter: 6.6, thickness: 0.035, tessellation: 96 }, scene);
  ringB.parent = root;
  ringB.rotation.z = Math.PI / 2.8;
  ringB.material = emissiveMaterial("core-ring-b-material", "#ff9a62", scene, 0.62);

  const ringC = BABYLON.MeshBuilder.CreateTorus("core-ring-c", { diameter: 7.8, thickness: 0.025, tessellation: 96 }, scene);
  ringC.parent = root;
  ringC.rotation.x = Math.PI / 3.2;
  ringC.material = emissiveMaterial("core-ring-c-material", "#b68cff", scene, 0.52);

  const nameLabel = createLabel("BRAD MATERA // SYSTEM CORE", "#b7f3ff", scene);
  nameLabel.position = new BABYLON.Vector3(0, -2.35, 0);
  nameLabel.scaling.setAll(0.72);

  return { root, core, inner, ringA, ringB, ringC };
}

function createPlatform(scene) {
  const platform = BABYLON.MeshBuilder.CreateCylinder(
    "platform",
    { diameter: 11.5, height: 0.32, tessellation: 96 },
    scene,
  );
  platform.position.y = -1.9;
  platform.material = metalMaterial("platform-metal", "#071723", scene);

  const edge = BABYLON.MeshBuilder.CreateTorus(
    "platform-edge",
    { diameter: 11.35, thickness: 0.08, tessellation: 128 },
    scene,
  );
  edge.position.y = -1.7;
  edge.material = emissiveMaterial("platform-edge-material", "#71e5ff", scene, 0.72);

  for (let i = 0; i < 32; i += 1) {
    const tick = BABYLON.MeshBuilder.CreateBox(`platform-tick-${i}`, { width: 0.05, height: 0.03, depth: 0.5 }, scene);
    const angle = (Math.PI * 2 * i) / 32;
    tick.position = new BABYLON.Vector3(Math.sin(angle) * 5.32, -1.66, Math.cos(angle) * 5.32);
    tick.rotation.y = angle;
    tick.material = emissiveMaterial(`tick-material-${i}`, i % 4 === 0 ? "#ff9a62" : "#71e5ff", scene, 0.66);
  }
}

function createGroundGrid(scene) {
  const ground = BABYLON.MeshBuilder.CreateGround("ground", { width: 46, height: 46 }, scene);
  ground.position.y = -2.08;
  const groundMaterial = new BABYLON.StandardMaterial("ground-material", scene);
  groundMaterial.diffuseColor = color3("#02070c");
  groundMaterial.specularColor = color3("#071723");
  ground.material = groundMaterial;

  const lines = [];
  for (let i = -22; i <= 22; i += 2) {
    lines.push([new BABYLON.Vector3(i, -2.05, -22), new BABYLON.Vector3(i, -2.05, 22)]);
    lines.push([new BABYLON.Vector3(-22, -2.05, i), new BABYLON.Vector3(22, -2.05, i)]);
  }
  const grid = BABYLON.MeshBuilder.CreateLineSystem("ground-grid", { lines }, scene);
  grid.color = color3("#12384a");
  grid.alpha = 0.5;
  grid.isPickable = false;
}

function createNodeVisual(config, scene) {
  const root = new BABYLON.TransformNode(`node-${config.id}`, scene);
  root.position = new BABYLON.Vector3(...config.position);

  const base = tagPickable(
    BABYLON.MeshBuilder.CreateCylinder(
      `${config.id}-base`,
      { diameterTop: 1.35, diameterBottom: 1.7, height: 0.35, tessellation: 8 },
      scene,
    ),
    config.id,
  );
  base.parent = root;
  base.position.y = -0.85;
  base.material = metalMaterial(`${config.id}-metal`, "#0b202d", scene);

  const halo = BABYLON.MeshBuilder.CreateTorus(
    `${config.id}-halo`,
    { diameter: 2.5, thickness: 0.035, tessellation: 64 },
    scene,
  );
  halo.parent = root;
  halo.rotation.x = Math.PI / 2;
  halo.position.y = -0.62;
  halo.material = emissiveMaterial(`${config.id}-halo-material`, config.color, scene, 0.82);
  halo.isPickable = false;

  const beam = BABYLON.MeshBuilder.CreateCylinder(
    `${config.id}-beam`,
    { diameterTop: 0.15, diameterBottom: 1.8, height: 3.2, tessellation: 32 },
    scene,
  );
  beam.parent = root;
  beam.position.y = 0.55;
  beam.material = emissiveMaterial(`${config.id}-beam-material`, config.color, scene, 0.08);
  beam.isPickable = false;

  const visualRoot = new BABYLON.TransformNode(`${config.id}-visual`, scene);
  visualRoot.parent = root;
  visualRoot.position.y = 0.35;

  if (config.shape === "server") {
    for (let i = -1; i <= 1; i += 1) {
      const rack = tagPickable(
        BABYLON.MeshBuilder.CreateBox(`${config.id}-rack-${i}`, { width: 0.52, height: 1.35 + Math.abs(i) * 0.25, depth: 0.52 }, scene),
        config.id,
      );
      rack.parent = visualRoot;
      rack.position.x = i * 0.68;
      rack.material = metalMaterial(`${config.id}-rack-mat-${i}`, "#0d2c3b", scene);
      for (let y = -0.42; y <= 0.42; y += 0.28) {
        const light = BABYLON.MeshBuilder.CreateBox(`${config.id}-rack-light-${i}-${y}`, { width: 0.3, height: 0.035, depth: 0.012 }, scene);
        light.parent = rack;
        light.position = new BABYLON.Vector3(0, y, -0.268);
        light.material = emissiveMaterial(`${config.id}-rack-light-mat-${i}-${y}`, config.color, scene);
        light.isPickable = false;
      }
    }
  } else if (config.shape === "network") {
    const center = tagPickable(BABYLON.MeshBuilder.CreateIcoSphere(`${config.id}-center`, { radius: 0.52, subdivisions: 2 }, scene), config.id);
    center.parent = visualRoot;
    center.material = emissiveMaterial(`${config.id}-center-material`, config.color, scene, 0.75);
    for (let i = 0; i < 6; i += 1) {
      const satellite = tagPickable(BABYLON.MeshBuilder.CreateIcoSphere(`${config.id}-satellite-${i}`, { radius: 0.17, subdivisions: 1 }, scene), config.id);
      satellite.parent = visualRoot;
      const angle = (Math.PI * 2 * i) / 6;
      satellite.position = new BABYLON.Vector3(Math.cos(angle) * 1.1, Math.sin(angle * 2) * 0.24, Math.sin(angle) * 1.1);
      satellite.material = emissiveMaterial(`${config.id}-sat-mat-${i}`, config.color, scene);
      const connection = BABYLON.MeshBuilder.CreateLines(`${config.id}-connection-${i}`, { points: [BABYLON.Vector3.Zero(), satellite.position] }, scene);
      connection.parent = visualRoot;
      connection.color = color3(config.color);
      connection.alpha = 0.58;
      connection.isPickable = false;
    }
  } else if (config.shape === "portal") {
    const frame = tagPickable(BABYLON.MeshBuilder.CreateTorus(`${config.id}-portal`, { diameter: 2.15, thickness: 0.15, tessellation: 8 }, scene), config.id);
    frame.parent = visualRoot;
    frame.rotation.x = Math.PI / 2;
    frame.material = metalMaterial(`${config.id}-portal-metal`, "#4a2116", scene);
    const innerRing = BABYLON.MeshBuilder.CreateTorus(`${config.id}-portal-inner`, { diameter: 1.75, thickness: 0.035, tessellation: 64 }, scene);
    innerRing.parent = visualRoot;
    innerRing.rotation.x = Math.PI / 2;
    innerRing.material = emissiveMaterial(`${config.id}-portal-glow`, config.color, scene);
    innerRing.isPickable = false;
  } else {
    const diamond = tagPickable(BABYLON.MeshBuilder.CreatePolyhedron(`${config.id}-diamond`, { type: 1, size: 1.12 }, scene), config.id);
    diamond.parent = visualRoot;
    diamond.rotation.z = Math.PI / 4;
    diamond.material = metalMaterial(`${config.id}-diamond-metal`, "#113522", scene);
    const innerDiamond = BABYLON.MeshBuilder.CreatePolyhedron(`${config.id}-diamond-inner`, { type: 1, size: 0.72 }, scene);
    innerDiamond.parent = visualRoot;
    innerDiamond.rotation.z = Math.PI / 4;
    innerDiamond.material = emissiveMaterial(`${config.id}-diamond-glow`, config.color, scene, 0.55);
    innerDiamond.isPickable = false;
  }

  const label = createLabel(config.label, config.color, scene);
  label.parent = root;
  label.position.y = 2.15;
  label.scaling.setAll(0.58);

  return { root, halo, visualRoot, color: color3(config.color) };
}

async function createStars(scene) {
  const pcs = new BABYLON.PointsCloudSystem("star-field", 1, scene);
  pcs.addPoints(700, (particle) => {
    const radius = 18 + Math.random() * 28;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    particle.position = new BABYLON.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi) * 0.55 + 6,
      radius * Math.sin(phi) * Math.sin(theta),
    );
    particle.color = new BABYLON.Color4(0.45 + Math.random() * 0.3, 0.78 + Math.random() * 0.2, 1, 0.3 + Math.random() * 0.7);
  });
  const mesh = await pcs.buildMeshAsync();
  const material = new BABYLON.StandardMaterial("star-material", scene);
  material.pointsCloud = true;
  material.pointSize = 2.2;
  material.disableLighting = true;
  mesh.material = material;
  mesh.isPickable = false;
  return mesh;
}

function createSignalArcs(scene) {
  const paths = [
    [new BABYLON.Vector3(-6.8, 1.1, -2.6), new BABYLON.Vector3(-3.4, 3.5, -1.2), BABYLON.Vector3.Zero()],
    [new BABYLON.Vector3(5.8, 1.4, -4.6), new BABYLON.Vector3(3.2, 4.1, -2.2), BABYLON.Vector3.Zero()],
    [new BABYLON.Vector3(7.2, 1.0, 3.3), new BABYLON.Vector3(3.8, 3.2, 1.6), BABYLON.Vector3.Zero()],
    [new BABYLON.Vector3(-5.7, 1.3, 5.0), new BABYLON.Vector3(-3.1, 3.8, 2.7), BABYLON.Vector3.Zero()],
  ];

  return paths.map((points, index) => {
    const curve = BABYLON.Curve3.CreateQuadraticBezier(points[0], points[1], points[2], 42);
    const line = BABYLON.MeshBuilder.CreateLines(`signal-arc-${index}`, { points: curve.getPoints() }, scene);
    line.color = index === 2 ? color3("#ff9a62") : color3("#71e5ff");
    line.alpha = 0.32;
    line.isPickable = false;
    return line;
  });
}

export async function createDigitalCommandCenter({ canvas, onSelect, onReady }) {
  const engine = new BABYLON.Engine(canvas, true, {
    antialias: true,
    adaptToDeviceRatio: true,
    preserveDrawingBuffer: false,
    stencil: true,
  });

  engine.setHardwareScalingLevel(Math.max(1, window.devicePixelRatio / 1.65));

  const scene = new BABYLON.Scene(engine);
  scene.clearColor = new BABYLON.Color4(0.008, 0.02, 0.034, 1);
  scene.ambientColor = color3("#0a2635");
  scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.012;
  scene.fogColor = color3("#02070c");

  const camera = new BABYLON.ArcRotateCamera(
    "command-camera",
    -Math.PI / 2.4,
    1.08,
    20,
    new BABYLON.Vector3(0, 0.25, 0),
    scene,
  );
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 10;
  camera.upperRadiusLimit = 28;
  camera.lowerBetaLimit = 0.55;
  camera.upperBetaLimit = 1.42;
  camera.wheelDeltaPercentage = 0.01;
  camera.panningSensibility = 0;
  camera.inertia = 0.78;

  const hemispheric = new BABYLON.HemisphericLight("ambient-light", new BABYLON.Vector3(0, 1, 0), scene);
  hemispheric.intensity = 0.5;
  hemispheric.diffuse = color3("#b7f3ff");
  hemispheric.groundColor = color3("#071019");

  const keyLight = new BABYLON.PointLight("key-light", new BABYLON.Vector3(0, 7, -3), scene);
  keyLight.diffuse = color3("#71e5ff");
  keyLight.intensity = 42;
  keyLight.radius = 12;

  const glow = new BABYLON.GlowLayer("system-glow", scene, { blurKernelSize: 48 });
  glow.intensity = 0.72;

  createGroundGrid(scene);
  createPlatform(scene);
  const core = createCore(scene);
  const nodes = NODE_CONFIG.map((config) => createNodeVisual(config, scene));
  const signalArcs = createSignalArcs(scene);
  const stars = await createStars(scene);

  const pipeline = new BABYLON.DefaultRenderingPipeline("render-pipeline", true, scene, [camera]);
  pipeline.fxaaEnabled = true;
  pipeline.bloomEnabled = true;
  pipeline.bloomThreshold = 0.7;
  pipeline.bloomWeight = 0.24;
  pipeline.bloomKernel = 48;
  pipeline.imageProcessingEnabled = true;
  pipeline.imageProcessing.contrast = 1.18;
  pipeline.imageProcessing.exposure = 1.02;

  let guidedOrbit = false;
  let elapsed = 0;
  let hoveredNode = null;
  const initialCamera = { alpha: camera.alpha, beta: camera.beta, radius: camera.radius };

  scene.onPointerObservable.add((pointerInfo) => {
    const picked = pointerInfo.pickInfo?.pickedMesh;
    const nodeId = picked?.metadata?.nodeId;

    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERMOVE) {
      if (hoveredNode !== nodeId) {
        hoveredNode = nodeId ?? null;
        canvas.style.cursor = nodeId ? "pointer" : "grab";
      }
    }

    if (pointerInfo.type === BABYLON.PointerEventTypes.POINTERPICK && nodeId && DETAILS[nodeId]) {
      onSelect(DETAILS[nodeId]);
      const config = NODE_CONFIG.find((item) => item.id === nodeId);
      if (config) {
        const target = new BABYLON.Vector3(...config.position);
        BABYLON.Animation.CreateAndStartAnimation(
          "camera-target-shift",
          camera,
          "target",
          30,
          24,
          camera.target.clone(),
          target.scale(0.45),
          BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
          new BABYLON.CubicEase(),
        );
      }
    }
  });

  scene.registerBeforeRender(() => {
    const delta = engine.getDeltaTime() * 0.001;
    elapsed += delta;

    core.root.rotation.y += delta * 0.12;
    core.ringA.rotation.z += delta * 0.38;
    core.ringB.rotation.y -= delta * 0.24;
    core.ringC.rotation.z -= delta * 0.19;
    core.inner.scaling.setAll(1 + Math.sin(elapsed * 2.2) * 0.035);

    nodes.forEach((node, index) => {
      node.visualRoot.rotation.y += delta * (0.28 + index * 0.05);
      node.halo.scaling.setAll(1 + Math.sin(elapsed * 2 + index) * 0.07);
      node.root.position.y = NODE_CONFIG[index].position[1] + Math.sin(elapsed * 1.2 + index * 1.4) * 0.13;
    });

    signalArcs.forEach((arc, index) => {
      arc.alpha = 0.18 + (Math.sin(elapsed * 2.5 + index) + 1) * 0.12;
    });

    stars.rotation.y += delta * 0.004;
    if (guidedOrbit) camera.alpha += delta * 0.085;
  });

  const resize = () => engine.resize();
  window.addEventListener("resize", resize);
  engine.runRenderLoop(() => scene.render());

  onSelect(DETAILS.core);
  onReady({ engineType: engine.webGLVersion === 2 ? "WEBGL 2" : "WEBGL 1" });

  return {
    setGuidedOrbit(value) {
      guidedOrbit = value;
    },
    resetCamera() {
      guidedOrbit = false;
      BABYLON.Animation.CreateAndStartAnimation(
        "camera-reset-alpha",
        camera,
        "alpha",
        30,
        28,
        camera.alpha,
        initialCamera.alpha,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
      );
      BABYLON.Animation.CreateAndStartAnimation(
        "camera-reset-beta",
        camera,
        "beta",
        30,
        28,
        camera.beta,
        initialCamera.beta,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
      );
      BABYLON.Animation.CreateAndStartAnimation(
        "camera-reset-radius",
        camera,
        "radius",
        30,
        28,
        camera.radius,
        initialCamera.radius,
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
      );
      BABYLON.Animation.CreateAndStartAnimation(
        "camera-reset-target",
        camera,
        "target",
        30,
        28,
        camera.target.clone(),
        new BABYLON.Vector3(0, 0.25, 0),
        BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
      );
      onSelect(DETAILS.core);
    },
    getStats() {
      return {
        fps: Math.round(engine.getFps()).toString(),
        meshes: scene.meshes.length.toString(),
      };
    },
    dispose() {
      window.removeEventListener("resize", resize);
      scene.dispose();
      engine.dispose();
    },
  };
}
