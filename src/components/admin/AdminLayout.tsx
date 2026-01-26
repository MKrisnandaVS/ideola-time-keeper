import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import ThemeToggle from "@/components/shared/ThemeToggle";
import { getCurrentUser, clearSession } from "@/services/auth.service";
import {
  LogOut,
  UserCog,
  Settings,
  Menu,
  X,
  LayoutDashboard,
} from "lucide-react";
import { toast } from "sonner";

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout = ({ children }: AdminLayoutProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getCurrentUser();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const handleLogout = () => {
    clearSession();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const navItems = [
    { path: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/admin/users", icon: UserCog, label: "Manage Users" },
    { path: "/admin/config", icon: Settings, label: "Config" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50
          bg-card border-r border-border
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full lg:w-20 lg:translate-x-0'}
          overflow-hidden flex flex-col
        `}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {sidebarOpen && (
            <div>
              <h1 className="text-lg font-bold text-primary tracking-wider">IDEOLA</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex-shrink-0 hover:bg-muted transition-all duration-200"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className={`
                w-full justify-start transition-all duration-200
                ${isActive(item.path)
                  ? 'bg-primary/10 text-primary hover:bg-primary/20 shadow-sm'
                  : 'hover:bg-muted'
                }
              `}
              onClick={() => navigate(item.path)}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {sidebarOpen && (
                <span className="ml-3">
                  {item.label}
                </span>
              )}
            </Button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border space-y-3">
          {/* User Info */}
          {sidebarOpen && (
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{user?.full_name}</p>
              <p className="text-xs text-muted-foreground">@{user?.username}</p>
            </div>
          )}

          {/* Theme Toggle */}
          <div className={sidebarOpen ? "flex justify-center" : ""}>
            <ThemeToggle />
          </div>

          {/* Logout Button */}
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="w-full transition-all duration-200 hover:shadow-lg"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            {sidebarOpen && (
              <span className="ml-2">
                Logout
              </span>
            )}
          </Button>
        </div>
      </aside>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main
        className={`
          flex-1 overflow-auto
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}
        `}
      >
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-primary">IDEOLA Admin</h1>
          </div>
          <div className="w-9"></div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
