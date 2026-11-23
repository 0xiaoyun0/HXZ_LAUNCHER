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

// packages/inventory/ui.mjs
var labels = { "lobby.host": "\u8054\u673A\u5F00\u623F", "music.netease": "\u7F51\u6613\u4E91\u767B\u5F55" };
var when = (time) => new Date(time).toLocaleString("zh-CN", { hour12: false });
var description = (item) => item.kind === "voucher" ? (labels[item.permission] || item.permission) + " \xB7 " + item.duration + (item.unit === "months" ? " \u4E2A\u6708" : " \u5929") : item.kind === "material" ? item.commission ? "\u6750\u6599 \xB7 \u53EF\u7528\u4E8E\u59D4\u6258" : "\u6750\u6599" : "\u7EAA\u5FF5\u6536\u85CF";
function mountInventory(root, { request, management = false, canManage = false, dialogHost = () => {
} }) {
  let alive = true, generation = 0, data, query = "", tab = "items";
  const dialogs = /* @__PURE__ */ new Set();
  const el = (tag, value = "", cls = "") => {
    const node = document.createElement(tag);
    node.textContent = value;
    node.className = cls;
    return node;
  };
  const report = (error) => {
    if (!alive) return;
    const host = [...dialogs].at(-1) || root;
    let node = host.querySelector(".inventory-error");
    if (!node) {
      node = el("p", "", "inventory-error");
      node.setAttribute("role", "alert");
      host.prepend(node);
    }
    node.textContent = error.message || String(error);
  };
  const button = (label, run, primary = false) => {
    const node = el("button", label, primary ? "inventory-primary" : "");
    node.type = "button";
    node.onclick = async () => {
      if (node.disabled) return;
      node.disabled = true;
      try {
        await run();
      } catch (e) {
        report(e);
      } finally {
        node.disabled = false;
      }
    };
    return node;
  };
  const field = (parent, label, value = "", type = "text") => {
    const wrapper = el("label", label), node = el(type === "textarea" ? "textarea" : "input");
    if (type !== "textarea") node.type = type;
    node.value = value;
    wrapper.append(node);
    parent.append(wrapper);
    return node;
  };
  function modal(title) {
    const node = el("dialog", "", "inventory-dialog inventory-ui"), head = el("header"), contents = el("div", "", "inventory-form");
    const close = () => {
      node.close();
      node.remove();
      dialogs.delete(node);
      dialogHost(dialogs.size ? () => [...dialogs].at(-1)?.inventoryClose?.() : null);
    };
    node.inventoryClose = close;
    head.append(el("h2", title), button("\u5173\u95ED", close));
    node.append(head, contents);
    document.body.append(node);
    dialogs.add(node);
    node.addEventListener("cancel", (e) => {
      e.preventDefault();
      close();
    });
    dialogHost(close);
    node.showModal();
    return { node, contents, close };
  }
  function choice(parent, title, values, initial) {
    const wrapper = el("label", title), state = { value: initial ?? values[0]?.[0] ?? "" };
    const selected = () => values.find((row) => row[0] === state.value)?.[1] || "\u8BF7\u9009\u62E9";
    const trigger = button(selected(), () => {
      const dialog = modal(title);
      for (const [value, label] of values) {
        const option = button(label, () => {
          state.value = value;
          trigger.textContent = selected();
          dialog.close();
          state.onchange?.(value);
        });
        option.setAttribute("aria-pressed", String(state.value === value));
        dialog.contents.append(option);
      }
    });
    trigger.classList.add("inventory-select");
    trigger.setAttribute("aria-haspopup", "dialog");
    wrapper.append(trigger);
    parent.append(wrapper);
    return state;
  }
  function picture(parent, item) {
    const art = el("div", "", "inventory-art");
    parent.append(art);
    if (item.image) {
      const image = el("img");
      image.alt = item.title;
      image.loading = "lazy";
      request(item.image + "/data").then((value) => {
        if (alive && art.isConnected) {
          image.src = value.image;
          art.append(image);
        }
      }).catch(() => art.append(el("span", "\u56FE\u7247\u672A\u8F7D\u5165")));
    } else {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("viewBox", "0 0 32 32");
      svg.setAttribute("aria-hidden", "true");
      const path = document.createElementNS(svg.namespaceURI, "path");
      path.setAttribute("d", item.kind === "voucher" ? "M5 7h22v6a3 3 0 0 0 0 6v6H5v-6a3 3 0 0 0 0-6V7Zm16 3v3m0 6v3" : "m16 4 11 6v13l-11 6-11-6V10l11-6Zm-11 6 11 6 11-6M16 16v13M11 7l11 6");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "currentColor");
      path.setAttribute("stroke-width", "1.5");
      path.setAttribute("stroke-linejoin", "round");
      svg.append(path);
      art.append(svg);
    }
  }
  async function load() {
    const stamp = ++generation;
    try {
      const value = await request(management ? "/api/admin/inventory" : "/api/inventory");
      if (!alive || stamp !== generation) return;
      data = value;
      draw();
    } catch (e) {
      report(e);
    }
  }
  function viewItem(item) {
    const dialog = modal(item.title);
    picture(dialog.contents, item);
    dialog.contents.append(el("p", item.description), el("small", description(item)));
    if (item.kind === "voucher") {
      const grant = data.grants?.find((row) => row.permission === item.permission);
      dialog.contents.append(el("p", grant ? "\u5F53\u524D\u6709\u6548\u81F3 " + when(grant.expires) + "\u3002\u4F7F\u7528\u540E\u5C06\u987A\u5EF6\u6709\u6548\u671F\u3002" : "\u786E\u8BA4\u4F7F\u7528\u540E\u5F00\u59CB\u8BA1\u65F6\uFF0C\u4F7F\u7528\u64CD\u4F5C\u4E0D\u80FD\u64A4\u9500\u3002", "inventory-note"));
      const requestId = crypto.randomUUID();
      dialog.contents.append(button("\u786E\u8BA4\u4F7F\u7528\u4E00\u5F20", async () => {
        const result = await request("/api/inventory/use", "POST", { batch: item.batches[0].id, requestId });
        dialog.close();
        await load();
        const done = modal("\u51ED\u8BC1\u5DF2\u751F\u6548");
        done.contents.append(el("p", "\u6709\u6548\u81F3 " + when(result.expires)), button("\u5B8C\u6210", done.close, true));
      }, true));
    } else dialog.contents.append(el("p", item.commission ? "\u53D1\u5E03\u59D4\u6258\u65F6\u53EF\u9009\u62E9\u6B64\u7269\u54C1\u4F5C\u4E3A\u5956\u52B1\u3002\u59D4\u6258\u901A\u8FC7\u540E\u4EA4\u4ED8\u7ED9\u63A5\u53D6\u4EBA\u3002" : "\u8BE5\u7269\u54C1\u4FDD\u7559\u5728\u80CC\u5305\u4E2D\uFF0C\u4E0D\u4F1A\u81EA\u52A8\u6D88\u8017\u3002", "inventory-note"));
  }
  function edit(item = {}) {
    const dialog = modal(item.id ? "\u7F16\u8F91\u9053\u5177" : "\u65B0\u5EFA\u9053\u5177"), form = dialog.contents;
    const title = field(form, "\u9053\u5177\u540D\u79F0", item.title || ""), desc = field(form, "\u8BF4\u660E", item.description || "", "textarea");
    title.maxLength = 100;
    desc.maxLength = 4e3;
    const kind = choice(form, "\u7C7B\u578B", [["material", "\u6750\u6599"], ["collectible", "\u6536\u85CF\u54C1"], ["voucher", "\u6743\u9650\u51ED\u8BC1"]], item.kind || "material");
    const access = el("div", "", "inventory-form");
    form.append(access);
    const permission = choice(access, "\u6388\u4E88\u6743\u9650", Object.entries(data.permissions), item.permission || "lobby.host");
    const duration = field(access, "\u6709\u6548\u65F6\u957F", item.duration || 3, "number"), unit = choice(access, "\u8BA1\u65F6\u5355\u4F4D", [["days", "\u5929\uFF0824 \u5C0F\u65F6\uFF09"], ["months", "\u81EA\u7136\u6708"]], item.unit || "days");
    duration.min = 1;
    duration.max = 366;
    const material = el("div");
    form.append(material);
    const usable = choice(material, "\u53EF\u4F5C\u4E3A\u59D4\u6258\u5956\u52B1", [[true, "\u5141\u8BB8"], [false, "\u4E0D\u5141\u8BB8"]], !!item.commission);
    const visibility = () => {
      access.hidden = kind.value !== "voucher";
      material.hidden = kind.value !== "material";
    };
    kind.onchange = visibility;
    visibility();
    const enabled = choice(form, "\u53D1\u653E\u72B6\u6001", [[true, "\u5F00\u653E\u53D1\u653E"], [false, "\u505C\u6B62\u65B0\u53D1\u653E"]], item.enabled !== 0);
    let image = item.image || "";
    const picker = field(form, "\u9053\u5177\u56FE\u7247", "", "file");
    picker.accept = "image/png,image/jpeg,image/webp";
    const preview = el("div");
    form.append(preview);
    if (image) picture(preview, item);
    picker.onchange = async () => {
      if (!picker.files?.[0]) return;
      picker.disabled = true;
      try {
        const encoded = await communityImage(picker.files[0]), result = await request("/api/media/upload", "POST", { scope: "inventory", image: encoded });
        image = result.url;
        preview.replaceChildren();
        picture(preview, { ...item, image });
      } catch (e) {
        report(e);
      } finally {
        picker.disabled = false;
        picker.value = "";
      }
    };
    form.append(button("\u79FB\u9664\u56FE\u7247", () => {
      image = "";
      preview.replaceChildren();
    }), el("p", "\u4FEE\u6539\u53EA\u5F71\u54CD\u4EE5\u540E\u53D1\u653E\u7684\u9053\u5177\uFF0C\u5DF2\u83B7\u5F97\u51ED\u8BC1\u7684\u6743\u9650\u548C\u65F6\u957F\u4FDD\u6301\u4E0D\u53D8\u3002", "inventory-note"), button("\u4FDD\u5B58\u9053\u5177", async () => {
      if (picker.disabled) throw Error("\u8BF7\u7B49\u5F85\u56FE\u7247\u4E0A\u4F20\u5B8C\u6210");
      await request("/api/admin/inventory/items", "POST", { id: item.id, updated: item.updated, title: title.value, description: desc.value, kind: kind.value, permission: permission.value, unit: unit.value, duration: Number(duration.value), commission: usable.value, enabled: enabled.value, image });
      dialog.close();
      await load();
    }, true));
  }
  function distribute(code = false) {
    const available = data.items.filter((item2) => item2.enabled);
    if (!available.length) throw Error("\u8BF7\u5148\u521B\u5EFA\u5E76\u542F\u7528\u9053\u5177");
    const dialog = modal(code ? "\u521B\u5EFA\u9053\u5177\u5151\u6362\u7801" : "\u90AE\u5BC4\u9053\u5177"), form = dialog.contents;
    const item = choice(form, "\u9053\u5177", available.map((row) => [row.id, row.title])), quantity = field(form, "\u6BCF\u4EBA\u6570\u91CF", 1, "number");
    quantity.min = 1;
    quantity.max = 99999;
    const requestId = crypto.randomUUID();
    if (code) {
      const codeField = field(form, "\u81EA\u5B9A\u4E49\u5151\u6362\u7801"), start = field(form, "\u5F00\u59CB\u65F6\u95F4\uFF08\u672C\u673A\u65F6\u533A\uFF09", "", "datetime-local"), end = field(form, "\u7ED3\u675F\u65F6\u95F4\uFF08\u4E0D\u586B\u5219\u957F\u671F\uFF09", "", "datetime-local"), maximum = field(form, "\u603B\u9886\u53D6\u6B21\u6570\uFF080 \u4E3A\u4E0D\u9650\uFF09", 0, "number");
      codeField.maxLength = 64;
      maximum.min = 0;
      form.append(el("p", "\u6BCF\u4E2A\u6210\u5458\u53EA\u80FD\u9886\u53D6\u4E00\u6B21\uFF0C\u9886\u53D6\u7684\u51ED\u8BC1\u4ECD\u53D7\u80CC\u5305\u4E09\u5F20\u4E0A\u9650\u9650\u5236\u3002", "inventory-note"), button("\u521B\u5EFA\u5151\u6362\u7801", async () => {
        await request("/api/admin/inventory/codes", "POST", { item: item.value, quantity: Number(quantity.value), code: codeField.value, starts: start.value ? new Date(start.value).getTime() : 0, expires: end.value ? new Date(end.value).getTime() : 0, maxUses: Number(maximum.value) });
        dialog.close();
        tab = "codes";
        await load();
      }, true));
    } else {
      const title = field(form, "\u90AE\u4EF6\u6807\u9898", "\u6765\u81EA\u5E7B\u60F3\u9547\u7684\u793C\u7269"), search = field(form, "\u67E5\u627E\u6536\u4EF6\u4EBA"), list = el("div", "", "inventory-members"), selected = /* @__PURE__ */ new Set();
      form.append(list);
      const drawMembers = () => {
        list.replaceChildren();
        for (const member of data.members.filter((row) => (row.name + row.uid).toLowerCase().includes(search.value.toLowerCase()))) {
          const label = el("label", "", "inventory-member"), input = el("input");
          input.type = "checkbox";
          input.checked = selected.has(member.uid);
          input.onchange = () => input.checked ? selected.add(member.uid) : selected.delete(member.uid);
          label.append(input, el("span", member.name));
          list.append(label);
        }
      };
      search.oninput = drawMembers;
      drawMembers();
      form.append(button("\u9009\u62E9\u5F53\u524D\u5217\u8868\u5168\u90E8\u6210\u5458", () => {
        for (const member of data.members.filter((row) => (row.name + row.uid).toLowerCase().includes(search.value.toLowerCase()))) selected.add(member.uid);
        drawMembers();
      }), el("p", "\u7269\u54C1\u4F5C\u4E3A\u9644\u4EF6\u90AE\u5BC4\uFF0C\u6210\u5458\u5728\u8D26\u53F7\u80CC\u5305\u4E2D\u9886\u53D6\uFF1B\u80CC\u5305\u6EE1\u65F6\u90AE\u4EF6\u4F1A\u4FDD\u7559\u3002", "inventory-note"), button("\u786E\u8BA4\u90AE\u5BC4", async () => {
        await request("/api/admin/inventory/mail", "POST", { item: item.value, quantity: Number(quantity.value), title: title.value, recipients: [...selected], requestId });
        dialog.close();
        await load();
      }, true));
    }
  }
  function redeem() {
    const dialog = modal("\u5151\u6362\u9053\u5177"), code = field(dialog.contents, "\u9053\u5177\u5151\u6362\u7801");
    code.maxLength = 64;
    dialog.contents.append(button("\u9886\u53D6", async () => {
      await request("/api/inventory/redeem", "POST", { code: code.value });
      dialog.close();
      await load();
    }, true));
  }
  function draw() {
    root.replaceChildren();
    const head = el("header", "", "inventory-header"), actions = el("div", "", "inventory-actions");
    head.append(el("h2", management ? "\u7269\u54C1\u4E0E\u51ED\u8BC1\u7BA1\u7406" : "\u6211\u7684\u80CC\u5305"), actions);
    root.append(head);
    if (management) actions.append(button("\u65B0\u5EFA\u9053\u5177", () => edit(), true), button("\u90AE\u5BC4\u9053\u5177", () => distribute()), button("\u521B\u5EFA\u5151\u6362\u7801", () => distribute(true)));
    else actions.append(button("\u5151\u6362\u9053\u5177", redeem, true));
    actions.append(button("\u5237\u65B0", load));
    if (canManage && !management) actions.append(button("\u7BA1\u7406\u7269\u54C1", () => {
      management = true;
      tab = "items";
      return load();
    }));
    if (canManage && management) actions.append(button("\u8FD4\u56DE\u80CC\u5305", () => {
      management = false;
      tab = "items";
      return load();
    }));
    const tabs = el("nav", "", "inventory-tabs");
    const entries = management ? [["items", "\u9053\u5177\u5B9A\u4E49"], ["codes", "\u5151\u6362\u7801"]] : [["items", "\u6301\u6709\u7269\u54C1"], ["mail", "\u5F85\u9886\u53D6" + (data.mail.length ? " \xB7 " + data.mail.length : "")], ["grants", "\u5F53\u524D\u6743\u76CA"]];
    for (const [key, label] of entries) {
      const control = button(label, () => {
        tab = key;
        draw();
      });
      control.setAttribute("aria-pressed", String(tab === key));
      tabs.append(control);
    }
    root.append(tabs);
    if (tab === "items") {
      const search = field(root, "\u67E5\u627E\u7269\u54C1", query);
      search.placeholder = "\u540D\u79F0\u6216\u6743\u9650";
      const grid = el("div", "", "inventory-grid");
      root.append(grid);
      const drawItems = () => {
        grid.replaceChildren();
        for (const item of data.items.filter((row) => (row.title + row.description + description(row)).toLowerCase().includes(query.toLowerCase()))) {
          const card = el("article", "", "inventory-card");
          picture(card, item);
          card.append(el("h3", item.title), el("small", description(item)), el("p", item.description));
          const footer = el("footer");
          footer.append(el("strong", management ? item.enabled ? "\u5F00\u653E" : "\u5DF2\u505C\u7528" : "\xD7 " + item.quantity), button(management ? "\u7F16\u8F91" : item.kind === "voucher" ? "\u4F7F\u7528" : "\u67E5\u770B", () => management ? edit(item) : viewItem(item), !management && item.kind === "voucher"));
          card.append(footer);
          grid.append(card);
        }
        if (!grid.children.length) grid.append(el("p", query ? "\u6CA1\u6709\u5339\u914D\u7684\u7269\u54C1" : "\u80CC\u5305\u7A7A\u7A7A\u7684\uFF0C\u53BB\u5546\u57CE\u5151\u6362\u6216\u9886\u53D6\u7BA1\u7406\u5458\u7684\u793C\u7269\u3002", "inventory-empty"));
      };
      search.oninput = () => {
        query = search.value;
        drawItems();
      };
      drawItems();
    } else if (tab === "mail") {
      const grid = el("div", "", "inventory-grid");
      root.append(grid);
      for (const message of data.mail) {
        const card = el("article", "", "inventory-card");
        picture(card, message.snapshot);
        card.append(el("h3", message.title), el("p", message.snapshot.title + " \xD7 " + message.quantity), el("small", when(message.created)), button("\u9886\u53D6\u9644\u4EF6", async () => {
          await request("/api/inventory/claim", "POST", { id: message.id });
          await load();
        }, true));
        grid.append(card);
      }
      if (!data.mail.length) grid.append(el("p", "\u6240\u6709\u9644\u4EF6\u90FD\u5DF2\u9886\u53D6\u3002", "inventory-empty"));
    } else if (tab === "grants") {
      root.append(el("p", "\u8FD9\u91CC\u663E\u793A\u4F7F\u7528\u51ED\u8BC1\u83B7\u5F97\u7684\u9650\u65F6\u6743\u76CA\uFF1B\u7BA1\u7406\u5458\u76F4\u63A5\u6388\u4E88\u7684\u957F\u671F\u6743\u9650\u4E0D\u53D7\u51ED\u8BC1\u5230\u671F\u5F71\u54CD\u3002", "inventory-note"));
      for (const grant of data.grants) {
        const card = el("article", "", "inventory-card");
        card.append(el("h3", data.permissions[grant.permission]), el("p", "\u6709\u6548\u81F3 " + when(grant.expires)));
        root.append(card);
      }
      if (!data.grants.length) root.append(el("p", "\u6CA1\u6709\u6B63\u5728\u4F7F\u7528\u7684\u9650\u65F6\u51ED\u8BC1\u3002", "inventory-empty"));
    } else {
      const list = el("div", "", "inventory-grid");
      root.append(list);
      for (const code of data.codes) {
        const card = el("article", "", "inventory-card");
        card.append(el("h3", code.label), el("p", (data.items.find((item) => item.id === code.item)?.title || code.item) + " \xD7 " + code.quantity), el("small", "\u5DF2\u9886\u53D6 " + code.claimed + " / " + (code.max_uses || "\u4E0D\u9650\u91CF")), el("small", code.expires ? "\u622A\u6B62 " + when(code.expires) : "\u957F\u671F\u6709\u6548"), button(code.enabled ? "\u505C\u7528\u5151\u6362\u7801" : "\u542F\u7528\u5151\u6362\u7801", async () => {
          await request("/api/admin/inventory/codes", "POST", { id: code.id, enabled: !code.enabled });
          await load();
        }));
        list.append(card);
      }
      if (!data.codes.length) list.append(el("p", "\u8FD8\u6CA1\u6709\u9053\u5177\u5151\u6362\u7801\u3002", "inventory-empty"));
    }
  }
  root.classList.add("inventory-ui");
  root.append(el("p", "\u6B63\u5728\u6574\u7406\u80CC\u5305\u2026", "inventory-empty"));
  void load();
  return () => {
    alive = false;
    generation++;
    for (const dialog of dialogs) dialog.remove();
    dialogs.clear();
    dialogHost(null);
    root.replaceChildren();
  };
}
export {
  mountInventory
};
