#!/usr/bin/env node
/**
 * Données de démonstration (§66).
 *
 * Tout ce qui est créé ici porte la mention « DÉMO » dans sa référence,
 * pour qu'on ne confonde jamais ces enregistrements avec de vraies données.
 *
 *   node pocketbase/seed/seed.mjs --email admin@exemple.bj --password ...
 *   node pocketbase/seed/seed.mjs --purge      (supprime uniquement la démo)
 */

import PocketBase from "pocketbase";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  })
);

const PB_URL = args.url || process.env.PB_URL || "http://127.0.0.1:8090";
const pb = new PocketBase(PB_URL);
const TAG = "DEMO";

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const int = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n) => new Date(Date.now() - n * 86400000).toISOString();
const daysAhead = (n) => new Date(Date.now() + n * 86400000).toISOString();

const FIRST = ["Amine", "Chantal", "Kossi", "Aïcha", "Roland", "Béatrice",
  "Ibrahim", "Nadège", "Serge", "Fatou", "Marius", "Clarisse"];
const LAST = ["Dossou", "Agbodjan", "Houngbédji", "Sossou", "Kpodar", "Adjovi",
  "Zinsou", "Tchibozo", "Ahouansou", "Gbaguidi"];

async function main() {
  const email = args.email || process.env.PB_ADMIN_EMAIL;
  const password = args.password || process.env.PB_ADMIN_PASSWORD;
  if (!email || !password) {
    console.error("Usage : node seed.mjs --email=... --password=...");
    process.exit(1);
  }

  await pb.collection("_superusers").authWithPassword(email, password);
  console.log("Connecté à", PB_URL);

  if (args.purge) return purge();

  const xof = (await pb.collection("currencies").getFullList({ filter: 'code="XOF"' }))[0];
  if (!xof) throw new Error("Devise XOF absente : lancez d'abord la migration.");

  const money = (prefix, amount) => ({
    [prefix]: amount,
    [`${prefix}_currency`]: xof.id,
    [`${prefix}_rate`]: 1,
    [`${prefix}_base`]: amount,
    [`${prefix}_rate_date`]: new Date().toISOString(),
  });

  // --- propriétaires -----------------------------------------------------
  const owners = [];
  for (let i = 0; i < 2; i++) {
    owners.push(
      await pb.collection("owners").create({
        full_name: `${rnd(FIRST)} ${rnd(LAST)} (${TAG})`,
        phone: `+2299${int(1000000, 9999999)}`,
        whatsapp: `+2299${int(1000000, 9999999)}`,
        email: `proprietaire${i + 1}.demo@exemple.bj`,
        country: "BJ",
        address: `Lot ${int(100, 999)}, Cotonou`,
        preferred_currency: xof.id,
        commission_rate: i === 0 ? 8 : 0,
      })
    );
  }
  console.log(`${owners.length} propriétaires`);

  // --- patrimoine --------------------------------------------------------
  const units = [];
  const cities = ["Cotonou", "Abomey-Calavi", "Porto-Novo"];
  for (const [i, owner] of owners.entries()) {
    const property = await pb.collection("properties").create({
      reference: `${TAG}-PROP-${i + 1}`,
      name: `Résidence ${rnd(["Les Palmiers", "Sainte-Rita", "Zogbo", "Fidjrossè"])} (${TAG})`,
      owner: owner.id,
      country: "BJ",
      city: cities[i % cities.length],
      address: `Rue ${int(100, 999)}, quartier ${rnd(["Cadjèhoun", "Akpakpa", "Gbégamey"])}`,
    });

    const building = await pb.collection("buildings").create({
      reference: `${TAG}-IMM-${i + 1}`,
      name: `Bâtiment ${String.fromCharCode(65 + i)} (${TAG})`,
      property: property.id,
      floors: int(2, 4),
    });

    for (let u = 0; u < 4; u++) {
      const rent = int(6, 25) * 10000;
      units.push(
        await pb.collection("units").create({
          reference: `${TAG}-${String.fromCharCode(65 + i)}${u + 1}`,
          property: property.id,
          building: building.id,
          owner: owner.id,
          unit_type: rnd(["appartement", "studio", "appartement", "boutique"]),
          status: "disponible",
          floor: String(int(0, 3)),
          door_number: `${String.fromCharCode(65 + i)}${u + 1}`,
          surface_m2: int(28, 120),
          rooms: int(1, 4),
          bedrooms: int(1, 3),
          bathrooms: 1,
          toilets: int(1, 2),
          parking: Math.random() > 0.5,
          ...money("base_rent", rent),
        })
      );
    }
  }
  console.log(`${units.length} logements`);

  // --- locataires et baux ------------------------------------------------
  // Six logements sur huit sont loués : un taux d'occupation crédible.
  const leased = units.slice(0, 6);
  const scenarios = ["a_jour", "a_jour", "partiel", "retard_leger", "deux_mois", "a_jour"];

  for (const [i, unit] of leased.entries()) {
    const scenario = scenarios[i];
    const tenant = await pb.collection("tenants").create({
      first_name: rnd(FIRST),
      last_name: `${rnd(LAST)} (${TAG})`,
      phone: `+2299${int(1000000, 9999999)}`,
      whatsapp: `+2299${int(1000000, 9999999)}`,
      email: `locataire${i + 1}.demo@exemple.bj`,
      nationality: "Béninoise",
      profession: rnd(["Enseignant", "Commerçante", "Infirmier", "Développeur", "Couturière"]),
      employer: rnd(["Indépendant", "Ministère", "Clinique Saint-Luc", "Société MTN"]),
      address: "Cotonou",
    });

    await pb.collection("guarantors").create({
      tenant: tenant.id,
      full_name: `${rnd(FIRST)} ${rnd(LAST)} (${TAG})`,
      phone: `+2299${int(1000000, 9999999)}`,
      relationship: rnd(["Frère", "Sœur", "Employeur", "Parent"]),
      profession: "Commerçant",
    });

    const rent = unit.base_rent;
    const charges = Math.round(rent * 0.08);
    const startedMonths = scenario === "deux_mois" ? 6 : int(3, 10);
    const start = new Date();
    start.setMonth(start.getMonth() - startedMonths);
    start.setDate(1);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 12);

    const lease = await pb.collection("leases").create({
      reference: `${TAG}-BAIL-${String(i + 1).padStart(4, "0")}`,
      unit: unit.id,
      tenant: tenant.id,
      owner: unit.owner,
      start_date: start.toISOString(),
      end_date: end.toISOString(),
      duration_months: 12,
      periodicity: "mensuelle",
      payment_day: 5,
      charges_borne_by: "locataire",
      payment_method: rnd(["mobile_money", "especes", "virement"]),
      late_penalty_rate: 2,
      status: scenario === "deux_mois" ? "en_retard" : "actif",
      ...money("rent", rent),
      ...money("charges", charges),
      ...money("deposit", rent * 2),
      ...money("advance", rent),
    });

    await pb.collection("units").update(unit.id, { status: "loue" });

    await pb.collection("deposits").create({
      lease: lease.id,
      tenant: tenant.id,
      status: "detenue",
      ...money("initial_amount", rent * 2),
      ...money("held_amount", rent * 2),
    });

    // Échéances, factures et paiements du bail
    let totalDue = 0;
    let totalPaid = 0;
    let overduePeriods = 0;

    for (let p = 0; p < startedMonths; p++) {
      const periodStart = new Date(start);
      periodStart.setMonth(periodStart.getMonth() + p);
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0);
      const dueDate = new Date(periodStart);
      dueDate.setDate(5);

      const isLast = p === startedMonths - 1;
      const isSecondLast = p === startedMonths - 2;
      const due = rent + charges;

      let paid = due;
      let status = "paye";
      if (scenario === "partiel" && isLast) {
        paid = Math.round(due * 0.4);
        status = "partiellement_paye";
      } else if (scenario === "retard_leger" && isLast) {
        paid = 0;
        status = "en_retard";
      } else if (scenario === "deux_mois" && (isLast || isSecondLast)) {
        paid = 0;
        status = "impaye";
        overduePeriods++;
      }

      totalDue += due;
      totalPaid += paid;

      const invoice = await pb.collection("invoices").create({
        number: `${TAG}-F${lease.reference.slice(-4)}-${String(p + 1).padStart(2, "0")}`,
        lease: lease.id,
        tenant: tenant.id,
        unit: unit.id,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        due_date: dueDate.toISOString(),
        status,
        ...money("subtotal", due),
        ...money("total", due),
        ...money("paid", paid),
        ...money("balance", due - paid),
      });

      await pb.collection("invoice_items").create({
        invoice: invoice.id, item_type: "loyer", label: "Loyer", quantity: 1,
        ...money("unit_price", rent), ...money("amount", rent),
      });
      await pb.collection("invoice_items").create({
        invoice: invoice.id, item_type: "charges", label: "Charges", quantity: 1,
        ...money("unit_price", charges), ...money("amount", charges),
      });

      await pb.collection("rent_schedules").create({
        lease: lease.id,
        period_index: p + 1,
        period_start: periodStart.toISOString(),
        period_end: periodEnd.toISOString(),
        due_date: dueDate.toISOString(),
        status,
        invoice: invoice.id,
        days_late: paid < due ? Math.max(0, Math.round((Date.now() - dueDate) / 86400000)) : 0,
        ...money("rent_amount", rent),
        ...money("charges_amount", charges),
        ...money("total_due", due),
        ...money("total_paid", paid),
      });

      if (paid > 0) {
        await pb.collection("payments").create({
          number: `${TAG}-P${lease.reference.slice(-4)}-${String(p + 1).padStart(2, "0")}`,
          invoice: invoice.id,
          lease: lease.id,
          tenant: tenant.id,
          unit: unit.id,
          paid_at: new Date(dueDate.getTime() + int(-2, 4) * 86400000).toISOString(),
          method: lease.payment_method,
          status: "valide",
          reference: `MM${int(100000, 999999)}`,
          ...money("amount", paid),
        });
      }
    }

    const balance = totalDue - totalPaid;
    await pb.collection("balances").create({
      lease: lease.id,
      tenant: tenant.id,
      total_due: totalDue,
      total_paid: totalPaid,
      balance,
      credit: balance < 0 ? -balance : 0,
      overdue_amount: balance > 0 ? balance : 0,
      overdue_periods: overduePeriods,
      days_late: overduePeriods ? int(35, 70) : balance > 0 ? int(3, 20) : 0,
      health: overduePeriods >= 2 ? "rouge" : balance > 0 ? "orange" : "vert",
      computed_at: new Date().toISOString(),
    });

    // Relances et promesse pour les dossiers en difficulté
    if (scenario === "deux_mois" || scenario === "retard_leger") {
      const reminder = await pb.collection("reminders").create({
        lease: lease.id,
        tenant: tenant.id,
        level: scenario === "deux_mois" ? 6 : 3,
        label: scenario === "deux_mois" ? "Promesse dépassée" : "Première relance après retard",
        due_at: daysAgo(int(1, 5)),
        status: "a_faire",
      });
      await pb.collection("reminder_attempts").create({
        reminder: reminder.id,
        channel: "whatsapp",
        attempted_at: daysAgo(int(6, 12)),
        outcome: scenario === "deux_mois" ? "paiement_promis" : "a_repondu",
        comment: "Message envoyé, accusé de lecture reçu.",
      });
    }
    if (scenario === "deux_mois") {
      await pb.collection("promises_to_pay").create({
        lease: lease.id,
        tenant: tenant.id,
        promised_amount: Math.round(rent * 1.5),
        promised_date: daysAgo(4),
        expected_method: "mobile_money",
        status: "active",
        comment: "Promesse faite lors de l'appel du mois dernier.",
      });
    }
  }
  console.log(`${leased.length} baux avec échéances, paiements et soldes`);

  // --- maintenance, prestataires, dépenses -------------------------------
  const contractor = await pb.collection("contractors").create({
    name: `${rnd(FIRST)} ${rnd(LAST)} (${TAG})`,
    company: "Plomberie Express",
    phone: `+2299${int(1000000, 9999999)}`,
    trades: ["plomberie", "electricite"],
    zone: "Cotonou",
  });

  await pb.collection("maintenance_tickets").create({
    reference: `${TAG}-TK-001`,
    unit: leased[0].id,
    category: "fuite",
    title: "Fuite sous l'évier de la cuisine",
    description: "Écoulement continu depuis deux jours.",
    priority: "urgente",
    status: "nouveau",
    reported_at: daysAgo(1),
    estimated_cost: 35000,
  });
  await pb.collection("maintenance_tickets").create({
    reference: `${TAG}-TK-002`,
    unit: leased[2].id,
    category: "electricite",
    title: "Prise défectueuse dans la chambre",
    priority: "normale",
    status: "planifie",
    contractor: contractor.id,
    reported_at: daysAgo(6),
    scheduled_at: daysAhead(2),
    estimated_cost: 15000,
  });

  await pb.collection("expenses").create({
    reference: `${TAG}-DEP-001`,
    owner: owners[0].id,
    category: "reparation",
    label: "Remplacement du portail",
    spent_at: daysAgo(20),
    contractor: contractor.id,
    ...money("amount", 180000),
  });

  // --- pipeline locatif --------------------------------------------------
  const vacant = units.filter((u) => !leased.includes(u));
  for (const [i, unit] of vacant.entries()) {
    const application = await pb.collection("applications").create({
      reference: `${TAG}-CAND-${i + 1}`,
      unit: unit.id,
      candidate_name: `${rnd(FIRST)} ${rnd(LAST)} (${TAG})`,
      candidate_phone: `+2299${int(1000000, 9999999)}`,
      profession: rnd(["Comptable", "Étudiant", "Chauffeur"]),
      status: i === 0 ? "visite_programmee" : "dossier_complet",
      received_at: daysAgo(int(2, 10)),
    });
    if (i === 0) {
      await pb.collection("visits").create({
        unit: unit.id,
        application: application.id,
        visitor_name: application.candidate_name,
        visitor_phone: application.candidate_phone,
        scheduled_at: daysAhead(2),
        status: "planifiee",
      });
    }
  }

  // --- modèles de messages ----------------------------------------------
  const templates = [
    ["rappel_avant_echeance", "Rappel avant échéance", "whatsapp",
      "Bonjour {{prenom_locataire}}, votre loyer de {{montant}} pour le logement {{reference_logement}} est attendu le {{date_echeance}}. Merci."],
    ["loyer_du", "Loyer dû aujourd'hui", "whatsapp",
      "Bonjour {{prenom_locataire}}, l'échéance de {{montant}} pour {{reference_logement}} arrive à terme aujourd'hui."],
    ["premiere_relance", "Première relance", "whatsapp",
      "Bonjour {{nom_locataire}}, votre échéance de {{montant}} concernant le logement {{reference_logement}} est arrivée à échéance le {{date_echeance}}. Merci de procéder au règlement."],
    ["seconde_relance", "Seconde relance", "whatsapp",
      "Bonjour {{nom_locataire}}, sauf erreur, votre solde s'élève à {{solde}} avec {{jours_retard}} jours de retard. Pouvez-vous nous indiquer une date de règlement ?"],
    ["paiement_recu", "Paiement reçu", "whatsapp",
      "Bonjour {{prenom_locataire}}, nous confirmons la réception de votre paiement pour la période {{periode}}. Votre quittance est disponible dans votre espace."],
    ["bail_bientot_expire", "Bail bientôt expiré", "email",
      "Bonjour {{nom_locataire}}, votre bail {{reference_bail}} arrive à échéance le {{date_echeance}}. Souhaitez-vous le renouveler ?"],
  ];
  for (const [key, label, channel, body] of templates) {
    await pb.collection("communication_templates").create({
      key, label, channel, body, language: "fr", active: true,
    });
  }

  // --- règles d'automatisation ------------------------------------------
  const rules = [
    ["echeance_j5", "Rappel 5 jours avant échéance", "echeance_proche", 5, ["notification", "whatsapp"]],
    ["echeance_jour", "Notification le jour de l'échéance", "echeance_jour", 0, ["notification"]],
    ["retard_j3", "Relance après 3 jours de retard", "retard_n_jours", 3, ["tache", "whatsapp"]],
    ["promesse_depassee", "Promesse non tenue", "promesse_depassee", 0, ["tache", "notification"]],
    ["deux_mois", "Deux mois d'impayés", "deux_mois_impayes", 0,
      ["marquer_rouge", "notification", "tache", "preparer_document"]],
    ["bail_90", "Bail expirant dans 90 jours", "bail_expire_dans", 90, ["notification"]],
    ["bail_30", "Bail expirant dans 30 jours", "bail_expire_dans", 30, ["notification", "tache"]],
  ];
  for (const [key, label, trigger, days, actions] of rules) {
    await pb.collection("automation_rules").create({
      key, label, trigger, threshold_days: days, actions, active: true,
    });
  }

  console.log("\nDonnées de démonstration en place.");
  console.log("Tous les enregistrements portent la mention DEMO dans leur référence.");
  console.log("Pour les retirer : node pocketbase/seed/seed.mjs --purge --email=... --password=...");
}

/** Supprime uniquement ce que ce script a créé. */
async function purge() {
  const targets = [
    "reminder_attempts", "reminders", "promises_to_pay", "payments",
    "invoice_items", "invoices", "rent_schedules", "balances", "deposits",
    "maintenance_tickets", "expenses", "visits", "applications", "guarantors",
    "leases", "tenants", "units", "buildings", "properties", "owners",
    "contractors", "communication_templates", "automation_rules",
  ];
  for (const collection of targets) {
    const records = await pb.collection(collection).getFullList().catch(() => []);
    let removed = 0;
    for (const r of records) {
      const marker = `${r.reference || ""}${r.number || ""}${r.full_name || ""}${r.last_name || ""}${r.name || ""}${r.key || ""}`;
      const isDemo =
        marker.includes(TAG) ||
        (collection === "communication_templates" && templatesKeys.includes(r.key)) ||
        (collection === "automation_rules" && rulesKeys.includes(r.key));
      if (isDemo) {
        await pb.collection(collection).delete(r.id).catch(() => {});
        removed++;
      }
    }
    if (removed) console.log(`${collection} : ${removed} supprimés`);
  }
  console.log("Démonstration retirée.");
}

const templatesKeys = ["rappel_avant_echeance", "loyer_du", "premiere_relance",
  "seconde_relance", "paiement_recu", "bail_bientot_expire"];
const rulesKeys = ["echeance_j5", "echeance_jour", "retard_j3", "promesse_depassee",
  "deux_mois", "bail_90", "bail_30"];

main().catch((err) => {
  console.error("\nÉchec :", err.message);
  if (err.response?.data) console.error(JSON.stringify(err.response.data, null, 2));
  process.exit(1);
});
