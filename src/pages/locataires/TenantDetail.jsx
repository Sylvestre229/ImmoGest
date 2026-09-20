import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Pencil, Trash2, Phone, Mail, MapPin, FileText, Users, History, FolderOpen,
} from "lucide-react";
import { pb, readableError } from "../../lib/pb";
import { C } from "../../lib/collections";
import { removeRecord } from "../../lib/repository";
import { useAuth } from "../../context/AuthContext";
import { fullName, formatDate, formatDateTime, humanize } from "../../lib/format";
import { LoadingState, ErrorState } from "../../components/States";
import ConfirmDialog from "../../components/ConfirmDialog";
import PhotoManager from "../../components/PhotoManager";
import GuarantorPanel from "../../components/GuarantorPanel";
import StatusPill from "../../components/StatusPill";

const TABS = [
  ["profil", "Profil"],
  ["garants", "Garants"],
  ["baux", "Baux"],
  ["documents", "Documents"],
  ["historique", "Historique"],
];

const ACTION_LABELS = {
  create: "Créé", update: "Modifié", delete: "Mis à la corbeille", restore: "Restauré", purge: "Supprimé définitivement",
};

export default function TenantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useAuth();
  const [tab, setTab] = useState("profil");
  const [state, setState] = useState({ loading: true, error: null, tenant: null, leases: [], history: [] });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    Promise.all([
      pb.collection(C.tenants).getOne(id),
      pb.collection(C.leases).getFullList({ filter: `tenant="${id}"`, sort: "-start_date", expand: "unit" }).catch(() => []),
      pb.collection(C.auditLogs).getList(1, 20, { filter: `collection_name="${C.tenants}" && record_id="${id}"`, sort: "-created" }).catch(() => ({ items: [] })),
    ])
      .then(([tenant, leases, historyRes]) => setState({ loading: false, error: null, tenant, leases, history: historyRes.items }))
      .catch((err) => setState({ loading: false, error: readableError(err), tenant: null, leases: [], history: [] }));
  };

  useEffect(load, [id]);

  const doDelete = async () => {
    setDeleting(true);
    try {
      await removeRecord(C.tenants, id);
      navigate("/locataires");
    } catch (err) {
      setState((s) => ({ ...s, error: readableError(err) }));
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  };

  if (state.loading) return <LoadingState />;
  if (state.error) return <ErrorState message={state.error} onRetry={load} />;
  const { tenant: t, leases, history } = state;

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link to="/locataires" className="btn-secondary">
          <ArrowLeft size={16} aria-hidden />
          Locataires
        </Link>
        <div className="flex gap-2">
          {can("locataires.modifier") && (
            <Link to={`/locataires/${id}/modifier`} className="btn-secondary">
              <Pencil size={16} aria-hidden />
              Modifier
            </Link>
          )}
          {can("locataires.supprimer") && (
            <button className="btn-danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={16} aria-hidden />
              Mettre à la corbeille
            </button>
          )}
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-start gap-5 flex-wrap">
          <div className="w-24 shrink-0">
            <PhotoManager
              collection={C.tenants}
              record={t}
              field="photo"
              multiple={false}
              editable={can("locataires.modifier")}
              onChange={(updated) => setState((s) => ({ ...s, tenant: updated }))}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl">{fullName(t)}</h1>
            {t.profession && <p className="text-sm text-ink-soft">{t.profession}{t.employer ? ` — ${t.employer}` : ""}</p>}
            <div className="mt-2 space-y-1 text-sm text-ink-soft">
              {t.phone && <p className="flex items-center gap-2"><Phone size={14} aria-hidden />{t.phone}</p>}
              {t.email && <p className="flex items-center gap-2"><Mail size={14} aria-hidden />{t.email}</p>}
              {t.address && <p className="flex items-center gap-2"><MapPin size={14} aria-hidden />{t.address}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-1 border-b border-line overflow-x-auto" role="tablist">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`px-3 h-10 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === key ? "border-brand text-brand font-medium" : "border-transparent text-ink-faint hover:text-ink"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "profil" && (
        <div className="grid sm:grid-cols-2 gap-4">
          <section className="card p-5">
            <h2 className="font-display text-lg">Informations personnelles</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-faint">Genre</dt><dd>{humanize(t.gender) || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-faint">Date de naissance</dt><dd>{formatDate(t.birth_date)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-faint">Nationalité</dt><dd>{t.nationality || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-faint">WhatsApp</dt><dd>{t.whatsapp || "—"}</dd></div>
            </dl>
          </section>
          <section className="card p-5">
            <h2 className="font-display text-lg">Contact d'urgence</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-faint">Nom</dt><dd>{t.emergency_contact_name || "—"}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-faint">Téléphone</dt><dd>{t.emergency_contact_phone || "—"}</dd></div>
            </dl>
            {t.risk_score != null && t.risk_score !== "" && (
              <p className="mt-4 text-xs text-ink-faint">
                Score de suivi interne : <span className="num text-ink-soft">{t.risk_score}/100</span> — repère indicatif, pas une décision.
              </p>
            )}
          </section>
          {t.notes && (
            <section className="card p-5 sm:col-span-2">
              <h2 className="font-display text-lg">Notes</h2>
              <p className="mt-2 text-sm text-ink-soft whitespace-pre-wrap">{t.notes}</p>
            </section>
          )}
        </div>
      )}

      {tab === "garants" && (
        <section className="card p-5">
          <h2 className="font-display text-lg flex items-center gap-2 mb-3">
            <Users size={17} className="text-ink-faint" aria-hidden />
            Garants
          </h2>
          <GuarantorPanel tenantId={id} editable={can("locataires.modifier")} />
        </section>
      )}

      {tab === "baux" && (
        <section className="card p-5">
          <h2 className="font-display text-lg flex items-center gap-2 mb-3">
            <FileText size={17} className="text-ink-faint" aria-hidden />
            Baux
          </h2>
          {leases.length === 0 ? (
            <p className="text-sm text-ink-faint">
              Aucun bail enregistré — la création de baux arrive en phase 5.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {leases.map((l) => (
                <li key={l.id} className="py-2.5 flex items-center gap-3 text-sm">
                  <span className="min-w-0 truncate">{l.expand?.unit?.reference || l.reference}</span>
                  <span className="text-xs text-ink-faint">
                    {formatDate(l.start_date)} → {l.end_date ? formatDate(l.end_date) : "en cours"}
                  </span>
                  <span className="ml-auto"><StatusPill value={l.status} /></span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {tab === "documents" && (
        <section className="card p-5">
          <h2 className="font-display text-lg flex items-center gap-2 mb-3">
            <FolderOpen size={17} className="text-ink-faint" aria-hidden />
            Documents
          </h2>
          <PhotoManager
            collection={C.tenants}
            record={t}
            field="documents"
            editable={can("locataires.modifier")}
            onChange={(updated) => setState((s) => ({ ...s, tenant: { ...s.tenant, ...updated } }))}
          />
          <p className="text-xs text-ink-faint mt-2">
            Pièces d'identité, justificatifs — au format image pour l'instant.
          </p>
        </section>
      )}

      {tab === "historique" && (
        <section className="card p-5">
          <h2 className="font-display text-lg flex items-center gap-2 mb-3">
            <History size={17} className="text-ink-faint" aria-hidden />
            Historique
          </h2>
          {history.length === 0 ? (
            <p className="text-sm text-ink-faint">Aucun événement enregistré pour l'instant.</p>
          ) : (
            <ul className="space-y-3">
              {history.map((h) => (
                <li key={h.id} className="text-sm">
                  <div className="flex items-baseline gap-2">
                    <span className="font-medium">{ACTION_LABELS[h.action] || humanize(h.action)}</span>
                    <span className="text-ink-faint">par {h.user_label}</span>
                    <time className="ml-auto text-xs text-ink-faint num" dateTime={h.created}>
                      {formatDateTime(h.created)}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Mettre ce locataire à la corbeille ?"
        explanation="Il pourra être restauré depuis la corbeille. Les garants rattachés suivent le même sort."
        confirmLabel="Mettre à la corbeille"
        danger
        busy={deleting}
        onConfirm={doDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
