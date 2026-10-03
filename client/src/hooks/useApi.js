import { useCallback, useEffect, useState } from 'react';
import { api, message } from '../services/api';
export function useApi(path) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (!path) {
      setState({ data: null, loading: false, error: null });
      return;
    }
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));
    let fetching = false;
    const fetchData = (background = false) => {
      if (fetching) return;
      fetching = true;
      api
        .get(path, { signal: controller.signal })
        .then((r) => setState({ data: r.data.data, meta: r.data, loading: false, error: null }))
        .catch((e) => {
          if (e.code !== 'ERR_CANCELED' && !background)
            setState({ data: null, loading: false, error: message(e) });
        })
        .finally(() => {
          fetching = false;
        });
    };
    fetchData();
    const refresh = () => {
      if (document.visibilityState === 'visible') fetchData(true);
    };
    const catalog = path.startsWith('/ebooks');
    const timer = catalog ? setInterval(refresh, 30000) : null;
    window.addEventListener('folio:ratings-updated', refresh);
    if (catalog) {
      window.addEventListener('focus', refresh);
      document.addEventListener('visibilitychange', refresh);
    }
    return () => {
      controller.abort();
      clearInterval(timer);
      window.removeEventListener('folio:ratings-updated', refresh);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [path, version]);
  const reload = useCallback(() => setVersion((v) => v + 1), []);
  return { ...state, reload };
}
