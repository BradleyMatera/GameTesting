const SHOWCASES = {
  "matera-digital": {
    title: "Matera Digital",
    type: "agency",
    accent: "#71e5ff",
    eyebrow: "VETERAN-OWNED DIGITAL SYSTEMS",
    headline: "Websites and software that finish the job.",
    copy: "A premium service-business concept built around practical engineering, direct communication, and systems that remain understandable after launch.",
  },
  "fairway-store": {
    title: "Bradley's Fairway",
    type: "store",
    accent: "#d8ff72",
    eyebrow: "MODERN GOLF GOODS",
    headline: "Built for the next round.",
    copy: "A high-conversion golf storefront with editorial merchandising, fast product discovery, and realistic cart interactions.",
  },
  "ethics-lms": {
    title: "Ethics Engine LMS",
    type: "lms",
    accent: "#b68cff",
    eyebrow: "ENTERPRISE LEARNING SYSTEM",
    headline: "Practice judgment before it matters.",
    copy: "A complete learning experience with courses, scenarios, progress, quizzes, and an instructor-facing learner overview.",
  },
  "construction-erp": {
    title: "Construction ERP",
    type: "erp",
    accent: "#ff9a62",
    eyebrow: "FIELD + FINANCE OPERATIONS",
    headline: "One operational picture.",
    copy: "A realistic construction operations interface connecting jobs, crews, equipment, costs, field reports, and support work.",
  },
  "recruiter-portfolio": {
    title: "Interactive Recruiter Portfolio",
    type: "portfolio",
    accent: "#88f5a7",
    eyebrow: "BRAD MATERA / VERIFIED EXPERIENCE",
    headline: "Explore the evidence, not just the résumé.",
    copy: "A recruiter-first portfolio concept that organizes projects, cloud work, certifications, and technical proof around the questions hiring teams actually ask.",
  },
};

const PRODUCTS = [
  { name: "Tour Issue Ball Marker", category: "Accessories", price: 14.95, icon: "◎" },
  { name: "Performance Rope Hat", category: "Headwear", price: 32, icon: "⌁" },
  { name: "Sunday Carry Bag", category: "Bags", price: 189, icon: "▱" },
  { name: "Range Finder Sleeve", category: "Accessories", price: 28, icon: "◇" },
  { name: "Players Towel", category: "Gear", price: 24, icon: "≋" },
  { name: "Alignment Stick Cover", category: "Gear", price: 39, icon: "╱" },
];

const PORTFOLIO_ITEMS = [
  { group: "Cloud", title: "AWS Support Engineering", detail: "Cloud support internship, AWS architecture, deployment, and troubleshooting labs.", tags: ["AWS", "Lambda", "DynamoDB"] },
  { group: "Agents", title: "ProjectHub / Scout", detail: "Grounded recruiter assistant with multi-provider routing, verification, and analytics.", tags: ["LLMs", "RAG", "Observability"] },
  { group: "Systems", title: "Voice Ops Platform", detail: "Visible agent operations, voice routing, executive controls, quotas, and truthful status handling.", tags: ["Node", "APIs", "Agents"] },
  { group: "Web", title: "Ethics Engine Enterprise", detail: "Enterprise learning and ethics platform work across modern React and Next.js interfaces.", tags: ["React", "Next.js", "UX"] },
  { group: "Commerce", title: "Bradley's Fairway", detail: "Headless storefront operations, catalog rules, Shopify integrations, and conversion design.", tags: ["Shopify", "Cloudflare", "SEO"] },
  { group: "Credentials", title: "AWS Certifications", detail: "AWS Solutions Architect Associate and AWS Certified AI Practitioner.", tags: ["SAA-C03", "AI Practitioner"] },
];

function agencyTemplate(config) {
  return `
    <div class="site-window agency-site">
      <nav class="mock-nav"><strong>MD<span>.</span></strong><div><a href="#agency-work">Work</a><a href="#agency-services">Services</a><a href="#agency-process">Process</a></div><button data-site-action="consult">Start a project</button></nav>
      <section class="agency-hero">
        <div><p>${config.eyebrow}</p><h2>${config.headline}</h2><span>${config.copy}</span><div class="hero-actions"><button data-site-action="consult">Discuss your project</button><button data-scroll="agency-work">See selected work</button></div></div>
        <aside><span>01 / APPROACH</span><strong>Direct answers.<br>Visible progress.<br>Verified delivery.</strong><small>Web engineering • cloud systems • automation • interactive experiences</small></aside>
      </section>
      <section id="agency-services" class="agency-services">
        <article><b>01</b><h3>Conversion websites</h3><p>Complete marketing sites designed around what visitors need to understand and do next.</p></article>
        <article><b>02</b><h3>Operational tools</h3><p>Dashboards and workflows that replace spreadsheets, repeated checking, and unclear handoffs.</p></article>
        <article><b>03</b><h3>Interactive systems</h3><p>3D, simulations, and product experiences that make complicated technology understandable.</p></article>
      </section>
      <section id="agency-work" class="agency-work"><div><p>SELECTED SYSTEM</p><h3>ProjectHub</h3><span>A grounded AI assistant that exposes routing, provider health, evidence, and answer quality.</span></div><div class="agency-orbit"><i></i><i></i><i></i><strong>PH</strong></div></section>
      <section id="agency-process" class="agency-process"><span>DISCOVER</span><i></i><span>DESIGN</span><i></i><span>BUILD</span><i></i><span>VERIFY</span></section>
    </div>
  `;
}

function storeTemplate(config) {
  return `
    <div class="site-window store-site">
      <div class="store-promo">FREE SHIPPING ON ORDERS OVER $75 <span>•</span> BUILT FOR GOLFERS WHO ACTUALLY PLAY</div>
      <nav class="mock-nav store-nav"><strong>BRADLEY'S <em>FAIRWAY</em></strong><div><button data-filter="All" class="active">Shop all</button><button data-filter="Accessories">Accessories</button><button data-filter="Gear">Gear</button><button data-filter="Headwear">Headwear</button></div><button class="cart-button" data-site-action="cart">Bag <span data-cart-count>0</span></button></nav>
      <section class="store-hero"><div><p>${config.eyebrow}</p><h2>${config.headline}</h2><span>${config.copy}</span><button data-scroll="product-grid">Shop the collection</button></div><div class="golf-visual"><span class="golf-sun"></span><span class="golf-flag">⚑</span><span class="golf-ball"></span></div></section>
      <section class="store-heading"><div><p>CURATED EQUIPMENT</p><h3>Course-ready essentials</h3></div><span data-product-result>6 products</span></section>
      <section id="product-grid" class="product-grid">${PRODUCTS.map((product, index) => `<article data-product-category="${product.category}"><div class="product-art"><span>${product.icon}</span><small>BF / ${String(index + 1).padStart(2, "0")}</small></div><p>${product.category}</p><h4>${product.name}</h4><div><strong>$${product.price.toFixed(2)}</strong><button data-add-product="${index}" aria-label="Add ${product.name} to bag">+</button></div></article>`).join("")}</section>
      <aside class="cart-drawer" aria-hidden="true"><div><p>YOUR BAG</p><button data-site-action="cart">×</button></div><ol data-cart-items></ol><footer><span>Estimated total</span><strong data-cart-total>$0.00</strong><button>Continue to checkout</button><small>Demo checkout. No payment is collected.</small></footer></aside>
    </div>
  `;
}

function lmsTemplate(config) {
  const lessons = ["Recognizing ethical pressure", "Stakeholder mapping", "Conflict of interest", "Escalation and reporting", "Scenario assessment"];
  return `
    <div class="site-window lms-site">
      <aside class="lms-sidebar"><strong>ETHICS<span>ENGINE</span></strong><nav><button class="active">My learning</button><button>Course library</button><button>Assignments</button><button>Certificates</button></nav><div><span>BRAD MATERA</span><small>Learner account</small></div></aside>
      <main class="lms-main"><header><div><p>${config.eyebrow}</p><h2>${config.headline}</h2></div><button data-site-action="lms-view">Instructor view</button></header>
      <section class="course-overview"><div><span>COURSE 01</span><h3>Applied Ethics for Technical Teams</h3><p>${config.copy}</p><div class="course-progress"><i><b data-course-bar></b></i><span><strong data-course-percent>20%</strong> complete</span></div></div><div class="course-ring"><strong data-course-score>1/5</strong><span>LESSONS</span></div></section>
      <section class="lesson-layout"><ol class="lesson-list">${lessons.map((lesson, index) => `<li class="${index === 0 ? "complete" : ""}"><button data-lesson="${index}"><span>${index < 1 ? "✓" : String(index + 1).padStart(2, "0")}</span><strong>${lesson}</strong><small>${index < 1 ? "Complete" : "8 min"}</small></button></li>`).join("")}</ol><article class="scenario-card"><p>DECISION PRACTICE</p><h3>A project lead asks you to hide a known accessibility issue until after launch.</h3><div><button data-answer="bad">Ship now and quietly fix it later</button><button data-answer="good">Document the risk and require an explicit decision</button><button data-answer="bad">Remove the affected feature without telling anyone</button></div><output data-scenario-output>Select the strongest response.</output></article></section>
      </main>
      <section class="instructor-panel" hidden><header><div><p>INSTRUCTOR VIEW</p><h3>Learner overview</h3></div><button data-site-action="lms-view">Return to course</button></header><div class="instructor-metrics"><article><span>ACTIVE LEARNERS</span><strong>184</strong></article><article><span>COMPLETION</span><strong>78%</strong></article><article><span>AVG SCORE</span><strong>91%</strong></article></div><div class="learner-table"><b>Name</b><b>Progress</b><b>Risk</b><span>Brad Matera</span><span>20%</span><em>On track</em><span>Jordan Lee</span><span>80%</span><em>On track</em><span>Alex Rivera</span><span>40%</span><em class="warn">Needs review</em></div></section>
    </div>
  `;
}

function erpTemplate(config) {
  const jobs = [
    ["IL-2407", "North Ridge Mechanical", "Freeport, IL", "$428,930", "72%", "On track"],
    ["WI-1842", "Riverfront Retrofit", "Beloit, WI", "$216,500", "46%", "Watch"],
    ["IL-2511", "Municipal Service Yard", "Rockford, IL", "$692,140", "18%", "On track"],
    ["WI-1908", "Distribution Expansion", "Janesville, WI", "$1,208,400", "89%", "At risk"],
  ];
  return `
    <div class="site-window erp-site">
      <aside class="erp-sidebar"><strong>FIELD<span>CORE</span></strong><nav>${["Overview", "Jobs", "Field", "Equipment", "Financials", "Support"].map((item, index) => `<button class="${index === 0 ? "active" : ""}" data-erp-tab="${item}"><i>${["⌂", "▤", "◇", "▱", "$", "?"][index]}</i>${item}</button>`).join("")}</nav><div><span>BM</span><p>Brad Matera<small>ERP Support</small></p></div></aside>
      <main class="erp-main"><header><div><p>${config.eyebrow}</p><h2 data-erp-title>Operations overview</h2></div><button data-site-action="new-ticket">+ New support ticket</button></header>
      <section class="erp-metrics"><article><span>ACTIVE JOBS</span><strong>24</strong><small>3 need attention</small></article><article><span>BACKLOG</span><strong>$8.4M</strong><small>+6.2% this quarter</small></article><article><span>FIELD REPORTS</span><strong>18/21</strong><small>3 outstanding</small></article><article><span>OPEN TICKETS</span><strong>7</strong><small>2 high priority</small></article></section>
      <section class="erp-content"><div class="erp-table"><header><h3>Active jobs</h3><button>Export</button></header><div class="erp-grid"><b>Job</b><b>Project</b><b>Location</b><b>Contract</b><b>Progress</b><b>Status</b>${jobs.map((job) => job.map((value, index) => `<span class="${index === 5 ? value.toLowerCase().replace(" ", "-") : ""}">${value}</span>`).join("")).join("")}</div></div><aside class="erp-activity"><header><h3>Support queue</h3><span>LIVE</span></header><article><b>HIGH</b><p>Vista payroll export timing out<small>Reported 18 min ago</small></p></article><article><b>MED</b><p>Field user cannot sync daily log<small>Reported 42 min ago</small></p></article><article><b>LOW</b><p>New equipment type request<small>Reported 1 hr ago</small></p></article></aside></section>
      </main>
      <dialog class="ticket-dialog"><form method="dialog"><header><h3>Create support ticket</h3><button value="cancel">×</button></header><label>Issue summary<input value="Field user cannot sync daily log"></label><label>Priority<select><option>Medium</option><option>High</option><option>Low</option></select></label><label>Details<textarea>Sync remains queued after reconnecting to Wi-Fi.</textarea></label><button value="submit">Create simulated ticket</button></form></dialog>
    </div>
  `;
}

function portfolioTemplate(config) {
  const groups = ["All", ...new Set(PORTFOLIO_ITEMS.map((item) => item.group))];
  return `
    <div class="site-window portfolio-site">
      <nav class="mock-nav portfolio-nav"><strong>BRAD<span>.</span></strong><div>${groups.map((group, index) => `<button data-portfolio-filter="${group}" class="${index === 0 ? "active" : ""}">${group}</button>`).join("")}</div><a href="https://bradleymatera.dev/recruiter/" target="_blank" rel="noreferrer">Recruiter page ↗</a></nav>
      <section class="portfolio-hero"><div><p>${config.eyebrow}</p><h2>${config.headline}</h2><span>${config.copy}</span><div><strong>FULL-STACK SOFTWARE ENGINEER</strong><small>Davis, Illinois • Central Time</small></div></div><aside><span>AVAILABLE FOR</span><strong>Cloud support<br>Infrastructure<br>Full-stack systems</strong><small>AWS certified • Veteran • B.S. Web Development</small></aside></section>
      <section class="proof-heading"><div><p>FILTERABLE PROOF</p><h3>Selected systems and experience</h3></div><span data-portfolio-count>${PORTFOLIO_ITEMS.length} records</span></section>
      <section class="proof-grid">${PORTFOLIO_ITEMS.map((item, index) => `<article data-portfolio-group="${item.group}"><div><span>${String(index + 1).padStart(2, "0")}</span><b>${item.group}</b></div><h4>${item.title}</h4><p>${item.detail}</p><footer>${item.tags.map((tag) => `<em>${tag}</em>`).join("")}</footer></article>`).join("")}</section>
    </div>
  `;
}

function getTemplate(config) {
  if (config.type === "agency") return agencyTemplate(config);
  if (config.type === "store") return storeTemplate(config);
  if (config.type === "lms") return lmsTemplate(config);
  if (config.type === "erp") return erpTemplate(config);
  return portfolioTemplate(config);
}

function wireScroll(stage) {
  stage.querySelectorAll("[data-scroll]").forEach((button) => {
    button.addEventListener("click", () => stage.querySelector(`#${button.dataset.scroll}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  });
}

function wireStore(stage) {
  const cart = [];
  const drawer = stage.querySelector(".cart-drawer");
  const renderCart = () => {
    stage.querySelector("[data-cart-count]").textContent = cart.length;
    stage.querySelector("[data-cart-items]").innerHTML = cart.length ? cart.map((product) => `<li><span>${product.icon}</span><p>${product.name}<small>${product.category}</small></p><strong>$${product.price.toFixed(2)}</strong></li>`).join("") : "<li class='empty-cart'>Your bag is empty.</li>";
    stage.querySelector("[data-cart-total]").textContent = `$${cart.reduce((sum, product) => sum + product.price, 0).toFixed(2)}`;
  };
  stage.querySelectorAll("[data-add-product]").forEach((button) => button.addEventListener("click", () => {
    cart.push(PRODUCTS[Number(button.dataset.addProduct)]);
    button.textContent = "✓";
    setTimeout(() => { button.textContent = "+"; }, 700);
    renderCart();
  }));
  stage.querySelectorAll('[data-site-action="cart"]').forEach((button) => button.addEventListener("click", () => {
    const open = drawer.getAttribute("aria-hidden") === "false";
    drawer.setAttribute("aria-hidden", String(open));
  }));
  stage.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => {
    stage.querySelectorAll("[data-filter]").forEach((node) => node.classList.toggle("active", node === button));
    const category = button.dataset.filter;
    let visible = 0;
    stage.querySelectorAll("[data-product-category]").forEach((card) => {
      const show = category === "All" || card.dataset.productCategory === category;
      card.hidden = !show;
      if (show) visible += 1;
    });
    stage.querySelector("[data-product-result]").textContent = `${visible} product${visible === 1 ? "" : "s"}`;
  }));
  renderCart();
}

function wireLms(stage) {
  let completed = 1;
  const update = () => {
    const percent = completed * 20;
    stage.querySelector("[data-course-percent]").textContent = `${percent}%`;
    stage.querySelector("[data-course-score]").textContent = `${completed}/5`;
    stage.querySelector("[data-course-bar]").style.width = `${percent}%`;
  };
  stage.querySelectorAll("[data-lesson]").forEach((button) => button.addEventListener("click", () => {
    const item = button.closest("li");
    if (!item.classList.contains("complete")) completed += 1;
    item.classList.add("complete");
    button.querySelector("span").textContent = "✓";
    button.querySelector("small").textContent = "Complete";
    update();
  }));
  stage.querySelectorAll("[data-answer]").forEach((button) => button.addEventListener("click", () => {
    const good = button.dataset.answer === "good";
    stage.querySelector("[data-scenario-output]").textContent = good ? "Strong response: the risk becomes visible and an accountable decision is required." : "Weak response: this hides or transfers the risk instead of resolving it.";
    stage.querySelector("[data-scenario-output]").className = good ? "good" : "bad";
  }));
  stage.querySelectorAll('[data-site-action="lms-view"]').forEach((button) => button.addEventListener("click", () => {
    stage.querySelector(".lms-main").hidden = !stage.querySelector(".lms-main").hidden;
    stage.querySelector(".instructor-panel").hidden = !stage.querySelector(".instructor-panel").hidden;
  }));
  update();
}

function wireErp(stage) {
  stage.querySelectorAll("[data-erp-tab]").forEach((button) => button.addEventListener("click", () => {
    stage.querySelectorAll("[data-erp-tab]").forEach((node) => node.classList.toggle("active", node === button));
    stage.querySelector("[data-erp-title]").textContent = `${button.dataset.erpTab} overview`;
  }));
  const dialog = stage.querySelector(".ticket-dialog");
  stage.querySelector('[data-site-action="new-ticket"]').addEventListener("click", () => dialog.showModal());
  dialog.addEventListener("close", () => {
    if (dialog.returnValue === "submit") stage.querySelector(".erp-activity").insertAdjacentHTML("afterbegin", "<article class='new-ticket'><b>MED</b><p>Field sync issue<small>Created just now</small></p></article>");
  });
}

function wirePortfolio(stage) {
  stage.querySelectorAll("[data-portfolio-filter]").forEach((button) => button.addEventListener("click", () => {
    stage.querySelectorAll("[data-portfolio-filter]").forEach((node) => node.classList.toggle("active", node === button));
    const group = button.dataset.portfolioFilter;
    let visible = 0;
    stage.querySelectorAll("[data-portfolio-group]").forEach((card) => {
      const show = group === "All" || card.dataset.portfolioGroup === group;
      card.hidden = !show;
      if (show) visible += 1;
    });
    stage.querySelector("[data-portfolio-count]").textContent = `${visible} record${visible === 1 ? "" : "s"}`;
  }));
}

export function createWebsiteShowcase({ stage, demo, onSelect, onReady }) {
  const config = SHOWCASES[demo.id];
  stage.innerHTML = `<section class="demo-surface website-surface" style="--demo-accent:${config.accent}"><div class="browser-chrome"><div><i></i><i></i><i></i></div><span>https://demo.bradleymatera.dev/${demo.id}</span><b>LIVE FRONTEND</b></div><div class="website-viewport">${getTemplate(config)}</div></section>`;
  wireScroll(stage);
  if (config.type === "store") wireStore(stage);
  if (config.type === "lms") wireLms(stage);
  if (config.type === "erp") wireErp(stage);
  if (config.type === "portfolio") wirePortfolio(stage);
  stage.querySelectorAll('[data-site-action="consult"]').forEach((button) => button.addEventListener("click", () => onSelect?.({ index: "CONTACT FLOW", title: "Project intake", kicker: "CLEAR NEXT ACTION", copy: "A production version would connect this conversion point to a qualified lead form, scheduling route, or direct phone workflow. This demo keeps the interaction local and does not submit personal data.", tags: ["Conversion", "Accessibility", "Privacy"] })));
  onReady?.({ engineType: "HTML/CSS" });
  return {
    dispose() { stage.replaceChildren(); },
    getStats() { return { fps: "60", meshes: stage.querySelectorAll("section, article, button").length }; },
    setGuidedOrbit() {},
    resetCamera() { stage.querySelector(".website-viewport")?.scrollTo({ top: 0, behavior: "smooth" }); },
  };
}
