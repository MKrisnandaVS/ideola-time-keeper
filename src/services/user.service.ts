import { supabase } from "@/integrations/supabase/client";
import type { User, UserFormData } from "@/types";
import { hashPassword } from "@/lib/auth";

/**
 * Fetch all users from database
 */
export const fetchUsers = async () => {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, role, full_name, created_at")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as User[];
};

/**
 * Fetch user by username
 */
export const fetchUserByUsername = async (username: string) => {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, password_hash, role, full_name, created_at")
    .eq("username", username.trim())
    .maybeSingle();

  if (error) throw error;
  return data;
};

/**
 * Create new user
 */
export const createUser = async (formData: UserFormData) => {
  const passwordHash = await hashPassword(formData.password);

  const { error } = await supabase.from("users").insert({
    username: formData.username.trim(),
    password_hash: passwordHash,
    role: formData.role,
    full_name: formData.full_name.trim(),
  });

  if (error) throw error;
};

/**
 * Update existing user
 */
export const updateUser = async (userId: number, formData: UserFormData) => {
  const updateData: any = {
    username: formData.username.trim(),
    role: formData.role,
    full_name: formData.full_name.trim(),
  };

  // Only update password if provided
  if (formData.password) {
    updateData.password_hash = await hashPassword(formData.password);
  }

  const { error } = await supabase
    .from("users")
    .update(updateData)
    .eq("id", userId);

  if (error) throw error;
};

/**
 * Delete user by ID
 */
export const deleteUser = async (userId: number) => {
  const { error } = await supabase.from("users").delete().eq("id", userId);

  if (error) throw error;
};

/**
 * Fetch user full name by username (for mapping)
 */
export const fetchUserFullNames = async () => {
  const { data, error } = await supabase
    .from("users")
    .select("username, full_name");

  if (error) throw error;
  return new Map(data?.map((u) => [u.username, u.full_name]) || []);
};
