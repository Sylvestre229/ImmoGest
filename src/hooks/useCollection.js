import { useCallback, useEffect, useRef, useState } from "react";
import { listRecords } from "../lib/repository";
import { readableError } from "../lib/pb";

/**
 * Lecture paginée d'une collection avec les quatre états exigés (§68) :
 * loading, empty, success, error.
 */
export function useCollection(collection, options = {}, deps = []) {
  const [state, setState] = useState({
    items: [], page: 1, totalItems: 0, totalPages: 0,
    loading: true, error: null,
  });
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const load = useCallback(
    async (page = 1) => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await listRecords(collection, { ...optionsRef.current, page });
        setState({
          items: res.items,
          page: res.page,
          totalItems: res.totalItems,
          totalPages: res.totalPages,
          loading: false,
          error: null,
        });
      } catch (err) {
        setState((s) => ({ ...s, loading: false, error: readableError(err) }));
      }
    },
    [collection]
  );

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, ...deps]);

  return {
    ...state,
    isEmpty: !state.loading && !state.error && state.items.length === 0,
    reload: load,
    setPage: load,
  };
}
