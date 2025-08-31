import { Navigate, Outlet, useLocation } from "react-router-dom";
import { setAuthToken } from "../services/api";

export default function RequireAuth() {
  const loc = useLocation();
  const token = typeof window !== 'undefined' ? localStorage.getItem("auth_token") : null;

  if (token) setAuthToken(token);

  if (!token) {
    return <Navigate to="/login-professor" replace state={{ from: loc }} />;
  }
  return <Outlet />;
}
