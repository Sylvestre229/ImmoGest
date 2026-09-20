import { useRef, useState } from "react";
import { ImagePlus, Trash2, Loader2 } from "lucide-react";
import { pb } from "../lib/pb";
import { updateRecord } from "../lib/repository";

/**
 * Galerie de photos avec ajout/suppression, pour un champ fichier
 * (unique ou multiple) d'un enregistrement. Chaque changement passe par
 * `repository.js` — l'ajout ou le retrait d'une photo est donc audité
 * comme n'importe quelle autre écriture.
 */
export default function PhotoManager({
  collection,
  record,
  field = "photos",
  multiple = true,
  editable = true,
  onChange,
}) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const files = multiple ? record[field] || [] : record[field] ? [record[field]] : [];
  const urlFor = (name) => pb.files.getURL(record, name, { thumb: "300x300" });

  const addFiles = async (fileList) => {
    if (!fileList?.length) return;
    setBusy(true);
    setError("");
    try {
      const payload = multiple ? { [`${field}+`]: Array.from(fileList) } : { [field]: fileList[0] };
      const updated = await updateRecord(collection, record.id, payload);
      onChange?.(updated);
    } catch {
      setError("Certains fichiers n'ont pas pu être envoyés (10 Mo max par fichier).");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeFile = async (name) => {
    setBusy(true);
    setError("");
    try {
      const payload = multiple ? { [`${field}-`]: [name] } : { [field]: "" };
      const updated = await updateRecord(collection, record.id, payload);
      onChange?.(updated);
    } catch {
      setError("Impossible de retirer ce fichier.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {error && <p className="text-xs text-alert mb-2">{error}</p>}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {files.map((name) => (
          <div key={name} className="relative aspect-square rounded-lg overflow-hidden border border-line group">
            <img src={urlFor(name)} alt="" className="w-full h-full object-cover" />
            {editable && (
              <button
                type="button"
                onClick={() => removeFile(name)}
                disabled={busy}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-ink/60 text-white grid place-items-center
                           opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                aria-label="Retirer cette photo"
              >
                <Trash2 size={12} aria-hidden />
              </button>
            )}
          </div>
        ))}
        {editable && (multiple || !files.length) && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="aspect-square rounded-lg border border-dashed border-line grid place-items-center
                       text-ink-faint hover:border-brand hover:text-brand transition-colors"
            aria-label="Ajouter une photo"
          >
            {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <ImagePlus size={18} aria-hidden />}
          </button>
        )}
      </div>
      {!files.length && !editable && <p className="text-sm text-ink-faint">Aucune photo.</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple={multiple}
        hidden
        onChange={(e) => addFiles(e.target.files)}
      />
    </div>
  );
}
