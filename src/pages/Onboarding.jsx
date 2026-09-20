import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, ArrowLeft } from "lucide-react";
import { pb, readableError } from "../lib/pb";
import { C } from "../lib/collections";
import { createRecord, updateRecord } from "../lib/repository";
import { useAuth } from "../context/AuthContext";
import { LoadingState } from "../components/States";

/**
 * §65 — personne n'arrive sur un tableau de bord vide.
 * Chaque étape enregistre pour de bon : l'assistant construit le portefeuille,
 * il ne collecte pas des réponses pour plus tard.
 */

const COUNTRIES = [
  ["BJ", "Bénin"], ["CI", "Côte d'Ivoire"], ["SN", "Sénégal"], ["TG", "Togo"],
  ["BF", "Burkina Faso"], ["ML", "Mali"], ["NE", "Niger"], ["GN", "Guinée"],
  ["CM", "Cameroun"], ["GA", "Gabon"], ["FR", "France"], ["CA", "Canada"],
];

const STEPS = [
  { key: "profil", title: "Votre profil" },
  { key: "pays", title: "Pays et devise" },
  { key: "propriete", title: "Première propriété" },
  { key: "immeuble", title: "Immeuble" },
  { key: "logement", title: "Premier logement" },
  { key: "regles", title: "Règles de relance" },
  { key: "fin", title: "Terminé" },
];

export default function Onboarding() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [currencies, setCurrencies] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [created, setCreated] = useState({});

  const [data, setData] = useState({
    fullName: user?.full_name || "",
    phone: user?.phone || "",
    whatsapp: "",
    country: user?.country || "BJ",
    currencyCode: "XOF",
    companyName: "",
    propertyName: "",
    propertyCity: "",
    propertyAddress: "",
    buildingName: "",
    buildingFloors: 1,
    skipBuilding: false,
    unitReference: "",
    unitType: "appartement",
    unitRooms: 3,
    unitRent: "",
    reminderBefore: 5,
    reminderAfter: 3,
    escalation: 15,
    expiryAlerts: "90,60,30",
  });

  const set = (k) => (e) =>
    setData({ ...data, [k]: e.target.type === "number" ? Number(e.target.value) : e.target.value });

  useEffect(() => {
    pb.collection(C.currencies)
      .getFullList({ filter: "active=true", sort: "-is_base,code" })
      .then(setCurrencies)
      .catch(() => setCurrencies([]));
  }, []);

  // Le locataire n'a pas de patrimoine à configurer : parcours court.
  const steps = user?.role === "locataire"
    ? STEPS.filter((s) => ["profil", "pays", "fin"].includes(s.key))
    : STEPS;
  const current = steps[step];

  const currency = currencies.find((c) => c.code === data.currencyCode);

  async function saveStep() {
    setBusy(true);
    setError(null);
    try {
      if (current.key === "profil") {
        await updateRecord(C.users, user.id, {
          full_name: data.fullName,
          phone: data.phone,
          whatsapp: data.whatsapp,
        });
      }

      if (current.key === "pays") {
        await updateRecord(C.users, user.id, {
          country: data.country,
          preferred_currency: currency?.id || null,
        });
        const existing = await pb.collection(C.settings).getList(1, 1, {
          filter: `owner_user="${user.id}"`,
        });
        const payload = {
          owner_user: user.id,
          company_name: data.companyName,
          country: data.country,
          base_currency: currency?.id || null,
          display_currency: currency?.id || null,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          lease_expiry_alerts: [90, 60, 30],
          onboarding_done: false,
        };
        const settings = existing.items.length
          ? await updateRecord(C.settings, existing.items[0].id, payload)
          : await createRecord(C.settings, payload);
        setCreated((c) => ({ ...c, settings: settings.id }));

        // Un compte propriétaire possède aussi une fiche propriétaire (§7).
        if (user.role === "proprietaire" && !created.owner) {
          const owner = await createRecord(C.owners, {
            user: user.id,
            full_name: data.fullName,
            phone: data.phone,
            whatsapp: data.whatsapp,
            email: user.email,
            country: data.country,
            preferred_currency: currency?.id || null,
          });
          setCreated((c) => ({ ...c, owner: owner.id }));
        }
      }

      if (current.key === "propriete") {
        const property = await createRecord(C.properties, {
          reference: `PROP-${Date.now().toString().slice(-6)}`,
          name: data.propertyName,
          owner: created.owner,
          country: data.country,
          city: data.propertyCity,
          address: data.propertyAddress,
        });
        setCreated((c) => ({ ...c, property: property.id }));
      }

      if (current.key === "immeuble" && !data.skipBuilding) {
        const building = await createRecord(C.buildings, {
          reference: `IMM-${Date.now().toString().slice(-6)}`,
          name: data.buildingName || data.propertyName,
          property: created.property,
          floors: data.buildingFloors,
        });
        setCreated((c) => ({ ...c, building: building.id }));
      }

      if (current.key === "logement") {
        const unit = await createRecord(C.units, {
          reference: data.unitReference || `LOG-${Date.now().toString().slice(-6)}`,
          property: created.property,
          building: created.building || null,
          owner: created.owner,
          unit_type: data.unitType,
          status: "disponible",
          rooms: data.unitRooms,
          base_rent: Number(data.unitRent) || 0,
          base_rent_currency: currency?.id || null,
          base_rent_rate: 1,
          base_rent_base: Number(data.unitRent) || 0,
          base_rent_rate_date: new Date().toISOString(),
        });
        setCreated((c) => ({ ...c, unit: unit.id }));
      }

      if (current.key === "regles") {
        await updateRecord(C.settings, created.settings, {
          reminder_ladder: {
            before_due_days: data.reminderBefore,
            after_due_days: data.reminderAfter,
            escalation_days: data.escalation,
          },
          lease_expiry_alerts: data.expiryAlerts
            .split(",")
            .map((v) => Number(v.trim()))
            .filter(Boolean),
        });
      }

      if (current.key === "fin") {
        await updateRecord(C.users, user.id, { onboarding_done: true });
        if (created.settings) {
          await updateRecord(C.settings, created.settings, { onboarding_done: true });
        }
        await refreshUser();
        return navigate("/", { replace: true });
      }

      setStep((s) => s + 1);
    } catch (err) {
      setError(readableError(err));
    }
    setBusy(false);
  }

  if (!user) return <LoadingState />;

  return (
    <div className="min-h-dvh bg-paper flex flex-col">
      <header className="h-14 flex items-center px-5 border-b border-line">
        <span className="font-display text-lg">GestImmo</span>
      </header>

      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          {/* La progression est une vraie séquence : la numéroter a du sens. */}
          <ol className="flex items-center gap-1.5 mb-8" aria-label="Progression">
            {steps.map((s, i) => (
              <li key={s.key} className="flex-1">
                <div
                  className={`h-1 rounded-full ${
                    i < step ? "bg-brand" : i === step ? "bg-brand/50" : "bg-line"
                  }`}
                />
              </li>
            ))}
          </ol>

          <p className="text-sm text-ink-faint mb-1">
            Étape {step + 1} sur {steps.length}
          </p>
          <h1 className="font-display text-2xl mb-6">{current.title}</h1>

          <div className="card p-6 space-y-4">
            {current.key === "profil" && (
              <>
                <p className="text-sm text-ink-soft">
                  Ces informations apparaîtront sur vos contrats et vos quittances.
                </p>
                <div>
                  <label className="label" htmlFor="fullName">Nom complet</label>
                  <input id="fullName" className="field" value={data.fullName} onChange={set("fullName")} />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="phone">Téléphone</label>
                    <input id="phone" className="field" value={data.phone} onChange={set("phone")} />
                  </div>
                  <div>
                    <label className="label" htmlFor="whatsapp">WhatsApp</label>
                    <input id="whatsapp" className="field" placeholder="Si différent"
                      value={data.whatsapp} onChange={set("whatsapp")} />
                  </div>
                </div>
              </>
            )}

            {current.key === "pays" && (
              <>
                <p className="text-sm text-ink-soft">
                  La devise choisie sert de référence comptable. Chaque bail pourra
                  malgré tout utiliser sa propre devise.
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="country">Pays</label>
                    <select id="country" className="field" value={data.country} onChange={set("country")}>
                      {COUNTRIES.map(([code, label]) => (
                        <option key={code} value={code}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="currency">Devise comptable</label>
                    <select id="currency" className="field" value={data.currencyCode} onChange={set("currencyCode")}>
                      {currencies.map((c) => (
                        <option key={c.id} value={c.code}>{c.code} — {c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {user.role !== "locataire" && (
                  <div>
                    <label className="label" htmlFor="companyName">
                      Nom de la structure <span className="text-ink-faint">(facultatif)</span>
                    </label>
                    <input id="companyName" className="field" value={data.companyName} onChange={set("companyName")} />
                  </div>
                )}
              </>
            )}

            {current.key === "propriete" && (
              <>
                <p className="text-sm text-ink-soft">
                  Une propriété regroupe un ou plusieurs immeubles situés au même endroit.
                </p>
                <div>
                  <label className="label" htmlFor="propertyName">Nom de la propriété</label>
                  <input id="propertyName" className="field" placeholder="Résidence Les Palmiers"
                    value={data.propertyName} onChange={set("propertyName")} />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="propertyCity">Ville</label>
                    <input id="propertyCity" className="field" value={data.propertyCity} onChange={set("propertyCity")} />
                  </div>
                  <div>
                    <label className="label" htmlFor="propertyAddress">Adresse</label>
                    <input id="propertyAddress" className="field" value={data.propertyAddress} onChange={set("propertyAddress")} />
                  </div>
                </div>
              </>
            )}

            {current.key === "immeuble" && (
              <>
                <p className="text-sm text-ink-soft">
                  Pour une maison ou une villa isolée, passez cette étape : le logement
                  sera rattaché directement à la propriété.
                </p>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={data.skipBuilding}
                    onChange={(e) => setData({ ...data, skipBuilding: e.target.checked })} />
                  Ce bien n'est pas dans un immeuble
                </label>
                {!data.skipBuilding && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <label className="label" htmlFor="buildingName">Nom de l'immeuble</label>
                      <input id="buildingName" className="field" value={data.buildingName} onChange={set("buildingName")} />
                    </div>
                    <div>
                      <label className="label" htmlFor="floors">Nombre d'étages</label>
                      <input id="floors" type="number" min={0} className="field num"
                        value={data.buildingFloors} onChange={set("buildingFloors")} />
                    </div>
                  </div>
                )}
              </>
            )}

            {current.key === "logement" && (
              <>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="unitReference">Référence</label>
                    <input id="unitReference" className="field" placeholder="A12"
                      value={data.unitReference} onChange={set("unitReference")} />
                  </div>
                  <div>
                    <label className="label" htmlFor="unitType">Type de bien</label>
                    <select id="unitType" className="field" value={data.unitType} onChange={set("unitType")}>
                      {["appartement", "studio", "maison", "villa", "bureau", "boutique",
                        "magasin", "parking", "terrain", "local_professionnel", "autre"].map((t) => (
                        <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label" htmlFor="unitRooms">Nombre de pièces</label>
                    <input id="unitRooms" type="number" min={0} className="field num"
                      value={data.unitRooms} onChange={set("unitRooms")} />
                  </div>
                  <div>
                    <label className="label" htmlFor="unitRent">
                      Loyer indicatif ({data.currencyCode})
                    </label>
                    <input id="unitRent" type="number" min={0} className="field num"
                      value={data.unitRent} onChange={set("unitRent")} />
                  </div>
                </div>
                <p className="text-sm text-ink-soft">
                  Le logement sera créé avec le statut « Disponible ». Vous pourrez
                  ensuite y associer un candidat puis un bail.
                </p>
              </>
            )}

            {current.key === "regles" && (
              <>
                <p className="text-sm text-ink-soft">
                  Ces délais déclenchent les rappels automatiques. Ils restent
                  modifiables à tout moment dans les paramètres.
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="label" htmlFor="before">Rappel avant échéance</label>
                    <input id="before" type="number" min={0} className="field num"
                      value={data.reminderBefore} onChange={set("reminderBefore")} />
                    <p className="mt-1 text-xs text-ink-faint">en jours</p>
                  </div>
                  <div>
                    <label className="label" htmlFor="after">Relance après retard</label>
                    <input id="after" type="number" min={0} className="field num"
                      value={data.reminderAfter} onChange={set("reminderAfter")} />
                    <p className="mt-1 text-xs text-ink-faint">en jours</p>
                  </div>
                  <div>
                    <label className="label" htmlFor="escalation">Passage au niveau suivant</label>
                    <input id="escalation" type="number" min={0} className="field num"
                      value={data.escalation} onChange={set("escalation")} />
                    <p className="mt-1 text-xs text-ink-faint">en jours</p>
                  </div>
                </div>
                <div>
                  <label className="label" htmlFor="expiry">Alertes d'expiration de bail</label>
                  <input id="expiry" className="field num" value={data.expiryAlerts} onChange={set("expiryAlerts")} />
                  <p className="mt-1 text-xs text-ink-faint">
                    Jours avant la fin du bail, séparés par des virgules.
                  </p>
                </div>
              </>
            )}

            {current.key === "fin" && (
              <div className="text-center py-4">
                <span className="h-12 w-12 rounded-full bg-ok-soft text-ok grid place-items-center mx-auto">
                  <Check size={22} aria-hidden />
                </span>
                <h2 className="mt-4 font-display text-xl">Votre portefeuille est prêt.</h2>
                <p className="mt-2 text-sm text-ink-soft">
                  {user.role === "locataire"
                    ? "Votre propriétaire pourra désormais vous rattacher à un bail."
                    : "Prochaine étape : ajouter un candidat, puis créer le bail."}
                </p>
              </div>
            )}

            {error && (
              <p className="text-sm bg-alert-soft text-alert rounded-lg px-3 py-2" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button
              className="btn-ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || busy}
            >
              <ArrowLeft size={15} aria-hidden /> Précédent
            </button>
            <button className="btn-primary" onClick={saveStep} disabled={busy}>
              {busy ? "Enregistrement…" : current.key === "fin" ? "Ouvrir mon tableau de bord" : "Continuer"}
              {!busy && current.key !== "fin" && <ArrowRight size={15} aria-hidden />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
