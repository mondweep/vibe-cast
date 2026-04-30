import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const [{ data: nodes, error: nErr }, { data: edges, error: eErr }] = await Promise.all([
      sb.from("kg_nodes").select("id, label, type, description, module_ids"),
      sb.from("kg_edges").select("id, from_node_id, to_node_id, relation, weight"),
    ]);

    if (nErr) throw nErr;
    if (eErr) throw eErr;

    return NextResponse.json({ nodes: nodes ?? [], edges: edges ?? [] });
  } catch (err) {
    console.error("[graph API]", err);
    return NextResponse.json({ error: "Failed to load graph" }, { status: 500 });
  }
}
