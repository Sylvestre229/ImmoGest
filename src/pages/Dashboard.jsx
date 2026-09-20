import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { ArrowUpRight } from "lucide-react";
import { pb, readableError } from "../lib/pb";
import { C } from "../lib/collections";
import { useAuth } from "../context/AuthContext";
import { formatMoney } from "../lib/money";
import { formatDate, daysBetween } from "../lib/format";
import { LoadingState, ErrorState, EmptyState } from "../components/States";
import StatusPill from "../components/StatusPill";

/**
 * §78 — le tableau de bord répond à trois questions :
 * ce qui se passe, ce qui doit être fait, et pour quand.
 * « À faire aujourd'hui » passe donc avant les chiffres.
 */

function Metric({ label, value, hint, tone = "info", to }) {
  const border = {
    ok: "border-l-ok", warn: "border-l-warn", alert: "border-l-alert", info: "border-l-line",
  }[tone];
  const content = (
    <div className={`card border-l-2 ${border} p-4 h-full`}>
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="mt-1.5 font-display text-2xl num">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-soft">{hint}</p>}
    </div>
  );
  return to ? <Link to={to} className="block hover:opacity-90">{content}</Link> : content;
}

export default function Dashboard() {
  const { user, currency } = useAuth();
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const today = new Date();
        const iso = (d) => d.toISOString().slice(0, 10);
        const in30 = new Date(today.getTime() + 30 * 86400000);
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        const count = async (collection, filter) => {
          const res = await pb.collection(collection).getList(1, 1, { filter });
          return res.totalItems;
        };

        const [
          units, occupied, available, leasesActive, expiring,
          overdueSchedules, partials, urgentTickets, visitsToday, dueReminders,
        ] = await Promise.all([
          count(C.units, "deleted != true"),
          count(C.units, 'deleted != true && status="loue"'),
          count(C.units, 'deleted != true && status="disponible"'),
          count(C.leases, 'deleted != true && status="actif"'),
          count(C.leases, `deleted != true && status="actif" && end_date<="${iso(in30)}"`),
          count(C.rentSchedules, 'status="impaye" || status="en_retard"'),
          count(C.rentSchedules, 'status="partiellement_paye"'),
          count(C.tickets, 'deleted != true && priority="urgente" && status!="ferme"'),
          count(C.visits, `status="planifiee" && scheduled_at>="${iso(today)}"`),
          count(C.reminders, 'deleted != true && status="a_faire"'),
        ]);

        // Encaissements du mois, à partir des paiements validés uniquement.
        const payments = await pb.collection(C.payments).getFullList({
          filter: `deleted != true && status="valide" && paid_at>="${monthStart.toISOString()}"`,
          fields: "amount_base,paid_at",
        });
        const collected = payments.reduce((sum, p) => sum + (p.amount_base || 0), 0);

        const expectedRes = await pb.collection(C.rentSchedules).getFullList({
          filter: `due_date>="${monthStart.toISOString()}" && due_date<="${today.toISOString()}"`,
          fields: "total_due_base,total_paid_base",
        });
        const expected = expectedRes.reduce((s, r) => s + (r.total_due_base || 0), 0);
        const outstanding = expectedRes.reduce(
          (s, r) => s + ((r.total_due_base || 0) - (r.total_paid_base || 0)), 0
        );

        // Six derniers mois d'encaissements pour la courbe.
        const since = new Date(today.getFullYear(), today.getMonth() - 5, 1);
        const history = await pb.collection(C.payments).getFullList({
          filter: `deleted != true && status="valide" && paid_at>="${since.toISOString()}"`,
          fields: "amount_base,paid_at",
        });
        const buckets = {};
        for (let i = 0; i < 6; i++) {
          const d = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1);
          buckets[`${d.getFullYear()}-${d.getMonth()}`] = {
            mois: d.toLocaleDateString("fr-FR", { month: "short" }),
            montant: 0,
          };
        }
        for (const p of history) {
          const d = new Date(p.paid_at);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          if (buckets[key]) buckets[key].montant += p.amount_base || 0;
        }

        const nextDue = await pb.collection(C.rentSchedules).getList(1, 5, {
          filter: `status!="paye" && status!="annule" && due_date>="${iso(today)}"`,
          sort: "due_date",
          expand: "lease.tenant,lease.unit",
        });

        if (!alive) return;
        setState({
          loading: false, error: null,
          data: {
            units, occupied, available, leasesActive, expiring,
            overdueSchedules, partials, urgentTickets, visitsToday, dueReminders,
            collected, expected, outstanding,
            chart: Object.values(buckets),
            nextDue: nextDue.items,
          },
        });
      } catch (err) {
        if (alive) setState({ loading: false, error: readableError(err), data: null });
      }
    })();
    return () => { alive = false; };
  }, []);

  if (state.loading) return <LoadingState label="Calcul de votre situation…" />;
  if (state.error) {
    return <ErrorState message={state.error} onRetry={() => window.location.reload()} />;
  }

  const d = state.data;
  const occupancy = d.units ? Math.round((d.occupied / d.units) * 100) : 0;

  const todo = [
    { n: d.dueReminders, label: "locataires à relancer", to: "/relances", tone: "alert" },
    { n: d.partials, label: "paiements partiels à vérifier", to: "/impayes", tone: "warn" },
    { n: d.visitsToday, label: "visites à venir", to: "/visites", tone: "info" },
    { n: d.urgentTickets, label: "maintenances urgentes", to: "/maintenance", tone: "alert" },
    { n: d.expiring, label: "baux expirant sous 30 jours", to: "/baux", tone: "warn" },
  ].filter((t) => t.n > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-2xl">
            Bonjour {user?.full_name?.split(" ")[0] || ""}
          </h1>
          <p className="text-sm text-ink-soft mt-0.5">
            {formatDate(new Date())} · situation de votre patrimoine
          </p>
        </div>
        <Link to="/controle" className="btn-secondary">
          Centre de contrôle <ArrowUpRight size={15} aria-hidden />
        </Link>
      </div>

      {/* Ce qui doit être fait, avant tout le reste. */}
      <section className="card p-5" aria-labelledby="todo-title">
        <h2 id="todo-title" className="font-display text-lg">À faire aujourd'hui</h2>
        {todo.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">
            Rien n'attend d'action de votre part. Les loyers sont à jour et aucune
            échéance ne dépasse son délai.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {todo.map((t) => (
              <li key={t.label}>
                <Link
                  to={t.to}
                  className="flex items-center gap-3 py-2.5 hover:text-brand"
                >
                  <span className={`num font-display text-xl w-8 ${
                    t.tone === "alert" ? "text-alert" : t.tone === "warn" ? "text-warn" : "text-ink"
                  }`}>
                    {t.n}
                  </span>
                  <span className="text-sm">{t.label}</span>
                  <ArrowUpRight size={14} className="ml-auto text-ink-faint" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-label="Indicateurs clés">
        <Metric label="Taux d'occupation" value={`${occupancy} %`}
          hint={`${d.occupied} loués · ${d.available} disponibles`}
          tone={occupancy >= 80 ? "ok" : occupancy >= 50 ? "warn" : "alert"} to="/logements" />
        <Metric label="Encaissé ce mois" value={formatMoney(d.collected, currency, { compact: true })}
          hint={`attendu ${formatMoney(d.expected, currency, { compact: true })}`}
          tone="ok" to="/paiements" />
        <Metric label="Reste à encaisser" value={formatMoney(d.outstanding, currency, { compact: true })}
          hint={`${d.overdueSchedules} échéances en retard`}
          tone={d.outstanding > 0 ? "alert" : "ok"} to="/impayes" />
        <Metric label="Baux actifs" value={d.leasesActive}
          hint={`${d.expiring} arrivent à échéance`} to="/baux" />
      </section>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <section className="card p-5" aria-labelledby="chart-title">
          <h2 id="chart-title" className="font-display text-lg mb-4">
            Encaissements des six derniers mois
          </h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={d.chart} margin={{ left: -18, right: 6, top: 4 }}>
                <defs>
                  <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0E6E5C" stopOpacity={0.18} />
                    <stop offset="100%" stopColor="#0E6E5C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#DFDACD" vertical={false} />
                <XAxis dataKey="mois" tickLine={false} axisLine={false}
                  tick={{ fontSize: 12, fill: "#7A8783" }} />
                <YAxis tickLine={false} axisLine={false}
                  tick={{ fontSize: 12, fill: "#7A8783" }}
                  tickFormatter={(v) => new Intl.NumberFormat("fr-FR", { notation: "compact" }).format(v)} />
                <Tooltip
                  formatter={(v) => formatMoney(v, currency)}
                  contentStyle={{ borderRadius: 10, border: "1px solid #DFDACD", fontSize: 13 }}
                />
                <Area type="monotone" dataKey="montant" stroke="#0E6E5C" strokeWidth={2}
                  fill="url(#fill)" name="Encaissé" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="card p-5" aria-labelledby="next-title">
          <h2 id="next-title" className="font-display text-lg mb-3">Prochaines échéances</h2>
          {d.nextDue.length === 0 ? (
            <EmptyState
              title="Aucune échéance à venir"
              message="Les échéances apparaîtront dès qu'un bail sera actif."
            />
          ) : (
            <ul className="divide-y divide-line">
              {d.nextDue.map((s) => {
                const tenant = s.expand?.lease?.expand?.tenant;
                const unit = s.expand?.lease?.expand?.unit;
                const left = daysBetween(s.due_date);
                return (
                  <li key={s.id} className="py-2.5 flex items-center gap-3">
                    <div className="min-w-0">
                      <p className="text-sm truncate">
                        {tenant ? `${tenant.first_name} ${tenant.last_name}` : "Locataire"}
                      </p>
                      <p className="text-xs text-ink-faint truncate">
                        {unit?.reference} · {formatDate(s.due_date)}
                        {left !== null && left < 0 ? ` · dans ${-left} j` : ""}
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-sm num">{formatMoney(s.total_due, currency, { compact: true })}</p>
                      <StatusPill value={s.status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
