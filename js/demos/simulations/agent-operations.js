import { basicScene, ground, box, cylinder, sphere, label, line, material, createAgent, createDesk, createServerRack, animateAlong, pulse } from '../../core/scene.js';

const $=(root,s)=>root.querySelector(s);
const $$=(root,s)=>[...root.querySelectorAll(s)];
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function domController(stage, reset, cleanup, engine='INTERACTIVE SIMULATION') { return { dispose(){cleanup?.();stage.replaceChildren();}, reset, getStats(){return {engine,fps:'DOM',scene:`${stage.querySelectorAll('*').length} UI elements`};} }; }

export async function createAgentOperations({stage,toast}){
  stage.innerHTML=`<div class="game-root agent-office"><canvas aria-label="3D agent operations office"></canvas><div class="agent-ops-hud"><section><span>LIVE OFFICE SIMULATION</span><strong>Agent Operations</strong><p data-ops-status>Shift paused. Review the team, then start work.</p></section><aside><div><span>QUEUE</span><strong data-queue>8</strong></div><div><span>ACTIVE</span><strong data-active>0</strong></div><div><span>DONE</span><strong data-done>0</strong></div><button data-start>Start shift</button><button data-pause>Pause</button></aside><ol data-log><li>Office ready.</li></ol></div></div>`;
  const canvas=$ (stage,'canvas'); const ctx=basicScene(canvas,{clear:'#07101bff',radius:23,target:[0,2,0],bloomWeight:.12}); const {scene,BABYLON,camera}=ctx;
  ground(scene,{width:34,height:24,color:'#d9e0e7'});
  const carpet=box(scene,'carpet',[16,.03,12],[0,.035,0],'#1e3a5f',{roughness:.95});
  const deptDefs=[{name:'RESEARCH',x:-9,z:-5,color:'#8b5cf6'},{name:'BUILD',x:0,z:-5,color:'#38bdf8'},{name:'REVIEW',x:9,z:-5,color:'#f59e0b'},{name:'DELIVERY',x:0,z:6,color:'#34d399'}];
  deptDefs.forEach(d=>{const pad=box(scene,`pad-${d.name}`,[7,.08,5],[d.x,.05,d.z],d.color,{emissive:d.color,emissiveIntensity:.08,roughness:.9});label(scene,d.name,[d.x,4.7,d.z],{width:3.7,height:.7,fontSize:54,border:d.color});});
  const desks=[]; [[-9,-5],[-6,-5],[0,-5],[3,-5],[9,-5],[6,-5],[-2,6],[2,6]].forEach((p,i)=>desks.push(createDesk(scene,[p[0],0,p[1]],{name:`desk${i}`,rotation:i<6?0:Math.PI,screen:['#a78bfa','#67e8f9','#34d399','#fbbf24'][i%4]})));
  const agents=[
    {name:'Derek',role:'Research',color:'#8b5cf6',pos:[-10,0,-1],task:'Verify sources'},
    {name:'Maya',role:'Builder',color:'#38bdf8',pos:[-3,0,-1],task:'Build interface'},
    {name:'Frank',role:'Classifier',color:'#22c55e',pos:[3,0,-1],task:'Classify request'},
    {name:'Nora',role:'Reviewer',color:'#f59e0b',pos:[9,0,-1],task:'Review evidence'},
  ].map((a,i)=>({...a,node:createAgent(scene,a.pos,{name:`agent-${a.name}`,color:a.color,accent:a.color})}));
  agents.forEach(a=>{label(scene,`${a.name.toUpperCase()} · ${a.role.toUpperCase()}`,[a.pos[0],3.5,a.pos[2]],{width:4,height:.65,fontSize:44,border:a.color});a.node.getChildMeshes().forEach(m=>{m.isPickable=true;m.metadata=a;});});
  const tasks=['Verify employer source','Build recruiter view','Classify project question','Review API fallback','Generate release notes','Test mobile flow','Resolve evidence conflict','Publish artifact'];
  let queue=[...tasks],done=0,running=false,timer=null,tickIndex=0;
  const routes=[[-9,0,-5],[0,0,-5],[9,0,-5],[0,0,6]];
  function log(text){const li=document.createElement('li');li.textContent=text;$(stage,'[data-log]').prepend(li);while($(stage,'[data-log]').children.length>6)$(stage,'[data-log]').lastElementChild.remove();}
  function render(){ $(stage,'[data-queue]').textContent=queue.length;$(stage,'[data-active]').textContent=running?agents.length:0;$(stage,'[data-done]').textContent=done;$(stage,'[data-ops-status]').textContent=running?'Agents are moving tasks through research, build, review, and delivery.':'Shift paused. Current state is preserved.'; }
  function step(){if(!running)return;const agent=agents[tickIndex%agents.length];const task=queue.shift();if(task){agent.task=task;const from=agent.node.position.clone();const r=routes[tickIndex%routes.length];BABYLON.Animation.CreateAndStartAnimation(`move-${tickIndex}`,agent.node,'position',30,45,from,new BABYLON.Vector3(r[0],0,r[2]),BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT);log(`${agent.name} started: ${task}`);setTimeout(()=>{done++;queue.push(tasks[(done+3)%tasks.length]);log(`${agent.name} delivered: ${task}`);render();},2400);}tickIndex++;render();}
  function start(){running=true;clearInterval(timer);timer=setInterval(step,1800);step();render();}
  function pause(){running=false;clearInterval(timer);render();}
  $(stage,'[data-start]').addEventListener('click',start);$(stage,'[data-pause]').addEventListener('click',pause);
  const observer=scene.onPointerObservable.add(e=>{if(e.type!==BABYLON.PointerEventTypes.POINTERPICK)return;const a=e.pickInfo?.pickedMesh?.metadata;if(a){toast(`${a.name}: ${a.task}`);camera.setTarget(a.node.position.add(new BABYLON.Vector3(0,1.4,0)));}});
  render();
  return {dispose(){clearInterval(timer);scene.onPointerObservable.remove(observer);ctx.dispose();},reset(){pause();queue=[...tasks];done=0;tickIndex=0;agents.forEach((a,i)=>a.node.position.set(...[[ -10,0,-1],[-3,0,-1],[3,0,-1],[9,0,-1]][i]));render();},getStats(){return ctx.stats('3D AGENT STATE SIM');}};
}
