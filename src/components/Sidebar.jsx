import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, ShieldAlert, Building2, Building, DoorOpen, UserRound,
  Users, ClipboardList, CalendarCheck, FileText, CalendarClock, Banknote,
  TriangleAlert, PhoneCall, Wrench, Calculator, FolderOpen, CalendarDays,
  BarChart3, Bell, Settings, Home, Receipt, LifeBuoy,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

/**
 * L'ordre des entrées suit le parcours de travail réel (§59) :
 * ce qui demande une décision d'abord, les référentiels ensuite.
 */
const MANAGER_NAV = [
  { group: "Pilotage", items: [
    { to: "/", label: "Tableau de bord", icon: LayoutDashboard, end: true },
    { to: "/controle", label: "Centre de contrôle", icon: ShieldAlert, perm: "impayes.lire" },
    { to: "/taches", label: "Tâches", icon: ClipboardList, perm: "taches.lire" },
    { to: "/agenda", label: "Agenda", icon: CalendarDays, perm: "agenda.lire" },
  ]},
  { group: "Patrimoine", items: [
    { to: "/proprietes", label: "Propriétés", icon: Building2, perm: "patrimoine.lire" },
    { to: "/immeubles", label: "Immeubles", icon: Building, perm: "patrimoine.lire" },
    { to: "/logements", label: "Logements", icon: DoorOpen, perm: "patrimoine.lire" },
    { to: "/proprietaires", label: "Propriétaires", icon: UserRound, perm: "proprietaires.lire" },
  ]},
  { group: "Location", items: [
    { to: "/locataires", label: "Locataires", icon: Users, perm: "locataires.lire" },
    { to: "/candidatures", label: "Candidatures", icon: ClipboardList, perm: "candidatures.lire" },
    { to: "/visites", label: "Visites", icon: CalendarCheck, perm: "visites.lire" },
    { to: "/baux", label: "Baux", icon: FileText, perm: "baux.lire" },
  ]},
  { group: "Argent", items: [
    { to: "/echeances", label: "Échéances", icon: CalendarClock, perm: "echeances.lire" },
    { to: "/paiements", label: "Paiements", icon: Banknote, perm: "paiements.lire" },
    { to: "/impayes", label: "Impayés", icon: TriangleAlert, perm: "impayes.lire" },
    { to: "/relances", label: "Relances", icon: PhoneCall, perm: "relances.lire" },
    { to: "/comptabilite", label: "Comptabilité", icon: Calculator, perm: "comptabilite.lire" },
  ]},
  { group: "Suivi", items: [
    { to: "/maintenance", label: "Maintenance", icon: Wrench, perm: "maintenance.lire" },
    { to: "/documents", label: "Documents", icon: FolderOpen, perm: "documents.lire" },
    { to: "/rapports", label: "Rapports", icon: BarChart3, perm: "rapports.lire" },
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/parametres", label: "Paramètres", icon: Settings, perm: "parametres.lire" },
  ]},
];

const TENANT_NAV = [
  { group: "Mon espace", items: [
    { to: "/", label: "Mon logement", icon: Home, end: true },
    { to: "/mon-bail", label: "Mon bail", icon: FileText },
    { to: "/mes-paiements", label: "Mes paiements", icon: Receipt },
    { to: "/mes-documents", label: "Mes documents", icon: FolderOpen },
    { to: "/mes-demandes", label: "Mes demandes", icon: LifeBuoy },
    { to: "/notifications", label: "Notifications", icon: Bell },
  ]},
];

function Item({ item, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        `flex items-center gap-2.5 h-9 px-3 rounded-lg text-sm transition-colors ${
          isActive
            ? "bg-brand-light text-brand-dark font-medium"
            : "text-ink-soft hover:bg-surface hover:text-ink"
        }`
      }
    >
      <Icon size={16} aria-hidden />
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

export default function Sidebar({ onNavigate }) {
  const { can, isManager } = useAuth();
  const nav = isManager ? MANAGER_NAV : TENANT_NAV;

  return (
    <nav className="h-full overflow-y-auto px-3 pb-8" aria-label="Navigation principale">
      {nav.map((section) => {
        const visible = section.items.filter((i) => !i.perm || can(i.perm));
        if (!visible.length) return null;
        return (
          <div key={section.group} className="mt-5 first:mt-2">
            <p className="px-3 mb-1.5 text-xs font-medium text-ink-faint">
              {section.group}
            </p>
            <div className="space-y-0.5">
              {visible.map((item) => (
                <Item key={item.to} item={item} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
