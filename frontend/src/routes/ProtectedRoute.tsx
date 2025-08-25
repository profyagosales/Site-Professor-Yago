import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { api } from "@/lib/http";

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
  const [ok, setOk] = useState<null | boolean>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await api.get("/auth/me");
        if (alive) setOk(true);
      } catch {
        if (alive) setOk(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  if (ok === null) return <div className="p-6 text-gray-700">Carregando…</div>;
  if (!ok) return <Navigate to="/login-professor" replace />;
  return children;
}

