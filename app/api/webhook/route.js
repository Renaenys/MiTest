// app/api/webhook/route.js
import dbConnect from "@/lib/dbConnect";
import BotSetting from "@/models/BotSetting";
import Order from "@/models/Order";
import { executeOrder } from "@/lib/orderManager";
import ccxt from "ccxt";
import { decrypt } from "@/lib/crypto";

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
  if (!settings.length) {
    return new Response(JSON.stringify({ message: "No eligible users" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const results = [];
  for (const s of settings) {
    try {
      if (action === "open") {
        // — OPEN —
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

        results.push({
          user: s.user.toString(),
          action: "open",
          order: confirmed,
        });
      } else {
        // — CLOSE —
        const apiKey = decrypt(s.binance.apiKey).trim();
        const secretKey = decrypt(s.binance.secret).trim();
        const client = new ccxt.binance({
          apiKey,
          secret: secretKey,
          enableRateLimit: true,
          timeout: 30000,
          options: { defaultType: "future", adjustForTimeDifference: true },
        });

        await client.loadMarkets();
        const futSym = normalizeFuturesSymbol(symbol);

        // fetch positions
        const positions = await client.fetchPositions();
        const pos = positions.find(
          (p) => p.symbol === symbol || p.symbol === futSym
        );
        if (!pos) throw new Error(`No live position to close for ${symbol}`);

        // get absolute contract size
        let rawAmt =
          pos.contracts != null
            ? pos.contracts
            : pos.info.positionAmt
            ? parseFloat(pos.info.positionAmt)
            : 0;
        if (!rawAmt) throw new Error(`No live position to close for ${symbol}`);

        const qty = Math.abs(rawAmt);
        const closeSide = rawAmt > 0 ? "sell" : "buy";

        // send flatten order
        const closed = await client.createOrder(
          symbol,
          "market",
          closeSide,
          qty
        );

        // figure out USDT notional: closed.cost is provided by CCXT
        const closedCost =
          closed.cost != null ? closed.cost : qty * (closed.price || 0);

        // deduct user credit
        s.credit -= 10;
        await s.save();

        // update the SINGLE open doc into closed + compute profit
        const openDoc = await Order.findOne({
          user: s.user,
          symbol,
          status: "open",
        }).sort({ createdAt: -1 });
        if (openDoc) {
          const openNotional = openDoc.amount;
          openDoc.amount = closedCost;
          openDoc.price = closed.price;
          openDoc.status = "closed";
          openDoc.closedAt = new Date();
          openDoc.profit = closedCost - openNotional;
          openDoc.rawClose = closed;
          await openDoc.save();
        }

        results.push({
          user: s.user.toString(),
          action: "close",
          closedQty: qty,
          closedCost,
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
  