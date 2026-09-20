import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { readableError } from "../../lib/pb";
import AuthShell from "./AuthShell";

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(readableError(err));
    }
    setBusy(false);
  };

  if (sent) {
    return (
      <AuthShell title="Vérifiez votre boîte mail">
        <p className="text-sm text-ink-soft">
          Si un compte existe pour {email}, un lien de réinitialisation vient d'y être
          envoyé. Le lien expire au bout d'une heure.
        </p>
        <Link to="/connexion" className="btn-secondary w-full mt-6">
          Retour à la connexion
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Réinitialiser le mot de passe"
      subtitle="Indiquez l'adresse de votre compte, nous vous envoyons un lien."
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Adresse email</label>
          <input
            id="email" type="email" required className="field" value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {error && (
          <p className="text-sm bg-alert-soft text-alert rounded-lg px-3 py-2" role="alert">
            {error}
          </p>
        )}
        <button className="btn-primary w-full" disabled={busy}>
          {busy ? "Envoi…" : "Envoyer le lien"}
        </button>
      </form>
      <Link to="/connexion" className="block mt-6 text-sm text-ink-soft hover:underline">
        Retour à la connexion
      </Link>
    </AuthShell>
  );
}
