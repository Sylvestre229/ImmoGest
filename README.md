# GestImmo

Logiciel de gestion locative : patrimoine, baux, échéances, encaissements,
impayés, relances, maintenance et comptabilité. Multi-pays, multi-devises,
XOF en devise de base.

React 18 + Vite + Tailwind côté client, PocketBase côté serveur.

---

## Installation

### 1. Le serveur

Téléchargez PocketBase (version 0.23 ou supérieure) depuis pocketbase.io et
placez le binaire dans `pocketbase/`.

```bash
cd pocketbase
./pocketbase serve --dir=./pb_data --migrationsDir=./pb_migrations
```

Au premier lancement, PocketBase applique `pb_migrations/1737000000_init_schema.js`
et crée les 45 collections ainsi que les neuf devises de départ. Ouvrez
`http://127.0.0.1:8090/_/` pour créer le compte administrateur.

### 2. Le client

```bash
npm install
cp .env.example .env     # ajustez VITE_PB_URL si besoin
npm run dev
```

### 3. Les données de démonstration (facultatif)

```bash
node pocketbase/seed/seed.mjs --email=votre@admin.bj --password=votremotdepasse
```

Huit logements, six baux, des échéances sur plusieurs mois, des paiements
partiels, un dossier à deux mois d'impayés, deux tickets de maintenance et un
pipeline de candidatures. Chaque enregistrement porte `DEMO` dans sa référence.

Pour tout retirer : ajoutez `--purge` à la même commande.

---

## Organisation du code

```
pocketbase/
  pb_migrations/    schéma décrit sous forme de données, appliqué en boucle
  seed/             données de démonstration
src/
  lib/
    pb.js           client PocketBase + traduction des erreurs
    collections.js  noms des collections, corbeille, opérations financières
    permissions.js  matrice des neuf rôles
    repository.js   toutes les écritures : audit, corbeille, restauration
    money.js        devises, conversion, santé d'un solde
    format.js       dates, libellés, numéros WhatsApp
    templating.js   modèles de messages et variables
    whatsapp.js     mode standard et mode API Business
  context/          session, rôle, paramètres
  components/       navigation, états de vue, confirmation, recherche globale
  pages/            écrans
```

### Trois règles à respecter en contribuant

**Toute écriture passe par `repository.js`.** Appeler `pb.collection(x).update()`
directement contourne le journal d'audit. Le journal doit pouvoir répondre
« qui a changé ce loyer, quand, et de combien à combien ».

**Un montant, c'est cinq colonnes.** `amount`, `amount_currency`, `amount_rate`,
`amount_base`, `amount_rate_date`. La valeur d'origine n'est jamais écrasée par
sa conversion. Utilisez `buildMoney()`.

**Aucune donnée n'est dupliquée.** Un paiement référence sa facture, qui
référence le bail, qui référence le logement et le locataire. Le nom du
locataire ne se recopie jamais dans un paiement.

---

## Ce qui est en place

| Domaine | État |
|---|---|
| Schéma complet (45 collections, relations, index) | fait |
| Inscription, connexion, réinitialisation, sessions | fait |
| Neuf rôles, matrice de permissions, routes protégées | fait |
| Journal d'audit avant/après, corbeille, restauration | fait |
| Devises, taux de change, conversion non destructive | fait |
| Assistant de première configuration | fait |
| Tableau de bord propriétaire et espace locataire | fait |
| Centre de contrôle urgent / à traiter / normal | fait |
| Recherche globale multi-collections | fait |
| PWA installable, navigation mobile | fait |
| Données de démonstration | fait |

## Ce qui vient ensuite

- **Phase 2** — fiches propriété, immeuble, logement 360°, propriétaires
- **Phase 3-4** — dossier locataire 360°, garants, candidatures, visites
- **Phase 5-7** — baux, contrats PDF, avenants, échéanciers, facturation, paiements, impayés
- **Phase 8-9** — relances multicanal, WhatsApp, appels, promesses, renouvellement, résiliation
- **Phase 10-12** — maintenance, comptabilité, rapports et exports
- **Phase 13-15** — automatisations serveur, assistant en langage naturel, sauvegardes

---

## Points d'attention

**Les automatisations tournent côté serveur.** Les règles décrites dans
`automation_rules` sont paramétrables depuis l'application, mais leur exécution
demande un hook PocketBase (`pb_hooks/`) ou un cron externe. Tant qu'il n'est
pas branché, les règles sont enregistrées sans être déclenchées — l'interface
ne prétendra jamais le contraire.

**WhatsApp a deux modes distincts.** Sans `VITE_WHATSAPP_API_URL`, l'application
ouvre `wa.me` avec un message prérempli : l'envoi dépend de l'utilisateur, et le
journal enregistre « ouvert », pas « envoyé ». L'envoi réellement automatisé
exige une API WhatsApp Business configurée.

**Les taux de change ne sont pas inventés.** Sans service configuré, la
conversion demande une saisie manuelle du taux plutôt que de produire un chiffre
approximatif.

**Les procédures juridiques sont paramétrables, jamais codées en dur.** La
collection `jurisdictions` porte les délais de relance, de mise en demeure et de
préavis. Aucun délai n'est présenté comme valable partout : c'est au gestionnaire
de renseigner les règles applicables chez lui.
