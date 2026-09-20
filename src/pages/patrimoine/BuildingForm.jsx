import { useEffect, useState } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { C } from "../../lib/collections";
import { pb, readableError } from "../../lib/pb";
import { createRecord, updateRecord } from "../../lib/repository";
import { LoadingState } from "../../components/States";

const EMPTY = { reference: "", name: "", property: "", floors: "", units_count: "", address: "", description: "" };

function genReference() {
  return `IMM-${Date.now().toString().slice(-6)}`;
}

export default function BuildingForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({ ...EMPTY, property: searchParams.get("propriete") || "" });
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    pb.collection(C.properties).getFullList({ filter: "deleted != true", sort: "name" }).then(setProperties).catch(() => setProperties([]));
  }, []);

  useEffect(() => {
    if (!editing) return;
    let alive = true;
    pb.collection(C.buildings).getOne(id).then((b) => {
      if (!alive) return;
      setForm({
        reference: b.reference || "", name: b.name || "", property: b.property || "",
        floors: b.floors ?? "", units_count: b.units_count ?? "", address: b.address || "",
        description: b.description || "",
      });
    }).catch((err) => setError(readableError(err))).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [editing, id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Le nom de l'immeuble est obligatoire.");
    if (!form.property) return setError("Choisissez la propriété à laquelle cet immeuble appartient.");
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...form,
        reference: form.reference.trim() || genReference(),
        floors: form.floors === "" ? null : Number(form.floors),
        units_count: form.units_count === "" ? null : Number(form.units_count),
      };
      const record = editing
        ? await updateRecord(C.buildings, id, payload)
        : await createRecord(C.buildings, payload);
      navigate(`/immeubles/${record.id}`);
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
        <h1 className="font-display text-2xl">{editing ? "Modifier l'immeuble" : "Nouvel immeuble"}</h1>
        <Link to={editing ? `/immeubles/${id}` : "/immeubles"} className="btn-secondary">
          <ArrowLeft size={16} aria-hidden />
          Annuler
        </Link>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-5">
        {error && <p className="text-sm text-alert bg-alert-soft rounded-lg px-3 py-2">{error}</p>}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="name">Nom de l'immeuble</label>
            <input id="name" className="field" value={form.name} onChange={set("name")} required />
          </div>
          <div>
            <label className="label" htmlFor="reference">Référence</label>
            <input id="reference" className="field" placeholder="Générée automatiquement si laissée vide"
              value={form.reference} onChange={set("reference")} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="property">Propriété</label>
          <select id="property" className="field" value={form.property} onChange={set("property")} required>
            <option value="">Choisir…</option>
            {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="floors">Nombre d'étages</label>
            <input id="floors" type="number" min="0" className="field" value={form.floors} onChange={set("floors")} />
          </div>
          <div>
            <label className="label" htmlFor="units_count">Nombre de logements (indicatif)</label>
            <input id="units_count" type="number" min="0" className="field" value={form.units_count} onChange={set("units_count")} />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="address">Adresse</label>
          <input id="address" className="field" value={form.address} onChange={set("address")} />
        </div>

        <div>
          <label className="label" htmlFor="description">Description</label>
          <textarea id="description" className="field h-28" value={form.description} onChange={set("description")} />
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
