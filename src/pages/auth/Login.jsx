import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { readableError } from "../../lib/pb";
import AuthShell from "./AuthShell";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(form.email.trim(), form.password);
      navigate(user.onboarding_done ? "/" : "/bienvenue", { replace: true });
    } catch (err) {
      setError(err.message?.includes("désactivé") ? err.message : readableError(err));
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Se connecter"
      subtitle="Reprenez la gestion de votre patrimoine là où vous l'aviez laissée."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Adresse email</label>
          <input
            id="email" type="email" required autoComplete="email" className="field"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div>
          <label className="label" htmlFor="password">Mot de passe</label>
          <input
            id="password" type="password" required autoComplete="current-password"
            className="field" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        {error && (
          <p className="text-sm bg-alert-soft text-alert rounded-lg px-3 py-2" role="alert">
            {error}
          </p>
        )}

        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Connexion…" : "Se connecter"}
        </button>
      </form>

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link to="/mot-de-passe-oublie" className="text-brand hover:underline">
          Mot de passe oublié
        </Link>
        <Link to="/inscription" className="text-ink-soft hover:underline">
          Créer un compte
        </Link>
      </div>
    </AuthShell>
  );
}
