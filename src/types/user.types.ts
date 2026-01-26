export interface User {
  id: number;
  username: string; // This will be the email from Google
  role: "admin" | "member";
  full_name: string;
  created_at: string;
  email?: string; // Google email
  avatar_url?: string; // Google avatar URL
  google_id?: string; // Google ID
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt?: number;
}

export interface UserFormData {
  username: string;
  password: string;
  role: "admin" | "member";
  full_name: string;
}

export type UserRole = "admin" | "member";
