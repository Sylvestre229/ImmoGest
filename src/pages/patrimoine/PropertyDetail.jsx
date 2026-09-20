import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Building, DoorOpen, MapPin, UserRound } from "lucide-react";
import { pb, readableError } from "../../lib/pb";
import { C } from "../../lib/collections";
import { removeRecord } from "../../lib/repository";
import { useAuth } from "../../context/AuthContext";
import { LoadingState, ErrorState } from "../../components/States";
import ConfirmDialog from "../../components/ConfirmDialog";
import PhotoManager from "../../components/PhotoManager";
import StatusPill from "../../components/StatusPill";
import { humanize } from "../../lib/format";

export default function PropertyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, property: null, buildings: [], units: [] });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.all([
      pb.collection(C.properties).getOne(id, { expand: "owner,portfolio" }),
      pb.collection(C.buildings).getFullList({ filter: `deleted != true && property="${id}"`, sort: "name" }),
      pb.collection(C.units).getFullList({ filter: `deleted != true && property="${id}"`, sort: "reference" }),
    ])
      .then(([property, buildings, units]) => setState({ loading: false, error: null, property, buildings, units }))
      .catch((err) => setState({ loading: false, error: readableError(err), property: null, buildings: [], units: [] }));
  };

  useEffect(load, [id]);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await removeRecord(C.properties, id);
      navigate("/proprietes");
    } catch (err) {
      setState((s) => ({ ...s, error: readableError(err) }));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (state.loading) return <LoadingState />;
  if (state.error) return <ErrorState message={state.error} onRetry={load} />;
  const { property: p, buildings, units } = state;
  const directUnits = units.filter((u) => !u.building);

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/proprietes" className="btn-secondary">
          <ArrowLeft size={16} aria-hidden />
          Propriétés
        </Link>
        <div className="flex gap-2">
          {can("patrimoine.modifier") && (
            <Link to={`/proprietes/${id}/modifier`} className="btn-secondary">
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

      <div className="card p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs text-ink-faint">{p.reference}</p>
            <h1 className="font-display text-2xl">{p.name}</h1>
            <p className="mt-1 text-sm text-ink-soft flex items-center gap-1.5">
              <MapPin size={14} aria-hidden />
              {[p.address, p.district, p.commune, p.city, p.region, p.country].filter(Boolean).join(", ") || "Localisation non renseignée"}
            </p>
            {p.expand?.owner && (
              <Link to={`/proprietaires/${p.owner}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
                <UserRound size={14} aria-hidden />
                {p.expand.owner.full_name}
              </Link>
            )}
          </div>
        </div>

        {p.description && <p className="mt-4 text-sm text-ink-soft whitespace-pre-wrap">{p.description}</p>}

        <div className="mt-5">
          <p className="label mb-2">Photos</p>
          <PhotoManager
            collection={C.properties}
            record={p}
            field="photos"
            editable={can("patrimoine.modifier")}
            onChange={(updated) => setState((s) => ({ ...s, property: { ...s.property, ...updated } }))}
          />
        </div>
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Immeubles</h2>
          {can("patrimoine.creer") && (
            <Link to={`/immeubles/nouveau?propriete=${id}`} className="text-sm text-brand font-medium hover:underline">
              + Ajouter un immeuble
            </Link>
          )}
        </div>
        {buildings.length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint">Aucun immeuble — les logements peuvent aussi être rattachés directement à la propriété.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {buildings.map((b) => (
              <li key={b.id}>
                <Link to={`/immeubles/${b.id}`} className="flex items-center gap-3 py-2.5 hover:text-brand">
                  <Building size={16} className="text-ink-faint" aria-hidden />
                  <span className="text-sm">{b.name}</span>
                  <span className="text-xs text-ink-faint">{b.reference}</span>
                  {b.floors ? <span className="ml-auto text-xs text-ink-faint">{b.floors} étage(s)</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Logements rattachés directement</h2>
          {can("patrimoine.creer") && (
            <Link to={`/logements/nouveau?propriete=${id}`} className="text-sm text-brand font-medium hover:underline">
              + Ajouter un logement
            </Link>
          )}
        </div>
        {directUnits.length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint">Aucun logement rattaché directement à cette propriété.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {directUnits.map((u) => (
              <li key={u.id}>
                <Link to={`/logements/${u.id}`} className="flex items-center gap-3 py-2.5 hover:text-brand">
                  <DoorOpen size={16} className="text-ink-faint" aria-hidden />
                  <span className="text-sm">{u.reference}</span>
                  <span className="text-xs text-ink-faint">{humanize(u.unit_type)}</span>
                  <StatusPill value={u.status} label={undefined} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="Mettre cette propriété à la corbeille ?"
        explanation="Elle pourra être restaurée depuis la corbeille."
        warning={buildings.length || units.length
          ? `${buildings.length} immeuble(s) et ${units.length} logement(s) restent rattachés.`
          : null}
        confirmLabel="Mettre à la corbeille"
        danger
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
