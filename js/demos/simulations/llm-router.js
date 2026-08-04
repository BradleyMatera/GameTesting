import { basicScene, ground, box, cylinder, sphere, label, line, material, createAgent, createDesk, createServerRack, animateAlong, pulse } from '../../core/scene.js';

const $=(root,s)=>root.querySelector(s);
const $$=(root,s)=>[...root.querySelectorAll(s)];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function domController(stage, reset, cleanup, engine='INTERACTIVE SIMULATION') { return { dispose(){cleanup?.();stage.replaceChildren();}, reset, getStats(){return {engine,fps:'DOM',scene:`${stage.querySelectorAll('*').length} UI elements`};} }; }

export async function createLlmRouter({stage,toast}){
  stage.innerHTML=`<div class="game-root router-world"><canvas aria-label="3D LLM routing network"></canvas><div class="router-console"><header><span>MODEL ROUTING NETWORK</span><strong>LLM Router & Failover</strong></header><div class="router-request"><input data-prompt value="Explain Brad's cloud support experience with sources." aria-label="Request"><button data-send>Route request</button></div><div class="provider-switches"></div><p data-result>Enable or disable providers, then send a request.</p></div></div>`;
  const canvas=$(stage,'canvas'),ctx=basicScene(canvas,{clear:'#020617ff',radius:24,target:[0,2,0],bloomWeight:.28,glow:.8});const {scene,BABYLON,camera}=ctx;ground(scene,{width:36,height:24,color:'#060d1b'});
  const providers=[
    {id:'groq',name:'Groq',color:'#f97316',pos:[-10,0,-5],latency:190,quota:82,quality:82,enabled:true},
    {id:'cloudflare',name:'Cloudflare',color:'#fbbf24',pos:[10,0,-5],latency:340,quota:96,quality:74,enabled:true},
    {id:'gemini',name:'Gemini',color:'#38bdf8',pos:[-10,0,7],latency:460,quota:70,quality:90,enabled:true},
    {id:'local',name:'Local GPU',color:'#a78bfa',pos:[10,0,7],latency:760,quota:100,quality:78,enabled:true},
  ];
  const ingress=cylinder(scene,'ingress',3.2,1.1,[0,.55,0],'#1e293b',{metallic:.7,roughness:.24,emissive:'#67e8f9',emissiveIntensity:.25});
  const core=sphere(scene,'router-core',1.8,[0,2.2,0],'#67e8f9',{emissive:'#67e8f9',emissiveIntensity:.95,metallic:.15,roughness:.2});pulse(core,scene,{range:.05,speed:3});label(scene,'POLICY ROUTER',[0,4.6,0],{width:4.4,height:.75,fontSize:50});
  providers.forEach(p=>{createServerRack(scene,p.pos,{name:`provider-${p.id}`,frame:'#17233a',panel:'#050b14'});const beacon=sphere(scene,`${p.id}-beacon`,.7,[p.pos[0],5,p.pos[2]],p.color,{emissive:p.color,emissiveIntensity:1});beacon.metadata=p;beacon.isPickable=true;label(scene,p.name.toUpperCase(),[p.pos[0],6.3,p.pos[2]],{width:3.5,height:.7,fontSize:48,border:p.color});line(scene,[[0,1.5,0],[p.pos[0]*.52,2.7,p.pos[2]*.52],[p.pos[0],2.3,p.pos[2]]],p.color,.045);});
  stage.querySelector('.provider-switches')?.remove();const switches=stage.querySelector('.router-console');const switchWrap=document.createElement('div');switchWrap.className='provider-switches';switchWrap.innerHTML=providers.map(p=>`<label style="--provider:${p.color}"><input type="checkbox" data-provider="${p.id}" checked><span>${p.name}</span><small>${p.latency}ms · ${p.quota}% quota</small></label>`).join('');switches.insertBefore(switchWrap,$(stage,'[data-result]'));
  $$ (stage,'[data-provider]').forEach(input=>input.addEventListener('change',()=>{const p=providers.find(x=>x.id===input.dataset.provider);p.enabled=input.checked;}));
  let packets=[];
  async function route(){const candidates=providers.filter(p=>p.enabled&&p.quota>15).sort((a,b)=>(a.latency-a.quality*2)-(b.latency-b.quality*2));if(!candidates.length){$(stage,'[data-result]').textContent='No provider is available. Enable a provider or wait for quota recovery.';return;}const selected=candidates[0];$(stage,'[data-result]').textContent=`Policy selected ${selected.name}. Reserving quota and sending request…`;const packet=sphere(scene,`packet-${Date.now()}`,.45,[0,2.2,0],selected.color,{emissive:selected.color,emissiveIntensity:1.3,roughness:.15});packets.push(packet);animateAlong(scene,packet,[[0,2.2,0],[selected.pos[0]*.52,3,selected.pos[2]*.52],[selected.pos[0],3,selected.pos[2]]],selected.latency*4,false);await wait(selected.latency+550);selected.quota=Math.max(0,selected.quota-8);const failed=Math.random()<.14;if(failed&&candidates[1]){$(stage,'[data-result]').textContent=`${selected.name} returned 429. Failing over to ${candidates[1].name}…`;selected.enabled=false;await wait(700);return route();}$(stage,'[data-result]').textContent=`${selected.name} returned a grounded answer in ${selected.latency}ms. Quality ${selected.quality}/100. Remaining quota ${selected.quota}%.`;toast(`Route complete: ${selected.name}`);setTimeout(()=>packet.dispose(),500);}
  $(stage,'[data-send]').addEventListener('click',route);
  const observer=scene.onPointerObservable.add(e=>{if(e.type!==BABYLON.PointerEventTypes.POINTERPICK)return;const p=e.pickInfo?.pickedMesh?.metadata;if(p){toast(`${p.name}: ${p.latency}ms, quota ${p.quota}%`);camera.setTarget(new BABYLON.Vector3(p.pos[0],2,p.pos[2]));}});
  return {dispose(){packets.forEach(p=>p.dispose());scene.onPointerObservable.remove(observer);ctx.dispose();},reset(){providers.forEach(p=>{p.enabled=true;p.quota=p.id==='gemini'?70:p.id==='groq'?82:p.id==='cloudflare'?96:100;});$$ (stage,'[data-provider]').forEach(i=>i.checked=true);$(stage,'[data-result]').textContent='Router reset. All providers available.';},getStats(){return ctx.stats('3D MODEL ROUTER');}};
}
