// app/api/webhook/route.js
import dbConnect from "@/lib/dbConnect";
import BotSetting from "@/models/BotSetting";
import Order from "@/models/Order";
import { executeOrder } from "@/lib/orderManager";

export async function GET(request) {
  return new Response(
    JSON.stringify({ error: "Method Not Allowed", allowed: ["POST"] }),
    {
      status: 405,
      headers: { Allow: "POST", "Content-Type": "application/json" },
    }
  );
}

export async function POST(request) {
  await dbConnect();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const { action, symbol, side, orderType, secret } = payload;
  if (!action || !symbol || !side || !orderType || !secret) {
    return new Response(
      JSON.stringify({ message: "Missing required fields" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  if (secret !== process.env.WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ message: "Invalid secret" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (action !== "open") {
    return new Response(JSON.stringify({ message: "Unsupported action" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Find all users who are enabled and have >=100 points
  const eligible = await BotSetting.find({
    enabled: true,
    credit: { $gte: 100 },
  });

  const results = [];
  for (const setting of eligible) {
    try {
      // Place the order via CCXT
      const { submitted, confirmed } = await executeOrder(setting, {
        exchange: "binance",
        symbol,
        type: orderType,
        side,
        amount: setting.longSize,
      });

      // Deduct 10 points
      setting.credit -= 10;
      await setting.save();

      // Determine quantity & price for logging
      const qty =
        submitted.info?.origQty ??
        submitted.info?.executedQty ??
        submitted.amount;
      const pr = submitted.info?.price
        ? parseFloat(submitted.info.price)
        : submitted.price ?? undefined;

      // Save to Mongo
      const log = await Order.create({
        user: setting.user,
        symbol,
        side,
        type: orderType,
        amount: qty,
        price: pr,
        status: confirmed.status || "open",
        raw: submitted,
      });

      results.push({
        user: setting.user.toString(),
        order: submitted,
        logId: log._id,
      });
    } catch (err) {
      results.push({ user: setting.user.toString(), error: err.message });
    }
  }

  return new Response(
    JSON.stringify({ message: "Orders processed", results }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
