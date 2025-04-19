// lib/orderManager.js
import ccxt from "ccxt";
import { decrypt } from "./crypto";

/**
 * Executes a USDT‐margined futures order using the given bot settings and orderParams.
 *
 * orderParams.shape:
 * {
 *   exchange: "binance",
 *   symbol:   "BTC/USDT"          or "BTC/USDT:USDT",
 *   type:     "market"|"limit",
 *   side:     "buy"|"sell",
 *   amount:   <USDT notional for market> | <base qty for limit>,
 *   price?:   <limit price>
 * }
 */
export async function executeOrder(botSettings, orderParams) {
  // 1) Decrypt your keys
  const apiKey = decrypt(botSettings.binance.apiKey).trim();
  const secret = decrypt(botSettings.binance.secret).trim();

  // 2) Build a CCXT futures client
  const exchange = new ccxt.binance({
    apiKey,
    secret,
    enableRateLimit: true,
    timeout: 30000,
    options: {
      defaultType: "future", // USDT‑margined futures
      adjustForTimeDifference: true,
    },
  });

  // 3) Normalize symbol if you passed "PAIR:USDT"
  //    CCXT expects just "PAIR", e.g. "DOGE/USDT" in its markets map.
  const rawSymbol = orderParams.symbol.split(":")[0];

  // 4) Load only markets (no currency endpoints for speed)
  await exchange.loadMarkets(false);

  // 5) If market order: convert USDT notional → base asset qty
  let quantity = orderParams.amount;
  if (orderParams.type === "market") {
    const ticker = await exchange.fetchTicker(rawSymbol);
    const lastPrice = ticker.last;
    if (!lastPrice) {
      throw new Error(`Cannot fetch price for ${rawSymbol}`);
    }
    const prec = exchange.markets[rawSymbol].precision.amount;
    // USDT‐notional / price = base qty
    quantity = parseFloat((orderParams.amount / lastPrice).toFixed(prec));
    console.log(
      `[orderManager] Converted ${orderParams.amount} USDT → ${quantity} ${exchange.markets[rawSymbol].base}` +
        ` @ ${lastPrice}`
    );
  }

  // 6) Place the order
  console.log("[orderManager] placing:", {
    symbol: rawSymbol,
    type: orderParams.type,
    side: orderParams.side,
    qty: quantity,
    price: orderParams.price ?? "market",
  });
  const submitted = await exchange.createOrder(
    rawSymbol,
    orderParams.type,
    orderParams.side,
    quantity,
    orderParams.price
  );
  console.log("[orderManager] submitted:", submitted);

  // 7) Fetch back to confirm status
  const confirmed = await exchange.fetchOrder(submitted.id, rawSymbol);
  console.log("[orderManager] confirmed:", confirmed);

  return { submitted, confirmed };
}
