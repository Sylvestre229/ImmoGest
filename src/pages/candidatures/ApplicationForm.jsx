import { useEffect, useState } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { C } from "../../lib/collections";
import { pb, readableError } from "../../lib/pb";
import { createRecord, updateRecord } from "../../lib/repository";
import { LoadingState } from "../../components/States";

const STATUS = ["nouveau", "contacte", "visite_programmee", "visite_effectuee",
  "dossier_incomplet", "dossier_complet", "en_etude", "accepte", "refuse",
  "bail_en_preparation", "bail_signe"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY = {
  unit: "", candidate_name: "", candidate_phone: "", candidate_email: "",
  profession: "", declared_income: "", status: "nouveau",
  received_at: todayISO(), notes: "",
};

export default function ApplicationForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({ ...EMPTY, unit: searchParams.get("logement") || "" });
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    pb.collection(C.units)
      .getFullList({ filter: 'deleted != true && status != "loue"', sort: "reference" })
      .then(setUnits).catch(() => setUnits([]));
  }, []);

  useEffect(() => {
    if (!editing) return;
    let alive = true;
    pb.collection(C.applications).getOne(id).then((a) => {
      if (!alive) return;
      setForm({
        unit: a.unit || "", candidate_name: a.candidate_name || "", candidate_phone: a.candidate_phone || "",
        candidate_email: a.candidate_email || "", profession: a.profession || "",
        declared_income: a.declared_income ?? "", status: a.status || "nouveau",
        received_at: a.received_at ? a.received_at.slice(0, 10) : todayISO(),
        notes: a.notes || "",
      });
    }).catch((err) => setError(readableError(err))).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [editing, id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.unit) return setError("Choisissez le logement concerné.");
    if (!form.candidate_name.trim()) return setError("Le nom du candidat est obligatoire.");
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...form,
        declared_income: form.declared_income === "" ? null : Number(form.declared_income),
        received_at: form.received_at || null,
      };
      const record = editing
        ? await updateRecord(C.applications, id, payload)
        : await createRecord(C.applications, payload);
      navigate(`/candidatures/${record.id}`);
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
        <h1 className="font-display text-2xl">{editing ? "Modifier la candidature" : "Nouvelle candidature"}</h1>
        <Link to={editing ? `/candidatures/${id}` : "/candidatures"} className="btn-secondary">
          <ArrowLeft size={16} aria-hidden />
          Annuler
        </Link>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-5">
        {error && <p className="text-sm text-alert bg-alert-soft rounded-lg px-3 py-2">{error}</p>}

        <div>
          <label className="label" htmlFor="unit">Logement</label>
          <select id="unit" className="field" value={form.unit} onChange={set("unit")} required>
            <option value="">Choisir…</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.reference}{u.name ? ` — ${u.name}` : ""}</option>)}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="candidate_name">Nom du candidat</label>
            <input id="candidate_name" className="field" value={form.candidate_name} onChange={set("candidate_name")} required />
          </div>
          <div>
            <label className="label" htmlFor="candidate_phone">Téléphone</label>
            <input id="candidate_phone" className="field" value={form.candidate_phone} onChange={set("candidate_phone")} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="candidate_email">Email</label>
            <input id="candidate_email" type="email" className="field" value={form.candidate_email} onChange={set("candidate_email")} />
          </div>
          <div>
            <label className="label" htmlFor="profession">Profession</label>
            <input id="profession" className="field" value={form.profession} onChange={set("profession")} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="declared_income">Revenu déclaré</label>
            <input id="declared_income" type="number" min="0" className="field" value={form.declared_income} onChange={set("declared_income")} />
          </div>
          <div>
            <label className="label" htmlFor="received_at">Reçue le</label>
            <input id="received_at" type="date" className="field" value={form.received_at} onChange={set("received_at")} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="status">Statut</label>
          <select id="status" className="field" value={form.status} onChange={set("status")}>
            {STATUS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="notes">Notes</label>
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
