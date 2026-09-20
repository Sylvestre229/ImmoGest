import { Link } from "react-router-dom";
import { Hammer } from "lucide-react";

/**
 * Écran d'attente pour les modules livrés dans les phases suivantes.
 * Il dit exactement ce qui viendra ici — il ne simule aucune donnée.
 */
export default function Placeholder({ title, phase, describes, next }) {
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-2xl">{title}</h1>
      <div className="card p-6 mt-4">
        <Hammer size={20} className="text-ink-faint" aria-hidden />
        <p className="mt-3 text-sm text-ink-soft">
          Ce module fait partie de la phase {phase}. Le schéma de données et les
          permissions sont déjà en place ; l'écran arrive à la livraison suivante.
        </p>
        {describes && (
          <ul className="mt-4 space-y-1.5 text-sm">
            {describes.map((d) => (
              <li key={d} className="flex gap-2">
                <span className="text-ink-faint" aria-hidden>·</span>
                {d}
              </li>
            ))}
          </ul>
        )}
        {next && (
          <Link to={next.to} className="btn-secondary mt-5">{next.label}</Link>
        )}
      </div>
    </div>
  );
}
