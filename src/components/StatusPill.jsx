import { humanize } from "../lib/format";

/**
 * §60 — une seule logique de couleur dans toute l'application :
 * vert normal, orange attention, rouge urgent, gris information.
 */
const RED = [
  "impaye", "en_retard", "rouge", "urgente", "litige", "resilie",
  "hors_service", "refuse", "non_tenue", "echec", "conteste", "rejete",
];
const ORANGE = [
  "partiellement_paye", "a_payer", "orange", "en_preavis", "expirant",
  "dossier_incomplet", "haute", "en_attente", "a_calculer", "reporte",
  "partiellement_retenue", "a_signer", "soumise", "en_litige",
];
const GREEN = [
  "paye", "actif", "vert", "loue", "valide", "resolu", "accepte",
  "effectuee", "tenue", "renouvele", "restituee", "validee", "signe",
  "disponible", "faite", "envoye",
];

export function toneFor(value) {
  const v = String(value || "").toLowerCase();
  if (RED.includes(v)) return "alert";
  if (ORANGE.includes(v)) return "warn";
  if (GREEN.includes(v)) return "ok";
  return "info";
}

export default function StatusPill({ value, label }) {
  const tone = toneFor(value);
  return (
    <span className={`pill-${tone}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          tone === "alert" ? "bg-alert" : tone === "warn" ? "bg-warn"
          : tone === "ok" ? "bg-ok" : "bg-ink-faint"
        }`}
        aria-hidden
      />
      {label || humanize(value)}
    </span>
  );
}
