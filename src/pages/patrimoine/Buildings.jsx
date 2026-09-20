import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Building } from "lucide-react";
import { useCollection } from "../../hooks/useCollection";
import { useDebounced } from "../../hooks/useDebounced";
import { C } from "../../lib/collections";
import { useAuth } from "../../context/AuthContext";
import { DataView, EmptyState } from "../../components/States";

export default function Buildings() {
  const { can } = useAuth();
  const [term, setTerm] = useState("");
  const debounced = useDebounced(term, 300);

  const filter = debounced.trim()
    ? `deleted != true && (reference ~ "${debounced.trim()}" || name ~ "${debounced.trim()}")`
    : "deleted != true";

  const query = useCollection(
    C.buildings,
    { sort: "name", perPage: 30, filter, expand: "property" },
    [filter]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">Immeubles</h1>
          <p className="text-sm text-ink-soft mt-0.5">Les bâtiments qui regroupent plusieurs logements.</p>
        </div>
        {can("patrimoine.creer") && (
          <Link to="/immeubles/nouveau" className="btn-primary">
            <Plus size={18} aria-hidden />
            Nouvel immeuble
          </Link>
        )}
      </div>

      <input
        className="field max-w-xs"
        placeholder="Référence, nom…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        aria-label="Rechercher un immeuble"
      />

      <div className="card overflow-hidden">
        <DataView
          query={query}
          empty={
            <EmptyState
              title="Aucun immeuble pour le moment"
              message="Un immeuble regroupe plusieurs logements sous une même adresse. Les logements peuvent aussi se passer d'immeuble."
              action={
                can("patrimoine.creer") && (
                  <Link to="/immeubles/nouveau" className="btn-primary">
                    <Plus size={18} aria-hidden />
                    Nouvel immeuble
                  </Link>
                )
              }
            />
          }
        >
          <ul className="divide-y divide-line">
            {query.items.map((b) => (
              <li key={b.id}>
                <Link to={`/immeubles/${b.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface">
                  <span className="h-9 w-9 rounded-full bg-brand-light text-brand-dark grid place-items-center shrink-0">
                    <Building size={16} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{b.name}</p>
                    <p className="text-xs text-ink-faint truncate">
                      {b.expand?.property?.name || "Propriété non chargée"}
                    </p>
                  </div>
                  <div className="ml-auto text-right shrink-0 text-xs text-ink-faint">
                    {b.reference}
                    {b.units_count ? ` · ${b.units_count} logement(s)` : ""}
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
