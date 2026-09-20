/// <reference path="../pb_data/types.d.ts" />

/**
 * GestImmo — schéma complet.
 * Écrit pour PocketBase >= 0.23 (API `app` + `fields`).
 *
 * Le schéma est décrit sous forme de données puis construit en boucle :
 * ajouter une table ou un champ = éditer le tableau `COLLECTIONS`, rien d'autre.
 */

// ---------------------------------------------------------------- helpers
const T = (name, o = {}) => ({ name, type: "text", ...o });
const N = (name, o = {}) => ({ name, type: "number", ...o });
const B = (name) => ({ name, type: "bool" });
const D = (name) => ({ name, type: "date" });
const J = (name) => ({ name, type: "json", maxSize: 2000000 });
const E = (name) => ({ name, type: "editor" });
const S = (name, values, o = {}) => ({ name, type: "select", maxSelect: 1, values, ...o });
const M = (name, values) => ({ name, type: "select", maxSelect: 5, values });
const R = (name, target, o = {}) => ({
  name,
  type: "relation",
  _target: target,
  maxSelect: 1,
  cascadeDelete: false,
  ...o,
});
const FILE = (name, o = {}) => ({ name, type: "file", maxSelect: 1, maxSize: 10485760, ...o });
const FILES = (name) => ({ name, type: "file", maxSelect: 5, maxSize: 10485760 });

// Champs de traçabilité posés sur presque toutes les tables.
const SOFT = [B("deleted"), D("deleted_at"), R("deleted_by", "users")];

// Montant multi-devise : on ne détruit JAMAIS la valeur d'origine (§39).
const MONEY = (prefix) => [
  N(prefix, { min: 0 }),
  R(prefix + "_currency", "currencies"),
  N(prefix + "_rate", { min: 0 }),
  N(prefix + "_base", { min: 0 }),
  D(prefix + "_rate_date"),
];

// ---------------------------------------------------------------- statuts
const UNIT_STATUS = ["disponible", "reserve", "en_visite", "dossier_en_cours", "loue",
  "en_preavis", "en_sortie", "en_maintenance", "indisponible", "hors_service"];
const LEASE_STATUS = ["brouillon", "en_preparation", "a_signer", "actif", "en_retard",
  "en_preavis", "expirant", "renouvellement_propose", "renouvele", "resilie", "expire", "cloture"];
const SCHEDULE_STATUS = ["a_venir", "a_payer", "partiellement_paye", "paye", "en_retard",
  "impaye", "en_litige", "annule"];
const APPLICATION_STATUS = ["nouveau", "contacte", "visite_programmee", "visite_effectuee",
  "dossier_incomplet", "dossier_complet", "en_etude", "accepte", "refuse",
  "bail_en_preparation", "bail_signe"];
const VISIT_STATUS = ["planifiee", "confirmee", "effectuee", "annulee", "reportee", "absence"];
const TICKET_STATUS = ["nouveau", "a_analyser", "planifie", "en_cours", "en_attente",
  "resolu", "valide", "ferme"];
const DEPOSIT_STATUS = ["detenue", "a_calculer", "partiellement_retenue", "a_restituer",
  "restituee", "litige"];
const PERIODICITY = ["mensuelle", "bimestrielle", "trimestrielle", "semestrielle",
  "annuelle", "personnalisee"];
const UNIT_TYPE = ["maison", "villa", "studio", "appartement", "bureau", "boutique",
  "magasin", "parking", "terrain", "local_professionnel", "autre"];
const CHANNELS = ["interne", "email", "sms", "whatsapp", "appel"];
const SEVERITY = ["normal", "attention", "urgent", "information"];

// ---------------------------------------------------------------- schéma
const COLLECTIONS = [
  // ---- référentiels -----------------------------------------------------
  {
    name: "currencies",
    fields: [
      T("code", { required: true, min: 3, max: 3 }), // ISO 4217
      T("label", { required: true }),
      T("symbol"),
      N("decimals", { min: 0, max: 4 }),
      B("is_base"),
      B("active"),
    ],
    index: ["CREATE UNIQUE INDEX idx_currency_code ON currencies (code)"],
  },
  {
    name: "exchange_rates",
    fields: [
      R("from_currency", "currencies", { required: true }),
      R("to_currency", "currencies", { required: true }),
      N("rate", { required: true, min: 0 }),
      D("valid_from"),
      T("source"),
    ],
    index: ["CREATE INDEX idx_rate_pair ON exchange_rates (from_currency, to_currency, valid_from)"],
  },
  {
    // §22 — les règles juridiques varient par pays. Rien n'est codé en dur.
    name: "jurisdictions",
    fields: [
      T("country_code", { required: true, max: 2 }),
      T("label", { required: true }),
      N("days_before_reminder"),
      N("days_before_formal_notice"),
      N("days_before_notice_to_quit"),
      N("late_penalty_rate"),
      N("notice_period_days"),
      E("resiliation_rules"),
      J("document_templates"),
      B("active"),
    ],
  },
  {
    name: "settings",
    fields: [
      R("owner_user", "users", { cascadeDelete: true }),
      T("company_name"),
      T("country"),
      R("base_currency", "currencies"),
      R("display_currency", "currencies"),
      R("jurisdiction", "jurisdictions"),
      T("timezone"),
      J("notification_prefs"),
      J("reminder_ladder"),
      J("lease_expiry_alerts"), // défaut [90, 60, 30]
      J("integrations"),        // whatsapp / sms / email / taux de change
      B("demo_data_loaded"),
      B("onboarding_done"),
    ],
  },

  // ---- personnes --------------------------------------------------------
  {
    name: "owners",
    fields: [
      R("user", "users"),
      T("full_name", { required: true }),
      T("phone"), T("whatsapp"), T("email"),
      T("country"), T("address"),
      T("id_document_type"), T("id_document_number"), D("id_document_expiry"),
      FILE("photo", { mimeTypes: ["image/jpeg", "image/png", "image/webp"] }),
      FILES("documents"),
      T("bank_details"),
      R("preferred_currency", "currencies"),
      N("commission_rate", { min: 0, max: 100 }),
      FILE("management_contract"),
      D("management_start"), D("management_end"),
      E("notes"),
      ...SOFT,
    ],
  },
  {
    name: "tenants",
    fields: [
      R("user", "users"),
      T("first_name", { required: true }), T("last_name", { required: true }),
      T("gender"), D("birth_date"), T("nationality"),
      T("phone"), T("whatsapp"), T("email"), T("address"),
      T("profession"), T("employer"),
      T("emergency_contact_name"), T("emergency_contact_phone"),
      FILE("photo"), FILES("documents"),
      N("risk_score", { min: 0, max: 100 }), // §55 — aide à la gestion, pas une décision
      E("notes"),
      ...SOFT,
    ],
    index: ["CREATE INDEX idx_tenant_name ON tenants (last_name, first_name)"],
  },
  {
    name: "guarantors",
    fields: [
      R("tenant", "tenants", { required: true, cascadeDelete: true }),
      T("full_name", { required: true }),
      T("phone"), T("whatsapp"), T("email"), T("address"),
      T("profession"), T("relationship"),
      E("guarantees"), FILES("documents"), E("notes"),
      ...SOFT,
    ],
  },
  {
    name: "contractors",
    fields: [
      T("name", { required: true }), T("company"),
      T("phone"), T("whatsapp"), T("email"),
      M("trades", ["plomberie", "electricite", "peinture", "climatisation",
        "serrurerie", "nettoyage", "securite", "technicien", "autre"]),
      T("rate"), T("zone"), E("notes"),
      ...SOFT,
    ],
  },

  // ---- patrimoine -------------------------------------------------------
  {
    name: "portfolios",
    fields: [
      T("name", { required: true }),
      R("owner", "owners", { required: true }),
      E("description"),
      ...SOFT,
    ],
  },
  {
    name: "properties",
    fields: [
      T("reference", { required: true }),
      T("name", { required: true }),
      R("portfolio", "portfolios"),
      R("owner", "owners", { required: true }),
      T("country"), T("region"), T("city"), T("commune"), T("district"), T("address"),
      N("latitude"), N("longitude"),
      E("description"), FILES("photos"),
      ...SOFT,
    ],
  },
  {
    name: "buildings",
    fields: [
      T("reference", { required: true }),
      T("name", { required: true }),
      R("property", "properties", { required: true }),
      N("floors"), N("units_count"),
      T("address"), E("description"), FILES("photos"),
      ...SOFT,
    ],
  },
  {
    name: "units",
    fields: [
      T("reference", { required: true }),
      T("name"),
      R("building", "buildings"),
      R("property", "properties", { required: true }),
      R("owner", "owners", { required: true }),
      S("unit_type", UNIT_TYPE, { required: true }),
      S("status", UNIT_STATUS, { required: true }),
      T("floor"), T("door_number"),
      N("surface_m2"),
      N("rooms"), N("bedrooms"), N("living_rooms"), N("kitchens"),
      N("bathrooms"), N("toilets"),
      B("balcony"), B("terrace"), B("parking"), B("garden"), B("furnished"),
      M("amenities", ["climatisation", "eau_courante", "electricite", "internet",
        "groupe_electrogene", "chauffe_eau", "securite", "ascenseur", "cuisine_equipee"]),
      ...MONEY("base_rent"),
      E("description"),
      FILES("photos"), FILES("documents"),
      ...SOFT,
    ],
    index: ["CREATE UNIQUE INDEX idx_unit_ref ON units (reference)"],
  },

  // ---- pipeline locatif -------------------------------------------------
  {
    name: "applications",
    fields: [
      T("reference"),
      R("unit", "units", { required: true }),
      R("tenant", "tenants"),
      T("candidate_name", { required: true }),
      T("candidate_phone"), T("candidate_email"),
      T("profession"), N("declared_income"),
      S("status", APPLICATION_STATUS, { required: true }),
      D("received_at"), D("decision_at"),
      E("notes"), FILES("documents"),
      ...SOFT,
    ],
  },
  {
    name: "visits",
    fields: [
      R("unit", "units", { required: true }),
      R("application", "applications"),
      T("visitor_name"), T("visitor_phone"),
      R("agent", "users"),
      D("scheduled_at"),
      S("status", VISIT_STATUS, { required: true }),
      B("reminder_sent"),
      E("feedback"),
      ...SOFT,
    ],
  },

  // ---- baux -------------------------------------------------------------
  {
    name: "leases",
    fields: [
      T("reference", { required: true }),
      R("unit", "units", { required: true }),
      R("tenant", "tenants", { required: true }),
      R("owner", "owners", { required: true }),
      R("guarantor", "guarantors"),
      D("start_date"), D("end_date"),
      N("duration_months"),
      S("periodicity", PERIODICITY, { required: true }),
      N("custom_period_days"),
      N("payment_day", { min: 1, max: 31 }),
      ...MONEY("rent"),
      ...MONEY("charges"),
      ...MONEY("deposit"),
      ...MONEY("advance"),
      S("charges_borne_by", ["locataire", "proprietaire", "partage"]),
      T("payment_method"),
      N("indexation_rate"),
      N("late_penalty_rate"),
      S("status", LEASE_STATUS, { required: true }),
      B("auto_renew"),
      E("special_conditions"),
      FILE("signed_contract"),
      D("signed_at"),
      D("notice_given_at"), D("notice_effective_at"), D("closed_at"),
      R("previous_lease", "leases"),
      ...SOFT,
    ],
    index: ["CREATE UNIQUE INDEX idx_lease_ref ON leases (reference)"],
  },
  {
    name: "lease_amendments",
    fields: [
      R("lease", "leases", { required: true, cascadeDelete: true }),
      T("reference"),
      S("amendment_type", ["loyer", "charges", "duree", "conditions", "coordonnees",
        "equipement", "autre"], { required: true }),
      D("effective_date"),
      J("previous_values"), J("new_values"),
      E("reason"),
      FILE("document"), D("signed_at"),
      ...SOFT,
    ],
  },
  {
    // Journal métier du bail : chaque étape du cycle laisse une trace (§62)
    name: "lease_events",
    fields: [
      R("lease", "leases", { required: true, cascadeDelete: true }),
      T("event_type", { required: true }),
      T("label"),
      D("occurred_at"),
      J("payload"),
      R("created_by", "users"),
    ],
  },
  {
    name: "rent_schedules",
    fields: [
      R("lease", "leases", { required: true, cascadeDelete: true }),
      N("period_index"),
      D("period_start"), D("period_end"), D("due_date"),
      ...MONEY("rent_amount"),
      ...MONEY("charges_amount"),
      ...MONEY("total_due"),
      ...MONEY("total_paid"),
      S("status", SCHEDULE_STATUS, { required: true }),
      N("days_late"),
      R("invoice", "invoices"),
    ],
    index: ["CREATE INDEX idx_schedule_due ON rent_schedules (due_date, status)"],
  },

  // ---- facturation & encaissement --------------------------------------
  {
    name: "invoices",
    fields: [
      T("number", { required: true }),
      R("lease", "leases", { required: true }),
      R("tenant", "tenants", { required: true }),
      R("unit", "units", { required: true }),
      D("period_start"), D("period_end"), D("due_date"),
      ...MONEY("subtotal"),
      ...MONEY("penalties"),
      ...MONEY("discount"),
      ...MONEY("total"),
      ...MONEY("paid"),
      ...MONEY("balance"),
      S("status", SCHEDULE_STATUS, { required: true }),
      E("notes"),
      ...SOFT,
    ],
    index: ["CREATE UNIQUE INDEX idx_invoice_number ON invoices (number)"],
  },
  {
    name: "invoice_items",
    fields: [
      R("invoice", "invoices", { required: true, cascadeDelete: true }),
      S("item_type", ["loyer", "charges", "penalite", "frais", "remise", "autre"]),
      T("label", { required: true }),
      N("quantity"),
      ...MONEY("unit_price"),
      ...MONEY("amount"),
      R("charge", "charges"),
    ],
  },
  {
    name: "charges",
    fields: [
      R("lease", "leases"),
      R("unit", "units"),
      S("charge_type", ["eau", "electricite", "entretien", "nettoyage", "securite",
        "syndic", "parking", "internet", "dechets", "autre"], { required: true }),
      S("mode", ["fixe", "variable", "consommation"], { required: true }),
      ...MONEY("amount"),
      N("unit_price"), N("consumption"), T("meter_reading"),
      D("period_start"), D("period_end"),
      S("borne_by", ["locataire", "proprietaire", "partage"]),
      N("share_percent"),
      FILE("receipt"),
      ...SOFT,
    ],
  },
  {
    name: "payments",
    fields: [
      T("number", { required: true }),
      R("invoice", "invoices"),
      R("lease", "leases", { required: true }),
      R("tenant", "tenants", { required: true }),
      R("unit", "units"),
      D("paid_at"),
      ...MONEY("amount"),
      S("method", ["especes", "virement", "carte", "cheque", "mobile_money",
        "paiement_en_ligne", "autre"], { required: true }),
      T("reference"),
      S("status", ["en_attente", "valide", "rejete", "annule"], { required: true }),
      FILE("proof"),
      E("comment"),
      R("recorded_by", "users"),
      ...SOFT,
    ],
    index: ["CREATE UNIQUE INDEX idx_payment_number ON payments (number)"],
  },
  {
    // Preuve déposée par le locataire, en attente de validation (§19, §70)
    name: "payment_proofs",
    fields: [
      R("tenant", "tenants", { required: true }),
      R("lease", "leases"),
      R("invoice", "invoices"),
      R("payment", "payments"),
      N("declared_amount"),
      D("declared_at"),
      T("declared_method"), T("declared_reference"),
      FILE("file", { required: true }),
      S("status", ["soumise", "validee", "rejetee"], { required: true }),
      E("review_note"),
      R("reviewed_by", "users"),
    ],
  },
  {
    // Cache de solde recalculé à chaque mouvement (§20, §76)
    name: "balances",
    fields: [
      R("lease", "leases", { required: true, cascadeDelete: true }),
      R("tenant", "tenants", { required: true }),
      N("total_due"), N("total_paid"), N("balance"), N("credit"),
      N("overdue_amount"), N("overdue_periods"), N("days_late"),
      S("health", ["vert", "orange", "rouge"], { required: true }),
      D("computed_at"),
    ],
  },

  // ---- recouvrement -----------------------------------------------------
  {
    name: "reminders",
    fields: [
      R("lease", "leases", { required: true }),
      R("tenant", "tenants", { required: true }),
      R("invoice", "invoices"),
      N("level", { min: 1, max: 8, required: true }),
      T("label"),
      D("due_at"),
      S("status", ["a_faire", "en_cours", "effectuee", "sans_reponse", "annulee"],
        { required: true }),
      R("assigned_to", "users"),
      E("notes"),
      ...SOFT,
    ],
  },
  {
    name: "reminder_attempts",
    fields: [
      R("reminder", "reminders", { required: true, cascadeDelete: true }),
      S("channel", CHANNELS, { required: true }),
      D("attempted_at"),
      R("attempted_by", "users"),
      S("outcome", ["ne_repond_pas", "a_repondu", "paiement_promis", "paiement_effectue",
        "demande_delai", "litige", "numero_incorrect", "autre"]),
      E("comment"),
      R("promise", "promises_to_pay"),
    ],
  },
  {
    name: "promises_to_pay",
    fields: [
      R("lease", "leases", { required: true }),
      R("tenant", "tenants", { required: true }),
      R("invoice", "invoices"),
      N("promised_amount", { required: true }),
      D("promised_date"),
      T("expected_method"),
      S("status", ["active", "tenue", "non_tenue", "annulee"], { required: true }),
      D("settled_at"),
      E("comment"),
    ],
  },
  {
    name: "notices",
    fields: [
      R("lease", "leases", { required: true }),
      R("jurisdiction", "jurisdictions"),
      S("notice_type", ["mise_en_demeure", "preavis", "resiliation", "autre"],
        { required: true }),
      D("issued_at"), D("effective_at"),
      E("content"),
      FILE("document"),
      S("status", ["brouillon", "emis", "notifie", "cloture", "annule"], { required: true }),
      R("issued_by", "users"),
    ],
  },

  // ---- états des lieux & caution ---------------------------------------
  {
    name: "inspections",
    fields: [
      R("lease", "leases", { required: true }),
      R("unit", "units", { required: true }),
      S("inspection_type", ["entree", "sortie"], { required: true }),
      D("performed_at"),
      R("performed_by", "users"),
      S("status", ["brouillon", "en_cours", "a_signer", "signe", "conteste"],
        { required: true }),
      E("general_comment"),
      FILE("signed_document"),
      R("compared_to", "inspections"),
    ],
  },
  {
    name: "inspection_items",
    fields: [
      R("inspection", "inspections", { required: true, cascadeDelete: true }),
      T("room", { required: true }),
      T("element", { required: true }),
      S("condition", ["neuf", "bon", "moyen", "mauvais", "hors_service", "absent"],
        { required: true }),
      E("comment"),
      FILES("photos"),
      B("anomaly"),
      N("repair_estimate"),
    ],
  },
  {
    name: "deposits",
    fields: [
      R("lease", "leases", { required: true }),
      R("tenant", "tenants", { required: true }),
      ...MONEY("initial_amount"),
      ...MONEY("held_amount"),
      ...MONEY("withheld_amount"),
      ...MONEY("refund_amount"),
      S("status", DEPOSIT_STATUS, { required: true }),
      D("refunded_at"),
      T("refund_method"),
      E("notes"),
    ],
  },
  {
    name: "deposit_transactions",
    fields: [
      R("deposit", "deposits", { required: true, cascadeDelete: true }),
      S("transaction_type", ["encaissement", "retenue", "restitution", "ajustement"],
        { required: true }),
      N("amount", { required: true }),
      D("occurred_at"),
      T("reason"),
      FILE("receipt"),
      R("inspection_item", "inspection_items"),
      R("created_by", "users"),
    ],
  },

  // ---- maintenance ------------------------------------------------------
  {
    name: "maintenance_tickets",
    fields: [
      T("reference", { required: true }),
      R("unit", "units", { required: true }),
      R("lease", "leases"),
      R("tenant", "tenants"),
      S("category", ["fuite", "plomberie", "electricite", "climatisation", "serrure",
        "peinture", "equipement", "autre"], { required: true }),
      T("title", { required: true }),
      E("description"),
      FILES("photos"),
      S("priority", ["basse", "normale", "haute", "urgente"], { required: true }),
      S("status", TICKET_STATUS, { required: true }),
      R("contractor", "contractors"),
      D("reported_at"), D("scheduled_at"), D("resolved_at"),
      N("estimated_cost"), N("actual_cost"),
      FILE("invoice_file"),
      ...SOFT,
    ],
  },
  {
    name: "maintenance_tasks",
    fields: [
      R("ticket", "maintenance_tickets", { required: true, cascadeDelete: true }),
      T("label", { required: true }),
      R("assigned_contractor", "contractors"),
      R("assigned_user", "users"),
      D("due_at"), D("done_at"),
      S("status", ["a_faire", "en_cours", "faite", "annulee"], { required: true }),
      E("comment"),
    ],
  },

  // ---- comptabilité -----------------------------------------------------
  {
    name: "expenses",
    fields: [
      T("reference"),
      R("owner", "owners", { required: true }),
      R("property", "properties"),
      R("unit", "units"),
      R("ticket", "maintenance_tickets"),
      R("contractor", "contractors"),
      S("category", ["maintenance", "reparation", "taxes", "assurance", "commission",
        "frais_bancaires", "administratif", "autre"], { required: true }),
      T("label", { required: true }),
      D("spent_at"),
      ...MONEY("amount"),
      T("payment_method"),
      FILE("receipt"),
      E("notes"),
      ...SOFT,
    ],
  },
  {
    name: "owner_statements",
    fields: [
      R("owner", "owners", { required: true }),
      T("reference"),
      D("period_start"), D("period_end"),
      N("rents_collected"), N("charges_collected"), N("expenses_total"),
      N("commission_total"), N("payout_total"), N("net_result"),
      R("currency", "currencies"),
      S("status", ["brouillon", "valide", "envoye", "regle"], { required: true }),
      FILE("pdf"),
      J("lines"),
    ],
  },

  // ---- transverse -------------------------------------------------------
  {
    name: "documents",
    fields: [
      T("title", { required: true }),
      S("category", ["bail", "avenant", "piece_identite", "garant", "etat_des_lieux",
        "facture", "quittance", "preuve_paiement", "preavis", "mise_en_demeure",
        "contrat_proprietaire", "facture_maintenance", "photo", "autre"],
        { required: true }),
      FILE("file", { required: true }),
      // Rattachement polymorphe : au moins une de ces relations est renseignée.
      R("tenant", "tenants"), R("owner", "owners"), R("unit", "units"),
      R("lease", "leases"), R("payment", "payments"), R("ticket", "maintenance_tickets"),
      D("issued_at"), D("expires_at"),
      M("tags", ["document", "contrat", "facture", "quittance", "correspondance"]),
      E("notes"),
      R("uploaded_by", "users"),
      ...SOFT,
    ],
  },
  {
    name: "communication_templates",
    fields: [
      T("key", { required: true }),
      T("label", { required: true }),
      S("channel", CHANNELS, { required: true }),
      T("subject"),
      E("body", { required: true }), // variables {{nom_locataire}}, {{montant}}, ...
      T("language"),
      B("active"),
    ],
    index: ["CREATE UNIQUE INDEX idx_template_key ON communication_templates (key, channel)"],
  },
  {
    name: "messages",
    fields: [
      S("channel", CHANNELS, { required: true }),
      R("template", "communication_templates"),
      T("recipient_label"), T("recipient_address"),
      R("tenant", "tenants"), R("owner", "owners"), R("lease", "leases"),
      T("subject"), E("body"),
      D("sent_at"),
      S("status", ["prepare", "ouvert", "envoye", "echec", "lu"], { required: true }),
      T("error"),
      R("sent_by", "users"),
    ],
  },
  {
    name: "notifications",
    fields: [
      R("user", "users", { required: true, cascadeDelete: true }),
      T("event_type", { required: true }),
      T("title", { required: true }),
      E("body"),
      S("severity", SEVERITY, { required: true }),
      T("link"),
      B("read"),
      D("read_at"),
      J("payload"),
    ],
    index: ["CREATE INDEX idx_notif_user ON notifications (user, read)"],
  },
  {
    name: "tasks",
    fields: [
      T("label", { required: true }),
      S("task_type", ["relancer", "appeler", "verifier_paiement", "preparer_bail",
        "etat_des_lieux", "organiser_visite", "reparation", "envoyer_document",
        "verifier_assurance", "renouveler_bail", "autre"], { required: true }),
      R("assigned_to", "users"),
      S("priority", ["basse", "normale", "haute", "urgente"], { required: true }),
      D("due_at"), D("done_at"),
      S("status", ["a_faire", "en_cours", "faite", "annulee"], { required: true }),
      R("lease", "leases"), R("tenant", "tenants"), R("unit", "units"),
      R("reminder", "reminders"), R("ticket", "maintenance_tickets"),
      R("automation_rule", "automation_rules"),
      E("comment"),
      ...SOFT,
    ],
  },
  {
    name: "appointments",
    fields: [
      T("title", { required: true }),
      S("appointment_type", ["visite", "etat_des_lieux", "echeance", "rendez_vous",
        "maintenance", "renouvellement", "sortie", "autre"], { required: true }),
      D("start_at"), D("end_at"),
      B("all_day"),
      T("location"),
      R("unit", "units"), R("tenant", "tenants"), R("lease", "leases"),
      R("visit", "visits"), R("ticket", "maintenance_tickets"),
      R("owner_user", "users"),
      E("notes"),
    ],
  },
  {
    // §48 — moteur de règles entièrement paramétrable, aucun délai codé en dur
    name: "automation_rules",
    fields: [
      T("key", { required: true }),
      T("label", { required: true }),
      S("trigger", ["echeance_proche", "echeance_jour", "retard", "retard_n_jours",
        "promesse_depassee", "deux_mois_impayes", "bail_expire_dans",
        "maintenance_urgente", "document_expirant"], { required: true }),
      N("threshold_days"),
      N("threshold_amount"),
      M("actions", ["notification", "tache", "email", "sms", "whatsapp",
        "relance_niveau_suivant", "marquer_rouge", "preparer_document"]),
      R("template", "communication_templates"),
      R("jurisdiction", "jurisdictions"),
      B("active"),
      D("last_run_at"),
    ],
  },
  {
    // §58 — qui / quoi / quand / avant / après
    name: "audit_logs",
    fields: [
      R("user", "users"),
      T("user_label"),
      T("action", { required: true }),   // create | update | delete | restore | login | export
      T("collection_name", { required: true }),
      T("record_id"),
      T("record_label"),
      J("before"), J("after"),
      B("financial"),                    // opérations sensibles §4
      T("ip"), T("user_agent"),
    ],
    index: [
      "CREATE INDEX idx_audit_record ON audit_logs (collection_name, record_id)",
    ],
  },
  {
    name: "backups",
    fields: [
      T("label", { required: true }),
      S("kind", ["automatique", "manuelle"], { required: true }),
      N("size_bytes"),
      J("counts"),
      FILE("archive", { maxSize: 104857600 }),
      R("created_by", "users"),
    ],
  },
];

// Champs ajoutés à la collection `users` native.
const USER_FIELDS = [
  T("full_name"),
  S("role", ["proprietaire", "locataire", "gestionnaire", "comptable", "agent",
    "maintenance", "assistant", "admin", "super_admin"], { required: true }),
  T("phone"), T("whatsapp"),
  T("country"), T("language"),
  R("preferred_currency", "currencies"),
  B("active"),
  B("onboarding_done"),
  D("last_login_at"),
  J("permissions_override"),
];

// ---------------------------------------------------------------- migration
migrate(
  (app) => {
    const deferred = []; // [collectionName, fieldDef] — cible pas encore créée
    const existing = new Set(["users"]);

    // 1re passe : créer les collections, en différant les relations non résolvables
    for (const def of COLLECTIONS) {
      const fields = [];
      for (const f of def.fields) {
        if (f.type === "relation" && !existing.has(f._target)) {
          deferred.push([def.name, f]);
          continue;
        }
        fields.push(resolveField(app, f, def.name));
      }
      app.save(
        new Collection({
          name: def.name,
          type: "base",
          listRule: "@request.auth.id != ''",
          viewRule: "@request.auth.id != ''",
          createRule: "@request.auth.id != ''",
          updateRule: "@request.auth.id != ''",
          deleteRule: "@request.auth.id != ''",
          fields,
          indexes: def.index || [],
        })
      );
      existing.add(def.name);
    }

    // 2e passe : toutes les collections existent, les relations se résolvent
    for (const [name, f] of deferred) {
      const collection = app.findCollectionByNameOrId(name);
      const field = { ...f };
      field.collectionId = app.findCollectionByNameOrId(field._target).id;
      delete field._target;
      collection.fields.add(new Field(field));
      app.save(collection);
    }

    // Enrichir la collection users
    const users = app.findCollectionByNameOrId("users");
    for (const f of USER_FIELDS) {
      users.fields.add(new Field(resolveField(app, f, "users")));
    }
    app.save(users);

    // Devises de départ — XOF en devise de base (§39)
    const currencies = app.findCollectionByNameOrId("currencies");
    const seedCurrencies = [
      ["XOF", "Franc CFA (BCEAO)", "F CFA", 0, true],
      ["XAF", "Franc CFA (BEAC)", "F CFA", 0, false],
      ["EUR", "Euro", "€", 2, false],
      ["USD", "Dollar américain", "$", 2, false],
      ["NGN", "Naira nigérian", "₦", 2, false],
      ["GHS", "Cedi ghanéen", "₵", 2, false],
      ["MAD", "Dirham marocain", "DH", 2, false],
      ["GBP", "Livre sterling", "£", 2, false],
      ["CAD", "Dollar canadien", "$", 2, false],
    ];
    for (const [code, label, symbol, decimals, isBase] of seedCurrencies) {
      const rec = new Record(currencies);
      rec.set("code", code);
      rec.set("label", label);
      rec.set("symbol", symbol);
      rec.set("decimals", decimals);
      rec.set("is_base", isBase);
      rec.set("active", true);
      app.save(rec);
    }

    function resolveField(app, f, ownerName) {
      const field = { ...f };
      if (field.type === "relation") {
        const targetName = field._target;
        delete field._target;
        // auto-référence : la collection est en cours de création
        const target =
          targetName === ownerName
            ? null
            : app.findCollectionByNameOrId(targetName);
        field.collectionId = target ? target.id : "";
      }
      return field;
    }
  },
  (app) => {
    // rollback : ordre inverse pour respecter les dépendances
    for (const def of [...COLLECTIONS].reverse()) {
      try {
        app.delete(app.findCollectionByNameOrId(def.name));
      } catch (_) {
        /* déjà absente */
      }
    }
    const users = app.findCollectionByNameOrId("users");
    for (const f of USER_FIELDS) users.fields.removeByName(f.name);
    app.save(users);
  }
);
