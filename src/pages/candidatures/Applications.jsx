import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, ClipboardList } from "lucide-react";
import { useCollection } from "../../hooks/useCollection";
import { useDebounced } from "../../hooks/useDebounced";
import { C } from "../../lib/collections";
import { useAuth } from "../../context/AuthContext";
import { formatDate, humanize } from "../../lib/format";
import { DataView, EmptyState } from "../../components/States";
import StatusPill from "../../components/StatusPill";

const STATUS_FILTERS = [
  ["", "Tous statuts"],
  ["nouveau", "Nouveau"], ["contacte", "Contacté"],
  ["visite_programmee", "Visite programmée"], ["visite_effectuee", "Visite effectuée"],
  ["dossier_incomplet", "Dossier incomplet"], ["dossier_complet", "Dossier complet"],
  ["en_etude", "En étude"], ["accepte", "Accepté"], ["refuse", "Refusé"],
  ["bail_en_preparation", "Bail en préparation"], ["bail_signe", "Bail signé"],
];

export default function Applications() {
  const { can } = useAuth();
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const debounced = useDebounced(term, 300);

  const filters = [
    "deleted != true",
    status ? `status="${status}"` : "",
    debounced.trim() ? `(candidate_name ~ "${debounced.trim()}" || candidate_phone ~ "${debounced.trim()}")` : "",
  ].filter(Boolean).join(" && ");

  const query = useCollection(
    C.applications,
    { sort: "-received_at,-created", perPage: 30, filter: filters, expand: "unit" },
    [filters]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">Candidatures</h1>
          <p className="text-sm text-ink-soft mt-0.5">Le pipeline, du premier contact jusqu'au bail signé.</p>
        </div>
        {can("candidatures.creer") && (
          <Link to="/candidatures/nouvelle" className="btn-primary">
            <Plus size={18} aria-hidden />
            Nouvelle candidature
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="field max-w-xs"
          placeholder="Nom, téléphone…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          aria-label="Rechercher une candidature"
        />
        <select className="field w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <DataView
          query={query}
          empty={
            <EmptyState
              title="Aucune candidature pour le moment"
              message="Chaque demande pour un logement — reçue par téléphone, par visite spontanée ou autrement — peut être enregistrée ici."
              action={
                can("candidatures.creer") && (
                  <Link to="/candidatures/nouvelle" className="btn-primary">
                    <Plus size={18} aria-hidden />
                    Nouvelle candidature
                  </Link>
                )
              }
            />
          }
        >
          <ul className="divide-y divide-line">
            {query.items.map((a) => (
              <li key={a.id}>
                <Link to={`/candidatures/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface">
                  <span className="h-9 w-9 rounded-full bg-brand-light text-brand-dark grid place-items-center shrink-0">
                    <ClipboardList size={16} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{a.candidate_name}</p>
                    <p className="text-xs text-ink-faint truncate">
                      {a.expand?.unit?.reference || "Logement"} · {formatDate(a.received_at)}
                    </p>
                  </div>
                  <span className="ml-auto shrink-0"><StatusPill value={a.status} label={humanize(a.status)} /></span>
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
