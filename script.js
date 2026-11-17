document.documentElement.classList.remove("no-js");

// Nav: blur on scroll + mobile menu
const nav = document.getElementById("nav");
const toggle = document.getElementById("navToggle");
const toTop = document.getElementById("toTop");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const hero = document.getElementById("inicio");
const heroBg = document.getElementById("heroBg");
const heroContent = document.getElementById("heroContent");
const heroMock = document.getElementById("heroMock");

const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
let lastY = window.scrollY;
let ticking = false;

const update = () => {
  const y = window.scrollY;

  // Header: hide on scroll down, show on scroll up
  toTop.classList.toggle("is-shown", y > window.innerHeight * 0.8);
  const delta = y - lastY;
  if (nav.classList.contains("is-open") || y < 120) nav.classList.remove("is-hidden");
  else if (delta > 4) nav.classList.add("is-hidden");
  else if (delta < -4) nav.classList.remove("is-hidden");
  lastY = y;

  // Hero: background zooms, blurs and fades while the hero scrolls away
  if (!reduceMotion) {
    const p = clamp(y / (hero.offsetHeight * 0.75));
    heroBg.style.transform = `scale(${1 + p * 0.7})`;
    heroBg.style.filter = `blur(${p * 14}px)`;
    heroBg.style.opacity = String(1 - p);
    heroContent.style.transform = `translate3d(0, ${p * -90}px, 0) scale(${1 - p * 0.06})`;
    heroContent.style.opacity = String(clamp(1 - p * 1.6));
    heroMock.style.transform = `translate3d(0, ${p * -40}px, 0) scale(${1 + p * 0.05})`;
  }

  ticking = false;
};

// ---------- Hero beam layout ----------
// The beam must end exactly on the panel's top edge, and the panel's rim
// light must line up with where it lands — so measure instead of guessing.
const mockEl = document.getElementById("mock");
const layoutBeam = () => {
  const beamX = hero.clientWidth * (window.innerWidth < 860 ? 0.82 : 0.58);
  const mockLeft = heroMock.offsetLeft + mockEl.offsetLeft;
  hero.style.setProperty("--beam-x", `${beamX}px`);
  hero.style.setProperty("--beam-h", `${heroMock.offsetTop}px`);
  mockEl.style.setProperty("--hit", `${((beamX - mockLeft) / mockEl.offsetWidth) * 100}%`);
};
layoutBeam();
window.addEventListener("resize", layoutBeam);
document.fonts?.ready.then(layoutBeam);

// ---------- Hero intro ----------
// Split the headline into words so each one can rise in, keeping the glow word styled
const title = document.getElementById("heroTitle");
const mock = document.getElementById("mock");
let wordIndex = 0;
const wrapWords = (text, extraClass = "") =>
  text.split(/(\s+)/).map((part) => {
    if (!part.trim()) return document.createTextNode(part);
    const word = document.createElement("span");
    word.className = "word";
    const inner = document.createElement("span");
    if (extraClass) inner.className = extraClass;
    inner.textContent = part;
    inner.style.setProperty("--d", `${0.45 + wordIndex++ * 0.08}s`);
    word.append(inner);
    return word;
  });
[...title.childNodes].forEach((node) => {
  const parts = node.nodeType === Node.TEXT_NODE
    ? wrapWords(node.textContent)
    : wrapWords(node.textContent, node.className);
  node.replaceWith(...parts);
});
title.setAttribute("aria-label", title.textContent);
title.classList.add("is-split");

// Count up the stats once the panel has landed
const countUp = (el) => {
  const target = parseFloat(el.dataset.count);
  const decimals = Number(el.dataset.decimals || 0);
  const start = performance.now();
  const step = (now) => {
    const t = clamp((now - start) / 1600);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = `${el.dataset.prefix || ""}${(target * eased).toFixed(decimals)}${el.dataset.suffix || ""}`;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};

setTimeout(() => {
  mock.classList.add("is-visible");
  if (!reduceMotion) mock.querySelectorAll("[data-count]").forEach(countUp);
}, reduceMotion ? 0 : 1900);

// ---------- Hero ambient ----------
if (!reduceMotion) {
  // Particles drifting up the beam
  const particles = document.getElementById("heroParticles");
  for (let i = 0; i < 26; i++) {
    const p = document.createElement("i");
    const r = Math.random();
    p.style.setProperty("--x", `${(Math.random() - 0.5) * 260}px`);
    p.style.setProperty("--dx", `${(Math.random() - 0.5) * 120}px`);
    p.style.setProperty("--s", `${1.5 + r * 2.5}px`);
    p.style.setProperty("--t", `${5 + Math.random() * 6}s`);
    p.style.setProperty("--d", `${1.2 + Math.random() * 8}s`);
    particles.append(p);
  }

  // Spotlight follows the cursor; the panel tilts slightly toward it
  if (window.matchMedia("(pointer: fine)").matches) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      hero.style.setProperty("--mx", `${x * 100}%`);
      hero.style.setProperty("--my", `${y * 100}%`);
      hero.classList.add("has-pointer");
      mock.style.setProperty("--ry", `${(x - 0.5) * 2}deg`);
      mock.style.setProperty("--rx", `${(0.5 - y) * 1.5}deg`);
    });
    hero.addEventListener("pointerleave", () => {
      hero.classList.remove("has-pointer");
      mock.style.setProperty("--rx", "0deg");
      mock.style.setProperty("--ry", "0deg");
    });
  }

  // Live numbers in the panel feed
  const latency = document.getElementById("liveLatency");
  const tasks = document.getElementById("liveTasks");
  let taskCount = 1204;
  const tick = (el, value) => {
    el.textContent = value;
    el.classList.remove("is-tick");
    void el.offsetWidth;
    el.classList.add("is-tick");
  };
  setInterval(() => {
    if (document.hidden || window.scrollY > hero.offsetHeight) return;
    taskCount += 1 + Math.floor(Math.random() * 4);
    tick(tasks, taskCount.toLocaleString("pt-BR"));
    if (Math.random() > 0.4) tick(latency, String(32 + Math.floor(Math.random() * 12)));
  }, 1800);
}

update();
window.addEventListener("scroll", () => {
  if (!ticking) { ticking = true; requestAnimationFrame(update); }
}, { passive: true });

const setMenu = (open) => {
  nav.classList.toggle("is-open", open);
  toggle.setAttribute("aria-expanded", String(open));
  toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
};
toggle.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
document.querySelectorAll("#navLinks a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
// Contact choice: WhatsApp or e-mail
const contact = document.getElementById("navContact");
const contactToggle = document.getElementById("contactToggle");
const setContact = (open) => {
  contact.classList.toggle("is-open", open);
  contactToggle.setAttribute("aria-expanded", String(open));
};
contactToggle.addEventListener("click", () => setContact(!contact.classList.contains("is-open")));
document.addEventListener("click", (e) => { if (!contact.contains(e.target)) setContact(false); });

document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  setMenu(false);
  setContact(false);
});

// Animate on scroll: play the enter animation each time an element comes
// into view, fade it out when it leaves (PrimeVue AnimateOnScroll behaviour)
const enter = (el) => {
  el.classList.remove("is-leaving", "is-in");
  void el.offsetWidth; // restart the animation
  el.classList.add("is-entering", "is-visible");
};
const leave = (el) => {
  if (!el.classList.contains("is-entering") && !el.classList.contains("is-in")) return;
  el.classList.remove("is-entering", "is-in", "is-visible");
  el.classList.add("is-leaving");
};

const isShown = (el) => el.classList.contains("is-entering") || el.classList.contains("is-in");

// Enter and leave use separate observers: the enter animation starts the element
// offset (up to ~90px + tilt), and observers see transformed boxes. With a single
// observer an element just entering at the screen edge gets pushed back out,
// "leaves", resets, re-enters — and flickers. Leaving only counts once the element
// is well past the viewport edge.
const enterObserver = new IntersectionObserver(
  (entries) => entries.forEach((entry) => {
    if (entry.isIntersecting && !isShown(entry.target)) enter(entry.target);
  }),
  { threshold: 0.15 }
);
const leaveObserver = new IntersectionObserver(
  (entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting && isShown(entry.target)) leave(entry.target);
  }),
  { rootMargin: "180px 0px 180px 0px", threshold: 0 }
);
const io = { observe: (el) => { enterObserver.observe(el); leaveObserver.observe(el); } };

document.querySelectorAll(".reveal").forEach((el) => {
  const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
  el.style.setProperty("--aos-delay", `${Math.min(siblings.indexOf(el), 5) * 90}ms`);
  // After entering, drop the animation so hover transforms work again
  el.addEventListener("animationend", (e) => {
    if (e.target !== el) return;
    if (el.classList.contains("is-entering")) el.classList.replace("is-entering", "is-in");
    else if (el.classList.contains("is-leaving")) el.classList.remove("is-leaving");
  });
  if (reduceMotion) el.classList.add("is-in", "is-visible");
  else io.observe(el);
});

// Feature cards: 3D tilt + glare following the cursor
if (!reduceMotion && window.matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll(".feature-card").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      if (!card.classList.contains("is-in")) return;
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      card.classList.add("is-tilting");
      card.style.setProperty("--tx", `${(x - 0.5) * 10}deg`);
      card.style.setProperty("--ty", `${(0.5 - y) * 8}deg`);
      card.style.setProperty("--gx", `${x * 100}%`);
      card.style.setProperty("--gy", `${y * 100}%`);
    });
    card.addEventListener("pointerleave", () => {
      card.classList.remove("is-tilting");
      card.style.setProperty("--tx", "0deg");
      card.style.setProperty("--ty", "0deg");
    });
  });
}

// ---------- Portfólio ----------
// Para adicionar um projeto, copie um bloco abaixo e preencha:
//   name: nome do projeto          category: tipo (Site, E-commerce, Sistema...)
//   description: uma frase curta   url: endereço do site (ou "" se não for público)
//   image: print da página em assets/portfolio/ (1440x900, a primeira dobra do site).
//          Sem imagem, aparece uma prévia ilustrada na cor de "color".
const projects = [
  { name: "RestoBI", category: "BI para restaurantes", description: "Faturamento, ticket médio, metas e curva ABC em painéis claros, por unidade e em tempo real.", url: "https://restobi.com.br", image: "assets/portfolio/restobi.webp", color: "#4f8ff7" },
  { name: "Hunter", category: "XML fiscal", description: "Coleta sozinho as NFC-e e NF-e de cada loja da rede e deixa o mês pronto para o contador.", url: "https://hunter.devmais.com", image: "assets/portfolio/hunter.webp", color: "#7fc4b4" },
  { name: "TALIS", category: "IA no WhatsApp", description: "Agente de IA que atende e vende pelo WhatsApp 24 horas e chama a equipe quando precisa.", url: "https://talis.devmais.com", image: "assets/portfolio/talis.webp", color: "#d9c79e" },
  { name: "Opiina", category: "NPS e feedback", description: "Captura o NPS, abre ocorrências e organiza o atendimento numa unidade ou na rede toda.", url: "https://opiina.com", image: "assets/portfolio/opiina.webp", color: "#6b8cff" },
  { name: "Muito Mais", category: "Cashback", description: "Cashback direto no cupom do restaurante, com QR Code e sem cartão, para o cliente voltar.", url: "https://muitomais.app", image: "assets/portfolio/muitomais.webp", color: "#34d399" },
  { name: "SeuQR", category: "QR Code dinâmico", description: "QR Codes dinâmicos: troque o destino sem reimprimir e acompanhe cada scan em tempo real.", url: "https://seuqr.com", image: "assets/portfolio/seuqr.webp", color: "#7aa7ff" },
];

const portfolioTrack = document.getElementById("portfolioTrack");
const portfolioViewport = document.getElementById("portfolioViewport");

const escapeHtml = (str) => str.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[ch]));
const domainOf = (url) => { try { return new URL(url).hostname.replace(/^www./, ""); } catch { return "em breve"; } };

const projectCard = (p, clone) => {
  const shot = p.image
    ? `<img src="${p.image}" alt="Página do projeto ${escapeHtml(p.name)}" loading="lazy">`
    : `<div class="shot-ph" style="--c:${p.color}" aria-hidden="true">
         <div class="shot-ph__nav"><i></i><span></span><span></span><span></span><b></b></div>
         <div class="shot-ph__hero"><span></span><span></span><span class="short"></span><b></b></div>
         <div class="shot-ph__grid"><i></i><i></i><i></i></div>
       </div>`;
  const tag = p.url ? "a" : "div";
  const attrs = p.url ? `href="${p.url}" target="_blank" rel="noopener"` : "";
  return `<li class="project"${clone ? " aria-hidden=\"true\"" : ""}>
    <${tag} class="project__link" ${attrs}${clone ? " tabindex=\"-1\"" : ""}>
      <div class="project__frame">
        <div class="project__bar"><i></i><i></i><i></i><span>${escapeHtml(domainOf(p.url))}</span></div>
        <div class="project__shot">${shot}</div>
      </div>
      <div class="project__meta">
        <span class="project__tag" style="--c:${p.color}">${escapeHtml(p.category)}</span>
        <h3>${escapeHtml(p.name)}</h3>
        <p>${escapeHtml(p.description)}</p>
        ${p.url ? `<span class="project__cta">Visitar site <span aria-hidden="true">→</span></span>` : `<span class="project__cta project__cta--soon">Em breve</span>`}
      </div>
    </${tag}>
  </li>`;
};

// Two copies side by side make the loop seamless: when the first copy has
// scrolled fully out of view, jump back by its width and nobody notices.
portfolioTrack.innerHTML = projects.map((p) => projectCard(p, false)).join("") + projects.map((p) => projectCard(p, true)).join("");

let autoScroll = !reduceMotion;
let pausedUntil = 0;
let hovering = false;

const SPEED = 0.45; // px per frame (~27px/s)
const loopWidth = () => portfolioTrack.scrollWidth / 2;
const pause = (ms = 2500) => { pausedUntil = performance.now() + ms; };

// Browsers round scrollLeft, so sub-pixel steps would be lost: while auto-scrolling,
// keep the exact position in a float. Whenever the user (or a button) is moving it,
// just follow scrollLeft so their scroll is never fought.
let pos = -1;
const tickPortfolio = (now) => {
  const half = loopWidth();
  const sl = portfolioViewport.scrollLeft;
  const box = portfolioViewport.getBoundingClientRect();
  const onScreen = box.bottom > 0 && box.top < window.innerHeight;
  const active = autoScroll && onScreen && !hovering && dragX === null && now > pausedUntil && !document.hidden;
  if (active) {
    if (pos < 0 || Math.abs(sl - pos) > 2) pos = sl;
    pos += SPEED;
  } else {
    pos = sl;
  }
  if (pos >= half) pos -= half;
  else if (pos < 1) pos += half;
  if (Math.round(pos) !== sl) portfolioViewport.scrollLeft = pos;
  requestAnimationFrame(tickPortfolio);
};
requestAnimationFrame(tickPortfolio);

portfolioViewport.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") hovering = true; });
portfolioViewport.addEventListener("pointerleave", () => { hovering = false; });
portfolioViewport.addEventListener("focusin", () => { hovering = true; });
portfolioViewport.addEventListener("focusout", () => { hovering = false; });
["pointerdown", "wheel", "touchstart"].forEach((type) =>
  portfolioViewport.addEventListener(type, () => pause(3000), { passive: true }));

// Drag to scroll with the mouse
let dragX = null;
let dragStart = 0;
let dragged = false;
portfolioViewport.addEventListener("pointerdown", (e) => {
  if (e.pointerType !== "mouse") return;
  dragX = e.clientX; dragStart = portfolioViewport.scrollLeft; dragged = false;
});
window.addEventListener("pointermove", (e) => {
  if (dragX === null) return;
  const dx = e.clientX - dragX;
  if (Math.abs(dx) > 5) { dragged = true; portfolioViewport.classList.add("is-dragging"); }
  portfolioViewport.scrollLeft = dragStart - dx;
});
window.addEventListener("pointerup", () => { dragX = null; portfolioViewport.classList.remove("is-dragging"); });
portfolioViewport.addEventListener("click", (e) => { if (dragged) { e.preventDefault(); dragged = false; } }, true);

const step = (dir) => {
  const card = portfolioTrack.querySelector(".project");
  const gap = parseFloat(getComputedStyle(portfolioTrack).columnGap) || 0;
  pause(4000);
  portfolioViewport.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: reduceMotion ? "auto" : "smooth" });
};
document.getElementById("portfolioPrev").addEventListener("click", () => step(-1));
document.getElementById("portfolioNext").addEventListener("click", () => step(1));
portfolioViewport.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
  if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
});

// ---------- Processo: timeline lights up as you scroll ----------
const timeline = document.getElementById("timeline");
const tlSteps = [...timeline.querySelectorAll(".tl-step")];
const processCurrent = document.getElementById("processCurrent");
const processLabel = document.getElementById("processLabel");
const processBar = document.getElementById("processBar");
let tlTicking = false;

const updateTimeline = () => {
  tlTicking = false;
  // The "reading line" sits a bit above the middle of the screen
  const line = window.innerHeight * 0.45;
  const box = timeline.getBoundingClientRect();
  const p = clamp((line - box.top - 28) / (box.height - 56));
  timeline.style.setProperty("--p", p.toFixed(4));
  processBar.parentElement.style.setProperty("--p", p.toFixed(4));

  let current = 0;
  tlSteps.forEach((step, i) => {
    const node = step.querySelector(".tl-step__node").getBoundingClientRect();
    const reached = node.top + node.height / 2 <= line;
    step.classList.toggle("is-done", reached);
    if (reached) current = i;
  });
  tlSteps.forEach((step, i) => step.classList.toggle("is-current", i === current));
  processCurrent.textContent = tlSteps[current].dataset.step;
  processLabel.textContent = tlSteps[current].querySelector("h3").textContent;
};
updateTimeline();
window.addEventListener("scroll", () => {
  if (!tlTicking) { tlTicking = true; requestAnimationFrame(updateTimeline); }
}, { passive: true });
window.addEventListener("resize", updateTimeline);

// FAQ: smooth open/close on <details>
document.querySelectorAll(".faq__item").forEach((item) => {
  const summary = item.querySelector("summary");
  summary.addEventListener("click", (e) => {
    e.preventDefault();
    if (item.classList.contains("is-open")) {
      item.classList.remove("is-open");
      setTimeout(() => { if (!item.classList.contains("is-open")) item.open = false; }, 450);
    } else {
      item.open = true;
      requestAnimationFrame(() => item.classList.add("is-open"));
    }
  });
});

document.getElementById("year").textContent = new Date().getFullYear();
