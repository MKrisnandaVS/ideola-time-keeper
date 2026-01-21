import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { format, eachDayOfInterval, isSameDay, isSameMonth, startOfMonth, endOfMonth, addMonths, subMonths, parseISO, getDay } from "date-fns";
import type { TimeLog } from "@/types";
import ClientTimelineView from "./ClientTimelineView";

interface MonthlyClientData {
  date: Date;
  topClient: string;
  topClientMinutes: number;
  clientDistribution: Array<{
    clientName: string;
    minutes: number;
    percentage: number;
  }>;
}

interface MonthlyClientCalendarProps {
  logs: TimeLog[];
  initialMonth?: Date;
}

// Predefined color palette for clients
const CLIENT_COLORS = [
  "bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", "bg-purple-500",
  "bg-pink-500", "bg-indigo-500", "bg-teal-500", "bg-orange-500", "bg-cyan-500",
  "bg-lime-500", "bg-emerald-500", "bg-violet-500", "bg-fuchsia-500", "bg-rose-500",
  "bg-sky-500", "bg-amber-500", "bg-slate-500", "bg-gray-500", "bg-zinc-500"
];

const TEXT_COLORS = [
  "text-white", "text-white", "text-white", "text-gray-900", "text-white",
  "text-white", "text-white", "text-white", "text-white", "text-gray-900",
  "text-gray-900", "text-white", "text-white", "text-white", "text-white",
  "text-white", "text-gray-900", "text-white", "text-white", "text-white"
];

const HOVER_COLORS = [
  "hover:bg-red-600", "hover:bg-blue-600", "hover:bg-green-600", "hover:bg-yellow-600", "hover:bg-purple-600",
  "hover:bg-pink-600", "hover:bg-indigo-600", "hover:bg-teal-600", "hover:bg-orange-600", "hover:bg-cyan-600",
  "hover:bg-lime-600", "hover:bg-emerald-600", "hover:bg-violet-600", "hover:bg-fuchsia-600", "hover:bg-rose-600",
  "hover:bg-sky-600", "hover:bg-amber-600", "hover:bg-slate-600", "hover:bg-gray-600", "hover:bg-zinc-600"
];

const MonthlyClientCalendar = ({ logs, initialMonth }: MonthlyClientCalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(initialMonth || new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  // Get unique clients and assign colors
  const clientColors = useMemo(() => {
    const uniqueClients = [...new Set(logs.map(log => log.client_name))];
    const colorMap = new Map<string, { bg: string; text: string; hover: string }>();
    
    uniqueClients.forEach((client, index) => {
      const colorIndex = index % CLIENT_COLORS.length;
      colorMap.set(client, {
        bg: CLIENT_COLORS[colorIndex],
        text: TEXT_COLORS[colorIndex],
        hover: HOVER_COLORS[colorIndex]
      });
    });
    
    return colorMap;
  }, [logs]);

  // Calculate days in current month
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = useMemo(() => {
    return eachDayOfInterval({ start: monthStart, end: monthEnd });
  }, [currentMonth]);

  // Calculate padding days for proper calendar alignment
  const startDayOffset = useMemo(() => {
    // getDay() returns 0 for Sunday, 1 for Monday, etc.
    return getDay(monthStart);
  }, [monthStart]);

  // Process logs to get daily client data for current month
  const monthlyData = useMemo(() => {
    const dataMap = new Map<string, Map<string, number>>();
    
    // Group logs by date and client for current month
    logs.forEach(log => {
      if (log.end_time && log.duration_minutes) {
        const logDate = new Date(log.end_time);
        // Only include logs from the current month
        if (isSameMonth(logDate, currentMonth)) {
          const dateStr = logDate.toDateString();
          if (!dataMap.has(dateStr)) {
            dataMap.set(dateStr, new Map());
          }
          const clientMap = dataMap.get(dateStr)!;
          const currentMinutes = clientMap.get(log.client_name) || 0;
          clientMap.set(log.client_name, currentMinutes + log.duration_minutes);
        }
      }
    });

    // Convert to MonthlyClientData array
    return daysInMonth.map(day => {
      const dateStr = day.toDateString();
      const clientMap = dataMap.get(dateStr) || new Map();
      
      if (clientMap.size === 0) {
        return {
          date: day,
          topClient: "",
          topClientMinutes: 0,
          clientDistribution: []
        };
      }

      // Find top client for the day
      let topClient = "";
      let topMinutes = 0;
      
      const clientDistribution = Array.from(clientMap.entries()).map(([clientName, minutes]) => {
        if (minutes > topMinutes) {
          topMinutes = minutes;
          topClient = clientName;
        }
        return {
          clientName,
          minutes,
          percentage: 0 // Will calculate below
        };
      });

      // Calculate total minutes and percentages
      const totalMinutes = Array.from(clientMap.values()).reduce((sum, min) => sum + min, 0);
      const distributionWithPercentages = clientDistribution.map(item => ({
        ...item,
        percentage: totalMinutes > 0 ? Math.round((item.minutes / totalMinutes) * 1000) / 10 : 0 // 1 decimal precision
      }));

      return {
        date: day,
        topClient,
        topClientMinutes: topMinutes,
        clientDistribution: distributionWithPercentages.sort((a, b) => b.minutes - a.minutes)
      };
    });
  }, [logs, daysInMonth, currentMonth]);

  // Get color for top client
  const getTopClientColor = (clientName: string) => {
    return clientColors.get(clientName) || { bg: "bg-muted", text: "text-foreground", hover: "" };
  };

  // Format time in xxh xxm format with 1 decimal precision
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    // Round to 1 decimal place
    const roundedHours = Math.round(hours * 10) / 10;
    const roundedMins = Math.round(mins * 10) / 10;
    
    if (hours > 0 && mins > 0) {
      return `${roundedHours}h ${roundedMins}m`;
    } else if (hours > 0) {
      return `${roundedHours}h`;
    } else {
      return `${roundedMins}m`;
    }
  };

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
    resetSelections();
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
    resetSelections();
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
    resetSelections();
  };

  // Handle date selection
  const handleDateClick = (date: Date) => {
    if (selectedDate && isSameDay(selectedDate, date)) {
      setSelectedDate(null); // Deselect if clicking the same date
      setExpandedClients(new Set()); // Also collapse all expanded clients
    } else {
      setSelectedDate(date);
      setExpandedClients(new Set()); // Reset client expansions when changing date
    }
  };

  // Handle client expansion/collapse
  const toggleClientExpansion = (clientName: string) => {
    const newExpandedClients = new Set(expandedClients);
    if (newExpandedClients.has(clientName)) {
      newExpandedClients.delete(clientName);
    } else {
      newExpandedClients.add(clientName);
    }
    setExpandedClients(newExpandedClients);
  };

  // Reset all selections
  const resetSelections = () => {
    setSelectedDate(null);
    setExpandedClients(new Set());
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg uppercase tracking-wider">
          Monthly Client Time Distribution
          <span className="block text-xs normal-case text-muted-foreground font-normal mt-1">
            {format(currentMonth, 'MMMM yyyy')}
          </span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousMonth}
            className="h-8 w-8 p-0"
          >
            &lt;
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToCurrentMonth}
            className="h-8 text-xs"
          >
            Current Month
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={goToNextMonth}
            className="h-8 w-8 p-0"
          >
            &gt;
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Weekday headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-semibold text-foreground py-2">
                {day}
              </div>
            ))}
            
            {/* Padding for first week alignment */}
            {Array.from({ length: startDayOffset }).map((_, index) => (
              <div key={`padding-${index}`} className="h-20 rounded-md border border-transparent"></div>
            ))}
            
            {/* Calendar days */}
            {monthlyData.map((dayData, index) => {
              const isToday = isSameDay(dayData.date, new Date());
              const isSelected = selectedDate && isSameDay(selectedDate, dayData.date);
              const topClientColor = getTopClientColor(dayData.topClient);
              
              return (
                <TooltipProvider key={index}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={`
                          h-20 rounded-md border cursor-pointer transition-all
                          flex flex-col items-center justify-center p-1 text-xs
                          ${topClientColor.bg} ${topClientColor.text} ${topClientColor.hover}
                          ${isToday ? 'ring-2 ring-primary ring-offset-1' : ''}
                          ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}
                          border-border
                        `}
                        onClick={() => handleDateClick(dayData.date)}
                      >
                        <div className={`font-bold ${dayData.topClientMinutes > 0 ? 'text-current' : 'text-muted-foreground'}`}>
                          {dayData.date.getDate()}
                        </div>
                        {dayData.topClientMinutes > 0 && (
                          <div className="text-[9px] font-medium text-current truncate w-full px-1 text-center leading-tight">
                            {dayData.topClient}
                          </div>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-sm overflow-y-auto max-h-64">
                      <div className="space-y-2 p-2">
                        <div className="font-semibold text-foreground">
                          {format(dayData.date, 'EEEE, MMMM d, yyyy')}
                        </div>
                        
                        {dayData.clientDistribution.length === 0 ? (
                          <div className="text-muted-foreground text-sm">
                            No time tracked
                          </div>
                        ) : (
                          <>
                            <div className="text-sm text-foreground">
                              Top Client: <span className="font-semibold">{dayData.topClient}</span>
                            </div>
                            
                            <div className="space-y-1 mt-2 max-h-40 overflow-y-auto">
                              {dayData.clientDistribution.map((client, idx) => {
                                const clientColor = clientColors.get(client.clientName) || { bg: "bg-gray-200", text: "text-gray-800" };
                                return (
                                  <div key={idx} className="flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                      <Badge 
                                        className={`${clientColor.bg} ${clientColor.text} text-[10px] px-1 py-0 flex-shrink-0`}
                                      >
                                        {client.percentage}%
                                      </Badge>
                                      <span className="font-medium truncate">{client.clientName}</span>
                                    </div>
                                    <span className="text-muted-foreground font-medium ml-2 whitespace-nowrap">
                                      {formatTime(client.minutes)}
                                    </span>
                                  </div>
                                );
                              })}
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
            {Array.from(clientColors.entries()).slice(0, 8).map(([clientName, colors]) => (
              <div key={clientName} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded ${colors.bg}`}></div>
                <span className="truncate max-w-[100px]">{clientName}</span>
              </div>
            ))}
            {clientColors.size > 8 && (
              <div className="text-muted-foreground">
                +{clientColors.size - 8} more clients
              </div>
            )}
          </div>

          {/* Selected Date Detail */}
          {selectedDate && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg">
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedDate(null)}
                  className="h-6 w-6 p-0"
                >
                  ×
                </Button>
              </div>
              
              {(() => {
                const selectedDayData = monthlyData.find(d => isSameDay(d.date, selectedDate));
                if (!selectedDayData || selectedDayData.clientDistribution.length === 0) {
                  return <p className="text-muted-foreground">No time tracked on this date</p>;
                }
                
                return (
                  <div className="space-y-2">
                    {selectedDayData.clientDistribution.map((client, idx) => {
                      const clientColor = clientColors.get(client.clientName) || { bg: "bg-gray-200", text: "text-gray-800" };
                      const isExpanded = expandedClients.has(client.clientName);
                      
                      return (
                        <div key={idx}>
                          <div 
                            className={`flex items-center justify-between p-3 rounded-md cursor-pointer transition-colors hover:bg-muted ${
                              isExpanded ? 'ring-2 ring-primary' : ''
                            }`}
                            onClick={() => toggleClientExpansion(client.clientName)}
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <Badge 
                                className={`${clientColor.bg} ${clientColor.text} text-xs px-2 py-1`}
                              >
                                {client.percentage}%
                              </Badge>
                              <span className="font-medium">{client.clientName}</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className="text-muted-foreground">{formatTime(client.minutes)}</span>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-6 px-2"
                              >
                                {isExpanded ? '▼' : '▶'}
                              </Button>
                            </div>
                          </div>
                          
                          {/* Client Timeline View - appears below the client entry */}
                          {isExpanded && (
                            <div className="mt-3 ml-4 mr-2 border-l-2 border-border pl-4">
                              <ClientTimelineView
                                logs={logs}
                                selectedDate={selectedDate!}
                                selectedClient={client.clientName}
                                onClose={() => toggleClientExpansion(client.clientName)}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
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

export default MonthlyClientCalendar;