import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function AdminRoute() {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin size-6" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login?portal=admin"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  if (user?.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
