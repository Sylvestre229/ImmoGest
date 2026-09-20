import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { C } from "../../lib/collections";
import { pb, readableError } from "../../lib/pb";
import { createRecord, updateRecord } from "../../lib/repository";
import { useCurrencies } from "../../hooks/useCurrencies";
import { LoadingState } from "../../components/States";

const ID_DOCUMENT_TYPES = [
  ["cni", "Carte nationale d'identité"],
  ["passeport", "Passeport"],
  ["rccm", "RCCM (société)"],
  ["autre", "Autre"],
];

const EMPTY = {
  full_name: "", phone: "", whatsapp: "", email: "",
  country: "", address: "",
  id_document_type: "", id_document_number: "", id_document_expiry: "",
  preferred_currency: "", commission_rate: "",
  management_start: "", management_end: "", notes: "",
};

export default function OwnerForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { currencies } = useCurrencies();

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) return;
    let alive = true;
    pb.collection(C.owners).getOne(id).then((o) => {
      if (!alive) return;
      setForm({
        full_name: o.full_name || "", phone: o.phone || "", whatsapp: o.whatsapp || "", email: o.email || "",
        country: o.country || "", address: o.address || "",
        id_document_type: o.id_document_type || "", id_document_number: o.id_document_number || "",
        id_document_expiry: o.id_document_expiry ? o.id_document_expiry.slice(0, 10) : "",
        preferred_currency: o.preferred_currency || "", commission_rate: o.commission_rate ?? "",
        management_start: o.management_start ? o.management_start.slice(0, 10) : "",
        management_end: o.management_end ? o.management_end.slice(0, 10) : "",
        notes: o.notes || "",
      });
    }).catch((err) => setError(readableError(err))).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [editing, id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.full_name.trim()) {
      setError("Le nom du propriétaire est obligatoire.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...form,
        commission_rate: form.commission_rate === "" ? null : Number(form.commission_rate),
        preferred_currency: form.preferred_currency || null,
        id_document_expiry: form.id_document_expiry || null,
        management_start: form.management_start || null,
        management_end: form.management_end || null,
      };
      const record = editing
        ? await updateRecord(C.owners, id, payload)
        : await createRecord(C.owners, payload);
      navigate(`/proprietaires/${record.id}`);
    } catch (err) {
      setError(readableError(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl">{editing ? "Modifier le propriétaire" : "Nouveau propriétaire"}</h1>
        <Link to={editing ? `/proprietaires/${id}` : "/proprietaires"} className="btn-secondary">
          <ArrowLeft size={16} aria-hidden />
          Annuler
        </Link>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-5">
        {error && <p className="text-sm text-alert bg-alert-soft rounded-lg px-3 py-2">{error}</p>}

        <div>
          <label className="label" htmlFor="full_name">Nom complet ou raison sociale</label>
          <input id="full_name" className="field" value={form.full_name} onChange={set("full_name")} required />
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="phone">Téléphone</label>
            <input id="phone" className="field" value={form.phone} onChange={set("phone")} />
          </div>
          <div>
            <label className="label" htmlFor="whatsapp">WhatsApp</label>
            <input id="whatsapp" className="field" placeholder="Si différent" value={form.whatsapp} onChange={set("whatsapp")} />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" className="field" value={form.email} onChange={set("email")} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="country">Pays</label>
            <input id="country" className="field" value={form.country} onChange={set("country")} />
          </div>
          <div>
            <label className="label" htmlFor="address">Adresse</label>
            <input id="address" className="field" value={form.address} onChange={set("address")} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="id_document_type">Type de pièce</label>
            <select id="id_document_type" className="field" value={form.id_document_type} onChange={set("id_document_type")}>
              <option value="">—</option>
              {ID_DOCUMENT_TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="id_document_number">Numéro de pièce</label>
            <input id="id_document_number" className="field" value={form.id_document_number} onChange={set("id_document_number")} />
          </div>
          <div>
            <label className="label" htmlFor="id_document_expiry">Expiration</label>
            <input id="id_document_expiry" type="date" className="field" value={form.id_document_expiry} onChange={set("id_document_expiry")} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="preferred_currency">Devise préférée</label>
            <select id="preferred_currency" className="field" value={form.preferred_currency} onChange={set("preferred_currency")}>
              <option value="">—</option>
              {currencies.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="commission_rate">Commission de gestion (%)</label>
            <input id="commission_rate" type="number" min="0" max="100" step="0.1" className="field"
              value={form.commission_rate} onChange={set("commission_rate")} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="management_start">Début du mandat de gestion</label>
            <input id="management_start" type="date" className="field" value={form.management_start} onChange={set("management_start")} />
          </div>
          <div>
            <label className="label" htmlFor="management_end">Fin du mandat de gestion</label>
            <input id="management_end" type="date" className="field" value={form.management_end} onChange={set("management_end")} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="notes">Notes internes</label>
          <textarea id="notes" className="field h-24" value={form.notes} onChange={set("notes")} />
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Annuler</button>
          <button className="btn-primary" disabled={busy}>
            <Save size={16} aria-hidden />
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
