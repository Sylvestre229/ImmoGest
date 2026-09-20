import { useEffect, useState } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save } from "lucide-react";
import { C } from "../../lib/collections";
import { pb, readableError } from "../../lib/pb";
import { createRecord, updateRecord } from "../../lib/repository";
import { LoadingState } from "../../components/States";

const EMPTY = {
  reference: "", name: "", owner: "", portfolio: "",
  country: "", region: "", city: "", commune: "", district: "", address: "",
  latitude: "", longitude: "", description: "",
};

function genReference() {
  return `PROP-${Date.now().toString().slice(-6)}`;
}

export default function PropertyForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [form, setForm] = useState({ ...EMPTY, owner: searchParams.get("proprietaire") || "" });
  const [owners, setOwners] = useState([]);
  const [portfolios, setPortfolios] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    pb.collection(C.owners).getFullList({ filter: "deleted != true", sort: "full_name" }).then(setOwners).catch(() => setOwners([]));
  }, []);

  useEffect(() => {
    if (!editing) return;
    let alive = true;
    pb.collection(C.properties).getOne(id).then((p) => {
      if (!alive) return;
      setForm({
        reference: p.reference || "", name: p.name || "", owner: p.owner || "", portfolio: p.portfolio || "",
        country: p.country || "", region: p.region || "", city: p.city || "", commune: p.commune || "",
        district: p.district || "", address: p.address || "",
        latitude: p.latitude ?? "", longitude: p.longitude ?? "", description: p.description || "",
      });
    }).catch((err) => setError(readableError(err))).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [editing, id]);

  useEffect(() => {
    if (!form.owner) return setPortfolios([]);
    pb.collection(C.portfolios)
      .getFullList({ filter: `deleted != true && owner="${form.owner}"`, sort: "name" })
      .then(setPortfolios)
      .catch(() => setPortfolios([]));
  }, [form.owner]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setError("Le nom de la propriété est obligatoire.");
    if (!form.owner) return setError("Choisissez le propriétaire de ce bien.");
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...form,
        reference: form.reference.trim() || genReference(),
        portfolio: form.portfolio || null,
        latitude: form.latitude === "" ? null : Number(form.latitude),
        longitude: form.longitude === "" ? null : Number(form.longitude),
      };
      const record = editing
        ? await updateRecord(C.properties, id, payload)
        : await createRecord(C.properties, payload);
      navigate(`/proprietes/${record.id}`);
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
        <h1 className="font-display text-2xl">{editing ? "Modifier la propriété" : "Nouvelle propriété"}</h1>
        <Link to={editing ? `/proprietes/${id}` : "/proprietes"} className="btn-secondary">
          <ArrowLeft size={16} aria-hidden />
          Annuler
        </Link>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-5">
        {error && <p className="text-sm text-alert bg-alert-soft rounded-lg px-3 py-2">{error}</p>}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="name">Nom de la propriété</label>
            <input id="name" className="field" value={form.name} onChange={set("name")} required />
          </div>
          <div>
            <label className="label" htmlFor="reference">Référence</label>
            <input id="reference" className="field" placeholder="Générée automatiquement si laissée vide"
              value={form.reference} onChange={set("reference")} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="owner">Propriétaire</label>
            <select id="owner" className="field" value={form.owner} onChange={set("owner")} required>
              <option value="">Choisir…</option>
              {owners.map((o) => <option key={o.id} value={o.id}>{o.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="portfolio">Portefeuille</label>
            <select id="portfolio" className="field" value={form.portfolio} onChange={set("portfolio")}
              disabled={!form.owner}>
              <option value="">Aucun (bien géré directement)</option>
              {portfolios.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="country">Pays</label>
            <input id="country" className="field" value={form.country} onChange={set("country")} />
          </div>
          <div>
            <label className="label" htmlFor="region">Région</label>
            <input id="region" className="field" value={form.region} onChange={set("region")} />
          </div>
          <div>
            <label className="label" htmlFor="city">Ville</label>
            <input id="city" className="field" value={form.city} onChange={set("city")} />
          </div>
          <div>
            <label className="label" htmlFor="commune">Commune</label>
            <input id="commune" className="field" value={form.commune} onChange={set("commune")} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="district">Quartier</label>
            <input id="district" className="field" value={form.district} onChange={set("district")} />
          </div>
          <div>
            <label className="label" htmlFor="address">Adresse</label>
            <input id="address" className="field" value={form.address} onChange={set("address")} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="latitude">Latitude</label>
            <input id="latitude" type="number" step="any" className="field" value={form.latitude} onChange={set("latitude")} />
          </div>
          <div>
            <label className="label" htmlFor="longitude">Longitude</label>
            <input id="longitude" type="number" step="any" className="field" value={form.longitude} onChange={set("longitude")} />
          </div>
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
