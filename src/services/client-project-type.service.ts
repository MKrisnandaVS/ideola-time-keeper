import { supabase } from "@/integrations/supabase/client";

export interface Client {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectType {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch all clients from database
 */
export const fetchAllClients = async (): Promise<Client[]> => {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data as Client[];
};

/**
 * Fetch all project types from database
 */
export const fetchAllProjectTypes = async (): Promise<ProjectType[]> => {
  const { data, error } = await supabase
    .from("project_types")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw error;
  return data as ProjectType[];
};

/**
 * Add new client to database
 */
export const addClient = async (name: string, description?: string): Promise<Client> => {
  const { data, error } = await supabase
    .from("clients")
    .insert([{ name: name.trim(), description: description?.trim() }])
    .select()
    .single();

  if (error) throw error;
  return data as Client;
};

/**
 * Update existing client
 */
export const updateClient = async (id: number, name: string, description?: string): Promise<Client> => {
  const { data, error } = await supabase
    .from("clients")
    .update({ name: name.trim(), description: description?.trim() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as Client;
};

/**
 * Delete client by ID
 */
export const deleteClient = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id);

  if (error) throw error;
};

/**
 * Add new project type to database
 */
export const addProjectType = async (name: string, description?: string): Promise<ProjectType> => {
  const { data, error } = await supabase
    .from("project_types")
    .insert([{ name: name.trim(), description: description?.trim() }])
    .select()
    .single();

  if (error) throw error;
  return data as ProjectType;
};

/**
 * Update existing project type
 */
export const updateProjectType = async (id: number, name: string, description?: string): Promise<ProjectType> => {
  const { data, error } = await supabase
    .from("project_types")
    .update({ name: name.trim(), description: description?.trim() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data as ProjectType;
};

/**
 * Delete project type by ID
 */
export const deleteProjectType = async (id: number): Promise<void> => {
  const { error } = await supabase
    .from("project_types")
    .delete()
    .eq("id", id);

  if (error) throw error;
};

/**
 * Initialize database with default clients and project types if they don't exist
 * Handles RLS policy constraints by only checking existence and notifying admin
 */
export const initializeDatabase = async (): Promise<{needsManualSetup: boolean}> => {
  try {
    // Check if clients table exists and has data
    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id")
      .limit(1);

    if (clientsError) {
      console.error("Error checking clients table:", clientsError);
      // If it's an RLS error, we need manual setup
      if (clientsError.code === '42501') { // insufficient_privilege
        return { needsManualSetup: true };
      }
      throw clientsError;
    }

    // Check if project_types table exists and has data
    const { data: projectTypes, error: projectTypesError } = await supabase
      .from("project_types")
      .select("id")
      .limit(1);

    if (projectTypesError) {
      console.error("Error checking project_types table:", projectTypesError);
      // If it's an RLS error, we need manual setup
      if (projectTypesError.code === '42501') { // insufficient_privilege
        return { needsManualSetup: true };
      }
      throw projectTypesError;
    }

    // Return whether manual setup is needed
    const needsManualSetup = (!clients || clients.length === 0) || (!projectTypes || projectTypes.length === 0);
    return { needsManualSetup };

  } catch (error) {
    console.error("Error checking database initialization:", error);
    // Assume manual setup is needed if there are any errors
    return { needsManualSetup: true };
  }
};

/**
 * Get client names as array (for backward compatibility)
 */
export const getClientNames = async (): Promise<string[]> => {
  const clients = await fetchAllClients();
  return clients.map(client => client.name);
};

/**
 * Get project type names as array (for backward compatibility)
 */
export const getProjectTypeNames = async (): Promise<string[]> => {
  const projectTypes = await fetchAllProjectTypes();
  return projectTypes.map(pt => pt.name);
};