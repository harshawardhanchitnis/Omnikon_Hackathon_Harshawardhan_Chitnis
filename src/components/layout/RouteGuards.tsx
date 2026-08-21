import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppStore } from "@/store/app-store";

export function ProtectedRoute() {
  const mode = useAppStore((state) => state.mode);
  const location = useLocation();
  if (mode === "guest") return <Navigate to="/auth" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}

export function AdminRoute() {
  const mode = useAppStore((state) => state.mode);
  if (mode !== "admin" && mode !== "demo-admin") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
