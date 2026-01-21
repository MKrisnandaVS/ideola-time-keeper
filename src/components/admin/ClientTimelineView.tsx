import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, parseISO, isSameDay } from "date-fns";
import type { TimeLog } from "@/types";

interface ClientTimelineViewProps {
  logs: TimeLog[];
  selectedDate: Date;
  selectedClient: string;
}

// Predefined color palette for project types
const PROJECT_TYPE_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500", "bg-orange-500",
  "bg-red-500", "bg-indigo-500", "bg-pink-500", "bg-teal-500",
  "bg-yellow-500", "bg-cyan-500"
];

const TEXT_COLORS = [
  "text-white", "text-white", "text-white", "text-white",
  "text-white", "text-white", "text-white", "text-white",
  "text-gray-900", "text-gray-900"
];

const ClientTimelineView = ({ logs, selectedDate, selectedClient, onClose }: ClientTimelineViewProps) => {
  const [hoveredSession, setHoveredSession] = useState<TimeLog | null>(null);

  // Get project type colors
  const projectTypeColors = useMemo(() => {
    const uniqueProjectTypes = [...new Set(logs.map(log => log.project_type))];
    const colorMap = new Map<string, { bg: string; text: string }>();
    
    uniqueProjectTypes.forEach((projectType, index) => {
      const colorIndex = index % PROJECT_TYPE_COLORS.length;
      colorMap.set(projectType, {
        bg: PROJECT_TYPE_COLORS[colorIndex],
        text: TEXT_COLORS[colorIndex]
      });
    });
    
    return colorMap;
  }, [logs]);

  // Filter and process logs for selected date and client
  const filteredLogs = useMemo(() => {
    return logs
      .filter(log => 
        log.end_time && 
        log.duration_minutes &&
        isSameDay(parseISO(log.end_time), selectedDate) &&
        log.client_name === selectedClient
      )
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [logs, selectedDate, selectedClient]);

  // Get unique users who worked on this client on this date
  const users = useMemo(() => {
    return [...new Set(filteredLogs.map(log => log.user_name))].sort();
  }, [filteredLogs]);

  // Format time for display
  const formatTime = (minutes: number) => {
    const totalMinutes = Math.ceil(minutes); // Pembulatan ke atas
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  // Calculate dynamic time range based on data or default to 09:00-17:00
  const getTimeRange = () => {
    if (filteredLogs.length === 0) {
      return { startHour: 9, endHour: 17 };
    }
    
    let minHour = 24;
    let maxHour = 0;
    
    filteredLogs.forEach(log => {
      const startDate = new Date(log.start_time);
      const endDate = new Date(log.end_time!);
      
      minHour = Math.min(minHour, startDate.getHours());
      maxHour = Math.max(maxHour, endDate.getHours());
    });
    
    // Expand range slightly for better visualization
    const startHour = Math.max(9, minHour - 1);
    const endHour = Math.min(17, maxHour + 1);
    
    // Ensure minimum 4-hour range
    if (endHour - startHour < 4) {
      const mid = Math.floor((startHour + endHour) / 2);
      return { 
        startHour: Math.max(9, mid - 2), 
        endHour: Math.min(17, mid + 2) 
      };
    }
    
    return { startHour, endHour };
  };

  const { startHour, endHour } = getTimeRange();
  const totalHours = endHour - startHour;

  // Convert time to position based on dynamic range
  const timeToPosition = (timeString: string) => {
    const date = new Date(timeString);
    const hours = date.getHours() + date.getMinutes() / 60;
    
    if (hours < startHour) return 0;
    if (hours > endHour) return 100;
    
    return ((hours - startHour) / totalHours) * 100;
  };

  // Calculate bar width based on duration
  const getBarWidth = (startTime: string, endTime: string) => {
    const start = timeToPosition(startTime);
    const end = timeToPosition(endTime);
    return Math.max(end - start, 2); // Minimum 2% width
  };

  // Get readable time format
  const formatReadableTime = (timeString: string) => {
    return format(parseISO(timeString), 'HH:mm');
  };

  if (filteredLogs.length === 0) {
    return (
      <Card className="mt-4 bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-md">
            Timeline for {selectedClient} on {format(selectedDate, 'MMM d, yyyy')}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No time tracked for {selectedClient} on this date
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4 bg-card border-border">
      <CardHeader>
        <CardTitle className="text-md">
          Timeline for {selectedClient} on {format(selectedDate, 'MMM d, yyyy')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Time axis */}
          <div className="relative h-8 border-b border-border">
            {Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i)
              .filter(hour => hour <= endHour)
              .map(hour => (
                <div 
                  key={hour} 
                  className="absolute text-xs text-muted-foreground"
                  style={{ left: `${((hour - startHour) / totalHours) * 100}%` }}
                >
                  {hour}:00
                </div>
              ))}
          </div>

          {/* User swimlanes */}
          <div className="space-y-4">
            {users.map(user => {
              const userLogs = filteredLogs.filter(log => log.user_name === user);
              
              return (
                <div key={user} className="space-y-2">
                  <div className="font-medium text-sm text-foreground pl-2">
                    {user}
                  </div>
                  
                  <div className="relative h-12 bg-muted/30 rounded border border-border">
                    {userLogs.map((log, index) => {
                      const startPos = timeToPosition(log.start_time);
                      const width = getBarWidth(log.start_time, log.end_time!);
                      const projectColor = projectTypeColors.get(log.project_type) || { bg: "bg-gray-400", text: "text-white" };
                      
                      return (
                        <TooltipProvider key={index}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute top-1 h-10 rounded cursor-pointer transition-all hover:opacity-80 ${projectColor.bg}`}
                                style={{
                                  left: `${startPos}%`,
                                  width: `${width}%`
                                }}
                                onMouseEnter={() => setHoveredSession(log)}
                                onMouseLeave={() => setHoveredSession(null)}
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="space-y-1 p-2">
                                <div className="font-semibold">{log.project_type}</div>
                                <div className="text-sm">{log.project_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {formatReadableTime(log.start_time)} - {formatReadableTime(log.end_time!)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Duration: {formatTime(log.duration_minutes!)}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-border">
            <span className="text-sm font-medium text-foreground">Project Types:</span>
            {Array.from(projectTypeColors.entries()).map(([projectType, colors]) => (
              <div key={projectType} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${colors.bg}`}></div>
                <span className="text-xs">{projectType}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ClientTimelineView;