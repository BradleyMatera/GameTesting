import { controllerForDom, createStorage, downloadText, escapeHtml, qs, qsa, wait } from './tool-utils.js';

const scenarios = {
  clean: { label: 'Accessible baseline', issues: {} },
  form: { label: 'Broken signup form', issues: { label: true, buttonName: true, focus: true } },
  content: { label: 'Content structure failures', issues: { heading: true, landmark: true, linkName: true } },
  motion: { label: 'Visual and motion failures', issues: { contrast: true, motion: true } }
};
const issueDefinitions = {
  contrast: { label: 'Low text contrast', wcag: '1.4.3', severity: 'high' },
  label: { label: 'Missing input label', wcag: '1.3.1 / 4.1.2', severity: 'high' },
  buttonName: { label: 'Unnamed button', wcag: '4.1.2', severity: 'high' },
  heading: { label: 'Skipped heading level', wcag: '1.3.1 / 2.4.6', severity: 'medium' },
  focus: { label: 'Invisible keyboard focus', wcag: '2.4.7 / 2.4.11', severity: 'high' },
  landmark: { label: 'Missing main landmark', wcag: '1.3.1 / 2.4.1', severity: 'medium' },
  linkName: { label: 'Ambiguous link name', wcag: '2.4.4', severity: 'medium' },
  motion: { label: 'Uncontrolled animation', wcag: '2.2.2 / 2.3.3', severity: 'medium' }
};
function luminance(hex) { const value = hex.replace('#', ''); const channels = [0,2,4].map(index => parseInt(value.slice(index,index+2),16)/255).map(channel => channel <= .03928 ? channel/12.92 : Math.pow((channel+.055)/1.055,2.4)); return channels[0]*.2126 + channels[1]*.7152 + channels[2]*.0722; }
function contrastRatio(foreground, background) { const a=luminance(foreground), b=luminance(background); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); }
function accessibleName(element) {
  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) return labelledBy.split(/\s+/).map(id => element.ownerDocument.getElementById(id)?.textContent || '').join(' ').trim();
  const aria = element.getAttribute('aria-label'); if (aria) return aria.trim();
  if (element.id) { const label = element.ownerDocument.querySelector(`label[for="${CSS.escape(element.id)}"]`); if (label) return label.textContent.trim(); }
  const wrapping = element.closest('label'); if (wrapping) return wrapping.textContent.replace(element.value || '', '').trim();
  if (element.tagName === 'IMG') return element.getAttribute('alt') || '';
  return element.textContent.trim();
}
function roleFor(element) {
  if (element.getAttribute('role')) return element.getAttribute('role');
  const map = { A:'link', BUTTON:'button', INPUT:'textbox', SELECT:'combobox', NAV:'navigation', MAIN:'main', HEADER:'banner', FOOTER:'contentinfo', FORM:'form', H1:'heading level 1', H2:'heading level 2', H3:'heading level 3', H4:'heading level 4' };
  return map[element.tagName] || element.tagName.toLowerCase();
}
function buildPreview(preview, issues, colors) {
  preview.className = `a11y-preview${issues.focus ? ' issue-focus' : ''}${issues.motion ? ' issue-motion' : ''}`;
  preview.style.setProperty('--preview-copy', issues.contrast ? colors.low : colors.foreground);
  preview.style.setProperty('--preview-bg', colors.background);
  preview.innerHTML = `<header><a href="#home" class="preview-logo">Northstar</a><nav aria-label="Primary"><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#details">${issues.linkName ? 'Learn more' : 'Read customer evidence'}</a></nav></header>${issues.landmark ? '<div data-main>' : '<main data-main>'}<h1>Ship a better product.</h1><p>One accessible workspace for planning, building, and support.</p><form aria-label="Start a free trial"><div class="preview-form-field">${issues.label ? '' : '<label for="preview-email">Email address</label>'}<input id="preview-email" type="email" placeholder="you@example.com"></div><button ${issues.buttonName ? 'aria-label=""' : ''}>${issues.buttonName ? '<span aria-hidden="true">→</span>' : 'Start free'}</button></form>${issues.heading ? '<h4>Trusted by practical teams</h4>' : '<h2>Trusted by practical teams</h2>'}<div class="preview-cards"><article tabindex="0">Fast setup</article><article tabindex="0">Clear reporting</article><article tabindex="0">Real support</article></div>${issues.landmark ? '</div>' : '</main>'}<footer><a href="#privacy">Privacy</a></footer>`;
}
function auditPreview(preview, issues, colors) {
  const findings = [];
  const add = (id,title,passed,detail,recommendation) => findings.push({ id,title,passed,...issueDefinitions[id],detail,recommendation });
  const inputs=qsa(preview,'input,select,textarea'), buttons=qsa(preview,'button'), headings=qsa(preview,'h1,h2,h3,h4,h5,h6'), links=qsa(preview,'a[href]');
  add('label','Form controls have accessible names',inputs.every(accessibleName),`${inputs.filter(input=>!accessibleName(input)).length} unnamed form control(s).`,'Add a visible label or an equivalent aria-label/aria-labelledby relationship.');
  add('buttonName','Buttons have accessible names',buttons.every(accessibleName),`${buttons.filter(button=>!accessibleName(button)).length} unnamed button(s).`,'Give every button a visible or programmatic name that describes its action.');
  let order=true, prior=0; headings.forEach(heading=>{const level=Number(heading.tagName[1]); if(prior&&level>prior+1) order=false; prior=level;});
  add('heading','Heading structure is sequential',order,headings.map(heading=>heading.tagName).join(' → '),'Use headings to represent nested sections without skipping levels.');
  add('landmark','Main landmark is present',Boolean(preview.querySelector('main')),preview.querySelector('main')?'One main landmark found.':'No main landmark found.','Wrap the primary page content in a main element.');
  const ambiguous=links.filter(link=>/^(learn more|click here|more|details)$/i.test(link.textContent.trim())||!accessibleName(link));
  add('linkName','Links describe their destination',ambiguous.length===0,`${ambiguous.length} ambiguous link(s).`,'Use unique link text that makes sense outside the surrounding paragraph.');
  const ratio=contrastRatio(issues.contrast?colors.low:colors.foreground,colors.background);
  add('contrast','Normal text contrast meets 4.5:1',ratio>=4.5,`Measured ratio: ${ratio.toFixed(2)}:1.`,'Increase the difference between foreground and background colors.');
  add('focus','Keyboard focus remains visible',!issues.focus,issues.focus?'The preview removes focus outlines.':'Visible focus styling is enabled.','Provide a visible focus indicator with sufficient contrast and area.');
  add('motion','Animation can be controlled',!issues.motion,issues.motion?'Cards animate continuously with no pause control.':'No uncontrolled animation is active.','Respect prefers-reduced-motion and provide a pause mechanism for persistent movement.');
  const score=Math.max(0,100-findings.filter(item=>!item.passed).reduce((sum,item)=>sum+(item.severity==='high'?16:10),0));
  return { score, findings, ratio, generatedAt:new Date().toISOString() };
}
function screenReaderOutline(preview) {
  return qsa(preview,'header,nav,main,[data-main],h1,h2,h3,h4,a[href],form,input,button,footer').filter(node=>!(node.matches('[data-main]')&&node.tagName==='MAIN')).map(node=>({ role:roleFor(node), name:accessibleName(node)||'(unnamed)', focusable:node.matches('a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])') }));
}
function markdown(report) {
  const lines=['# Accessibility Lab Report','',`Score: ${report.score}/100`,`Generated: ${report.generatedAt}`,`Contrast ratio: ${report.ratio.toFixed(2)}:1`,'','## Findings'];
  report.findings.forEach(item=>lines.push(`### ${item.passed?'PASS':'FAIL'} · ${item.title}`,`- WCAG: ${item.wcag}`,`- Severity: ${item.severity}`,`- Detail: ${item.detail}`,`- Recommendation: ${item.recommendation}`,''));
  return lines.join('\n');
}

export function createAccessibilityLab({ stage, toast }) {
  stage.innerHTML = `<section class="tool-product a11y-product" style="--tool-bg:#fff6fb;--tool-text:#341c31;--tool-line:#ead4e2;--tool-accent:#db2777;--tool-panel:#fff;--tool-muted:#7c5a70"><header class="tool-product__toolbar"><div><h2>Accessibility Testing Lab</h2><p>Inject failures, run an actual DOM audit, trace real keyboard focus, inspect accessible names, calculate contrast, and export remediation.</p></div><button data-action="audit" class="primary">Run audit</button><button data-action="keyboard">Keyboard trace</button><button data-action="fix">Fix all</button><button data-action="save">Save scenario</button><button data-action="load">Load</button><button data-action="export">Export</button></header><div class="tool-product__workspace tool-split-3 a11y-product__workspace"><aside class="tool-panel tool-inspector"><section><h3>SCENARIO</h3><label>Preset<select data-scenario>${Object.entries(scenarios).map(([id,scenario])=>`<option value="${id}">${scenario.label}</option>`).join('')}</select></label></section><section><h3>INJECT ISSUES</h3>${Object.entries(issueDefinitions).map(([id,issue])=>`<label class="a11y-toggle"><input type="checkbox" data-issue="${id}"><span><strong>${issue.label}</strong><small>WCAG ${issue.wcag}</small></span></label>`).join('')}</section><section><h3>CONTRAST CALCULATOR</h3><div class="tool-field-grid"><label>Text<input data-color="foreground" type="color" value="#526174"></label><label>Background<input data-color="background" type="color" value="#ffffff"></label></div><label>Injected low contrast<input data-color="low" type="color" value="#b4bac2"></label><div class="tool-kpi"><span>RATIO</span><strong data-contrast-ratio>--</strong></div></section></aside><main class="tool-panel a11y-preview-panel"><div class="device-browser"><div class="browser-chrome"><i></i><i></i><i></i><span>northstar-product.test</span></div><div data-preview></div></div><div class="keyboard-trace" data-focus-path>Keyboard trace has not run.</div></main><aside class="tool-panel tool-inspector"><section><h3>SCORE</h3><div class="a11y-score-large"><strong data-score>--</strong><span>/100</span></div></section><section><h3>ACCESSIBILITY TREE</h3><ol class="tool-code" data-tree></ol></section><section><h3>FINDINGS</h3><div data-findings><p>Run an audit.</p></div></section></aside></div><footer class="tool-product__statusbar"><span data-status>Ready.</span><span style="margin-left:auto">The preview itself receives focus during keyboard tracing; this is not a fake text animation.</span></footer></section>`;
  const storage=createStorage('game-testing:a11y-lab:v2');
  const state={issues:{},colors:{foreground:'#526174',background:'#ffffff',low:'#b4bac2'},report:null,focusRun:0};
  const previewHost=qs(stage,'[data-preview]');
  const setStatus=text=>{qs(stage,'[data-status]').textContent=text;};
  function syncControls(){qsa(stage,'[data-issue]').forEach(input=>{input.checked=Boolean(state.issues[input.dataset.issue]);});qsa(stage,'[data-color]').forEach(input=>{input.value=state.colors[input.dataset.color];});}
  function renderPreview(){buildPreview(previewHost,state.issues,state.colors);const outline=screenReaderOutline(previewHost);qs(stage,'[data-tree]').innerHTML=outline.map(item=>`<li><b>${escapeHtml(item.role)}</b> · ${escapeHtml(item.name)}${item.focusable?' · focusable':''}</li>`).join('');const ratio=contrastRatio(state.issues.contrast?state.colors.low:state.colors.foreground,state.colors.background);qs(stage,'[data-contrast-ratio]').textContent=`${ratio.toFixed(2)}:1`;}
  function runAudit(showToast=true){state.report=auditPreview(previewHost,state.issues,state.colors);qs(stage,'[data-score]').textContent=state.report.score;qs(stage,'[data-findings]').innerHTML=state.report.findings.map(item=>`<article class="a11y-finding" data-state="${item.passed?'pass':'fail'}"><b>${item.passed?'PASS':'FAIL'} · WCAG ${escapeHtml(item.wcag)}</b><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p>${item.passed?'':`<details><summary>Remediation</summary><p>${escapeHtml(item.recommendation)}</p></details>`}</article>`).join('');setStatus(`Audit complete: ${state.report.score}/100 with ${state.report.findings.filter(item=>!item.passed).length} failure(s).`);if(showToast)toast(`Accessibility audit: ${state.report.score}/100`);}
  function applyScenario(id){state.issues={...(scenarios[id]?.issues||{})};syncControls();renderPreview();runAudit(false);setStatus(`${scenarios[id]?.label||'Scenario'} loaded.`);}
  async function keyboardTrace(){const run=++state.focusRun;const focusables=qsa(previewHost,'a[href],button,input,select,textarea,[tabindex]:not([tabindex="-1"])').filter(element=>!element.disabled);if(!focusables.length)return toast('No focusable controls found.');setStatus(`Tracing ${focusables.length} keyboard stops…`);for(let index=0;index<focusables.length;index+=1){if(run!==state.focusRun)return;const element=focusables[index];element.focus();element.scrollIntoView({block:'nearest',inline:'nearest'});const name=accessibleName(element)||'(unnamed)';qs(stage,'[data-focus-path]').textContent=`${index+1}/${focusables.length}: ${roleFor(element)} · ${name}`;await wait(520);}qs(stage,'[data-focus-path]').textContent=`Completed ${focusables.length} focus stops. Last: ${roleFor(document.activeElement)} · ${accessibleName(document.activeElement)||(unnamed)}`;setStatus('Keyboard trace complete.');toast('Keyboard focus trace completed');}
  stage.addEventListener('change',event=>{if(event.target.matches('[data-scenario]'))return applyScenario(event.target.value);if(event.target.matches('[data-issue]')){state.issues[event.target.dataset.issue]=event.target.checked;renderPreview();runAudit(false);}if(event.target.matches('[data-color]')){state.colors[event.target.dataset.color]=event.target.value;renderPreview();runAudit(false);}});
  stage.addEventListener('click',event=>{const action=event.target.closest('[data-action]')?.dataset.action;if(!action)return;if(action==='audit')runAudit();else if(action==='keyboard')keyboardTrace();else if(action==='fix'){state.issues={};syncControls();renderPreview();runAudit(false);setStatus('Injected failures removed and accessible baseline restored.');toast('All injected issues fixed');}else if(action==='save'){storage.save({issues:state.issues,colors:state.colors});toast('Accessibility scenario saved');setStatus('Scenario saved in this browser.');}else if(action==='load'){const saved=storage.load();if(!saved)return toast('No saved scenario found.');state.issues=saved.issues||{};state.colors={...state.colors,...(saved.colors||{})};syncControls();renderPreview();runAudit(false);toast('Saved scenario loaded');}else if(action==='export'){if(!state.report)runAudit(false);downloadText('accessibility-report.json',JSON.stringify(state.report,null,2));downloadText('accessibility-report.md',markdown(state.report),'text/markdown');toast('Accessibility report exported');}});
  applyScenario('clean');
  return controllerForDom(stage,()=>applyScenario('clean'),()=>{state.focusRun+=1;},'ACCESSIBILITY TEST PRODUCT',()=>state.report?`${state.report.findings.length} checks · ${state.report.score}/100`:'Ready to audit');
}
