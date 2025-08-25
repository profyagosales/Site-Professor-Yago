import { Navigate } from "react-router-dom";
import { useAuth } from "../store/AuthContext";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-6 text-gray-700">Carregando…</div>;
  if (!user) return <Navigate to="/login-professor" replace />;
  return children;
}

