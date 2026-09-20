/**
 * Rôles et permissions (§4).
 *
 * Deux rôles sont activés aujourd'hui : propriétaire et locataire.
 * Les sept autres sont déjà décrits ici — les activer consiste à les retirer
 * de INACTIVE_ROLES, sans toucher au reste de l'application.
 */

export const ROLES = {
  super_admin: "Super administrateur",
  admin: "Administrateur",
  proprietaire: "Propriétaire",
  gestionnaire: "Gestionnaire immobilier",
  comptable: "Comptable",
  agent: "Agent",
  maintenance: "Responsable maintenance",
  assistant: "Assistant",
  locataire: "Locataire",
};

/** Rôles non encore ouverts à l'inscription. */
export const INACTIVE_ROLES = [
  "super_admin", "admin", "gestionnaire", "comptable",
  "agent", "maintenance", "assistant",
];

export const SIGNUP_ROLES = Object.keys(ROLES).filter(
  (r) => !INACTIVE_ROLES.includes(r)
);

/**
 * Une permission s'écrit `domaine.action`.
 * `*` vaut pour toutes les actions du domaine.
 */
const P = {
  super_admin: ["*"],
  admin: ["*"],

  proprietaire: [
    "patrimoine.*", "proprietaires.*", "locataires.*", "garants.*",
    "candidatures.*", "visites.*", "baux.*", "echeances.*", "factures.*",
    "charges.*", "paiements.*", "impayes.*", "relances.*", "promesses.*",
    "etats_des_lieux.*", "cautions.*", "maintenance.*", "prestataires.*",
    "comptabilite.*", "documents.*", "agenda.*", "taches.*", "rapports.*",
    "notifications.*", "parametres.*", "audit.lire", "corbeille.*",
    "sauvegarde.*", "assistant.utiliser",
  ],

  gestionnaire: [
    "patrimoine.*", "locataires.*", "garants.*", "candidatures.*", "visites.*",
    "baux.*", "echeances.*", "factures.*", "charges.*", "paiements.*",
    "impayes.*", "relances.*", "promesses.*", "etats_des_lieux.*",
    "cautions.*", "maintenance.*", "prestataires.*", "documents.*",
    "agenda.*", "taches.*", "rapports.lire", "notifications.*",
    "audit.lire", "assistant.utiliser",
  ],

  comptable: [
    "patrimoine.lire", "locataires.lire", "baux.lire", "echeances.lire",
    "factures.*", "charges.*", "paiements.*", "impayes.lire",
    "comptabilite.*", "rapports.*", "documents.lire", "audit.lire",
  ],

  agent: [
    "patrimoine.lire", "candidatures.*", "visites.*", "locataires.lire",
    "locataires.creer", "documents.lire", "agenda.*", "taches.lire",
  ],

  maintenance: [
    "patrimoine.lire", "maintenance.*", "prestataires.*", "taches.*",
    "agenda.lire", "documents.lire",
  ],

  assistant: [
    "patrimoine.lire", "locataires.lire", "baux.lire", "echeances.lire",
    "relances.*", "taches.*", "agenda.*", "documents.lire",
    "notifications.lire",
  ],

  // Le locataire ne voit QUE son propre dossier — filtré côté serveur
  // par les règles d'API, et côté client par ces permissions (§4).
  locataire: [
    "espace_locataire.lire", "mon_bail.lire", "mes_paiements.lire",
    "mes_documents.lire", "preuve_paiement.creer", "maintenance.declarer",
    "maintenance.suivre", "messages.envoyer", "notifications.lire",
    "profil.modifier",
  ],
};

export function permissionsFor(role, overrides) {
  const base = P[role] || [];
  if (!overrides) return base;
  const added = overrides.add || [];
  const removed = overrides.remove || [];
  return [...base, ...added].filter((p) => !removed.includes(p));
}

export function can(user, permission) {
  if (!user || user.active === false) return false;
  const list = permissionsFor(user.role, user.permissions_override);
  if (list.includes("*")) return true;
  if (list.includes(permission)) return true;
  const [domain] = permission.split(".");
  return list.includes(`${domain}.*`);
}

/** Vrai si le rôle relève de l'espace propriétaire/gestion. */
export function isManagerRole(role) {
  return role !== "locataire";
}
