import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Play, Square } from "lucide-react";
import { toast } from "sonner";

const USERS = ["KRISNANDA", "NAOMI", "RIZKA", "ZIZE"];
const CLIENTS = ["GELATO DI LENNO", "SANSPOWER", "RUMAH KAPAS", "YASINDO", "IDEOLA"];
const PROJECT_TYPES = ["VISUAL IMAGE", "CAROUSEL", "VIDEO MOTION", "GENERAL"];

interface ActiveSession {
  id: number;
  user_name: string;
  client_name: string;
  project_type: string;
  project_name: string;
  start_time: string;
}

const TimeTracker = () => {
  const [userName, setUserName] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [projectName, setProjectName] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("ideola_user");
    if (savedUser && USERS.includes(savedUser)) {
      setUserName(savedUser);
    }
  }, []);

  // Check for active session on mount
  const checkActiveSession = useCallback(async () => {
    const savedUser = localStorage.getItem("ideola_user");
    if (!savedUser) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("time_logs")
        .select("*")
        .eq("user_name", savedUser)
        .is("end_time", null)
        .maybeSingle();

      if (error) throw error;

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
  }, []);

  useEffect(() => {
    checkActiveSession();
  }, [checkActiveSession]);

  // Timer interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTracking) {
      interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
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
      const { data, error } = await supabase
        .from("time_logs")
        .insert({
          user_name: userName,
          client_name: clientName,
          project_type: projectType,
          project_name: projectName.toUpperCase(),
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      localStorage.setItem("ideola_user", userName);
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
      const endTime = new Date();
      const startTime = new Date(activeSession.start_time);
      const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60000;

      const { error } = await supabase
        .from("time_logs")
        .update({
          end_time: endTime.toISOString(),
          duration_minutes: durationMinutes,
        })
        .eq("id", activeSession.id);

      if (error) throw error;

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
              {/* User Name */}
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground uppercase tracking-wider">
                  User Name
                </label>
                <Select value={userName} onValueChange={setUserName}>
                  <SelectTrigger className="uppercase bg-input border-border text-foreground">
                    <SelectValue placeholder="SELECT USER" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {USERS.map((user) => (
                      <SelectItem
                        key={user}
                        value={user}
                        className="uppercase text-foreground"
                      >
                        {user}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                    {CLIENTS.map((client) => (
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
                    {PROJECT_TYPES.map((type) => (
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TimeTracker;
