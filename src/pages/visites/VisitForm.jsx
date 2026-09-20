import { useEffect, useState } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { C } from "../../lib/collections";
import { pb, readableError } from "../../lib/pb";
import { createRecord, updateRecord, removeRecord } from "../../lib/repository";
import { useAuth } from "../../context/AuthContext";
import { LoadingState } from "../../components/States";
import ConfirmDialog from "../../components/ConfirmDialog";

const STATUS = ["planifiee", "confirmee", "effectuee", "annulee", "reportee", "absence"];

function inOneHour() {
  const d = new Date(Date.now() + 3600_000);
  d.setMinutes(0, 0, 0);
  return d.toISOString().slice(0, 16);
}

const EMPTY = {
  unit: "", application: "", visitor_name: "", visitor_phone: "",
  agent: "", scheduled_at: inOneHour(), status: "planifiee", feedback: "",
};

export default function VisitForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, can } = useAuth();

  const [form, setForm] = useState({
    ...EMPTY,
    unit: searchParams.get("logement") || "",
    application: searchParams.get("candidature") || "",
    agent: user?.id || "",
  });
  const [units, setUnits] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    pb.collection(C.units).getFullList({ filter: "deleted != true", sort: "reference" }).then(setUnits).catch(() => setUnits([]));
    pb.collection(C.users).getFullList({ filter: 'active=true && role!="locataire"', sort: "name" }).then(setAgents).catch(() => setAgents([]));
  }, []);

  useEffect(() => {
    if (!editing) return;
    let alive = true;
    pb.collection(C.visits).getOne(id).then((v) => {
      if (!alive) return;
      setForm({
        unit: v.unit || "", application: v.application || "",
        visitor_name: v.visitor_name || "", visitor_phone: v.visitor_phone || "",
        agent: v.agent || "", scheduled_at: v.scheduled_at ? v.scheduled_at.slice(0, 16) : inOneHour(),
        status: v.status || "planifiee", feedback: v.feedback || "",
      });
    }).catch((err) => setError(readableError(err))).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [editing, id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.unit) return setError("Choisissez le logement à visiter.");
    if (!form.scheduled_at) return setError("Indiquez la date et l'heure de la visite.");
    setBusy(true);
    setError("");
    try {
      const payload = { ...form, agent: form.agent || null, application: form.application || null };
      const record = editing
        ? await updateRecord(C.visits, id, payload)
        : await createRecord(C.visits, payload);
      navigate(form.application ? `/candidatures/${form.application}` : "/visites");
    } catch (err) {
      setError(readableError(err));
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await removeRecord(C.visits, id);
      navigate("/visites");
    } catch (err) {
      setError(readableError(err));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="max-w-2xl space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl">{editing ? "Modifier la visite" : "Nouvelle visite"}</h1>
        <div className="flex gap-2">
          {editing && can("visites.supprimer") && (
            <button type="button" className="btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} aria-hidden />
            </button>
          )}
          <Link to="/visites" className="btn-secondary">
            <ArrowLeft size={16} aria-hidden />
            Annuler
          </Link>
        </div>
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
            <label className="label" htmlFor="visitor_name">Nom du visiteur</label>
            <input id="visitor_name" className="field" value={form.visitor_name} onChange={set("visitor_name")} />
          </div>
          <div>
            <label className="label" htmlFor="visitor_phone">Téléphone</label>
            <input id="visitor_phone" className="field" value={form.visitor_phone} onChange={set("visitor_phone")} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="scheduled_at">Date et heure</label>
            <input id="scheduled_at" type="datetime-local" className="field" value={form.scheduled_at} onChange={set("scheduled_at")} required />
          </div>
          <div>
            <label className="label" htmlFor="agent">Agent</label>
            <select id="agent" className="field" value={form.agent} onChange={set("agent")}>
              <option value="">—</option>
              {agents.map((u) => <option key={u.id} value={u.id}>{u.name || u.email}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="status">Statut</label>
          <select id="status" className="field" value={form.status} onChange={set("status")}>
            {STATUS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        </div>

        {(form.status === "effectuee" || form.status === "absence") && (
          <div>
            <label className="label" htmlFor="feedback">Compte-rendu</label>
            <textarea id="feedback" className="field h-24" value={form.feedback} onChange={set("feedback")} />
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className="btn-secondary" onClick={() => navigate(-1)}>Annuler</button>
          <button className="btn-primary" disabled={busy}>
            <Save size={16} aria-hidden />
            {busy ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDelete}
        title="Mettre cette visite à la corbeille ?"
        explanation="Elle pourra être restaurée depuis la corbeille."
        confirmLabel="Mettre à la corbeille"
        danger
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
