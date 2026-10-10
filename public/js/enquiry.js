// Enquiry form -> owner's WhatsApp. No server involved: on submit the visitor's details are
// pre-filled into a WhatsApp message addressed to the business number; the visitor just presses Send.
(function () {
  var WA_NUMBER = "919092188514";
  var form = document.getElementById("enquiry");
  if (!form) return;

  var msg = form.querySelector(".form-msg");
  function field(id) { return form.querySelector("#" + id); }
  function show(kind, html) {
    msg.hidden = false;
    msg.className = "form-msg " + kind;
    msg.innerHTML = html;
  }
  function clearErrors() {
    form.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
  }
  function bad(el, text) {
    el.setAttribute("aria-invalid", "true");
    el.focus();
    show("err", text);
  }

  form.addEventListener("submit", function (ev) {
    ev.preventDefault();
    clearErrors();
    if (form.querySelector('[name="website"]').value) return; // honeypot: bots only

    var name = field("f-name").value.trim();
    var phone = field("f-phone").value.replace(/[^\d+]/g, "");
    var email = field("f-email") ? field("f-email").value.trim() : "";
    var service = field("f-service").value;
    var note = field("f-msg").value.trim();

    if (name.length < 2) return bad(field("f-name"), "Please enter your name.");
    if (phone.replace(/\D/g, "").length < 10) return bad(field("f-phone"), "Please enter a valid mobile number.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return bad(field("f-email"), "Please enter a valid email address.");

    var lines = [
      "Hello VRK Tax Solutions, I would like help with " + (service || "your services") + ".",
      "",
      "Name: " + name,
      "Mobile: " + phone
    ];
    if (email) lines.push("Email: " + email);
    if (note) lines.push("Message: " + note);
    var url = "https://wa.me/" + WA_NUMBER + "?text=" + encodeURIComponent(lines.join("\n"));

    var w = window.open(url, "_blank", "noopener");
    show("ok", w
      ? "WhatsApp is opening with your details — please press <b>Send</b> to reach us."
      : 'Tap here to send your enquiry: <a href="' + url + '" target="_blank" rel="noopener">Open WhatsApp</a>');
    form.reset();
  });
})();
