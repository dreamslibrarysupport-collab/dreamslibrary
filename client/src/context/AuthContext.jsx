import { createContext, useContext, useEffect, useState } from 'react';
import { api, supabase } from '../services/api';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null),
    [loading, setLoading] = useState(!!supabase),
    [error, setError] = useState(null);
  useEffect(() => {
    if (!supabase) return;
    let active = true,
      revision = 0;
    const update = async (session) => {
      const current = ++revision;
      setLoading(true);
      setError(null);
      if (!session) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const r = await api.get('/auth/me');
        if (active && current === revision) setUser(r.data.data);
      } catch {
        if (active && current === revision) {
          setUser(null);
          setError('We could not load your account. Please sign in again.');
        }
      } finally {
        if (active && current === revision) setLoading(false);
      }
    };
    supabase.auth.getSession().then(({ data }) => update(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => {
        if (active) update(session);
      }, 0);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        setUser,
        signOut: async () => {
          await supabase?.auth.signOut();
          setUser(null);
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
