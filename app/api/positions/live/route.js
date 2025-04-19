// app/api/positions/live/route.js
import dbConnect from "@/lib/dbConnect";
import BotSetting from "@/models/BotSetting";
import { verifyToken } from "@/lib/auth";
import ccxt from "ccxt";
import { decrypt } from "@/lib/crypto";

export async function GET(request) {
  const auth = request.headers.get("authorization");
  if (!auth) return new Response("Unauthorized", { status: 401 });
  let decoded;
  try {
    decoded = verifyToken(auth.replace("Bearer ", ""));
  } catch {
    return new Response("Invalid token", { status: 401 });
  }

  await dbConnect();
  const setting = await BotSetting.findOne({ user: decoded.id });
  if (!setting) return new Response("Bot settings not found", { status: 404 });

  const apiKey = decrypt(setting.binance.apiKey).trim();
  const secret = decrypt(setting.binance.secret).trim();
  const client = new ccxt.binance({
    apiKey,
    secret,
    enableRateLimit: true,
    timeout: 30000,
    options: {
      defaultType: "future",
      adjustForTimeDifference: true,
    },
  });

  try {
    await client.loadMarkets();
    const positions = await client.fetchPositions();
    // only keep non‑zero positions
    const open = positions
      .filter((p) => p.contracts && p.contracts > 0)
      .map((p) => ({
        symbol: p.symbol,
        side: p.side,
        contracts: p.contracts,
        entryPrice: p.entryPrice,
        unrealized: p.info.unrealizedProfit, // optional
      }));

    return new Response(JSON.stringify(open), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error fetching positions:", err);
    return new Response("Error fetching positions", { status: 500 });
  }
}
