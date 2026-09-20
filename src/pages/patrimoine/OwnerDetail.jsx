import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, Building2, Phone, Mail, MapPin } from "lucide-react";
import { pb, readableError } from "../../lib/pb";
import { C } from "../../lib/collections";
import { removeRecord } from "../../lib/repository";
import { useAuth } from "../../context/AuthContext";
import { formatDate, humanize } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/States";
import ConfirmDialog from "../../components/ConfirmDialog";
import PhotoManager from "../../components/PhotoManager";

export default function OwnerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, owner: null, properties: [] });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.all([
      pb.collection(C.owners).getOne(id, { expand: "preferred_currency" }),
      pb.collection(C.properties).getFullList({ filter: `deleted != true && owner="${id}"`, sort: "name" }),
    ])
      .then(([owner, properties]) => setState({ loading: false, error: null, owner, properties }))
      .catch((err) => setState({ loading: false, error: readableError(err), owner: null, properties: [] }));
  };

  useEffect(load, [id]);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await removeRecord(C.owners, id);
      navigate("/proprietaires");
    } catch (err) {
      setState((s) => ({ ...s, error: readableError(err) }));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (state.loading) return <LoadingState />;
  if (state.error) return <ErrorState message={state.error} onRetry={load} />;
  const { owner, properties } = state;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/proprietaires" className="btn-secondary">
          <ArrowLeft size={16} aria-hidden />
          Propriétaires
        </Link>
        <div className="flex gap-2">
          {can("proprietaires.modifier") && (
            <Link to={`/proprietaires/${id}/modifier`} className="btn-secondary">
              <Pencil size={16} aria-hidden />
              Modifier
            </Link>
          )}
          {can("proprietaires.supprimer") && (
            <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} aria-hidden />
              Mettre à la corbeille
            </button>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-28 shrink-0">
            <PhotoManager
              collection={C.owners}
              record={owner}
              field="photo"
              multiple={false}
              editable={can("proprietaires.modifier")}
              onChange={(updated) => setState((s) => ({ ...s, owner: updated }))}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl">{owner.full_name}</h1>
            <div className="mt-2 space-y-1 text-sm text-ink-soft">
              {owner.phone && (
                <p className="flex items-center gap-2"><Phone size={14} aria-hidden />{owner.phone}</p>
              )}
              {owner.email && (
                <p className="flex items-center gap-2"><Mail size={14} aria-hidden />{owner.email}</p>
              )}
              {owner.address && (
                <p className="flex items-center gap-2"><MapPin size={14} aria-hidden />{owner.address}{owner.country ? `, ${owner.country}` : ""}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <section className="card p-5">
          <h2 className="font-display text-lg">Mandat de gestion</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-faint">Commission</dt>
              <dd className="num">{owner.commission_rate != null ? `${owner.commission_rate} %` : "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-faint">Début</dt>
              <dd>{formatDate(owner.management_start)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-faint">Fin</dt>
              <dd>{formatDate(owner.management_end)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-faint">Devise préférée</dt>
              <dd>{owner.expand?.preferred_currency?.code || "—"}</dd>
            </div>
          </dl>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-lg">Pièce d'identité</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-faint">Type</dt>
              <dd>{owner.id_document_type ? humanize(owner.id_document_type) : "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-faint">Numéro</dt>
              <dd>{owner.id_document_number || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-faint">Expiration</dt>
              <dd>{formatDate(owner.id_document_expiry)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section className="card p-5">
        <h2 className="font-display text-lg">Relevé de gestion</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Le détail des commissions et des reversements dépend de la comptabilité
          (encaissements, charges), livrée en phase 11. Cette section affichera
          alors les montants réels — elle ne montre rien tant qu'il n'y a rien à
          calculer.
        </p>
      </section>

      {owner.notes && (
        <section className="card p-5">
          <h2 className="font-display text-lg">Notes</h2>
          <p className="mt-2 text-sm text-ink-soft whitespace-pre-wrap">{owner.notes}</p>
        </section>
      )}

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Propriétés</h2>
          {can("patrimoine.creer") && (
            <Link to="/proprietes/nouveau" className="text-sm text-brand font-medium hover:underline">
              + Ajouter une propriété
            </Link>
          )}
        </div>
        {properties.length === 0 ? (
          <p className="mt-3 text-sm text-ink-faint">Aucune propriété rattachée à ce propriétaire.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {properties.map((p) => (
              <li key={p.id}>
                <Link to={`/proprietes/${p.id}`} className="flex items-center gap-3 py-2.5 hover:text-brand">
                  <Building2 size={16} className="text-ink-faint" aria-hidden />
                  <span className="text-sm">{p.name}</span>
                  <span className="text-xs text-ink-faint">{p.reference}</span>
                  <span className="ml-auto text-xs text-ink-faint">{[p.city, p.country].filter(Boolean).join(", ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title="Mettre ce propriétaire à la corbeille ?"
        explanation="Il pourra être restauré depuis la corbeille. Les propriétés déjà rattachées ne sont pas supprimées."
        warning={properties.length > 0 ? `${properties.length} propriété(s) restent rattachées à ce propriétaire.` : null}
        confirmLabel="Mettre à la corbeille"
        danger
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
