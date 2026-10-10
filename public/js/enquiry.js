// Enquiry form -> POST /api/enquiry (Netlify Function). Falls back to WhatsApp/call if the request fails.
(function () {
  var form = document.getElementById("enquiry");
  if (!form) return;

  var msg = form.querySelector(".form-msg");
  var btn = form.querySelector('button[type="submit"]');
  var lbl = btn.querySelector(".lbl");
  var idle = lbl.textContent;

  function show(kind, html) {
    msg.hidden = false;
    msg.className = "form-msg " + kind;
    msg.innerHTML = html;
  }
  function field(id) {
    return form.querySelector("#" + id);
  }
  function waLink() {
    var t =
      "Hello VRK Tax Solutions, I would like to enquire.\nName: " + field("f-name").value.trim() +
      "\nMobile: " + field("f-phone").value.trim() +
      "\nService: " + field("f-service").value +
      (field("f-msg").value.trim() ? "\nMessage: " + field("f-msg").value.trim() : "");
    return "https://wa.me/919092188514?text=" + encodeURIComponent(t);
  }
  function clearErrors() {
    form.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
  }
  function flag(errors) {
    var map = { name: "f-name", phone: "f-phone", email: "f-email", service: "f-service" };
    var first = null;
    Object.keys(errors || {}).forEach(function (k) {
      var el = map[k] && field(map[k]);
      if (el) { el.setAttribute("aria-invalid", "true"); first = first || el; }
    });
    if (first) first.focus();
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    clearErrors();

    var payload = {
      name: field("f-name").value,
      phone: field("f-phone").value,
      email: field("f-email") ? field("f-email").value : "",
      service: field("f-service").value,
      message: field("f-msg").value,
      website: form.querySelector('[name="website"]').value, // honeypot
      page: location.pathname,
    };

    btn.disabled = true;
    lbl.textContent = "Sending…";
    msg.hidden = true;

    fetch("/api/enquiry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) { return { res: res, data: data }; });
      })
      .then(function (r) {
        if (r.res.ok && r.data.ok) {
          show("ok", "Thank you — we’ve received your enquiry and will call you back the same working day. " +
            '<a href="' + waLink() + '" target="_blank" rel="noopener">Continue on WhatsApp</a>');
          form.reset();
        } else if (r.res.status === 400) {
          flag(r.data.errors);
          show("err", (r.data.errors && Object.values(r.data.errors)[0]) || r.data.error || "Please check your details.");
        } else {
          show("err", (r.data.error || "Something went wrong.") +
            ' <a href="' + waLink() + '" target="_blank" rel="noopener">Send on WhatsApp instead</a>');
        }
      })
      .catch(function () {
        show("err", "We couldn’t reach the server. " +
          '<a href="' + waLink() + '" target="_blank" rel="noopener">Send on WhatsApp</a> or call +91 90921 88514.');
      })
      .then(function () {
        btn.disabled = false;
        lbl.textContent = idle;
      });
  });
})();
