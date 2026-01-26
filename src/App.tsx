import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { isAuthenticated, isAdmin, isMember } from "@/services/auth.service";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import Login from "./pages/auth/Login";
import AuthCallback from "./pages/auth/AuthCallback";
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/UserManagement";
import ClientProjectTypeManagement from "./pages/admin/ClientProjectTypeManagement";
import TimeTracker from "./pages/client/TimeTracker";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/shared/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => {
  // Redirect root based on authentication
  const RootRedirect = () => {
    if (!isAuthenticated()) {
      return <Navigate to="/login" replace />;
    }
    if (isAdmin()) {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (isMember()) {
      return <Navigate to="/tracker" replace />;
    }
    return <Navigate to="/login" replace />;
  };

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />

                {/* Auth Callback Route */}
                <Route path="/auth/callback" element={<AuthCallback />} />

                {/* Root redirect */}
                <Route path="/" element={<RootRedirect />} />

                {/* Client Routes */}
                <Route
                  path="/tracker"
                  element={
                    <ProtectedRoute requireRole="member">
                      <TimeTracker />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Routes */}
                <Route
                  path="/admin/dashboard"
                  element={
                    <ProtectedRoute requireRole="admin">
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute requireRole="admin">
                      <UserManagement />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/settings"
                  element={
                    <ProtectedRoute requireRole="admin">
                      <ClientProjectTypeManagement />
                    </ProtectedRoute>
                  }
                />

                {/* Catch-all 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
