// app/api/webhook/route.js
import dbConnect from "@/lib/dbConnect";
import BotSetting from "@/models/BotSetting";
import Order from "@/models/Order";
import { executeOrder } from "@/lib/orderManager";
import ccxt from "ccxt";
import { decrypt } from "@/lib/crypto";

export async function POST(request) {
  await dbConnect();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ message: "Invalid JSON" }), {
      status: 400,
    });
  }
  const { action, symbol, side, orderType, secret, price } = payload;
  if (secret !== process.env.WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ message: "Invalid secret" }), {
      status: 403,
    });
  }
  if (!["open", "close"].includes(action)) {
    return new Response(JSON.stringify({ message: "Unsupported action" }), {
      status: 400,
    });
  }

  const settings = await BotSetting.find({
    enabled: true,
    credit: { $gte: 100 },
  });
  const results = [];

  for (const s of settings) {
    try {
      if (action === "open") {
        // … your existing open logic unchanged …
        const usdt =
          s.preferredSide === "long"
            ? s.longSize
            : s.preferredSide === "short"
            ? s.shortSize
            : (s.longSize + s.shortSize) / 2;

        const params = {
          exchange: "binance",
          symbol,
          type: orderType,
          side,
          amount: usdt,
          price: orderType === "limit" ? price : undefined,
        };
        const { submitted, confirmed } = await executeOrder(s, params);

        s.credit -= 10;
        await s.save();
        await Order.create({
          user: s.user,
          exchange: "binance",
          orderId: submitted.id,
          symbol,
          side,
          type: orderType,
          amount: usdt,
          price: submitted.price ?? params.price,
          status: "open",
          raw: submitted,
          createdAt: new Date(),
        });
        results.push({ user: s.user.toString(), action, order: confirmed });
      } else {
        // ─── CLOSE ─────────────────────────────────────────────────────────
        // init futures client
        const apiKey = decrypt(s.binance.apiKey).trim();
        const secretKey = decrypt(s.binance.secret).trim();
        const client = new ccxt.binance({
          apiKey,
          secret: secretKey,
          enableRateLimit: true,
          timeout: 30000,
          options: {
            defaultType: "future",
            adjustForTimeDifference: true,
          },
        });

        await client.loadMarkets();
        // fetch all positions
        const positions = await client.fetchPositions();
        // find our symbol
        const pos = positions.find((p) => p.symbol === symbol);
        // read the string amount from pos.info.positionAmt
        const rawAmt =
          pos && pos.info && pos.info.positionAmt
            ? parseFloat(pos.info.positionAmt)
            : 0;

        if (!rawAmt) {
          throw new Error(`No live position to close for ${symbol}`);
        }

        const qty = Math.abs(rawAmt);
        const closeSide = rawAmt > 0 ? "sell" : "buy";

        // flatten position
        const closed = await client.createOrder(
          symbol,
          "market",
          closeSide,
          qty
        );

        // deduct & log
        s.credit -= 10;
        await s.save();
        await Order.create({
          user: s.user,
          exchange: "binance",
          orderId: closed.id,
          symbol,
          side: closeSide,
          type: "market",
          amount: qty,
          status: "closed",
          raw: closed,
          createdAt: new Date(),
          closedAt: new Date(),
        });

        results.push({
          user: s.user.toString(),
          action,
          closedQty: qty,
          closeSide,
        });
      }
    } catch (err) {
      results.push({ user: s.user.toString(), error: err.message });
    }
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
