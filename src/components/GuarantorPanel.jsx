import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { pb, readableError } from "../lib/pb";
import { C } from "../lib/collections";
import { createRecord, updateRecord, removeRecord } from "../lib/repository";
import ConfirmDialog from "./ConfirmDialog";

const EMPTY = { full_name: "", phone: "", whatsapp: "", email: "", address: "", profession: "", relationship: "", guarantees: "", notes: "" };

function GuarantorForm({ tenantId, initial, onDone, onCancel }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) return setError("Le nom du garant est obligatoire.");
    setBusy(true);
    setError("");
    try {
      if (initial?.id) {
        await updateRecord(C.guarantors, initial.id, form);
      } else {
        await createRecord(C.guarantors, { ...form, tenant: tenantId });
      }
      onDone();
    } catch (err) {
      setError(readableError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="border border-line rounded-lg p-4 space-y-3 bg-surface/50">
      {error && <p className="text-sm text-alert bg-alert-soft rounded-lg px-3 py-2">{error}</p>}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink-faint block mb-1">Nom complet</label>
          <input className="field" value={form.full_name} onChange={set("full_name")} required />
        </div>
        <div>
          <label className="text-xs text-ink-faint block mb-1">Lien avec le locataire</label>
          <input className="field" placeholder="Père, employeur, ami…" value={form.relationship} onChange={set("relationship")} />
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-ink-faint block mb-1">Téléphone</label>
          <input className="field" value={form.phone} onChange={set("phone")} />
        </div>
        <div>
          <label className="text-xs text-ink-faint block mb-1">WhatsApp</label>
          <input className="field" value={form.whatsapp} onChange={set("whatsapp")} />
        </div>
        <div>
          <label className="text-xs text-ink-faint block mb-1">Email</label>
          <input className="field" type="email" value={form.email} onChange={set("email")} />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-ink-faint block mb-1">Adresse</label>
          <input className="field" value={form.address} onChange={set("address")} />
        </div>
        <div>
          <label className="text-xs text-ink-faint block mb-1">Profession</label>
          <input className="field" value={form.profession} onChange={set("profession")} />
        </div>
      </div>
      <div>
        <label className="text-xs text-ink-faint block mb-1">Ce que le garant s'engage à couvrir</label>
        <textarea className="field h-20" value={form.guarantees} onChange={set("guarantees")} />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-secondary h-8 text-xs" onClick={onCancel}>Annuler</button>
        <button className="btn-primary h-8 text-xs" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
      </div>
    </form>
  );
}

export default function GuarantorPanel({ tenantId, editable = true }) {
  const [guarantors, setGuarantors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setLoading(true);
    pb.collection(C.guarantors)
      .getFullList({ filter: `deleted != true && tenant="${tenantId}"`, sort: "full_name" })
      .then(setGuarantors)
      .catch((err) => setError(readableError(err)))
      .finally(() => setLoading(false));
  };

  useEffect(load, [tenantId]);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await removeRecord(C.guarantors, toDelete.id);
      setToDelete(null);
      load();
    } catch (err) {
      setError(readableError(err));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <p className="text-sm text-ink-faint">Chargement…</p>;

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-alert">{error}</p>}

      {guarantors.length === 0 && !adding && (
        <p className="text-sm text-ink-faint">Aucun garant enregistré pour ce locataire.</p>
      )}

      <ul className="space-y-2">
        {guarantors.map((g) =>
          editingId === g.id ? (
            <li key={g.id}>
              <GuarantorForm
                tenantId={tenantId}
                initial={g}
                onDone={() => { setEditingId(null); load(); }}
                onCancel={() => setEditingId(null)}
              />
            </li>
          ) : (
            <li key={g.id} className="border border-line rounded-lg p-3 flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{g.full_name}</p>
                <p className="text-xs text-ink-faint">
                  {[g.relationship, g.phone, g.email].filter(Boolean).join(" · ") || "Aucun contact renseigné"}
                </p>
                {g.guarantees && <p className="text-xs text-ink-soft mt-1">{g.guarantees}</p>}
              </div>
              {editable && (
                <div className="flex gap-1 shrink-0">
                  <button className="h-7 w-7 grid place-items-center rounded-lg hover:bg-surface" onClick={() => setEditingId(g.id)} aria-label="Modifier">
                    <Pencil size={13} aria-hidden />
                  </button>
                  <button className="h-7 w-7 grid place-items-center rounded-lg hover:bg-surface text-alert" onClick={() => setToDelete(g)} aria-label="Retirer">
                    <Trash2 size={13} aria-hidden />
                  </button>
                </div>
              )}
            </li>
          )
        )}
      </ul>

      {editable && (
        adding ? (
          <GuarantorForm
            tenantId={tenantId}
            onDone={() => { setAdding(false); load(); }}
            onCancel={() => setAdding(false)}
          />
        ) : (
          <button className="btn-secondary h-8 text-xs" onClick={() => setAdding(true)}>
            <Plus size={14} aria-hidden />
            Ajouter un garant
          </button>
        )
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Retirer ce garant ?"
        explanation={`${toDelete?.full_name || ""} sera mis à la corbeille et pourra être restauré si besoin.`}
        confirmLabel="Retirer"
        danger
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
