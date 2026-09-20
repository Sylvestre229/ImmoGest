/**
 * Toutes les écritures passent par ici (§4, §57, §58).
 *
 * Écrire directement `pb.collection(x).update(...)` court-circuite l'audit :
 * dans ce projet, c'est considéré comme un bug.
 */

import { pb } from "./pb";
import { C, SOFT_DELETABLE, FINANCIAL } from "./collections";

function labelOf(record) {
  return (
    record?.reference ||
    record?.number ||
    record?.name ||
    record?.title ||
    record?.label ||
    record?.full_name ||
    [record?.first_name, record?.last_name].filter(Boolean).join(" ") ||
    record?.id ||
    ""
  );
}

/** N'écrit dans l'audit que les champs qui ont réellement changé. */
function diff(before, after) {
  const b = {};
  const a = {};
  const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
  const ignored = ["updated", "created", "collectionId", "collectionName", "expand"];
  for (const k of keys) {
    if (ignored.includes(k)) continue;
    const bv = before?.[k];
    const av = after?.[k];
    if (JSON.stringify(bv) !== JSON.stringify(av)) {
      b[k] = bv ?? null;
      a[k] = av ?? null;
    }
  }
  return [b, a];
}

async function writeAudit({ action, collection, record, before, after }) {
  try {
    const user = pb.authStore.record;
    await pb.collection(C.auditLogs).create({
      user: user?.id || null,
      user_label: user?.full_name || user?.email || "système",
      action,
      collection_name: collection,
      record_id: record?.id || null,
      record_label: labelOf(record),
      before: before || null,
      after: after || null,
      financial: FINANCIAL.includes(collection),
      user_agent: navigator.userAgent.slice(0, 200),
    });
  } catch (err) {
    // L'audit ne doit jamais faire échouer l'opération métier,
    // mais il doit être visible en développement.
    console.error("Audit non enregistré :", err);
  }
}

export async function createRecord(collection, data, options = {}) {
  const record = await pb.collection(collection).create(data, options);
  await writeAudit({ action: "create", collection, record, after: data });
  return record;
}

export async function updateRecord(collection, id, data, options = {}) {
  const before = await pb.collection(collection).getOne(id);
  const record = await pb.collection(collection).update(id, data, options);
  const [b, a] = diff(before, record);
  if (Object.keys(a).length) {
    await writeAudit({ action: "update", collection, record, before: b, after: a });
  }
  return record;
}

/**
 * Suppression : corbeille si la collection le permet, sinon suppression réelle.
 * Une donnée financière n'est jamais supprimée définitivement ici (§63).
 */
export async function removeRecord(collection, id) {
  const before = await pb.collection(collection).getOne(id);

  if (SOFT_DELETABLE.includes(collection)) {
    const record = await pb.collection(collection).update(id, {
      deleted: true,
      deleted_at: new Date().toISOString(),
      deleted_by: pb.authStore.record?.id || null,
    });
    await writeAudit({
      action: "delete",
      collection,
      record,
      before: { deleted: false },
      after: { deleted: true },
    });
    return record;
  }

  await pb.collection(collection).delete(id);
  await writeAudit({ action: "delete", collection, record: before, before });
  return null;
}

export async function restoreRecord(collection, id) {
  const record = await pb.collection(collection).update(id, {
    deleted: false,
    deleted_at: null,
    deleted_by: null,
  });
  await writeAudit({
    action: "restore",
    collection,
    record,
    before: { deleted: true },
    after: { deleted: false },
  });
  return record;
}

export async function purgeRecord(collection, id) {
  const before = await pb.collection(collection).getOne(id);
  await pb.collection(collection).delete(id);
  await writeAudit({ action: "purge", collection, record: before, before });
}

/** Lecture standard : la corbeille est exclue sauf demande explicite. */
export function listRecords(collection, options = {}) {
  const { includeDeleted, filter, ...rest } = options;
  const softFilter = SOFT_DELETABLE.includes(collection) && !includeDeleted
    ? "deleted != true"
    : "";
  const combined = [softFilter, filter].filter(Boolean).join(" && ");
  return pb.collection(collection).getList(options.page || 1, options.perPage || 30, {
    ...rest,
    filter: combined || undefined,
  });
}

export function getRecord(collection, id, options = {}) {
  return pb.collection(collection).getOne(id, options);
}

/** Journalise une action qui n'est pas une écriture (export, connexion…). */
export function logAction(action, collection, record, payload) {
  return writeAudit({ action, collection, record, after: payload });
}
