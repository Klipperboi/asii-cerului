function pickSectionFromFile(fullText, wantedTitle) {
  const parts = fullText.split(/^\s*===\s*(.+?)\s*===\s*$/m);

  const map = {};
  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i].trim().toLowerCase();
    map[key] = (parts[i + 1] || "").trim();
  }

  return map[wantedTitle.trim().toLowerCase()] || "";
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

function renderSmartText(chosenText) {
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

    htmlParts.push(`<p class="subsection">${escapeHtml(title)}</p>`);
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

    el.innerHTML = renderSmartText(chosenText);
  }
}

function setActiveNav(id) {
  const navLinks = document.querySelectorAll(".sidenav a");
  navLinks.forEach(link => {
    link.classList.toggle("active", link.getAttribute("href") === "#" + id);
  });

  localStorage.setItem("lastSectionId", id);

  history.replaceState(null, "", "#" + id);
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

  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries.filter(e => e.isIntersecting);
      if (!visible.length) return;

      visible.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      const best = visible[0].target;
      const id = best.getAttribute("id");
      if (id) setActiveNav(id);
    },
    {
      root: null,
      threshold: [0, 0.25, 0.5, 0.75, 1],
      rootMargin: "-35% 0px -55% 0px"
    }
  );

  sections.forEach(section => observer.observe(section));

  let rafPending = false;
  window.addEventListener("scroll", () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      localStorage.setItem("lastScrollY", String(window.scrollY));
      rafPending = false;
    });
  }, { passive: true });

  document.querySelectorAll(".sidenav a").forEach(a => {
    a.addEventListener("click", () => {
      const id = (a.getAttribute("href") || "").replace("#", "");
      if (id) {
        localStorage.setItem("lastSectionId", id);
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  fillTextBlocks().catch(console.error);

  restoreLastPosition();
  setupScrollSpy();
});
