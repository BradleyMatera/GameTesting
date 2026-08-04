const B = () => {
  if (!window.BABYLON) throw new Error('Babylon.js did not load.');
  return window.BABYLON;
};

export function color(hex) {
  return B().Color3.FromHexString(hex);
}

export function material(scene, name, hex, options = {}) {
  const BABYLON = B();
  const m = new BABYLON.PBRMaterial(name, scene);
  m.albedoColor = color(hex);
  m.metallic = options.metallic ?? 0.18;
  m.roughness = options.roughness ?? 0.62;
  if (options.emissive) {
    m.emissiveColor = color(options.emissive);
    m.emissiveIntensity = options.emissiveIntensity ?? 0.7;
  }
  if (options.alpha !== undefined) m.alpha = options.alpha;
  return m;
}

export function basicScene(canvas, options = {}) {
  const BABYLON = B();
  const engine = new BABYLON.Engine(canvas, true, {
    preserveDrawingBuffer: true,
    stencil: true,
    antialias: true,
    adaptToDeviceRatio: true,
  });
  engine.setHardwareScalingLevel(Math.max(1, Math.min(1.6, window.devicePixelRatio || 1)));
  const scene = new BABYLON.Scene(engine);
  scene.clearColor = BABYLON.Color4.FromHexString(options.clear ?? '#07111fff');
  scene.ambientColor = color(options.ambient ?? '#9fb7d6');

  const camera = new BABYLON.ArcRotateCamera(
    'camera',
    options.alpha ?? -Math.PI / 2,
    options.beta ?? Math.PI / 3.1,
    options.radius ?? 22,
    new BABYLON.Vector3(...(options.target ?? [0, 1.6, 0])),
    scene,
  );
  camera.lowerRadiusLimit = options.minRadius ?? 6;
  camera.upperRadiusLimit = options.maxRadius ?? 44;
  camera.lowerBetaLimit = 0.18;
  camera.upperBetaLimit = Math.PI / 2.08;
  camera.wheelDeltaPercentage = 0.012;
  camera.panningSensibility = 0;
  camera.attachControl(canvas, true);

  const hemi = new BABYLON.HemisphericLight('skyLight', new BABYLON.Vector3(0.2, 1, 0.1), scene);
  hemi.intensity = options.hemi ?? 1.1;
  hemi.groundColor = color(options.groundLight ?? '#16243b');
  const key = new BABYLON.DirectionalLight('keyLight', new BABYLON.Vector3(-0.5, -1, 0.4), scene);
  key.position = new BABYLON.Vector3(14, 24, -14);
  key.intensity = options.key ?? 1.8;

  const glow = new BABYLON.GlowLayer('glow', scene, { blurKernelSize: 24 });
  glow.intensity = options.glow ?? 0.55;
  const pipeline = new BABYLON.DefaultRenderingPipeline('pipeline', true, scene, [camera]);
  pipeline.fxaaEnabled = true;
  pipeline.bloomEnabled = options.bloom !== false;
  pipeline.bloomWeight = options.bloomWeight ?? 0.18;
  pipeline.bloomThreshold = 0.75;
  pipeline.samples = 1;

  const onResize = () => engine.resize();
  window.addEventListener('resize', onResize);
  engine.runRenderLoop(() => scene.render());

  return {
    BABYLON,
    engine,
    scene,
    camera,
    glow,
    dispose() {
      window.removeEventListener('resize', onResize);
      scene.dispose();
      engine.dispose();
    },
    stats(label = 'Babylon.js 3D') {
      return {
        engine: label,
        fps: Math.round(engine.getFps()),
        scene: `${scene.getActiveMeshes().length} active / ${scene.meshes.length} meshes`,
      };
    },
  };
}

export function ground(scene, options = {}) {
  const BABYLON = B();
  const mesh = BABYLON.MeshBuilder.CreateGround(options.name ?? 'ground', {
    width: options.width ?? 34,
    height: options.height ?? 26,
    subdivisions: options.subdivisions ?? 2,
    updatable: options.updatable ?? true,
  }, scene);
  mesh.material = material(scene, `${mesh.name}Material`, options.color ?? '#102038', {
    roughness: 0.9,
    metallic: 0.02,
  });
  mesh.receiveShadows = true;
  return mesh;
}

export function box(scene, name, size, position, hex, options = {}) {
  const BABYLON = B();
  const mesh = BABYLON.MeshBuilder.CreateBox(name, {
    width: size[0], height: size[1], depth: size[2],
  }, scene);
  mesh.position.set(...position);
  mesh.material = material(scene, `${name}Mat`, hex, options);
  return mesh;
}

export function cylinder(scene, name, diameter, height, position, hex, options = {}) {
  const BABYLON = B();
  const mesh = BABYLON.MeshBuilder.CreateCylinder(name, {
    diameter, height, tessellation: options.tessellation ?? 24,
  }, scene);
  mesh.position.set(...position);
  mesh.material = material(scene, `${name}Mat`, hex, options);
  return mesh;
}

export function sphere(scene, name, diameter, position, hex, options = {}) {
  const BABYLON = B();
  const mesh = BABYLON.MeshBuilder.CreateSphere(name, { diameter, segments: options.segments ?? 20 }, scene);
  mesh.position.set(...position);
  mesh.material = material(scene, `${name}Mat`, hex, options);
  return mesh;
}

export function label(scene, text, position, options = {}) {
  const BABYLON = B();
  const plane = BABYLON.MeshBuilder.CreatePlane(`label-${text}`, {
    width: options.width ?? 4.4,
    height: options.height ?? 1.05,
  }, scene);
  plane.position.set(...position);
  plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
  plane.isPickable = false;
  const tex = new BABYLON.DynamicTexture(`labelTexture-${text}`, { width: 1024, height: 256 }, scene, false);
  tex.hasAlpha = true;
  const ctx = tex.getContext();
  ctx.clearRect(0, 0, 1024, 256);
  if (options.background !== false) {
    ctx.fillStyle = options.background ?? 'rgba(4,10,22,.84)';
    roundRect(ctx, 8, 18, 1008, 220, 34);
    ctx.fill();
    ctx.strokeStyle = options.border ?? 'rgba(126,230,255,.7)';
    ctx.lineWidth = 6;
    roundRect(ctx, 8, 18, 1008, 220, 34);
    ctx.stroke();
  }
  ctx.fillStyle = options.color ?? '#eff8ff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${options.fontSize ?? 68}px Inter, Arial`;
  ctx.fillText(text, 512, 130);
  tex.update();
  const mat = new BABYLON.StandardMaterial(`labelMat-${text}`, scene);
  mat.diffuseTexture = tex;
  mat.opacityTexture = tex;
  mat.emissiveColor = new BABYLON.Color3(1, 1, 1);
  mat.disableLighting = true;
  plane.material = mat;
  return plane;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function line(scene, points, hex = '#67e8f9', width = 0.07) {
  const BABYLON = B();
  const path = points.map(p => new BABYLON.Vector3(...p));
  const tube = BABYLON.MeshBuilder.CreateTube(`line-${scene.meshes.length}`, {
    path, radius: width, tessellation: 10, cap: BABYLON.Mesh.CAP_ALL,
  }, scene);
  tube.material = material(scene, `${tube.name}Mat`, hex, { emissive: hex, emissiveIntensity: 0.65, roughness: 0.35 });
  return tube;
}
