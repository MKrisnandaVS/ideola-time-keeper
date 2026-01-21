import { Navigate } from "react-router-dom";
import { isAuthenticated, getCurrentUser } from "@/services/auth.service";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: "admin" | "member";
}

const ProtectedRoute = ({ children, requireRole }: ProtectedRouteProps) => {
  const authenticated = isAuthenticated();
  const user = getCurrentUser();

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireRole && user?.role !== requireRole) {
    // If role doesn't match, redirect to appropriate page
    if (user?.role === "admin") {
      return <Navigate to="/admin/dashboard" replace />;
    } else {
      return <Navigate to="/tracker" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
