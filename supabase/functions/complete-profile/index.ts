// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

console.info('complete-profile function started');

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
    const { full_name } = await req.json();

    if (!full_name || !full_name.trim()) {
      return new Response(
        JSON.stringify({ error: "Full name is required" }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' }
        }
      );
    }

    // Get authorization header to get current user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' }
        }
      );
    }

    // Extract token and get user
    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get current user from token
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user || !user.email) {
      return new Response(
        JSON.stringify({ error: "Invalid token or user not found" }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' }
        }
      );
    }

    // Update user's full_name in the database
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({ full_name: full_name.trim() })
      .eq("username", user.email)
      .select()
      .single();

    if (updateError || !updatedUser) {
      console.error("Error updating user profile:", updateError);
      throw new Error("Failed to update profile");
    }

    return new Response(
      JSON.stringify(updatedUser),
      { headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' }}
    );
  } catch (error: any) {
    console.error("Complete profile error:", error);
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
