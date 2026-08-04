import { controllerForDom, createStorage, downloadText, escapeHtml, qs, safeJsonParse } from './tool-utils.js';

const sample = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Brad Matera Cloud and Frontend Engineering Portfolio</title>
  <meta name="description" content="Explore Brad Matera's AWS cloud support, frontend engineering, interactive systems, and grounded agent projects with verified evidence.">
  <link rel="canonical" href="https://bradleymatera.dev/">
  <meta property="og:title" content="Brad Matera Cloud and Frontend Engineering Portfolio">
  <meta property="og:description" content="Verified cloud, frontend, and agent-system work.">
  <meta property="og:image" content="https://bradleymatera.dev/social-card.png">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"Brad Matera","url":"https://bradleymatera.dev"}</script>
</head>
<body>
<header><nav aria-label="Primary"><a href="/projects">Projects</a><a href="/contact">Contact</a></nav></header>
<main>
  <h1>Cloud and frontend engineering</h1>
  <h2>What cloud support experience does Brad have?</h2>
  <p>Brad completed a 12-week AWS Cloud Support Associate internship and built cloud-support labs, documentation, and a serverless capstone.</p>
  <h2>Verified projects</h2>
  <img src="projecthub.png" alt="ProjectHub recruiter assistant dashboard">
  <p>Review the <a href="/projects/projecthub">ProjectHub evidence and architecture</a>.</p>
</main>
<footer><p>Updated August 4, 2026 · Written by Brad Matera</p></footer>
</body>
</html>`;

const weights = { Technical: 28, Content: 22, Accessibility: 18, AEO: 20, Social: 12 };
const textLength = value => String(value || '').trim().length;
const meta = (doc, selector, attribute = 'content') => doc.querySelector(selector)?.getAttribute(attribute)?.trim() || '';
const normalizeText = value => String(value || '').replace(/\s+/g, ' ').trim();
function lineOf(source, needle) { const index = source.toLowerCase().indexOf(String(needle).toLowerCase()); return index < 0 ? null : source.slice(0, index).split('\n').length; }

function auditHtml(source, pageUrl) {
  const doc = new DOMParser().parseFromString(source, 'text/html');
  const findings = [];
  const add = (category, id, title, passed, severity, detail, fix, needle = title) => findings.push({ category, id, title, passed, severity, detail, fix, line: lineOf(source, needle) });
  const html = doc.documentElement, title = doc.title.trim(), description = meta(doc, 'meta[name="description"]'), canonical = meta(doc, 'link[rel="canonical"]', 'href'), viewport = meta(doc, 'meta[name="viewport"]'), charset = doc.querySelector('meta[charset]')?.getAttribute('charset') || '';
  const h1s = [...doc.querySelectorAll('h1')], headings = [...doc.querySelectorAll('h1,h2,h3,h4,h5,h6')], images = [...doc.querySelectorAll('img')], links = [...doc.querySelectorAll('a[href]')], inputs = [...doc.querySelectorAll('input,select,textarea')], buttons = [...doc.querySelectorAll('button')];
  const ids = [...doc.querySelectorAll('[id]')].map(node => node.id).filter(Boolean), duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];

  add('Technical', 'charset', 'UTF-8 charset', /utf-?8/i.test(charset), 'high', charset ? `Charset is ${charset}.` : 'No charset declaration was found.', 'Add <meta charset="utf-8"> near the top of <head>.', '<meta charset');
  add('Technical', 'viewport', 'Responsive viewport', /width=device-width/i.test(viewport), 'high', viewport || 'No viewport metadata was found.', 'Add width=device-width, initial-scale=1.', 'viewport');
  add('Technical', 'canonical', 'Canonical URL', Boolean(canonical), 'medium', canonical || 'No canonical URL was found.', 'Add one absolute canonical URL for the preferred page.', 'canonical');
  add('Technical', 'lang', 'Document language', Boolean(html.getAttribute('lang')), 'medium', html.getAttribute('lang') ? `Language is ${html.getAttribute('lang')}.` : 'The html element has no lang attribute.', 'Add lang="en" or the correct page language.', '<html');
  const robots = meta(doc, 'meta[name="robots"]');
  add('Technical', 'indexability', 'Indexability', !/noindex/i.test(robots), 'high', robots || 'No restrictive robots directive found.', 'Remove noindex from production pages that should appear in search.', 'robots');
  const jsonLd = [...doc.querySelectorAll('script[type="application/ld+json"]')];
  add('Technical', 'structured-data-valid', 'Valid JSON-LD', jsonLd.length > 0 && jsonLd.every(script => !safeJsonParse(script.textContent).error), 'medium', `${jsonLd.length} JSON-LD block(s) found.`, 'Add valid schema.org JSON-LD and validate every block.', 'ld+json');

  add('Content', 'title', 'Descriptive title', title.length >= 20 && title.length <= 65, 'high', title ? `${title.length} characters: “${title}”` : 'No title text.', 'Use a unique, descriptive title between 20 and 65 characters.', '<title');
  add('Content', 'description', 'Meta description', description.length >= 70 && description.length <= 170, 'high', description ? `${description.length} characters.` : 'No meta description.', 'Summarize the page benefit and audience in 70–170 characters.', 'description');
  add('Content', 'single-h1', 'One primary H1', h1s.length === 1, 'high', `${h1s.length} H1 element(s) found.`, 'Use exactly one clear page-level H1.', '<h1');
  let headingOrderValid = true, previous = 0;
  headings.forEach(heading => { const level = Number(heading.tagName[1]); if (previous && level > previous + 1) headingOrderValid = false; previous = level; });
  add('Content', 'heading-order', 'Logical heading order', headingOrderValid, 'medium', `${headings.length} heading(s) inspected.`, 'Do not skip heading levels when introducing subsections.', '<h');
  const wordCount = normalizeText(doc.body?.textContent).split(' ').filter(Boolean).length;
  add('Content', 'substantive-copy', 'Substantive page copy', wordCount >= 120, 'low', `${wordCount} visible words detected.`, 'Add enough original content to answer the visitor’s task without filler.', '<body');
  const genericLinks = links.filter(link => /^(click here|learn more|read more|more)$/i.test(normalizeText(link.textContent)) || !normalizeText(link.textContent));
  add('Content', 'link-text', 'Descriptive links', genericLinks.length === 0, 'medium', `${genericLinks.length} generic or empty link(s).`, 'Use link text that explains the destination.', '<a');
  const internalLinks = links.filter(link => /^\//.test(link.getAttribute('href') || '') || (pageUrl && (link.href || '').startsWith(pageUrl)));
  add('Content', 'internal-links', 'Internal next steps', internalLinks.length >= 1, 'low', `${internalLinks.length} internal link(s).`, 'Provide at least one meaningful internal next action.', '<a');

  const missingAlt = images.filter(image => !image.hasAttribute('alt'));
  add('Accessibility', 'image-alt', 'Image alternatives', missingAlt.length === 0, 'high', `${missingAlt.length} image(s) missing alt attributes out of ${images.length}.`, 'Add meaningful alt text or alt="" for decorative images.', '<img');
  const unlabeled = inputs.filter(input => { if (input.type === 'hidden') return false; const id = input.id; return !(input.getAttribute('aria-label') || input.getAttribute('aria-labelledby') || (id && doc.querySelector(`label[for="${CSS.escape(id)}"]`)) || input.closest('label')); });
  add('Accessibility', 'form-labels', 'Form control names', unlabeled.length === 0, 'high', `${unlabeled.length} unlabeled control(s) out of ${inputs.length}.`, 'Associate each control with a label or accessible name.', '<input');
  const emptyButtons = buttons.filter(button => !normalizeText(button.textContent) && !button.getAttribute('aria-label') && !button.getAttribute('aria-labelledby'));
  add('Accessibility', 'button-names', 'Button names', emptyButtons.length === 0, 'high', `${emptyButtons.length} unnamed button(s).`, 'Give every button visible text or an accessible name.', '<button');
  add('Accessibility', 'landmarks', 'Page landmarks', Boolean(doc.querySelector('main')) && Boolean(doc.querySelector('nav')), 'medium', `main: ${Boolean(doc.querySelector('main'))}; nav: ${Boolean(doc.querySelector('nav'))}.`, 'Use semantic main and navigation landmarks.', '<main');
  add('Accessibility', 'duplicate-ids', 'Unique element IDs', duplicateIds.length === 0, 'medium', duplicateIds.length ? `Duplicates: ${duplicateIds.join(', ')}` : 'No duplicate IDs found.', 'Make every id unique.', 'id=');

  const questionHeadings = headings.filter(heading => /\?$|^(what|how|why|who|when|where|can|does|is|are)\b/i.test(normalizeText(heading.textContent)));
  const directAnswers = questionHeadings.filter(heading => { const next = heading.nextElementSibling; return next && ['P', 'UL', 'OL'].includes(next.tagName) && normalizeText(next.textContent).length >= 40 && normalizeText(next.textContent).length <= 420; });
  add('AEO', 'question-headings', 'Question-led sections', questionHeadings.length >= 1, 'medium', `${questionHeadings.length} question heading(s).`, 'Use real audience questions as headings where appropriate.', '?');
  add('AEO', 'direct-answers', 'Concise direct answers', directAnswers.length >= 1, 'high', `${directAnswers.length} question(s) followed by concise answers.`, 'Place a direct answer immediately after the question heading.', '<p');
  const schemaTypes = jsonLd.flatMap(script => { const parsed = safeJsonParse(script.textContent); const values = parsed.error ? [] : (Array.isArray(parsed.value) ? parsed.value : [parsed.value]); return values.map(value => value?.['@type']).filter(Boolean); });
  add('AEO', 'entity-schema', 'Entity schema', schemaTypes.length > 0, 'high', schemaTypes.length ? `Detected schema types: ${schemaTypes.join(', ')}.` : 'No entity schema type detected.', 'Describe the primary person, organization, product, service, or article.', 'ld+json');
  const byline = /\b(written by|author|by\s+[A-Z][a-z]+)|rel=["']author/i.test(source);
  add('AEO', 'authorship', 'Clear authorship', byline, 'low', byline ? 'Authorship signal detected.' : 'No authorship signal detected.', 'Name the responsible author or organization.', 'author');
  const updated = /\b(updated|last modified|dateModified)\b/i.test(source);
  add('AEO', 'freshness', 'Freshness signal', updated, 'low', updated ? 'Updated or modified date detected.' : 'No freshness signal detected.', 'Show a meaningful updated date and include dateModified where relevant.', 'updated');

  add('Social', 'og-title', 'Open Graph title', Boolean(meta(doc, 'meta[property="og:title"]')), 'medium', meta(doc, 'meta[property="og:title"]') || 'Missing og:title.', 'Add a share-specific Open Graph title.', 'og:title');
  add('Social', 'og-description', 'Open Graph description', Boolean(meta(doc, 'meta[property="og:description"]')), 'medium', meta(doc, 'meta[property="og:description"]') || 'Missing og:description.', 'Add an Open Graph description.', 'og:description');
  add('Social', 'og-image', 'Share image', Boolean(meta(doc, 'meta[property="og:image"]')), 'medium', meta(doc, 'meta[property="og:image"]') || 'Missing og:image.', 'Add an absolute share image URL.', 'og:image');
  add('Social', 'twitter-card', 'Twitter/X card', Boolean(meta(doc, 'meta[name="twitter:card"]')), 'low', meta(doc, 'meta[name="twitter:card"]') || 'Missing twitter:card.', 'Add summary or summary_large_image.', 'twitter:card');

  const categoryScores = {};
  for (const category of Object.keys(weights)) { const checks = findings.filter(item => item.category === category); categoryScores[category] = checks.length ? Math.round((checks.filter(item => item.passed).length / checks.length) * 100) : 0; }
  const overall = Math.round(Object.entries(weights).reduce((sum, [category, weight]) => sum + categoryScores[category] * (weight / 100), 0));
  return { generatedAt: new Date().toISOString(), pageUrl, overall, categoryScores, title, description, findings, counts: { words: wordCount, headings: headings.length, images: images.length, links: links.length } };
}

function safeFixes(source, pageUrl) {
  const doc = new DOMParser().parseFromString(source, 'text/html');
  if (!doc.documentElement.getAttribute('lang')) doc.documentElement.setAttribute('lang', 'en');
  if (!doc.querySelector('meta[charset]')) { const node = doc.createElement('meta'); node.setAttribute('charset', 'utf-8'); doc.head.prepend(node); }
  if (!doc.querySelector('meta[name="viewport"]')) { const node = doc.createElement('meta'); node.name = 'viewport'; node.content = 'width=device-width, initial-scale=1'; doc.head.append(node); }
  if (!doc.querySelector('meta[name="description"]')) { const first = normalizeText(doc.querySelector('main p, article p, body p')?.textContent).slice(0, 160); const node = doc.createElement('meta'); node.name = 'description'; node.content = first || 'Describe this page for search and answer engines.'; doc.head.append(node); }
  if (pageUrl && !doc.querySelector('link[rel="canonical"]')) { const node = doc.createElement('link'); node.rel = 'canonical'; node.href = pageUrl; doc.head.append(node); }
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}

function reportMarkdown(report) {
  const lines = ['# SEO / AEO audit', '', `- URL: ${report.pageUrl || 'Source only'}`, `- Overall score: ${report.overall}/100`, `- Generated: ${report.generatedAt}`, ''];
  Object.entries(report.categoryScores).forEach(([category, score]) => lines.push(`- ${category}: ${score}/100`));
  lines.push('', '## Findings');
  report.findings.forEach(item => lines.push(`### ${item.passed ? 'PASS' : item.severity.toUpperCase()} · ${item.title}`, `- Category: ${item.category}`, `- Line: ${item.line || 'n/a'}`, `- Detail: ${item.detail}`, `- Recommendation: ${item.fix}`, ''));
  return lines.join('\n');
}

export function createSeoAuditor({ stage, toast }) {
  stage.innerHTML = `<section class="tool-product seo-product" style="--tool-bg:#f4f7f7;--tool-text:#17212e;--tool-line:#d4dedf;--tool-accent:#0f766e;--tool-panel:#fff;--tool-muted:#65747b">
    <header class="tool-product__toolbar"><div><h2>SEO / AEO Auditor</h2><p>Audit real HTML source across technical SEO, content, accessibility, answer-engine structure, entities, and social metadata.</p></div><button data-action="sample">Load sample</button><button data-action="audit" class="primary">Run audit</button><button data-action="fix">Apply safe fixes</button><button data-action="save">Save</button><button data-action="load">Load</button><button data-action="export">Export report</button></header>
    <div class="tool-product__workspace seo-product__workspace">
      <section class="tool-panel seo-source-panel"><div class="tool-field-grid"><label>Page URL<input data-url type="url" placeholder="https://example.com/page"></label><label>Result filter<select data-filter><option value="all">All findings</option><option value="fail">Failures only</option><option value="high">High priority</option><option value="pass">Passes only</option></select></label></div><label>HTML source<textarea class="tool-code" data-source spellcheck="false" rows="20"><html><head><title>Home</title></head><body><h1>Welcome</h1><p>We make websites.</p></body></html></textarea></label></section>
      <aside class="tool-panel seo-summary-panel"><div class="seo-score-card"><strong data-overall>--</strong><span>OVERALL</span><div class="tool-progress"><i data-overall-bar></i></div></div><div data-category-scores></div><div class="search-preview"><small>SEARCH PREVIEW</small><b data-preview-title>Home</b><a data-preview-url>example.com</a><p data-preview-copy>No meta description found.</p></div><div class="tool-kpis" data-counts></div></aside>
      <section class="tool-panel seo-findings-panel"><header><h3>PRIORITIZED FINDINGS</h3><span data-result-count>Run an audit.</span></header><div data-results><div class="tool-empty">Paste HTML or load the production-quality sample, then run the audit.</div></div></section>
    </div>
    <footer class="tool-product__statusbar"><span data-status>Ready.</span><span style="margin-left:auto">This browser-only tool audits pasted source; it does not bypass website CORS restrictions.</span></footer>
  </section>`;
  const storage = createStorage('game-testing:seo-auditor:v2');
  let report = null;
  const setStatus = text => { qs(stage, '[data-status]').textContent = text; };
  function renderReport() {
    const source = qs(stage, '[data-source]').value;
    qs(stage, '[data-preview-title]').textContent = source.match(/<title[^>]*>([^<]*)/i)?.[1]?.trim() || 'Missing title';
    qs(stage, '[data-preview-copy]').textContent = source.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1]?.trim() || 'No meta description found.';
    try { qs(stage, '[data-preview-url]').textContent = new URL(qs(stage, '[data-url]').value || 'https://example.com').hostname; } catch { qs(stage, '[data-preview-url]').textContent = 'invalid URL'; }
    if (!report) return;
    qs(stage, '[data-overall]').textContent = report.overall;
    qs(stage, '[data-overall-bar]').style.setProperty('--value', `${report.overall}%`);
    qs(stage, '[data-category-scores]').innerHTML = Object.entries(report.categoryScores).map(([category, score]) => `<div class="seo-category-row"><span>${category}</span><strong>${score}</strong><div class="tool-progress"><i style="--value:${score}%"></i></div></div>`).join('');
    qs(stage, '[data-counts]').innerHTML = Object.entries(report.counts).map(([key, value]) => `<div class="tool-kpi"><span>${key.toUpperCase()}</span><strong>${value}</strong></div>`).join('');
    renderFindings();
  }
  function renderFindings() {
    if (!report) return;
    const filter = qs(stage, '[data-filter]').value;
    const rank = { high: 0, medium: 1, low: 2 };
    const findings = report.findings.filter(item => filter === 'all' || (filter === 'fail' && !item.passed) || (filter === 'pass' && item.passed) || (filter === 'high' && !item.passed && item.severity === 'high')).sort((a, b) => Number(a.passed) - Number(b.passed) || rank[a.severity] - rank[b.severity]);
    qs(stage, '[data-result-count]').textContent = `${findings.length} of ${report.findings.length} findings`;
    qs(stage, '[data-results]').innerHTML = findings.map(item => `<article class="seo-finding-card" data-state="${item.passed ? 'pass' : 'fail'}" data-severity="${item.severity}"><i>${item.passed ? '✓' : '!'}</i><div><span>${escapeHtml(item.category)} · ${item.passed ? 'PASS' : item.severity.toUpperCase()}${item.line ? ` · LINE ${item.line}` : ''}</span><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.detail)}</p><details><summary>How to improve</summary><p>${escapeHtml(item.fix)}</p></details></div></article>`).join('') || '<div class="tool-empty">No findings match this filter.</div>';
  }
  function runAudit() {
    const source = qs(stage, '[data-source]').value.trim();
    if (!source) return toast('Paste HTML source first.');
    const url = qs(stage, '[data-url]').value.trim();
    try { if (url) new URL(url); } catch { return toast('Enter a valid absolute page URL or leave it blank.'); }
    report = auditHtml(source, url); renderReport();
    setStatus(`Audit complete: ${report.overall}/100 with ${report.findings.filter(item => !item.passed).length} improvement opportunities.`);
    toast(`SEO / AEO audit complete: ${report.overall}/100`);
  }
  stage.addEventListener('input', event => { if (event.target.matches('[data-source],[data-url]')) renderReport(); });
  stage.addEventListener('change', event => { if (event.target.matches('[data-filter]')) renderFindings(); });
  stage.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    if (action === 'sample') { qs(stage, '[data-source]').value = sample; qs(stage, '[data-url]').value = 'https://bradleymatera.dev/'; runAudit(); }
    else if (action === 'audit') runAudit();
    else if (action === 'fix') { qs(stage, '[data-source]').value = safeFixes(qs(stage, '[data-source]').value, qs(stage, '[data-url]').value.trim()); runAudit(); toast('Applied safe structural fixes. Review the changed source before publishing.'); }
    else if (action === 'save') { storage.save({ source: qs(stage, '[data-source]').value, url: qs(stage, '[data-url]').value }); setStatus('Audit input saved in this browser.'); toast('Audit input saved'); }
    else if (action === 'load') { const saved = storage.load(); if (!saved) return toast('No saved audit input found.'); qs(stage, '[data-source]').value = saved.source || ''; qs(stage, '[data-url]').value = saved.url || ''; runAudit(); }
    else if (action === 'export') { if (!report) return toast('Run an audit first.'); downloadText('seo-aeo-audit.json', JSON.stringify(report, null, 2)); downloadText('seo-aeo-audit.md', reportMarkdown(report), 'text/markdown'); setStatus('JSON and Markdown reports downloaded.'); toast('Audit report exported'); }
  });
  renderReport();
  const reset = () => { qs(stage, '[data-source]').value = '<html><head><title>Home</title></head><body><h1>Welcome</h1><p>We make websites.</p></body></html>'; qs(stage, '[data-url]').value = ''; report = null; qs(stage, '[data-overall]').textContent = '--'; qs(stage, '[data-category-scores]').innerHTML = ''; qs(stage, '[data-results]').innerHTML = '<div class="tool-empty">Run an audit to generate findings.</div>'; renderReport(); };
  return controllerForDom(stage, reset, null, 'SEO / AEO AUDIT PRODUCT', () => report ? `${report.findings.length} checks · ${report.overall}/100` : 'Ready to audit');
}
