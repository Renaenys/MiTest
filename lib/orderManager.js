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
      defaultType: "future", // USDT‑margined futures
      adjustForTimeDifference: true,
    },
  });
  // load only market definitions (faster)
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
 * Poll Binance until a position on `symbol` shows up in fetchPositions().
 * Returns the position object or null if not found after retries.
 */
async function waitForPositionActive(exchange, symbol) {
  console.log(`[orderManager] waiting for active position on ${symbol}…`);
  for (let i = 0; i < 10; i++) {
    const positions = await exchange.fetchPositions();
    const p = positions.find((x) => x.symbol === symbol && x.contracts > 0);
    if (p) {
      console.log(
        `[orderManager] position active: ${p.contracts} contracts @ ${p.entryPrice}`
      );
      return p;
    }
    // wait 1 second
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.warn(`[orderManager] no active position for ${symbol} after retries`);
  return null;
}

/**
 * Place Take‑Profit and Stop‑Loss orders against an active position.
 */
async function createTpSl(
  exchange,
  symbol,
  side,
  quantity,
  entryPrice,
  botSettings
) {
  if (!entryPrice) {
    console.warn("[orderManager] TP/SL skipped: no entry price");
    return;
  }

  const tpPct = Number(botSettings.tpPercent) || 0.5;
  const slPct = Number(botSettings.slPercent) || 2.0;
  const opposite = side === "buy" ? "sell" : "buy";

  // calculate raw prices
  const rawTp = entryPrice * (1 + tpPct / 100);
  const rawSl =
    side === "buy"
      ? entryPrice * (1 - slPct / 100)
      : entryPrice * (1 + slPct / 100);

  // format prices to market precision
  let tpPrice = exchange.priceToPrecision(symbol, rawTp);
  let slPrice = exchange.priceToPrecision(symbol, rawSl);

  // build params for reduceOnly & Bybit position_idx
  const params = { reduceOnly: true };
  if (exchange.id.toLowerCase() === "bybit") {
    const mode = process.env.BYBIT_POSITION_MODE || "hedge";
    const posIdx = mode === "one_way" ? 0 : 1;
    params.position_idx = posIdx;
  }

  // place TP limit
  try {
    console.log(`[orderManager] placing TP @ ${tpPrice}`);
    await exchange.createOrder(
      symbol,
      "limit",
      opposite,
      quantity,
      tpPrice,
      params
    );
  } catch (err) {
    console.error("[orderManager] TP failed:", err.message);
  }

  // place SL stop-market
  try {
    console.log(`[orderManager] placing SL @ ${slPrice}`);
    await exchange.createOrder(
      symbol,
      "stop_market",
      opposite,
      quantity,
      slPrice,
      { ...params, stopPrice: slPrice }
    );
  } catch (err) {
    console.error("[orderManager] SL failed:", err.message);
  }
}

/**
 * Execute a futures order:
 *  - Applies user’s leverage
 *  - Converts USDT notional → base qty for market
 *  - Sends the order
 *  - Waits for fill and then optionally creates TP/SL
 */
export async function executeOrder(botSettings, orderParams) {
  const exchange = await createClient(botSettings);
  const rawSymbol = normalizeSymbol(orderParams.symbol);
  const market = exchange.markets[rawSymbol];
  if (!market) {
    throw new Error(`Market ${rawSymbol} not found`);
  }

  // 1) set leverage if configured
  if (botSettings.leverage) {
    const exId = exchange.id.toLowerCase();
    if (exId === "bybit") {
      const mode = process.env.BYBIT_POSITION_MODE || "hedge";
      const posIdx = mode === "one_way" ? 0 : 1;
      await exchange.setMarginMode("isolated", rawSymbol, {
        positionIdx: posIdx,
      });
      await exchange.setLeverage(botSettings.leverage, rawSymbol, {
        positionIdx: posIdx,
      });
    } else {
      await exchange.setLeverage(botSettings.leverage, rawSymbol);
    }
  }

  // 2) compute quantity
  let quantity = orderParams.amount;
  if (orderParams.type === "market") {
    const ticker = await exchange.fetchTicker(rawSymbol);
    const lastPrice = ticker.last;
    if (!lastPrice) throw new Error(`Cannot fetch price for ${rawSymbol}`);
    const prec = market.precision.amount;
    quantity = parseFloat((orderParams.amount / lastPrice).toFixed(prec));
    console.log(
      `[orderManager] converted ${orderParams.amount} USDT → ${quantity} ${market.base} @ ${lastPrice}`
    );
  }

  // 3) build createOrder params (reduceOnly / bybit)
  const params = {};
  if (orderParams.reduceOnly) {
    params.reduceOnly = true;
  }
  if (exchange.id.toLowerCase() === "bybit") {
    const mode = process.env.BYBIT_POSITION_MODE || "hedge";
    const posIdx = mode === "one_way" ? 0 : 1;
    params.position_idx = posIdx;
  }

  // 4) place the main order
  console.log(
    `[orderManager] placing ${orderParams.type} ${orderParams.side} ${rawSymbol}`,
    { quantity, price: orderParams.price }
  );
  const submitted = await exchange.createOrder(
    rawSymbol,
    orderParams.type,
    orderParams.side,
    quantity,
    orderParams.price ?? undefined,
    params
  );
  console.log("[orderManager] submitted:", submitted);

  // 5) confirm
  const confirmed = await exchange.fetchOrder(submitted.id, rawSymbol);
  console.log("[orderManager] confirmed:", confirmed);

  // 6) if market & TP/SL enabled & not a reduceOnly, schedule TP/SL
  if (
    orderParams.type === "market" &&
    !orderParams.reduceOnly &&
    botSettings.enableTpSl
  ) {
    const pos = await waitForPositionActive(exchange, rawSymbol);
    if (pos) {
      await createTpSl(
        exchange,
        rawSymbol,
        orderParams.side,
        pos.contracts,
        pos.entryPrice,
        botSettings
      );
    }
  }

  return { submitted, confirmed };
}
