import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { pb, readableError } from "../lib/pb";
import { C } from "../lib/collections";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../lib/money";
import { formatDate, fullName } from "../lib/format";
import { LoadingState, ErrorState } from "../components/States";

/**
 * §79 — trois niveaux, une seule question par ligne :
 * qu'est-ce qui attend une décision, et sur quoi porte-t-elle.
 */

// Tailwind ne génère pas les classes construites à la volée : on les écrit en toutes lettres.
const DOT = { alert: "bg-alert", warn: "bg-warn", ok: "bg-ok" };

const LEVELS = [
  { key: "urgent", label: "Urgent", tone: "alert",
    hint: "Ces situations demandent une décision aujourd'hui." },
  { key: "attention", label: "À traiter", tone: "warn",
    hint: "À planifier dans les prochains jours." },
  { key: "normal", label: "Normal", tone: "ok",
    hint: "Suivi courant, rien d'anormal." },
];

export default function ControlCenter() {
  const { currency } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, rows: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const now = new Date();
        const iso = (d) => d.toISOString();
        const in30 = new Date(now.getTime() + 30 * 86400000);
        const rows = [];

        // Urgent — deux mois d'impayés ou plus (§22)
        const critical = await pb.collection(C.balances).getFullList({
          filter: 'health="rouge"',
          expand: "lease.unit,tenant",
          sort: "-overdue_amount",
        });
        for (const b of critical) {
          rows.push({
            level: "urgent",
            title: `${fullName(b.expand?.tenant)} — ${b.overdue_periods} échéances impayées`,
            detail: `${b.expand?.lease?.expand?.unit?.reference || "Logement"} · ${
              formatMoney(b.overdue_amount, currency)} dû depuis ${b.days_late} jours`,
            action: "Ouvrir le dossier",
            to: `/impayes?bail=${b.lease}`,
          });
        }

        // Urgent — maintenance critique
        const urgentTickets = await pb.collection(C.tickets).getFullList({
          filter: 'deleted != true && priority="urgente" && status!="ferme" && status!="valide"',
          expand: "unit",
          sort: "reported_at",
        });
        for (const t of urgentTickets) {
          rows.push({
            level: "urgent",
            title: t.title,
            detail: `${t.expand?.unit?.reference || ""} · signalé le ${formatDate(t.reported_at)}`,
            action: "Traiter le ticket",
            to: `/maintenance/${t.id}`,
          });
        }

        // Urgent — promesses de paiement dépassées (§26)
        const brokenPromises = await pb.collection(C.promises).getFullList({
          filter: `status="active" && promised_date<"${iso(now)}"`,
          expand: "tenant,lease.unit",
        });
        for (const p of brokenPromises) {
          rows.push({
            level: "urgent",
            title: `Promesse non tenue — ${fullName(p.expand?.tenant)}`,
            detail: `${formatMoney(p.promised_amount, currency)} attendus le ${
              formatDate(p.promised_date)}`,
            action: "Relancer",
            to: `/relances?locataire=${p.tenant}`,
          });
        }

        // À traiter — relances en attente
        const reminders = await pb.collection(C.reminders).getFullList({
          filter: 'deleted != true && status="a_faire"',
          expand: "tenant,lease.unit",
          sort: "due_at",
        });
        for (const r of reminders) {
          rows.push({
            level: "attention",
            title: `Relance niveau ${r.level} — ${fullName(r.expand?.tenant)}`,
            detail: `${r.expand?.lease?.expand?.unit?.reference || ""} · prévue le ${
              formatDate(r.due_at)}`,
            action: "Effectuer",
            to: `/relances/${r.id}`,
          });
        }

        // À traiter — baux expirant sous 30 jours (§29)
        const expiring = await pb.collection(C.leases).getFullList({
          filter: `deleted != true && status="actif" && end_date<="${iso(in30)}"`,
          expand: "tenant,unit",
          sort: "end_date",
        });
        for (const l of expiring) {
          rows.push({
            level: "attention",
            title: `Bail ${l.reference} expire le ${formatDate(l.end_date)}`,
            detail: `${fullName(l.expand?.tenant)} · ${l.expand?.unit?.reference || ""}`,
            action: "Préparer le renouvellement",
            to: `/baux/${l.id}`,
          });
        }

        // À traiter — preuves de paiement soumises par les locataires
        const proofs = await pb.collection(C.paymentProofs).getFullList({
          filter: 'status="soumise"',
          expand: "tenant",
        });
        for (const p of proofs) {
          rows.push({
            level: "attention",
            title: `Preuve de paiement à vérifier — ${fullName(p.expand?.tenant)}`,
            detail: `${formatMoney(p.declared_amount, currency)} déclarés le ${
              formatDate(p.declared_at)}`,
            action: "Vérifier",
            to: `/paiements/preuves/${p.id}`,
          });
        }

        // Normal — échéances à venir et logements disponibles
        const upcoming = await pb.collection(C.rentSchedules).getList(1, 1, {
          filter: `status="a_venir" && due_date<="${iso(in30)}"`,
        });
        if (upcoming.totalItems) {
          rows.push({
            level: "normal",
            title: `${upcoming.totalItems} échéances arrivent sous 30 jours`,
            detail: "Les rappels partiront automatiquement selon vos règles.",
            action: "Voir l'échéancier",
            to: "/echeances",
          });
        }
        const vacant = await pb.collection(C.units).getList(1, 1, {
          filter: 'deleted != true && status="disponible"',
        });
        if (vacant.totalItems) {
          rows.push({
            level: "normal",
            title: `${vacant.totalItems} logements disponibles à la location`,
            detail: "Ajoutez des candidats pour lancer le processus de mise en location.",
            action: "Voir les logements",
            to: "/logements?statut=disponible",
          });
        }

        if (alive) setState({ loading: false, error: null, rows });
      } catch (err) {
        if (alive) setState({ loading: false, error: readableError(err), rows: [] });
      }
    })();
    return () => { alive = false; };
  }, [currency]);

  if (state.loading) return <LoadingState label="Analyse de votre portefeuille…" />;
  if (state.error) {
    return <ErrorState message={state.error} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl">Centre de contrôle</h1>
        <p className="text-sm text-ink-soft mt-0.5">
          Tout ce qui attend une intervention, classé par urgence.
        </p>
      </div>

      {LEVELS.map((level) => {
        const rows = state.rows.filter((r) => r.level === level.key);
        return (
          <section key={level.key} aria-labelledby={`level-${level.key}`}>
            <div className="flex items-baseline gap-3">
              <h2 id={`level-${level.key}`} className="font-display text-lg flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${DOT[level.tone]}`} aria-hidden />
                {level.label}
              </h2>
              <span className="text-sm num text-ink-faint">{rows.length}</span>
            </div>
            <p className="text-xs text-ink-faint mt-0.5">{level.hint}</p>

            <div className="card mt-3 divide-y divide-line">
              {rows.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ink-soft">
                  {level.key === "urgent"
                    ? "Aucune situation urgente. C'est la bonne nouvelle du jour."
                    : level.key === "attention"
                    ? "Rien à planifier pour l'instant."
                    : "Aucun suivi courant en attente."}
                </p>
              ) : (
                rows.map((row, i) => (
                  <div key={i} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{row.title}</p>
                      <p className="text-xs text-ink-faint mt-0.5">{row.detail}</p>
                    </div>
                    <Link to={row.to} className="btn-secondary h-8 text-xs shrink-0 self-start sm:self-auto">
                      {row.action}
                    </Link>
                  </div>
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
