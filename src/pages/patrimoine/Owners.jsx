import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, UserRound } from "lucide-react";
import { useCollection } from "../../hooks/useCollection";
import { useDebounced } from "../../hooks/useDebounced";
import { C } from "../../lib/collections";
import { useAuth } from "../../context/AuthContext";
import { DataView, EmptyState } from "../../components/States";

export default function Owners() {
  const { can } = useAuth();
  const [term, setTerm] = useState("");
  const debounced = useDebounced(term, 300);

  const filter = debounced.trim()
    ? `deleted != true && (full_name ~ "${debounced.trim()}" || phone ~ "${debounced.trim()}" || email ~ "${debounced.trim()}")`
    : "deleted != true";

  const query = useCollection(
    C.owners,
    { sort: "full_name", perPage: 30, filter },
    [filter]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">Propriétaires</h1>
          <p className="text-sm text-ink-soft mt-0.5">
            Les personnes ou sociétés pour lesquelles le patrimoine est géré.
          </p>
        </div>
        {can("proprietaires.creer") && (
          <Link to="/proprietaires/nouveau" className="btn-primary">
            <Plus size={18} aria-hidden />
            Nouveau propriétaire
          </Link>
        )}
      </div>

      <input
        className="field max-w-xs"
        placeholder="Rechercher un nom, un téléphone…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        aria-label="Rechercher un propriétaire"
      />

      <div className="card overflow-hidden">
        <DataView
          query={query}
          empty={
            <EmptyState
              title="Aucun propriétaire pour le moment"
              message="Ajoutez le premier propriétaire pour commencer à rattacher des biens."
              action={
                can("proprietaires.creer") && (
                  <Link to="/proprietaires/nouveau" className="btn-primary">
                    <Plus size={18} aria-hidden />
                    Nouveau propriétaire
                  </Link>
                )
              }
            />
          }
        >
          <ul className="divide-y divide-line">
            {query.items.map((o) => (
              <li key={o.id}>
                <Link to={`/proprietaires/${o.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface">
                  <span className="h-9 w-9 rounded-full bg-brand-light text-brand-dark grid place-items-center shrink-0">
                    <UserRound size={16} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{o.full_name}</p>
                    <p className="text-xs text-ink-faint truncate">
                      {o.phone || o.email || "Aucun contact renseigné"}
                    </p>
                  </div>
                  {o.commission_rate ? (
                    <span className="ml-auto text-sm text-ink-soft num shrink-0">
                      {o.commission_rate} % commission
                    </span>
                  ) : null}
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
