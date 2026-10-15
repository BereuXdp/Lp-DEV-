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
