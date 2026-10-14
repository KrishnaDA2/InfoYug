import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getAdminToken, getAdminUser } from "../Auth/AdminAuth";

export default function ProtectedRoute() {
  const location = useLocation();
  const token = getAdminToken();
  const user = getAdminUser();
  const isAdmin = Boolean(token && String(user?.role || "").toLowerCase() === "admin");

  if (!isAdmin) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
