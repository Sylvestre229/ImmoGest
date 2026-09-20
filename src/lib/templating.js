/**
 * Modèles de communication (§47).
 * Les variables sont résolues à partir des données réelles, jamais inventées.
 */

import { formatMoney } from "./money";
import { formatDate, fullName } from "./format";

export const VARIABLES = [
  ["nom_locataire", "Nom complet du locataire"],
  ["prenom_locataire", "Prénom du locataire"],
  ["nom_proprietaire", "Nom du propriétaire"],
  ["reference_logement", "Référence du logement"],
  ["adresse_logement", "Adresse du logement"],
  ["reference_bail", "Numéro du bail"],
  ["montant", "Montant dû pour l'échéance"],
  ["solde", "Solde total du locataire"],
  ["date_echeance", "Date d'échéance"],
  ["jours_retard", "Nombre de jours de retard"],
  ["periode", "Période facturée"],
  ["numero_facture", "Numéro de la facture"],
];

/** Construit le dictionnaire de variables depuis les enregistrements liés. */
export function buildContext({ tenant, owner, unit, lease, invoice, balance, currency }) {
  const code = currency || "XOF";
  return {
    nom_locataire: fullName(tenant),
    prenom_locataire: tenant?.first_name || "",
    nom_proprietaire: owner?.full_name || "",
    reference_logement: unit?.reference || "",
    adresse_logement: unit?.name || unit?.door_number || "",
    reference_bail: lease?.reference || "",
    montant: invoice ? formatMoney(invoice.balance, code) : "",
    solde: balance ? formatMoney(balance.balance, code) : "",
    date_echeance: formatDate(invoice?.due_date),
    jours_retard: balance?.days_late != null ? String(balance.days_late) : "",
    periode: invoice
      ? `${formatDate(invoice.period_start)} – ${formatDate(invoice.period_end)}`
      : "",
    numero_facture: invoice?.number || "",
  };
}

/** Remplace {{variable}}. Une variable inconnue reste visible plutôt que vide. */
export function render(template, context) {
  if (!template) return "";
  return template.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (match, key) => {
    const value = context[key];
    return value === undefined || value === "" ? match : value;
  });
}

/** Signale les variables non résolues avant l'envoi. */
export function missingVariables(template, context) {
  const found = [...(template || "").matchAll(/\{\{\s*([\w_]+)\s*\}\}/g)].map((m) => m[1]);
  return [...new Set(found)].filter((k) => !context[k]);
}
