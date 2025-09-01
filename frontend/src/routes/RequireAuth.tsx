import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { api } from "@/services/api";
import { ROUTES } from "@/routes";
import { setAuthToken } from "@/services/api";

export default function RequireAuth() {
  const [status, setStatus] = useState<"idle"|"checking"|"ok"|"fail">("idle");

  useEffect(() => {
    const t = localStorage.getItem("auth_token");
    if (!t) {
      setStatus("fail");
      return;
    }
    let mounted = true;
    (async () => {
      setStatus("checking");
      try {
        await api.get("/auth/me");
        if (mounted) setStatus("ok");
      } catch {
        setAuthToken(undefined);
        if (mounted) setStatus("fail");
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (status === "idle" || status === "checking") return <div>Carregando…</div>;
  if (status === "fail") return <Navigate to={ROUTES.auth.loginProf} replace />;
  return <Outlet />;
}
