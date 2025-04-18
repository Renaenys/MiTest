// app/api/orders/live/route.js
import dbConnect from "@/lib/dbConnect";
import BotSetting from "@/models/BotSetting";
import { decrypt } from "@/lib/crypto";
import ccxt from "ccxt";
import { verifyToken } from "@/lib/auth";

export async function GET(request) {
  await dbConnect();

  // Auth
  const auth = request.headers.get("authorization");
  if (!auth) return new Response("Unauthorized", { status: 401 });
  let decoded;
  try {
    decoded = verifyToken(auth.replace("Bearer ", ""));
  } catch {
    return new Response("Invalid token", { status: 401 });
  }

  // Load that user’s bot settings
  const setting = await BotSetting.findOne({ user: decoded.id });
  if (!setting) return new Response("Settings not found", { status: 404 });

  // Instantiate CCXT futures‑binance
  const apiKey = decrypt(setting.binance.apiKey).trim();
  const secret = decrypt(setting.binance.secret).trim();
  const exchange = new ccxt.binance({
    apiKey,
    secret,
    enableRateLimit: true,
    options: {
      defaultType: "future",
      warnOnFetchOpenOrdersWithoutSymbol: false,
    },
  });

  try {
    await exchange.loadMarkets(false);
    const open = await exchange.fetchOpenOrders(); // no symbol → suppressed warning
    // Map to simple structure
    const light = open.map((o) => ({
      id: o.id,
      symbol: o.symbol,
      side: o.side,
      type: o.type,
      amount: o.amount,
      price: o.price,
      timestamp: o.timestamp,
    }));
    return new Response(JSON.stringify(light), { status: 200 });
  } catch (err) {
    console.error("Error fetching open orders from binance:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
