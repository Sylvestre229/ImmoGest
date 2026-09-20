import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Building2, MapPin } from "lucide-react";
import { useCollection } from "../../hooks/useCollection";
import { useDebounced } from "../../hooks/useDebounced";
import { C } from "../../lib/collections";
import { useAuth } from "../../context/AuthContext";
import { DataView, EmptyState } from "../../components/States";

export default function Properties() {
  const { can } = useAuth();
  const [term, setTerm] = useState("");
  const debounced = useDebounced(term, 300);

  const filter = debounced.trim()
    ? `deleted != true && (reference ~ "${debounced.trim()}" || name ~ "${debounced.trim()}" || city ~ "${debounced.trim()}")`
    : "deleted != true";

  const query = useCollection(
    C.properties,
    { sort: "name", perPage: 30, filter, expand: "owner" },
    [filter]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">Propriétés</h1>
          <p className="text-sm text-ink-soft mt-0.5">
            Le bien tel qu'il existe sur le terrain — immeubles et logements s'y rattachent.
          </p>
        </div>
        {can("patrimoine.creer") && (
          <Link to="/proprietes/nouveau" className="btn-primary">
            <Plus size={18} aria-hidden />
            Nouvelle propriété
          </Link>
        )}
      </div>

      <input
        className="field max-w-xs"
        placeholder="Référence, nom, ville…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        aria-label="Rechercher une propriété"
      />

      <div className="card overflow-hidden">
        <DataView
          query={query}
          empty={
            <EmptyState
              title="Aucune propriété pour le moment"
              message="Créez la première propriété pour pouvoir y rattacher des immeubles et des logements."
              action={
                can("patrimoine.creer") && (
                  <Link to="/proprietes/nouveau" className="btn-primary">
                    <Plus size={18} aria-hidden />
                    Nouvelle propriété
                  </Link>
                )
              }
            />
          }
        >
          <ul className="divide-y divide-line">
            {query.items.map((p) => (
              <li key={p.id}>
                <Link to={`/proprietes/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface">
                  <span className="h-9 w-9 rounded-full bg-brand-light text-brand-dark grid place-items-center shrink-0">
                    <Building2 size={16} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-xs text-ink-faint truncate flex items-center gap-1">
                      <MapPin size={11} aria-hidden />
                      {[p.city, p.country].filter(Boolean).join(", ") || "Localisation non renseignée"}
                    </p>
                  </div>
                  <div className="ml-auto text-right shrink-0">
                    <p className="text-xs text-ink-faint">{p.reference}</p>
                    {p.expand?.owner && <p className="text-xs text-ink-soft">{p.expand.owner.full_name}</p>}
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
