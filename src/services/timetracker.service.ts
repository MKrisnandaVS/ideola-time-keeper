import { supabase } from "@/integrations/supabase/client";
import type {
  TimeLog,
  ActiveSession,
  TimeTrackerFormData,
  TimeFilter,
} from "@/types";

/**
 * Check for active session for a user
 */
export const checkActiveSession = async (username: string) => {
  const { data, error } = await supabase
    .from("time_tracker_logs")
    .select("*")
    .eq("user_name", username)
    .is("end_time", null)
    .maybeSingle();

  if (error) throw error;
  return data as ActiveSession | null;
};

/**
 * Start time tracking session
 */
export const startTracking = async (formData: TimeTrackerFormData) => {
  const { data, error } = await supabase
    .from("time_tracker_logs")
    .insert({
      user_name: formData.user_name,
      client_name: formData.client_name,
      project_type: formData.project_type,
      project_name: formData.project_name.toUpperCase(),
      start_time: formData.start_time,
    })
    .select()
    .single();

  if (error) throw error;
  return data as ActiveSession;
};

/**
 * Stop time tracking session
 */
export const stopTracking = async (sessionId: number, startTime: string) => {
  // Record the exact end time
  const endTime = new Date().toISOString();
  
  // Calculate duration precisely using the stored timestamps
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMinutes = (end.getTime() - start.getTime()) / 60000;
  
  // Store both timestamps and calculated duration
  const { error } = await supabase
    .from("time_tracker_logs")
    .update({
      end_time: endTime,
      duration_minutes: durationMinutes
    })
    .eq("id", sessionId);

  if (error) throw error;
  
  // Return the calculated values for consistency check
  return {
    end_time: endTime,
    duration_minutes: durationMinutes
  };
};

/**
 * Fetch all active tracking sessions (no end_time)
 */
export const fetchActiveSessions = async () => {
  const { data, error } = await supabase
    .from("time_tracker_logs")
    .select("*")
    .is("end_time", null);

  if (error) throw error;
  return data as TimeLog[];
};

/**
 * Get date range based on filter
 */
export const getDateRange = (filter: TimeFilter) => {
  const now = new Date();
  const start = new Date();

  switch (filter) {
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "yesterday":
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      now.setDate(now.getDate() - 1);
      now.setHours(23, 59, 59, 999);
      break;
    case "7days":
      start.setDate(start.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      break;
    case "30days":
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      break;
    case "365days":
      start.setDate(start.getDate() - 365);
      start.setHours(0, 0, 0, 0);
      break;
  }

  return { start: start.toISOString(), end: now.toISOString() };
};

/**
 * Fetch completed logs within date range with pagination
 */
export const fetchCompletedLogs = async (
  filter: TimeFilter,
  limit: number = 1000,
  offset: number = 0
) => {
  const { start, end } = getDateRange(filter);

  const { data, error } = await supabase
    .from("time_tracker_logs")
    .select("*")
    .not("end_time", "is", null)
    .gte("end_time", start)
    .lte("end_time", end)
    .order("end_time", { ascending: false })
    .range(offset, offset + limit - 1); // Add pagination

  if (error) throw error;
  return data as TimeLog[];
};

/**
 * Fetch today's completed logs for a specific user
 */
export const fetchTodaysLogs = async (username: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const { data, error } = await supabase
    .from("time_tracker_logs")
    .select("*")
    .eq("user_name", username)
    .not("end_time", "is", null)
    .gte("end_time", today.toISOString())
    .lt("end_time", tomorrow.toISOString())
    .order("end_time", { ascending: false });

  if (error) throw error;
  return data as TimeLog[];
};
