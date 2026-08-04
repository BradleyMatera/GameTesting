import { basicScene, ground, box, cylinder, sphere, label, line, material, pulse } from '../core/scene.js';

export async function createDigitalCommandCenter({ stage }) {
  stage.innerHTML = `<div class="game-root command-center-root"><canvas aria-label="3D Digital Command Center"></canvas><div class="command-overlay"><span>SELECT A SYSTEM</span><strong data-system-title>Brad Matera Systems Core</strong><p data-system-copy>Orbit the scene and select one of the four illuminated system towers.</p><div data-system-tags><b>Cloud</b><b>Agents</b><b>Web</b><b>Interactive</b></div></div></div>`;
  const canvas = stage.querySelector('canvas');
  const ctx = basicScene(canvas, { clear:'#030712ff', radius:25, target:[0,2,0], bloomWeight:.28, glow:.75 });
  const { BABYLON, scene, camera } = ctx;
  ground(scene, { width:38, height:30, color:'#071425', subdivisions:8 });

  const gridMat = material(scene, 'gridMat', '#173653', { emissive:'#0c7da0', emissiveIntensity:.2, roughness:.8 });
  for (let x=-18; x<=18; x+=2) {
    const g = box(scene, `gx${x}`, [.018,.02,30], [x,.02,0], '#173653'); g.material = gridMat;
  }
  for (let z=-14; z<=14; z+=2) {
    const g = box(scene, `gz${z}`, [38,.02,.018], [0,.021,z], '#173653'); g.material = gridMat;
  }

  const core = cylinder(scene, 'systems-core', 4.2, 1.15, [0,.6,0], '#172542', { metallic:.75, roughness:.24, emissive:'#275b98', emissiveIntensity:.25 });
  const orb = sphere(scene, 'core-orb', 2.3, [0,2.4,0], '#67e8f9', { metallic:.15, roughness:.2, emissive:'#67e8f9', emissiveIntensity:1.1 });
  pulse(orb, scene, { range:.045, speed:2.4 });
  for (let i=0;i<3;i++) {
    const ring = BABYLON.MeshBuilder.CreateTorus(`core-ring-${i}`, { diameter:4.8+i*.75, thickness:.08, tessellation:64 }, scene);
    ring.position.y = 2.4;
    ring.rotation.x = Math.PI/2 + i*.35;
    ring.rotation.z = i*.7;
    ring.material = material(scene,`core-ring-mat-${i}`, i===1?'#a78bfa':'#67e8f9',{emissive:i===1?'#a78bfa':'#67e8f9',emissiveIntensity:.9,metallic:.4,roughness:.2});
    scene.onBeforeRenderObservable.add(() => ring.rotation.y += .0025*(i+1));
  }
  label(scene,'BRAD MATERA // SYSTEMS CORE',[0,5.2,0],{width:6.4,height:1.05,fontSize:58});

  const defs = [
    { title:'Cloud Systems', copy:'AWS architecture, resilient APIs, serverless compute, storage, observability, and delivery pipelines.', tags:['AWS','CloudFront','Lambda','DynamoDB'], position:[-9,0,-6], color:'#38bdf8', icon:'☁' },
    { title:'Agent Operations', copy:'Grounded multi-agent workflows with tools, memory, approvals, verification, and visible state.', tags:['Agents','Tools','Grounding','Observability'], position:[9,0,-6], color:'#a78bfa', icon:'AI' },
    { title:'Web Engineering', copy:'Responsive React and TypeScript interfaces, accessible interaction, APIs, and production deployment.', tags:['React','TypeScript','APIs','Accessibility'], position:[-9,0,7], color:'#34d399', icon:'</>' },
    { title:'Interactive Builds', copy:'Babylon.js, WebGPU, procedural worlds, simulations, physics, and browser games.', tags:['Babylon.js','WebGPU','Physics','Games'], position:[9,0,7], color:'#fb7185', icon:'3D' },
  ];
  const pickables=[];
  defs.forEach((def,index)=>{
    const root = new BABYLON.TransformNode(`tower-${index}`,scene); root.position.set(...def.position);
    const base = cylinder(scene,`tower-base-${index}`,4.1,.7,[0,.35,0],'#101c30',{metallic:.7,roughness:.3}); base.parent=root;
    const tower = cylinder(scene,`tower-body-${index}`,2.8,5.2,[0,3,0],'#152945',{metallic:.55,roughness:.28}); tower.parent=root;
    const cap = cylinder(scene,`tower-cap-${index}`,3.2,.35,[0,5.65,0],def.color,{emissive:def.color,emissiveIntensity:.75,metallic:.25,roughness:.25}); cap.parent=root;
    const beacon = sphere(scene,`tower-beacon-${index}`,1.15,[0,6.55,0],def.color,{emissive:def.color,emissiveIntensity:1.1,metallic:.1,roughness:.2}); beacon.parent=root; pulse(beacon,scene,{range:.08,speed:2+index*.3});
    const icon = label(scene,def.icon,[0,3,-1.44],{width:1.65,height:1.65,fontSize:def.icon.length>1?90:110,background:'rgba(4,10,22,.45)',border:def.color}); icon.parent=root;
    const name = label(scene,def.title.toUpperCase(),[0,8,0],{width:4.8,height:.9,fontSize:55,border:def.color}); name.parent=root;
    const edge = line(scene,[[def.position[0]*.15,1,def.position[2]*.15],[def.position[0]*.55,2.6,def.position[2]*.55],[def.position[0],4.2,def.position[2]]],def.color,.055);
    tower.isPickable=true; beacon.isPickable=true; tower.metadata=def; beacon.metadata=def; pickables.push(tower,beacon);
  });

  const pointerObserver = scene.onPointerObservable.add(pointer => {
    if (pointer.type !== BABYLON.PointerEventTypes.POINTERPICK) return;
    const def = pointer.pickInfo?.pickedMesh?.metadata;
    if (!def) return;
    stage.querySelector('[data-system-title]').textContent=def.title;
    stage.querySelector('[data-system-copy]').textContent=def.copy;
    stage.querySelector('[data-system-tags]').innerHTML=def.tags.map(tag=>`<b style="--tag:${def.color}">${tag}</b>`).join('');
    camera.setTarget(new BABYLON.Vector3(def.position[0],3.2,def.position[2]));
  });

  let tour=false;
  scene.onBeforeRenderObservable.add(()=>{
    orb.rotation.y += .006;
    if (tour) camera.alpha += .0015;
  });
  const overlay = stage.querySelector('.command-overlay');
  const tourButton=document.createElement('button'); tourButton.textContent='Guided orbit'; tourButton.className='command-tour'; overlay.append(tourButton);
  tourButton.addEventListener('click',()=>{tour=!tour;tourButton.textContent=tour?'Pause orbit':'Guided orbit';});

  return {
    dispose(){ scene.onPointerObservable.remove(pointerObserver); ctx.dispose(); },
    reset(){ camera.setTarget(new BABYLON.Vector3(0,2,0)); camera.alpha=-Math.PI/2; camera.beta=Math.PI/3.1; camera.radius=25; },
    getStats(){ return ctx.stats('BABYLON.JS 3D'); },
  };
}
