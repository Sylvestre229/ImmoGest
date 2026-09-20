/**
 * WhatsApp (§24).
 *
 * Deux modes, jamais confondus :
 *  - standard   : ouvre wa.me avec un message prérempli. L'envoi réel dépend
 *                 de l'utilisateur, on n'enregistre donc que « ouvert ».
 *  - automatisé : uniquement si une API WhatsApp Business est configurée.
 *
 * Tant qu'aucune API n'est configurée, l'interface ne prétend pas envoyer.
 */

import { toWhatsAppNumber } from "./format";

export function whatsappMode() {
  return import.meta.env.VITE_WHATSAPP_API_URL ? "automatise" : "standard";
}

export function whatsappLink(phone, message, countryCode = "229") {
  const number = toWhatsAppNumber(phone, countryCode);
  if (!number) return null;
  return `https://wa.me/${number}?text=${encodeURIComponent(message || "")}`;
}

export function callLink(phone) {
  return phone ? `tel:${String(phone).replace(/\s/g, "")}` : null;
}

/** Envoi via API Business. Échoue explicitement si non configurée. */
export async function sendViaBusinessApi(phone, message, countryCode = "229") {
  const url = import.meta.env.VITE_WHATSAPP_API_URL;
  const token = import.meta.env.VITE_WHATSAPP_API_TOKEN;
  if (!url) {
    throw new Error(
      "Aucune API WhatsApp Business n'est configurée. Utilisez le mode standard " +
        "ou renseignez l'intégration dans Paramètres."
    );
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      to: toWhatsAppNumber(phone, countryCode),
      type: "text",
      text: { body: message },
    }),
  });
  if (!res.ok) throw new Error("L'API WhatsApp a refusé le message.");
  return res.json();
}
