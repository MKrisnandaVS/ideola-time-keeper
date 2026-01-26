export interface TimeLog {
  id: number;
  user_name: string;
  client_name: string;
  project_type: string;
  project_name: string;
  start_time: string;
  end_time: string | null;
  duration_minutes: number | null;
}

export interface ActiveUser {
  username: string;
  full_name: string;
  client_name: string;
  project_name: string;
  start_time: string;
}

export interface ActiveSession {
  id: number;
  user_name: string;
  client_name: string;
  project_type: string;
  project_name: string;
  start_time: string;
}

export interface TimeTrackerFormData {
  user_name: string;
  client_name: string;
  project_type: string;
  project_name: string;
  start_time: string;
}

export type TimeFilter = "today" | "yesterday" | "7days" | "30days" | "365days";
export type TimeUnit = "hours" | "minutes";
