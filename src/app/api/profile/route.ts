import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { name, email, linkedin_url, wants_updates } = await req.json() as {
      name?:         string | null;
      email?:        string | null;
      linkedin_url?: string | null;
      wants_updates?: boolean;
    };

    // At least one field must be present
    if (!name && !email && !linkedin_url) {
      return NextResponse.json({ ok: false, error: "No profile data" }, { status: 400 });
    }

    const country = req.headers.get("x-vercel-ip-country") ?? null;

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Upsert on email (if provided) so re-submissions update rather than duplicate
    const { error } = await sb
      .from("learner_profiles")
      .upsert({
        name:          name          || null,
        email:         email         || null,
        linkedin_url:  linkedin_url  || null,
        wants_updates: wants_updates ?? false,
        country,
        source:        "consent_gate",
        updated_at:    new Date().toISOString(),
      }, {
        // Only upsert on email if it was provided — otherwise always insert
        onConflict: email ? "email" : undefined,
        ignoreDuplicates: !email,
      });

    if (error) {
      console.error("[profile] Save error:", error.message);
      return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    }

    console.log(`[profile] Saved: ${email ?? "no-email"} | updates=${wants_updates} | country=${country}`);
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error("[profile] Fatal:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
