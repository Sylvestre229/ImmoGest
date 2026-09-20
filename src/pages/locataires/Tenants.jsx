import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Users } from "lucide-react";
import { useCollection } from "../../hooks/useCollection";
import { useDebounced } from "../../hooks/useDebounced";
import { C } from "../../lib/collections";
import { useAuth } from "../../context/AuthContext";
import { fullName } from "../../lib/format";
import { DataView, EmptyState } from "../../components/States";

export default function Tenants() {
  const { can } = useAuth();
  const [term, setTerm] = useState("");
  const debounced = useDebounced(term, 300);

  const filter = debounced.trim()
    ? `deleted != true && (first_name ~ "${debounced.trim()}" || last_name ~ "${debounced.trim()}" || phone ~ "${debounced.trim()}" || email ~ "${debounced.trim()}")`
    : "deleted != true";

  const query = useCollection(C.tenants, { sort: "first_name", perPage: 30, filter }, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">Locataires</h1>
          <p className="text-sm text-ink-soft mt-0.5">Le dossier de chaque locataire, actuel ou passé.</p>
        </div>
        {can("locataires.creer") && (
          <Link to="/locataires/nouveau" className="btn-primary">
            <Plus size={18} aria-hidden />
            Nouveau locataire
          </Link>
        )}
      </div>

      <input
        className="field max-w-xs"
        placeholder="Nom, téléphone, email…"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        aria-label="Rechercher un locataire"
      />

      <div className="card overflow-hidden">
        <DataView
          query={query}
          empty={
            <EmptyState
              title="Aucun locataire pour le moment"
              message="Les locataires apparaîtront ici au fur et à mesure des candidatures acceptées, ou vous pouvez en créer un directement."
              action={
                can("locataires.creer") && (
                  <Link to="/locataires/nouveau" className="btn-primary">
                    <Plus size={18} aria-hidden />
                    Nouveau locataire
                  </Link>
                )
              }
            />
          }
        >
          <ul className="divide-y divide-line">
            {query.items.map((t) => (
              <li key={t.id}>
                <Link to={`/locataires/${t.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface">
                  <span className="h-9 w-9 rounded-full bg-brand-light text-brand-dark grid place-items-center shrink-0">
                    <Users size={16} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{fullName(t)}</p>
                    <p className="text-xs text-ink-faint truncate">
                      {t.phone || t.email || "Aucun contact renseigné"}
                    </p>
                  </div>
                  {t.profession ? (
                    <span className="ml-auto text-xs text-ink-faint shrink-0">{t.profession}</span>
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
