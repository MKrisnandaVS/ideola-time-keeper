import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getCurrentUser } from "@/services/auth.service";
import {
  fetchActiveSessions,
  fetchCompletedLogs,
} from "@/services/timetracker.service";
import { fetchUserFullNames } from "@/services/user.service";
import type { TimeLog, ActiveUser, TimeFilter, TimeUnit } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Activity, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminLayout } from "@/components/admin/AdminLayout";
import MonthlyClientCalendar from "@/components/admin/MonthlyClientCalendar";

// Color palette that works for both light and dark modes
const COLORS = [
  'hsl(var(--primary))',           // Primary color
  'hsl(221, 83%, 53%)',             // Blue
  'hsl(142, 71%, 45%)',             // Green
  'hsl(38, 92%, 50%)',              // Orange
  'hsl(346, 77%, 50%)',             // Pink
  'hsl(262, 83%, 58%)',             // Purple
  'hsl(173, 80%, 40%)',             // Teal
  'hsl(28, 100%, 53%)',             // Amber
];

const AdminDashboard = () => {
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
  const [currentTime, setCurrentTime] = useState<number>(Date.now()); // For real-time elapsed time updates

  useEffect(() => {
    fetchDashboardData();
  }, [timeFilter]);

  // Update current time every second for real-time elapsed display
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Fetch active users immediately on mount
    fetchActiveUsers();

    // Set up Supabase realtime subscription for time_tracker_logs
    const channel = supabase
      .channel('time_tracker_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'time_tracker_logs'
        },
        () => {
          // Refetch active users when there's any change
          fetchActiveUsers();
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Empty dependency - runs once on mount and sets up subscription

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
        return {
          username: log.user_name,
          full_name: userMap.get(log.user_name) || log.user_name,
          client_name: log.client_name,
          project_name: log.project_name,
          start_time: log.start_time,
        };
      });

      setActiveUsers(active);
    } catch (error) {
      console.error("Error fetching active users:", error);
    }
  };

  // Format seconds to HH:MM:SS
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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
        {activeUsers.map((activeUser, index) => {
          // Calculate elapsed time in real-time
          const startTime = new Date(activeUser.start_time).getTime();
          const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);

          return (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-muted/30 rounded-xl border border-border hover:bg-muted/50 transition-colors"
            >
              <div>
                <p className="font-semibold text-foreground">
                  {activeUser.full_name} <span className="text-xs text-muted-foreground">(@{activeUser.username})</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {activeUser.client_name} - {activeUser.project_name}
                </p>
              </div>
              <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg">
                <Clock className="w-4 h-4 text-primary animate-pulse" />
                <span className="text-sm font-mono font-bold text-primary">
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
            </div>
          );
        })}
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
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-foreground">Loading dashboard...</div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {/* Filters Section */}
      <Card className="mb-6 bg-card border-border rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg uppercase tracking-wider">
            Dashboard Filters
            <span className="block text-xs normal-case text-muted-foreground font-normal mt-1">
              Filter data by time period and unit
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Time Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Time Period
              </label>
              <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeFilter)}>
                <SelectTrigger className="w-full">
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
            </div>

            {/* Time Unit Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">
                Display Unit
              </label>
              <Select value={timeUnit} onValueChange={(v) => setTimeUnit(v as TimeUnit)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hours">Hours</SelectItem>
                  <SelectItem value="minutes">Minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {/* 1. Active Users */}
        <Card className="bg-card border-border rounded-xl hover:shadow-lg transition-shadow duration-200">
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
          {/* Total Time per Client - Horizontal Bar Chart */}
          <Card className="bg-card border-border rounded-xl">
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
                  <BarChart data={getTimePerClientData} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" className="stroke-muted" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                    />
                    <Legend />
                    <Bar
                      dataKey="value"
                      fill="hsl(var(--primary))"
                      name={timeUnit === "hours" ? "Hours" : "Minutes"}
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Total Time per User - Pie Chart */}
          <Card className="bg-card border-border rounded-xl">
            <CardHeader>
              <CardTitle className="text-lg uppercase tracking-wider">
                Total Time per User
                <span className="block text-xs normal-case text-muted-foreground font-normal mt-1">
                  Time distribution by user in {getFilterLabel(timeFilter).toLowerCase()}
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
                  <PieChart>
                    <Pie
                      data={getTimePerUserData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value} ${timeUnit}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {getTimePerUserData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))'
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 3. Project Type Time by User Filter - Bar Chart */}
        <Card className="bg-card border-border rounded-xl">
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
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" className="stroke-muted" />
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="value"
                    fill="hsl(221, 83%, 53%)"
                    name={timeUnit === "hours" ? "Hours" : "Minutes"}
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 4. Project Type Time by Client Filter - Pie Chart */}
        <Card className="bg-card border-border rounded-xl">
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
                <PieChart>
                  <Pie
                    data={getProjectTypeByClientData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {getProjectTypeByClientData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* 5. Monthly Client Calendar */}
        <MonthlyClientCalendar
          logs={unfilteredLogs}
        />
      </div>
      </AdminLayout>
    );
  };

export default AdminDashboard;
