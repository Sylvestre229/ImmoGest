import { Loader2, Inbox, AlertTriangle, RotateCw } from "lucide-react";

/** Les quatre états de toute vue de données (§68). Jamais de page blanche. */

export function LoadingState({ label = "Chargement…" }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-ink-faint">
      <Loader2 size={18} className="animate-spin" aria-hidden />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function SkeletonRows({ rows = 5 }) {
  return (
    <div className="divide-y divide-line" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-14 flex items-center gap-4 px-4">
          <div className="h-3 w-1/4 rounded bg-surface" />
          <div className="h-3 w-1/6 rounded bg-surface" />
          <div className="h-3 w-1/5 rounded bg-surface ml-auto" />
        </div>
      ))}
    </div>
  );
}

/** Un écran vide est une invitation à agir, pas un constat. */
export function EmptyState({ title, message, action }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      <Inbox size={28} className="text-ink-faint mb-3" aria-hidden />
      <h3 className="text-base font-medium">{title}</h3>
      {message && <p className="mt-1 text-sm text-ink-soft max-w-sm">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Une erreur dit ce qui s'est passé et comment repartir. */
export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center text-center py-16 px-6">
      <AlertTriangle size={28} className="text-alert mb-3" aria-hidden />
      <h3 className="text-base font-medium">Les données n'ont pas pu être chargées</h3>
      <p className="mt-1 text-sm text-ink-soft max-w-sm">{message}</p>
      {onRetry && (
        <button className="btn-secondary mt-5" onClick={() => onRetry()}>
          <RotateCw size={15} aria-hidden /> Réessayer
        </button>
      )}
    </div>
  );
}

/**
 * Enveloppe standard : passe la vue au bon état sans que chaque page
 * ait à réécrire la même logique.
 */
export function DataView({ query, empty, children, skeleton = true }) {
  if (query.loading) return skeleton ? <SkeletonRows /> : <LoadingState />;
  if (query.error) return <ErrorState message={query.error} onRetry={() => query.reload(query.page)} />;
  if (query.isEmpty) return empty || <EmptyState title="Rien à afficher pour l'instant" />;
  return children;
}
