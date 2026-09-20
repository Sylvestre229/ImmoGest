/**
 * Devises et conversion (§39).
 *
 * Règle absolue : on ne remplace jamais le montant d'origine par sa conversion.
 * Un montant stocké, c'est cinq colonnes :
 *   amount, amount_currency, amount_rate, amount_base, amount_rate_date
 */

import { pb } from "./pb";
import { C } from "./collections";

const DECIMALS = { XOF: 0, XAF: 0, JPY: 0 };

export function decimalsFor(code) {
  return DECIMALS[code] ?? 2;
}

/** Formate un montant pour l'affichage. Jamais de conversion implicite ici. */
export function formatMoney(amount, code = "XOF", { compact = false } = {}) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  const d = decimalsFor(code);
  const formatted = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: compact ? 0 : d,
    maximumFractionDigits: d,
    notation: compact && Math.abs(amount) >= 1_000_000 ? "compact" : "standard",
  }).format(amount);
  return `${formatted} ${code}`;
}

/**
 * Prépare les cinq colonnes d'un montant.
 * `rate` est le taux vers la devise comptable de base au moment de la saisie.
 */
export function buildMoney(prefix, amount, currencyId, currencyCode, baseCode, rate) {
  const appliedRate = currencyCode === baseCode ? 1 : rate;
  return {
    [prefix]: amount,
    [`${prefix}_currency`]: currencyId,
    [`${prefix}_rate`]: appliedRate,
    [`${prefix}_base`]: round(amount * appliedRate, decimalsFor(baseCode)),
    [`${prefix}_rate_date`]: new Date().toISOString(),
  };
}

export function readMoney(record, prefix) {
  if (!record) return null;
  return {
    amount: record[prefix],
    currencyId: record[`${prefix}_currency`],
    rate: record[`${prefix}_rate`],
    base: record[`${prefix}_base`],
    rateDate: record[`${prefix}_rate_date`],
  };
}

export function round(value, decimals = 2) {
  const f = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * f) / f;
}

/**
 * Cherche le taux applicable à une date. Aucun taux inventé :
 * si rien n'est enregistré, la fonction renvoie null et l'appelant
 * doit demander une saisie manuelle.
 */
export async function findRate(fromId, toId, at = new Date()) {
  if (fromId === toId) return 1;
  const res = await pb.collection(C.exchangeRates).getList(1, 1, {
    filter: `from_currency="${fromId}" && to_currency="${toId}" && valid_from<="${at.toISOString()}"`,
    sort: "-valid_from",
  });
  return res.items.length ? res.items[0].rate : null;
}

/** Récupère les taux depuis le service configuré, s'il y en a un. */
export async function fetchRemoteRates(baseCode) {
  const url = import.meta.env.VITE_FX_API_URL;
  if (!url) return null; // pas de service configuré : saisie manuelle
  const key = import.meta.env.VITE_FX_API_KEY;
  const res = await fetch(
    `${url}?base=${baseCode}${key ? `&access_key=${key}` : ""}`
  );
  if (!res.ok) throw new Error("Le service de taux de change n'a pas répondu.");
  const data = await res.json();
  return data.rates || null;
}

/** Couleur de santé d'un solde (§20, §60). */
export function balanceHealth({ balance, overduePeriods = 0, daysLate = 0 }) {
  if (balance <= 0) return "vert";
  if (overduePeriods >= 2) return "rouge";
  if (daysLate > 30) return "rouge";
  if (balance > 0) return "orange";
  return "vert";
}
