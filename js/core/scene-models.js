import { box, cylinder, sphere, material } from './scene-base.js';
const B = () => { if (!window.BABYLON) throw new Error('Babylon.js did not load.'); return window.BABYLON; };

export function createServerRack(scene, position, options = {}) {
  const BABYLON = B();
  const root = new BABYLON.TransformNode(options.name ?? `rack-${scene.meshes.length}`, scene);
  const frame = box(scene, `${root.name}-frame`, [2.2, 4.2, 1.45], [0, 2.1, 0], options.frame ?? '#17263d', { metallic: .65, roughness: .32 });
  frame.parent = root;
  const panelMat = material(scene, `${root.name}-panelMat`, options.panel ?? '#07101e', { metallic: .45, roughness: .28 });
  for (let i = 0; i < 7; i++) {
    const panel = BABYLON.MeshBuilder.CreateBox(`${root.name}-panel-${i}`, { width: 1.78, height: .35, depth: 1.52 }, scene);
    panel.position.set(0, .55 + i * .48, -.02);
    panel.material = panelMat;
    panel.parent = root;
    for (let j = 0; j < 3; j++) {
      const led = sphere(scene, `${root.name}-led-${i}-${j}`, .09, [-.55 + j * .25, .55 + i * .48, -.79], j === 2 && i % 3 === 0 ? '#ffd166' : '#72f1b8', { emissive: j === 2 && i % 3 === 0 ? '#ffd166' : '#72f1b8', emissiveIntensity: 1.2 });
      led.parent = root;
    }
  }
  root.position.set(...position);
  return root;
}

export function createDesk(scene, position, options = {}) {
  const BABYLON = B();
  const root = new BABYLON.TransformNode(options.name ?? `desk-${scene.meshes.length}`, scene);
  const top = box(scene, `${root.name}-top`, [3.1, .18, 1.35], [0, 1.35, 0], options.color ?? '#734f34', { roughness: .82 });
  top.parent = root;
  [-1.3, 1.3].forEach(x => [-.48, .48].forEach(z => {
    const leg = box(scene, `${root.name}-leg-${x}-${z}`, [.14, 1.3, .14], [x, .65, z], '#303b48', { metallic: .7 });
    leg.parent = root;
  }));
  const screen = box(scene, `${root.name}-screen`, [1.35, .86, .08], [0, 2.08, -.1], '#0b1727', { metallic: .25, emissive: options.screen ?? '#67e8f9', emissiveIntensity: .32 });
  screen.parent = root;
  const stand = box(scene, `${root.name}-stand`, [.12, .62, .12], [0, 1.68, -.1], '#303b48', { metallic: .75 });
  stand.parent = root;
  root.position.set(...position);
  root.rotation.y = options.rotation ?? 0;
  return root;
}

export function createAgent(scene, position, options = {}) {
  const BABYLON = B();
  const root = new BABYLON.TransformNode(options.name ?? `agent-${scene.meshes.length}`, scene);
  const bodyColor = options.color ?? '#4f7cff';
  const body = cylinder(scene, `${root.name}-body`, 1.05, 1.65, [0, 1.25, 0], bodyColor, { metallic: .18, roughness: .68 });
  body.parent = root;
  const head = sphere(scene, `${root.name}-head`, .78, [0, 2.5, 0], options.skin ?? '#d8a578', { roughness: .78 });
  head.parent = root;
  const visor = box(scene, `${root.name}-visor`, [.54, .22, .08], [0, 2.55, -.37], '#07111f', { emissive: options.accent ?? '#67e8f9', emissiveIntensity: .7 });
  visor.parent = root;
  [-.68, .68].forEach(x => {
    const arm = cylinder(scene, `${root.name}-arm-${x}`, .23, 1.25, [x, 1.35, 0], bodyColor, { roughness: .68 });
    arm.rotation.z = x < 0 ? -.15 : .15;
    arm.parent = root;
    const leg = cylinder(scene, `${root.name}-leg-${x}`, .28, 1.2, [x * .43, .15, 0], '#1d2d46', { roughness: .75 });
    leg.parent = root;
  });
  root.position.set(...position);
  root.metadata = { velocity: new BABYLON.Vector3(0, 0, 0) };
  return root;
}

export function createTruck(scene, position, options = {}) {
  const BABYLON = B();
  const root = new BABYLON.TransformNode(options.name ?? `truck-${scene.meshes.length}`, scene);
  const cab = box(scene, `${root.name}-cab`, [1.75, 1.75, 2.0], [0, 1.15, -1.8], options.cab ?? '#e8edf5', { metallic: .32, roughness: .45 });
  cab.parent = root;
  const hood = box(scene, `${root.name}-hood`, [1.75, .85, 1.15], [0, .85, -3.35], options.cab ?? '#e8edf5', { metallic: .32, roughness: .45 });
  hood.parent = root;
  const windshield = box(scene, `${root.name}-glass`, [1.42, .62, .05], [0, 1.48, -2.82], '#13263c', { metallic: .45, roughness: .12, emissive: '#2d6a91', emissiveIntensity: .18 });
  windshield.rotation.x = -.18;
  windshield.parent = root;
  const trailer = box(scene, `${root.name}-trailer`, [2.05, 2.25, 5.15], [0, 1.35, 1.95], options.trailer ?? '#375f7b', { metallic: .22, roughness: .58 });
  trailer.parent = root;
  const stripe = box(scene, `${root.name}-stripe`, [2.08, .28, 5.18], [0, 1.45, 1.95], options.accent ?? '#f2b544', { metallic: .22, roughness: .5 });
  stripe.parent = root;
  const wheelMat = material(scene, `${root.name}-wheelMat`, '#111820', { roughness: .96 });
  [[-.92, -.9, -2.25], [.92, -.9, -2.25], [-.98, -.9, .9], [.98, -.9, .9], [-.98, -.9, 3.0], [.98, -.9, 3.0]].forEach((p, i) => {
    const wheel = BABYLON.MeshBuilder.CreateCylinder(`${root.name}-wheel-${i}`, { diameter: .72, height: .28, tessellation: 24 }, scene);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(p[0], .55, p[2]);
    wheel.material = wheelMat;
    wheel.parent = root;
  });
  root.position.set(...position);
  root.rotation.y = options.rotation ?? 0;
  return root;
}

export function createWarehouse(scene, position, options = {}) {
  const BABYLON = B();
  const root = new BABYLON.TransformNode(options.name ?? `warehouse-${scene.meshes.length}`, scene);
  const building = box(scene, `${root.name}-building`, [7.5, 3.8, 5.6], [0, 1.9, 0], options.color ?? '#9aa8b5', { metallic: .18, roughness: .7 });
  building.parent = root;
  const roof = BABYLON.MeshBuilder.CreateCylinder(`${root.name}-roof`, { diameter: 7.6, height: 5.9, tessellation: 3 }, scene);
  roof.rotation.x = Math.PI / 2;
  roof.rotation.z = Math.PI / 2;
  roof.scaling.y = .58;
  roof.position.set(0, 4.25, 0);
  roof.material = material(scene, `${root.name}-roofMat`, options.roof ?? '#33465a', { metallic: .45, roughness: .42 });
  roof.parent = root;
  for (let i = -1; i <= 1; i++) {
    const door = box(scene, `${root.name}-door-${i}`, [1.65, 2.35, .08], [i * 2.25, 1.18, -2.84], '#202f3e', { metallic: .62, roughness: .4 });
    door.parent = root;
    for (let y = -.75; y <= .75; y += .5) {
      const slat = box(scene, `${root.name}-slat-${i}-${y}`, [1.55, .05, .05], [i * 2.25, 1.18 + y, -2.91], '#8294a5', { metallic: .65 });
      slat.parent = root;
    }
  }
  root.position.set(...position);
  return root;
}

export function createGolfFlag(scene, position, options = {}) {
  const BABYLON = B();
  const root = new BABYLON.TransformNode(options.name ?? `flag-${scene.meshes.length}`, scene);
  const pole = cylinder(scene, `${root.name}-pole`, .09, 4.8, [0, 2.4, 0], '#f2f5f8', { metallic: .55, roughness: .35 });
  pole.parent = root;
  const flag = BABYLON.MeshBuilder.CreatePlane(`${root.name}-cloth`, { width: 1.8, height: 1.05 }, scene);
  flag.position.set(.9, 4.1, 0);
  flag.material = material(scene, `${root.name}-flagMat`, options.color ?? '#ff4d5a', { emissive: options.color ?? '#ff4d5a', emissiveIntensity: .2, roughness: .72 });
  flag.parent = root;
  const cup = cylinder(scene, `${root.name}-cup`, .32, .06, [0, .03, 0], '#06100b', { roughness: .9 });
  cup.parent = root;
  root.position.set(...position);
  return root;
}

export function createTree(scene, position, options = {}) {
  const BABYLON = B();
  const root = new BABYLON.TransformNode(options.name ?? `tree-${scene.meshes.length}`, scene);
  const trunk = cylinder(scene, `${root.name}-trunk`, .38, 2.2, [0, 1.1, 0], '#76533a', { roughness: .94, tessellation: 12 });
  trunk.parent = root;
  const crown = BABYLON.MeshBuilder.CreateCylinder(`${root.name}-crown`, { diameterTop: 0, diameterBottom: 2.5, height: 3.5, tessellation: 10 }, scene);
  crown.position.set(0, 3.35, 0);
  crown.material = material(scene, `${root.name}-crownMat`, options.color ?? '#267a48', { roughness: .9 });
  crown.parent = root;
  root.position.set(...position);
  root.scaling.setAll(options.scale ?? 1);
  return root;
}

export function createCreature(scene, position, options = {}) {
  const BABYLON = B();
  const root = new BABYLON.TransformNode(options.name ?? `creature-${scene.meshes.length}`, scene);
  const bodyColor = options.color ?? '#72f1b8';
  const body = sphere(scene, `${root.name}-body`, options.size ?? 1.2, [0, .65, 0], bodyColor, { metallic: .08, roughness: .65, emissive: options.glow ? bodyColor : undefined, emissiveIntensity: .18 });
  body.scaling.z = 1.35;
  body.parent = root;
  const eyeMat = material(scene, `${root.name}-eyeMat`, '#f8fbff', { emissive: '#f8fbff', emissiveIntensity: .7, roughness: .2 });
  [-.25, .25].forEach(x => {
    const eye = sphere(scene, `${root.name}-eye-${x}`, .2, [x, .88, -.58], '#ffffff', { emissive: '#ffffff', emissiveIntensity: .7 });
    eye.material = eyeMat;
    eye.parent = root;
    const pupil = sphere(scene, `${root.name}-pupil-${x}`, .09, [x, .88, -.68], '#07111f', { roughness: .4 });
    pupil.parent = root;
  });
  const limbCount = options.limbs ?? 4;
  for (let i = 0; i < limbCount; i++) {
    const angle = (i / limbCount) * Math.PI * 2;
    const limb = cylinder(scene, `${root.name}-limb-${i}`, .16, .7, [Math.sin(angle) * .55, .35, Math.cos(angle) * .58], bodyColor, { roughness: .7, tessellation: 10 });
    limb.rotation.x = Math.PI / 2.7;
    limb.rotation.y = angle;
    limb.parent = root;
  }
  root.position.set(...position);
  return root;
}

export function createBuilding(scene, position, options = {}) {
  const BABYLON = B();
  const root = new BABYLON.TransformNode(options.name ?? `building-${scene.meshes.length}`, scene);
  const width = options.width ?? 3.2;
  const depth = options.depth ?? 3.2;
  const height = options.height ?? 6;
  const main = box(scene, `${root.name}-main`, [width, height, depth], [0, height / 2, 0], options.color ?? '#263b58', { metallic: .22, roughness: .55 });
  main.parent = root;
  const windowMat = material(scene, `${root.name}-windowMat`, options.window ?? '#ffd166', { emissive: options.window ?? '#ffd166', emissiveIntensity: .7, roughness: .25 });
  for (let y = 1; y < height - .5; y += 1.15) {
    for (let x = -width / 2 + .55; x < width / 2; x += .9) {
      const win = box(scene, `${root.name}-window-${x}-${y}`, [.45, .42, .04], [x, y, -depth / 2 - .03], '#ffd166');
      win.material = windowMat;
      win.parent = root;
    }
  }
  root.position.set(...position);
  return root;
}

export function pulse(mesh, scene, options = {}) {
  const BABYLON = B();
  const base = options.base ?? 1;
  const range = options.range ?? .08;
  const speed = options.speed ?? 2;
  scene.onBeforeRenderObservable.add(() => {
    const s = base + Math.sin(performance.now() * .001 * speed) * range;
    mesh.scaling.setAll(s);
  });
}

export function animateAlong(scene, node, points, duration = 4000, loop = true) {
  const BABYLON = B();
  const frames = 120;
  const animation = new BABYLON.Animation(`${node.name}-path`, 'position', frames, BABYLON.Animation.ANIMATIONTYPE_VECTOR3, loop ? BABYLON.Animation.ANIMATIONLOOPMODE_CYCLE : BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);
  const keys = points.map((p, i) => ({ frame: (i / (points.length - 1)) * frames, value: new BABYLON.Vector3(...p) }));
  animation.setKeys(keys);
  node.animations = [animation];
  return scene.beginAnimation(node, 0, frames, loop, frames / (duration / 1000));
}

export function seeded(seed = 12345) {
  let s = Math.abs(Number(seed)) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
