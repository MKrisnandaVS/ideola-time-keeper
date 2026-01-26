// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface OAuthCallbackRequest {
  google_id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

console.info('google-callback function started');

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Connection": "keep-alive"
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' }
    });
  }

  try {
    const { google_id, email, full_name, avatar_url }: OAuthCallbackRequest = await req.json();

    if (!google_id || !email) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: google_id and email are required" }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' }
        }
      );
    }

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if user exists by email (username is email)
    const { data: existingUser } = await supabase
      .from("users")
      .select("*")
      .eq("username", email)
      .single();

    let user;

    if (existingUser) {
      // User exists, return existing user
      user = existingUser;
    } else {
      // New user - create with role "member"
      const { data: newUser, error: insertError } = await supabase
        .from("users")
        .insert({
          username: email, // Use email as username
          email: email,
          full_name: full_name || email.split("@")[0], // Use provided name or fallback to email prefix
          role: "member", // Default to member role for new Google auth users
          google_id: google_id,
          avatar_url: avatar_url || null,
          password_hash: "", // Empty password for OAuth users
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating user:", insertError);
        throw new Error("Failed to create user");
      }

      user = newUser;
    }

    // Return user and indicate if they're a new user
    const isNewUser = !existingUser;

    return new Response(
      JSON.stringify({
        user,
        isNewUser,
      }),
      { headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' }}
    );
  } catch (error: any) {
    console.error("Google auth callback error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
        details: error.toString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' }
      }
    );
  }
});
