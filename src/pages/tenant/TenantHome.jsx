import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { pb, readableError } from "../../lib/pb";
import { C } from "../../lib/collections";
import { useAuth } from "../../context/AuthContext";
import { formatMoney } from "../../lib/money";
import { formatDate, daysBetween } from "../../lib/format";
import { LoadingState, ErrorState, EmptyState } from "../../components/States";
import StatusPill from "../../components/StatusPill";

/** §41, §70 — le locataire voit d'abord ce qu'il doit, et pour quand. */
export default function TenantHome() {
  const { user, currency } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const tenants = await pb.collection(C.tenants).getList(1, 1, {
          filter: `user="${user.id}" && deleted != true`,
        });
        const tenant = tenants.items[0];
        if (!tenant) {
          return alive && setState({ loading: false, error: null, data: { tenant: null } });
        }

        const leases = await pb.collection(C.leases).getList(1, 1, {
          filter: `tenant="${tenant.id}" && status="actif" && deleted != true`,
          expand: "unit,owner",
        });
        const lease = leases.items[0] || null;

        const [balance, nextInvoice, lastPayment] = await Promise.all([
          lease
            ? pb.collection(C.balances).getList(1, 1, { filter: `lease="${lease.id}"` })
                .then((r) => r.items[0] || null)
            : null,
          lease
            ? pb.collection(C.invoices).getList(1, 1, {
                filter: `lease="${lease.id}" && status!="paye" && status!="annule"`,
                sort: "due_date",
              }).then((r) => r.items[0] || null)
            : null,
          pb.collection(C.payments).getList(1, 1, {
            filter: `tenant="${tenant.id}" && status="valide" && deleted != true`,
            sort: "-paid_at",
          }).then((r) => r.items[0] || null),
        ]);

        if (alive) {
          setState({ loading: false, error: null, data: { tenant, lease, balance, nextInvoice, lastPayment } });
        }
      } catch (err) {
        if (alive) setState({ loading: false, error: readableError(err), data: null });
      }
    })();
    return () => { alive = false; };
  }, [user]);

  if (state.loading) return <LoadingState />;
  if (state.error) return <ErrorState message={state.error} onRetry={() => window.location.reload()} />;

  const { tenant, lease, balance, nextInvoice, lastPayment } = state.data || {};

  if (!tenant || !lease) {
    return (
      <EmptyState
        title="Aucun logement rattaché à votre compte"
        message="Votre propriétaire doit vous associer à un bail. Une fois fait, votre
                 logement, vos échéances et vos quittances apparaîtront ici."
      />
    );
  }

  const unit = lease.expand?.unit;
  const due = nextInvoice ? daysBetween(nextInvoice.due_date) : null;

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <h1 className="font-display text-2xl">Mon logement</h1>
        <p className="text-sm text-ink-soft mt-0.5">
          {unit?.reference} · bail {lease.reference}
        </p>
      </div>

      {/* Le montant dû est l'information centrale : il occupe la place forte. */}
      <section className="card p-6">
        <p className="text-sm text-ink-soft">
          {nextInvoice ? "Prochain montant à régler" : "Aucune échéance en attente"}
        </p>
        <p className="font-display text-4xl num mt-1">
          {nextInvoice ? formatMoney(nextInvoice.balance, currency) : formatMoney(0, currency)}
        </p>
        {nextInvoice && (
          <p className="text-sm text-ink-soft mt-2">
            À régler avant le {formatDate(nextInvoice.due_date)}
            {due !== null && due < 0 && ` · dans ${-due} jours`}
            {due !== null && due > 0 && (
              <span className="text-alert"> · en retard de {due} jours</span>
            )}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          <Link to="/mes-paiements/nouveau" className="btn-primary">
            Déposer une preuve de paiement
          </Link>
          <Link to="/mes-paiements" className="btn-secondary">
            Voir mes paiements
          </Link>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-xs text-ink-faint">Solde</p>
          <p className="mt-1 font-display text-xl num">
            {formatMoney(balance?.balance ?? 0, currency)}
          </p>
          <div className="mt-2">
            <StatusPill value={balance?.health || "vert"} />
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-faint">Loyer</p>
          <p className="mt-1 font-display text-xl num">{formatMoney(lease.rent, currency)}</p>
          <p className="mt-2 text-xs text-ink-soft">
            {lease.periodicity} · le {lease.payment_day} du mois
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-faint">Dernier paiement</p>
          <p className="mt-1 font-display text-xl num">
            {lastPayment ? formatMoney(lastPayment.amount, currency) : "—"}
          </p>
          <p className="mt-2 text-xs text-ink-soft">
            {lastPayment ? formatDate(lastPayment.paid_at) : "Aucun paiement enregistré"}
          </p>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-lg">Un problème dans le logement ?</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Décrivez la panne et joignez une photo. Votre demande est transmise
          immédiatement et vous suivez son avancement.
        </p>
        <Link to="/mes-demandes/nouvelle" className="btn-secondary mt-4">
          Signaler un problème
        </Link>
      </section>
    </div>
  );
}
