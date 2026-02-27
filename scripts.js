const sectionOrder = [
  "introducere",
  "context",
  "cronologie",
  "geneza",
  "inovatie",
  "batalii",
  "romania",
  "avioane",
  "asii",
  "propaganda",
  "mostenire",
  "resurse"
];

const STORAGE_KEY_SCROLL = "asii_scroll_v1";
const STORAGE_KEY_LAST = "asii_last_section_v1";
const STORAGE_KEY_PENDING_NOTE = "asii_pending_note_jump_v1";
const STORAGE_KEY_RETURN_SECTION = "asii_return_section_v1";

let currentId = null;

async function waitForFonts() {
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  document.body.classList.add("fonts-ready");
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugifyKey(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

const textCache = {
  src: null,
  raw: null,
  sections: null,
  notesMap: null
};

function ensureBackButton() {
  let btn = document.getElementById("backFromResurse");
  if (btn) return btn;

  btn = document.createElement("button");
  btn.id = "backFromResurse";
  btn.className = "back-from-resurse";
  btn.type = "button";
  btn.innerHTML = `
    <span class="back-arrow">←</span>
    <span class="back-label">ÎNAPOI</span>
  `;

  btn.addEventListener("click", () => {
    const target =
      localStorage.getItem(STORAGE_KEY_RETURN_SECTION) ||
      localStorage.getItem(STORAGE_KEY_LAST) ||
      "introducere";

    localStorage.removeItem(STORAGE_KEY_RETURN_SECTION);
    location.hash = "#" + target;
  });

  document.body.appendChild(btn);

  alignBackButton();
  window.addEventListener("resize", alignBackButton);

  return btn;
}

function alignBackButton() {
  const btn = document.getElementById("backFromResurse");
  const box = document.querySelector(".content-box.is-active");
  if (!btn || !box) return;

  const rect = box.getBoundingClientRect();

  btn.style.left = rect.left + rect.width / 2 + "px";
}

function setBackButtonVisible(visible) {
  const btn = ensureBackButton();
  btn.classList.toggle("is-visible", !!visible);
}

async function loadTextFile(src = "text.txt") {
  if (textCache.raw && textCache.src === src && textCache.sections) return textCache;

  const res = await fetch(src, { cache: "no-store" });
  const raw = await res.text();

  const parts = raw.split(/^\s*===\s*(.+?)\s*===\s*$/m);
  const sections = {};

  for (let i = 1; i < parts.length; i += 2) {
    const key = slugifyKey(parts[i]);
    sections[key] = (parts[i + 1] || "").trim();
  }

  const notesMap = buildNotesMapFromSection(sections["note"] || "");

  textCache.src = src;
  textCache.raw = raw;
  textCache.sections = sections;
  textCache.notesMap = notesMap;

  return textCache;
}

function pickSectionFromCache(cache, wantedKey) {
  return (cache.sections?.[wantedKey] || "").trim();
}

function buildNotesMapFromSection(noteSectionText) {
  const map = new Map();
  const lines = String(noteSectionText || "")
    .replace(/\r\n/g, "\n")
    .split("\n");

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const m = line.match(/^\[(\d+)\]\s*(.+)$/);
    if (m) map.set(m[1], m[2].trim());
  }

  return map;
}

function cutAtMarkers(text) {
  const cutMarkers = [
    "== piloti ==",
    "--- pilot ---",
    "== modele reprezentative ==",
    "--- aircraft ---",
    "--- timeline ---"
  ];

  const lower = text.toLowerCase();
  let cutAt = -1;

  for (const marker of cutMarkers) {
    const i = lower.indexOf(marker);
    if (i !== -1) cutAt = (cutAt === -1 ? i : Math.min(cutAt, i));
  }

  return cutAt !== -1 ? text.slice(0, cutAt).trim() : text.trim();
}

function renderTextBlocksToHtml(chosenText, { wantedKey, notesMap }) {
  let text = chosenText || "";
  text = cutAtMarkers(text);

  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean);

  let firstNormalParagraphPlaced = false;

  return blocks.map(block => {
    const m = block.match(/^\s*==\s*(.+?)\s*==\s*$/);
    if (m) {
      const subtitle = m[1].trim();
      return `
        <p class="subsection">
          <span class="subsection-text">${escapeHtml(subtitle)}</span>
          <span class="subsection-cross">✠</span>
        </p>
      `;
    }

    const romanMatch = block.match(/^\s*(I|II|III|IV|V)\.\s+(.+)$/);
    if (wantedKey === "bibliografie" && romanMatch) {
      return `<p class="biblio-section">${escapeHtml(block)}</p>`;
    }

    const noteMatch = block.match(/^\s*\[(\d+)\]\s*(.+)$/);
    const biblioMatch = block.match(/^\s*(\d+)\.\s*(.+)$/);

    if (wantedKey === "note" && noteMatch) {
      const n = noteMatch[1];
      const rest = noteMatch[2];
      return `
        <p class="note-item" id="note-${escapeHtml(n)}" data-note-id="${escapeHtml(n)}">
          <span class="note-num">${escapeHtml(n)}.</span>
          <span class="note-text">${escapeHtml(rest)}</span>
        </p>
      `;
    }

    if (wantedKey === "bibliografie" && biblioMatch) {
      const n = biblioMatch[1];
      const rest = biblioMatch[2];
      return `
        <p class="note-item">
          <span class="note-num">${escapeHtml(n)}.</span>
          <span class="note-text">${escapeHtml(rest)}</span>
        </p>
      `;
    }

    const cls = !firstNormalParagraphPlaced ? "three" : "";
    if (!firstNormalParagraphPlaced) firstNormalParagraphPlaced = true;

    let safe = escapeHtml(block);
    safe = safe.replace(/\[\[(\d+)\|([^\]]+?)\]\]/g, (_full, n, label) => {
      const noteText = notesMap.get(String(n)) || "";
      const noteSafe = escapeHtml(noteText).replaceAll("\n", " ");
      return `<span class="note-anchor" data-note-id="${escapeHtml(n)}" data-note="${noteSafe}">${escapeHtml(label)}</span>`;
    });

    return `<p class="${cls}">${safe}</p>`;
  }).join("");
}

async function fillTextColumns(el) {
  const src = el.getAttribute("data-src") || "text.txt";
  const wantedKey = (el.getAttribute("data-part") || "").toLowerCase().trim();

  const cache = await loadTextFile(src);
  const chosenText = pickSectionFromCache(cache, wantedKey);

  el.innerHTML = renderTextBlocksToHtml(chosenText, {
    wantedKey,
    notesMap: cache.notesMap
  });
}

function parsePilotBlocks(sectionText) {
  const idx = sectionText.toLowerCase().indexOf("== piloti ==");
  if (idx === -1) return [];

  const tail = sectionText.slice(idx);
  const chunks = tail
    .split(/^\s*---\s*PILOT\s*---\s*$/mi)
    .map(s => s.replace(/\r\n/g, "\n").trim())
    .filter(Boolean);

  return chunks.map(chunk => {
    const obj = {};
    const lines = chunk.split("\n");

    let currentKey = null;
    let captionLines = [];

    for (const rawLine of lines) {
      const m = rawLine.match(/^([a-z_]+)\s*:\s*(.*)$/i);
      if (m) {
        currentKey = m[1].toLowerCase();
        const value = (m[2] || "");

        if (currentKey === "caption") {
          captionLines = [];
          if (value.trim()) captionLines.push(value.trim());
        } else {
          obj[currentKey] = value.trim();
        }
        continue;
      }
      if (currentKey === "caption") captionLines.push(rawLine);
    }

    if (captionLines.length) obj.caption = captionLines.join("\n").trim();
    return obj;
  }).filter(p => p.name);
}

async function fillPilotCards(el) {
  const src = el.getAttribute("data-src") || "text.txt";
  const wantedKey = (el.getAttribute("data-part") || "").toLowerCase().trim();

  const cache = await loadTextFile(src);
  const sectionText = pickSectionFromCache(cache, wantedKey);

  const pilots = parsePilotBlocks(sectionText);
  if (!pilots.length) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = pilots.map(p => `
    <article class="pilot-card">
      <div class="pilot-left">
        ${p.portrait ? `<img class="pilot-portrait" src="${escapeHtml(p.portrait)}" alt="${escapeHtml(p.name)}">` : ""}
        ${p.plane_img ? `<img class="pilot-plane" src="${escapeHtml(p.plane_img)}" alt="${escapeHtml(p.aircraft || "Aeronave")}">` : ""}
      </div>

      <div class="pilot-right">
        <h3 class="pilot-name">${escapeHtml(p.name)}</h3>
        ${p.nickname ? `<p class="pilot-meta"><span>Poreclă:</span> ${escapeHtml(p.nickname)}</p>` : ""}

        <div class="pilot-stats">
          ${p.country ? `<p><span>Țară:</span> ${escapeHtml(p.country)}</p>` : ""}
          ${p.victories ? `<p><span>Victorii:</span> ${escapeHtml(p.victories)}</p>` : ""}
          ${p.aircraft ? `<p><span>Aeronave:</span> ${escapeHtml(p.aircraft)}</p>` : ""}
          ${p.born ? `<p><span>Născut:</span> ${escapeHtml(p.born)}</p>` : ""}
          ${p.unit ? `<p><span>Escadrilă:</span> ${escapeHtml(p.unit)}</p>` : ""}
          ${p.decorations ? `<p><span>Decorații:</span> ${escapeHtml(p.decorations)}</p>` : ""}
        </div>

        ${p.caption ? `
          <div class="pilot-desc">
            ${p.caption
              .split(/\n\s*\n/)
              .map(par => par.trim())
              .filter(Boolean)
              .map(par => `<p>${escapeHtml(par)}</p>`)
              .join("")}
          </div>
        ` : ""}
      </div>
    </article>
  `).join("");
}

function parseAircraftBlocks(sectionText) {
  const idx = sectionText.toLowerCase().indexOf("== modele reprezentative ==");
  if (idx === -1) return [];

  const tail = sectionText.slice(idx);
  const chunks = tail
    .split(/^\s*---\s*AIRCRAFT\s*---\s*$/mi)
    .map(s => s.replace(/\r\n/g, "\n").trim())
    .filter(Boolean);

  return chunks.map(chunk => {
    const obj = {};
    const lines = chunk.split("\n");

    let currentKey = null;
    let captionLines = [];

    for (const rawLine of lines) {
      const m = rawLine.match(/^([a-z_]+)\s*:\s*(.*)$/i);
      if (m) {
        currentKey = m[1].toLowerCase();
        const value = m[2] || "";

        if (currentKey === "caption") {
          captionLines = [];
          if (value.trim()) captionLines.push(value.trim());
        } else {
          obj[currentKey] = value.trim();
        }
        continue;
      }
      if (currentKey === "caption") captionLines.push(rawLine);
    }

    if (captionLines.length) obj.caption = captionLines.join("\n").trim();
    return obj;
  }).filter(a => a.name);
}

async function fillAircraftCards(el) {
  const src = el.getAttribute("data-src") || "text.txt";
  const wantedKey = (el.getAttribute("data-part") || "").toLowerCase().trim();

  const cache = await loadTextFile(src);
  const sectionText = pickSectionFromCache(cache, wantedKey);

  const aircraft = parseAircraftBlocks(sectionText);
  if (!aircraft.length) {
    el.innerHTML = "";
    return;
  }

  el.innerHTML = aircraft.map(a => `
    <article class="aircraft-card">
      <h3 class="aircraft-name">${escapeHtml(a.name)}</h3>

      <div class="aircraft-row">
        <div class="aircraft-left">
          ${a.image ? `<img class="aircraft-img" src="${escapeHtml(a.image)}" alt="${escapeHtml(a.name)}">` : ""}
        </div>

        <div class="aircraft-right">
          <div class="aircraft-specs">
            ${a.country ? `<p><span>Țară:</span> ${escapeHtml(a.country)}</p>` : ""}
            ${a.year ? `<p><span>An:</span> ${escapeHtml(a.year)}</p>` : ""}
            ${a.role ? `<p><span>Rol:</span> ${escapeHtml(a.role)}</p>` : ""}
            ${a.engine ? `<p><span>Motor:</span> ${escapeHtml(a.engine)}</p>` : ""}
            ${a.armament ? `<p><span>Armament:</span> ${escapeHtml(a.armament)}</p>` : ""}
          </div>
        </div>
      </div>

      ${a.caption ? `
        <div class="aircraft-desc">
          ${a.caption.split(/\n\s*\n/)
            .map(p => p.trim())
            .filter(Boolean)
            .map(p => `<p>${escapeHtml(p)}</p>`)
            .join("")}
        </div>
      ` : ""}
    </article>
  `).join("");
}

function parseTimelineLines(sectionText) {
  const lines = String(sectionText || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  return lines.map(line => {
    let m = line.match(/^\[([^\]]+)\]\s*[–-]\s*(.+)$/);
    if (m) return { label: m[1].trim(), text: m[2].trim() };

    m = line.match(/^(\d{4}(?:[–-]\d{4})?)\s*[–-]\s*(.+)$/);
    if (m) return { label: m[1].trim(), text: m[2].trim() };

    m = line.match(/^(\d+)[.)]\s*(.+)$/);
    if (m) return { label: m[1].trim(), text: m[2].trim() };

    return null;
  }).filter(Boolean);
}

function extractTimelineBlock(sectionText) {
  const lines = String(sectionText || "").replace(/\r\n/g, "\n").split("\n");

  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim().replace(/\s+/g, " ").toUpperCase();
    if (t === "--- TIMELINE ---") {
      start = i + 1;
      break;
    }
  }

  return start === -1 ? "" : lines.slice(start).join("\n").trim();
}

async function fillTimeline(el) {
  const src = el.getAttribute("data-src") || "text.txt";
  const wantedKey = (el.getAttribute("data-part") || "").toLowerCase().trim();

  const cache = await loadTextFile(src);
  const sectionText = pickSectionFromCache(cache, wantedKey);

  const timelineText = extractTimelineBlock(sectionText);
  const items = parseTimelineLines(timelineText);

  el.innerHTML = items.map(it => `
    <div class="timeline-item">
      <div class="timeline-year">${escapeHtml(it.label)}</div>
      <div class="timeline-text">${escapeHtml(it.text)}</div>
    </div>
  `).join("");
}

function wireFooterArrows(activeId) {
  const index = sectionOrder.indexOf(activeId);

  document.querySelectorAll(".content-box").forEach((box) => {
    const prevBtn = box.querySelector(".nav-arrow.prev");
    const nextBtn = box.querySelector(".nav-arrow.next");
    if (!prevBtn || !nextBtn) return;

    prevBtn.disabled = index <= 0;
    nextBtn.disabled = index >= sectionOrder.length - 1;

    prevBtn.onclick = () => {
      if (index > 0) location.hash = "#" + sectionOrder[index - 1];
    };
    nextBtn.onclick = () => {
      if (index < sectionOrder.length - 1) location.hash = "#" + sectionOrder[index + 1];
    };
  });
}

function readScrollStore() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_SCROLL) || "{}") || {};
  } catch {
    return {};
  }
}

function writeScrollStore(obj) {
  try {
    localStorage.setItem(STORAGE_KEY_SCROLL, JSON.stringify(obj || {}));
  } catch {}
}

function saveScrollForSection(sectionId) {
  if (!sectionId) return;
  const box = document.getElementById(sectionId);
  if (!box) return;

  const store = readScrollStore();
  store[sectionId] = box.scrollTop || 0;
  writeScrollStore(store);
}

function restoreScrollForSection(sectionId) {
  const box = document.getElementById(sectionId);
  if (!box) return;

  const store = readScrollStore();
  const y = Number(store[sectionId] || 0);

  requestAnimationFrame(() => {
    box.scrollTop = y;
  });
}

function setActiveBoxFromHash() {
  let id = (window.location.hash || "").replace("#", "").trim();

  if (!id) {
    const last = localStorage.getItem(STORAGE_KEY_LAST);
    id = last && sectionOrder.includes(last) ? last : "introducere";
    history.replaceState(null, "", "#" + id);
  }

  if (!sectionOrder.includes(id)) id = "introducere";

  const nextBox = document.getElementById(id);
  if (!nextBox) return;

  if (currentId && currentId !== id) saveScrollForSection(currentId);

  currentId = id;
  localStorage.setItem(STORAGE_KEY_LAST, id);

  document.querySelectorAll(".sidenav a").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === "#" + id);
  });

  wireFooterArrows(id);

  document.querySelectorAll(".content-box").forEach((box) => box.classList.remove("is-active"));
  nextBox.classList.add("is-active");

  nextBox.style.animation = "none";
  void nextBox.offsetHeight;
  nextBox.style.animation = "";

  window.scrollTo({ top: 0, behavior: "auto" });
  restoreScrollForSection(id);

  if (id === "resurse") {
    const pending = localStorage.getItem(STORAGE_KEY_PENDING_NOTE);
    if (pending) {
      localStorage.removeItem(STORAGE_KEY_PENDING_NOTE);

      requestAnimationFrame(() => {
        const noteEl = document.getElementById(`note-${pending}`);
        if (noteEl) {
          noteEl.scrollIntoView({ behavior: "smooth", block: "center" });
          noteEl.classList.add("note-flash");
          setTimeout(() => noteEl.classList.remove("note-flash"), 900);
        }
      });
    }
  }
  setBackButtonVisible(id === "resurse" && !!localStorage.getItem(STORAGE_KEY_RETURN_SECTION));
}

function setupScrollSaving() {
  const handler = (e) => {
    const box = e.target?.closest?.(".content-box.is-active");
    if (!box) return;
    saveScrollForSection(box.id);
  };

  document.addEventListener("scroll", handler, true);
  window.addEventListener("beforeunload", () => {
    if (currentId) saveScrollForSection(currentId);
  });
}

function openModal(modal) {
  if (!modal) return;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function setupSlideshows() {
  document.querySelectorAll(".slideshow[data-slides]").forEach((root) => {
    const slides = (root.dataset.slides || "")
      .split(";")
      .map(s => s.trim())
      .filter(Boolean)
      .map(entry => {
        const [src, caption] = entry.split("|");
        return { src: (src || "").trim(), caption: (caption || "").trim() };
      });

    if (!slides.length) return;

    slides.forEach(s => { const im = new Image(); im.src = s.src; });

    const img = root.querySelector(".slideshow-img");
    const prevBtn = root.querySelector(".slide-prev");
    const nextBtn = root.querySelector(".slide-next");

    let captionEl = root.nextElementSibling;
    if (!captionEl || captionEl.tagName !== "H3") captionEl = null;

    let index = 0;
    const FADE_MS = 600;
    const AUTO_MS = 8000;
    let autoTimer = null;

    function show(newIndex, { animate = true } = {}) {
      index = (newIndex + slides.length) % slides.length;
      const slide = slides[index];
      if (!img) return;

      if (!animate) {
        img.src = slide.src;
        if (captionEl) captionEl.textContent = slide.caption;
        return;
      }

      img.classList.add("is-fading");
      captionEl?.classList.add("is-fading");

      setTimeout(() => {
        const onLoad = () => {
          img.removeEventListener("load", onLoad);
          img.classList.remove("is-fading");
        };
        img.addEventListener("load", onLoad);

        img.src = slide.src;
        if (captionEl) captionEl.textContent = slide.caption;

        requestAnimationFrame(() => captionEl?.classList.remove("is-fading"));
        if (img.complete) onLoad();
      }, FADE_MS);
    }

    function scheduleNext() {
      clearTimeout(autoTimer);
      autoTimer = setTimeout(() => {
        show(index + 1);
        scheduleNext();
      }, AUTO_MS);
    }

    function stopAuto() {
      clearTimeout(autoTimer);
      autoTimer = null;
    }

    function go(dir) {
      show(index + dir);
      scheduleNext();
    }

    prevBtn?.addEventListener("click", () => go(-1));
    nextBtn?.addEventListener("click", () => go(1));

    root.addEventListener("mouseenter", stopAuto);
    root.addEventListener("mouseleave", scheduleNext);

    show(0, { animate: false });
    scheduleNext();
  });
}

let tooltipEl = null;
let activeAnchor = null;

function ensureTooltip() {
  if (tooltipEl) return tooltipEl;

  const el = document.createElement("div");
  el.className = "note-tooltip";
  el.setAttribute("role", "tooltip");
  el.setAttribute("aria-hidden", "true");
  document.body.appendChild(el);

  tooltipEl = el;
  return el;
}

function positionTooltip(tip, clientX, clientY) {
  const pad = 14;
  const offset = 14;

  tip.style.left = "0px";
  tip.style.top = "0px";

  const rect = tip.getBoundingClientRect();
  let x = clientX + offset;
  let y = clientY + offset;

  x = clamp(x, pad, window.innerWidth - rect.width - pad);
  y = clamp(y, pad, window.innerHeight - rect.height - pad);

  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}

function showTooltip(anchor, clientX, clientY) {
  const txt = (anchor?.dataset?.note || "").trim();
  if (!txt) return;

  const tip = ensureTooltip();
  tip.textContent = txt;
  tip.classList.add("is-open");
  tip.setAttribute("aria-hidden", "false");

  positionTooltip(tip, clientX, clientY);
}

function hideTooltip() {
  if (!tooltipEl) return;
  tooltipEl.classList.remove("is-open");
  tooltipEl.setAttribute("aria-hidden", "true");
  activeAnchor = null;
}

function setupNoteTooltips() {
  document.addEventListener("pointerover", (e) => {
    const a = e.target.closest?.(".note-anchor");
    if (!a) return;
    activeAnchor = a;
    showTooltip(a, e.clientX, e.clientY);
  });

  document.addEventListener("pointermove", (e) => {
    if (!activeAnchor || !tooltipEl) return;
    if (!tooltipEl.classList.contains("is-open")) return;
    positionTooltip(tooltipEl, e.clientX, e.clientY);
  });

  document.addEventListener("pointerout", (e) => {
    if (!activeAnchor) return;
    const leavingAnchor = e.target.closest?.(".note-anchor");
    if (leavingAnchor !== activeAnchor) return;
    hideTooltip();
  });

  document.addEventListener("click", (e) => {
    const a = e.target.closest?.(".note-anchor");
    if (!a) {
      hideTooltip();
      return;
    }

    if (e.ctrlKey || e.metaKey) return;

    e.preventDefault();
    hideTooltip();

    const noteId = a.getAttribute("data-note-id");
    if (!noteId) return;

    localStorage.setItem(STORAGE_KEY_RETURN_SECTION, currentId || "introducere");
    localStorage.setItem(STORAGE_KEY_PENDING_NOTE, noteId);
    location.hash = "#resurse";

    localStorage.setItem(STORAGE_KEY_PENDING_NOTE, noteId);
    location.hash = "#resurse";
  });

  document.addEventListener("scroll", hideTooltip, true);
  window.addEventListener("resize", hideTooltip);
}

function setupSettingsModal() {
  const settingsLink = document.getElementById("settingsLink");
  const settingsModal = document.getElementById("settingsModal");

  if (!settingsLink || !settingsModal) return;

  settingsLink.addEventListener("click", (e) => {
    e.preventDefault();
    openModal(settingsModal);
  });

  settingsModal.addEventListener("click", (e) => {
    const t = e.target;
    if (t && t.dataset && t.dataset.close) closeModal(settingsModal);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && settingsModal.classList.contains("is-open")) {
      closeModal(settingsModal);
    }
  });
}

function setupSidenavClicks() {
  document.querySelectorAll(".sidenav a").forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = a.getAttribute("href");
      if (!target || target === "#" || target === "") return;

      const current = window.location.hash || "";
      if (target === current) {
        e.preventDefault();
        const id = target.replace("#", "");
        const box = document.getElementById(id);
        if (box) box.scrollTop = 0;
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  await waitForFonts();

  const blocks = document.querySelectorAll(".text-columns");
  await Promise.all([...blocks].map((el) => fillTextColumns(el)));

  const pilotBlocks = document.querySelectorAll(".pilot-cards");
  await Promise.all([...pilotBlocks].map((el) => fillPilotCards(el)));

  const aircraftBlocks = document.querySelectorAll(".aircraft-cards");
  await Promise.all([...aircraftBlocks].map((el) => fillAircraftCards(el)));

  const timelineBlocks = document.querySelectorAll(".timeline");
  await Promise.all([...timelineBlocks].map((el) => fillTimeline(el)));

  setupSettingsModal();
  setupSidenavClicks();
  setupSlideshows();
  setupNoteTooltips();
  setupScrollSaving();
  setActiveBoxFromHash();
  window.addEventListener("hashchange", setActiveBoxFromHash);
  ensureBackButton();
  setBackButtonVisible(false);
});