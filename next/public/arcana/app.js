const state = {
  config: null,
  lit: new Set(),
  session: {authenticated: false},
  selectedCardId: null,
  currentCard: null,
  currentView: "gateView",
  clockOffset: 0,
  drag: {active: false, startX: 0, startScroll: 0, deltaX: 0},
  suppressClickTarget: null,
  navigationTimer: null,
  storyTimer: null,
  finalRevealReady: false,
  loversJustUnlocked: false
};

const $ = (selector) => document.querySelector(selector);
const views = [...document.querySelectorAll(".view")];
const gateView = $("#gateView");
const archiveView = $("#archiveView");
const detailView = $("#detailView");
const table = $("#cardTable");
const viewport = $("#cardViewport");
const escapeHtml = (value) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");
const isLoversCard = (card) => card?.id === "lovers";
const storyCards = (config) => (config?.cards || []).filter((card) => !isLoversCard(card));
const sevenCardsReady = (config) => {
  const cards = storyCards(config);
  return cards.length === 7 && cards.every((card) => card.state === "available");
};
const centerSlot = (config) => {
  const complete = sevenCardsReady(config);
  const lovers = config.cards.find((card) => isLoversCard(card));
  const revealed = complete && lovers?.state === "available";
  const center = document.createElement("button");
  center.type = "button";
  center.className = "center-card" + (revealed ? " is-revealed" + (state.loversJustUnlocked ? " is-unlocking" : "") : " is-locked");
  center.dataset.centerCard = "true";
  center.dataset.centerState = revealed ? "available" : "unlit";
  center.setAttribute("aria-label", revealed ? config.center.name || "中心卡牌" : "未解锁的第八张卡牌");
  center.innerHTML = [
    '<img class="center-art" src="' + escapeHtml(revealed ? config.center.art || "assets/card-back.svg" : "assets/card-back.svg") + '" alt="" loading="eager">',
    '<span class="center-seal">' + (revealed ? "◈" : "?") + "</span>",
    '<strong class="center-name">' + (revealed ? escapeHtml(config.center.name) : "???") + "</strong>",
    '<span class="center-subtitle">' + (revealed ? escapeHtml(config.center.english) : "CODE REQUIRED") + "</span>",
    revealed ? '<span class="center-signal">' + escapeHtml(config.center.signal) + "</span>" : ""
  ].join("");
  return center;
};

let requestId = 0;
const pendingRequests = new Map();
window.addEventListener('message', event => {
  if (event.source !== window.parent || event.data?.type !== 'arcana-response') return;
  const pending = pendingRequests.get(event.data.id); if (!pending) return;
  pendingRequests.delete(event.data.id); clearTimeout(pending.timer);
  if (event.data.error) pending.reject(Error(event.data.error)); else pending.resolve(event.data.value);
});
function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    const timer = setTimeout(() => {pendingRequests.delete(id);reject(Error('连接超时，请重试'));}, 35000);
    pendingRequests.set(id, {resolve, reject, timer});
    window.parent.postMessage({type:'arcana-request',id,path,body:options.body?JSON.parse(options.body):{},asset:options.asset}, '*');
  });
}
async function hydrateArt(config) {
  const targets = [...config.cards, config.center];
  for (const item of targets) {
    if (item?.art?.startsWith('/assets/')) item.art = await request('/asset', {asset:item.art});
  }
  if (config.center.background) {
    const background = await request('/asset', {asset:config.center.background});
    document.documentElement.style.setProperty('--story-art', `url("${background}")`);
  }
}

function formatCountdown(iso) {
  const seconds = Math.max(0, Math.floor((new Date(iso).getTime() - (Date.now() + state.clockOffset)) / 1000));
  if (seconds <= 0) return "NOW";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return (days ? String(days).padStart(2, "0") + "D " : "") +
    [hours, minutes, rest].map((item) => String(item).padStart(2, "0")).join(":");
}

function createLockedSlot(card, index) {
  const slot = document.createElement("button");
  slot.type = "button";
  slot.className = "card-slot" + (card.state === "unlit" ? " is-unlit" : " is-time-locked");
  slot.dataset.cardId = card.id;
  slot.setAttribute("aria-label", "选择第 " + (index + 1) + " 张卡牌");
  slot.style.gridArea = card.slot;
  slot.dataset.unlockAt = card.unlockAt || "";
  slot.innerHTML = [
    '<span class="slot-number">0' + (index + 1) + "</span>",
    '<span class="slot-seal">' + cardSymbol(card.id) + "</span>",
    '<span class="slot-countdown">' + (card.unlockAt ? formatCountdown(card.unlockAt) : "—") + "</span>"
  ].join("");
  slot.addEventListener("click", (event) => {
    if (state.suppressClickTarget === slot) {
      state.suppressClickTarget = null;
      event.preventDefault();
      return;
    }
    selectCard(card);
    $("#cardCode").focus();
  });
  return slot;
}

function createAvailableCard(card, index) {
  const button = document.createElement("button");
  const active = state.lit.has(card.id);
  button.type = "button";
  button.className = "arcana-card" + (active ? " is-lit" : "");
  button.dataset.cardId = card.id;
  button.style.gridArea = card.slot;
  button.style.setProperty("--card-accent", cardAccent(card.id));
  button.setAttribute("aria-pressed", String(active));
  button.setAttribute("aria-label", card.name + " · " + card.activity);
  button.innerHTML = [
    '<span class="card-index">0' + (index + 1) + "</span>",
    '<span class="card-status">' + (active ? "SYNCED" : "OPEN") + "</span>",
    '<img src="' + escapeHtml(card.art) + '" alt="" loading="lazy">',
    '<span class="art-fallback" aria-hidden="true">' + cardSymbol(card.id) + "</span>",
    '<span class="card-meta"><strong>' + escapeHtml(card.name) + "</strong><small>" + escapeHtml(card.activity) + "</small></span>"
  ].join("");
  button.querySelector("img").addEventListener("error", () => button.classList.add("art-missing"), {once: true});
  button.addEventListener("click", (event) => {
    if (state.suppressClickTarget === button) {
      state.suppressClickTarget = null;
      event.preventDefault();
      return;
    }
    selectCard(card);
    openCard(card);
  });
  return button;
}

function cardSymbol(id) {
  return {moon: "◐", emperor: "◇", chariot: "➤", strength: "✦", magician: "⌘", hermit: "◒", justice: "⚖", lovers: "♡"}[id] || "✦";
}

function cardAccent(id) {
  return {
    moon: "#c2a4ff",
    emperor: "#f0bf88",
    chariot: "#7be4eb",
    strength: "#ff9cad",
    magician: "#9be9b5",
    hermit: "#d6c9a7",
    justice: "#f0db87"
  }[id] || "#c2a4ff";
}

function renderArchive() {
  if (!state.config) return;
  if (!state.selectedCardId) state.selectedCardId = state.config.cards[0]?.id || null;
  const previousScroll = viewport.scrollLeft;
  table.replaceChildren();
  state.config.cards.forEach((card, index) => {
    const cardElement = card.state === "available" ? createAvailableCard(card, index) : createLockedSlot(card, index);
    cardElement.style.gridArea = "";
    table.append(cardElement);
  });
  window.requestAnimationFrame(() => {
    viewport.scrollLeft = Math.min(previousScroll, Math.max(0, viewport.scrollWidth - viewport.clientWidth));
    syncCarouselRange();
  });

  const center = $("#centerReveal");
  const complete = !state.config.storyCompleted && state.finalRevealReady && sevenCardsReady(state.config);
  const lovers = state.config.cards.find((card) => isLoversCard(card));
  archiveView.classList.toggle("is-finale-ready", complete);
  archiveView.classList.toggle("is-lovers-locked", complete && lovers?.state !== "available");
  center.replaceChildren();
  center.hidden = !complete;
  if (complete) center.append(centerSlot(state.config));
  renderCardCodeEntry();

  const count = state.lit.size;
  const available = state.config.cards.filter((card) => card.state === "available").length;
  const total = state.config.cards.length;
  const allLit = !state.config.storyCompleted && state.finalRevealReady && available === total && count === total;
  $("#progressText").textContent = String(count).padStart(2, "0") + " / " + String(total).padStart(2, "0");
  $("#progressFill").style.width = (total ? count / total * 100 : 0) + "%";
  $("#archiveStatus").textContent = allLit
    ? ""
    : "";
  $("#finalAction").hidden = !allLit;
}

function renderCardCodeEntry() {
  const cards = state.config?.cards || [];
  if (!cards.length) return;
  const authenticated = Boolean(state.session?.authenticated);
  const hasPendingCard = cards.some((card) => card.state !== "available");
  $("#cardCode").value = "";
  $("#cardCode").placeholder = authenticated && hasPendingCard ? "ENTER CARD CODE" : authenticated ? "ALL SIGNALS RECEIVED" : "SKIN LOGIN REQUIRED";
  $("#cardCode").disabled = !authenticated || !hasPendingCard;
  $("#cardCodeForm button").disabled = !authenticated || !hasPendingCard;
  $("#cardCodeStatus").textContent = "";
}

function renderSession() {
  const login = $("#skinLogin");
  if (!login) return;
  login.hidden = Boolean(state.session?.authenticated);
  login.href = state.session?.loginUrl || "https://skin.hxzmc.top/auth/login";
}

function selectCard(card) {
  state.selectedCardId = card.id;
  renderCardCodeEntry();
  document.querySelectorAll("[data-card-id]").forEach((item) => item.classList.toggle("is-selected", item.dataset.cardId === card.id));
}

function moveCarousel(direction) {
  if (!state.config || !direction) return;
  const step = carouselStep();
  const distance = Math.max(step, viewport.clientWidth * .72);
  table.classList.add("is-navigating");
  viewport.scrollBy({left: direction * distance, behavior: "smooth"});
  window.clearTimeout(state.navigationTimer);
  state.navigationTimer = window.setTimeout(() => table.classList.remove("is-navigating"), 420);
}

function carouselStep() {
  const firstCard = table.firstElementChild;
  if (!firstCard) return 1;
  const gap = parseFloat(window.getComputedStyle(table).gap) || 0;
  return firstCard.getBoundingClientRect().width + gap;
}

function syncCarouselRange() {
  if (!state.config || !table.firstElementChild) return;
  const step = carouselStep();
  const first = Math.min(state.config.cards.length - 1, Math.max(0, Math.round(viewport.scrollLeft / step)));
  const visible = Math.max(1, Math.round((viewport.clientWidth + (step - table.firstElementChild.getBoundingClientRect().width)) / step));
  const last = Math.min(state.config.cards.length, first + visible);
  $("#carouselRange").textContent = String(first + 1).padStart(2, "0") + "—" + String(last).padStart(2, "0") + " / " + String(state.config.cards.length).padStart(2, "0");
}

function beginCardDrag(event) {
  if (!state.config || event.button > 0) return;
  state.drag.active = true;
  state.drag.startX = event.clientX;
  state.drag.startScroll = viewport.scrollLeft;
  state.drag.deltaX = 0;
  state.drag.target = event.target.closest?.("[data-card-id]") || null;
  viewport.classList.add("is-dragging");
  table.classList.add("is-dragging");
}

function updateCardDrag(event) {
  if (!state.drag.active) return;
  state.drag.deltaX = event.clientX - state.drag.startX;
  if (Math.abs(state.drag.deltaX) > 8) state.suppressClickTarget = state.drag.target;
  viewport.scrollLeft = state.drag.startScroll - state.drag.deltaX;
  event.preventDefault();
}

function endCardDrag() {
  if (!state.drag.active) return;
  const deltaX = state.drag.deltaX;
  state.drag.active = false;
  viewport.classList.remove("is-dragging");
  table.classList.remove("is-dragging");
  if (Math.abs(deltaX) > 8 && state.drag.target) {
    const target = state.drag.target;
    state.suppressClickTarget = target;
    window.setTimeout(() => {
      if (state.suppressClickTarget === target) state.suppressClickTarget = null;
    }, 0);
  }
  table.classList.add("is-snapping");
  viewport.scrollTo({left: Math.round(viewport.scrollLeft / carouselStep()) * carouselStep(), behavior: "smooth"});
  window.setTimeout(() => table.classList.remove("is-snapping"), 240);
}

async function loadPublicConfig() {
  state.config = await request("/api/public");
  await hydrateArt(state.config);
  state.finalRevealReady = state.config.finalRevealReady === true;
  state.session = state.config.session || {authenticated: false, loginUrl: "https://skin.hxzmc.top/auth/login"};
  state.lit = new Set(state.config.cards.filter((card) => card.state === "available").map((card) => card.id));
  state.clockOffset = new Date(state.config.serverTime).getTime() - Date.now();
  const title = $("#gateTitle");
  if (title) title.textContent = state.config.title || "";
  const gateLine = $("#gateLine");
  if (gateLine) gateLine.textContent = state.config.subtitle || "";
  document.title = state.config.title || "ARCANA";
  renderSession();
  renderArchive();
  updateCountdowns();
  routeFromHash();
  if (state.config.entered && state.currentView === "gateView") switchView("archiveView");
}

function updateCountdowns() {
  document.querySelectorAll("[data-unlock-at]").forEach((slot) => {
    slot.querySelector(".slot-countdown").textContent = formatCountdown(slot.dataset.unlockAt);
  });
}

function switchView(nextId) {
  const current = $("#" + state.currentView);
  const next = $("#" + nextId);
  if (!next || current === next) return;
  current.classList.add("is-leaving");
  next.hidden = false;
  next.classList.add("is-active", "is-entering");
  requestAnimationFrame(() => next.classList.remove("is-entering"));
  setTimeout(() => {
    current.hidden = true;
    current.classList.remove("is-active", "is-leaving");
  }, 480);
  state.currentView = nextId;
  document.body.classList.toggle("on-gate", nextId === "gateView");
}

function renderDialogue(dialogue) {
  const target = $("#detailDialogue");
  target.replaceChildren();
  (Array.isArray(dialogue) ? dialogue : []).forEach((line, index) => {
    const item = document.createElement("p");
    item.className = "dialogue-line";
    const speaker = document.createElement("span");
    speaker.className = "dialogue-speaker";
    speaker.textContent = line.speaker || String(index + 1).padStart(2, "0");
    const text = document.createElement("span");
    text.className = "dialogue-text";
    text.textContent = line.text || "";
    item.append(speaker, text);
    target.append(item);
  });
}

function showDetail({art, name, detail = {}, activity = "", dialogue = [], stateLabel = "SIGNAL RECEIVED"}) {
  const detailImage = $("#detailImage");
  detailImage.classList.remove("is-turning");
  void detailImage.offsetWidth;
  detailImage.src = art || "assets/card-back.svg";
  detailImage.alt = name || "";
  detailImage.classList.add("is-turning");
  $("#detailEyebrow").textContent = detail.eyebrow || "";
  $("#detailTitle").textContent = detail.title || name || "";
  $("#detailActivity").textContent = activity;
  $("#detailLine").textContent = detail.line || "";
  renderDialogue(dialogue);
  $("#detailState").textContent = stateLabel;
}

function openCard(card) {
  if (card.state !== "available") {
    selectCard(card);
    return;
  }
  state.lit.add(card.id);
  state.currentCard = card;
  showDetail({art: card.art, name: card.name, detail: card.detail, activity: card.activity, dialogue: card.dialogue});
  renderArchive();
  history.replaceState(null, "", "#card/" + card.id);
  switchView("detailView");
}

function openCenter() {
  const center = state.config?.center;
  const complete = !state.config?.storyCompleted && state.finalRevealReady && sevenCardsReady(state.config);
  const lovers = state.config?.cards.find((card) => isLoversCard(card));
  if (!center?.name || !complete || lovers?.state !== "available") return;
  openFinalStory();
}

function openFinalStory() {
  const center = state.config?.center;
  const complete = !state.config?.storyCompleted && state.finalRevealReady && sevenCardsReady(state.config);
  const lovers = state.config?.cards.find((card) => isLoversCard(card));
  if (!center?.name || !complete || lovers?.state !== "available") return;
  const stream = $("#storyStream");
  const lines = Array.isArray(center.dialogue) ? center.dialogue : [];
  const offsets = [-6, 14, -2, 19, 7, -12, 11, 2];
  window.clearTimeout(state.storyTimer);
  stream.replaceChildren();
  lines.forEach((line, index) => {
    const narration = !line.speaker || line.speaker === "—";
    const item = document.createElement("p");
    item.className = "story-line" + (narration ? " is-narration" : "");
    item.style.setProperty("--story-delay", (0.72 + index * 0.64) + "s");
    item.style.setProperty("--story-offset", offsets[index % offsets.length]);
    const text = document.createElement("span");
    text.className = "dialogue-text";
    text.textContent = line.text || "";
    if (narration) {
      item.append(text);
    } else {
      const speaker = document.createElement("span");
      speaker.className = "dialogue-speaker";
      speaker.textContent = line.speaker;
      item.append(speaker, text);
    }
    stream.append(item);
  });
  $("#storyTitle").textContent = center.name;
  const continueButton = $("#storyContinue");
  continueButton.hidden = true;
  state.storyTimer = window.setTimeout(() => {
    continueButton.hidden = false;
  }, (0.72 + lines.length * 0.64 + 0.9) * 1000);
  state.currentCard = null;
  history.replaceState(null, "", "#story");
  switchView("storyView");
  window.scrollTo({top: 0, behavior: "smooth"});
}

async function completeFinalStory() {
  const continueButton = $("#storyContinue");
  if (continueButton.disabled) return;
  continueButton.disabled = true;
  continueButton.textContent = "…";
  try {
    history.replaceState(null, "", "#archive");
    await request("/api/story-complete", {method: "POST"});
    state.selectedCardId = "lovers";
    await loadPublicConfig();
    const lovers = state.config.cards.find((card) => isLoversCard(card));
    if (lovers) selectCard(lovers);
    switchView("archiveView");
    window.requestAnimationFrame(showArchiveNotice);
  } catch {
    continueButton.disabled = false;
    continueButton.textContent = "RETRY ↗";
  }
}

function showArchiveNotice() {
  const notice = $("#archiveNoticeModal");
  if (!notice) return;
  notice.hidden = false;
  notice.classList.remove("is-visible");
  void notice.offsetWidth;
  notice.classList.add("is-visible");
  $("#archiveNoticeClose")?.focus();
}

function closeArchiveNotice() {
  const notice = $("#archiveNoticeModal");
  if (!notice || notice.hidden) return;
  notice.classList.remove("is-visible");
  window.setTimeout(() => {
    if (!notice.classList.contains("is-visible")) notice.hidden = true;
  }, 420);
}

async function backToArchive() {
  const button = $('#backButton'); if (button.disabled) return; button.disabled = true;
  try {
    window.clearTimeout(state.storyTimer);
    if (state.currentCard && !isLoversCard(state.currentCard))
      await request('/api/card-read', {body:JSON.stringify({cardId:state.currentCard.id})});
    state.currentCard = null;
    history.replaceState(null, '', '#archive');
    await loadPublicConfig();
    switchView('archiveView');
  } catch (error) { $('#detailState').textContent = error.message; }
  finally { button.disabled = false; }
}

$("#accessForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = $("#accessCode");
  const status = $("#accessStatus");
  status.textContent = "…";
  try {
    await request("/api/unlock", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({code: input.value})
    });
    status.textContent = "SIGNAL ACCEPTED";
    status.classList.add("is-good");
    await loadPublicConfig();
    setTimeout(() => switchView("archiveView"), 380);
  } catch (error) {
    status.classList.remove("is-good");
    status.textContent = error.message || "NO SIGNAL";
    input.focus();
  }
});

$("#cardCodeForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = $("#cardCode");
  const status = $("#cardCodeStatus");
  if (!state.session?.authenticated) {
    status.textContent = "SKIN LOGIN REQUIRED";
    $("#skinLogin")?.focus();
    return;
  }
  if (!input.value.trim()) {
    status.textContent = "INPUT REQUIRED";
    input.focus();
    return;
  }
  status.classList.remove("is-good");
  status.textContent = "…";
  try {
    const result = await request("/api/card-unlock", {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({code: input.value})
    });
    state.lit.add(result.cardId);
    if (result.cardId === "lovers" && !state.config.storyCompleted) state.loversJustUnlocked = true;
    await loadPublicConfig();
    const freshCard = state.config.cards.find((item) => item.id === result.cardId);
    if (!freshCard) throw new Error("card_not_found");
    if (isLoversCard(freshCard) && !state.config.storyCompleted) {
      state.currentCard = null;
      history.replaceState(null, "", "#archive");
      status.classList.add("is-good");
      status.textContent = "SIGNAL RECEIVED";
      return;
    }
    selectCard(freshCard);
    status.classList.add("is-good");
    status.textContent = "SIGNAL RECEIVED";
    window.setTimeout(() => openCard(freshCard), 260);
  } catch (error) {
    status.textContent = error.message || "NO SIGNAL";
    input.focus();
  }
});

$("#backButton").addEventListener("click", backToArchive);
$("#previousCards").addEventListener("click", () => moveCarousel(-1));
$("#nextCards").addEventListener("click", () => moveCarousel(1));
$("#centerReveal").addEventListener("click", (event) => {
  if (!event.target.closest("[data-center-card]")) return;
  const lovers = state.config?.cards.find((card) => isLoversCard(card));
  if (lovers?.state === "available") {
    openCenter();
    return;
  }
  if (lovers) {
    selectCard(lovers);
    $("#cardCode").focus();
  }
});
viewport.addEventListener("pointerdown", beginCardDrag);
viewport.addEventListener("pointermove", updateCardDrag);
viewport.addEventListener("pointerup", endCardDrag);
viewport.addEventListener("pointercancel", endCardDrag);
viewport.addEventListener("scroll", syncCarouselRange, {passive: true});
viewport.addEventListener("wheel", (event) => {
  if (Math.abs(event.deltaY) < 8 && Math.abs(event.deltaX) < 8) return;
  event.preventDefault();
  moveCarousel((event.deltaX || event.deltaY) > 0 ? 1 : -1);
}, {passive: false});
window.addEventListener("keydown", (event) => {
  if (state.currentView !== "archiveView" || event.target.closest?.("input,textarea,[contenteditable]")) return;
  if (event.key === "Escape" && !$("#archiveNoticeModal")?.hidden) {
    closeArchiveNotice();
    return;
  }
  if (event.key === "ArrowLeft") moveCarousel(-1);
  if (event.key === "ArrowRight") moveCarousel(1);
});
$("#finalAction").addEventListener("click", openCenter);
$("#storyContinue").addEventListener("click", completeFinalStory);
$("#archiveNoticeClose").addEventListener("click", closeArchiveNotice);
$("#archiveNoticeBackdrop").addEventListener("click", closeArchiveNotice);

window.addEventListener("hashchange", () => {
  routeFromHash();
});

function routeFromHash() {
  if (window.location.hash === "#center" || window.location.hash === "#story") {
    if (state.config?.storyCompleted) {
      history.replaceState(null, "", "#archive");
      if (state.currentView !== "archiveView") switchView("archiveView");
      return;
    }
    openCenter();
    return;
  }
  const id = window.location.hash.startsWith("#card/") ? window.location.hash.replace("#card/", "") : "";
  const card = state.config?.cards.find((item) => item.id === id && item.state === "available");
  if (card && state.currentCard?.id !== card.id) openCard(card);
  if (!id && state.currentView === "detailView") switchView("archiveView");
}

let refreshing = false;
setInterval(() => {
  updateCountdowns();
  if ([...document.querySelectorAll(".card-slot.is-time-locked")].some((slot) => slot.dataset.unlockAt && formatCountdown(slot.dataset.unlockAt) === "NOW")) {
    if (!refreshing) { refreshing = true; loadPublicConfig().catch(() => {}).finally(() => { refreshing = false; }); }
  }
}, 1000);

const magicCanvas = $("#magicCircle");
const magicContext = magicCanvas?.getContext("2d");
let magicWidth = 0;
let magicHeight = 0;
let magicDpr = 1;

function resizeMagicCircle() {
  if (!magicCanvas || !magicContext) return;
  magicDpr = Math.min(window.devicePixelRatio || 1, 2);
  magicWidth = window.innerWidth;
  magicHeight = window.innerHeight;
  magicCanvas.width = Math.floor(magicWidth * magicDpr);
  magicCanvas.height = Math.floor(magicHeight * magicDpr);
  magicContext.setTransform(magicDpr, 0, 0, magicDpr, 0, 0);
}

function drawSegmentRing(context, cx, cy, radius, count, rotation, alpha, dash = false) {
  context.save();
  context.translate(cx, cy);
  context.rotate(rotation);
  context.beginPath();
  context.setLineDash(dash ? [2, 9] : []);
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
  }
  context.closePath();
  context.strokeStyle = `rgba(173, 151, 255, ${alpha})`;
  context.stroke();
  context.restore();
}

function drawMagicCircle(time) {
  if (!magicCanvas || !magicContext) return;
  const context = magicContext;
  const cx = magicWidth * .5;
  const cy = magicHeight * .5;
  const base = Math.min(magicWidth, magicHeight) * .31;
  const pulse = Math.sin(time * .0007) * 5;
  context.clearRect(0, 0, magicWidth, magicHeight);
  context.lineWidth = 1;
  context.globalCompositeOperation = "screen";
  context.shadowBlur = 10;
  context.shadowColor = "rgba(165, 130, 255, .32)";
  [base + 54 + pulse, base + 28, base].forEach((radius, index) => {
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.strokeStyle = index === 1 ? "rgba(121, 219, 229, .22)" : "rgba(173, 151, 255, .25)";
    context.setLineDash(index === 0 ? [1, 15] : []);
    context.stroke();
  });
  context.setLineDash([]);
  drawSegmentRing(context, cx, cy, base - 13, 7, time * .00008, .27);
  drawSegmentRing(context, cx, cy, base - 42, 7, -time * .0001, .22, true);
  context.beginPath();
  for (let index = 0; index < 7; index += 1) {
    const angle = time * .00008 + (Math.PI * 2 * index) / 7;
    const outer = base + 54;
    const inner = base - 10;
    context.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
    context.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
    context.arc(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer, 3, 0, Math.PI * 2);
  }
  context.strokeStyle = "rgba(121, 219, 229, .23)";
  context.stroke();
  context.shadowBlur = 0;
  context.beginPath();
  context.arc(cx, cy, 5 + Math.sin(time * .001) * 2, 0, Math.PI * 2);
  context.fillStyle = "rgba(220, 198, 255, .58)";
  context.fill();
  window.requestAnimationFrame(drawMagicCircle);
}

resizeMagicCircle();
window.addEventListener("resize", resizeMagicCircle);
window.requestAnimationFrame(drawMagicCircle);

loadPublicConfig().catch(error => { $("#accessStatus").textContent = error.message; });
