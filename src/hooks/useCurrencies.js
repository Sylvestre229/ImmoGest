import { useEffect, useState } from "react";
import { pb } from "../lib/pb";
import { C } from "../lib/collections";

/** Devises actives, triées avec la devise de base en tête. */
export function useCurrencies() {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    pb.collection(C.currencies)
      .getFullList({ filter: "active=true", sort: "-is_base,code" })
      .then((list) => alive && setCurrencies(list))
      .catch(() => alive && setCurrencies([]))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return { currencies, loading };
}
