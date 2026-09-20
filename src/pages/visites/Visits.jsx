import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, CalendarDays } from "lucide-react";
import { useCollection } from "../../hooks/useCollection";
import { C } from "../../lib/collections";
import { useAuth } from "../../context/AuthContext";
import { formatDateTime, humanize } from "../../lib/format";
import { DataView, EmptyState } from "../../components/States";
import StatusPill from "../../components/StatusPill";

const STATUS_FILTERS = [
  ["", "Tous statuts"],
  ["planifiee", "Planifiée"], ["confirmee", "Confirmée"], ["effectuee", "Effectuée"],
  ["annulee", "Annulée"], ["reportee", "Reportée"], ["absence", "Absence"],
];

export default function Visits() {
  const { can } = useAuth();
  const [status, setStatus] = useState("");

  const filter = ["deleted != true", status ? `status="${status}"` : ""].filter(Boolean).join(" && ");

  const query = useCollection(
    C.visits,
    { sort: "-scheduled_at", perPage: 30, filter, expand: "unit,agent" },
    [filter]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">Visites</h1>
          <p className="text-sm text-ink-soft mt-0.5">Les visites de logements, planifiées ou passées.</p>
        </div>
        {can("visites.creer") && (
          <Link to="/visites/nouvelle" className="btn-primary">
            <Plus size={18} aria-hidden />
            Nouvelle visite
          </Link>
        )}
      </div>

      <select className="field w-auto max-w-xs" value={status} onChange={(e) => setStatus(e.target.value)}>
        {STATUS_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>

      <div className="card overflow-hidden">
        <DataView
          query={query}
          empty={
            <EmptyState
              title="Aucune visite pour le moment"
              message="Programmez une visite depuis une candidature, ou directement ici."
              action={
                can("visites.creer") && (
                  <Link to="/visites/nouvelle" className="btn-primary">
                    <Plus size={18} aria-hidden />
                    Nouvelle visite
                  </Link>
                )
              }
            />
          }
        >
          <ul className="divide-y divide-line">
            {query.items.map((v) => (
              <li key={v.id}>
                <Link to={`/visites/${v.id}/modifier`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface">
                  <span className="h-9 w-9 rounded-full bg-brand-light text-brand-dark grid place-items-center shrink-0">
                    <CalendarDays size={16} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {v.visitor_name || "Visiteur non précisé"}
                    </p>
                    <p className="text-xs text-ink-faint truncate">
                      {v.expand?.unit?.reference || "Logement"} · {formatDateTime(v.scheduled_at)}
                    </p>
                  </div>
                  <span className="ml-auto shrink-0"><StatusPill value={v.status} label={humanize(v.status)} /></span>
                </Link>
              </li>
            ))}
          </ul>
        </DataView>
      </div>

      {query.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button className="btn-secondary h-8 text-xs" disabled={query.page <= 1}
            onClick={() => query.setPage(query.page - 1)}>
            Page précédente
          </button>
          <span className="text-sm text-ink-faint num">{query.page} / {query.totalPages}</span>
          <button className="btn-secondary h-8 text-xs" disabled={query.page >= query.totalPages}
            onClick={() => query.setPage(query.page + 1)}>
            Page suivante
          </button>
        </div>
      )}
    </div>
  );
}
