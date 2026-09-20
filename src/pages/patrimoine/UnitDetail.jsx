import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Pencil, Trash2, Building2, Building, UserRound,
  Ruler, BedDouble, History, Users,
} from "lucide-react";
import { pb, readableError } from "../../lib/pb";
import { C } from "../../lib/collections";
import { removeRecord, updateRecord } from "../../lib/repository";
import { useAuth } from "../../context/AuthContext";
import { formatMoney } from "../../lib/money";
import { formatDate, formatDateTime, humanize } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/States";
import ConfirmDialog from "../../components/ConfirmDialog";
import PhotoManager from "../../components/PhotoManager";
import StatusPill, { toneFor } from "../../components/StatusPill";

const UNIT_STATUS = ["disponible", "reserve", "en_visite", "dossier_en_cours", "loue",
  "en_preavis", "en_sortie", "en_maintenance", "indisponible", "hors_service"];

const AMENITY_LABELS = {
  climatisation: "Climatisation", eau_courante: "Eau courante", electricite: "Électricité",
  internet: "Internet", groupe_electrogene: "Groupe électrogène", chauffe_eau: "Chauffe-eau",
  securite: "Sécurité", ascenseur: "Ascenseur", cuisine_equipee: "Cuisine équipée",
};
const BOOLEAN_LABELS = { balcony: "Balcon", terrace: "Terrasse", parking: "Parking", garden: "Jardin", furnished: "Meublé" };
const ROOM_FIELDS = [["rooms", "Pièces"], ["bedrooms", "Chambres"], ["living_rooms", "Salons"], ["kitchens", "Cuisines"], ["bathrooms", "Salles de bain"], ["toilets", "Toilettes"]];

const ACTION_LABELS = {
  create: "Créé", update: "Modifié", delete: "Mis à la corbeille", restore: "Restauré", purge: "Supprimé définitivement",
};

export default function UnitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, unit: null, leases: [], history: [] });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.all([
      pb.collection(C.units).getOne(id, { expand: "property,building,owner,base_rent_currency" }),
      pb.collection(C.leases).getFullList({ filter: `unit="${id}"`, sort: "-start_date", expand: "tenant" }).catch(() => []),
      pb.collection(C.auditLogs).getList(1, 20, { filter: `collection_name="${C.units}" && record_id="${id}"`, sort: "-created" }).catch(() => ({ items: [] })),
    ])
      .then(([unit, leases, historyRes]) =>
        setState({ loading: false, error: null, unit, leases, history: historyRes.items }))
      .catch((err) => setState({ loading: false, error: readableError(err), unit: null, leases: [], history: [] }));
  };

  useEffect(load, [id]);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await removeRecord(C.units, id);
      navigate("/logements");
    } catch (err) {
      setState((s) => ({ ...s, error: readableError(err) }));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  const changeStatus = async (status) => {
    setStatusBusy(true);
    try {
      const updated = await updateRecord(C.units, id, { status });
      setState((s) => ({ ...s, unit: { ...s.unit, ...updated } }));
      load(); // rafraîchit aussi la timeline
    } catch (err) {
      setState((s) => ({ ...s, error: readableError(err) }));
    } finally {
      setStatusBusy(false);
    }
  };

  if (state.loading) return <LoadingState />;
  if (state.error) return <ErrorState message={state.error} onRetry={load} />;
  const { unit: u, leases, history } = state;
  const tone = toneFor(u.status);
  const border = { ok: "border-l-ok", warn: "border-l-warn", alert: "border-l-alert", info: "border-l-line" }[tone];

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/logements" className="btn-secondary">
          <ArrowLeft size={16} aria-hidden />
          Logements
        </Link>
        <div className="flex gap-2">
          {can("patrimoine.modifier") && (
            <Link to={`/logements/${id}/modifier`} className="btn-secondary">
              <Pencil size={16} aria-hidden />
              Modifier
            </Link>
          )}
          {can("patrimoine.supprimer") && (
            <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} aria-hidden />
              Mettre à la corbeille
            </button>
          )}
        </div>
      </div>

      <div className={`card border-l-2 ${border} p-6`}>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-ink-faint">{u.reference}</p>
            <h1 className="font-display text-2xl">
              {u.name || humanize(u.unit_type)}
              {u.door_number ? ` · Porte ${u.door_number}` : ""}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-soft">
              {u.expand?.building && (
                <Link to={`/immeubles/${u.building}`} className="flex items-center gap-1.5 hover:text-brand">
                  <Building size={14} aria-hidden />
                  {u.expand.building.name}
                </Link>
              )}
              {u.expand?.property && (
                <Link to={`/proprietes/${u.property}`} className="flex items-center gap-1.5 hover:text-brand">
                  <Building2 size={14} aria-hidden />
                  {u.expand.property.name}
                </Link>
              )}
              {u.expand?.owner && (
                <Link to={`/proprietaires/${u.owner}`} className="flex items-center gap-1.5 hover:text-brand">
                  <UserRound size={14} aria-hidden />
                  {u.expand.owner.full_name}
                </Link>
              )}
            </div>
          </div>

          <div className="text-right">
            {can("patrimoine.modifier") ? (
              <select
                className="field !h-8 !py-0 text-sm w-auto"
                value={u.status}
                disabled={statusBusy}
                onChange={(e) => changeStatus(e.target.value)}
                aria-label="Changer le statut"
              >
                {UNIT_STATUS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
              </select>
            ) : (
              <StatusPill value={u.status} />
            )}
            {u.base_rent ? (
              <p className="mt-2 font-display text-xl num">
                {formatMoney(u.base_rent, u.expand?.base_rent_currency?.code || "XOF")}
                <span className="text-sm text-ink-faint font-sans"> / période</span>
              </p>
            ) : null}
          </div>
        </div>

        {u.description && <p className="mt-4 text-sm text-ink-soft whitespace-pre-wrap">{u.description}</p>}

        <div className="mt-5">
          <p className="label mb-2">Photos</p>
          <PhotoManager
            collection={C.units}
            record={u}
            field="photos"
            editable={can("patrimoine.modifier")}
            onChange={(updated) => setState((s) => ({ ...s, unit: { ...s.unit, ...updated } }))}
          />
        </div>
      </div>

      <section className="card p-5">
        <h2 className="font-display text-lg flex items-center gap-2">
          <Ruler size={17} className="text-ink-faint" aria-hidden />
          Caractéristiques
        </h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <p className="text-ink-faint text-xs">Type</p>
            <p>{humanize(u.unit_type)}</p>
          </div>
          <div>
            <p className="text-ink-faint text-xs">Surface</p>
            <p className="num">{u.surface_m2 ? `${u.surface_m2} m²` : "—"}</p>
          </div>
          <div>
            <p className="text-ink-faint text-xs">Étage</p>
            <p>{u.floor || "—"}</p>
          </div>
          {ROOM_FIELDS.filter(([k]) => u[k]).map(([k, l]) => (
            <div key={k}>
              <p className="text-ink-faint text-xs">{l}</p>
              <p className="num">{u[k]}</p>
            </div>
          ))}
        </div>

        {(Object.keys(BOOLEAN_LABELS).some((k) => u[k]) || u.amenities?.length > 0) && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <BedDouble size={15} className="text-ink-faint" aria-hidden />
            {Object.entries(BOOLEAN_LABELS).filter(([k]) => u[k]).map(([k, l]) => (
              <span key={k} className="pill-info">{l}</span>
            ))}
            {(u.amenities || []).map((a) => (
              <span key={a} className="pill-info">{AMENITY_LABELS[a] || humanize(a)}</span>
            ))}
          </div>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-display text-lg flex items-center gap-2">
          <Users size={17} className="text-ink-faint" aria-hidden />
          Historique des occupants
        </h2>
        {leases.length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint">
            Aucun bail enregistré pour ce logement — la gestion des baux arrive en phase 5.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {leases.map((l) => (
              <li key={l.id} className="py-2.5 flex items-center gap-3 text-sm">
                <span className="min-w-0 truncate">
                  {l.expand?.tenant ? `${l.expand.tenant.first_name} ${l.expand.tenant.last_name}` : "Locataire"}
                </span>
                <span className="text-xs text-ink-faint">
                  {formatDate(l.start_date)} → {l.end_date ? formatDate(l.end_date) : "en cours"}
                </span>
                <span className="ml-auto"><StatusPill value={l.status} /></span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-display text-lg flex items-center gap-2">
          <History size={17} className="text-ink-faint" aria-hidden />
          Vie du bien
        </h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint">Aucun événement enregistré pour l'instant.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {history.map((h) => (
              <li key={h.id} className="text-sm">
                <div className="flex items-baseline gap-2">
                  <span className="font-medium">{ACTION_LABELS[h.action] || humanize(h.action)}</span>
                  <span className="text-ink-faint">par {h.user_label}</span>
                  <time className="ml-auto text-xs text-ink-faint num" dateTime={h.created}>
                    {formatDateTime(h.created)}
                  </time>
                </div>
                {h.after && Object.keys(h.after).length > 0 && (
                  <p className="text-xs text-ink-faint mt-0.5">
                    {Object.keys(h.after).map(humanize).join(", ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="Mettre ce logement à la corbeille ?"
        explanation="Il pourra être restauré depuis la corbeille. Cette action est enregistrée dans le journal d'audit."
        confirmLabel="Mettre à la corbeille"
        danger
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
