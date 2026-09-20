import { useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

/**
 * §77 — avant toute action sensible : confirmation, explication, avertissement.
 * Pour les actions irréversibles ou financières, on exige la saisie du mot clé.
 */
export default function ConfirmDialog({
  open,
  title,
  explanation,
  warning,
  confirmLabel = "Confirmer",
  confirmWord,
  danger = false,
  onConfirm,
  onCancel,
  busy = false,
}) {
  const [typed, setTyped] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (open) {
      setTyped("");
      ref.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onCancel?.();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;
  const locked = confirmWord && typed.trim().toUpperCase() !== confirmWord.toUpperCase();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center
                 bg-ink/40 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6">
        <div className="flex gap-3">
          {danger && (
            <AlertTriangle size={20} className="text-alert shrink-0 mt-0.5" aria-hidden />
          )}
          <div>
            <h2 id="confirm-title" className="text-lg font-medium">{title}</h2>
            {explanation && <p className="mt-2 text-sm text-ink-soft">{explanation}</p>}
          </div>
        </div>

        {warning && (
          <p className="mt-4 text-sm bg-alert-soft text-alert rounded-lg px-3 py-2">
            {warning}
          </p>
        )}

        {confirmWord && (
          <div className="mt-4">
            <label className="label" htmlFor="confirm-word">
              Tapez <span className="font-semibold">{confirmWord}</span> pour continuer
            </label>
            <input
              id="confirm-word"
              ref={ref}
              className="field"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          <button className="btn-secondary" onClick={onCancel} disabled={busy}>
            Annuler
          </button>
          <button
            className={danger ? "btn-danger" : "btn-primary"}
            onClick={onConfirm}
            disabled={locked || busy}
          >
            {busy ? "Traitement…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
