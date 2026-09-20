import { useEffect, useState } from "react";
import { useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Save, Search } from "lucide-react";
import { C } from "../../lib/collections";
import { pb, readableError } from "../../lib/pb";
import { createRecord, updateRecord } from "../../lib/repository";
import { buildMoney, findRate } from "../../lib/money";
import { useAuth } from "../../context/AuthContext";
import { useCurrencies } from "../../hooks/useCurrencies";
import { LoadingState } from "../../components/States";

const UNIT_TYPE = ["maison", "villa", "studio", "appartement", "bureau", "boutique",
  "magasin", "parking", "terrain", "local_professionnel", "autre"];
const UNIT_STATUS = ["disponible", "reserve", "en_visite", "dossier_en_cours", "loue",
  "en_preavis", "en_sortie", "en_maintenance", "indisponible", "hors_service"];
const AMENITIES = ["climatisation", "eau_courante", "electricite", "internet",
  "groupe_electrogene", "chauffe_eau", "securite", "ascenseur", "cuisine_equipee"];
const AMENITY_LABELS = {
  climatisation: "Climatisation", eau_courante: "Eau courante", electricite: "Électricité",
  internet: "Internet", groupe_electrogene: "Groupe électrogène", chauffe_eau: "Chauffe-eau",
  securite: "Sécurité", ascenseur: "Ascenseur", cuisine_equipee: "Cuisine équipée",
};
const BOOLEANS = [["balcony", "Balcon"], ["terrace", "Terrasse"], ["parking", "Parking"], ["garden", "Jardin"], ["furnished", "Meublé"]];
const ROOM_FIELDS = [["rooms", "Pièces"], ["bedrooms", "Chambres"], ["living_rooms", "Salons"], ["kitchens", "Cuisines"], ["bathrooms", "Salles de bain"], ["toilets", "Toilettes"]];

const EMPTY = {
  reference: "", name: "", property: "", building: "", owner: "",
  unit_type: "appartement", status: "disponible",
  floor: "", door_number: "", surface_m2: "",
  rooms: "", bedrooms: "", living_rooms: "", kitchens: "", bathrooms: "", toilets: "",
  balcony: false, terrace: false, parking: false, garden: false, furnished: false,
  amenities: [],
  rentAmount: "", rentCurrency: "", rentRate: "",
  description: "",
};

function genReference() {
  return `LOG-${Date.now().toString().slice(-6)}`;
}

export default function UnitForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings } = useAuth();
  const { currencies } = useCurrencies();
  const baseCurrency = settings?.expand?.base_currency;

  const [form, setForm] = useState({
    ...EMPTY,
    property: searchParams.get("propriete") || "",
    building: searchParams.get("immeuble") || "",
  });
  const [properties, setProperties] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rateLookup, setRateLookup] = useState({ busy: false, found: null });

  useEffect(() => {
    pb.collection(C.properties).getFullList({ filter: "deleted != true", sort: "name" }).then(setProperties).catch(() => setProperties([]));
  }, []);

  useEffect(() => {
    if (!form.property) return setBuildings([]);
    pb.collection(C.buildings)
      .getFullList({ filter: `deleted != true && property="${form.property}"`, sort: "name" })
      .then(setBuildings)
      .catch(() => setBuildings([]));
  }, [form.property]);

  // La propriété porte déjà un propriétaire : on le propose par défaut,
  // sans empêcher un cas particulier (indivision, mandat partiel…).
  useEffect(() => {
    if (!form.property || editing) return;
    const p = properties.find((x) => x.id === form.property);
    if (p?.owner) setForm((f) => (f.owner ? f : { ...f, owner: p.owner }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.property, properties]);

  useEffect(() => {
    if (!editing) return;
    let alive = true;
    pb.collection(C.units).getOne(id).then((u) => {
      if (!alive) return;
      setForm({
        reference: u.reference || "", name: u.name || "", property: u.property || "", building: u.building || "",
        owner: u.owner || "", unit_type: u.unit_type || "appartement", status: u.status || "disponible",
        floor: u.floor || "", door_number: u.door_number || "", surface_m2: u.surface_m2 ?? "",
        rooms: u.rooms ?? "", bedrooms: u.bedrooms ?? "", living_rooms: u.living_rooms ?? "",
        kitchens: u.kitchens ?? "", bathrooms: u.bathrooms ?? "", toilets: u.toilets ?? "",
        balcony: !!u.balcony, terrace: !!u.terrace, parking: !!u.parking, garden: !!u.garden, furnished: !!u.furnished,
        amenities: u.amenities || [],
        rentAmount: u.base_rent ?? "", rentCurrency: u.base_rent_currency || "", rentRate: u.base_rent_rate ?? "",
        description: u.description || "",
      });
    }).catch((err) => setError(readableError(err))).finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [editing, id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setNum = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const toggleBool = (k) => () => setForm({ ...form, [k]: !form[k] });
  const toggleAmenity = (a) => () =>
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }));

  const rentCurrencyObj = currencies.find((c) => c.id === form.rentCurrency);
  const needsManualRate = rentCurrencyObj && baseCurrency && rentCurrencyObj.id !== baseCurrency.id;

  const lookupRate = async () => {
    if (!rentCurrencyObj || !baseCurrency) return;
    setRateLookup({ busy: true, found: null });
    try {
      const rate = await findRate(rentCurrencyObj.id, baseCurrency.id);
      if (rate) {
        setForm((f) => ({ ...f, rentRate: rate }));
        setRateLookup({ busy: false, found: true });
      } else {
        setRateLookup({ busy: false, found: false });
      }
    } catch {
      setRateLookup({ busy: false, found: false });
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.property) return setError("Choisissez la propriété de ce logement.");
    if (!form.owner) return setError("Le propriétaire du logement est obligatoire.");
    if (needsManualRate && !form.rentRate) {
      return setError("Le taux de change vers la devise de base n'est pas connu — saisissez-le manuellement.");
    }
    setBusy(true);
    setError("");
    try {
      const money = form.rentAmount !== "" && form.rentCurrency
        ? buildMoney(
            "base_rent",
            Number(form.rentAmount),
            form.rentCurrency,
            rentCurrencyObj?.code,
            baseCurrency?.code,
            Number(form.rentRate) || 1
          )
        : {};
      const payload = {
        reference: form.reference.trim() || genReference(),
        name: form.name, property: form.property, building: form.building || null, owner: form.owner,
        unit_type: form.unit_type, status: form.status,
        floor: form.floor, door_number: form.door_number,
        surface_m2: form.surface_m2 === "" ? null : Number(form.surface_m2),
        ...Object.fromEntries(ROOM_FIELDS.map(([k]) => [k, form[k] === "" ? null : Number(form[k])])),
        balcony: form.balcony, terrace: form.terrace, parking: form.parking, garden: form.garden, furnished: form.furnished,
        amenities: form.amenities,
        description: form.description,
        ...money,
      };
      const record = editing
        ? await updateRecord(C.units, id, payload)
        : await createRecord(C.units, payload);
      navigate(`/logements/${record.id}`);
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
        <h1 className="font-display text-2xl">{editing ? "Modifier le logement" : "Nouveau logement"}</h1>
        <Link to={editing ? `/logements/${id}` : "/logements"} className="btn-secondary">
          <ArrowLeft size={16} aria-hidden />
          Annuler
        </Link>
      </div>

      <form onSubmit={submit} className="card p-6 space-y-6">
        {error && <p className="text-sm text-alert bg-alert-soft rounded-lg px-3 py-2">{error}</p>}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="reference">Référence</label>
            <input id="reference" className="field" placeholder="Générée automatiquement si laissée vide"
              value={form.reference} onChange={set("reference")} />
          </div>
          <div>
            <label className="label" htmlFor="name">Nom (facultatif)</label>
            <input id="name" className="field" value={form.name} onChange={set("name")} />
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className="label" htmlFor="property">Propriété</label>
            <select id="property" className="field" value={form.property}
              onChange={(e) => setForm({ ...form, property: e.target.value, building: "" })} required>
              <option value="">Choisir…</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="building">Immeuble (facultatif)</label>
            <select id="building" className="field" value={form.building} onChange={set("building")} disabled={!form.property}>
              <option value="">Aucun</option>
              {buildings.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="door_number">N° de porte</label>
            <input id="door_number" className="field" value={form.door_number} onChange={set("door_number")} />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="unit_type">Type de logement</label>
            <select id="unit_type" className="field" value={form.unit_type} onChange={set("unit_type")}>
              {UNIT_TYPE.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="status">Statut</label>
            <select id="status" className="field" value={form.status} onChange={set("status")}>
              {UNIT_STATUS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="floor">Étage</label>
            <input id="floor" className="field" value={form.floor} onChange={set("floor")} />
          </div>
          <div>
            <label className="label" htmlFor="surface_m2">Surface (m²)</label>
            <input id="surface_m2" type="number" min="0" step="0.1" className="field" value={form.surface_m2} onChange={set("surface_m2")} />
          </div>
        </div>

        <div>
          <p className="label mb-2">Pièces</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {ROOM_FIELDS.map(([k, l]) => (
              <div key={k}>
                <label className="text-xs text-ink-faint block mb-1" htmlFor={k}>{l}</label>
                <input id={k} type="number" min="0" className="field !h-9 !px-2 text-sm" value={form[k]} onChange={setNum(k)} />
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="label mb-2">Équipements</p>
          <div className="flex flex-wrap gap-2">
            {BOOLEANS.map(([k, l]) => (
              <label key={k} className={`pill cursor-pointer ${form[k] ? "bg-brand text-white" : "bg-surface text-ink-soft"}`}>
                <input type="checkbox" className="hidden" checked={form[k]} onChange={toggleBool(k)} />
                {l}
              </label>
            ))}
            {AMENITIES.map((a) => (
              <label key={a} className={`pill cursor-pointer ${form.amenities.includes(a) ? "bg-brand text-white" : "bg-surface text-ink-soft"}`}>
                <input type="checkbox" className="hidden" checked={form.amenities.includes(a)} onChange={toggleAmenity(a)} />
                {AMENITY_LABELS[a]}
              </label>
            ))}
          </div>
        </div>

        <div>
          <p className="label mb-2">Loyer de base</p>
          <div className="grid sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-xs text-ink-faint block mb-1" htmlFor="rentAmount">Montant</label>
              <input id="rentAmount" type="number" min="0" className="field" value={form.rentAmount} onChange={set("rentAmount")} />
            </div>
            <div>
              <label className="text-xs text-ink-faint block mb-1" htmlFor="rentCurrency">Devise</label>
              <select id="rentCurrency" className="field" value={form.rentCurrency}
                onChange={(e) => setForm({ ...form, rentCurrency: e.target.value, rentRate: "" })}>
                <option value="">—</option>
                {currencies.map((c) => <option key={c.id} value={c.id}>{c.code}</option>)}
              </select>
            </div>
            {needsManualRate && (
              <div>
                <label className="text-xs text-ink-faint block mb-1" htmlFor="rentRate">
                  Taux vers {baseCurrency?.code}
                </label>
                <div className="flex gap-1.5">
                  <input id="rentRate" type="number" min="0" step="any" className="field" value={form.rentRate} onChange={set("rentRate")} />
                  <button type="button" className="btn-secondary !px-2.5 shrink-0" onClick={lookupRate} title="Chercher le taux enregistré">
                    <Search size={14} aria-hidden />
                  </button>
                </div>
                {rateLookup.found === false && (
                  <p className="text-xs text-warn mt-1">Aucun taux enregistré — saisie manuelle nécessaire.</p>
                )}
              </div>
            )}
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
