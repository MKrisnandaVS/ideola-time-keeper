import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clearSession, getCurrentUser } from "@/services/auth.service";
import {
  fetchActiveSessions,
  fetchCompletedLogs,
} from "@/services/timetracker.service";
import { fetchUserFullNames } from "@/services/user.service";
import type { TimeLog, ActiveUser, TimeFilter, TimeUnit } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  LogOut,
  UserCog,
  Clock,
  Settings,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ThemeToggle from "@/components/shared/ThemeToggle";
import MonthlyClientCalendar from "@/components/admin/MonthlyClientCalendar";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("7days");
  const [timeUnit, setTimeUnit] = useState<TimeUnit>("hours");
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [allLogs, setAllLogs] = useState<TimeLog[]>([]); // Filtered logs for charts
  const [unfilteredLogs, setUnfilteredLogs] = useState<TimeLog[]>([]); // All logs for calendar
  const [allUsers, setAllUsers] = useState<string[]>([]);
  const [allClients, setAllClients] = useState<string[]>([]);
  
  // Filters for charts
  const [selectedUserForProjectType, setSelectedUserForProjectType] = useState<string>("all");
  const [selectedClientForProjectType, setSelectedClientForProjectType] = useState<string>("all");
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [timeFilter]);

  useEffect(() => {
    // Fetch active users immediately on mount
    fetchActiveUsers();
    
    // Then refresh every 30 seconds
    const interval = setInterval(() => {
      fetchActiveUsers();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []); // Empty dependency - runs once on mount and sets up interval

  const fetchActiveUsers = async () => {
    try {
      // Get active sessions (no end_time)
      const activeLogs = await fetchActiveSessions();

      if (!activeLogs || activeLogs.length === 0) {
        setActiveUsers([]);
        return;
      }

      // Get user details only if needed
      const userMap = await fetchUserFullNames();

      const active: ActiveUser[] = activeLogs.map(log => {
        const startTime = new Date(log.start_time).getTime();
        const now = Date.now();
        const elapsedMinutes = Math.floor((now - startTime) / 60000);

        return {
          username: log.user_name,
          full_name: userMap.get(log.user_name) || log.user_name,
          client_name: log.client_name,
          project_name: log.project_name,
          elapsed_minutes: elapsedMinutes,
        };
      });

      setActiveUsers(active);
    } catch (error) {
      console.error("Error fetching active users:", error);
    }
  };

  const fetchDashboardData = async () => {
    try {
      // Fetch both filtered and unfiltered logs simultaneously for efficiency
      const [filteredLogs, allTimeLogs] = await Promise.all([
        fetchCompletedLogs(timeFilter, 1000, 0), // For charts
        fetchCompletedLogs("365days", 5000, 0)   // For calendar (reduced from 10000 to 5000 for efficiency)
      ]);

      setAllLogs(filteredLogs || []);
      setUnfilteredLogs(allTimeLogs || []);

      // Extract unique users and clients from filtered logs
      const users = [...new Set((filteredLogs || []).map(log => log.user_name))];
      const clients = [...new Set((filteredLogs || []).map(log => log.client_name))];
      
      setAllUsers(users);
      setAllClients(clients);

      // Don't fetch active users here anymore since we have realtime
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Active Users Display
  const renderActiveUsers = () => {
    if (activeUsers.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-4">
          No active tracking sessions
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {activeUsers.map((activeUser, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
          >
            <div>
              <p className="font-semibold text-foreground">
                {activeUser.full_name} <span className="text-xs text-muted-foreground">(@{activeUser.username})</span>
              </p>
              <p className="text-sm text-muted-foreground">
                {activeUser.client_name} - {activeUser.project_name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-mono font-bold text-primary">
                {activeUser.elapsed_minutes} min
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 2. Total Time per Client & Total Time per User (Memoized)
  const getTimePerClientData = useMemo(() => {
    const clientTime: { [key: string]: number } = {};
    allLogs.forEach(log => {
      const minutes = log.duration_minutes || 0;
      clientTime[log.client_name] = (clientTime[log.client_name] || 0) + minutes;
    });
    
    return Object.entries(clientTime)
      .map(([name, minutes]) => ({
        name,
        value: timeUnit === "hours" 
          ? Math.round((minutes / 60) * 10) / 10 
          : Math.round(minutes),
      }))
      .sort((a, b) => b.value - a.value);
  }, [allLogs, timeUnit]);

  const getTimePerUserData = useMemo(() => {
    const userTime: { [key: string]: number } = {};
    allLogs.forEach(log => {
      const minutes = log.duration_minutes || 0;
      userTime[log.user_name] = (userTime[log.user_name] || 0) + minutes;
    });
    
    return Object.entries(userTime)
      .map(([name, minutes]) => ({
        name,
        value: timeUnit === "hours" 
          ? Math.round((minutes / 60) * 10) / 10 
          : Math.round(minutes),
      }))
      .sort((a, b) => b.value - a.value);
  }, [allLogs, timeUnit]);

  // 3. Total Time per Project Type by User (Memoized)
  const getProjectTypeByUserData = useMemo(() => {
    const filtered = selectedUserForProjectType === "all" 
      ? allLogs 
      : allLogs.filter(log => log.user_name === selectedUserForProjectType);

    const projectTypeTime: { [key: string]: number } = {};
    filtered.forEach(log => {
      const minutes = log.duration_minutes || 0;
      projectTypeTime[log.project_type] = (projectTypeTime[log.project_type] || 0) + minutes;
    });

    return Object.entries(projectTypeTime)
      .map(([name, minutes]) => ({
        name,
        value: timeUnit === "hours" 
          ? Math.round((minutes / 60) * 10) / 10 
          : Math.round(minutes),
      }))
      .sort((a, b) => b.value - a.value);
  }, [allLogs, timeUnit, selectedUserForProjectType]);

  // 4. Total Time per Project Type by Client (Memoized)
  const getProjectTypeByClientData = useMemo(() => {
    const filtered = selectedClientForProjectType === "all" 
      ? allLogs 
      : allLogs.filter(log => log.client_name === selectedClientForProjectType);

    const projectTypeTime: { [key: string]: number } = {};
    filtered.forEach(log => {
      const minutes = log.duration_minutes || 0;
      projectTypeTime[log.project_type] = (projectTypeTime[log.project_type] || 0) + minutes;
    });

    return Object.entries(projectTypeTime)
      .map(([name, minutes]) => ({
        name,
        value: timeUnit === "hours" 
          ? Math.round((minutes / 60) * 10) / 10 
          : Math.round(minutes),
      }))
      .sort((a, b) => b.value - a.value);
  }, [allLogs, timeUnit, selectedClientForProjectType]);

  const handleLogout = () => {
    clearSession();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  const getFilterLabel = (filter: TimeFilter) => {
    switch (filter) {
      case "today": return "Today";
      case "yesterday": return "Yesterday";
      case "7days": return "Last 7 Days";
      case "30days": return "Last 30 Days";
      case "365days": return "Last Year";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-wider">
              IDEOLA Admin Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome, {user?.full_name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Time Filter */}
            <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="yesterday">Yesterday</SelectItem>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="365days">Last Year</SelectItem>
              </SelectContent>
            </Select>

            {/* Time Unit Filter */}
            <Select value={timeUnit} onValueChange={(v) => setTimeUnit(v as TimeUnit)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="minutes">Minutes</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => navigate("/admin/users")}
              className="uppercase"
            >
              <UserCog className="w-4 h-4 mr-2" />
              Manage Users
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate("/admin/config")}
              className="uppercase"
            >
              <Settings className="w-4 h-4 mr-2" />
              Config
            </Button>
            <ThemeToggle />
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="uppercase"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* 1. Active Users */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Active Users ({activeUsers.length})
              <span className="text-xs normal-case text-muted-foreground font-normal">
                - Users currently tracking time
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>{renderActiveUsers()}</CardContent>
        </Card>

        {/* 2. Time per Client & Time per User */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Total Time per Client */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg uppercase tracking-wider">
                Total Time per Client
                <span className="block text-xs normal-case text-muted-foreground font-normal mt-1">
                  Total time logged for each client in {getFilterLabel(timeFilter).toLowerCase()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getTimePerClientData.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No data available for selected period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getTimePerClientData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      dataKey="value" 
                      fill="#8884d8" 
                      name={timeUnit === "hours" ? "Hours" : "Minutes"} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Total Time per User */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg uppercase tracking-wider">
                Total Time per User
                <span className="block text-xs normal-case text-muted-foreground font-normal mt-1">
                  Total time logged by each user in {getFilterLabel(timeFilter).toLowerCase()}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {getTimePerUserData.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No data available for selected period
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getTimePerUserData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      dataKey="value" 
                      fill="#82ca9d" 
                      name={timeUnit === "hours" ? "Hours" : "Minutes"} 
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 3. Project Type Time by User Filter */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg uppercase tracking-wider">
              Total Time per Project Type - Filter by User
              <span className="block text-xs normal-case text-muted-foreground font-normal mt-1">
                Time per project type, filtered by selected user in {getFilterLabel(timeFilter).toLowerCase()}
              </span>
            </CardTitle>
            <Select value={selectedUserForProjectType} onValueChange={setSelectedUserForProjectType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select User" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {allUsers.map(username => (
                  <SelectItem key={username} value={username}>{username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {getProjectTypeByUserData.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No data available for selected user and period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getProjectTypeByUserData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    fill="#ffc658" 
                    name={timeUnit === "hours" ? "Hours" : "Minutes"} 
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 4. Project Type Time by Client Filter */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg uppercase tracking-wider">
              Total Time per Project Type - Filter by Client
              <span className="block text-xs normal-case text-muted-foreground font-normal mt-1">
                Time per project type, filtered by selected client in {getFilterLabel(timeFilter).toLowerCase()}
              </span>
            </CardTitle>
            <Select value={selectedClientForProjectType} onValueChange={setSelectedClientForProjectType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {allClients.map(client => (
                  <SelectItem key={client} value={client}>{client}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            {getProjectTypeByClientData.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No data available for selected client and period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getProjectTypeByClientData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="value" 
                    fill="#ff8042" 
                    name={timeUnit === "hours" ? "Hours" : "Minutes"} 
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        
        {/* 5. Monthly Client Calendar */}
        <MonthlyClientCalendar 
          logs={unfilteredLogs}
        />
      </div>
    </div>
  );
};

export default AdminDashboard;
