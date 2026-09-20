import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, DoorOpen } from "lucide-react";
import { useCollection } from "../../hooks/useCollection";
import { useDebounced } from "../../hooks/useDebounced";
import { C } from "../../lib/collections";
import { useAuth } from "../../context/AuthContext";
import { formatMoney } from "../../lib/money";
import { humanize } from "../../lib/format";
import { DataView, EmptyState } from "../../components/States";
import StatusPill from "../../components/StatusPill";

const STATUS_FILTERS = [
  ["", "Tous statuts"],
  ["disponible", "Disponible"],
  ["reserve", "Réservé"],
  ["loue", "Loué"],
  ["en_maintenance", "En maintenance"],
  ["indisponible", "Indisponible"],
  ["hors_service", "Hors service"],
];

export default function Units() {
  const { can } = useAuth();
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState("");
  const debounced = useDebounced(term, 300);

  const filters = [
    "deleted != true",
    status ? `status="${status}"` : "",
    debounced.trim() ? `(reference ~ "${debounced.trim()}" || name ~ "${debounced.trim()}" || door_number ~ "${debounced.trim()}")` : "",
  ].filter(Boolean).join(" && ");

  const query = useCollection(
    C.units,
    { sort: "reference", perPage: 30, filter: filters, expand: "property,building,base_rent_currency" },
    [filters]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">Logements</h1>
          <p className="text-sm text-ink-soft mt-0.5">Chaque unité locative, louée ou disponible.</p>
        </div>
        {can("patrimoine.creer") && (
          <Link to="/logements/nouveau" className="btn-primary">
            <Plus size={18} aria-hidden />
            Nouveau logement
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          className="field max-w-xs"
          placeholder="Référence, nom, porte…"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          aria-label="Rechercher un logement"
        />
        <select className="field w-auto" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_FILTERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <span className="ml-auto self-center text-sm text-ink-faint num">{query.totalItems} logement(s)</span>
      </div>

      <div className="card overflow-hidden">
        <DataView
          query={query}
          empty={
            <EmptyState
              title="Aucun logement pour le moment"
              message="Ajoutez un logement pour commencer à suivre son statut et, plus tard, ses baux."
              action={
                can("patrimoine.creer") && (
                  <Link to="/logements/nouveau" className="btn-primary">
                    <Plus size={18} aria-hidden />
                    Nouveau logement
                  </Link>
                )
              }
            />
          }
        >
          <ul className="divide-y divide-line">
            {query.items.map((u) => (
              <li key={u.id}>
                <Link to={`/logements/${u.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface">
                  <span className="h-9 w-9 rounded-full bg-brand-light text-brand-dark grid place-items-center shrink-0">
                    <DoorOpen size={16} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {u.reference}{u.name ? ` · ${u.name}` : ""}
                    </p>
                    <p className="text-xs text-ink-faint truncate">
                      {humanize(u.unit_type)}
                      {u.expand?.building ? ` · ${u.expand.building.name}` : u.expand?.property ? ` · ${u.expand.property.name}` : ""}
                    </p>
                  </div>
                  <div className="ml-auto text-right shrink-0 flex items-center gap-3">
                    {u.base_rent ? (
                      <span className="text-sm num text-ink-soft">
                        {formatMoney(u.base_rent, u.expand?.base_rent_currency?.code || "XOF", { compact: true })}
                      </span>
                    ) : null}
                    <StatusPill value={u.status} />
                  </div>
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
