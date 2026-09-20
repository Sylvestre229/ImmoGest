import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X } from "lucide-react";
import { pb } from "../lib/pb";
import { C } from "../lib/collections";
import { useDebounced } from "../hooks/useDebounced";
import { fullName, humanize } from "../lib/format";
import { useAuth } from "../context/AuthContext";

/**
 * §42 — une seule requête doit retrouver un locataire, un bail, une facture…
 * Chaque source ne s'interroge que si le rôle y a accès.
 */
const SOURCES = [
  {
    key: C.tenants, label: "Locataires", perm: "locataires.lire",
    fields: ["first_name", "last_name", "phone", "email"],
    title: (r) => fullName(r),
    subtitle: (r) => r.phone || r.email || "",
    href: (r) => `/locataires/${r.id}`,
  },
  {
    key: C.properties, label: "Propriétés", perm: "patrimoine.lire",
    fields: ["reference", "name", "city"],
    title: (r) => r.name,
    subtitle: (r) => [r.city, r.country].filter(Boolean).join(", ") || r.reference,
    href: (r) => `/proprietes/${r.id}`,
  },
  {
    key: C.buildings, label: "Immeubles", perm: "patrimoine.lire",
    fields: ["reference", "name"],
    title: (r) => r.name,
    subtitle: (r) => r.reference,
    href: (r) => `/immeubles/${r.id}`,
  },
  {
    key: C.units, label: "Logements", perm: "patrimoine.lire",
    fields: ["reference", "name", "door_number"],
    title: (r) => r.reference,
    subtitle: (r) => `${humanize(r.unit_type)} · ${humanize(r.status)}`,
    href: (r) => `/logements/${r.id}`,
  },
  {
    key: C.leases, label: "Baux", perm: "baux.lire",
    fields: ["reference"],
    title: (r) => r.reference,
    subtitle: (r) => humanize(r.status),
    href: (r) => `/baux/${r.id}`,
  },
  {
    key: C.invoices, label: "Factures", perm: "factures.lire",
    fields: ["number"],
    title: (r) => r.number,
    subtitle: (r) => humanize(r.status),
    href: (r) => `/echeances/${r.id}`,
  },
  {
    key: C.payments, label: "Paiements", perm: "paiements.lire",
    fields: ["number", "reference"],
    title: (r) => r.number,
    subtitle: (r) => humanize(r.method),
    href: (r) => `/paiements/${r.id}`,
  },
  {
    key: C.owners, label: "Propriétaires", perm: "proprietaires.lire",
    fields: ["full_name", "phone", "email"],
    title: (r) => r.full_name,
    subtitle: (r) => r.phone || r.email || "",
    href: (r) => `/proprietaires/${r.id}`,
  },
  {
    key: C.tickets, label: "Maintenance", perm: "maintenance.lire",
    fields: ["reference", "title"],
    title: (r) => r.title,
    subtitle: (r) => `${r.reference} · ${humanize(r.status)}`,
    href: (r) => `/maintenance/${r.id}`,
  },
  {
    key: C.contractors, label: "Prestataires", perm: "prestataires.lire",
    fields: ["name", "company", "phone"],
    title: (r) => r.name,
    subtitle: (r) => r.company || r.phone || "",
    href: (r) => `/prestataires/${r.id}`,
  },
  {
    key: C.documents, label: "Documents", perm: "documents.lire",
    fields: ["title"],
    title: (r) => r.title,
    subtitle: (r) => humanize(r.category),
    href: (r) => `/documents/${r.id}`,
  },
];

export default function GlobalSearch({ open, onClose }) {
  const [term, setTerm] = useState("");
  const [groups, setGroups] = useState([]);
  const [busy, setBusy] = useState(false);
  const debounced = useDebounced(term, 250);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { can } = useAuth();

  useEffect(() => {
    if (open) {
      setTerm("");
      setGroups([]);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    const q = debounced.trim();
    if (!open || q.length < 2) return setGroups([]);

    let alive = true;
    setBusy(true);
    const escaped = q.replace(/"/g, '\\"');

    Promise.all(
      SOURCES.filter((s) => can(s.perm)).map(async (source) => {
        const filter = source.fields
          .map((f) => `${f} ~ "${escaped}"`)
          .join(" || ");
        try {
          const res = await pb.collection(source.key).getList(1, 5, {
            filter: `(${filter})`,
            sort: "-created",
          });
          return { source, items: res.items };
        } catch {
          return { source, items: [] };
        }
      })
    ).then((results) => {
      if (!alive) return;
      setGroups(results.filter((g) => g.items.length));
      setBusy(false);
    });

    return () => {
      alive = false;
    };
  }, [debounced, open, can]);

  if (!open) return null;

  const go = (href) => {
    onClose();
    navigate(href);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 flex items-start justify-center pt-[8vh] px-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Recherche globale"
    >
      <div
        className="w-full max-w-xl bg-white rounded-2xl overflow-hidden shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 h-14 border-b border-line">
          <Search size={18} className="text-ink-faint" aria-hidden />
          <input
            ref={inputRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Nom, référence, numéro de facture…"
            className="flex-1 bg-transparent outline-none text-sm"
            aria-label="Terme de recherche"
          />
          <button
            onClick={onClose}
            className="h-8 w-8 grid place-items-center rounded-lg hover:bg-surface"
            aria-label="Fermer"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {term.trim().length < 2 && (
            <p className="px-4 py-8 text-sm text-ink-faint text-center">
              Tapez au moins deux caractères. La recherche couvre les locataires,
              les logements, les baux, les factures, les paiements et les documents.
            </p>
          )}

          {term.trim().length >= 2 && !busy && !groups.length && (
            <p className="px-4 py-8 text-sm text-ink-faint text-center">
              Aucun résultat pour « {term} ».
            </p>
          )}

          {groups.map(({ source, items }) => (
            <div key={source.key} className="py-2">
              <p className="px-4 pb-1 text-xs font-medium text-ink-faint">
                {source.label}
              </p>
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => go(source.href(item))}
                  className="w-full text-left px-4 py-2 hover:bg-surface flex flex-col"
                >
                  <span className="text-sm">{source.title(item)}</span>
                  <span className="text-xs text-ink-faint">{source.subtitle(item)}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
