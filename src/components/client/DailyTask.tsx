import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, X } from "lucide-react";
import { toast } from "sonner";
import type { TimeLog } from "@/types";

interface DailyTaskProps {
  logs: TimeLog[];
  username?: string;
  fullName?: string;
}

const DailyTask = ({ logs, username, fullName }: DailyTaskProps) => {
  // Check if current date has changed since last viewed
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayString = today.toISOString().split('T')[0];

  // Get stored date to compare
  const storedDate = localStorage.getItem('dailyTaskViewDate');
  if (storedDate !== todayString) {
    // Clear any stored visibility preference when date changes
    localStorage.removeItem('dailyTaskVisible');
  }
  // Update stored date
  localStorage.setItem('dailyTaskViewDate', todayString);

  // Always show the component (remove user preference functionality)
  const isComponentVisible = true;

  // Filter logs for today's completed tasks for this specific user
  const todayLogs = logs.filter(log => {
    if (!log.end_time) return false;
    const logDate = new Date(log.end_time);
    logDate.setHours(0, 0, 0, 0);
    return logDate.getTime() === today.getTime() && 
           log.duration_minutes !== null &&
           log.user_name === username; // Only show tasks for the current user
  }).sort((a, b) => {
    // Sort by start_time to ensure tasks are ordered chronologically
    return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
  });

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false }); // Format: HH:MM in 24-hour format
  };

  const formatDuration = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const formatDurationWithSeconds = (minutes: number) => {
    const totalSeconds = Math.floor(minutes * 60);
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    
    return `(${hrs}h ${mins}m ${secs}s)`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${dayName}, ${day} ${month} ${year}`;
  };

  const copyAllTasksInfo = () => {
    if (todayLogs.length === 0) return;
    
    const userFullName = fullName || username || 'User';
    const currentDate = new Date();
    const formattedDate = formatDate(currentDate.toISOString());
    
    const header = `${userFullName}\n${formattedDate}`;
    
    const tasksInfo = todayLogs.map(log => 
      `${formatDateTime(log.start_time)} - ${formatDateTime(log.end_time || '')} ${formatDurationWithSeconds(log.duration_minutes || 0)} : (${log.client_name}) ${log.project_name}`
    ).join('\n');
    
    const allTasksInfo = `${header}\n${tasksInfo}`;
    
    navigator.clipboard.writeText(allTasksInfo).then(() => {
      toast.success(`Copied ${todayLogs.length} task(s) information to clipboard!`);
    }).catch(err => {
      console.error('Failed to copy: ', err);
      toast.error("Failed to copy task information");
    });
  };

  // Show the component if there are logs (always visible)
  if (todayLogs.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-96 overflow-hidden"> {/* Increased width from w-80 to w-96 */}
      <Card className="border-border shadow-lg bg-card">
        <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Daily Tasks</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyAllTasksInfo}
            className="h-6 w-6 p-0"
            title="Copy all tasks information"
          >
            <Copy className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="px-4 pb-4 max-h-80 overflow-y-auto">
          <div className="space-y-3">
            {todayLogs.map((log, index) => (
              <div 
                key={`${log.id}-${index}`} 
                className="border border-border rounded p-3 bg-muted/30"
              >
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <p className="font-medium text-sm truncate">{log.client_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{log.project_type}</p>
                  </div>
                  <div className="col-span-5">
                    <p className="text-xs text-muted-foreground truncate">{log.project_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{formatDateTime(log.start_time)} - {formatDateTime(log.end_time)}</p>
                  </div>
                  <div className="col-span-3 text-right">
                    <span className="text-xs font-medium">{formatDuration(log.duration_minutes || 0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DailyTask;