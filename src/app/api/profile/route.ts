import { getSupabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { profile } = await request.json();

    const supabase = getSupabase();
    if (!supabase) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Supabase not configured. Profile saved locally only.",
        }),
        { status: 200 }
      );
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return new Response(
        JSON.stringify({
          error: "Not authenticated. Please sign in first.",
        }),
        { status: 401 }
      );
    }

    const { error } = await supabase.from("defi_learning_as_learner_profiles").upsert(
      {
        user_id: session.user.id,
        data: profile,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) throw error;

    return new Response(
      JSON.stringify({
        success: true,
        message: "Profile saved successfully",
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Profile API error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return new Response(
        JSON.stringify({
          profile: null,
          message: "Supabase not configured",
        }),
        { status: 200 }
      );
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return new Response(
        JSON.stringify({
          error: "Not authenticated",
        }),
        { status: 401 }
      );
    }

    const { data, error } = await supabase
      .from("defi_learning_as_learner_profiles")
      .select("data")
      .eq("user_id", session.user.id)
      .single();

    if (error && error.code !== "PGRST116") throw error;

    return new Response(
      JSON.stringify({
        profile: data?.data || null,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Profile GET error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500 }
    );
  }
}
