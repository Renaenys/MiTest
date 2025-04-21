// lib/orderManager.js
import ccxt from "ccxt";
import { decrypt } from "./crypto";

/**
 * Create and return a CCXT futures client for Binance using a bot’s stored credentials.
 */
async function createClient(botSettings) {
  const apiKey = decrypt(botSettings.binance.apiKey).trim();
  const secret = decrypt(botSettings.binance.secret).trim();
  const exchange = new ccxt.binance({
    apiKey,
    secret,
    enableRateLimit: true,
    timeout: 30000,
    options: {
      defaultType: "future",
      adjustForTimeDifference: true,
    },
  });
  await exchange.loadMarkets(false);
  return exchange;
}

/**
 * Normalize symbols like "BTC/USDT:USDT" → "BTC/USDT"
 */
function normalizeSymbol(sym) {
  return sym.includes(":") ? sym.split(":")[0] : sym;
}

/**
 * Place Take‑Profit and Stop‑Loss orders immediately after main order.
 * For limit orders, entryPrice is taken from the limit price.
 * For market orders, entryPrice is the filled average/price.
 * Binance uses stop_market for SL; others may use stop_limit.
 */
async function createTpSl(exchange, symbol, side, quantity, entryPrice, botSettings) {
  if (!entryPrice) return;
  const tpPct = Number(botSettings.takeProfit) || 0;
  const slPct = Number(botSettings.stopLoss)   || 0;
  const opposite = side === "buy" ? "sell" : "buy";

  const tpRaw = entryPrice * (1 + tpPct / 100);
  const slRaw = entryPrice * (1 - slPct / 100);

  const tpPrice = exchange.priceToPrecision(symbol, tpRaw);
  const slPrice = exchange.priceToPrecision(symbol, slRaw);

  const baseParams = { reduceOnly: true };
  if (exchange.id.toLowerCase() === "bybit") {
    const posIdx = (process.env.BYBIT_POSITION_MODE === "one_way" ? 0 : 1);
    baseParams.position_idx = posIdx;
  }

  // Take‑Profit
  try {
    await exchange.createOrder(symbol, "limit", opposite, quantity, tpPrice, baseParams);
    console.log(`[orderManager] TP placed @ ${tpPrice}`);
  } catch (err) {
    console.error("[orderManager] TP failed:", err.message);
  }

  // Stop‑Loss
  try {
    if (exchange.id.toLowerCase() === "binance") {
      await exchange.createOrder(
        symbol,
        "stop_market",
        opposite,
        quantity,
        undefined,
        { stopPrice: slPrice, reduceOnly: true, closePosition: true }
      );
    } else {
      await exchange.createOrder(
        symbol,
        "stop_limit",
        opposite,
        quantity,
        slPrice,
        { ...baseParams, stopPrice: slPrice }
      );
    }
    console.log(`[orderManager] SL placed @ ${slPrice}`);
  } catch (err) {
    console.error("[orderManager] SL failed:", err.message);
  }
}

/**
 * Execute a futures order:
 *  - Sets leverage
 *  - Converts USDT → base qty for market
 *  - Places the main order
 *  - Immediately attaches TP & SL bracket orders
 */
export async function executeOrder(botSettings, orderParams) {
  const exchange  = await createClient(botSettings);
  const rawSymbol = normalizeSymbol(orderParams.symbol);
  const market    = exchange.markets[rawSymbol];
  if (!market) throw new Error(`Market ${rawSymbol} not found`);

  // Leverage
  if (botSettings.leverage) {
    await exchange.setLeverage(botSettings.leverage, rawSymbol);
  }

  // Quantity
  let quantity = orderParams.amount;
  if (orderParams.type === "market") {
    const ticker = await exchange.fetchTicker(rawSymbol);
    const last = ticker.last;
    if (!last) throw new Error(`Cannot fetch price for ${rawSymbol}`);
    const prec = market.precision.amount;
    quantity = parseFloat((orderParams.amount / last).toFixed(prec));
    console.log(`[orderManager] Converted ${orderParams.amount} USDT → ${quantity}`);
  }

  // Main order
  console.log(`[orderManager] Placing ${orderParams.type} ${orderParams.side} ${rawSymbol}`);
  const submitted = await exchange.createOrder(
    rawSymbol,
    orderParams.type,
    orderParams.side,
    quantity,
    orderParams.price ?? undefined
  );
  console.log("[orderManager] Submitted:", submitted);

  // Confirm
  const confirmed = await exchange.fetchOrder(submitted.id, rawSymbol);
  console.log("[orderManager] Confirmed:", confirmed);

  // Determine entry price
  let entryPrice = confirmed.average ?? confirmed.price;
  if (orderParams.type === "limit") {
    // if limit order, use the requested price
    entryPrice = orderParams.price;
  }

  // Attach TP/SL
  if (botSettings.tpSlEnabled) {
    await createTpSl(exchange, rawSymbol, orderParams.side, quantity, entryPrice, botSettings);
  }

  return { submitted, confirmed };
}
