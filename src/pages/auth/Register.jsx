import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Building2, KeyRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { readableError } from "../../lib/pb";
import AuthShell from "./AuthShell";

/**
 * §3 — le type de compte se choisit à l'inscription et détermine
 * tout le reste du parcours.
 */
const ACCOUNT_TYPES = [
  {
    value: "proprietaire",
    icon: Building2,
    title: "Propriétaire",
    description: "Je gère des biens, des baux et des locataires.",
  },
  {
    value: "locataire",
    icon: KeyRound,
    title: "Locataire",
    description: "Je loue un logement et je suis mes paiements.",
  },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("proprietaire");
  const [form, setForm] = useState({
    fullName: "", email: "", phone: "", country: "BJ",
    password: "", confirm: "",
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      return setError("Les deux mots de passe ne correspondent pas.");
    }
    if (form.password.length < 8) {
      return setError("Le mot de passe doit faire au moins 8 caractères.");
    }
    setBusy(true);
    setError(null);
    try {
      await register({
        email: form.email.trim(),
        password: form.password,
        fullName: form.fullName.trim(),
        role,
        phone: form.phone.trim(),
        country: form.country,
      });
      navigate("/bienvenue", { replace: true });
    } catch (err) {
      setError(readableError(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="Deux minutes pour configurer votre espace."
    >
      <form onSubmit={submit} className="space-y-4">
        <fieldset>
          <legend className="label">Votre situation</legend>
          <div className="grid grid-cols-2 gap-2">
            {ACCOUNT_TYPES.map((type) => {
              const Icon = type.icon;
              const active = role === type.value;
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setRole(type.value)}
                  aria-pressed={active}
                  className={`text-left p-3 rounded-xl border transition-colors ${
                    active
                      ? "border-brand bg-brand-light"
                      : "border-line hover:border-ink-faint"
                  }`}
                >
                  <Icon size={18} className={active ? "text-brand" : "text-ink-faint"} aria-hidden />
                  <span className="block mt-2 text-sm font-medium">{type.title}</span>
                  <span className="block mt-0.5 text-xs text-ink-soft leading-snug">
                    {type.description}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <div>
          <label className="label" htmlFor="fullName">Nom complet</label>
          <input id="fullName" required className="field" value={form.fullName} onChange={set("fullName")} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="field" value={form.email} onChange={set("email")} />
          </div>
          <div>
            <label className="label" htmlFor="phone">Téléphone</label>
            <input id="phone" type="tel" className="field" placeholder="+229 ..." value={form.phone} onChange={set("phone")} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="password">Mot de passe</label>
            <input id="password" type="password" required minLength={8} autoComplete="new-password"
              className="field" value={form.password} onChange={set("password")} />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Confirmation</label>
            <input id="confirm" type="password" required autoComplete="new-password"
              className="field" value={form.confirm} onChange={set("confirm")} />
          </div>
        </div>

        {error && (
          <p className="text-sm bg-alert-soft text-alert rounded-lg px-3 py-2" role="alert">
            {error}
          </p>
        )}

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Création du compte…" : "Créer mon compte"}
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        Vous avez déjà un compte ?{" "}
        <Link to="/connexion" className="text-brand hover:underline">Se connecter</Link>
      </p>
    </AuthShell>
  );
}
