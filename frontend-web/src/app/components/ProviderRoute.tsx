import React from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Loader2 } from "lucide-react";

export const ProviderRoute: React.FC = () => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="animate-spin size-5 text-primary" />
        Checking provider authorization...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (user?.role !== "provider") {
    // If authenticated but not a provider, redirect to provider registration page
    return <Navigate to="/provider/register" replace />;
  }

  return <Outlet />;
};
