export const SERVICES = [
  "GST Services",
  "Income Tax Services",
  "TDS & TCS Services",
  "PF & ESI Services",
  "MSME / Udyam Services",
  "IEC / Import & Export Services",
  "Professional Tax Services",
  "TN Shops & Establishments",
  "LWF Services",
  "Payroll & Salary Services",
  "DSC Services",
  "ROC & MCA Services",
  "FSSAI Services",
  "Accounts & Bookkeeping Services",
  "Not sure",
];

export const STATUSES = ["new", "contacted", "in-progress", "closed", "spam"];

// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
const clean = (v, max) => String(v ?? "").replace(CONTROL, "").trim().slice(0, max);

/** Normalise an Indian mobile number to +91XXXXXXXXXX where possible. */
export function normalisePhone(raw) {
  const digits = String(raw ?? "").replace(/[^\d]/g, "");
  if (digits.length === 10 && /^[6-9]/.test(digits)) return "+91" + digits;
  if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits[1])) return "+91" + digits.slice(1);
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits[2])) return "+" + digits;
  if (String(raw).trim().startsWith("+") && digits.length >= 8 && digits.length <= 15) return "+" + digits; // overseas
  return null;
}

export function validateEnquiry(body = {}) {
  const errors = {};
  const name = clean(body.name, 80);
  const email = clean(body.email, 120);
  const service = clean(body.service, 60);
  const message = clean(body.message, 1000);
  const phone = normalisePhone(body.phone);

  if (name.length < 2) errors.name = "Please enter your name.";
  if (!phone) errors.phone = "Please enter a valid mobile number.";
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.email = "Please enter a valid email address.";
  if (service && !SERVICES.includes(service)) errors.service = "Please choose a service from the list.";

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value: { name, phone, email, service: service || "Not sure", message },
  };
}
