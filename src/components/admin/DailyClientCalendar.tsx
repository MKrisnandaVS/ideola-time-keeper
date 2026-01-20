import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import type { TimeLog } from "@/types";

interface DailyClientData {
  date: Date;
  totalMinutes: number;
  topClient: string;
  clientDistribution: Array<{
    clientName: string;
    minutes: number;
    percentage: number;
  }>;
}

interface DailyClientCalendarProps {
  logs: TimeLog[];
  dateRange: { start: Date; end: Date };
}

const DailyClientCalendar = ({ logs, dateRange }: DailyClientCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Generate all days in the date range
  const days = useMemo(() => {
    return eachDayOfInterval({ start: dateRange.start, end: dateRange.end });
  }, [dateRange]);

  // Process logs to get daily client data
  const dailyData = useMemo(() => {
    const dataMap = new Map<string, Map<string, number>>();
    
    // Group logs by date and client
    logs.forEach(log => {
      if (log.end_time && log.duration_minutes !== null && log.duration_minutes !== undefined) {
        const date = new Date(log.end_time).toDateString();
        if (!dataMap.has(date)) {
          dataMap.set(date, new Map());
        }
        const clientMap = dataMap.get(date)!;
        const currentMinutes = clientMap.get(log.client_name) || 0;
        clientMap.set(log.client_name, currentMinutes + log.duration_minutes);
      }
    });

    // Convert to DailyClientData array
    return days.map(day => {
      const dateStr = day.toDateString();
      const clientMap = dataMap.get(dateStr) || new Map();
      
      if (clientMap.size === 0) {
        return {
          date: day,
          totalMinutes: 0,
          topClient: "",
          clientDistribution: []
        };
      }

      // Calculate total minutes and find top client
      let totalMinutes = 0;
      let topClient = "";
      let maxMinutes = 0;
      
      const clientDistribution = Array.from(clientMap.entries()).map(([clientName, minutes]) => {
        totalMinutes += minutes;
        if (minutes > maxMinutes) {
          maxMinutes = minutes;
          topClient = clientName;
        }
        return {
          clientName,
          minutes,
          percentage: 0 // Will calculate below
        };
      });

      // Calculate percentages
      const distributionWithPercentages = clientDistribution.map(item => ({
        ...item,
        percentage: totalMinutes > 0 ? Math.round((item.minutes / totalMinutes) * 100) : 0
      }));

      return {
        date: day,
        totalMinutes,
        topClient,
        clientDistribution: distributionWithPercentages.sort((a, b) => b.minutes - a.minutes)
      };
    });
  }, [logs, days]);

  // Get intensity color based on time spent
  const getTimeIntensityColor = (totalMinutes: number) => {
    if (totalMinutes === 0) return "bg-muted";
    if (totalMinutes < 60) return "bg-blue-100 hover:bg-blue-200"; // Light blue
    if (totalMinutes < 180) return "bg-blue-200 hover:bg-blue-300"; // Medium blue
    if (totalMinutes < 360) return "bg-blue-300 hover:bg-blue-400"; // Dark blue
    return "bg-blue-400 hover:bg-blue-500"; // Very dark blue
  };

  // Format time for display
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-lg uppercase tracking-wider">
          Daily Client Time Distribution
          <span className="block text-xs normal-case text-muted-foreground font-normal mt-1">
            Hover over dates to see client time breakdown
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Weekday headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
            
            {/* Calendar days */}
            {dailyData.map((dayData, index) => {
              const isFirstOfMonth = dayData.date.getDate() === 1;
              const isSelected = selectedDate && isSameDay(selectedDate, dayData.date);
              
              return (
                <TooltipProvider key={index}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`
                          h-16 rounded-md border cursor-pointer transition-all
                          flex flex-col items-center justify-center p-1 text-xs
                          ${getTimeIntensityColor(dayData.totalMinutes)}
                          ${isSelected ? 'ring-2 ring-primary' : ''}
                          ${dayData.totalMinutes > 0 ? 'border-border' : 'border-dashed border-muted'}
                        `}
                        onClick={() => setSelectedDate(dayData.date)}
                      >
                        <div className={`font-medium ${
                          isFirstOfMonth ? 'text-primary' : 'text-foreground'
                        }`}>
                          {dayData.date.getDate()}
                        </div>
                        {dayData.totalMinutes > 0 && (
                          <div className="text-[10px] text-foreground truncate w-full px-1">
                            {dayData.topClient}
                          </div>
                        )}
                        {dayData.totalMinutes > 0 && (
                          <div className="text-[10px] text-muted-foreground">
                            {formatTime(dayData.totalMinutes)}
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-2 p-2">
                        <div className="font-semibold text-foreground">
                          {format(dayData.date, 'EEEE, MMMM d, yyyy')}
                        </div>
                        
                        {dayData.totalMinutes === 0 ? (
                          <div className="text-muted-foreground text-sm">
                            No time tracked
                          </div>
                        ) : (
                          <>
                            <div className="text-sm text-foreground">
                              Total: <span className="font-semibold">{formatTime(dayData.totalMinutes)}</span>
                            </div>
                            
                            <div className="space-y-1 mt-2">
                              {dayData.clientDistribution.map((client, idx) => (
                                <div key={idx} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <Badge 
                                      variant="secondary" 
                                      className="text-[10px] px-1 py-0"
                                    >
                                      {client.percentage}%
                                    </Badge>
                                    <span className="font-medium">{client.clientName}</span>
                                  </div>
                                  <span className="text-muted-foreground">
                                    {formatTime(client.minutes)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-100"></div>
              <span>&lt; 1 hour</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-200"></div>
              <span>1-3 hours</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-300"></div>
              <span>3-6 hours</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-400"></div>
              <span>6+ hours</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded border border-dashed border-muted"></div>
              <span>No data</span>
            </div>
          </div>

          {/* Selected date details */}
          {selectedDate && (
            <div className="border-t pt-4">
              <h4 className="font-semibold text-sm mb-2">
                Details for {format(selectedDate, 'MMMM d, yyyy')}:
              </h4>
              {(() => {
                const selectedData = dailyData.find(d => isSameDay(d.date, selectedDate));
                if (!selectedData || selectedData.totalMinutes === 0) {
                  return <p className="text-muted-foreground text-sm">No time tracked on this date</p>;
                }
                
                return (
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="font-medium">Total Time:</span> {formatTime(selectedData.totalMinutes)}
                    </div>
                    <div className="space-y-1">
                      {selectedData.clientDistribution.map((client, idx) => (
                        <div key={idx} className="flex justify-between text-xs">
                          <span>{client.clientName}</span>
                          <span className="font-medium">
                            {formatTime(client.minutes)} ({client.percentage}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DailyClientCalendar;