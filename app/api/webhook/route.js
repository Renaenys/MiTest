// app/api/webhook/route.js
import dbConnect from "@/lib/dbConnect";
import BotSetting from "@/models/BotSetting";
import Order from "@/models/Order";
import { executeOrder } from "@/lib/orderManager";

function normalizeFuturesSymbol(sym) {
  return sym.includes(":") ? sym : `${sym}:USDT`;
}

export async function POST(request) {
  await dbConnect();

  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ message: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { action, symbol, side, orderType, secret, price } = payload;
  if (secret !== process.env.WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ message: "Invalid secret" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!["open", "close"].includes(action)) {
    return new Response(JSON.stringify({ message: "Unsupported action" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const settings = await BotSetting.find({
    enabled: true,
    credit: { $gte: 100 },
  });
  if (settings.length === 0) {
    return new Response(JSON.stringify({ message: "No eligible users" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const results = [];
  for (const s of settings) {
    try {
      const futSym = normalizeFuturesSymbol(symbol);

      if (action === "open") {
        // pick the USDT‐notional from user prefs
        const usdt =
          s.preferredSide === "long"
            ? s.longSize
            : s.preferredSide === "short"
            ? s.shortSize
            : (s.longSize + s.shortSize) / 2;

        const { submitted, confirmed } = await executeOrder(s, {
          exchange: "binance",
          symbol: futSym,
          type: orderType,
          side,
          amount: usdt,
          price: orderType === "limit" ? price : undefined,
        });

        s.credit -= 10;
        await s.save();
        await Order.create({
          user: s.user,
          exchange: "binance",
          orderId: submitted.id,
          symbol: futSym,
          side,
          type: orderType,
          amount: usdt,
          price: submitted.price ?? price,
          status: "open",
          raw: submitted,
          createdAt: new Date(),
        });

        results.push({
          user: s.user.toString(),
          action: "open",
          order: confirmed,
        });
      } else {
        // close via same notional
        const openDoc = await Order.findOne({
          user: s.user,
          symbol: futSym,
          status: "open",
        }).sort({ createdAt: -1 });

        if (!openDoc) {
          throw new Error(`No open order for ${futSym}`);
        }

        const closeSide = openDoc.side === "buy" ? "sell" : "buy";
        const notionalUSDT = openDoc.amount;

        const { submitted: cSub, confirmed: cConf } = await executeOrder(s, {
          exchange: "binance",
          symbol: futSym,
          type: "market",
          side: closeSide,
          amount: notionalUSDT,
          // no need for price, TP/SL, reduceOnly flags here
        });

        const closedCost = cConf.cost ?? notionalUSDT;

        s.credit -= 10;
        await s.save();

        openDoc.amount = closedCost;
        openDoc.price = cConf.price ?? openDoc.price;
        openDoc.status = "closed";
        openDoc.closedAt = new Date();
        openDoc.profit = closedCost - notionalUSDT;
        openDoc.rawClose = cConf;
        await openDoc.save();

        results.push({
          user: s.user.toString(),
          action: "close",
          notional: notionalUSDT,
          closedCost,
        });
      }
    } catch (err) {
      results.push({
        user: s.user.toString(),
        error: err.message,
      });
    }
  }

  return new Response(JSON.stringify({ results }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
