import PocketBase from "pocketbase";

export const pb = new PocketBase(
  import.meta.env.VITE_PB_URL || "http://127.0.0.1:8090"
);

pb.autoCancellation(false);

/** Traduit une erreur PocketBase en message lisible par l'utilisateur. */
export function readableError(err) {
  if (!err) return "Une erreur inattendue s'est produite.";
  if (err.status === 0) return "Le serveur est injoignable. Vérifiez votre connexion.";
  if (err.status === 400 && err.response?.data) {
    const first = Object.entries(err.response.data)[0];
    if (first) return `${first[0]} : ${first[1].message}`;
  }
  if (err.status === 403) return "Vous n'avez pas accès à cette donnée.";
  if (err.status === 404) return "Cet élément n'existe pas ou a été supprimé.";
  return err.message || "Une erreur inattendue s'est produite.";
}
