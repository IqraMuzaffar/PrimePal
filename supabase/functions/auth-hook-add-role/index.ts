// supabase/functions/auth-hook-add-role/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

Deno.serve(async (req) => {
  try {
    const { user } = await req.json();

    if (!user?.id) {
      return new Response(
        JSON.stringify({ claims: { role: "teacher" } }),
        { status: 200 }
      );
    }

    // Fetch user's role from teachers table
    const { data, error } = await supabase
      .from("teachers")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      // Default to 'teacher' if not found
      return new Response(
        JSON.stringify({ claims: { role: "teacher" } }),
        { status: 200 }
      );
    }

    return new Response(
      JSON.stringify({ claims: { role: data.role } }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Auth hook error:", error);
    return new Response(
      JSON.stringify({ claims: { role: "teacher" } }),
      { status: 200 }
    );
  }
});
