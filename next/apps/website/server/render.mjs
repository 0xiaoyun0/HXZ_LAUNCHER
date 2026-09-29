// apps/website/src/entry-server.tsx
import { renderToString } from "react-dom/server";

// apps/website/src/Website.tsx
import { useState as useState2, useEffect as useEffect2 } from "react";
import { ArrowUpRight as ArrowUpRight2, ArrowRight, ArrowDown, Check as Check2, Copy, Menu, X, Plus as Plus2, Download, Monitor, Smartphone, Boxes, MessageCircle, Compass, Play, ShieldCheck, RefreshCw } from "lucide-react";

// apps/website/src/admin.tsx
import { useState, useEffect } from "react";
import { ArrowUpRight, ArrowLeft, Save, Upload, Globe, LogOut, History, Shield, Plus, Trash2, Check, Eye } from "lucide-react";
import { jsx, jsxs } from "react/jsx-runtime";
var labels = { name: "\u7AD9\u70B9\u540D\u79F0", origin: "\u6B63\u5F0F\u57DF\u540D", description: "\u641C\u7D22\u5F15\u64CE\u7B80\u4ECB", skin: "\u76AE\u80A4\u7AD9", rules: "\u670D\u52A1\u5668\u89C4\u5219", faq: "\u5343\u95EE\u4E07\u7B54", otherLauncher: "\u5176\u4ED6\u542F\u52A8\u5668\u6307\u5357", video: "\u5165\u670D\u6559\u7A0B\u89C6\u9891", adminVideo: "\u7BA1\u7406\u5458\u89C6\u9891\u4E3B\u9875", ownerVideo: "\u9547\u957F\u89C6\u9891\u4E3B\u9875", oopz: "OOPZ \u9080\u8BF7", oopzId: "OOPZ \u57DF ID", qq: "QQ \u7FA4\u53F7", github: "GitHub \u53D1\u5E03\u5730\u5740", eyebrow: "\u5F15\u5BFC\u77ED\u53E5", title: "\u4E3B\u6807\u9898\uFF08\u652F\u6301\u6362\u884C\uFF09", intro: "\u5185\u5BB9\u7B80\u4ECB", heroImage: "\u9996\u9875\u4E3B\u56FE", heroCaption: "\u56FE\u7247\u8BF4\u660E", primaryLabel: "\u4E3B\u8981\u6309\u94AE\u6587\u5B57", worldsTitle: "\u670D\u52A1\u5668\u533A\u57DF\u6807\u9898", communityTitle: "\u793E\u533A\u533A\u57DF\u6807\u9898", joinTitle: "\u5165\u670D\u533A\u57DF\u6807\u9898", showCommunity: "\u663E\u793A\u793E\u533A\u5185\u5BB9", showGuide: "\u663E\u793A\u5165\u670D\u6B65\u9AA4", footer: "\u9875\u811A\u6587\u6848", short: "\u670D\u52A1\u5668\u7B80\u79F0", english: "\u82F1\u6587\u77ED\u53E5", headline: "\u8BE6\u60C5\u9875\u4E3B\u6807\u9898", address: "\u670D\u52A1\u5668\u5730\u5740", version: "\u6E38\u620F\u7248\u672C", platform: "\u670D\u52A1\u7AEF\u7C7B\u578B", cycle: "\u5F53\u524D\u5468\u76EE", status: "\u8FD0\u884C\u72B6\u6001\u6587\u5B57", testing: "\u662F\u5426\u5904\u4E8E\u6D4B\u8BD5", fit: "\u9002\u5408\u7684\u73A9\u5BB6", note: "\u5165\u670D\u63D0\u793A", imageCaption: "\u56FE\u7247\u8BF4\u660E", image: "\u670D\u52A1\u5668\u56FE\u7247" };
function Admin() {
  const [csrf, setCsrf] = useState(""), [ready, setReady] = useState(false), [password, setPassword] = useState(""), [data, setData] = useState(null), [draft, setDraft] = useState(null), [tab, setTab] = useState("home"), [dirty, setDirty] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [notice, setNotice] = useState(""), [confirm, setConfirm] = useState(false), [oldPass, setOldPass] = useState(""), [newPass, setNewPass] = useState("");
  const api = async (path, method = "GET", body, token = csrf) => {
    const r = await fetch("/api/admin/" + path, { method, credentials: "same-origin", headers: { ...body instanceof File ? { "Content-Type": body.type } : body === void 0 ? {} : { "Content-Type": "application/json" }, "X-CSRF-Token": token }, body: body === void 0 ? void 0 : body instanceof File ? body : JSON.stringify(body) });
    const result = await r.json();
    if (!r.ok) {
      if (r.status === 401) setCsrf("");
      throw Error(result.error || "\u64CD\u4F5C\u672A\u5B8C\u6210");
    }
    return result;
  };
  const run = async (fn) => {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const load = async (token = csrf) => {
    const value = await api("content", "GET", void 0, token);
    setData(value);
    setDraft(value.draft);
    setDirty(false);
  };
  useEffect(() => {
    let alive = true;
    api("session").then(async (r) => {
      if (!alive) return;
      setCsrf(r.csrf);
      await load(r.csrf);
    }).catch(() => {
    }).finally(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    const before = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", before);
    return () => window.removeEventListener("beforeunload", before);
  }, [dirty]);
  const edit = (section, key, value, index) => {
    setDraft((d) => {
      const next = structuredClone(d);
      if (index == null) next[section][key] = value;
      else next[section][index][key] = value;
      return next;
    });
    setDirty(true);
  };
  const save = async () => {
    const result = await api("content", "PUT", { revision: data.revision, content: draft });
    setData({ ...data, revision: result.revision });
    setDirty(false);
    setNotice("\u8349\u7A3F\u5DF2\u4FDD\u5B58\uFF0C\u5C1A\u672A\u516C\u5F00\u53D1\u5E03\u3002");
    return result.revision;
  };
  const fields = (section, value, index) => Object.entries(value).filter(([k]) => labels[k]).map(([k, v]) => typeof v === "boolean" ? /* @__PURE__ */ jsxs("label", { className: "admin-switch", children: [
    /* @__PURE__ */ jsx("input", { type: "checkbox", checked: v, onChange: (e) => edit(section, k, e.target.checked, index) }),
    labels[k]
  ] }, k) : ["heroImage", "image"].includes(k) ? /* @__PURE__ */ jsxs("div", { className: "admin-image", children: [
    /* @__PURE__ */ jsx("label", { children: labels[k] }),
    /* @__PURE__ */ jsx("img", { src: v, alt: "\u5F53\u524D\u56FE\u7247" }),
    /* @__PURE__ */ jsxs("div", { children: [
      /* @__PURE__ */ jsxs("select", { value: v, onChange: (e) => edit(section, k, e.target.value, index), children: [
        !["/media/hero.webp", "/media/mechanical.webp", "/media/adventure.webp"].includes(v) && /* @__PURE__ */ jsx("option", { value: v, children: "\u81EA\u5B9A\u4E49\u56FE\u7247" }),
        /* @__PURE__ */ jsx("option", { value: "/media/hero.webp", children: "\u539F\u7248\u751F\u5B58\u63D2\u753B" }),
        /* @__PURE__ */ jsx("option", { value: "/media/mechanical.webp", children: "\u673A\u68B0\u4E0E\u5929\u7A7A\u63D2\u753B" }),
        /* @__PURE__ */ jsx("option", { value: "/media/adventure.webp", children: "\u65B0\u65F6\u4EE3\u79D1\u6280\u63D2\u753B" })
      ] }),
      /* @__PURE__ */ jsxs("label", { className: "site-button", children: [
        /* @__PURE__ */ jsx(Upload, { size: 15 }),
        " \u4E0A\u4F20\u56FE\u7247",
        /* @__PURE__ */ jsx("input", { type: "file", accept: "image/png,image/jpeg,image/webp", disabled: busy, onChange: (e) => {
          const file = e.target.files?.[0];
          if (file) void run(async () => {
            if (file.size > 8 * 1024 * 1024) throw Error("\u56FE\u7247\u4E0D\u80FD\u8D85\u8FC7 8 MB");
            const r = await api("media", "POST", file);
            edit(section, k, r.url, index);
          });
        } })
      ] })
    ] }),
    /* @__PURE__ */ jsx("small", { children: "PNG\u3001JPEG \u6216 WebP\uFF0C\u6700\u5927 8 MB\u3002\u4E0A\u4F20\u540E\u4FDD\u5B58\u8349\u7A3F\uFF0C\u518D\u53D1\u5E03\u3002" })
  ] }, k) : /* @__PURE__ */ jsxs("label", { className: "admin-field " + (["description", "intro", "note", "fit", "title", "headline"].includes(k) ? "wide" : ""), children: [
    labels[k],
    ["description", "intro", "note", "fit", "title", "headline"].includes(k) ? /* @__PURE__ */ jsx("textarea", { rows: k === "note" ? 4 : 3, value: v, onChange: (e) => edit(section, k, e.target.value, index) }) : /* @__PURE__ */ jsx("input", { value: v, onChange: (e) => edit(section, k, e.target.value, index) })
  ] }, k));
  if (!ready) return /* @__PURE__ */ jsx("div", { className: "admin-loading", children: "\u6B63\u5728\u8BFB\u53D6\u5185\u5BB9\u5DE5\u4F5C\u5BA4\u2026" });
  if (!csrf) return /* @__PURE__ */ jsxs("div", { className: "admin-login", children: [
    /* @__PURE__ */ jsxs("a", { className: "text-link", href: "/", children: [
      /* @__PURE__ */ jsx(ArrowLeft, { size: 17 }),
      " \u8FD4\u56DE\u5B98\u7F51"
    ] }),
    /* @__PURE__ */ jsxs("form", { onSubmit: (e) => {
      e.preventDefault();
      void run(async () => {
        const r = await api("session", "POST", { username: "admin", password });
        setCsrf(r.csrf);
        setPassword("");
        await load(r.csrf);
      });
    }, children: [
      /* @__PURE__ */ jsx("span", { children: "FANTASY TOWN / STUDIO" }),
      /* @__PURE__ */ jsx("h1", { children: "\u8BA9\u6545\u4E8B\u4FDD\u6301\u65B0\u9C9C\u3002" }),
      /* @__PURE__ */ jsx("p", { children: "\u767B\u5F55\u5B98\u7F51\u5185\u5BB9\u5DE5\u4F5C\u5BA4\u3002" }),
      /* @__PURE__ */ jsxs("label", { children: [
        "\u7BA1\u7406\u5458\u8D26\u53F7",
        /* @__PURE__ */ jsx("input", { value: "admin", readOnly: true, autoComplete: "username" })
      ] }),
      /* @__PURE__ */ jsxs("label", { children: [
        "\u5BC6\u7801",
        /* @__PURE__ */ jsx("input", { required: true, type: "password", value: password, onChange: (e) => setPassword(e.target.value), autoComplete: "current-password" })
      ] }),
      error && /* @__PURE__ */ jsx("p", { className: "admin-error", children: error }),
      /* @__PURE__ */ jsxs("button", { className: "site-button primary", disabled: busy, children: [
        busy ? "\u6B63\u5728\u767B\u5F55\u2026" : "\u8FDB\u5165\u5DE5\u4F5C\u5BA4",
        /* @__PURE__ */ jsx(ArrowUpRight, { size: 18 })
      ] }),
      /* @__PURE__ */ jsx("small", { children: "\u9996\u6B21\u767B\u5F55\u4FE1\u606F\u4FDD\u5B58\u5728\u670D\u52A1\u7AEF data \u76EE\u5F55\u7684\u300C\u9996\u6B21\u767B\u5F55.txt\u300D\u4E2D\u3002" })
    ] })
  ] });
  return /* @__PURE__ */ jsxs("div", { className: "admin-shell", children: [
    /* @__PURE__ */ jsxs("aside", { className: "admin-sidebar", children: [
      /* @__PURE__ */ jsxs("a", { href: "/", className: "admin-wordmark", children: [
        "\u5E7B\u60F3\u9547",
        /* @__PURE__ */ jsx("span", { children: "CONTENT STUDIO" })
      ] }),
      /* @__PURE__ */ jsx("nav", { children: [{ id: "home", label: "\u9996\u9875\u53D9\u4E8B", icon: Globe }, { id: "servers", label: "\u4E09\u4E2A\u4E16\u754C", icon: Globe }, { id: "site", label: "\u57FA\u7840\u4FE1\u606F\u4E0E\u94FE\u63A5", icon: Globe }, { id: "history", label: "\u53D1\u5E03\u8BB0\u5F55", icon: History }, { id: "security", label: "\u540E\u53F0\u8D26\u53F7", icon: Shield }].map((t) => /* @__PURE__ */ jsxs("button", { className: tab === t.id ? "active" : "", onClick: () => setTab(t.id), children: [
        /* @__PURE__ */ jsx(t.icon, { size: 17 }),
        t.label
      ] }, t.id)) }),
      /* @__PURE__ */ jsx("small", { children: "\u8349\u7A3F\u4E0E\u5DF2\u53D1\u5E03\u5185\u5BB9\u5206\u522B\u4FDD\u5B58\u3002\u53EA\u6709\u70B9\u51FB\u53D1\u5E03\u540E\uFF0C\u8BBF\u5BA2\u624D\u4F1A\u770B\u5230\u66F4\u6539\u3002" }),
      /* @__PURE__ */ jsxs("button", { className: "text-link", onClick: () => void run(async () => {
        if (dirty) {
          setError("\u8BF7\u5148\u4FDD\u5B58\u8349\u7A3F\uFF0C\u518D\u9000\u51FA\u3002");
          return;
        }
        await api("session", "DELETE");
        setCsrf("");
      }), children: [
        /* @__PURE__ */ jsx(LogOut, { size: 16 }),
        "\u9000\u51FA\u767B\u5F55"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("main", { className: "admin-main", children: [
      /* @__PURE__ */ jsxs("header", { children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("small", { children: "WEBSITE EDITOR" }),
          /* @__PURE__ */ jsx("h1", { children: { home: "\u9996\u9875\u53D9\u4E8B", servers: "\u4E09\u4E2A\u4E16\u754C", site: "\u57FA\u7840\u4FE1\u606F\u4E0E\u94FE\u63A5", history: "\u53D1\u5E03\u8BB0\u5F55", security: "\u540E\u53F0\u8D26\u53F7" }[tab] })
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { children: dirty ? "\u6709\u672A\u4FDD\u5B58\u7684\u66F4\u6539" : "\u5DF2\u4FDD\u5B58" }),
          /* @__PURE__ */ jsxs("a", { className: "site-button", href: "/?preview=1", target: "_blank", rel: "noreferrer", children: [
            /* @__PURE__ */ jsx(Eye, { size: 15 }),
            " \u9884\u89C8\u5DF2\u4FDD\u5B58\u8349\u7A3F"
          ] }),
          /* @__PURE__ */ jsxs("button", { className: "site-button", disabled: busy || !dirty, onClick: () => void run(save), children: [
            /* @__PURE__ */ jsx(Save, { size: 15 }),
            "\u4FDD\u5B58\u8349\u7A3F"
          ] }),
          /* @__PURE__ */ jsxs("button", { className: "site-button primary", disabled: busy || !data, onClick: () => setConfirm(true), children: [
            "\u53D1\u5E03\u66F4\u6539 ",
            /* @__PURE__ */ jsx(ArrowUpRight, { size: 15 })
          ] })
        ] })
      ] }),
      error && /* @__PURE__ */ jsx("div", { className: "admin-error", role: "alert", children: error }),
      notice && /* @__PURE__ */ jsxs("div", { className: "admin-notice", role: "status", children: [
        /* @__PURE__ */ jsx(Check, { size: 16 }),
        notice
      ] }),
      !draft ? /* @__PURE__ */ jsx("button", { onClick: () => void run(() => load()), children: "\u91CD\u65B0\u52A0\u8F7D" }) : tab === "home" || tab === "site" ? /* @__PURE__ */ jsx("section", { className: "admin-form-grid", children: fields(tab, draft[tab]) }) : tab === "servers" ? draft.servers.map((s, i) => /* @__PURE__ */ jsxs("section", { className: "admin-server", children: [
        /* @__PURE__ */ jsxs("div", { className: "admin-section-heading", children: [
          /* @__PURE__ */ jsxs("span", { children: [
            "0",
            i + 1
          ] }),
          /* @__PURE__ */ jsx("h2", { children: s.name }),
          /* @__PURE__ */ jsx("small", { children: s.id })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "admin-form-grid", children: [
          fields("servers", s, i),
          /* @__PURE__ */ jsxs("label", { className: "admin-field wide", children: [
            "\u73A9\u6CD5\u6807\u7B7E\uFF08\u6BCF\u884C\u4E00\u4E2A\uFF0C\u6700\u591A 8 \u4E2A\uFF09",
            /* @__PURE__ */ jsx("textarea", { value: s.tags.join("\n"), onChange: (e) => edit("servers", "tags", e.target.value.split("\n"), i) })
          ] })
        ] }),
        /* @__PURE__ */ jsx("h3", { children: "\u73A9\u6CD5\u7279\u8272" }),
        s.features.map((f, n) => /* @__PURE__ */ jsxs("div", { className: "feature-editor", children: [
          /* @__PURE__ */ jsx("span", { children: n + 1 }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("input", { "aria-label": "\u7279\u8272\u6807\u9898", value: f.title, onChange: (e) => edit("servers", "features", s.features.map((v, k) => k === n ? { ...v, title: e.target.value } : v), i) }),
            /* @__PURE__ */ jsx("textarea", { "aria-label": "\u7279\u8272\u8BF4\u660E", rows: 3, value: f.body, onChange: (e) => edit("servers", "features", s.features.map((v, k) => k === n ? { ...v, body: e.target.value } : v), i) })
          ] }),
          /* @__PURE__ */ jsx("button", { "aria-label": "\u79FB\u9664\u7279\u8272", disabled: s.features.length <= 1, onClick: () => edit("servers", "features", s.features.filter((_, k) => k !== n), i), children: /* @__PURE__ */ jsx(Trash2, { size: 17 }) })
        ] }, n)),
        /* @__PURE__ */ jsxs("button", { className: "site-button", disabled: s.features.length >= 6, onClick: () => edit("servers", "features", [...s.features, { title: "\u65B0\u7684\u7279\u8272", body: "" }], i), children: [
          /* @__PURE__ */ jsx(Plus, { size: 16 }),
          "\u6DFB\u52A0\u7279\u8272"
        ] })
      ] }, s.id)) : tab === "history" ? /* @__PURE__ */ jsxs("section", { className: "admin-history", children: [
        /* @__PURE__ */ jsxs("p", { children: [
          "\u6700\u8FD1\u53D1\u5E03\uFF1A",
          data.publishedAt ? new Date(data.publishedAt).toLocaleString("zh-CN") : "\u5C1A\u672A\u53D1\u5E03"
        ] }),
        /* @__PURE__ */ jsx("p", { children: "\u4FDD\u7559\u6700\u8FD1 20 \u6B21\u53D1\u5E03\u524D\u7684\u5185\u5BB9\uFF0C\u6062\u590D\u540E\u5148\u6210\u4E3A\u8349\u7A3F\u3002" }),
        data.history.map((h) => /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("span", { children: [
            "\u7248\u672C ",
            h.revision,
            /* @__PURE__ */ jsx("small", { children: new Date(h.at).toLocaleString("zh-CN") })
          ] }),
          /* @__PURE__ */ jsx("button", { className: "site-button", disabled: busy || dirty, onClick: () => void run(async () => {
            await api("restore", "POST", { revision: data.revision, target: h.revision });
            await load();
            setNotice("\u5386\u53F2\u5185\u5BB9\u5DF2\u6062\u590D\u4E3A\u8349\u7A3F\uFF0C\u9884\u89C8\u540E\u53EF\u53D1\u5E03\u3002");
          }), children: "\u6062\u590D\u4E3A\u8349\u7A3F" })
        ] }, h.revision))
      ] }) : /* @__PURE__ */ jsxs("form", { className: "admin-security", onSubmit: (e) => {
        e.preventDefault();
        void run(async () => {
          if (dirty) throw Error("\u8BF7\u5148\u4FDD\u5B58\u8349\u7A3F");
          await api("password", "POST", { current: oldPass, password: newPass });
          setCsrf("");
          setOldPass("");
          setNewPass("");
        });
      }, children: [
        /* @__PURE__ */ jsx("h2", { children: "\u66F4\u6539\u7BA1\u7406\u5458\u5BC6\u7801" }),
        /* @__PURE__ */ jsx("p", { children: "\u81F3\u5C11 12 \u4F4D\u3002\u66F4\u6539\u540E\u6240\u6709\u540E\u53F0\u767B\u5F55\u4F1A\u8BDD\u5931\u6548\uFF0C\u9700\u8981\u91CD\u65B0\u767B\u5F55\u3002" }),
        /* @__PURE__ */ jsxs("label", { className: "admin-field", children: [
          "\u5F53\u524D\u5BC6\u7801",
          /* @__PURE__ */ jsx("input", { type: "password", autoComplete: "current-password", required: true, value: oldPass, onChange: (e) => setOldPass(e.target.value) })
        ] }),
        /* @__PURE__ */ jsxs("label", { className: "admin-field", children: [
          "\u65B0\u5BC6\u7801",
          /* @__PURE__ */ jsx("input", { type: "password", autoComplete: "new-password", minLength: 12, required: true, value: newPass, onChange: (e) => setNewPass(e.target.value) })
        ] }),
        /* @__PURE__ */ jsx("button", { className: "site-button primary", disabled: busy, children: "\u66F4\u65B0\u5BC6\u7801" })
      ] })
    ] }),
    confirm && /* @__PURE__ */ jsx("div", { className: "admin-dialog-backdrop", children: /* @__PURE__ */ jsxs("section", { className: "admin-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "publish-title", children: [
      /* @__PURE__ */ jsx("h2", { id: "publish-title", children: "\u53D1\u5E03\u5230\u5B98\u7F51\uFF1F" }),
      /* @__PURE__ */ jsxs("p", { children: [
        "\u8FD9\u4F1A\u5C06\u5F53\u524D\u5185\u5BB9\u516C\u5F00\u5C55\u793A\u7ED9\u6240\u6709\u8BBF\u5BA2\u3002",
        dirty ? "\u672A\u4FDD\u5B58\u7684\u66F4\u6539\u4F1A\u5148\u4FDD\u5B58\u4E3A\u8349\u7A3F\u3002" : ""
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("button", { className: "site-button", disabled: busy, onClick: () => setConfirm(false), children: "\u7EE7\u7EED\u7F16\u8F91" }),
        /* @__PURE__ */ jsx("button", { className: "site-button primary", disabled: busy, onClick: () => void run(async () => {
          const revision = dirty ? await save() : data.revision;
          await api("publish", "POST", { revision });
          await load();
          setConfirm(false);
          setNotice("\u7F51\u7AD9\u5185\u5BB9\u5DF2\u53D1\u5E03\u3002");
        }), children: busy ? "\u6B63\u5728\u53D1\u5E03\u2026" : "\u786E\u8BA4\u53D1\u5E03" })
      ] })
    ] }) })
  ] });
}

// apps/website/src/Website.tsx
import { Fragment, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function useRemote(path) {
  const [data, setData] = useState2(null), [error, setError] = useState2(""), [count, setCount] = useState2(0);
  useEffect2(() => {
    const stop = new AbortController();
    setData(null);
    setError("");
    fetch(path, { signal: stop.signal }).then(async (r) => {
      const data2 = await r.json();
      if (!r.ok) throw Error(data2.error);
      return data2;
    }).then(setData).catch((e) => {
      if (!stop.signal.aborted) setError(e.message);
    });
    return () => stop.abort();
  }, [path, count]);
  return { data, error, retry: () => setCount((c) => c + 1) };
}
function Website({ content, path }) {
  const [menu, setMenu] = useState2(false);
  useEffect2(() => {
    const els = document.querySelectorAll("[data-reveal]");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const observer = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("visible");
        observer.unobserve(e.target);
      }
    }), { threshold: 0.09 });
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [path]);
  if (path.startsWith("/admin")) return /* @__PURE__ */ jsx2(Admin, {});
  const site = content.site, server = content.servers.find((s) => path === "/worlds/" + s.id || path === "/worlds/" + s.id + "/");
  return /* @__PURE__ */ jsxs2("div", { className: "website", children: [
    content.preview && /* @__PURE__ */ jsxs2("div", { className: "preview-bar", children: [
      "\u8349\u7A3F\u9884\u89C8 \xB7 \u8BBF\u5BA2\u770B\u5230\u7684\u4ECD\u662F\u5DF2\u53D1\u5E03\u5185\u5BB9",
      /* @__PURE__ */ jsx2("a", { href: "/admin/", children: "\u8FD4\u56DE\u540E\u53F0" })
    ] }),
    /* @__PURE__ */ jsxs2("header", { className: "site-header", children: [
      /* @__PURE__ */ jsxs2("a", { className: "site-brand", href: "/", children: [
        /* @__PURE__ */ jsxs2("svg", { viewBox: "0 0 40 40", children: [
          /* @__PURE__ */ jsx2("path", { d: "M5 7h30v8H15v6h16v8H15v8H5z" }),
          /* @__PURE__ */ jsx2("path", { d: "M24 21h11v16H24z", opacity: ".35" })
        ] }),
        /* @__PURE__ */ jsxs2("span", { children: [
          site.name,
          /* @__PURE__ */ jsx2("small", { children: "FANTASY TOWN" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs2("nav", { className: menu ? "open" : "", children: [
        [{ href: "/worlds/", label: "\u63A2\u7D22\u4E16\u754C" }, { href: "/guide/", label: "\u5F00\u59CB\u6E38\u73A9" }, { href: "/community/", label: "\u793E\u533A\u5E7F\u573A" }].map((n) => /* @__PURE__ */ jsx2("a", { className: path.startsWith(n.href) ? "active" : "", href: n.href, children: n.label }, n.href)),
        /* @__PURE__ */ jsx2("a", { className: "mobile-download", href: "/downloads/", children: "\u4E0B\u8F7D\u542F\u52A8\u5668" })
      ] }),
      /* @__PURE__ */ jsxs2("a", { className: "site-button header-join", href: "/downloads/", children: [
        "\u4E0B\u8F7D\u542F\u52A8\u5668 ",
        /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 16 })
      ] }),
      /* @__PURE__ */ jsx2("button", { className: "mobile-menu", "aria-label": "\u5C55\u5F00\u5BFC\u822A", onClick: () => setMenu((v) => !v), children: menu ? /* @__PURE__ */ jsx2(X, {}) : /* @__PURE__ */ jsx2(Menu, {}) })
    ] }),
    /* @__PURE__ */ jsx2("main", { children: server ? /* @__PURE__ */ jsx2(WorldDetail, { server, site }) : path.startsWith("/worlds") ? /* @__PURE__ */ jsx2(Worlds, { content }) : path.startsWith("/guide") ? /* @__PURE__ */ jsx2(Guide, { content }) : path.startsWith("/community") ? /* @__PURE__ */ jsx2(Community, { content, path }) : path.startsWith("/downloads") ? /* @__PURE__ */ jsx2(Downloads, { content }) : path === "/" ? /* @__PURE__ */ jsx2(Home, { content }) : /* @__PURE__ */ jsxs2("section", { className: "page-intro", children: [
      /* @__PURE__ */ jsx2("small", { children: "404" }),
      /* @__PURE__ */ jsx2("h1", { children: "\u8FD9\u6761\u8DEF\u8FD8\u6CA1\u4FEE\u597D\u3002" }),
      /* @__PURE__ */ jsxs2("a", { className: "site-button primary", href: "/", children: [
        "\u56DE\u5230\u9547\u53E3 ",
        /* @__PURE__ */ jsx2(ArrowRight, {})
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs2("footer", { className: "site-footer", children: [
      /* @__PURE__ */ jsxs2("div", { className: "footer-main", children: [
        /* @__PURE__ */ jsxs2("div", { children: [
          /* @__PURE__ */ jsxs2("a", { className: "footer-wordmark", href: "/", children: [
            "\u5E7B\u60F3\u9547",
            /* @__PURE__ */ jsx2("span", { children: "\u3002" })
          ] }),
          /* @__PURE__ */ jsx2("p", { children: content.home.footer })
        ] }),
        /* @__PURE__ */ jsxs2("div", { children: [
          /* @__PURE__ */ jsx2("h4", { children: "\u5728\u9547\u4E0A" }),
          /* @__PURE__ */ jsx2("a", { href: "/worlds/", children: "\u4E09\u4E2A\u4E16\u754C" }),
          /* @__PURE__ */ jsx2("a", { href: "/community/", children: "\u73A9\u5BB6\u4E0E\u4F5C\u54C1" }),
          /* @__PURE__ */ jsx2("a", { href: "/downloads/", children: "\u5E7B\u60F3\u9547\u542F\u52A8\u5668" })
        ] }),
        /* @__PURE__ */ jsxs2("div", { children: [
          /* @__PURE__ */ jsx2("h4", { children: "\u4FDD\u6301\u8054\u7CFB" }),
          /* @__PURE__ */ jsxs2("a", { href: site.skin, target: "_blank", rel: "noreferrer", children: [
            "\u76AE\u80A4\u7AD9 ",
            /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 13 })
          ] }),
          /* @__PURE__ */ jsxs2("a", { href: site.oopz, target: "_blank", rel: "noreferrer", children: [
            "OOPZ \u8BED\u97F3 ",
            /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 13 })
          ] }),
          /* @__PURE__ */ jsxs2("a", { href: site.ownerVideo, target: "_blank", rel: "noreferrer", children: [
            "\u9547\u957F\u7684 B \u7AD9 ",
            /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 13 })
          ] }),
          /* @__PURE__ */ jsx2(CopyButton, { value: site.qq, label: "QQ\u7FA4 " + site.qq })
        ] }),
        /* @__PURE__ */ jsxs2("div", { children: [
          /* @__PURE__ */ jsx2("h4", { children: "\u6765\u5230\u8FD9\u91CC\u4E4B\u524D" }),
          /* @__PURE__ */ jsx2("a", { href: site.rules, target: "_blank", rel: "noreferrer", children: "\u670D\u52A1\u5668\u89C4\u5219" }),
          /* @__PURE__ */ jsx2("a", { href: site.faq, target: "_blank", rel: "noreferrer", children: "\u5343\u95EE\u4E07\u7B54" }),
          /* @__PURE__ */ jsx2("a", { href: site.otherLauncher, target: "_blank", rel: "noreferrer", children: "\u5176\u4ED6\u542F\u52A8\u5668\u6307\u5357" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs2("div", { className: "footer-bottom", children: [
        /* @__PURE__ */ jsxs2("span", { children: [
          "\xA9 ",
          (/* @__PURE__ */ new Date()).getFullYear(),
          " FANTASY TOWN"
        ] }),
        /* @__PURE__ */ jsx2("span", { children: "\u7531\u73A9\u5BB6\u5171\u540C\u521B\u9020\u7684 Minecraft \u793E\u533A" }),
        /* @__PURE__ */ jsx2("a", { href: "/admin/", children: "\u5185\u5BB9\u7BA1\u7406" })
      ] })
    ] })
  ] });
}
function Label({ children }) {
  return /* @__PURE__ */ jsxs2("div", { className: "editorial-label", children: [
    /* @__PURE__ */ jsx2("i", {}),
    children
  ] });
}
function CopyButton({ value, label }) {
  const [copied, setCopied] = useState2(false);
  return /* @__PURE__ */ jsxs2("button", { className: "copy-link", onClick: async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2e3);
    } catch {
      setCopied(false);
    }
  }, children: [
    copied ? /* @__PURE__ */ jsx2(Check2, { size: 15 }) : /* @__PURE__ */ jsx2(Copy, { size: 15 }),
    " ",
    copied ? "\u5DF2\u590D\u5236" : label || value
  ] });
}
function Home({ content }) {
  const { home, site, servers } = content;
  return /* @__PURE__ */ jsxs2(Fragment, { children: [
    /* @__PURE__ */ jsxs2("section", { className: "homepage-hero", children: [
      /* @__PURE__ */ jsxs2("div", { className: "hero-copy", children: [
        /* @__PURE__ */ jsx2(Label, { children: home.eyebrow }),
        /* @__PURE__ */ jsx2("h1", { children: home.title.split("\n").map((t, i) => /* @__PURE__ */ jsx2("span", { children: t }, i)) }),
        /* @__PURE__ */ jsx2("p", { children: home.intro }),
        /* @__PURE__ */ jsxs2("div", { className: "hero-actions", children: [
          /* @__PURE__ */ jsxs2("a", { className: "site-button primary", href: "/guide/", children: [
            home.primaryLabel,
            /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 19 })
          ] }),
          /* @__PURE__ */ jsxs2("a", { className: "text-link", href: "/worlds/", children: [
            "\u5148\u901B\u901B\u4E09\u4E2A\u4E16\u754C ",
            /* @__PURE__ */ jsx2(ArrowRight, { size: 17 })
          ] })
        ] }),
        /* @__PURE__ */ jsxs2("div", { className: "hero-footnote", children: [
          /* @__PURE__ */ jsx2("span", { children: "\u4E00\u4E2A\u8D26\u53F7\uFF0C\u4E09\u4E2A\u4E16\u754C\u3002" }),
          /* @__PURE__ */ jsx2("a", { href: "#worlds", "aria-label": "\u5411\u4E0B\u63A2\u7D22", children: /* @__PURE__ */ jsx2(ArrowDown, { size: 19 }) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs2("div", { className: "hero-art", children: [
        /* @__PURE__ */ jsxs2("div", { className: "art-mat", children: [
          /* @__PURE__ */ jsx2("img", { src: home.heroImage, alt: home.heroCaption, fetchPriority: "high" }),
          /* @__PURE__ */ jsxs2("div", { className: "art-caption", children: [
            /* @__PURE__ */ jsx2("span", { children: "FIELD NOTES / 001" }),
            /* @__PURE__ */ jsx2("span", { children: home.heroCaption })
          ] })
        ] }),
        /* @__PURE__ */ jsxs2("div", { className: "hero-seal", children: [
          "\u521B\u9020",
          /* @__PURE__ */ jsx2("br", {}),
          "\u4E0D\u8BBE\u9650",
          /* @__PURE__ */ jsx2("span", { children: "EST. FANTASY TOWN" })
        ] }),
        /* @__PURE__ */ jsxs2("span", { className: "hero-coordinate", children: [
          "YOUR NEXT ADVENTURE",
          /* @__PURE__ */ jsx2("br", {}),
          "STARTS RIGHT HERE \u2197"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs2("div", { className: "site-ribbon", children: [
      /* @__PURE__ */ jsx2("span", { children: "\u5EFA\u9020\u4E00\u4E2A\u5BB6" }),
      /* @__PURE__ */ jsx2(Plus2, {}),
      /* @__PURE__ */ jsx2("span", { children: "\u9047\u89C1\u4E00\u7FA4\u4EBA" }),
      /* @__PURE__ */ jsx2(Plus2, {}),
      /* @__PURE__ */ jsx2("span", { children: "\u7559\u4E0B\u4E00\u6BB5\u6545\u4E8B" }),
      /* @__PURE__ */ jsx2(Plus2, {}),
      /* @__PURE__ */ jsx2("span", { children: "FANTASY TOWN" })
    ] }),
    /* @__PURE__ */ jsxs2("section", { id: "worlds", className: "worlds-section", "data-reveal": true, children: [
      /* @__PURE__ */ jsxs2("div", { className: "section-title", children: [
        /* @__PURE__ */ jsx2(Label, { children: "01 / FIND YOUR WORLD" }),
        /* @__PURE__ */ jsx2("h2", { children: home.worldsTitle }),
        /* @__PURE__ */ jsx2("p", { children: "\u5148\u9009\u4F60\u559C\u6B22\u7684\u73A9\u6CD5\uFF0C\u5269\u4E0B\u7684\u4EA4\u7ED9\u6211\u4EEC\u3002" })
      ] }),
      /* @__PURE__ */ jsx2("div", { className: "world-editorial-list", children: servers.map((s, i) => /* @__PURE__ */ jsxs2("a", { href: "/worlds/" + s.id + "/", className: "world-editorial", children: [
        /* @__PURE__ */ jsxs2("span", { className: "world-index", children: [
          "0",
          i + 1
        ] }),
        /* @__PURE__ */ jsxs2("div", { className: "world-copy", children: [
          /* @__PURE__ */ jsxs2("div", { className: "world-label", children: [
            /* @__PURE__ */ jsx2("span", { children: s.english }),
            /* @__PURE__ */ jsx2("span", { className: "world-status " + (s.testing ? "testing" : ""), children: s.status })
          ] }),
          /* @__PURE__ */ jsx2("h3", { children: s.short }),
          /* @__PURE__ */ jsx2("p", { children: s.intro }),
          /* @__PURE__ */ jsx2("div", { className: "world-tags", children: s.tags.map((t) => /* @__PURE__ */ jsx2("span", { children: t }, t)) }),
          /* @__PURE__ */ jsxs2("small", { children: [
            s.version,
            " \xB7 ",
            s.platform
          ] })
        ] }),
        /* @__PURE__ */ jsx2("div", { className: "world-thumbnail", children: /* @__PURE__ */ jsx2("img", { src: s.image, alt: s.imageCaption, loading: "lazy" }) }),
        /* @__PURE__ */ jsx2("span", { className: "world-arrow", children: /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 29 }) })
      ] }, s.id)) })
    ] }),
    /* @__PURE__ */ jsxs2("section", { className: "manifesto-section", "data-reveal": true, children: [
      /* @__PURE__ */ jsxs2("div", { children: [
        /* @__PURE__ */ jsx2(Label, { children: "A PLACE THAT FEELS LIKE HOME" }),
        /* @__PURE__ */ jsxs2("h2", { children: [
          "\u4E0D\u6B62\u767B\u5F55\u6E38\u620F\uFF0C",
          /* @__PURE__ */ jsx2("br", {}),
          "\u4E5F\u56DE\u5230\u670B\u53CB\u8EAB\u8FB9\u3002"
        ] })
      ] }),
      /* @__PURE__ */ jsxs2("div", { children: [
        /* @__PURE__ */ jsx2("p", { children: "\u5728\u8FD9\u91CC\uFF0C\u7EA2\u77F3\u548C\u9F7F\u8F6E\u90FD\u6709\u81EA\u5DF1\u7684\u7231\u597D\u8005\u3002\u6709\u4EBA\u57CB\u5934\u9020\u4E00\u5EA7\u5DE5\u5382\uFF0C\u6709\u4EBA\u4E50\u4E8E\u5E2E\u65B0\u4EBA\u5B89\u5BB6\u3002\u4F60\u53EF\u4EE5\u53C2\u4E0E\u70ED\u95F9\uFF0C\u4E5F\u53EF\u4EE5\u6162\u6162\u63A2\u7D22\u3002" }),
        /* @__PURE__ */ jsxs2("a", { className: "text-link", href: site.adminVideo, target: "_blank", rel: "noreferrer", children: [
          "\u8DDF\u968F\u7BA1\u7406\u5458\u7684\u955C\u5934\u901B\u901B ",
          /* @__PURE__ */ jsx2(Play, { size: 16 })
        ] })
      ] })
    ] }),
    home.showCommunity && /* @__PURE__ */ jsxs2("section", { className: "community-section", "data-reveal": true, children: [
      /* @__PURE__ */ jsxs2("div", { className: "section-heading", children: [
        /* @__PURE__ */ jsxs2("div", { children: [
          /* @__PURE__ */ jsx2(Label, { children: "02 / MADE BY THE COMMUNITY" }),
          /* @__PURE__ */ jsx2("h2", { children: home.communityTitle })
        ] }),
        /* @__PURE__ */ jsxs2("a", { className: "text-link", href: "/community/", children: [
          "\u8D70\u8FDB\u793E\u533A ",
          /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 18 })
        ] })
      ] }),
      /* @__PURE__ */ jsx2(PublicFeed, {})
    ] }),
    home.showGuide && /* @__PURE__ */ jsxs2("section", { className: "join-section", "data-reveal": true, children: [
      /* @__PURE__ */ jsxs2("div", { children: [
        /* @__PURE__ */ jsx2(Label, { children: "03 / YOUR FIRST DAY" }),
        /* @__PURE__ */ jsx2("h2", { children: home.joinTitle }),
        /* @__PURE__ */ jsxs2("a", { className: "site-button primary", href: "/guide/", children: [
          "\u51C6\u5907\u51FA\u53D1 ",
          /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 18 })
        ] })
      ] }),
      /* @__PURE__ */ jsxs2("ol", { children: [
        /* @__PURE__ */ jsxs2("li", { children: [
          /* @__PURE__ */ jsx2("span", { children: "01" }),
          /* @__PURE__ */ jsxs2("div", { children: [
            /* @__PURE__ */ jsx2("h3", { children: "\u62E5\u6709\u4E00\u4E2A\u5E7B\u60F3\u9547\u8EAB\u4EFD" }),
            /* @__PURE__ */ jsx2("p", { children: "\u5728\u76AE\u80A4\u7AD9\u6CE8\u518C\u8D26\u53F7\uFF0C\u8BBE\u7F6E\u4F60\u7684\u6E38\u620F\u89D2\u8272\u3002" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs2("li", { children: [
          /* @__PURE__ */ jsx2("span", { children: "02" }),
          /* @__PURE__ */ jsxs2("div", { children: [
            /* @__PURE__ */ jsx2("h3", { children: "\u627E\u5230\u559C\u6B22\u7684\u4E16\u754C" }),
            /* @__PURE__ */ jsx2("p", { children: "\u4F7F\u7528\u542F\u52A8\u5668\u9009\u62E9\u670D\u52A1\u5668\uFF0C\u81EA\u52A8\u51C6\u5907\u6E38\u620F\u4E0E\u6574\u5408\u5305\u3002" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs2("li", { children: [
          /* @__PURE__ */ jsx2("span", { children: "03" }),
          /* @__PURE__ */ jsxs2("div", { children: [
            /* @__PURE__ */ jsx2("h3", { children: "\u5E26\u7740\u597D\u5947\u5FC3\u8FDB\u5165\u6E38\u620F" }),
            /* @__PURE__ */ jsx2("p", { children: "\u5148\u8BFB\u89C4\u5219\uFF0C\u9047\u5230\u95EE\u9898\u968F\u65F6\u5411\u793E\u533A\u8BE2\u95EE\u3002" })
          ] })
        ] })
      ] })
    ] })
  ] });
}
function Worlds({ content }) {
  return /* @__PURE__ */ jsxs2(Fragment, { children: [
    /* @__PURE__ */ jsxs2("section", { className: "page-intro", children: [
      /* @__PURE__ */ jsx2(Label, { children: "CHOOSE YOUR KIND OF ADVENTURE" }),
      /* @__PURE__ */ jsxs2("h1", { children: [
        "\u4E09\u4E2A\u4E16\u754C\uFF0C",
        /* @__PURE__ */ jsx2("br", {}),
        "\u6709\u4F60\u7684\u90A3\u4E00\u79CD\u3002"
      ] }),
      /* @__PURE__ */ jsx2("p", { children: "\u540C\u4E00\u4E2A\u76AE\u80A4\u7AD9\u8D26\u53F7\uFF0C\u6309\u559C\u6B22\u7684\u73A9\u6CD5\u81EA\u7531\u9009\u62E9\u3002" })
    ] }),
    /* @__PURE__ */ jsx2("section", { className: "comparison", children: /* @__PURE__ */ jsx2("div", { className: "world-comparison-grid", children: content.servers.map((s) => /* @__PURE__ */ jsxs2("article", { children: [
      /* @__PURE__ */ jsx2("img", { src: s.image, alt: s.imageCaption }),
      /* @__PURE__ */ jsxs2("div", { children: [
        /* @__PURE__ */ jsx2("span", { className: "world-status", children: s.status }),
        /* @__PURE__ */ jsx2("h2", { children: s.short }),
        /* @__PURE__ */ jsx2("p", { children: s.fit }),
        /* @__PURE__ */ jsxs2("dl", { children: [
          /* @__PURE__ */ jsx2("dt", { children: "\u7248\u672C" }),
          /* @__PURE__ */ jsxs2("dd", { children: [
            s.version,
            " \xB7 ",
            s.platform
          ] }),
          /* @__PURE__ */ jsx2("dt", { children: "\u5468\u76EE" }),
          /* @__PURE__ */ jsx2("dd", { children: s.cycle }),
          /* @__PURE__ */ jsx2("dt", { children: "\u670D\u52A1\u5668\u5730\u5740" }),
          /* @__PURE__ */ jsx2("dd", { children: /* @__PURE__ */ jsx2(CopyButton, { value: s.address }) })
        ] }),
        /* @__PURE__ */ jsx2("div", { className: "world-tags", children: s.tags.map((t) => /* @__PURE__ */ jsx2("span", { children: t }, t)) }),
        /* @__PURE__ */ jsxs2("a", { className: "site-button", href: "/worlds/" + s.id + "/", children: [
          "\u4E86\u89E3\u8FD9\u4E2A\u4E16\u754C ",
          /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 17 })
        ] })
      ] })
    ] }, s.id)) }) })
  ] });
}
function WorldDetail({ server: s, site }) {
  return /* @__PURE__ */ jsxs2(Fragment, { children: [
    /* @__PURE__ */ jsxs2("section", { className: "world-detail-hero", children: [
      /* @__PURE__ */ jsxs2("div", { children: [
        /* @__PURE__ */ jsx2(Label, { children: s.english }),
        /* @__PURE__ */ jsx2("span", { className: "world-status " + (s.testing ? "testing" : ""), children: s.status }),
        /* @__PURE__ */ jsx2("h1", { children: s.headline }),
        /* @__PURE__ */ jsx2("p", { children: s.intro }),
        /* @__PURE__ */ jsxs2("div", { className: "hero-actions", children: [
          /* @__PURE__ */ jsxs2("a", { className: "site-button primary", href: "/guide/", children: [
            "\u52A0\u5165 ",
            s.name,
            /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 18 })
          ] }),
          /* @__PURE__ */ jsx2(CopyButton, { value: s.address })
        ] })
      ] }),
      /* @__PURE__ */ jsxs2("figure", { children: [
        /* @__PURE__ */ jsx2("img", { src: s.image, alt: s.imageCaption }),
        /* @__PURE__ */ jsx2("figcaption", { children: s.imageCaption })
      ] })
    ] }),
    /* @__PURE__ */ jsxs2("section", { className: "world-facts", children: [
      /* @__PURE__ */ jsxs2("div", { children: [
        /* @__PURE__ */ jsx2("small", { children: "\u6E38\u620F\u7248\u672C" }),
        /* @__PURE__ */ jsxs2("strong", { children: [
          s.version,
          " \xB7 ",
          s.platform
        ] })
      ] }),
      /* @__PURE__ */ jsxs2("div", { children: [
        /* @__PURE__ */ jsx2("small", { children: "\u5F53\u524D\u5468\u76EE" }),
        /* @__PURE__ */ jsx2("strong", { children: s.cycle })
      ] }),
      /* @__PURE__ */ jsxs2("div", { children: [
        /* @__PURE__ */ jsx2("small", { children: "\u767B\u5F55\u65B9\u5F0F" }),
        /* @__PURE__ */ jsx2("strong", { children: "\u5E7B\u60F3\u9547\u76AE\u80A4\u7AD9" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs2("section", { className: "world-features", children: [
      /* @__PURE__ */ jsx2(Label, { children: "WHAT YOU CAN DO" }),
      /* @__PURE__ */ jsx2("h2", { children: "\u5728\u8FD9\u91CC\uFF0C\u4F60\u53EF\u4EE5\u2026" }),
      /* @__PURE__ */ jsx2("div", { children: s.features.map((f, i) => /* @__PURE__ */ jsxs2("article", { children: [
        /* @__PURE__ */ jsxs2("span", { children: [
          "0",
          i + 1
        ] }),
        /* @__PURE__ */ jsx2("h3", { children: f.title }),
        /* @__PURE__ */ jsx2("p", { children: f.body })
      ] }, i)) }),
      /* @__PURE__ */ jsxs2("aside", { children: [
        /* @__PURE__ */ jsx2(ShieldCheck, {}),
        /* @__PURE__ */ jsx2("p", { children: s.note }),
        /* @__PURE__ */ jsxs2("a", { href: site.rules, target: "_blank", rel: "noreferrer", children: [
          "\u9605\u8BFB\u670D\u52A1\u5668\u89C4\u5219 ",
          /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 15 })
        ] })
      ] })
    ] })
  ] });
}
function Guide({ content }) {
  const { site } = content;
  return /* @__PURE__ */ jsxs2(Fragment, { children: [
    /* @__PURE__ */ jsxs2("section", { className: "page-intro", children: [
      /* @__PURE__ */ jsx2(Label, { children: "WELCOME, NEW NEIGHBOUR" }),
      /* @__PURE__ */ jsxs2("h1", { children: [
        "\u7B2C\u4E00\u6B21\u6765\uFF1F",
        /* @__PURE__ */ jsx2("br", {}),
        "\u8DDF\u7740\u8FD9\u6761\u8DEF\u5C31\u597D\u3002"
      ] }),
      /* @__PURE__ */ jsx2("p", { children: "\u6211\u4EEC\u628A\u5165\u670D\u8FC7\u7A0B\u6574\u7406\u6210\u4E86\u4E09\u4E2A\u6B65\u9AA4\u3002\u5DF2\u6709\u8D26\u53F7\u7684\u670B\u53CB\u53EF\u4EE5\u76F4\u63A5\u4ECE\u7B2C\u4E8C\u6B65\u5F00\u59CB\u3002" })
    ] }),
    /* @__PURE__ */ jsxs2("section", { className: "guide-layout", children: [
      /* @__PURE__ */ jsxs2("div", { className: "guide-steps", children: [
        /* @__PURE__ */ jsxs2("article", { children: [
          /* @__PURE__ */ jsx2("span", { className: "step-number", children: "01" }),
          /* @__PURE__ */ jsxs2("div", { children: [
            /* @__PURE__ */ jsx2("small", { children: "YOUR IDENTITY" }),
            /* @__PURE__ */ jsx2("h2", { children: "\u5148\u7ED9\u81EA\u5DF1\u4E00\u4E2A\u540D\u5B57\u3002" }),
            /* @__PURE__ */ jsx2("p", { children: "\u6253\u5F00\u5E7B\u60F3\u9547\u76AE\u80A4\u7AD9\uFF0C\u6CE8\u518C\u8D26\u53F7\u5E76\u521B\u5EFA\u6E38\u620F\u89D2\u8272\u3002\u542F\u52A8\u5668\u548C\u4E09\u4E2A\u670D\u52A1\u5668\u90FD\u4F7F\u7528\u8FD9\u5957\u8D26\u53F7\u3002\u4E5F\u53EF\u4EE5\u5728\u76AE\u80A4\u7AD9\u8BBE\u7F6E\u81EA\u5DF1\u559C\u6B22\u7684\u76AE\u80A4\u3002" }),
            /* @__PURE__ */ jsxs2("a", { className: "site-button", href: site.skin, target: "_blank", rel: "noreferrer", children: [
              "\u524D\u5F80\u76AE\u80A4\u7AD9 ",
              /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 17 })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs2("article", { children: [
          /* @__PURE__ */ jsx2("span", { className: "step-number", children: "02" }),
          /* @__PURE__ */ jsxs2("div", { children: [
            /* @__PURE__ */ jsx2("small", { children: "YOUR LAUNCHER" }),
            /* @__PURE__ */ jsx2("h2", { children: "\u51C6\u5907\u597D\u8FDB\u5165\u4E16\u754C\u7684\u5DE5\u5177\u3002" }),
            /* @__PURE__ */ jsx2("p", { children: "\u4E0B\u8F7D\u5E7B\u60F3\u9547\u542F\u52A8\u5668\uFF0C\u4F7F\u7528\u76AE\u80A4\u7AD9\u8D26\u53F7\u767B\u5F55\u3002\u9009\u62E9\u539F\u7248\u751F\u5B58\u7FA4\u7EC4\u3001\u6A21\u7EC4\u4E00\u670D\u6216\u6A21\u7EC4\u4E8C\u670D\uFF0C\u518D\u70B9\u51FB\u5F00\u59CB\u6E38\u620F\uFF1B\u542F\u52A8\u5668\u4F1A\u6309\u670D\u52A1\u5668\u914D\u7F6E\u51C6\u5907\u5BF9\u5E94\u5185\u5BB9\u3002" }),
            /* @__PURE__ */ jsxs2("div", { className: "hero-actions", children: [
              /* @__PURE__ */ jsxs2("a", { className: "site-button primary", href: "/downloads/", children: [
                "\u4E0B\u8F7D\u542F\u52A8\u5668 ",
                /* @__PURE__ */ jsx2(Download, { size: 17 })
              ] }),
              /* @__PURE__ */ jsxs2("a", { className: "text-link", href: site.otherLauncher, target: "_blank", rel: "noreferrer", children: [
                "\u6211\u4F7F\u7528\u5176\u4ED6\u542F\u52A8\u5668 ",
                /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 16 })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs2("article", { children: [
          /* @__PURE__ */ jsx2("span", { className: "step-number", children: "03" }),
          /* @__PURE__ */ jsxs2("div", { children: [
            /* @__PURE__ */ jsx2("small", { children: "YOUR FIRST ADVENTURE" }),
            /* @__PURE__ */ jsx2("h2", { children: "\u4E86\u89E3\u89C4\u5219\uFF0C\u548C\u90BB\u5C45\u6253\u4E2A\u62DB\u547C\u3002" }),
            /* @__PURE__ */ jsx2("p", { children: "\u8FDB\u5165\u524D\u8BF7\u9605\u8BFB\u670D\u52A1\u5668\u89C4\u5219\u3002\u751F\u5B58\u4E00\u670D\u9700\u8981\u7533\u8BF7\u767D\u540D\u5355\uFF1B\u5176\u4ED6\u4E16\u754C\u7684\u5B89\u6392\u4EE5\u5404\u670D\u516C\u544A\u4E3A\u51C6\u3002\u9047\u5230\u56F0\u96BE\uFF0C\u53EF\u4EE5\u5728 QQ \u7FA4\u6216\u542F\u52A8\u5668\u793E\u533A\u4E2D\u8BE2\u95EE\u3002" }),
            /* @__PURE__ */ jsxs2("a", { className: "site-button", href: site.rules, target: "_blank", rel: "noreferrer", children: [
              "\u9605\u8BFB\u670D\u52A1\u5668\u89C4\u5219 ",
              /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 17 })
            ] })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs2("aside", { className: "guide-help", children: [
        /* @__PURE__ */ jsx2(Compass, { size: 45, strokeWidth: 1 }),
        /* @__PURE__ */ jsx2("h3", { children: "\u8DEF\u4E0A\u6709\u6211\u4EEC\u3002" }),
        /* @__PURE__ */ jsx2("p", { children: "QQ\u7FA4\u53F7" }),
        /* @__PURE__ */ jsx2(CopyButton, { value: site.qq }),
        /* @__PURE__ */ jsxs2("a", { className: "text-link", href: site.video, target: "_blank", rel: "noreferrer", children: [
          "\u89C2\u770B\u5165\u670D\u6559\u7A0B ",
          /* @__PURE__ */ jsx2(Play, { size: 15 })
        ] }),
        /* @__PURE__ */ jsxs2("a", { className: "text-link", href: site.faq, target: "_blank", rel: "noreferrer", children: [
          "\u5E7B\u60F3\u9547\u5343\u95EE\u4E07\u7B54 ",
          /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 15 })
        ] }),
        /* @__PURE__ */ jsxs2("a", { className: "text-link", href: site.oopz, target: "_blank", rel: "noreferrer", children: [
          "OOPZ \u8BED\u97F3\u9891\u9053 ",
          /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 15 })
        ] }),
        /* @__PURE__ */ jsxs2("small", { children: [
          "\u57DF ID\uFF1A",
          site.oopzId
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs2("section", { className: "faq-section", children: [
      /* @__PURE__ */ jsx2(Label, { children: "A FEW THINGS TO KNOW" }),
      /* @__PURE__ */ jsx2("h2", { children: "\u51FA\u53D1\u524D\u7684\u5C0F\u95EE\u9898" }),
      [{ q: "\u4E09\u4E2A\u670D\u52A1\u5668\u9700\u8981\u5206\u522B\u6CE8\u518C\u8D26\u53F7\u5417\uFF1F", a: "\u4E0D\u9700\u8981\u3002\u4E09\u4E2A\u670D\u52A1\u5668\u5747\u4F7F\u7528\u5E7B\u60F3\u9547\u76AE\u80A4\u7AD9\u767B\u5F55\u3002\u6574\u5408\u5305\u548C\u6E38\u620F\u7248\u672C\u5219\u5206\u522B\u914D\u7F6E\uFF0C\u8BF7\u52FF\u6DF7\u7528\u3002" }, { q: "\u53EF\u4EE5\u4F7F\u7528\u81EA\u5DF1\u4E60\u60EF\u7684\u542F\u52A8\u5668\u5417\uFF1F", a: "\u53EF\u4EE5\u3002\u6309\u300C\u5176\u4ED6\u542F\u52A8\u5668\u6307\u5357\u300D\u914D\u7F6E\u76AE\u80A4\u7AD9\u5916\u7F6E\u767B\u5F55\u4E0E\u6B63\u786E\u7248\u672C\u3001\u6574\u5408\u5305\uFF0C\u518D\u8F93\u5165\u5BF9\u5E94\u670D\u52A1\u5668\u5730\u5740\u3002" }, { q: "\u624B\u673A\u7248\u793E\u533A\u53EF\u4EE5\u8FD0\u884C Minecraft \u5417\uFF1F", a: "\u5B89\u5353\u7248\u5E7B\u60F3\u9547\u793E\u533A\u7528\u4E8E\u804A\u5929\u3001\u8BED\u97F3\u3001\u8BBA\u575B\u3001\u84DD\u56FE\u4E0E\u793E\u533A\u4E92\u52A8\uFF0C\u4E0D\u7528\u4E8E\u8FD0\u884C Java \u7248 Minecraft\u3002" }, { q: "\u6A21\u7EC4\u4E00\u670D\u5904\u4E8E\u6D4B\u8BD5\u4E2D\uFF0C\u6211\u8BE5\u600E\u4E48\u52A0\u5165\uFF1F", a: "\u5148\u52A0\u5165\u793E\u533A\uFF0C\u67E5\u770B\u6A21\u7EC4\u4E00\u670D\u7684\u6700\u65B0\u6D4B\u8BD5\u516C\u544A\u3002\u5F00\u653E\u65F6\u95F4\u548C\u6574\u5408\u5305\u8C03\u6574\u5747\u4EE5\u7BA1\u7406\u5458\u901A\u77E5\u4E3A\u51C6\u3002" }].map((f) => /* @__PURE__ */ jsxs2("details", { children: [
        /* @__PURE__ */ jsxs2("summary", { children: [
          f.q,
          /* @__PURE__ */ jsx2(Plus2, { size: 19 })
        ] }),
        /* @__PURE__ */ jsx2("p", { children: f.a })
      ] }, f.q))
    ] })
  ] });
}
function PublicFeed() {
  const forum = useRemote("/api/community/forum?limit=4&sort=active"), blueprints = useRemote("/api/community/blueprints?limit=3");
  return /* @__PURE__ */ jsxs2("div", { className: "public-feed", children: [
    /* @__PURE__ */ jsxs2("div", { className: "public-talk", children: [
      /* @__PURE__ */ jsxs2("h3", { children: [
        /* @__PURE__ */ jsx2(MessageCircle, { size: 19 }),
        " \u9547\u4E0A\u6B63\u5728\u804A"
      ] }),
      forum.error ? /* @__PURE__ */ jsx2(ServiceError, { remote: forum }) : !forum.data ? /* @__PURE__ */ jsx2("p", { className: "feed-loading", children: "\u6B63\u5728\u83B7\u53D6\u793E\u533A\u8BDD\u9898\u2026" }) : forum.data.items?.length ? forum.data.items.map((p) => /* @__PURE__ */ jsxs2("a", { href: "/community/post/" + p.id + "/", children: [
        /* @__PURE__ */ jsxs2("small", { children: [
          p.category,
          " \xB7 ",
          p.name
        ] }),
        /* @__PURE__ */ jsx2("h4", { children: p.title }),
        /* @__PURE__ */ jsxs2("span", { children: [
          p.replies || 0,
          " \u6761\u56DE\u590D ",
          /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 15 })
        ] })
      ] }, p.id)) : /* @__PURE__ */ jsx2("p", { className: "feed-loading", children: "\u8FD8\u6CA1\u6709\u516C\u5F00\u8BDD\u9898\uFF0C\u6765\u5199\u4E0B\u7B2C\u4E00\u6BB5\u6545\u4E8B\u3002" }),
      /* @__PURE__ */ jsx2(Cached, { data: forum.data })
    ] }),
    /* @__PURE__ */ jsxs2("div", { className: "public-creations", children: [
      /* @__PURE__ */ jsxs2("h3", { children: [
        /* @__PURE__ */ jsx2(Boxes, { size: 19 }),
        " \u73A9\u5BB6\u521B\u4F5C"
      ] }),
      blueprints.error ? /* @__PURE__ */ jsx2(ServiceError, { remote: blueprints }) : !blueprints.data ? /* @__PURE__ */ jsx2("p", { className: "feed-loading", children: "\u6B63\u5728\u83B7\u53D6\u73A9\u5BB6\u4F5C\u54C1\u2026" }) : blueprints.data.items?.length ? blueprints.data.items.map((b) => /* @__PURE__ */ jsxs2("a", { href: "/community/#blueprints", children: [
        /* @__PURE__ */ jsx2("div", { children: b.cover ? /* @__PURE__ */ jsx2("img", { src: b.cover, alt: "", loading: "lazy" }) : /* @__PURE__ */ jsx2(Boxes, {}) }),
        /* @__PURE__ */ jsxs2("span", { children: [
          /* @__PURE__ */ jsxs2("small", { children: [
            b.mc,
            " \xB7 ",
            b.name
          ] }),
          /* @__PURE__ */ jsx2("h4", { children: b.title }),
          /* @__PURE__ */ jsx2("p", { children: b.category })
        ] }),
        /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 18 })
      ] }, b.id)) : /* @__PURE__ */ jsx2("p", { className: "feed-loading", children: "\u4F5C\u54C1\u6B63\u5728\u79EF\u7D2F\uFF0C\u671F\u5F85\u4F60\u7684\u4E0B\u4E00\u4EFD\u521B\u4F5C\u3002" }),
      /* @__PURE__ */ jsx2(Cached, { data: blueprints.data })
    ] })
  ] });
}
function ServiceError({ remote }) {
  return /* @__PURE__ */ jsxs2("div", { className: "feed-loading", children: [
    "\u6682\u65F6\u65E0\u6CD5\u83B7\u53D6\u793E\u533A\u5185\u5BB9\u3002",
    /* @__PURE__ */ jsxs2("button", { onClick: remote.retry, children: [
      "\u91CD\u65B0\u8FDE\u63A5 ",
      /* @__PURE__ */ jsx2(RefreshCw, { size: 12 })
    ] })
  ] });
}
function Cached({ data }) {
  return data?._site?.stale ? /* @__PURE__ */ jsx2("small", { className: "cached-note", children: "\u5F53\u524D\u663E\u793A\u6700\u8FD1\u83B7\u53D6\u7684\u5185\u5BB9" }) : null;
}
function Community({ content, path }) {
  const id = /\/post\/([\w-]+)/.exec(path)?.[1];
  return id ? /* @__PURE__ */ jsx2(PublicPost, { id }) : /* @__PURE__ */ jsxs2(Fragment, { children: [
    /* @__PURE__ */ jsxs2("section", { className: "page-intro", children: [
      /* @__PURE__ */ jsx2(Label, { children: "PEOPLE MAKE THE PLACE" }),
      /* @__PURE__ */ jsxs2("h1", { children: [
        "\u4E16\u754C\u56E0\u521B\u9020\u800C\u751F\uFF0C",
        /* @__PURE__ */ jsx2("br", {}),
        "\u793E\u533A\u56E0\u4F60\u800C\u4E0D\u540C\u3002"
      ] }),
      /* @__PURE__ */ jsx2("p", { children: "\u5206\u4EAB\u4F60\u7684\u673A\u68B0\u8BBE\u8BA1\u3001\u5192\u9669\u6545\u4E8B\uFF0C\u6216\u8005\u53EA\u662F\u4ECA\u5929\u7684\u4E00\u4EF6\u5C0F\u4E8B\u3002" }),
      /* @__PURE__ */ jsxs2("a", { className: "site-button primary", href: "/downloads/", children: [
        "\u901A\u8FC7\u542F\u52A8\u5668\u52A0\u5165\u8BA8\u8BBA ",
        /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 18 })
      ] })
    ] }),
    /* @__PURE__ */ jsx2("section", { className: "community-directory", children: /* @__PURE__ */ jsx2(PublicFeed, {}) }),
    /* @__PURE__ */ jsx2(BlueprintGallery, {}),
    /* @__PURE__ */ jsxs2("section", { className: "community-invite", children: [
      /* @__PURE__ */ jsx2("h2", { children: "\u6587\u5B57\u4E4B\u5916\uFF0C\u4E5F\u542C\u89C1\u5F7C\u6B64\u3002" }),
      /* @__PURE__ */ jsx2("p", { children: "\u5728\u542F\u52A8\u5668\u7684\u8BED\u97F3\u623F\u95F4\uFF0C\u6216\u5728 OOPZ\uFF0C\u4E00\u8D77\u804A\u804A\u4ECA\u5929\u7684\u5192\u9669\u3002" }),
      /* @__PURE__ */ jsxs2("a", { className: "site-button", href: content.site.oopz, target: "_blank", rel: "noreferrer", children: [
        "\u52A0\u5165 OOPZ ",
        /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 18 })
      ] })
    ] })
  ] });
}
function BlueprintGallery() {
  const [q, setQ] = useState2(""), [query, setQuery] = useState2(""), [offset, setOffset] = useState2(0);
  const result = useRemote("/api/community/blueprints?limit=9&offset=" + offset + "&q=" + encodeURIComponent(query));
  return /* @__PURE__ */ jsxs2("section", { className: "web-blueprints", id: "blueprints", children: [
    /* @__PURE__ */ jsxs2("div", { className: "section-heading", children: [
      /* @__PURE__ */ jsxs2("div", { children: [
        /* @__PURE__ */ jsx2(Label, { children: "THE WORKSHOP" }),
        /* @__PURE__ */ jsx2("h2", { children: "\u7075\u611F\uFF0C\u53EF\u4EE5\u4F20\u9012\u3002" })
      ] }),
      /* @__PURE__ */ jsxs2("form", { onSubmit: (e) => {
        e.preventDefault();
        setQuery(q);
        setOffset(0);
      }, children: [
        /* @__PURE__ */ jsx2("input", { value: q, onChange: (e) => setQ(e.target.value), placeholder: "\u641C\u7D22\u673A\u68B0\u52A8\u529B\u84DD\u56FE" }),
        /* @__PURE__ */ jsx2("button", { "aria-label": "\u641C\u7D22", children: /* @__PURE__ */ jsx2(ArrowRight, { size: 18 }) })
      ] })
    ] }),
    result.error ? /* @__PURE__ */ jsx2(ServiceError, { remote: result }) : /* @__PURE__ */ jsx2("div", { className: "web-blueprint-grid", children: result.data?.items?.map((b) => /* @__PURE__ */ jsxs2("article", { children: [
      /* @__PURE__ */ jsx2("div", { children: b.cover ? /* @__PURE__ */ jsx2("img", { src: b.cover, alt: b.title, loading: "lazy" }) : /* @__PURE__ */ jsx2(Boxes, { size: 52 }) }),
      /* @__PURE__ */ jsxs2("small", { children: [
        b.mc,
        " \xB7 ",
        b.loader,
        " \xB7 ",
        b.name
      ] }),
      /* @__PURE__ */ jsx2("h3", { children: b.title }),
      /* @__PURE__ */ jsx2("p", { children: b.description }),
      /* @__PURE__ */ jsxs2("a", { href: "https://qqbot.hxzmc.top/api/blueprints/" + encodeURIComponent(b.id) + "/file", className: "text-link", rel: "noreferrer", children: [
        "\u4E0B\u8F7D\u84DD\u56FE ",
        /* @__PURE__ */ jsx2(Download, { size: 15 })
      ] })
    ] }, b.id)) }),
    /* @__PURE__ */ jsx2(Cached, { data: result.data }),
    /* @__PURE__ */ jsxs2("div", { className: "web-pagination", children: [
      /* @__PURE__ */ jsx2("button", { disabled: !offset, onClick: () => setOffset((o) => Math.max(0, o - 9)), children: "\u4E0A\u4E00\u9875" }),
      /* @__PURE__ */ jsx2("span", { children: Math.floor(offset / 9) + 1 }),
      /* @__PURE__ */ jsx2("button", { disabled: offset + 9 >= (result.data?.total || 0), onClick: () => setOffset((o) => o + 9), children: "\u4E0B\u4E00\u9875" })
    ] })
  ] });
}
function PublicPost({ id }) {
  const result = useRemote("/api/community/forum/" + id + "?limit=12");
  const p = result.data?.post;
  return /* @__PURE__ */ jsxs2("section", { className: "web-post", children: [
    /* @__PURE__ */ jsx2("a", { className: "text-link", href: "/community/", children: "\u2190 \u8FD4\u56DE\u793E\u533A" }),
    result.error ? /* @__PURE__ */ jsx2(ServiceError, { remote: result }) : p ? /* @__PURE__ */ jsxs2(Fragment, { children: [
      /* @__PURE__ */ jsxs2("small", { children: [
        p.name,
        " \xB7 ",
        new Date(p.created).toLocaleDateString("zh-CN")
      ] }),
      /* @__PURE__ */ jsx2("h1", { children: p.title }),
      /* @__PURE__ */ jsx2("div", { className: "web-prose", children: p.body }),
      /* @__PURE__ */ jsx2("h3", { children: "\u8BA8\u8BBA" }),
      (result.data.replies?.items || result.data.replies || []).map((r) => /* @__PURE__ */ jsxs2("article", { children: [
        /* @__PURE__ */ jsx2("b", { children: r.name }),
        /* @__PURE__ */ jsx2("p", { className: "web-prose", children: r.body })
      ] }, r.id)),
      /* @__PURE__ */ jsxs2("a", { className: "site-button primary", href: "/downloads/", children: [
        "\u5728\u542F\u52A8\u5668\u4E2D\u53C2\u4E0E\u8BA8\u8BBA ",
        /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 16 })
      ] })
    ] }) : /* @__PURE__ */ jsx2("p", { children: "\u6B63\u5728\u8BFB\u53D6\u8BDD\u9898\u2026" })
  ] });
}
function Downloads({ content }) {
  const r = useRemote("/api/releases"), [platform, setPlatform] = useState2("x64"), [mirror, setMirror] = useState2("");
  const data = r.data;
  const assets = data?.assets?.filter((a) => platform === "android" ? a.name.endsWith(".apk") : a.name.includes(platform));
  return /* @__PURE__ */ jsxs2(Fragment, { children: [
    /* @__PURE__ */ jsxs2("section", { className: "page-intro", children: [
      /* @__PURE__ */ jsx2(Label, { children: "ONE PLACE FOR EVERYTHING" }),
      /* @__PURE__ */ jsxs2("h1", { children: [
        "\u4ECE\u8FD9\u91CC\uFF0C",
        /* @__PURE__ */ jsx2("br", {}),
        "\u8FDE\u63A5\u6574\u4E2A\u5E7B\u60F3\u9547\u3002"
      ] }),
      /* @__PURE__ */ jsx2("p", { children: "\u6E38\u620F\u542F\u52A8\u3001\u6574\u5408\u5305\u66F4\u65B0\u3001\u793E\u533A\u4E0E\u597D\u53CB\u3002\u8BA9\u51C6\u5907\u66F4\u7B80\u5355\uFF0C\u628A\u65F6\u95F4\u7559\u7ED9\u6E38\u73A9\u3002" })
    ] }),
    /* @__PURE__ */ jsxs2("section", { className: "download-workspace", children: [
      /* @__PURE__ */ jsxs2("div", { className: "launcher-presentation", children: [
        /* @__PURE__ */ jsxs2("div", { className: "presentation-top", children: [
          /* @__PURE__ */ jsx2("span", { children: "FANTASY TOWN" }),
          /* @__PURE__ */ jsx2("span", { children: "\u6E38\u73A9\u3000\u793E\u533A\u3000\u5DE5\u574A" }),
          /* @__PURE__ */ jsx2("i", {})
        ] }),
        /* @__PURE__ */ jsxs2("div", { className: "presentation-body", children: [
          /* @__PURE__ */ jsx2("small", { children: "YOUR WORLDS" }),
          /* @__PURE__ */ jsx2("h2", { children: "\u4ECA\u665A\uFF0C\u53BB\u54EA\u513F\uFF1F" }),
          /* @__PURE__ */ jsxs2("div", { className: "presentation-scene", children: [
            /* @__PURE__ */ jsx2("img", { src: content.home.heroImage, alt: "" }),
            /* @__PURE__ */ jsxs2("div", { children: [
              /* @__PURE__ */ jsx2("small", { children: "\u5E7B\u60F3\u9547\u5B98\u65B9\u670D\u52A1\u5668" }),
              /* @__PURE__ */ jsx2("h3", { children: "\u539F\u7248\u751F\u5B58\u7FA4\u7EC4" }),
              /* @__PURE__ */ jsx2("span", { children: "\u5F00\u59CB\u6E38\u620F \u2192" })
            ] })
          ] }),
          /* @__PURE__ */ jsx2("div", { className: "presentation-games", children: content.servers.map((s) => /* @__PURE__ */ jsxs2("div", { children: [
            /* @__PURE__ */ jsx2("img", { src: s.image, alt: "" }),
            /* @__PURE__ */ jsx2("b", { children: s.short })
          ] }, s.id)) })
        ] }),
        /* @__PURE__ */ jsx2("p", { children: "NEXT \u65B0\u754C\u9762\u9884\u89C8 \xB7 \u4E0B\u65B9\u4E0B\u8F7D\u63D0\u4F9B\u5F53\u524D\u6B63\u5F0F\u7248" })
      ] }),
      /* @__PURE__ */ jsxs2("div", { className: "download-choices", children: [
        /* @__PURE__ */ jsx2("h2", { children: "\u9009\u4E00\u4E2A\u9002\u5408\u4F60\u7684\u7248\u672C\u3002" }),
        /* @__PURE__ */ jsx2("div", { className: "platform-choices", children: [{ id: "x64", title: "Windows 64 \u4F4D", desc: "\u9002\u7528\u4E8E\u5E38\u89C1 Windows \u7535\u8111", icon: Monitor }, { id: "ia32", title: "Windows 32 \u4F4D", desc: "\u517C\u5BB9\u65E7\u8BBE\u5907\uFF0C\u9002\u7528\u8303\u56F4\u89C1\u53D1\u884C\u8BF4\u660E", icon: Monitor }, { id: "android", title: "Android \u793E\u533A", desc: "\u624B\u673A\u7AEF\u804A\u5929\u3001\u8BED\u97F3\u4E0E\u793E\u533A", icon: Smartphone }].map((p) => /* @__PURE__ */ jsxs2("button", { className: platform === p.id ? "selected" : "", onClick: () => setPlatform(p.id), children: [
          /* @__PURE__ */ jsx2(p.icon, { size: 23 }),
          /* @__PURE__ */ jsxs2("span", { children: [
            /* @__PURE__ */ jsx2("b", { children: p.title }),
            /* @__PURE__ */ jsx2("small", { children: p.desc })
          ] }),
          platform === p.id && /* @__PURE__ */ jsx2(Check2, { size: 17 })
        ] }, p.id)) }),
        /* @__PURE__ */ jsxs2("label", { className: "download-source", children: [
          "\u4E0B\u8F7D\u8282\u70B9",
          /* @__PURE__ */ jsxs2("select", { value: mirror, onChange: (e) => setMirror(e.target.value), children: [
            /* @__PURE__ */ jsx2("option", { value: "", children: "GitHub \u5B98\u65B9" }),
            /* @__PURE__ */ jsx2("option", { value: "https://gh-proxy.org/", children: "gh-proxy.org \u955C\u50CF" }),
            /* @__PURE__ */ jsx2("option", { value: "https://ghfast.top/", children: "ghfast.top \u955C\u50CF" })
          ] })
        ] }),
        r.error ? /* @__PURE__ */ jsx2(ServiceError, { remote: r }) : !data ? /* @__PURE__ */ jsx2("p", { children: "\u6B63\u5728\u8BFB\u53D6\u6B63\u5F0F\u7248\u672C\u2026" }) : /* @__PURE__ */ jsxs2(Fragment, { children: [
          assets?.map((a) => /* @__PURE__ */ jsxs2("a", { className: "site-button " + (a.name.endsWith(".zip") ? "" : "primary"), href: mirror + a.url, rel: "noreferrer", children: [
            a.name.endsWith(".zip") ? "\u4FBF\u643A\u7248" : platform === "android" ? "\u4E0B\u8F7D APK" : "\u4E0B\u8F7D\u5B89\u88C5\u7A0B\u5E8F",
            " \xB7 ",
            data.version,
            /* @__PURE__ */ jsx2(Download, { size: 17 })
          ] }, a.name)),
          /* @__PURE__ */ jsx2(Cached, { data }),
          !assets?.length && /* @__PURE__ */ jsxs2("a", { className: "site-button primary", href: data.url || content.site.github, children: [
            "\u67E5\u770B\u5B8C\u6574\u53D1\u5E03\u6587\u4EF6 ",
            /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 17 })
          ] })
        ] }),
        /* @__PURE__ */ jsxs2("a", { className: "text-link", href: content.site.github, target: "_blank", rel: "noreferrer", children: [
          "\u5386\u53F2\u7248\u672C\u4E0E\u53D1\u884C\u8BF4\u660E ",
          /* @__PURE__ */ jsx2(ArrowUpRight2, { size: 15 })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs2("section", { className: "release-notes", children: [
      /* @__PURE__ */ jsx2(Label, { children: "WHAT\u2019S NEW" }),
      /* @__PURE__ */ jsxs2("h2", { children: [
        "\u7248\u672C\u52A8\u6001 ",
        data?.version
      ] }),
      /* @__PURE__ */ jsx2("div", { className: "web-prose", children: data?.notes || "\u83B7\u53D6\u6B63\u5F0F\u7248\u53D1\u884C\u8BF4\u660E\u540E\u663E\u793A\u3002" })
    ] })
  ] });
}

// apps/website/src/entry-server.tsx
import { jsx as jsx3 } from "react/jsx-runtime";
function render(content, path) {
  return renderToString(/* @__PURE__ */ jsx3(Website, { content, path }));
}
export {
  render
};
