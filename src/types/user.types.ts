export interface User {
  id: number;
  username: string;
  role: "admin" | "client";
  full_name: string;
  created_at: string;
}

export interface AuthSession {
  user: User;
  token: string;
}

export interface UserFormData {
  username: string;
  password: string;
  role: "admin" | "client";
  full_name: string;
}

export type UserRole = "admin" | "client";
