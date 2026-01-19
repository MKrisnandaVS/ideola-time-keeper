import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession, getCurrentUser } from "@/services/auth.service";
import {
  checkActiveSession as checkActiveSessionService,
  startTracking as startTrackingService,
  stopTracking as stopTrackingService,
} from "@/services/timetracker.service";
import {
  getClientNames,
  getProjectTypeNames,
} from "@/services/client-project-type.service";
import type { ActiveSession } from "@/types";
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

const TimeTracker = () => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const [clients, setClients] = useState<string[]>([]);
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  const [userName, setUserName] = useState(user?.username || "");
  const [clientName, setClientName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [usingFallback, setUsingFallback] = useState(false);

  // Fetch dynamic clients and project types
  useEffect(() => {
    const fetchDynamicData = async () => {
      try {
        console.log("Fetching client and project type data...");
        const [fetchedClients, fetchedProjectTypes] = await Promise.all([
          getClientNames(),
          getProjectTypeNames(),
        ]);
        
        console.log("Fetched clients:", fetchedClients);
        console.log("Fetched project types:", fetchedProjectTypes);
        
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

        // Calculate elapsed time from server start_time
        const startTime = new Date(data.start_time).getTime();
        const now = Date.now();
        const elapsed = Math.floor((now - startTime) / 1000);
        setElapsedSeconds(elapsed);
      }
    } catch (error) {
      console.error("Error checking active session:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkActiveSession();
  }, [checkActiveSession]);

  // Timer interval
  useEffect(() => {
    if (!isTracking) return;
    
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isTracking]);

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
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

      setActiveSession(data);
      setIsTracking(true);
      setElapsedSeconds(0);
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

      setIsTracking(false);
      setActiveSession(null);
      setElapsedSeconds(0);
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
    </div>
  </div>
  );
};

export default TimeTracker;
