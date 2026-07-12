import React from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { Loader2 } from "lucide-react";

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center text-muted-foreground gap-2">
        <Loader2 className="animate-spin size-5 text-primary" />
        Checking authorization...
      </div>
    );
  }

  if (!isAuthenticated) {
    // Save the location the user was trying to go to so we can redirect them back
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <Outlet />;
};
