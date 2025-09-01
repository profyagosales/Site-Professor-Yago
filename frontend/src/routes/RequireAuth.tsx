import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { api, setAuthToken } from "../services/api";
import { ROUTES } from "@/routes";

export default function RequireAuth() {
  const loc = useLocation();
  const [status, setStatus] = useState<"idle" | "checking" | "ok" | "unauth">("idle");
  const token = typeof window !== 'undefined' ? localStorage.getItem("auth_token") : null;

  useEffect(() => {
    if (!token) {
      setStatus("unauth");
      return;
    }
    setAuthToken(token);
    setStatus("checking");
    api.get("/auth/me")
      .then(() => setStatus("ok"))
      .catch(() => {
        setAuthToken(undefined);
        setStatus("unauth");
      });
  }, [token, loc.pathname]);

  if (status === "unauth") return <Navigate to={ROUTES.auth.loginProf} replace state={{ from: loc }} />;
  if (status !== "ok") return <div style={{ padding: 24 }}>Carregando…</div>;
  return <Outlet />;
}
