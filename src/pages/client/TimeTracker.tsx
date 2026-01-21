import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession, getCurrentUser } from "@/services/auth.service";
import {
  checkActiveSession as checkActiveSessionService,
  startTracking as startTrackingService,
  stopTracking as stopTrackingService,
  fetchTodaysLogs,
} from "@/services/timetracker.service";
import {
  getClientNames,
  getProjectTypeNames,
} from "@/services/client-project-type.service";
import type { ActiveSession, User, TimeLog } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Square, LogOut } from "lucide-react";
import { toast } from "sonner";
import ThemeToggle from "@/components/shared/ThemeToggle";
import DailyTask from "@/components/client/DailyTask";

const TimeTracker = () => {
  const navigate = useNavigate();
  const user = getCurrentUser() as User | null;
  const [clients, setClients] = useState<string[]>([]);
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  const [userName, setUserName] = useState(user?.username || "");
  const [clientName, setClientName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startTimeRef, setStartTimeRef] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);
  const [dailyLogs, setDailyLogs] = useState<TimeLog[]>([]);
  const lastFetchRef = useRef<number>(0); // Track last fetch time

  // Fetch dynamic clients and project types
  useEffect(() => {
    const fetchDynamicData = async () => {
      try {
        const [fetchedClients, fetchedProjectTypes] = await Promise.all([
          getClientNames(),
          getProjectTypeNames(),
        ]);
        
        // If we get empty arrays, use fallback values
        const finalClients = fetchedClients.length > 0 
          ? fetchedClients 
          : ["GELATO DI LENNO", "SANSPOWER", "RUMAH KAPAS", "YASINDO", "IDEOLA"];
          
        const finalProjectTypes = fetchedProjectTypes.length > 0 
          ? fetchedProjectTypes 
          : ["VISUAL IMAGE", "CAROUSEL", "VIDEO MOTION", "GENERAL"];
        
        setClients(finalClients);
        setProjectTypes(finalProjectTypes);
        setUsingFallback(fetchedClients.length === 0 || fetchedProjectTypes.length === 0);
        
        if (fetchedClients.length === 0 || fetchedProjectTypes.length === 0) {
          console.warn("Using fallback values for clients/project types");
          toast.info("Using default client and project type values");
        }
      } catch (error) {
        console.error("Error fetching dynamic data:", error);
        toast.error("Failed to load clients and project types, using defaults");
        // Fallback to default values if fetch fails
        setClients(["GELATO DI LENNO", "SANSPOWER", "RUMAH KAPAS", "YASINDO", "IDEOLA"]);
        setProjectTypes(["VISUAL IMAGE", "CAROUSEL", "VIDEO MOTION", "GENERAL"]);
      }
    };

    fetchDynamicData();
  }, []);

  // Check for active session on mount
  const checkActiveSession = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const data = await checkActiveSessionService(user.username);

      if (data) {
        setActiveSession(data);
        setUserName(data.user_name);
        setClientName(data.client_name);
        setProjectType(data.project_type);
        setProjectName(data.project_name);
        setIsTracking(true);

        // Calculate elapsed time from server start_time and store reference
        const startTime = new Date(data.start_time).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(elapsed);
        setStartTimeRef(startTime);
      }
    } catch (error) {
      console.error("Error checking active session:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Function to fetch today's logs with rate limiting
  const fetchTodaysTasks = useCallback(async () => {
    const now = Date.now();
    // Only fetch if it's been more than 30 seconds since last fetch
    if (now - lastFetchRef.current < 30000) {
      return; // Skip fetch if less than 30 seconds have passed
    }
    
    lastFetchRef.current = now;
    
    if (user?.username) {
      try {
        const logs = await fetchTodaysLogs(user.username);
        setDailyLogs(logs || []);
      } catch (error) {
        console.error("Error fetching today's logs:", error);
        // Set to empty array if there's an error to prevent further issues
        setDailyLogs([]);
      }
    } else {
      // If user is not available, set to empty array
      setDailyLogs([]);
    }
  }, [user]); // Keep user in dependency but be careful with effects that use this

  useEffect(() => {
    checkActiveSession();
  }, [checkActiveSession]);

  // Fetch today's logs when component mounts
  useEffect(() => {
    if (user) {
      fetchTodaysTasks();
    }
  }, [user, fetchTodaysTasks]); // Include fetchTodaysTasks in dependencies
  
  // Refresh daily logs periodically (every 5 minutes) when tracking is not active
  useEffect(() => {
    if (!isTracking) {
      const interval = setInterval(() => {
        fetchTodaysTasks();
      }, 300000); // 5 minutes = 300000 ms
      
      return () => clearInterval(interval);
    }
  }, [isTracking, fetchTodaysTasks]);

  // Handle browser close/unload to stop tracking automatically
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (isTracking && activeSession) {
        try {
          // Get Supabase configuration from environment
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
          
          if (supabaseUrl && supabaseAnonKey) {
            // Send a request directly to Supabase REST API using fetch
            const endTime = new Date().toISOString();
            
            fetch(`${supabaseUrl}/rest/v1/time_tracker_logs?id=eq.${activeSession.id}`, {
              method: 'PATCH',
              headers: {
                'apikey': supabaseAnonKey,
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
              },
              body: JSON.stringify({
                end_time: endTime,
                duration_minutes: (new Date(endTime).getTime() - new Date(activeSession.start_time).getTime()) / 60000
              }),
              // The keepalive option allows the request to outlive the page
              keepalive: true,
            }).catch(error => {
              // Silently handle errors since page is unloading
              console.error("Error in beforeunload request to Supabase:", error);
            });
          }
          
          // Update local state to reflect stopped tracking
          setIsTracking(false);
          setActiveSession(null);
          setElapsedSeconds(0);
          setStartTimeRef(null);
        } catch (error) {
          console.error("Error preparing to stop tracking on browser close:", error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isTracking, activeSession]);



  // Timer interval - calculate actual elapsed time from start_time
  useEffect(() => {
    if (!isTracking) return;

    const updateElapsedTime = () => {
      // Always prioritize startTimeRef if available (more accurate)
      if (startTimeRef !== null) {
        const now = Date.now();
        const elapsed = Math.floor((now - startTimeRef) / 1000);
        setElapsedSeconds(elapsed);
      } else if (activeSession) {
        // Fallback to server start_time if we don't have startTimeRef
        const serverStartTime = new Date(activeSession.start_time).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - serverStartTime) / 1000);
        setElapsedSeconds(elapsed);
      }
    };

    // Update immediately to ensure accurate time
    updateElapsedTime();

    const interval = setInterval(updateElapsedTime, 1000);
    
    return () => clearInterval(interval);
  }, [isTracking, activeSession, startTimeRef]); // This dependency array looks correct

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    // Using template literals with padStart for consistent formatting
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = async () => {
    if (!userName || !clientName || !projectType || !projectName.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    try {
      const data = await startTrackingService({
        user_name: userName,
        client_name: clientName,
        project_type: projectType,
        project_name: projectName.toUpperCase(),
        start_time: new Date().toISOString(),
      });

      // Update state only after successful API call
      setElapsedSeconds(0);
      setActiveSession(data);
      setIsTracking(true);
      // Set start time reference from the server timestamp to ensure accuracy
      setStartTimeRef(new Date(data.start_time).getTime());
      toast.success("Tracking started!");
    } catch (error) {
      console.error("Error starting tracking:", error);
      toast.error("Failed to start tracking");
    }
  };

  const handleStop = async () => {
    if (!activeSession) return;

    try {
      await stopTrackingService(activeSession.id, activeSession.start_time);

      // Update state first to give immediate feedback to user
      setIsTracking(false);
      setActiveSession(null);
      setElapsedSeconds(0);
      setStartTimeRef(null); // Reset start time reference
      setClientName("");
      setProjectType("");
      setProjectName("");
      
      toast.success("Tracking stopped!");
      
    } catch (error) {
      console.error("Error stopping tracking:", error);
      toast.error("Failed to stop tracking");
    }
  };

  const handleLogout = () => {
    if (isTracking) {
      toast.error("Please stop tracking before logging out");
      return;
    }
    clearSession();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed Header with Theme Toggle */}
      <header className="sticky top-0 z-50 bg-background border-b border-border py-3 px-4">
        <div className="flex justify-end">
          <ThemeToggle />
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="container mx-auto px-4 sm:px-12 lg:px-16 w-full">
          <div className="flex justify-center">
            <Card className="w-full max-w-md bg-card border-border">
          <CardContent className="p-6">
            {/* Logo/Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-primary tracking-wider">
                IDEOLA
              </h1>
              <p className="text-muted-foreground text-sm uppercase tracking-widest">
                Time Tracker
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Logged in as: <span className="font-semibold">{user?.full_name}</span> (@{user?.username})
              </p>
            </div>

          {isTracking ? (
            /* Active Tracking View */
            <div className="space-y-6">
              {/* Timer Display */}
              <div className="text-center">
                <div className="text-6xl font-mono font-bold text-primary tracking-wider">
                  {formatTime(elapsedSeconds)}
                </div>
              </div>

              {/* Session Info */}
              <div className="text-center space-y-1">
                <p className="text-foreground uppercase font-semibold">
                  {activeSession?.client_name} - {activeSession?.project_type}
                </p>
                <p className="text-muted-foreground uppercase text-sm">
                  {activeSession?.project_name}
                </p>
              </div>

              {/* Stop Button */}
              <Button
                onClick={handleStop}
                className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground uppercase font-bold py-6"
              >
                <Square className="w-5 h-5 mr-2" />
                Stop Tracking
              </Button>
            </div>
          ) : (
            /* Idle View - Input Form */
            <div className="space-y-4">
              {/* Client Name */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Client Name
                </label>
                <Select value={clientName} onValueChange={setClientName}>
                  <SelectTrigger className="uppercase bg-input border-border text-foreground">
                    <SelectValue placeholder="SELECT CLIENT" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {clients.map((client) => (
                      <SelectItem
                        key={client}
                        value={client}
                        className="uppercase text-foreground"
                      >
                        {client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project Type */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Project Type
                </label>
                <Select value={projectType} onValueChange={setProjectType}>
                  <SelectTrigger className="uppercase bg-input border-border text-foreground">
                    <SelectValue placeholder="SELECT TYPE" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {projectTypes.map((type) => (
                      <SelectItem
                        key={type}
                        value={type}
                        className="uppercase text-foreground"
                      >
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Project Name */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  Project Name
                </label>
                <Input
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value.toUpperCase())}
                  placeholder="ENTER PROJECT NAME"
                  className="uppercase bg-input border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>

              {/* Start Button */}
              <Button
                onClick={handleStart}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground uppercase font-bold py-6 mt-6"
              >
                <Play className="w-5 h-5 mr-2" />
                Start Tracking
              </Button>

              {/* Logout Button */}
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full uppercase font-bold py-3"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </CardContent>
          </Card>
          <DailyTask logs={dailyLogs} username={user?.username} fullName={user?.full_name} />
        </div>
      </div>
    </div>
  </div>
  );
};

export default TimeTracker;
