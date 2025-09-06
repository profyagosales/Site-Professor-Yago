import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import {
  api,
  setAuthToken,
  STORAGE_TOKEN_KEY,
  installApiInterceptors,
} from '@/services/api';
import { createSession, performLogout } from '@/services/session';
import { useSession } from '@/hooks/useSession';
import { shouldCallAuthMe, useRouteDebug } from '@/lib/route-guards';
import { useLocation, useNavigate } from 'react-router-dom';

// meta: evitar fetch sem token e expor helpers simples
type AuthState = {
  user?: any;
  role?: 'professor' | 'aluno' | null;
  loading: boolean;
};
type AuthCtx = {
  state: AuthState;
  setToken: (t: string | null) => void;
  loginTeacher(email: string, password: string): Promise<void>;
  loginStudent(email: string, password: string): Promise<void>;
  logout(): Promise<void>;
};

const AuthContext = createContext<AuthCtx>({
  state: { loading: true, role: null },
  setToken: () => {},
  loginTeacher: async () => {},
  loginStudent: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ loading: true, role: null });
  const location = useLocation();
  const navigate = useNavigate();
  const redirectOnceRef = useRef(false);

  // Hook de sessão para gerenciar TTL, idle e sincronização
  const { sessionInfo, updateActivity } = useSession({
    onSessionChange: hasSession => {
      if (!hasSession) {
        setState({ loading: false, role: null });
      }
    },
    onLogout: reason => {
      setState({ loading: false, role: null });
    },
  });

  // Debug de rotas (apenas em desenvolvimento)
  useRouteDebug(location.pathname, localStorage.getItem(STORAGE_TOKEN_KEY), state.role);

  const setToken = useCallback((t: string | null) => {
    if (t) {
      localStorage.setItem(STORAGE_TOKEN_KEY, t);
      setAuthToken(t);
    } else {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      setAuthToken(undefined);
    }
    setState(s => ({ ...s })); // força re-render
  }, []);

  useEffect(() => {
    const token = localStorage.getItem(STORAGE_TOKEN_KEY);
    
    // NÃO chame /auth/me sem token; e nunca navegue em páginas públicas.
    if (!token) { 
      setState({ loading: false, role: null }); 
      return; 
    }

    // Verificar se deve chamar /auth/me baseado na rota atual
    if (!shouldCallAuthMe(token)) {
      console.info('[AuthProvider] Pulando /auth/me - rota pública ou sem token');
      setState({ loading: false, role: null });
      return;
    }

    // Configura o token no axios antes de fazer a validação
    setAuthToken(token);

    // valida uma única vez; se 401, limpa
    api
      .get('/auth/me')
      .then(r => {
        const userData = r.data;
        const role = userData?.role ?? 'professor';

        // Cria sessão no novo sistema
        createSession(token, role);

        setState({ loading: false, user: userData, role });
      })
      .catch(err => {
        console.warn('Auth validation failed:', err.response?.status);
        setToken(null);
        setState({ loading: false, role: null });
      });
  }, [setToken]);

  useEffect(() => {
    if (state.loading) return;

    const resetAfterTick = () =>
      setTimeout(() => {
        redirectOnceRef.current = false;
      }, 0);

    const isPublicPath =
      location.pathname.startsWith('/login') ||
      location.pathname.startsWith('/recuperar-senha');

    if (!state.user && !isPublicPath) {
      if (!redirectOnceRef.current) {
        redirectOnceRef.current = true;
        navigate('/login', { replace: true });
        resetAfterTick();
      }
      return;
    }

    if (state.user && isPublicPath) {
      if (!redirectOnceRef.current) {
        redirectOnceRef.current = true;
        navigate('/', { replace: true });
        resetAfterTick();
      }
      return;
    }
  }, [state.user, state.loading, location.pathname, navigate]);

  async function loginTeacher(email: string, password: string) {
    const { data } = await api.post('/auth/login-teacher', { email, password });
    if (data?.token) {
      setToken(data.token);

      // Cria sessão no novo sistema
      createSession(data.token, 'professor');

      const me = await api.get('/auth/me');
      setState({
        loading: false,
        user: me.data,
        role: me.data?.role ?? 'professor',
      });
    }
  }

  async function loginStudent(email: string, password: string) {
    const { data } = await api.post('/auth/login-student', { email, password });
    if (data?.token) {
      setToken(data.token);

      // Cria sessão no novo sistema
      createSession(data.token, 'aluno');

      const me = await api.get('/auth/me');
      setState({
        loading: false,
        user: me.data,
        role: me.data?.role ?? 'aluno',
      });
    }
  }

  async function logout() {
    try {
      await api.post('/auth/logout');
    } catch {}

    // Usa o novo sistema de sessão para logout
    performLogout('MANUAL');
    setToken(null);
    setState({ loading: false, role: null });
  }

  useEffect(() => {
    installApiInterceptors(logout, (to, opts) => navigate(to, opts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{ state, setToken, loginTeacher, loginStudent, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
