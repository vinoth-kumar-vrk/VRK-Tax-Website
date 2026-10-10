(function () {
  var API = "/api/admin";
  var STATUSES = ["new", "contacted", "in-progress", "closed", "spam"];
  var $ = function (id) { return document.getElementById(id); };
  var state = { status: "all", q: "" };

  function token() { try { return sessionStorage.getItem("vrk_admin"); } catch (e) { return null; } }
  function setToken(t) { try { t ? sessionStorage.setItem("vrk_admin", t) : sessionStorage.removeItem("vrk_admin"); } catch (e) {} }

  function api(path, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ authorization: "Bearer " + token() }, opts.headers || {});
    return fetch(API + path, opts).then(function (res) {
      if (res.status === 401) { signOut(); throw new Error("Session expired"); }
      return res;
    });
  }

  function view(loggedIn) {
    $("login").hidden = loggedIn;
    $("app").hidden = !loggedIn;
    if (!loggedIn) $("pw").focus();
  }
  function signOut() { setToken(null); view(false); }

  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === "text") n.textContent = attrs[k]; else if (k === "class") n.className = attrs[k]; else n.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { n.appendChild(c); });
    return n;
  }

  function render(data) {
    var stats = $("stats");
    stats.textContent = "";
    [["all", data.total]].concat(STATUSES.map(function (s) { return [s, data.counts[s] || 0]; })).forEach(function (p) {
      var d = el("div", { class: "stat" + (state.status === p[0] ? " on" : ""), role: "button", tabindex: "0" }, [el("b", { text: p[1] }), el("span", { text: p[0] })]);
      var go = function () { state.status = p[0]; load(); };
      d.addEventListener("click", go);
      d.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
      stats.appendChild(d);
    });

    var list = $("list");
    list.textContent = "";
    if (!data.items.length) { list.appendChild(el("div", { class: "empty", text: "No enquiries found." })); return; }

    data.items.forEach(function (r) {
      var sel = el("select", { "aria-label": "Status" });
      STATUSES.forEach(function (s) { var o = el("option", { value: s, text: s }); if (s === r.status) o.selected = true; sel.appendChild(o); });
      var note = el("input", { type: "text", placeholder: "Internal note", maxlength: "1000" });
      note.value = r.note || "";
      var save = el("button", { class: "btn", type: "button", text: "Save" });
      var del = el("button", { class: "btn danger", type: "button", text: "Delete" });

      save.addEventListener("click", function () {
        save.disabled = true;
        api("/enquiries/" + encodeURIComponent(r.id), { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: sel.value, note: note.value }) })
          .then(function () { save.textContent = "Saved ✓"; setTimeout(load, 500); })
          .catch(function () { save.disabled = false; });
      });
      del.addEventListener("click", function () {
        if (!confirm("Delete this enquiry permanently?")) return;
        api("/enquiries/" + encodeURIComponent(r.id), { method: "DELETE" }).then(load).catch(function () {});
      });

      var phone = el("a", { href: "tel:" + r.phone, text: r.phone });
      var wa = el("a", { href: "https://wa.me/" + r.phone.replace(/\D/g, ""), target: "_blank", rel: "noopener", text: "WhatsApp" });
      var meta = el("div", { class: "meta" }, [phone, wa]);
      if (r.email) meta.appendChild(el("a", { href: "mailto:" + r.email, text: r.email }));
      meta.appendChild(el("span", { class: "tag", text: r.service }));

      var card = el("article", { class: "card" }, [
        el("div", { class: "row1" }, [el("h3", { text: r.name }), el("time", { text: new Date(r.createdAt).toLocaleString() })]),
        meta,
      ]);
      if (r.message) card.appendChild(el("div", { class: "msgtxt", text: r.message }));
      card.appendChild(el("div", { class: "act" }, [sel, note, save, del]));
      list.appendChild(card);
    });
  }

  function load() {
    var qs = "?status=" + encodeURIComponent(state.status) + "&q=" + encodeURIComponent(state.q);
    return api("/enquiries" + qs).then(function (r) { return r.json(); }).then(render).catch(function () {});
  }

  $("loginForm").addEventListener("submit", function (e) {
    e.preventDefault();
    $("loginErr").textContent = "";
    fetch(API + "/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: $("pw").value }) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (r) {
        if (!r.ok) { $("loginErr").textContent = r.d.error || "Sign in failed."; return; }
        setToken(r.d.token); $("pw").value = ""; view(true); load();
      })
      .catch(function () { $("loginErr").textContent = "Network error."; });
  });

  var timer;
  $("q").addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(function () { state.q = $("q").value; load(); }, 250); });
  $("refresh").addEventListener("click", load);
  $("logout").addEventListener("click", signOut);
  $("export").addEventListener("click", function () {
    api("/enquiries?format=csv&status=" + encodeURIComponent(state.status) + "&q=" + encodeURIComponent(state.q))
      .then(function (r) { return r.blob(); })
      .then(function (b) {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(b); a.download = "vrk-enquiries.csv"; a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      }).catch(function () {});
  });

  if (token()) { view(true); load(); } else view(false);
})();
