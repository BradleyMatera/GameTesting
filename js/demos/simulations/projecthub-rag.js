import { createRunGuard, domController, escapeHtml, qs, qsa } from './simulation-utils.js';

const corpus = [
  {
    id: 'aws-internship', name: 'AWS Internship.md', authority: .98,
    topics: ['aws', 'cloud', 'support', 'internship', 'experience'],
    excerpt: 'Brad completed a 12-week AWS Cloud Support Associate internship in Seattle from May 27 through August 18, 2025.',
    facts: [
      'Brad completed a 12-week AWS Cloud Support Associate internship in Seattle in 2025.',
      'The internship used isolated lab accounts and did not include production customer tickets.',
      'The program included troubleshooting labs and AWS service training.',
    ],
  },
  {
    id: 'certifications', name: 'Certifications.json', authority: .96,
    topics: ['aws', 'certification', 'certifications', 'skills', 'cloud'],
    excerpt: 'Verified certifications include AWS Solutions Architect – Associate and AWS Certified AI Practitioner.',
    facts: [
      'Brad holds the AWS Solutions Architect – Associate certification.',
      'Brad holds the AWS Certified AI Practitioner certification.',
    ],
  },
  {
    id: 'projecthub', name: 'ProjectHub README.md', authority: .92,
    topics: ['projecthub', 'agent', 'rag', 'retrieval', 'recruiter', 'ai', 'project'],
    excerpt: 'ProjectHub is a grounded recruiter assistant with deterministic facts, provider failover, analytics, and answer verification.',
    facts: [
      'ProjectHub is an embeddable recruiter assistant grounded in verified sources.',
      'ProjectHub uses deterministic facts before model generation and supports multiple model providers.',
      'ProjectHub includes provider health, latency, topic, session, and cache analytics.',
    ],
  },
  {
    id: 'portfolio-projects', name: 'Portfolio Projects.json', authority: .90,
    topics: ['projects', 'project', 'frontend', 'full-stack', 'web', 'portfolio'],
    excerpt: 'Verified work includes ProjectHub, an interactive Pokédex, Animal Sounds, Ethics Engine demos, and cloud projects.',
    facts: [
      'Brad has built frontend, full-stack, cloud, testing, and agent-system projects.',
      'Verified portfolio projects include ProjectHub, an interactive Pokédex, Animal Sounds, and Ethics Engine work.',
    ],
  },
  {
    id: 'availability', name: 'Availability.yaml', authority: .95,
    topics: ['availability', 'schedule', 'hours', 'location', 'remote', 'relocation'],
    excerpt: 'Brad is based in Davis, Illinois and has stated availability from 7:30 AM to 4:00 PM Central Time.',
    facts: [
      'Brad is based in Davis, Illinois.',
      'Brad has stated availability from 7:30 AM to 4:00 PM Central Time.',
      'Brad is open to remote work and relocation for steady full-time employment.',
    ],
  },
  {
    id: 'military', name: 'Military Background.md', authority: .95,
    topics: ['military', 'army', 'veteran', 'leadership', 'afghanistan'],
    excerpt: 'Brad served as a U.S. Army combat medic with the 82nd Airborne Division and deployed to Afghanistan in 2012.',
    facts: [
      'Brad served as a U.S. Army combat medic with the 82nd Airborne Division.',
      'Brad deployed to Afghanistan in 2012.',
    ],
  },
  {
    id: 'business', name: 'Matera Digital.md', authority: .91,
    topics: ['business', 'matera', 'digital', 'website', 'services', 'company'],
    excerpt: 'Matera Digital is Brad’s Illinois sole-proprietor business for web development and digital services.',
    facts: [
      'Matera Digital is Brad’s sole-proprietor business in Illinois.',
      'Matera Digital provides web development and digital services.',
    ],
  },
];
const stopwords = new Set(['a','an','and','are','as','at','be','does','for','from','have','has','he','his','how','i','in','is','it','me','of','on','or','the','to','what','when','where','which','who','with']);
const topicRules = [
  ['aws-cloud', ['aws','cloud','support','certification','internship']],
  ['projects', ['project','projects','portfolio','built','build']],
  ['availability', ['available','availability','hours','schedule','location','remote','relocation']],
  ['military', ['military','army','veteran','afghanistan','medic']],
  ['business', ['business','matera','digital','company','services']],
  ['agent-systems', ['agent','projecthub','rag','retrieval','ai']],
];

function tokenize(text) {
  return String(text).toLowerCase().replace(/[^a-z0-9-]+/g, ' ').split(/\s+/).filter(token => token && !stopwords.has(token));
}
function classify(queryTokens) {
  const scores = topicRules.map(([topic, words]) => ({ topic, score: words.reduce((sum, word) => sum + (queryTokens.includes(word) ? 1 : 0), 0) })).sort((a, b) => b.score - a.score);
  return scores[0].score ? scores[0].topic : 'general-career';
}
function scoreDocument(document, queryTokens, classification) {
  const searchable = tokenize(`${document.name} ${document.excerpt} ${document.topics.join(' ')} ${document.facts.join(' ')}`);
  const overlap = queryTokens.reduce((sum, token) => sum + (searchable.includes(token) ? 1 : 0), 0);
  const topicBoost = document.topics.some(topic => classification.includes(topic) || topic.includes(classification.split('-')[0])) ? 1.4 : 0;
  const phraseBoost = queryTokens.some(token => document.name.toLowerCase().includes(token)) ? .6 : 0;
  const normalized = queryTokens.length ? overlap / queryTokens.length : 0;
  return Math.min(.99, normalized * .72 + topicBoost * .12 + phraseBoost * .08 + document.authority * .12);
}
function retrieve(query, topK, threshold) {
  const tokens = tokenize(query);
  const classification = classify(tokens);
  const results = corpus.map(document => ({ ...document, score: scoreDocument(document, tokens, classification), selected: true }))
    .filter(document => document.score >= threshold)
    .sort((a, b) => b.score - a.score || b.authority - a.authority)
    .slice(0, topK);
  return { tokens, classification, results };
}
function contextFor(documents) {
  return documents.flatMap((document, index) => document.facts.map(fact => `[${index + 1}] ${fact}`)).join('\n');
}
function generateAnswer(documents, injectUnsupported = false) {
  if (!documents.length) return { html: '<p>I do not have enough verified evidence to answer that question.</p>', claims: [], citations: [] };
  const claims = documents.flatMap(document => document.facts.slice(0, 2).map(fact => ({ fact, sourceId: document.id })));
  if (injectUnsupported) claims.push({ fact: 'Brad led production incident response for AWS enterprise customers.', sourceId: null });
  const citations = documents.map((document, index) => ({ number: index + 1, id: document.id, name: document.name }));
  const paragraphs = claims.map(claim => {
    const citation = citations.find(item => item.id === claim.sourceId);
    return `${escapeHtml(claim.fact)}${citation ? ` <sup>[${citation.number}]</sup>` : ' <sup>[unsupported]</sup>'}`;
  });
  return {
    html: `<p>${paragraphs.join(' ')}</p><ol>${citations.map(item => `<li>[${item.number}] ${escapeHtml(item.name)}</li>`).join('')}</ol>`,
    claims, citations,
  };
}
function judge(answer, documents) {
  const sourceIds = new Set(documents.map(document => document.id));
  const unsupported = answer.claims.filter(claim => !claim.sourceId || !sourceIds.has(claim.sourceId));
  const citationIds = new Set(answer.citations.map(citation => citation.id));
  const missingCitations = documents.filter(document => !citationIds.has(document.id));
  return {
    pass: unsupported.length === 0 && missingCitations.length === 0 && answer.claims.length > 0,
    unsupported: unsupported.length,
    citations: answer.citations.length,
    coverage: answer.claims.length ? Math.round((answer.claims.length - unsupported.length) / answer.claims.length * 100) : 0,
  };
}

export function createProjectHubRag({ stage, toast }) {
  stage.innerHTML = `<section class="rag-studio sim-product" style="--sim-accent:#38bdf8;--sim-panel:#07111e;--sim-muted:#91a8bc">
    <header><div><span>PROJECTHUB</span><strong>Evidence Retrieval Studio</strong></div><div class="sim-actions"><button data-action="run" class="primary">Run question</button><button data-action="cancel">Cancel</button><button data-action="rebuild">Rebuild selected evidence</button></div></header>
    <div class="rag-query"><div class="rag-query-controls"><label>Recruiter question<input data-query value="What cloud support experience and AWS certifications does Brad have?"></label><label>Top K<select data-top-k><option>2</option><option selected>4</option><option>6</option></select></label><label>Minimum score<select data-threshold><option value="0.15">15%</option><option value="0.25" selected>25%</option><option value="0.4">40%</option><option value="0.6">60%</option></select></label></div><label style="display:flex;grid-template-columns:auto 1fr;margin-top:.45rem"><input type="checkbox" data-unsupported style="width:auto"> Inject one unsupported claim to test the judge</label><div class="rag-stage-strip">${['CLASSIFY','RETRIEVE','RERANK','CONSTRUCT','GENERATE','JUDGE'].map((name, index) => `<div data-rag-step="${index}"><span>${String(index + 1).padStart(2, '0')}</span><strong>${name}</strong><small>waiting</small></div>`).join('')}</div></div>
    <div class="rag-workspace"><section><h3>RETRIEVED EVIDENCE</h3><div data-documents class="document-stack"><p>Run a question to retrieve evidence.</p></div></section><section class="context-window"><h3>CONTEXT WINDOW</h3><pre data-context>No context constructed.</pre><div class="rag-debug"><div class="sim-kpi"><span>CLASS</span><strong data-class>--</strong></div><div class="sim-kpi"><span>TOKENS</span><strong data-token-count>0</strong></div><div class="sim-kpi"><span>SOURCES</span><strong data-source-count>0</strong></div></div></section><section class="answer-preview"><h3>GROUNDED ANSWER</h3><article data-answer><p>No answer generated.</p></article><footer data-judge>Judge: waiting</footer></section></div>
  </section>`;

  const guard = createRunGuard();
  let running = false;
  let retrieval = null;
  let answer = null;

  function resetSteps() {
    qsa(stage, '[data-rag-step]').forEach(step => { step.className = ''; qs(step, 'small').textContent = 'waiting'; });
  }
  function renderDocuments() {
    if (!retrieval?.results.length) {
      qs(stage, '[data-documents]').innerHTML = '<p>No documents met the current threshold.</p>';
      return;
    }
    qs(stage, '[data-documents]').innerHTML = retrieval.results.map(document => `<article data-selected="${document.selected}" data-document="${document.id}"><button data-toggle-document="${document.id}">${document.selected ? 'Exclude' : 'Include'}</button><span>${Math.round(document.score * 100)}%</span><strong>${escapeHtml(document.name)}</strong><p>${escapeHtml(document.excerpt)}</p><small>Authority ${Math.round(document.authority * 100)}%</small></article>`).join('');
  }
  function selectedDocuments() { return retrieval?.results.filter(document => document.selected) || []; }
  function renderOutput() {
    const documents = selectedDocuments();
    const context = contextFor(documents);
    qs(stage, '[data-context]').textContent = context || 'No selected evidence.';
    qs(stage, '[data-token-count]').textContent = Math.ceil(tokenize(context).length * 1.35);
    qs(stage, '[data-source-count]').textContent = documents.length;
    answer = generateAnswer(documents, qs(stage, '[data-unsupported]').checked);
    qs(stage, '[data-answer]').innerHTML = answer.html;
    const result = judge(answer, documents);
    qs(stage, '[data-judge]').dataset.tone = result.pass ? 'pass' : 'fail';
    qs(stage, '[data-judge]').textContent = `Judge: ${result.pass ? 'PASS' : 'FAIL'} · ${result.unsupported} unsupported claims · ${result.citations} citations · ${result.coverage}% support coverage`;
    return result;
  }
  async function run() {
    if (running) return;
    const query = qs(stage, '[data-query]').value.trim();
    if (!query) return toast('Enter a recruiter question.');
    running = true;
    const token = guard.begin();
    resetSteps();
    qs(stage, '[data-documents]').innerHTML = '<p>Retrieving…</p>';
    qs(stage, '[data-context]').textContent = '';
    qs(stage, '[data-answer]').innerHTML = '<p>Waiting for evidence.</p>';
    qs(stage, '[data-judge]').textContent = 'Judge: waiting';
    const steps = qsa(stage, '[data-rag-step]');
    retrieval = retrieve(query, Number(qs(stage, '[data-top-k]').value), Number(qs(stage, '[data-threshold]').value));
    for (let index = 0; index < steps.length; index += 1) {
      if (!guard.active(token)) break;
      const step = steps[index];
      step.classList.add('active');
      qs(step, 'small').textContent = 'running';
      if (!(await guard.wait(token, 380))) break;
      if (index === 0) {
        qs(stage, '[data-class]').textContent = retrieval.classification;
        qs(step, 'small').textContent = retrieval.classification;
      } else if (index === 1) {
        renderDocuments();
        qs(step, 'small').textContent = `${retrieval.results.length} matches`;
      } else if (index === 2) {
        qs(step, 'small').textContent = retrieval.results.length ? `top score ${Math.round(retrieval.results[0].score * 100)}%` : 'no matches';
      } else if (index === 3) {
        const context = contextFor(selectedDocuments());
        qs(stage, '[data-context]').textContent = context || 'No evidence met the threshold.';
        qs(stage, '[data-token-count]').textContent = Math.ceil(tokenize(context).length * 1.35);
        qs(stage, '[data-source-count]').textContent = selectedDocuments().length;
        qs(step, 'small').textContent = `${selectedDocuments().length} sources`;
      } else if (index === 4) {
        answer = generateAnswer(selectedDocuments(), qs(stage, '[data-unsupported]').checked);
        qs(stage, '[data-answer]').innerHTML = answer.html;
        qs(step, 'small').textContent = `${answer.claims.length} claims`;
      } else if (index === 5) {
        const result = judge(answer, selectedDocuments());
        qs(stage, '[data-judge]').dataset.tone = result.pass ? 'pass' : 'fail';
        qs(stage, '[data-judge]').textContent = `Judge: ${result.pass ? 'PASS' : 'FAIL'} · ${result.unsupported} unsupported claims · ${result.citations} citations · ${result.coverage}% support coverage`;
        qs(step, 'small').textContent = result.pass ? 'PASS' : 'FAIL';
        toast(result.pass ? 'Grounded answer verified' : 'Judge found unsupported output');
      }
      step.classList.remove('active');
      step.classList.add('done');
    }
    running = false;
  }
  function cancel() {
    if (!running) return;
    guard.cancel(); running = false;
    qsa(stage, '[data-rag-step].active').forEach(step => { step.classList.remove('active'); qs(step, 'small').textContent = 'cancelled'; });
  }
  function reset() {
    cancel(); retrieval = null; answer = null; resetSteps();
    qs(stage, '[data-documents]').innerHTML = '<p>Run a question to retrieve evidence.</p>';
    qs(stage, '[data-context]').textContent = 'No context constructed.';
    qs(stage, '[data-answer]').innerHTML = '<p>No answer generated.</p>';
    qs(stage, '[data-judge]').textContent = 'Judge: waiting';
    qs(stage, '[data-class]').textContent = '--'; qs(stage, '[data-token-count]').textContent = '0'; qs(stage, '[data-source-count]').textContent = '0';
  }

  stage.addEventListener('click', event => {
    const toggle = event.target.closest('[data-toggle-document]');
    if (toggle && retrieval) {
      const document = retrieval.results.find(item => item.id === toggle.dataset.toggleDocument);
      document.selected = !document.selected;
      renderDocuments(); renderOutput(); return;
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'run') run();
    else if (action === 'cancel') cancel();
    else if (action === 'rebuild') {
      if (!retrieval) return toast('Run a question first.');
      const result = renderOutput();
      toast(result.pass ? 'Answer rebuilt and verified' : 'Rebuilt answer failed verification');
    }
  });
  return domController(stage, reset, () => guard.cancel(), 'QUERY-DRIVEN RETRIEVAL SIMULATION', () => retrieval ? `${retrieval.results.length} retrieved · ${selectedDocuments().length} selected · ${retrieval.classification}` : 'Ready for a query');
}
