import { supabase } from "@/integrations/supabase/client";
import type { AuthSession, User } from "@/types";
import { saveSession } from "./auth.service";

/**
 * Sign in with Google OAuth
 */
export const signInWithGoogle = async (): Promise<void> => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) {
    throw error;
  }
};

/**
 * Get current Google Auth session and create/update user in database
 */
export const handleAuthCallback = async (): Promise<{ user: User; isNewUser: boolean }> => {
  // Get the session from Supabase Auth
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !session) {
    throw new Error("Failed to get session after OAuth callback");
  }

  const {
    user: { id: googleId, email, user_metadata, avatar_url },
  } = session;

  if (!email) {
    throw new Error("Email is required from Google account");
  }

  // Call our Edge Function to handle user creation/retrieval
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://endkmpzjdpaykmccglzu.supabase.co';
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(`${supabaseUrl}/functions/v1/google-callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify({
      google_id: googleId,
      email: email,
      full_name: user_metadata?.full_name || user_metadata?.name || '',
      avatar_url: avatar_url,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to authenticate");
  }

  const data = await response.json();

  return {
    user: data.user,
    isNewUser: data.isNewUser,
  };
};

/**
 * Complete profile setup for new users
 */
export const completeProfileSetup = async (full_name: string): Promise<User> => {
  // Get session first before making the request
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Not authenticated");
  }

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://endkmpzjdpaykmccglzu.supabase.co';
  const response = await fetch(`${supabaseUrl}/functions/v1/complete-profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ full_name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to complete profile");
  }

  return await response.json();
};
