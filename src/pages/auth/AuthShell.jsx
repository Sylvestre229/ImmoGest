/**
 * Écran d'accueil hors session.
 * À gauche, ce que le logiciel fait concrètement ; à droite, le formulaire.
 * Pas de promesse marketing : l'utilisateur vient travailler.
 */
export default function AuthShell({ title, subtitle, children }) {
  return (
    <div className="min-h-dvh grid lg:grid-cols-[1.1fr_1fr]">
      <div className="hidden lg:flex flex-col justify-between bg-brand-dark text-white p-12">
        <span className="font-display text-xl">GestImmo</span>

        <div className="max-w-md">
          <h1 className="font-display text-4xl leading-tight">
            Vos loyers, vos baux et vos relances au même endroit.
          </h1>
          <p className="mt-5 text-white/70 leading-relaxed">
            Le logiciel répond à trois questions à chaque ouverture : ce qui se passe,
            ce qui doit être fait, et pour quand.
          </p>

          <dl className="mt-10 space-y-3 text-sm">
            {[
              ["Échéances", "générées automatiquement à la signature du bail"],
              ["Impayés", "suivis par niveau de relance, avec historique des contacts"],
              ["Caution", "calculée à partir des états des lieux d'entrée et de sortie"],
            ].map(([term, desc]) => (
              <div key={term} className="flex gap-3">
                <dt className="w-24 shrink-0 text-white/50">{term}</dt>
                <dd className="text-white/85">{desc}</dd>
              </div>
            ))}
          </dl>
        </div>

        <p className="text-xs text-white/40">
          Devise de base XOF · multi-pays · multi-devises
        </p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <span className="lg:hidden font-display text-xl block mb-8">GestImmo</span>
          <h2 className="font-display text-2xl">{title}</h2>
          {subtitle && <p className="mt-2 mb-7 text-sm text-ink-soft">{subtitle}</p>}
          {children}
        </div>
      </div>
    </div>
  );
}
