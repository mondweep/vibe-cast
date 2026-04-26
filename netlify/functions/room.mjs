import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return Response.json(data, { status, headers: CORS });
}

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  const store = getStore({ name: "game-rooms", consistency: "strong" });

  try {
    if (req.method === "POST" && action === "create") {
      const code = generateCode();
      await store.setJSON(code, { players: [], created: Date.now() });
      return json({ code });
    }

    if (req.method === "POST" && action === "join") {
      const { room, player, city, country, weather } = await req.json();
      const roomData = await store.get(room, { type: "json" });
      if (!roomData) return json({ error: "Room not found" }, 404);

      const idx = roomData.players.findIndex((p) => p.name === player);
      const entry = { name: player, city, country, weather, joined: Date.now() };
      if (idx >= 0) roomData.players[idx] = entry;
      else roomData.players.push(entry);

      await store.setJSON(room, roomData);
      return json(roomData);
    }

    if (req.method === "GET" && action === "poll") {
      const room = url.searchParams.get("room");
      if (!room) return json({ error: "Room code required" }, 400);
      const roomData = await store.get(room, { type: "json" });
      if (!roomData) return json({ error: "Room not found" }, 404);
      return json(roomData);
    }

    return json({ error: "Invalid action" }, 400);
  } catch (err) {
    console.error("Room error:", err);
    return json({ error: err.message }, 500);
  }
};

export const config = { path: "/api/room" };
