// packages/community/image-bounds.mjs
async function imageBounds(blob) {
  const bytes = new Uint8Array(await blob.slice(0, 1024 * 1024).arrayBuffer()), v = new DataView(bytes.buffer), n = bytes.length, ascii = (p, s) => p + s.length <= n && s.split("").every((c, i) => bytes[p + i] === c.charCodeAt(0));
  let width = 0, height = 0;
  if (n >= 24 && bytes[0] === 137 && ascii(1, "PNG\r\n\n") && ascii(12, "IHDR")) {
    width = v.getUint32(16);
    height = v.getUint32(20);
  } else if (n >= 30 && ascii(0, "RIFF") && ascii(8, "WEBP")) {
    if (ascii(12, "VP8X")) {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16);
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16);
    } else if (ascii(12, "VP8 ") && bytes[23] === 157 && bytes[24] === 1 && bytes[25] === 42) {
      width = v.getUint16(26, true) & 16383;
      height = v.getUint16(28, true) & 16383;
    } else if (ascii(12, "VP8L") && bytes[20] === 47) {
      const bits = v.getUint32(21, true);
      width = (bits & 16383) + 1;
      height = (bits >>> 14 & 16383) + 1;
    }
  } else if (n >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    let p = 2;
    while (p + 4 <= n) {
      if (bytes[p++] !== 255) break;
      while (p < n && bytes[p] === 255) p++;
      const marker = bytes[p++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || marker >= 208 && marker <= 215) continue;
      if (p + 2 > n) break;
      const size = v.getUint16(p);
      if (size < 2 || p + size > n) break;
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker) && size >= 7) {
        height = v.getUint16(p + 3);
        width = v.getUint16(p + 5);
        break;
      }
      p += size;
    }
  }
  if (!width || !height) throw Error("\u65E0\u6CD5\u8BFB\u53D6\u56FE\u7247\u5C3A\u5BF8\uFF0C\u8BF7\u91CD\u65B0\u4FDD\u5B58\u4E3A PNG\u3001JPG \u6216 WebP");
  if (width > 16e3 || height > 16e3 || width * height > 24e6) throw Error("\u56FE\u7247\u5C3A\u5BF8\u8FC7\u5927\uFF0C\u8BF7\u7F29\u5C0F\u81F3 2400 \u4E07\u50CF\u7D20\u4EE5\u5185");
  return { width, height };
}
async function boundedBitmap(blob, max = 2048) {
  const size = await imageBounds(blob), scale = Math.min(1, max / Math.max(size.width, size.height));
  return createImageBitmap(blob, { resizeWidth: Math.max(1, Math.round(size.width * scale)), resizeHeight: Math.max(1, Math.round(size.height * scale)), resizeQuality: "high" });
}

// packages/community/image-upload.mjs
async function communityImage(file) {
  if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 12 * 1024 * 1024) throw Error("\u8BF7\u9009\u62E9 12 MB \u4EE5\u5185\u7684 PNG\u3001JPG \u6216 WebP \u56FE\u7247");
  const image = await boundedBitmap(file, 1200);
  try {
    let size = 1200;
    for (let i = 0; i < 5; i++, size = Math.round(size * 0.72)) {
      const scale = Math.min(1, size / Math.max(image.width, image.height)), canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = canvas.toDataURL("image/png");
      if (data.length < 135e4) return data;
    }
    throw Error("\u56FE\u7247\u4ECD\u7136\u8FC7\u5927\uFF0C\u8BF7\u9009\u62E9\u8F83\u5C0F\u7684\u56FE\u7247");
  } finally {
    image.close();
  }
}

// packages/guild/ui.mjs
var labels = { review: "\u7B49\u5F85\u5BA1\u6838", open: "\u53EF\u8BA4\u9886", active: "\u8FDB\u884C\u4E2D", submitted: "\u5F85\u9A8C\u6536", delivery: "\u5F85\u786E\u8BA4\u6536\u8D27", completed: "\u5DF2\u5B8C\u6210", rejected: "\u672A\u901A\u8FC7", cancelled: "\u5DF2\u64A4\u9500", withdrawn: "\u5DF2\u653E\u5F03" };
function mountGuild(root, { request, uid = "", initialTask = "", admin = false, regions }) {
  const base = root;
  let alive = true, sequence = 0, scope = "public", query = "", status = "", offset = 0, manager = admin, consoleAdmin = false, selected = initialTask;
  const overlays = /* @__PURE__ */ new Set();
  const el = (tag, text = "", className = "") => {
    const n = document.createElement(tag);
    n.textContent = text;
    n.className = className;
    return n;
  };
  function error(e) {
    if (!alive) return;
    const target = [...overlays].reverse().find((d) => d.open) || root;
    let status2 = target.querySelector(".guild-error");
    if (!status2) {
      status2 = el("p", "", "guild-error");
      status2.role = "alert";
      target.prepend(status2);
    }
    status2.textContent = e.message || String(e);
    status2.scrollIntoView({ block: "nearest" });
  }
  const button = (name, action, primary = false) => {
    const b = el("button", name, "button" + (primary ? " guild-primary" : ""));
    b.type = "button";
    b.onclick = async () => {
      if (b.disabled) return;
      b.disabled = true;
      try {
        await action();
      } catch (e) {
        error(e);
      } finally {
        b.disabled = false;
      }
    };
    return b;
  };
  const input = (form, name, value = "", area = false) => {
    const label = el("label", name), field = el(area ? "textarea" : "input");
    field.value = value;
    if (area) field.rows = 5;
    label.append(field);
    form.append(label);
    return field;
  };
  const choice = (form, name, options) => {
    const label = el("div", "", "guild-choice"), caption = el("span", name), selected2 = { value: options[0][0] }, trigger = button(options[0][1], () => {
      const dialog = el("dialog", "", "guild-choice-dialog");
      dialog.setAttribute("aria-label", name);
      dialog.append(el("h3", name));
      const close = () => {
        dialog.close();
        dialog.remove();
        overlays.delete(dialog);
        trigger.focus();
      };
      for (const [value, title] of options) {
        const option = button(title, () => {
          selected2.value = value;
          trigger.textContent = title;
          close();
          selected2.onchange?.(value);
        });
        option.setAttribute("aria-pressed", String(value === selected2.value));
        dialog.append(option);
      }
      dialog.append(button("\u53D6\u6D88", close));
      dialog.addEventListener("cancel", (e) => {
        e.preventDefault();
        close();
      });
      document.body.append(dialog);
      overlays.add(dialog);
      dialog.showModal();
    });
    trigger.classList.add("guild-select");
    trigger.setAttribute("aria-label", name);
    trigger.setAttribute("aria-haspopup", "dialog");
    label.append(caption, trigger);
    form.append(label);
    return selected2;
  };
  function confirm(title, message, action) {
    const dialog = el("dialog", "", "guild-choice-dialog");
    dialog.setAttribute("aria-label", title);
    const close = () => {
      dialog.close();
      dialog.remove();
      overlays.delete(dialog);
    };
    dialog.append(el("h3", title), el("p", message), button("\u786E\u8BA4", async () => {
      await action();
      close();
    }, true), button("\u53D6\u6D88", close));
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      close();
    });
    document.body.append(dialog);
    overlays.add(dialog);
    dialog.showModal();
  }
  function lightbox(src) {
    const dialog = el("dialog", "", "guild-choice-dialog guild-lightbox"), img = el("img");
    img.src = src;
    img.alt = "\u59D4\u6258\u56FE\u7247";
    const close = () => {
      dialog.close();
      dialog.remove();
      overlays.delete(dialog);
    };
    dialog.append(img, button("\u5173\u95ED", close));
    dialog.addEventListener("cancel", close);
    document.body.append(dialog);
    overlays.add(dialog);
    dialog.showModal();
  }
  async function image(parent, url) {
    try {
      const v = await request(url + "/data");
      if (!alive || !parent.isConnected) return;
      const item = button("\u67E5\u770B\u59D4\u6258\u56FE\u7247", () => lightbox(v.image));
      item.className = "guild-picture";
      item.setAttribute("aria-label", "\u67E5\u770B\u59D4\u6258\u56FE\u7247");
      const img = el("img");
      img.src = v.image;
      img.alt = "\u59D4\u6258\u56FE\u7247";
      img.loading = "lazy";
      item.replaceChildren(img);
      parent.append(item);
    } catch {
      if (alive && parent.isConnected) parent.append(button("\u56FE\u7247\u672A\u8F7D\u5165 \xB7 \u91CD\u8BD5", async () => {
        parent.replaceChildren();
        await image(parent, url);
      }));
    }
  }
  function pictures(parent, urls) {
    const box = el("div", "", "guild-images");
    parent.append(box);
    for (const url of urls) {
      const tile = el("div");
      box.append(tile);
      void image(tile, url);
    }
  }
  function uploader(parent, initial = []) {
    const urls = [...initial], previews = el("div", "", "guild-images"), pick = input(parent, "\u56FE\u7247\uFF08\u6700\u591A\u4E09\u5F20\uFF09");
    pick.type = "file";
    pick.accept = "image/png,image/jpeg,image/webp";
    pick.multiple = true;
    parent.append(previews);
    const addPreview = (url, src) => {
      const tile = el("div", "", "guild-upload-preview");
      if (src) {
        const img = el("img");
        img.src = src;
        img.alt = "\u5DF2\u4E0A\u4F20\u56FE\u7247";
        tile.append(img);
      } else void image(tile, url);
      tile.append(button("\u79FB\u9664", () => {
        urls.splice(urls.indexOf(url), 1);
        tile.remove();
      }));
      previews.append(tile);
    };
    initial.forEach((url) => addPreview(url));
    pick.onchange = async () => {
      pick.disabled = true;
      try {
        for (const file of [...pick.files]) {
          if (urls.length >= 3) throw Error("\u6700\u591A\u4E09\u5F20\u56FE\u7247\uFF0C\u8BF7\u5148\u79FB\u9664\u4E0D\u9700\u8981\u7684\u56FE\u7247");
          const data = await communityImage(file), v = await request("/api/media/upload", "POST", { scope: "guild", image: data });
          if (!alive) return;
          urls.push(v.url);
          addPreview(v.url, data);
        }
      } catch (e) {
        error(e);
      } finally {
        pick.disabled = false;
        pick.value = "";
      }
    };
    return { urls, pick };
  }
  function rewardLabel(t) {
    if (t.reward_type === "inventory") {
      try {
        const r = JSON.parse(t.reward);
        return r.title + " \xD7 " + r.quantity;
      } catch {
        return "\u80CC\u5305\u9053\u5177";
      }
    }
    return t.reward_type === "points" ? t.reward + " \u79EF\u5206" : t.reward_type === "items" ? t.reward : "\u65E0\u989D\u5916\u5956\u52B1";
  }
  function emblem(type = "compass") {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 48 48");
    svg.setAttribute("aria-hidden", "true");
    const shapes = { points: "M24 5a19 19 0 1 0 0 38 19 19 0 0 0 0-38Zm0 9 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z", inventory: "m24 7 15 8v18l-15 8-15-8V15l15-8ZM9 15l15 8 15-8M24 23v18M17 11l15 8", items: "M10 17h28v23H10V17Zm-3 0v-7h34v7M24 10v30M24 10c-15 1-14-14-4-8l4 8Zm0 0c15 1 14-14 4-8l-4 8Z", compass: "M24 4a20 20 0 1 0 0 40 20 20 0 0 0 0-40Zm8 12-5 13-11 3 5-13 11-3ZM24 7v4M24 37v4M7 24h4M37 24h4" };
    const shape = document.createElementNS(svg.namespaceURI, "path");
    shape.setAttribute("d", shapes[type] || shapes.compass);
    shape.setAttribute("fill", "none");
    shape.setAttribute("stroke", "currentColor");
    shape.setAttribute("stroke-width", "1.7");
    shape.setAttribute("stroke-linejoin", "round");
    svg.append(shape);
    return svg;
  }
  function progress(parent, t, mine) {
    const stage = mine?.status === "completed" || t.status === "completed" ? 4 : mine?.status === "delivery" || t.status === "delivery" || mine?.status === "submitted" || t.status === "submitted" ? 3 : mine?.status === "active" || t.status === "active" ? 2 : t.status === "open" ? 1 : 0;
    const steps = el("ol", "", "guild-progress");
    ["\u5BA1\u6838\u53D1\u5E03", "\u63A5\u53D6\u59D4\u6258", "\u63D0\u4EA4\u51ED\u8BC1", "\u786E\u8BA4\u4EA4\u4ED8", "\u5B8C\u6210\u7ED3\u7B97"].forEach((label, index) => {
      const step = el("li", label, index < stage ? "done" : index === stage ? "current" : "");
      step.setAttribute("aria-current", index === stage ? "step" : "false");
      steps.append(step);
    });
    parent.append(steps);
    const messages = { active: mine?.note ? "\u9A8C\u6536\u4EBA\u8981\u6C42\u8865\u5145\uFF1A" + mine.note : "\u6309\u59D4\u6258\u8981\u6C42\u5B8C\u6210\u59D4\u6258\uFF0C\u7136\u540E\u63D0\u4EA4\u8BF4\u660E\u4E0E\u622A\u56FE\u3002", submitted: "\u51ED\u8BC1\u5DF2\u63D0\u4EA4\uFF0C\u7B49\u5F85\u59D4\u6258\u4EBA\u6216\u7BA1\u7406\u5458\u9A8C\u6536\u3002", delivery: "\u59D4\u6258\u4EBA\u5DF2\u6807\u8BB0\u4EA4\u4ED8\uFF0C\u8BF7\u786E\u8BA4\u662F\u5426\u6536\u5230\u6E38\u620F\u5185\u9053\u5177\u3002", completed: t.reward_type === "points" ? "\u59D4\u6258\u5DF2\u5B8C\u6210\uFF0C\u79EF\u5206\u5DF2\u5165\u8D26\u3002" : t.reward_type === "items" ? "\u59D4\u6258\u5DF2\u5B8C\u6210\uFF0C\u63A5\u53D6\u4EBA\u5DF2\u786E\u8BA4\u6536\u5230\u9053\u5177\u3002" : "\u59D4\u6258\u5DF2\u5B8C\u6210\u3002", withdrawn: "\u4F60\u5DF2\u653E\u5F03\u6B64\u59D4\u6258\uFF1B\u4ECD\u5F00\u653E\u65F6\u53EF\u4EE5\u91CD\u65B0\u63A5\u53D6\u3002" };
    const status2 = el("p", messages[mine?.status] || (t.status === "submitted" ? "\u6709\u51ED\u8BC1\u7B49\u5F85\u4F60\u9A8C\u6536\u3002" : t.status === "review" ? "\u7B49\u5F85\u7BA1\u7406\u5458\u5BA1\u6838\uFF1B\u901A\u8FC7\u540E\u624D\u4F1A\u51FA\u73B0\u5728\u5E7F\u573A\u3002" : t.status === "open" ? "\u59D4\u6258\u5DF2\u5F00\u653E\uFF0C\u53EF\u4EE5\u8BA4\u9886\u3002" : t.status === "active" ? "\u5DF2\u6709\u65C5\u4EBA\u6B63\u5728\u5B8C\u6210\u59D4\u6258\u3002" : labels[t.status]), "guild-status-note");
    parent.append(status2);
  }
  function header(title) {
    root.dataset.view = title === "\u5192\u9669\u5BB6\u534F\u4F1A" ? "list" : title === "\u53D1\u5E03\u59D4\u6258" ? "create" : "detail";
    root.replaceChildren();
    const h = el("header", "", "guild-header");
    h.append(el("h2", title));
    root.append(h);
    return h;
  }
  let detailDialog = null, detailRoot = null, returnFocus = null, listPosition = [];
  function rememberList() {
    listPosition = [];
    for (let node = base; node; node = node.parentElement) listPosition.push({ node, top: node.scrollTop, left: node.scrollLeft });
  }
  function restoreList() {
    for (const { node, top, left } of listPosition) {
      if (node.isConnected) {
        node.scrollTop = top;
        node.scrollLeft = left;
      }
    }
  }
  function closeDetail() {
    sequence++;
    selected = "";
    root = base;
    detailDialog?.close();
    detailDialog?.remove();
    overlays.delete(detailDialog);
    detailDialog = null;
    detailRoot = null;
    for (const item of base.querySelectorAll("[data-commission]")) item.setAttribute("aria-current", "false");
    restoreList();
    returnFocus?.isConnected && returnFocus.focus({ preventScroll: true });
  }
  async function returnToBoard() {
    if (regions) {
      closeDetail();
      return;
    }
    selected = "";
    await load();
    restoreList();
  }
  function detailSurface() {
    if (!regions) {
      if (base.dataset.view === "list") rememberList();
      root = base;
      return;
    }
    if (!detailDialog) {
      rememberList();
      returnFocus = document.activeElement;
      detailRoot = el("section", "", "guild-workspace");
      detailDialog = el("dialog", "", "guild-choice-dialog guild-detail-dialog");
      detailDialog.setAttribute("aria-label", "\u59D4\u6258\u8BE6\u60C5");
      detailDialog.append(detailRoot);
      detailDialog.addEventListener("cancel", (e) => {
        e.preventDefault();
        closeDetail();
      });
      document.body.append(detailDialog);
      overlays.add(detailDialog);
      detailDialog.showModal();
    }
    root = detailRoot;
  }
  function overview(data) {
    const stats = el("div", "", "guild-overview");
    for (const [value, label, target] of [[data.stats?.available || 0, "\u5F00\u653E\u59D4\u6258", "public"], [data.stats?.active || 0, "\u6B63\u5728\u8FDB\u884C", "accepted"], [data.stats?.awaiting || 0, "\u7B49\u5F85\u6211\u9A8C\u6536", "published"]]) {
      const item = button("", () => {
        scope = target;
        status = "";
        offset = 0;
        return load();
      });
      item.append(el("strong", String(value)), el("span", label));
      stats.append(item);
    }
    if (regions?.overview) {
      const masthead = el("div", "", "guild-overview-brand"), mark = el("span", "", "guild-mark");
      mark.append(emblem());
      masthead.append(mark, el("div", "\u6BCF\u4E00\u4EFD\u59D4\u6258\uFF0C\u90FD\u662F\u4E00\u8D77\u5192\u9669\u7684\u8D77\u70B9\u3002"));
      regions.overview.replaceChildren(stats, el("p", "\u53EF\u7528\u79EF\u5206 " + data.wallet.balance + " \xB7 \u5956\u52B1\u7531\u7CFB\u7EDF\u6258\u7BA1", "guild-muted"));
    } else root.append(stats);
    const active = el("section", "", "guild-active-strip");
    if (!regions) active.append(el("h3", "\u7EE7\u7EED\u6211\u7684\u59D4\u6258"));
    const links = el("div");
    for (const t of data.inProgress || []) {
      const b = button("", () => detail(t.id));
      b.append(el("span", t.title), el("small", labels[t.ownClaim?.status] || "\u8FDB\u884C\u4E2D"));
      links.append(b);
    }
    active.append(links);
    if (!data.inProgress?.length) active.append(el("p", "\u8FD8\u6CA1\u6709\u8FDB\u884C\u4E2D\u7684\u59D4\u6258\uFF0C\u53BB\u5E7F\u573A\u770B\u770B\u3002", "guild-muted"), button("\u6D4F\u89C8\u53EF\u63A5\u53D6\u59D4\u6258", () => {
      scope = "public";
      status = "open";
      offset = 0;
      return load();
    }));
    if (regions?.ongoing) regions.ongoing.replaceChildren(active);
    else if (scope === "public" && data.inProgress?.length) root.append(active);
  }
  async function load() {
    root = regions?.board || base;
    const ticket = ++sequence;
    try {
      const data = await request("/api/guild?scope=" + scope + "&offset=" + offset + "&q=" + encodeURIComponent(query) + "&status=" + encodeURIComponent(status));
      if (!alive || ticket !== sequence) return;
      manager = !!data.manager;
      consoleAdmin = !!data.consoleAdmin;
      const h = header("\u5192\u9669\u5BB6\u534F\u4F1A"), brand = el("div", "", "guild-brand"), mark = el("span", "", "guild-mark");
      mark.append(emblem());
      const heading = h.firstChild;
      brand.append(mark, heading);
      h.prepend(brand);
      h.append(button("\u53D1\u5E03\u59D4\u6258", create, true));
      const nav = el("nav", "", "guild-tabs");
      for (const [v, t] of [["public", "\u59D4\u6258\u5E7F\u573A"], ["accepted", "\u6211\u63A5\u53D6\u7684"], ["published", "\u6211\u53D1\u5E03\u7684"], ...manager ? [["review", "\u5BA1\u6838\u961F\u5217"]] : []]) {
        const b = button(t, () => {
          scope = v;
          status = "";
          offset = 0;
          selected = "";
          return load();
        });
        b.setAttribute("aria-pressed", String(v === scope));
        nav.append(b);
      }
      if (regions) h.prepend(nav);
      else root.append(nav);
      overview(data);
      if (regions) h.append(button("\u5237\u65B0\u5E7F\u573A", load));
      const tools = el("div", "", "guild-tools"), search = input(tools, "\u67E5\u627E\u59D4\u6258", query);
      search.placeholder = "\u6807\u9898\u6216\u76EE\u6807";
      search.setAttribute("aria-label", "\u67E5\u627E\u59D4\u6258");
      const filters = choice(tools, "\u8FDB\u5EA6", [["", "\u5168\u90E8\u8FDB\u5EA6"], ["open", "\u53EF\u63A5\u53D6"], ["active", "\u8FDB\u884C\u4E2D"], ["submitted", "\u5F85\u9A8C\u6536"], ["delivery", "\u5F85\u6536\u8D27"], ["completed", "\u5DF2\u5B8C\u6210"]]);
      filters.value = status;
      tools.querySelector(".guild-select").textContent = status ? labels[status] : "\u5168\u90E8\u8FDB\u5EA6";
      const apply = () => {
        query = search.value.trim();
        status = filters.value;
        offset = 0;
        return load();
      };
      filters.onchange = apply;
      tools.append(button("\u67E5\u627E", apply));
      search.onkeydown = (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          void apply();
        }
      };
      root.append(tools);
      if (!regions) root.append(el("p", "\u53EF\u7528\u79EF\u5206 " + data.wallet.balance + " \xB7 \u5956\u52B1\u6258\u7BA1\u540E\u53D1\u5E03\uFF0C\u901A\u8FC7\u9A8C\u6536\u540E\u7ED3\u7B97\u3002", "guild-muted"));
      else search.parentElement.firstChild.remove();
      const grid = el("div", "", "guild-grid");
      root.append(grid);
      for (const t of data.items) {
        const card = el("article", "", "guild-card guild-commission"), meta = el("div", "", "guild-meta");
        card.dataset.reward = t.reward_type;
        card.dataset.status = t.ownClaim?.status || t.status;
        card.dataset.commission = t.id;
        card.setAttribute("aria-current", String(t.id === selected));
        const cover = el("div", "", "guild-cover");
        if (t.images.length) void image(cover, t.images[0]);
        else {
          cover.append(emblem(t.reward_type), el("span", t.reward_type === "points" ? "\u79EF\u5206\u59D4\u6258" : t.reward_type === "inventory" ? "\u7269\u8D44\u59D4\u6258" : t.reward_type === "items" ? "\u9053\u5177\u59D4\u6258" : "\u534F\u4F5C\u59D4\u6258"));
        }
        const badge = el("span", t.ownClaim ? "\u6211\u7684\u8FDB\u5EA6 \xB7 " + labels[t.ownClaim.status] : labels[t.status] || t.status, "guild-status-badge");
        meta.append(el("time", new Date(t.created).toLocaleDateString("zh-CN")), badge);
        card.append(cover, meta, el("h3", t.title), el("p", t.description.slice(0, 120), "guild-excerpt"), el("small", "\u59D4\u6258\u4EBA \xB7 " + t.name));
        const foot = el("footer"), reward = el("strong", rewardLabel(t), "guild-reward-badge");
        foot.append(reward, button(t.ownClaim?.status === "active" ? "\u7EE7\u7EED\u59D4\u6258" : t.ownClaim?.status === "delivery" ? "\u786E\u8BA4\u6536\u8D27" : t.status === "submitted" && t.mine ? "\u9A8C\u6536\u4EA4\u4ED8" : "\u67E5\u770B\u59D4\u6258", () => detail(t.id)));
        card.append(foot);
        grid.append(card);
      }
      if (!data.items.length) grid.append(el("article", "\u8FD9\u91CC\u8FD8\u6CA1\u6709\u59D4\u6258\u3002", "guild-card guild-muted"));
      const pages = el("footer", "", "guild-pagination"), prev = button("\u4E0A\u4E00\u9875", () => {
        offset = Math.max(0, offset - 24);
        return load();
      }), next = button("\u4E0B\u4E00\u9875", () => {
        offset += 24;
        return load();
      });
      prev.disabled = offset === 0;
      next.disabled = offset + 24 >= data.total;
      pages.append(prev, el("span", `${Math.floor(offset / 24) + 1} / ${Math.max(1, Math.ceil(data.total / 24))}`), next);
      root.append(pages);
    } catch (e) {
      error(e);
    }
  }
  async function create() {
    detailSurface();
    sequence++;
    const requestId = crypto.randomUUID(), h = header("\u53D1\u5E03\u59D4\u6258");
    h.append(button(regions ? "\u5173\u95ED" : "\u8FD4\u56DE\u5E7F\u573A", returnToBoard));
    const form = el("form", "", "guild-card guild-form");
    root.append(form);
    const title = input(form, "\u59D4\u6258\u6807\u9898"), description = input(form, "\u9700\u8981\u505A\u4EC0\u4E48\u3001\u9A8C\u6536\u6807\u51C6\u4E0E\u4EA4\u4ED8\u5730\u70B9", "", true), rewardType = choice(form, "\u5956\u52B1\u65B9\u5F0F", [["points", "\u6258\u7BA1\u79EF\u5206"], ["items", "\u6E38\u620F\u5185\u9053\u5177\u627F\u8BFA"], ...!consoleAdmin ? [["inventory", "\u80CC\u5305\u9053\u5177"]] : [], ["none", "\u65E0\u5956\u52B1"]]), reward = input(form, "\u79EF\u5206\u6570\u91CF / \u9053\u5177\u8BF4\u660E"), upload = uploader(form);
    title.maxLength = 100;
    description.maxLength = 12e3;
    reward.maxLength = 2e3;
    let inventoryItems = [];
    if (!consoleAdmin) try {
      inventoryItems = (await request("/api/inventory")).items.filter((item2) => item2.commission && item2.kind === "material");
    } catch {
    }
    if (!alive || !form.isConnected) return;
    const itemBox = el("section", "", "guild-reward-fields");
    form.insertBefore(itemBox, reward.parentElement);
    const item = choice(itemBox, "\u80CC\u5305\u7269\u54C1", inventoryItems.length ? inventoryItems.map((i) => [i.id, i.title + " \xB7 \u6301\u6709 " + i.quantity]) : [["", "\u6682\u65E0\u53EF\u7528\u4E8E\u59D4\u6258\u7684\u7269\u54C1"]]), quantity = input(itemBox, "\u5956\u52B1\u6570\u91CF", "1");
    quantity.type = "number";
    quantity.min = "1";
    const funding = manager ? choice(form, "\u79EF\u5206\u6765\u6E90", consoleAdmin ? [["admin", "\u534F\u4F1A\u53D1\u653E"]] : [["owner", "\u6211\u7684\u79EF\u5206\u4F59\u989D"], ["admin", "\u534F\u4F1A\u53D1\u653E\uFF08\u7BA1\u7406\u5458\uFF09"]]) : { value: "owner" };
    const updateReward = () => {
      itemBox.hidden = rewardType.value !== "inventory";
      reward.parentElement.hidden = ["none", "inventory"].includes(rewardType.value);
      reward.inputMode = rewardType.value === "points" ? "numeric" : "text";
      reward.placeholder = rewardType.value === "points" ? "\u586B\u5199\u6B63\u6574\u6570\u79EF\u5206" : "\u5199\u6E05\u695A\u6E38\u620F\u670D\u52A1\u5668\u3001\u9053\u5177\u540D\u79F0\u53CA\u6570\u91CF";
    };
    rewardType.onchange = updateReward;
    updateReward();
    form.append(el("p", "\u6240\u6709\u59D4\u6258\u5BA1\u6838\u540E\u516C\u5F00\u3002\u79EF\u5206\u4E0E\u80CC\u5305\u7269\u54C1\u5148\u6258\u7BA1\uFF1B\u6E38\u620F\u5185\u9053\u5177\u9700\u53CC\u65B9\u786E\u8BA4\u4EA4\u4ED8\u3002\u73A9\u5BB6\u95F4\u8F6C\u8D26\u4E0D\u4F1A\u91CD\u590D\u589E\u52A0\u699C\u5355\u79EF\u5206\u3002", "guild-muted"));
    form.append(button("\u63D0\u4EA4\u5BA1\u6838", async () => {
      if (upload.pick.disabled) throw Error("\u8BF7\u7B49\u5F85\u56FE\u7247\u4E0A\u4F20\u5B8C\u6210");
      const created = await request("/api/guild", "POST", { requestId, title: title.value, description: description.value, kind: "request", funding: funding.value, rewardType: rewardType.value, reward: rewardType.value === "inventory" ? JSON.stringify({ item: item.value, quantity: Number(quantity.value) }) : rewardType.value === "none" ? "" : reward.value, images: upload.urls });
      scope = "published";
      offset = 0;
      await load();
      await detail(created.id);
    }, true));
    form.onsubmit = (e) => e.preventDefault();
  }
  async function refreshAfterAction(id) {
    if (regions) await load();
    await detail(id);
  }
  async function detail(id, claimsOffset = 0) {
    const ticket = ++sequence;
    try {
      const t = await request("/api/guild/" + encodeURIComponent(id) + "?claimsOffset=" + claimsOffset);
      if (!alive || ticket !== sequence) return;
      detailSurface();
      selected = id;
      if (regions?.board) for (const item of regions.board.querySelectorAll("[data-commission]")) item.setAttribute("aria-current", String(item.dataset.commission === id));
      manager = !!t.manager;
      consoleAdmin = !!t.consoleAdmin;
      const h = header(t.title);
      h.append(button(regions ? "\u5173\u95ED\u8BE6\u60C5" : "\u8FD4\u56DE\u5E7F\u573A", returnToBoard));
      const card = el("article", "", "guild-card");
      card.append(el("p", labels[t.status] + " \xB7 \u59D4\u6258\u4EBA " + t.name, "guild-muted"), el("p", t.description, "guild-prose"), el("strong", rewardLabel(t)));
      root.append(card);
      pictures(card, t.images);
      if (t.note) card.append(el("p", "\u5904\u7406\u8BF4\u660E\uFF1A" + t.note));
      if (manager) {
        const code = input(card, "LINKING \u59D4\u6258\u6807\u8BC6", t.id);
        code.readOnly = true;
        code.onclick = () => code.select();
      }
      if (t.reward_type === "inventory") card.append(el("p", "\u7CFB\u7EDF\u6258\u7BA1\u5956\u52B1\uFF0C\u9A8C\u6536\u901A\u8FC7\u540E\u4F1A\u90AE\u5BC4\u5230\u63A5\u53D6\u4EBA\u7684\u80CC\u5305\u3002", "guild-muted"));
      const actions = el("div", "", "guild-actions");
      card.append(actions);
      const mine = t.ownClaim || t.claims.find((c) => c.uid === uid);
      progress(card, t, mine);
      if (t.status === "open" && !t.mine && (!mine || mine.status === "withdrawn")) actions.append(button("\u63A5\u53D6\u59D4\u6258", () => confirm("\u63A5\u53D6\u59D4\u6258", t.reward_type === "items" ? "\u9053\u5177\u7531\u59D4\u6258\u4EBA\u6E38\u620F\u5185\u4EA4\u4ED8\uFF0C\u5B8C\u6210\u540E\u9700\u8981\u59D4\u6258\u4EBA\u786E\u8BA4\u3002" : "\u8BA4\u9886\u540E\u5B8C\u6210\u76EE\u6807\u5E76\u63D0\u4EA4\u51ED\u8BC1\uFF0C\u901A\u8FC7\u9A8C\u6536\u540E\u83B7\u5F97\u5956\u52B1\u3002", async () => {
        await request("/api/guild/" + id + "/accept", "POST", {});
        await refreshAfterAction(id);
      }), true));
      if (manager && t.status === "review") {
        const note = input(card, "\u5BA1\u6838\u8BF4\u660E", "", true);
        actions.append(button("\u901A\u8FC7\u5E76\u53D1\u5E03", async () => {
          await request("/api/guild/" + id + "/review", "POST", { status: "approved", note: note.value });
          await refreshAfterAction(id);
        }, true), button("\u9000\u56DE\u5E76\u9000\u6B3E", async () => {
          await request("/api/guild/" + id + "/review", "POST", { status: "rejected", note: note.value });
          await refreshAfterAction(id);
        }));
      }
      if (mine?.status === "delivery") {
        const receipt = el("section", "", "guild-card");
        receipt.append(el("h3", "\u786E\u8BA4\u6536\u5230\u6E38\u620F\u5185\u9053\u5177"), el("p", t.reward), el("p", "\u5982\u679C\u5C1A\u672A\u6536\u5230\uFF0C\u8BF7\u8054\u7CFB\u59D4\u6258\u4EBA\u6216\u7BA1\u7406\u5458\uFF0C\u4E0D\u8981\u63D0\u524D\u786E\u8BA4\u3002", "guild-muted"), button("\u6211\u5DF2\u6536\u5230\u9053\u5177", () => confirm("\u786E\u8BA4\u6536\u8D27", "\u786E\u8BA4\u540E\u6B64\u59D4\u6258\u7ED3\u675F\uFF0CLINKING \u7B49\u6D3B\u52A8\u8FDB\u5EA6\u5C06\u540C\u6B65\u89E3\u9501\u3002", async () => {
          await request("/api/guild/" + id + "/receipt", "POST", { received: true });
          await refreshAfterAction(id);
        }), true));
        root.append(receipt);
      }
      if (mine?.status === "active") {
        const form = el("section", "", "guild-card guild-form");
        form.append(el("h3", "\u63D0\u4EA4\u5B8C\u6210\u51ED\u8BC1"));
        const evidence = input(form, "\u5B8C\u6210\u8BF4\u660E", mine.body || "", true), upload = uploader(form, mine.images || []);
        evidence.maxLength = 8e3;
        form.append(button("\u63D0\u4EA4\u9A8C\u6536", async () => {
          if (upload.pick.disabled) throw Error("\u8BF7\u7B49\u5F85\u4E0A\u4F20\u5B8C\u6210");
          await request("/api/guild/" + id + "/submit", "POST", { body: evidence.value, images: upload.urls });
          await refreshAfterAction(id);
        }, true));
        root.append(form);
        const withdraw = el("details", "", "guild-card");
        withdraw.append(el("summary", "\u653E\u5F03\u6B64\u6B21\u8BA4\u9886"));
        const note = input(withdraw, "\u653E\u5F03\u539F\u56E0");
        withdraw.append(button("\u653E\u5F03\u5E76\u91CD\u65B0\u5F00\u653E", () => confirm("\u653E\u5F03\u6B64\u6B21\u8BA4\u9886", "\u4E0D\u4F1A\u83B7\u5F97\u672C\u6B21\u5956\u52B1\u3002\u59D4\u6258\u5C06\u91CD\u65B0\u5F00\u653E\uFF0C\u6258\u7BA1\u79EF\u5206\u4ECD\u5F52\u59D4\u6258\u4EBA\u6240\u6709\u3002", async () => {
          await request("/api/guild/" + id + "/withdraw", "POST", { note: note.value });
          await refreshAfterAction(id);
        })));
        root.append(withdraw);
      }
      for (const c of t.claims) {
        const claim = el("article", "", "guild-card");
        claim.append(el("h3", c.name + " \xB7 " + labels[c.status]), el("p", c.body, "guild-prose"));
        pictures(claim, c.images);
        if (c.note) claim.append(el("p", "\u786E\u8BA4\u610F\u89C1\uFF1A" + c.note));
        if (c.status === "submitted" && (manager || t.mine)) {
          const note = input(claim, "\u9A8C\u6536\u8BF4\u660E", "", true), bar = el("div", "", "guild-actions");
          bar.append(button(t.reward_type === "items" ? "\u5DF2\u4EA4\u4ED8\uFF0C\u901A\u77E5\u5BF9\u65B9\u6536\u8D27" : "\u786E\u8BA4\u5B8C\u6210\u5E76\u7ED3\u7B97", () => confirm("\u786E\u8BA4\u5B8C\u6210", t.reward_type === "points" ? "\u9A8C\u6536\u901A\u8FC7\u540E\u5C06\u5411 " + c.name + " \u53D1\u653E " + t.reward + " \u79EF\u5206\u3002" : t.reward_type === "items" ? "\u8BF7\u786E\u8BA4\u5DF2\u5728\u6E38\u620F\u4E2D\u5411 " + c.name + " \u4EA4\u4ED8\uFF1A" + t.reward : t.reward_type === "inventory" ? "\u80CC\u5305\u7269\u54C1\u5C06\u901A\u8FC7\u90AE\u4EF6\u81EA\u52A8\u4EA4\u4ED8\u7ED9\u5BF9\u65B9\u3002" : "\u786E\u8BA4\u8BE5\u59D4\u6258\u5DF2\u7ECF\u5B8C\u6210\u3002", async () => {
            await request("/api/guild/" + id + "/resolve", "POST", { claim: c.id, approved: true, delivered: t.reward_type === "items", note: note.value });
            await refreshAfterAction(id);
          }), true), button("\u8981\u6C42\u8865\u5145", async () => {
            await request("/api/guild/" + id + "/resolve", "POST", { claim: c.id, approved: false, note: note.value });
            await refreshAfterAction(id);
          }));
          claim.append(bar);
        }
        root.append(claim);
      }
      if (t.claimTotal > 30) {
        const pages = el("footer", "", "guild-pagination"), prev = button("\u4E0A\u4E00\u9875\u51ED\u8BC1", () => detail(id, Math.max(0, claimsOffset - 30))), next = button("\u4E0B\u4E00\u9875\u51ED\u8BC1", () => detail(id, claimsOffset + 30));
        prev.disabled = claimsOffset === 0;
        next.disabled = claimsOffset + 30 >= t.claimTotal;
        pages.append(prev, el("span", `${Math.floor(claimsOffset / 30) + 1} / ${Math.ceil(t.claimTotal / 30)}`), next);
        root.append(pages);
      }
      if ((t.mine || manager) && ["review", "open", ...manager ? ["active", "submitted", "delivery"] : []].includes(t.status)) {
        const box = el("details", "", "guild-card");
        box.append(el("summary", "\u64A4\u9500\u59D4\u6258"));
        const note = input(box, "\u64A4\u9500\u539F\u56E0");
        box.append(button("\u786E\u8BA4\u64A4\u9500\u5E76\u9000\u8FD8\u672A\u7ED3\u7B97\u79EF\u5206", async () => {
          await request("/api/guild/" + id + "/cancel", "POST", { note: note.value || "\u59D4\u6258\u4EBA\u64A4\u9500" });
          await refreshAfterAction(id);
        }));
        root.append(box);
      }
    } catch (e) {
      error(e);
    }
  }
  const surfaces = [.../* @__PURE__ */ new Set([base, ...Object.values(regions || {})])];
  for (const surface of surfaces) surface.classList.add("guild-workspace");
  void (regions ? load().then(() => initialTask && detail(initialTask)) : selected ? detail(selected) : load());
  return () => {
    alive = false;
    sequence++;
    for (const dialog of overlays) dialog.remove();
    overlays.clear();
    for (const surface of surfaces) surface.replaceChildren();
  };
}
export {
  mountGuild
};
