import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="max-w-md py-16">
      <h1 className="font-display text-2xl">Cette page n'existe pas</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Le lien est peut-être obsolète, ou l'élément a été déplacé dans la corbeille.
      </p>
      <Link to="/" className="btn-primary mt-6">Retour au tableau de bord</Link>
    </div>
  );
}
