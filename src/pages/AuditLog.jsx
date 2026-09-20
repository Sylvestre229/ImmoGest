import { useState } from "react";
import { useCollection } from "../hooks/useCollection";
import { C } from "../lib/collections";
import { formatDateTime, humanize } from "../lib/format";
import { DataView, EmptyState } from "../components/States";

/**
 * §58 — le journal répond toujours à : qui, quoi, quand, avant, après.
 * Il est en lecture seule, y compris pour le propriétaire.
 */

const ACTION_LABELS = {
  create: "Création",
  update: "Modification",
  delete: "Mise à la corbeille",
  restore: "Restauration",
  purge: "Suppression définitive",
  login: "Connexion",
  export: "Export",
};

function ValueDiff({ before, after }) {
  const keys = [...new Set([...Object.keys(before || {}), ...Object.keys(after || {})])];
  if (!keys.length) return null;
  return (
    <dl className="mt-2 space-y-1">
      {keys.map((k) => (
        <div key={k} className="flex flex-wrap gap-x-2 text-xs">
          <dt className="text-ink-faint min-w-[9rem]">{humanize(k)}</dt>
          <dd className="num">
            <span className="line-through text-ink-faint">
              {format(before?.[k])}
            </span>
            <span className="mx-1.5 text-ink-faint" aria-label="devient">→</span>
            <span>{format(after?.[k])}</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function format(v) {
  if (v === null || v === undefined || v === "") return "vide";
  if (typeof v === "boolean") return v ? "oui" : "non";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export default function AuditLog() {
  const [onlyFinancial, setOnlyFinancial] = useState(false);
  const [term, setTerm] = useState("");

  const filters = [
    onlyFinancial ? "financial=true" : "",
    term.trim() ? `(record_label ~ "${term.trim()}" || user_label ~ "${term.trim()}")` : "",
  ].filter(Boolean).join(" && ");

  const query = useCollection(
    C.auditLogs,
    { sort: "-created", perPage: 40, filter: filters || undefined },
    [filters]
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl">Journal d'audit</h1>
        <p className="text-sm text-ink-soft mt-0.5">
          Chaque écriture est conservée avec son auteur et sa valeur précédente.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <input
          className="field max-w-xs"
          placeholder="Filtrer par élément ou utilisateur"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          aria-label="Filtrer le journal"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={onlyFinancial}
            onChange={(e) => setOnlyFinancial(e.target.checked)}
          />
          Opérations financières seulement
        </label>
        <span className="ml-auto text-sm text-ink-faint num">
          {query.totalItems} entrées
        </span>
      </div>

      <div className="card overflow-hidden">
        <DataView
          query={query}
          empty={
            <EmptyState
              title="Le journal est vide"
              message="Il se remplira dès la première écriture dans l'application."
            />
          }
        >
          <ul className="divide-y divide-line">
            {query.items.map((log) => (
              <li key={log.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-sm font-medium">{log.user_label}</span>
                  <span className="text-sm text-ink-soft">
                    {ACTION_LABELS[log.action] || humanize(log.action)}
                  </span>
                  <span className="text-sm">
                    {humanize(log.collection_name)}
                    {log.record_label ? ` · ${log.record_label}` : ""}
                  </span>
                  {log.financial && (
                    <span className="pill-warn">Financier</span>
                  )}
                  <time className="ml-auto text-xs text-ink-faint num" dateTime={log.created}>
                    {formatDateTime(log.created)}
                  </time>
                </div>
                <ValueDiff before={log.before} after={log.after} />
              </li>
            ))}
          </ul>
        </DataView>
      </div>

      {query.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            className="btn-secondary h-8 text-xs"
            disabled={query.page <= 1}
            onClick={() => query.setPage(query.page - 1)}
          >
            Page précédente
          </button>
          <span className="text-sm text-ink-faint num">
            {query.page} / {query.totalPages}
          </span>
          <button
            className="btn-secondary h-8 text-xs"
            disabled={query.page >= query.totalPages}
            onClick={() => query.setPage(query.page + 1)}
          >
            Page suivante
          </button>
        </div>
      )}
    </div>
  );
}
