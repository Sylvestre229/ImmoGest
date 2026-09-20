import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import { LoadingState } from "./components/States";

import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import ForgotPassword from "./pages/auth/ForgotPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import ControlCenter from "./pages/ControlCenter";
import AuditLog from "./pages/AuditLog";
import TenantHome from "./pages/tenant/TenantHome";
import Placeholder from "./pages/Placeholder";
import NotFound from "./pages/NotFound";

import Owners from "./pages/patrimoine/Owners";
import OwnerForm from "./pages/patrimoine/OwnerForm";
import OwnerDetail from "./pages/patrimoine/OwnerDetail";
import Properties from "./pages/patrimoine/Properties";
import PropertyForm from "./pages/patrimoine/PropertyForm";
import PropertyDetail from "./pages/patrimoine/PropertyDetail";
import Buildings from "./pages/patrimoine/Buildings";
import BuildingForm from "./pages/patrimoine/BuildingForm";
import BuildingDetail from "./pages/patrimoine/BuildingDetail";
import Units from "./pages/patrimoine/Units";
import UnitForm from "./pages/patrimoine/UnitForm";
import UnitDetail from "./pages/patrimoine/UnitDetail";

import Tenants from "./pages/locataires/Tenants";
import TenantForm from "./pages/locataires/TenantForm";
import TenantDetail from "./pages/locataires/TenantDetail";
import Applications from "./pages/candidatures/Applications";
import ApplicationForm from "./pages/candidatures/ApplicationForm";
import ApplicationDetail from "./pages/candidatures/ApplicationDetail";
import Visits from "./pages/visites/Visits";
import VisitForm from "./pages/visites/VisitForm";

/** Route accessible uniquement connecté, et seulement si la permission existe. */
function Protected({ permission, children }) {
  const { user, loading, can } = useAuth();
  if (loading) return <LoadingState />;
  if (!user) return <Navigate to="/connexion" replace />;
  if (!user.onboarding_done) return <Navigate to="/bienvenue" replace />;
  if (permission && !can(permission)) {
    return (
      <div className="max-w-md py-16">
        <h1 className="font-display text-2xl">Accès non autorisé</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Votre rôle ne donne pas accès à cette partie de l'application.
          Demandez une extension de droits à votre gestionnaire.
        </p>
      </div>
    );
  }
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <LoadingState />;
  if (user) return <Navigate to={user.onboarding_done ? "/" : "/bienvenue"} replace />;
  return children;
}

/** L'accueil dépend du rôle : gestion d'un côté, espace personnel de l'autre. */
function Home() {
  const { isManager } = useAuth();
  return isManager ? <Dashboard /> : <TenantHome />;
}

const soon = (props) => <Placeholder {...props} />;

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/connexion" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/inscription" element={<PublicOnly><Register /></PublicOnly>} />
          <Route path="/mot-de-passe-oublie" element={<PublicOnly><ForgotPassword /></PublicOnly>} />
          <Route path="/bienvenue" element={<Onboarding />} />

          <Route element={<Protected><Layout /></Protected>}>
            <Route index element={<Home />} />
            <Route path="controle" element={
              <Protected permission="impayes.lire"><ControlCenter /></Protected>} />
            <Route path="audit" element={
              <Protected permission="audit.lire"><AuditLog /></Protected>} />

            {/* Phase 2 — patrimoine */}
            <Route path="proprietes" element={
              <Protected permission="patrimoine.lire"><Properties /></Protected>} />
            <Route path="proprietes/nouveau" element={
              <Protected permission="patrimoine.creer"><PropertyForm /></Protected>} />
            <Route path="proprietes/:id" element={
              <Protected permission="patrimoine.lire"><PropertyDetail /></Protected>} />
            <Route path="proprietes/:id/modifier" element={
              <Protected permission="patrimoine.modifier"><PropertyForm /></Protected>} />

            <Route path="immeubles" element={
              <Protected permission="patrimoine.lire"><Buildings /></Protected>} />
            <Route path="immeubles/nouveau" element={
              <Protected permission="patrimoine.creer"><BuildingForm /></Protected>} />
            <Route path="immeubles/:id" element={
              <Protected permission="patrimoine.lire"><BuildingDetail /></Protected>} />
            <Route path="immeubles/:id/modifier" element={
              <Protected permission="patrimoine.modifier"><BuildingForm /></Protected>} />

            <Route path="logements" element={
              <Protected permission="patrimoine.lire"><Units /></Protected>} />
            <Route path="logements/nouveau" element={
              <Protected permission="patrimoine.creer"><UnitForm /></Protected>} />
            <Route path="logements/:id" element={
              <Protected permission="patrimoine.lire"><UnitDetail /></Protected>} />
            <Route path="logements/:id/modifier" element={
              <Protected permission="patrimoine.modifier"><UnitForm /></Protected>} />

            <Route path="proprietaires" element={
              <Protected permission="proprietaires.lire"><Owners /></Protected>} />
            <Route path="proprietaires/nouveau" element={
              <Protected permission="proprietaires.creer"><OwnerForm /></Protected>} />
            <Route path="proprietaires/:id" element={
              <Protected permission="proprietaires.lire"><OwnerDetail /></Protected>} />
            <Route path="proprietaires/:id/modifier" element={
              <Protected permission="proprietaires.modifier"><OwnerForm /></Protected>} />

            {/* Phase 3 & 4 */}
            <Route path="locataires" element={
              <Protected permission="locataires.lire"><Tenants /></Protected>} />
            <Route path="locataires/nouveau" element={
              <Protected permission="locataires.creer"><TenantForm /></Protected>} />
            <Route path="locataires/:id" element={
              <Protected permission="locataires.lire"><TenantDetail /></Protected>} />
            <Route path="locataires/:id/modifier" element={
              <Protected permission="locataires.modifier"><TenantForm /></Protected>} />

            <Route path="candidatures" element={
              <Protected permission="candidatures.lire"><Applications /></Protected>} />
            <Route path="candidatures/nouvelle" element={
              <Protected permission="candidatures.creer"><ApplicationForm /></Protected>} />
            <Route path="candidatures/:id" element={
              <Protected permission="candidatures.lire"><ApplicationDetail /></Protected>} />
            <Route path="candidatures/:id/modifier" element={
              <Protected permission="candidatures.modifier"><ApplicationForm /></Protected>} />

            <Route path="visites" element={
              <Protected permission="visites.lire"><Visits /></Protected>} />
            <Route path="visites/nouvelle" element={
              <Protected permission="visites.creer"><VisitForm /></Protected>} />
            <Route path="visites/:id/modifier" element={
              <Protected permission="visites.modifier"><VisitForm /></Protected>} />

            {/* Phases 5 à 7 */}
            <Route path="baux" element={soon({
              title: "Baux", phase: 5,
              describes: ["Création et génération du contrat", "Avenants et versions",
                "Calendrier d'échéances automatique"] })} />
            <Route path="echeances" element={soon({ title: "Échéances", phase: 6 })} />
            <Route path="paiements" element={soon({ title: "Paiements", phase: 7 })} />
            <Route path="impayes" element={soon({
              title: "Impayés", phase: 7,
              describes: ["Centre de gestion des impayés", "Règle des deux mois",
                "Filtres par retard, montant et propriétaire"] })} />

            {/* Phases 8 à 13 */}
            <Route path="relances" element={soon({
              title: "Relances", phase: 8,
              describes: ["Huit niveaux configurables", "WhatsApp et appels journalisés",
                "Promesses de paiement"] })} />
            <Route path="maintenance" element={soon({ title: "Maintenance", phase: 10 })} />
            <Route path="comptabilite" element={soon({ title: "Comptabilité", phase: 11 })} />
            <Route path="rapports" element={soon({ title: "Rapports", phase: 12 })} />
            <Route path="taches" element={soon({ title: "Tâches", phase: 13 })} />
            <Route path="agenda" element={soon({ title: "Agenda", phase: 13 })} />
            <Route path="documents" element={soon({ title: "Documents", phase: 5 })} />
            <Route path="notifications" element={soon({ title: "Notifications", phase: 8 })} />
            <Route path="parametres" element={soon({
              title: "Paramètres", phase: 15,
              describes: ["Devises et taux de change", "Règles par juridiction",
                "Modèles de messages", "Corbeille et sauvegardes"],
              next: { to: "/audit", label: "Consulter le journal d'audit" } })} />
            <Route path="profil" element={soon({ title: "Mon profil", phase: 15 })} />

            {/* Espace locataire */}
            <Route path="mon-bail" element={soon({ title: "Mon bail", phase: 5 })} />
            <Route path="mes-paiements" element={soon({ title: "Mes paiements", phase: 7 })} />
            <Route path="mes-documents" element={soon({ title: "Mes documents", phase: 5 })} />
            <Route path="mes-demandes" element={soon({ title: "Mes demandes", phase: 10 })} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
