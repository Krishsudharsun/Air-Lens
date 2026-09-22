import { createContext, useContext, useMemo, useState, useCallback } from 'react';

const RouteContext = createContext(null);

export function RouteProvider({ children }) {
  const [searchResult, setSearchResult] = useState(null); // full API response
  const [lastQuery, setLastQuery] = useState(null); // { start, destination, departureTime }

  const getRouteById = useCallback(
    (id) => searchResult?.routes?.find((r) => r.id === id) || null,
    [searchResult]
  );

  const value = useMemo(
    () => ({
      searchResult,
      setSearchResult,
      lastQuery,
      setLastQuery,
      getRouteById,
    }),
    [searchResult, lastQuery, getRouteById]
  );

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

export function useRouteContext() {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error('useRouteContext must be used inside <RouteProvider>');
  return ctx;
}
