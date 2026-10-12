// packages/community/image-upload.mjs
async function communityImage(file) {
  if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 12 * 1024 * 1024) throw Error("\u8BF7\u9009\u62E9 12 MB \u4EE5\u5185\u7684 PNG\u3001JPG \u6216 WebP \u56FE\u7247");
  const image = await createImageBitmap(file);
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
var labels = { review: "\u7B49\u5F85\u5BA1\u6838", open: "\u53EF\u8BA4\u9886", active: "\u8FDB\u884C\u4E2D", submitted: "\u5F85\u786E\u8BA4", completed: "\u5DF2\u5B8C\u6210", rejected: "\u672A\u901A\u8FC7", cancelled: "\u5DF2\u64A4\u9500", withdrawn: "\u5DF2\u653E\u5F03" };
function mountGuild(root, { request, uid = "", initialTask = "", admin = false }) {
  let alive = true, sequence = 0, scope = "public", offset = 0, manager = admin, consoleAdmin = false, selected = initialTask;
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
    let status = target.querySelector(".guild-error");
    if (!status) {
      status = el("p", "", "guild-error");
      status.role = "alert";
      target.prepend(status);
    }
    status.textContent = e.message || String(e);
    status.scrollIntoView({ block: "nearest" });
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
  function progress(parent, t, mine) {
    const stage = mine?.status === "completed" || t.status === "completed" ? 4 : mine?.status === "submitted" || t.status === "submitted" ? 3 : mine?.status === "active" || t.status === "active" ? 2 : t.status === "open" ? 1 : 0;
    const steps = el("ol", "", "guild-progress");
    ["\u5BA1\u6838\u53D1\u5E03", "\u8BA4\u9886\u4EFB\u52A1", "\u63D0\u4EA4\u51ED\u8BC1", "\u786E\u8BA4\u4EA4\u4ED8", "\u5B8C\u6210\u7ED3\u7B97"].forEach((label, index) => {
      const step = el("li", label, index < stage ? "done" : index === stage ? "current" : "");
      step.setAttribute("aria-current", index === stage ? "step" : "false");
      steps.append(step);
    });
    parent.append(steps);
    const messages = { active: mine?.note ? "\u9A8C\u6536\u4EBA\u8981\u6C42\u8865\u5145\uFF1A" + mine.note : "\u6309\u59D4\u6258\u8981\u6C42\u5B8C\u6210\u4EFB\u52A1\uFF0C\u7136\u540E\u63D0\u4EA4\u8BF4\u660E\u4E0E\u622A\u56FE\u3002", submitted: "\u51ED\u8BC1\u5DF2\u63D0\u4EA4\uFF0C\u7B49\u5F85\u59D4\u6258\u4EBA\u6216\u7BA1\u7406\u5458\u9A8C\u6536\u3002", completed: t.reward_type === "points" ? "\u4EFB\u52A1\u5DF2\u5B8C\u6210\uFF0C\u79EF\u5206\u5DF2\u5165\u8D26\u3002" : t.reward_type === "items" ? "\u4EFB\u52A1\u5DF2\u5B8C\u6210\uFF0C\u9A8C\u6536\u4EBA\u5DF2\u786E\u8BA4\u4EA4\u4ED8\u9053\u5177\u3002" : "\u4EFB\u52A1\u5DF2\u5B8C\u6210\u3002", withdrawn: "\u4F60\u5DF2\u653E\u5F03\u6B64\u59D4\u6258\uFF1B\u4ECD\u5F00\u653E\u65F6\u53EF\u4EE5\u91CD\u65B0\u8BA4\u9886\u3002" };
    const status = el("p", messages[mine?.status] || (t.status === "submitted" ? "\u6709\u51ED\u8BC1\u7B49\u5F85\u4F60\u9A8C\u6536\u3002" : t.status === "review" ? "\u7B49\u5F85\u7BA1\u7406\u5458\u5BA1\u6838\uFF1B\u901A\u8FC7\u540E\u624D\u4F1A\u51FA\u73B0\u5728\u5E7F\u573A\u3002" : t.status === "open" ? "\u4EFB\u52A1\u5DF2\u5F00\u653E\uFF0C\u53EF\u4EE5\u8BA4\u9886\u3002" : t.status === "active" ? "\u5DF2\u6709\u65C5\u4EBA\u6B63\u5728\u5B8C\u6210\u4EFB\u52A1\u3002" : labels[t.status]), "guild-status-note");
    parent.append(status);
  }
  function header(title) {
    root.replaceChildren();
    const h = el("header", "", "guild-header");
    h.append(el("h2", title));
    root.append(h);
    return h;
  }
  async function load() {
    const ticket = ++sequence;
    try {
      const data = await request("/api/guild?scope=" + scope + "&offset=" + offset);
      if (!alive || ticket !== sequence) return;
      manager = !!data.manager;
      consoleAdmin = !!data.consoleAdmin;
      const h = header("\u5192\u9669\u8005\u516C\u4F1A");
      h.append(button("\u53D1\u5E03\u59D4\u6258", create, true));
      const nav = el("nav", "", "guild-tabs");
      for (const [v, t] of [["public", "\u59D4\u6258\u5E7F\u573A"], ["main", "\u4E3B\u7EBF\u4EFB\u52A1"], ["mine", "\u6211\u7684\u59D4\u6258"], ...manager ? [["review", "\u5BA1\u6838\u961F\u5217"]] : []]) {
        const b = button(t, () => {
          scope = v;
          offset = 0;
          selected = "";
          return load();
        });
        b.setAttribute("aria-pressed", String(v === scope));
        nav.append(b);
      }
      root.append(nav);
      const summary = el("p", "\u53EF\u7528\u79EF\u5206 " + data.wallet.balance + " \xB7 \u79EF\u5206\u59D4\u6258\u5148\u6258\u7BA1\uFF0C\u5B8C\u6210\u540E\u7ED3\u7B97\u3002", "guild-muted");
      root.append(summary);
      const grid = el("div", "", "guild-grid");
      root.append(grid);
      for (const t of data.items) {
        const card = el("article", "", "guild-card"), meta = el("div", "", "guild-meta");
        meta.append(el("span", t.kind === "main" ? "\u4E3B\u7EBF\u4EFB\u52A1" : "\u73A9\u5BB6\u59D4\u6258"), el("span", t.ownClaim ? "\u6211\u7684\u8FDB\u5EA6 \xB7 " + labels[t.ownClaim.status] : labels[t.status] || t.status));
        card.append(meta, el("h3", t.title), el("p", t.description.slice(0, 120), "guild-excerpt"), el("small", "\u59D4\u6258\u4EBA \xB7 " + t.name));
        const foot = el("footer");
        foot.append(el("strong", t.reward_type === "points" ? t.reward + " \u79EF\u5206" : t.reward_type === "items" ? "\u6E38\u620F\u5185\u9053\u5177" : "\u65E0\u79EF\u5206\u5956\u52B1"), button("\u67E5\u770B\u59D4\u6258", () => detail(t.id)));
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
  function create() {
    sequence++;
    const requestId = crypto.randomUUID(), h = header("\u53D1\u5E03\u59D4\u6258");
    h.append(button("\u8FD4\u56DE\u5E7F\u573A", load));
    const form = el("form", "", "guild-card guild-form");
    root.append(form);
    const title = input(form, "\u6807\u9898"), description = input(form, "\u76EE\u6807\u3001\u9A8C\u6536\u6807\u51C6\u4E0E\u4EA4\u4ED8\u65B9\u5F0F", "", true), kind = choice(form, "\u59D4\u6258\u7C7B\u578B", [...manager ? [["main", "\u7BA1\u7406\u5458\u4E3B\u7EBF"]] : [], ...!consoleAdmin ? [["request", "\u73A9\u5BB6\u59D4\u6258"]] : []]), rewardType = choice(form, "\u5956\u52B1", [["points", "\u79EF\u5206"], ["items", "\u6E38\u620F\u5185\u9053\u5177\u627F\u8BFA"], ["none", "\u65E0\u5956\u52B1"]]), reward = input(form, "\u79EF\u5206\u6570\u91CF / \u9053\u5177\u8BF4\u660E"), upload = uploader(form);
    title.maxLength = 100;
    description.maxLength = 12e3;
    reward.maxLength = 2e3;
    form.append(el("p", "\u53D1\u5E03\u540E\u9700\u7BA1\u7406\u5458\u5BA1\u6838\u3002\u9053\u5177\u7531\u59D4\u6258\u4EBA\u7EBF\u4E0B\u4EA4\u4ED8\uFF1B\u73A9\u5BB6\u79EF\u5206\u8F6C\u8D26\u4E0D\u91CD\u590D\u589E\u52A0\u6392\u884C\u699C\u79EF\u5206\u3002", "guild-muted"));
    form.append(button("\u63D0\u4EA4\u5BA1\u6838", async () => {
      if (upload.pick.disabled) throw Error("\u8BF7\u7B49\u5F85\u56FE\u7247\u4E0A\u4F20\u5B8C\u6210");
      await request("/api/guild", "POST", { requestId, title: title.value, description: description.value, kind: kind.value, rewardType: rewardType.value, reward: reward.value, images: upload.urls });
      scope = "mine";
      offset = 0;
      await load();
    }, true));
    form.onsubmit = (e) => e.preventDefault();
  }
  async function detail(id, claimsOffset = 0) {
    const ticket = ++sequence;
    try {
      const t = await request("/api/guild/" + encodeURIComponent(id) + "?claimsOffset=" + claimsOffset);
      if (!alive || ticket !== sequence) return;
      selected = id;
      manager = !!t.manager;
      consoleAdmin = !!t.consoleAdmin;
      const h = header(t.title);
      h.append(button("\u8FD4\u56DE\u5E7F\u573A", () => {
        selected = "";
        return load();
      }));
      const card = el("article", "", "guild-card");
      card.append(el("p", (t.kind === "main" ? "\u4E3B\u7EBF\u4EFB\u52A1" : "\u73A9\u5BB6\u59D4\u6258") + " \xB7 " + labels[t.status] + " \xB7 " + t.name, "guild-muted"), el("p", t.description, "guild-prose"), el("strong", t.reward_type === "points" ? t.reward + " \u79EF\u5206" : t.reward_type === "items" ? t.reward : "\u65E0\u989D\u5916\u5956\u52B1"));
      root.append(card);
      pictures(card, t.images);
      if (t.note) card.append(el("p", "\u5904\u7406\u8BF4\u660E\uFF1A" + t.note));
      if (manager && t.kind === "main") {
        const code = input(card, "LINKING \u4E3B\u7EBF\u4EFB\u52A1\u6807\u8BC6", t.id);
        code.readOnly = true;
        code.onclick = () => code.select();
      }
      const actions = el("div", "", "guild-actions");
      card.append(actions);
      const mine = t.ownClaim || t.claims.find((c) => c.uid === uid);
      progress(card, t, mine);
      if (t.status === "open" && !t.mine && (!mine || mine.status === "withdrawn")) actions.append(button("\u8BA4\u9886\u59D4\u6258", () => confirm("\u8BA4\u9886\u59D4\u6258", t.reward_type === "items" ? "\u9053\u5177\u7531\u59D4\u6258\u4EBA\u6E38\u620F\u5185\u4EA4\u4ED8\uFF0C\u5B8C\u6210\u540E\u9700\u8981\u59D4\u6258\u4EBA\u786E\u8BA4\u3002" : "\u8BA4\u9886\u540E\u5B8C\u6210\u76EE\u6807\u5E76\u63D0\u4EA4\u51ED\u8BC1\uFF0C\u901A\u8FC7\u9A8C\u6536\u540E\u83B7\u5F97\u5956\u52B1\u3002", async () => {
        await request("/api/guild/" + id + "/accept", "POST", {});
        await detail(id);
      }), true));
      if (manager && t.status === "review") {
        const note = input(card, "\u5BA1\u6838\u8BF4\u660E", "", true);
        actions.append(button("\u901A\u8FC7\u5E76\u53D1\u5E03", async () => {
          await request("/api/guild/" + id + "/review", "POST", { status: "approved", note: note.value });
          await detail(id);
        }, true), button("\u9000\u56DE\u5E76\u9000\u6B3E", async () => {
          await request("/api/guild/" + id + "/review", "POST", { status: "rejected", note: note.value });
          await detail(id);
        }));
      }
      if (mine?.status === "active") {
        const form = el("section", "", "guild-card guild-form");
        form.append(el("h3", "\u63D0\u4EA4\u5B8C\u6210\u51ED\u8BC1"));
        const evidence = input(form, "\u5B8C\u6210\u8BF4\u660E", mine.body || "", true), upload = uploader(form, mine.images || []);
        evidence.maxLength = 8e3;
        form.append(button("\u63D0\u4EA4\u9A8C\u6536", async () => {
          if (upload.pick.disabled) throw Error("\u8BF7\u7B49\u5F85\u4E0A\u4F20\u5B8C\u6210");
          await request("/api/guild/" + id + "/submit", "POST", { body: evidence.value, images: upload.urls });
          await detail(id);
        }, true));
        root.append(form);
        const withdraw = el("details", "", "guild-card");
        withdraw.append(el("summary", "\u653E\u5F03\u6B64\u6B21\u8BA4\u9886"));
        const note = input(withdraw, "\u653E\u5F03\u539F\u56E0");
        withdraw.append(button("\u653E\u5F03\u5E76\u91CD\u65B0\u5F00\u653E", () => confirm("\u653E\u5F03\u6B64\u6B21\u8BA4\u9886", "\u4E0D\u4F1A\u83B7\u5F97\u672C\u6B21\u5956\u52B1\u3002\u59D4\u6258\u5C06\u91CD\u65B0\u5F00\u653E\uFF0C\u6258\u7BA1\u79EF\u5206\u4ECD\u5F52\u59D4\u6258\u4EBA\u6240\u6709\u3002", async () => {
          await request("/api/guild/" + id + "/withdraw", "POST", { note: note.value });
          await detail(id);
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
          bar.append(button(t.reward_type === "items" ? "\u786E\u8BA4\u9053\u5177\u5DF2\u4EA4\u4ED8" : "\u786E\u8BA4\u5B8C\u6210\u5E76\u7ED3\u7B97", () => confirm("\u786E\u8BA4\u5B8C\u6210", t.reward_type === "points" ? "\u9A8C\u6536\u901A\u8FC7\u540E\u5C06\u5411 " + c.name + " \u53D1\u653E " + t.reward + " \u79EF\u5206\u3002" : t.reward_type === "items" ? "\u8BF7\u786E\u8BA4\u5DF2\u5728\u6E38\u620F\u4E2D\u5411 " + c.name + " \u4EA4\u4ED8\uFF1A" + t.reward : "\u786E\u8BA4\u8BE5\u4EFB\u52A1\u5DF2\u7ECF\u5B8C\u6210\u3002", async () => {
            await request("/api/guild/" + id + "/resolve", "POST", { claim: c.id, approved: true, delivered: t.reward_type === "items", note: note.value });
            await detail(id);
          }), true), button("\u8981\u6C42\u8865\u5145", async () => {
            await request("/api/guild/" + id + "/resolve", "POST", { claim: c.id, approved: false, note: note.value });
            await detail(id);
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
      if ((t.mine || manager) && ["review", "open", ...manager ? ["active", "submitted"] : []].includes(t.status)) {
        const box = el("details", "", "guild-card");
        box.append(el("summary", "\u64A4\u9500\u59D4\u6258"));
        const note = input(box, "\u64A4\u9500\u539F\u56E0");
        box.append(button("\u786E\u8BA4\u64A4\u9500\u5E76\u9000\u8FD8\u672A\u7ED3\u7B97\u79EF\u5206", async () => {
          await request("/api/guild/" + id + "/cancel", "POST", { note: note.value || "\u59D4\u6258\u4EBA\u64A4\u9500" });
          await detail(id);
        }));
        root.append(box);
      }
    } catch (e) {
      error(e);
    }
  }
  root.classList.add("guild-workspace");
  void (selected ? detail(selected) : load());
  return () => {
    alive = false;
    sequence++;
    for (const dialog of overlays) dialog.remove();
    overlays.clear();
    root.replaceChildren();
  };
}
export {
  mountGuild
};
