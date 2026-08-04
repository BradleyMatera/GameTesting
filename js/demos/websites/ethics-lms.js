const $ = (root, selector) => root.querySelector(selector);
const $$ = (root, selector) => [...root.querySelectorAll(selector)];

function controller(stage, reset, engine = 'RESPONSIVE WEBSITE') {
  return {
    dispose() { stage.replaceChildren(); },
    reset,
    getStats() {
      return {
        engine,
        fps: 'DOM',
        scene: `${stage.querySelectorAll('img').length} original images · ${stage.querySelectorAll('button').length} controls`,
      };
    },
  };
}

function wirePages(stage, render, initial = 'home') {
  let current = initial;
  const show = page => {
    current = page;
    render(page);
    $$(stage, '[data-page]').forEach(button => button.classList.toggle('active', button.dataset.page === page));
    stage.querySelector('.website-frame')?.scrollTo({ top: 0, behavior: 'smooth' });
  };
  stage.addEventListener('click', event => {
    const target = event.target.closest('[data-page]');
    if (target) show(target.dataset.page);
  });
  show(initial);
  return () => show(initial);
}

export function createEthicsLms({ stage, toast }) {
  const courses = [
    { name: 'Ethical AI Foundations', progress: 68, lessons: 8, color: '#7c3aed' },
    { name: 'Bias and Fairness', progress: 34, lessons: 6, color: '#ec4899' },
    { name: 'Responsible Deployment', progress: 0, lessons: 7, color: '#0ea5e9' },
  ];
  stage.innerHTML = `<div class="website-frame lms-site" style="--site-bg:#f7f5fc;--site-text:#25163e;--site-muted:#776b87;--site-accent:#7c3aed;--site-cta-text:#fff;--site-font:Inter,sans-serif"><nav class="site-nav"><strong class="site-logo">ETHICS ENGINE</strong><button data-page="dashboard">Dashboard</button><button data-page="library">Library</button><button data-page="assignments">Assignments</button><button data-page="certificates">Certificates</button><button class="site-cta">BM</button></nav><main data-site-content></main></div>`;
  let completed = 68;

  const render = page => {
    const content = $(stage, '[data-site-content]');
    if (page === 'dashboard') {
      content.innerHTML = `<section class="lms-dashboard"><aside><img src="./assets/lms-course.svg" alt="Original Ethics Engine LMS illustration"><small>YOUR LEARNING</small><h2>Welcome back, Brad.</h2><p>Continue your assigned ethics curriculum.</p></aside><main><div class="lms-head"><div><small>OVERVIEW</small><h3>Learning dashboard</h3></div><strong data-overall>${completed}% complete</strong></div><div class="lms-course-list">${courses.map((course, index) => `<article><i style="--course:${course.color}">${index + 1}</i><div><strong>${course.name}</strong><small>${course.lessons} lessons</small><progress max="100" value="${index ? course.progress : completed}"></progress></div><button data-course="${index}">${index === 0 ? 'Continue' : 'Open'}</button></article>`).join('')}</div><section class="scenario-card"><small>SCENARIO OF THE WEEK</small><h4>A hiring model consistently ranks applicants from one ZIP code lower.</h4><div><button data-choice="audit">Pause and audit</button><button data-choice="monitor">Deploy and monitor</button><button data-choice="ignore">Ignore the pattern</button></div><p data-feedback>Select the most responsible next action.</p></section><section class="site-section" style="padding:1.5rem 0 2.5rem"><small>NEXT UP</small><h3 style="font-size:1.45rem">Your learning plan</h3><div class="site-grid">${[
        ['Data and proxy variables', '12 min', 'Identify when seemingly neutral features reproduce protected-class patterns.'],
        ['Disparate-impact review', '18 min', 'Compare selection rates, document limitations, and decide when to pause.'],
        ['Human escalation design', '14 min', 'Create a review path that gives people authority, context, and accountability.'],
      ].map((lesson, index) => `<article class="site-card"><small>LESSON ${index + 1}</small><h4>${lesson[0]}</h4><p>${lesson[2]}</p><button data-course="${index}">Open · ${lesson[1]}</button></article>`).join('')}</div><div class="assignment-list" style="margin-top:1rem"><article><span>✓</span><div><strong>Model documentation reviewed</strong><small>Completed July 28</small></div><b>Complete</b><button data-page="assignments">Review</button></article><article><span>2</span><div><strong>Bias incident response</strong><small>Due Friday</small></div><b>In progress</b><button data-page="assignments">Continue</button></article></div></section></main></section>`;
    } else if (page === 'library') {
      content.innerHTML = `<section class="site-section"><small>COURSE LIBRARY</small><h3>Build practical ethical judgment.</h3><div class="lms-library">${courses.concat([
        { name: 'Privacy by Design', progress: 0, lessons: 5, color: '#f59e0b' },
        { name: 'Human Oversight', progress: 0, lessons: 6, color: '#10b981' },
      ]).map((course, index) => `<article><div style="--course:${course.color}"><span>MODULE ${String(index + 1).padStart(2, '0')}</span><b>▶</b></div><h4>${course.name}</h4><p>${course.lessons} lessons · interactive scenarios</p><button data-course="${index}">View course</button></article>`).join('')}</div></section>`;
    } else if (page === 'assignments') {
      content.innerHTML = `<section class="site-section"><small>ASSIGNMENTS</small><h3>Three items need attention.</h3><div class="assignment-list">${[
        ['Model card review', 'Due tomorrow', 'In progress'],
        ['Bias incident response', 'Due Friday', 'Not started'],
        ['Deployment checklist', 'Completed July 28', 'Complete'],
      ].map((assignment, index) => `<article><span>${index === 2 ? '✓' : index + 1}</span><div><strong>${assignment[0]}</strong><small>${assignment[1]}</small></div><b>${assignment[2]}</b><button>${index === 2 ? 'Review' : 'Open'}</button></article>`).join('')}</div></section>`;
    } else {
      content.innerHTML = `<section class="certificate-page"><div class="certificate"><span>ETHICS ENGINE</span><small>CERTIFICATE OF COMPLETION</small><h2>Brad Matera</h2><p>has completed</p><h3>Ethical AI Foundations</h3><footer><b>Issued after final assessment</b><i>68% complete</i></footer></div><aside><h3>Certificate progress</h3><p>Complete the remaining lessons and final scenario assessment to unlock this certificate.</p><progress max="100" value="${completed}"></progress><strong>${completed}%</strong></aside></section>`;
    }
  };

  const resetPages = wirePages(stage, render, 'dashboard');
  stage.addEventListener('click', event => {
    const choice = event.target.closest('[data-choice]');
    if (choice) {
      const correct = choice.dataset.choice === 'audit';
      $(stage, '[data-feedback]').textContent = correct
        ? 'Correct. Pause deployment, inspect data and features, measure disparate impact, and document remediation.'
        : 'This response leaves a known fairness risk unresolved. The safer choice is to pause and audit.';
      $(stage, '[data-feedback]').className = correct ? 'correct' : 'incorrect';
      if (correct) {
        completed = Math.min(100, completed + 8);
        $(stage, '[data-overall]').textContent = `${completed}% complete`;
        toast('Scenario completed');
      }
    }
    const course = event.target.closest('[data-course]');
    if (course) toast('Course lesson opened in demo mode');
  });

  return controller(stage, () => {
    completed = 68;
    resetPages();
  });
}
