import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, DoorOpen, Building2 } from "lucide-react";
import { pb, readableError } from "../../lib/pb";
import { C } from "../../lib/collections";
import { removeRecord } from "../../lib/repository";
import { useAuth } from "../../context/AuthContext";
import { LoadingState, ErrorState } from "../../components/States";
import ConfirmDialog from "../../components/ConfirmDialog";
import PhotoManager from "../../components/PhotoManager";
import StatusPill from "../../components/StatusPill";
import { humanize } from "../../lib/format";

export default function BuildingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, building: null, units: [] });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.all([
      pb.collection(C.buildings).getOne(id, { expand: "property,property.owner" }),
      pb.collection(C.units).getFullList({ filter: `deleted != true && building="${id}"`, sort: "reference" }),
    ])
      .then(([building, units]) => setState({ loading: false, error: null, building, units }))
      .catch((err) => setState({ loading: false, error: readableError(err), building: null, units: [] }));
  };

  useEffect(load, [id]);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await removeRecord(C.buildings, id);
      navigate("/immeubles");
    } catch (err) {
      setState((s) => ({ ...s, error: readableError(err) }));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (state.loading) return <LoadingState />;
  if (state.error) return <ErrorState message={state.error} onRetry={load} />;
  const { building: b, units } = state;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/immeubles" className="btn-secondary">
          <ArrowLeft size={16} aria-hidden />
          Immeubles
        </Link>
        <div className="flex gap-2">
          {can("patrimoine.modifier") && (
            <Link to={`/immeubles/${id}/modifier`} className="btn-secondary">
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
        <p className="text-xs text-ink-faint">{b.reference}</p>
        <h1 className="font-display text-2xl">{b.name}</h1>
        {b.expand?.property && (
          <Link to={`/proprietes/${b.property}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
            <Building2 size={14} aria-hidden />
            {b.expand.property.name}
          </Link>
        )}
        <div className="mt-3 flex gap-6 text-sm text-ink-soft">
          {b.floors ? <span>{b.floors} étage(s)</span> : null}
          <span>{units.length} logement(s) enregistré(s)</span>
        </div>
        {b.address && <p className="mt-2 text-sm text-ink-soft">{b.address}</p>}
        {b.description && <p className="mt-3 text-sm text-ink-soft whitespace-pre-wrap">{b.description}</p>}

        <div className="mt-5">
          <p className="label mb-2">Photos</p>
          <PhotoManager
            collection={C.buildings}
            record={b}
            field="photos"
            editable={can("patrimoine.modifier")}
            onChange={(updated) => setState((s) => ({ ...s, building: { ...s.building, ...updated } }))}
          />
        </div>
      </div>

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Logements</h2>
          {can("patrimoine.creer") && (
            <Link to={`/logements/nouveau?immeuble=${id}&propriete=${b.property}`} className="text-sm text-brand font-medium hover:underline">
              + Ajouter un logement
            </Link>
          )}
        </div>
        {units.length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint">Aucun logement enregistré dans cet immeuble.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {units.map((u) => (
              <li key={u.id}>
                <Link to={`/logements/${u.id}`} className="flex items-center gap-3 py-2.5 hover:text-brand">
                  <DoorOpen size={16} className="text-ink-faint" aria-hidden />
                  <span className="text-sm">{u.reference}</span>
                  <span className="text-xs text-ink-faint">{humanize(u.unit_type)}</span>
                  <span className="ml-auto"><StatusPill value={u.status} /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="Mettre cet immeuble à la corbeille ?"
        explanation="Il pourra être restauré depuis la corbeille."
        warning={units.length ? `${units.length} logement(s) restent rattachés à cet immeuble.` : null}
        confirmLabel="Mettre à la corbeille"
        danger
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
