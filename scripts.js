const sectionOrder = ["introducere", "context"];
let currentId = null;

const TRANSITION_MS = 320;
const hideTimers = new WeakMap();

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

async function fillTextColumns(el) {
  const src = el.getAttribute("data-src") || "text.txt";
  const wanted = (el.getAttribute("data-part") || "").toLowerCase().trim();

  const res = await fetch(src);
  const fullText = await res.text();
  const sections = {};
  const parts = fullText.split(/^\s*===\s*(.+?)\s*===\s*$/m);

  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i].toLowerCase().replace(/\s+/g, "-").trim();
    sections[key] = (parts[i + 1] || "").trim();
  }

  const chosenText = sections[wanted] || "";

  const blocks = chosenText
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map(b => b.trim())
    .filter(Boolean);

  let firstNormalParagraphPlaced = false;

  const html = blocks.map(block => {
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

    const cls = !firstNormalParagraphPlaced ? "three" : "";
    if (!firstNormalParagraphPlaced) firstNormalParagraphPlaced = true;

    return `<p class="${cls}">${escapeHtml(block)}</p>`;
  }).join("");

  el.innerHTML = html;
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
      if (index < sectionOrder.length - 1) {
        location.hash = "#" + sectionOrder[index + 1];
      }
    };
  });
}

function setActiveBoxFromHash() {
  const id = (window.location.hash || "#introducere").replace("#", "");
  const nextBox = document.getElementById(id);
  if (!nextBox) return;

  window.scrollTo({ top: 0, behavior: "auto" });

  document.querySelectorAll(".sidenav a").forEach((a) => {
    a.classList.toggle("active", a.getAttribute("href") === "#" + id);
  });

  wireFooterArrows(id);

  document.querySelectorAll(".content-box").forEach((box) => {
    box.classList.remove("is-active");
  });

  nextBox.classList.add("is-active");

  nextBox.style.animation = "none";
  void nextBox.offsetHeight;
  nextBox.style.animation = "";
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

document.addEventListener("DOMContentLoaded", async () => {
  await waitForFonts();

  const blocks = document.querySelectorAll(".text-columns");
  await Promise.all([...blocks].map((el) => fillTextColumns(el)));

  const settingsLink = document.getElementById("settingsLink");
  const settingsModal = document.getElementById("settingsModal");

  if (settingsLink && settingsModal) {
    settingsLink.addEventListener("click", (e) => {
      e.preventDefault();
      openModal(settingsModal);
    });

    settingsModal.addEventListener("click", (e) => {
      const t = e.target;
      if (t && t.dataset && t.dataset.close) {
        closeModal(settingsModal);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && settingsModal.classList.contains("is-open")) {
        closeModal(settingsModal);
      }
    });
  }

  document.querySelectorAll(".sidenav a").forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = a.getAttribute("href");

      if (!target || target === "#" || target === "") return;

      const current = window.location.hash || "#introducere";

      if (target === current) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    });
  });

  setActiveBoxFromHash();
  window.addEventListener("hashchange", setActiveBoxFromHash);
});
