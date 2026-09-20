import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Trash2, DoorOpen, CalendarPlus, UserPlus } from "lucide-react";
import { pb, readableError } from "../../lib/pb";
import { C } from "../../lib/collections";
import { removeRecord, updateRecord, createRecord } from "../../lib/repository";
import { useAuth } from "../../context/AuthContext";
import { formatDate, formatDateTime, humanize } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/States";
import ConfirmDialog from "../../components/ConfirmDialog";
import StatusPill from "../../components/StatusPill";

const STATUS = ["nouveau", "contacte", "visite_programmee", "visite_effectuee",
  "dossier_incomplet", "dossier_complet", "en_etude", "accepte", "refuse",
  "bail_en_preparation", "bail_signe"];

function splitName(full) {
  const parts = full.trim().split(/\s+/);
  return { first_name: parts[0] || full, last_name: parts.slice(1).join(" ") || "—" };
}

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, application: null, visits: [] });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusBusy, setStatusBusy] = useState(false);
  const [converting, setConverting] = useState(false);

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.all([
      pb.collection(C.applications).getOne(id, { expand: "unit,tenant" }),
      pb.collection(C.visits).getFullList({ filter: `application="${id}"`, sort: "-scheduled_at" }).catch(() => []),
    ])
      .then(([application, visits]) => setState({ loading: false, error: null, application, visits }))
      .catch((err) => setState({ loading: false, error: readableError(err), application: null, visits: [] }));
  };

  useEffect(load, [id]);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await removeRecord(C.applications, id);
      navigate("/candidatures");
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
      const updated = await updateRecord(C.applications, id, {
        status,
        decision_at: ["accepte", "refuse"].includes(status) ? new Date().toISOString().slice(0, 10) : state.application.decision_at,
      });
      setState((s) => ({ ...s, application: { ...s.application, ...updated } }));
    } catch (err) {
      setState((s) => ({ ...s, error: readableError(err) }));
    } finally {
      setStatusBusy(false);
    }
  };

  const convertToTenant = async () => {
    setConverting(true);
    try {
      const { first_name, last_name } = splitName(state.application.candidate_name);
      const tenant = await createRecord(C.tenants, {
        first_name, last_name,
        phone: state.application.candidate_phone || "",
        email: state.application.candidate_email || "",
        profession: state.application.profession || "",
      });
      await updateRecord(C.applications, id, { tenant: tenant.id });
      navigate(`/locataires/${tenant.id}/modifier`);
    } catch (err) {
      setState((s) => ({ ...s, error: readableError(err) }));
      setConverting(false);
    }
  };

  if (state.loading) return <LoadingState />;
  if (state.error) return <ErrorState message={state.error} onRetry={load} />;
  const { application: a, visits } = state;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/candidatures" className="btn-secondary">
          <ArrowLeft size={16} aria-hidden />
          Candidatures
        </Link>
        <div className="flex gap-2">
          {can("candidatures.modifier") && (
            <Link to={`/candidatures/${id}/modifier`} className="btn-secondary">
              <Pencil size={16} aria-hidden />
              Modifier
            </Link>
          )}
          {can("candidatures.supprimer") && (
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
            <h1 className="font-display text-2xl">{a.candidate_name}</h1>
            <p className="text-sm text-ink-soft mt-1">
              {[a.candidate_phone, a.candidate_email].filter(Boolean).join(" · ") || "Aucun contact renseigné"}
            </p>
            {a.expand?.unit && (
              <Link to={`/logements/${a.unit}`} className="mt-1 inline-flex items-center gap-1.5 text-sm text-brand hover:underline">
                <DoorOpen size={14} aria-hidden />
                {a.expand.unit.reference}
              </Link>
            )}
          </div>
          {can("candidatures.modifier") ? (
            <select className="field !h-8 !py-0 text-sm w-auto" value={a.status} disabled={statusBusy}
              onChange={(e) => changeStatus(e.target.value)} aria-label="Changer le statut">
              {STATUS.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
            </select>
          ) : (
            <StatusPill value={a.status} label={humanize(a.status)} />
          )}
        </div>

        <dl className="mt-4 grid sm:grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between"><dt className="text-ink-faint">Profession</dt><dd>{a.profession || "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-faint">Revenu déclaré</dt><dd className="num">{a.declared_income || "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-faint">Reçue le</dt><dd>{formatDate(a.received_at)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-faint">Décision le</dt><dd>{formatDate(a.decision_at)}</dd></div>
        </dl>

        {a.notes && <p className="mt-4 text-sm text-ink-soft whitespace-pre-wrap">{a.notes}</p>}

        <div className="mt-5 flex flex-wrap gap-2">
          {can("visites.creer") && (
            <Link to={`/visites/nouvelle?candidature=${id}&logement=${a.unit}`} className="btn-secondary">
              <CalendarPlus size={16} aria-hidden />
              Programmer une visite
            </Link>
          )}
          {can("locataires.creer") && !a.tenant && a.status === "accepte" && (
            <button className="btn-primary" onClick={convertToTenant} disabled={converting}>
              <UserPlus size={16} aria-hidden />
              {converting ? "Création…" : "Créer le dossier locataire"}
            </button>
          )}
          {a.expand?.tenant && (
            <Link to={`/locataires/${a.tenant}`} className="btn-secondary">
              Voir le dossier locataire
            </Link>
          )}
        </div>
      </div>

      {visits.length > 0 && (
        <section className="card p-5">
          <h2 className="font-display text-lg">Visites liées</h2>
          <ul className="mt-3 divide-y divide-line">
            {visits.map((v) => (
              <li key={v.id} className="py-2.5 flex items-center gap-3 text-sm">
                <span>{formatDateTime(v.scheduled_at)}</span>
                <span className="ml-auto"><StatusPill value={v.status} label={humanize(v.status)} /></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Mettre cette candidature à la corbeille ?"
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
