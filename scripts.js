function pickSectionFromFile(fullText, wantedTitle) {
  const parts = fullText.split(/^\s*===\s*(.+?)\s*===\s*$/m);

  // parts pattern:
  // [ before, "INTRODUCERE", "text...", "CENTRUL-ISTORIC", "text...", ...]
  const map = {};
  for (let i = 1; i < parts.length; i += 2) {
    const key = parts[i].trim().toLowerCase();
    map[key] = (parts[i + 1] || "").trim();
  }

  return map[wantedTitle.trim().toLowerCase()] || "";
}

async function fillTextBlocks() {
  const blocks = document.querySelectorAll(".text");

  // fetch each src once (simple cache)
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

    const paragraphs = chosenText
      .replace(/\r\n/g, "\n")
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(Boolean);

    el.innerHTML = paragraphs.map(p => `<p>${p}</p>`).join("");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fillTextBlocks().catch(console.error);
});