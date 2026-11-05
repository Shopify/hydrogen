// Storefront E2E report client. Inlined into the generated HTML as a classic script.
// Progressive enhancement only: the page is complete without it. No network access.
// It never writes HTML. Dynamic text goes through textContent and attributes only.
"use strict";

const root = document.documentElement;
root.classList.add("js");

// Mark images whose local file is missing. Capture phase: `error` does not bubble.
document.addEventListener(
  "error",
  (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement)) return;
    const frame = target.closest(".shot-frame");
    if (frame !== null) frame.classList.add("is-missing");
    const stage = target.closest(".lightbox-stage");
    if (stage !== null) stage.dataset.missing = "true";
  },
  true,
);

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isNarrow = () => window.matchMedia("(max-width: 900px)").matches;

const tabs = () => Array.from(document.querySelectorAll("[data-run-tab]"));
const panels = () => Array.from(document.querySelectorAll("[data-run-panel]"));

function panelFor(index) {
  return panels().find((panel) => panel.dataset.runPanel === index);
}

function syncRovingTabindex() {
  for (const list of document.querySelectorAll('[role="tablist"]')) {
    const own = Array.from(list.querySelectorAll("[data-run-tab]"));
    const selected = own.find((tab) => tab.getAttribute("aria-selected") === "true");
    const focusable = selected ?? own[0];
    for (const tab of own) tab.tabIndex = tab === focusable ? 0 : -1;
  }
}

function updateAttempts(index) {
  for (const chip of document.querySelectorAll("[data-run-link]")) {
    if (chip.dataset.runLink === index) chip.setAttribute("aria-current", "true");
    else chip.removeAttribute("aria-current");
  }
}

function openEarlierListIfNeeded(tab) {
  const details = tab.closest("details");
  if (details !== null) details.open = true;
}

function select(index, options) {
  const panel = panelFor(index);
  if (panel === undefined) return false;
  for (const tab of tabs()) {
    const active = tab.dataset.runTab === index;
    tab.setAttribute("aria-selected", active ? "true" : "false");
    if (active) openEarlierListIfNeeded(tab);
  }
  for (const other of panels()) {
    const active = other === panel;
    other.classList.toggle("is-active", active);
    other.hidden = !active;
  }
  syncRovingTabindex();
  updateAttempts(index);
  if (options.remember !== false) rememberSelection(index);
  if (options.focusHeading) focusHeading(panel);
  if (options.reveal && isNarrow()) {
    panel.scrollIntoView({ behavior: reduceMotion() ? "auto" : "smooth", block: "start" });
  }
  return true;
}

function focusHeading(panel) {
  const heading = panel.querySelector("[data-run-heading]");
  if (heading instanceof HTMLElement) heading.focus({ preventScroll: true });
}

function rememberSelection(index) {
  try {
    history.replaceState(null, "", "#run-" + index);
  } catch {
    // Some file:// contexts block history updates. The selection still works.
  }
}

function initialIndex() {
  const match = /^#run-(\d+)$/.exec(location.hash);
  if (match !== null && panelFor(match[1]) !== undefined) return match[1];
  const active = document.querySelector("[data-run-panel].is-active");
  return active instanceof HTMLElement ? active.dataset.runPanel : undefined;
}

// ---------- Tab keyboard support (WAI-ARIA tabs, manual activation on Enter/Space) ----------

const KEY_STEP = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };

function nextTab(list, current, key) {
  const own = Array.from(list.querySelectorAll("[data-run-tab]"));
  const position = own.indexOf(current);
  if (key === "Home") return own[0];
  if (key === "End") return own[own.length - 1];
  const step = KEY_STEP[key];
  if (step === undefined) return undefined;
  return own[(position + step + own.length) % own.length];
}

function onTabKeydown(event) {
  const tab = event.target instanceof Element ? event.target.closest("[data-run-tab]") : null;
  if (tab === null) return;
  const list = tab.closest('[role="tablist"]');
  if (list === null) return;
  const target = nextTab(list, tab, event.key);
  if (target === undefined) return;
  event.preventDefault();
  select(target.dataset.runTab, { focusHeading: false, reveal: false });
  target.focus();
}

// ---------- Lightbox ----------

const dialog = () => document.getElementById("lightbox");
const state = { shots: [], position: 0, opener: null };

function shotsFor(link) {
  const panel = link.closest("[data-run-panel]");
  if (panel === null) return [link];
  const strip = Array.from(panel.querySelectorAll(".filmstrip [data-shot]"));
  return strip.length > 0 ? strip : [link];
}

function positionOf(link, shots) {
  const wanted = link.dataset.shotIndex;
  const found = shots.findIndex((shot) => shot.dataset.shotIndex === wanted);
  return found === -1 ? 0 : found;
}

function showShot() {
  const box = dialog();
  const link = state.shots[state.position];
  if (box === null || link === undefined) return;
  const image = box.querySelector("[data-lightbox-image]");
  const stage = box.querySelector(".lightbox-stage");
  if (stage instanceof HTMLElement) delete stage.dataset.missing;
  image.setAttribute("src", link.getAttribute("href") ?? "");
  image.setAttribute("alt", link.dataset.alt ?? "");
  box.querySelector("[data-lightbox-title]").textContent = link.dataset.title ?? "Screenshot";
  box.querySelector("[data-lightbox-caption]").textContent = link.dataset.caption ?? "";
  box.querySelector("[data-lightbox-file]").setAttribute("href", link.getAttribute("href") ?? "");
  const many = state.shots.length > 1;
  box.querySelector('[data-lightbox="prev"]').disabled = !many || state.position === 0;
  box.querySelector('[data-lightbox="next"]').disabled =
    !many || state.position === state.shots.length - 1;
  box.querySelector("[data-lightbox-count]").textContent = many
    ? String(state.position + 1) + " of " + String(state.shots.length)
    : "";
}

function openLightbox(link) {
  const box = dialog();
  if (!(box instanceof HTMLDialogElement) || typeof box.showModal !== "function") return false;
  state.shots = shotsFor(link);
  state.position = positionOf(link, state.shots);
  state.opener = link;
  showShot();
  box.showModal();
  const close = box.querySelector('[data-lightbox="close"]');
  if (close instanceof HTMLElement) close.focus();
  return true;
}

function move(step) {
  const next = state.position + step;
  if (next < 0 || next >= state.shots.length) return;
  state.position = next;
  showShot();
}

function onLightboxClose() {
  const opener = state.opener;
  state.opener = null;
  if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
}

function onLightboxKeydown(event) {
  if (event.key === "ArrowLeft") move(-1);
  else if (event.key === "ArrowRight") move(1);
}

const LIGHTBOX_ACTIONS = {
  close: () => dialog()?.close(),
  prev: () => move(-1),
  next: () => move(1),
};

// ---------- Click delegation ----------

function isModified(event) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function handleRunClick(element) {
  const tab = element.closest("[data-run-tab]");
  if (tab !== null) return select(tab.dataset.runTab, { focusHeading: false, reveal: true });
  const chip = element.closest("[data-run-link]");
  if (chip !== null) return select(chip.dataset.runLink, { focusHeading: true, reveal: true });
  return false;
}

function handleLightboxClick(event, element) {
  const box = dialog();
  if (box !== null && event.target === box) {
    box.close();
    return true;
  }
  const action = element.closest("[data-lightbox]");
  if (action === null) return false;
  const run = LIGHTBOX_ACTIONS[action.dataset.lightbox];
  if (run !== undefined) run();
  return run !== undefined;
}

function onClick(event) {
  if (!(event.target instanceof Element)) return;
  const element = event.target;
  if (handleLightboxClick(event, element)) return;
  const shot = element.closest("[data-shot]");
  if (shot !== null && !isModified(event)) {
    if (openLightbox(shot)) event.preventDefault();
    return;
  }
  if (handleRunClick(element)) event.preventDefault();
}

function init() {
  const index = initialIndex();
  if (index !== undefined) select(index, { focusHeading: false, reveal: false, remember: false });
  else syncRovingTabindex();
  document.addEventListener("click", onClick);
  for (const list of document.querySelectorAll('[role="tablist"]')) {
    list.addEventListener("keydown", onTabKeydown);
  }
  const box = dialog();
  if (box !== null) {
    box.addEventListener("close", onLightboxClose);
    box.addEventListener("keydown", onLightboxKeydown);
  }
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
else init();
