/** Formatage des dates et libellés d'énumérations. */

const dateFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit", month: "2-digit", year: "numeric",
});
const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit",
});
const longFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric", month: "long", year: "numeric",
});

export const formatDate = (v) => (v ? dateFmt.format(new Date(v)) : "—");
export const formatDateTime = (v) => (v ? dateTimeFmt.format(new Date(v)) : "—");
export const formatLongDate = (v) => (v ? longFmt.format(new Date(v)) : "—");

export function daysBetween(a, b = new Date()) {
  if (!a) return null;
  const ms = new Date(b).setHours(0, 0, 0, 0) - new Date(a).setHours(0, 0, 0, 0);
  return Math.round(ms / 86400000);
}

export function relativeDays(date) {
  const d = daysBetween(date);
  if (d === null) return "—";
  if (d === 0) return "aujourd'hui";
  if (d === 1) return "hier";
  if (d === -1) return "demain";
  return d > 0 ? `il y a ${d} jours` : `dans ${-d} jours`;
}

/** `dossier_en_cours` → `Dossier en cours` */
export function humanize(value) {
  if (!value) return "—";
  const s = String(value).replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const fullName = (t) =>
  t ? [t.first_name, t.last_name].filter(Boolean).join(" ") : "—";

/** Numéro au format international, prêt pour wa.me (§24). */
export function toWhatsAppNumber(raw, defaultCountryCode = "229") {
  if (!raw) return null;
  let n = String(raw).replace(/[^\d+]/g, "");
  if (n.startsWith("+")) return n.slice(1);
  if (n.startsWith("00")) return n.slice(2);
  if (n.startsWith(defaultCountryCode)) return n;
  return defaultCountryCode + n.replace(/^0+/, "");
}
