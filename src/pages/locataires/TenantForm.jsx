import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { C } from "../../lib/collections";
import { pb, readableError } from "../../lib/pb";
import { createRecord, updateRecord } from "../../lib/repository";
import { LoadingState } from "../../components/States";

const GENDERS = [["", "—"], ["homme", "Homme"], ["femme", "Femme"], ["autre", "Autre"]];

const EMPTY = {
  first_name: "", last_name: "", gender: "", birth_date: "", nationality: "",
  phone: "", whatsapp: "", email: "", address: "",
  profession: "", employer: "",
  emergency_contact_name: "", emergency_contact_phone: "",
  risk_score: "", notes: "",
};

export default function TenantForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editing) return;
    let alive = true;
    pb.collection(C.tenants).getOne(id).then((t) => {
      if (!alive) return;
      setForm({
        first_name: t.first_name || "", last_name: t.last_name || "", gender: t.gender || "",
        birth_date: t.birth_date ? t.birth_date.slice(0, 10) : "", nationality: t.nationality || "",
        phone: t.phone || "", whatsapp: t.whatsapp || "", email: t.email || "", address: t.address || "",
        profession: t.profession || "", employer: t.employer || "",
        emergency_contact_name: t.emergency_contact_name || "", emergency_contact_phone: t.emergency_contact_phone || "",
        risk_score: t.risk_score ?? "", notes: t.notes || "",
      });
    }).catch((err) => setError(readableError(err))).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [editing, id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      return setError("Le nom et le prénom sont obligatoires.");
    }
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...form,
        birth_date: form.birth_date || null,
        risk_score: form.risk_score === "" ? null : Number(form.risk_score),
      };
      const record = editing
        ? await updateRecord(C.tenants, id, payload)
        : await createRecord(C.tenants, payload);
      navigate(`/locataires/${record.id}`);
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
        <h1 className="font-display text-2xl">{editing ? "Modifier le locataire" : "Nouveau locataire"}</h1>
        <Link to={editing ? `/locataires/${id}` : "/locataires"} className="btn-secondary">
          <ArrowLeft size={16} aria-hidden />
          Annuler
        </Link>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-5">
        {error && <p className="text-sm text-alert bg-alert-soft rounded-lg px-3 py-2">{error}</p>}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="first_name">Prénom</label>
            <input id="first_name" className="field" value={form.first_name} onChange={set("first_name")} required />
          </div>
          <div>
            <label className="label" htmlFor="last_name">Nom</label>
            <input id="last_name" className="field" value={form.last_name} onChange={set("last_name")} required />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="gender">Genre</label>
            <select id="gender" className="field" value={form.gender} onChange={set("gender")}>
              {GENDERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="birth_date">Date de naissance</label>
            <input id="birth_date" type="date" className="field" value={form.birth_date} onChange={set("birth_date")} />
          </div>
          <div>
            <label className="label" htmlFor="nationality">Nationalité</label>
            <input id="nationality" className="field" value={form.nationality} onChange={set("nationality")} />
          </div>
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

        <div>
          <label className="label" htmlFor="address">Adresse</label>
          <input id="address" className="field" value={form.address} onChange={set("address")} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="profession">Profession</label>
            <input id="profession" className="field" value={form.profession} onChange={set("profession")} />
          </div>
          <div>
            <label className="label" htmlFor="employer">Employeur</label>
            <input id="employer" className="field" value={form.employer} onChange={set("employer")} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="emergency_contact_name">Contact d'urgence — nom</label>
            <input id="emergency_contact_name" className="field" value={form.emergency_contact_name} onChange={set("emergency_contact_name")} />
          </div>
          <div>
            <label className="label" htmlFor="emergency_contact_phone">Contact d'urgence — téléphone</label>
            <input id="emergency_contact_phone" className="field" value={form.emergency_contact_phone} onChange={set("emergency_contact_phone")} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="risk_score">
            Score de suivi interne (0–100, facultatif)
          </label>
          <input id="risk_score" type="number" min="0" max="100" className="field max-w-[8rem]"
            value={form.risk_score} onChange={set("risk_score")} />
          <p className="text-xs text-ink-faint mt-1">
            Une aide au suivi que vous renseignez vous-même — jamais un score calculé automatiquement,
            et jamais une décision à la place du gestionnaire.
          </p>
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
