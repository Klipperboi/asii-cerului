function pickSectionFromFile(fullText, wantedTitle) {
  const parts = fullText.split(/^\s*===\s*(.+?)\s*===\s*$/m);

  const map = {};
  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i].trim().toLowerCase();
    map[key] = (parts[i + 1] || "").trim();
  }

  return map[wantedTitle.trim().toLowerCase()] || "";
}

function slugify(str) {
  return String(str)
    .trim()
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isAllCapsHeading(s) {
  const t = (s || "").trim();
  if (!t) return false;

  const hasLetter = /[A-ZĂÂÎȘȚa-zăâîșț]/.test(t);
  if (!hasLetter) return false;

  return t === t.toUpperCase();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderSmartText(chosenText, parentId = "") {
    const blocks = chosenText
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/) 
    .map(b => b.trim())
    .filter(Boolean);

  const htmlParts = [];
  let inChronology = false;
  let firstNormalParagraphPlaced = false;

for (const block of blocks) {
  if (isAllCapsHeading(block)) {
    const title = block.trim();
    inChronology = (title === "CRONOLOGIE");

    const id = parentId ? `${parentId}-${slugify(title)}` : slugify(title);
    htmlParts.push(`<p class="subsection" id="${escapeHtml(id)}">${escapeHtml(title)}</p>`);
    continue;
  }

  if (inChronology) {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);

    htmlParts.push(`<div class="timeline">`);

    for (const line of lines) {
      const m = line.match(/^(\d{4})\s*[–-]\s*(.+)$/);

      if (m) {
        const year = m[1];
        const text = m[2];

        htmlParts.push(
          `<div class="timeline-item">` +
            `<span class="timeline-year">${escapeHtml(year)}</span>` +
            `<span class="timeline-text">${escapeHtml(text)}</span>` +
          `</div>`
        );
      } else {
        const cls = !firstNormalParagraphPlaced ? "three" : "";
        if (!firstNormalParagraphPlaced) firstNormalParagraphPlaced = true;

        htmlParts.push(`<p class="${cls}">${escapeHtml(line)}</p>`);
      }
    }

    htmlParts.push(`</div>`);
    continue;
  }

    const cls = !firstNormalParagraphPlaced ? "three" : "";
    if (!firstNormalParagraphPlaced) firstNormalParagraphPlaced = true;

    htmlParts.push(`<p class="${cls}">${escapeHtml(block)}</p>`);
  }

  return htmlParts.join("");
}

async function fillTextBlocks() {
  const blocks = document.querySelectorAll(".text");

  const cache = new Map();

  for (const el of blocks) {
    const src = el.getAttribute("data-src") || "text.txt";
    const wanted = el.getAttribute("data-part") || "";

    if (!cache.has(src)) {
      const res = await fetch(src);
      cache.set(src, await res.text());
    }

    const fileText = cache.get(src);
    const chosenText = pickSectionFromFile(fileText, wanted);

    const parentId = el.getAttribute("data-parent") || "";
    el.innerHTML = renderSmartText(chosenText, parentId);
  }
}

function setActiveNav(id) {
  const anchorEl = document.getElementById(id);

  const mainSectionEl = anchorEl ? anchorEl.closest(".page-section") : null;
  const mainId = mainSectionEl ? mainSectionEl.id : id;

  const navLinks = document.querySelectorAll(".sidenav a");
  navLinks.forEach(link => link.classList.remove("active"));

  const mainLink = document.querySelector(`.sidenav a[href="#${CSS.escape(mainId)}"]`);
  if (mainLink) mainLink.classList.add("active");

  if (id && id !== mainId) {
    const subLink = document.querySelector(`.sidenav .subnav a[href="#${CSS.escape(id)}"]`);
    if (subLink) subLink.classList.add("active");
  }

  document.querySelectorAll(".nav-group[data-group]").forEach(group => {
    const groupId = group.getAttribute("data-group");
    group.classList.toggle("expanded", groupId === mainId);
  });

  localStorage.setItem("lastSectionId", id);
  history.replaceState(null, "", "#" + id);
}

function setupSubsectionSpy() {
  const heads = Array.from(document.querySelectorAll(".subsection[id]"));
  if (!heads.length) return;

  const halfLine = () => window.innerHeight * 0.5;

  const observer = new IntersectionObserver(
    () => {
      const passed = heads
        .map(h => ({ h, top: h.getBoundingClientRect().top }))
        .filter(x => x.top <= halfLine());

      if (!passed.length) return;

      passed.sort((a, b) => b.top - a.top);
      const best = passed[0].h;

      if (best?.id) setActiveNav(best.id);
    },
    {
      root: null,
      rootMargin: "0px 0px -50% 0px",
      threshold: 0
    }
  );

  heads.forEach(h => observer.observe(h));
}
function restoreLastPosition() {
  const hash = (location.hash || "").replace("#", "").trim();
  const savedY = localStorage.getItem("lastScrollY");
  const savedSection = localStorage.getItem("lastSectionId");

  const prevBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = "auto";

  if (hash) {
    const el = document.getElementById(hash);
    if (el) el.scrollIntoView({ block: "start" });
    setActiveNav(hash);
  } else if (savedY !== null) {
    window.scrollTo(0, parseInt(savedY, 10) || 0);
  } else if (savedSection) {
    const el = document.getElementById(savedSection);
    if (el) el.scrollIntoView({ block: "start" });
    setActiveNav(savedSection);
  }

  document.documentElement.style.scrollBehavior = prevBehavior || "";
}

function setupScrollSpy() {
  const sections = Array.from(document.querySelectorAll(".page-section"));
  if (!sections.length) return;

  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting);
    if (!visible.length) return;

    visible.sort((a, b) =>
      Math.abs(a.boundingClientRect.top - window.innerHeight * 0.5) -
      Math.abs(b.boundingClientRect.top - window.innerHeight * 0.5)
    );

    const best = visible[0].target;
    const id = best.getAttribute("id");
    if (id) setActiveNav(id);
  }, {
    root: null,
    rootMargin: "0px 0px -50% 0px",
    threshold: 0
  });

  sections.forEach(section => observer.observe(section));
}

function buildSubnavs() {
  document.querySelectorAll(".subnav[data-for]").forEach(subnav => {
    const parent = subnav.getAttribute("data-for");
    const section = document.getElementById(parent);
    if (!section) return;

    const headings = Array.from(section.querySelectorAll(".subsection[id]"));
    subnav.innerHTML = headings.map(h => {
      const id = h.id;
      const text = h.textContent.trim();
      return `<a href="#${escapeHtml(id)}" data-sub="${escapeHtml(id)}"><span>${escapeHtml(text)}</span></a>`;
    }).join("");
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await fillTextBlocks();
  buildSubnavs();
  restoreLastPosition();
  setupScrollSpy();
  setupSubsectionSpy();
});
