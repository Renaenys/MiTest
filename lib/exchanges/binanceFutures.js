// lib/exchanges/binanceFutures.js
import ccxt from "ccxt";
import { decrypt } from "../crypto";

export async function createClient(apiKeyEnc, secretEnc) {
  const apiKey = decrypt(apiKeyEnc).trim();
  const secret = decrypt(secretEnc).trim();
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
  await client.loadMarkets(false);
  return client;
}

// params: { symbol, side, type, amount, price?, tpSl?{takeProfit,stopLoss} }
export async function executeOrder(client, params, userConfig = {}) {
  // 1) set leverage if needed
  if (userConfig.leverage) {
    await client.setLeverage(userConfig.leverage, params.symbol);
  }

  // 2) if market, convert USDT notional -> contract qty
  let qty = params.amount;
  if (params.type === "market") {
    const ticker = await client.fetchTicker(params.symbol);
    const prec = client.markets[params.symbol].precision.amount;
    qty = parseFloat((params.amount / ticker.last).toFixed(prec));
  }

  // 3) place the order
  const order = await client.createOrder(
    params.symbol,
    params.type,
    params.side,
    qty,
    params.price ?? undefined
  );

  // 4) optionally create TP/SL
  if (params.tpSl && params.type === "market") {
    const { takeProfit, stopLoss } = params.tpSl;
    const opposite = params.side === "buy" ? "sell" : "buy";
    const entry = order.average ?? order.price;
    const tpPrice = client.priceToPrecision(
      params.symbol,
      entry * (1 + takeProfit / 100)
    );
    const slPrice = client.priceToPrecision(
      params.symbol,
      entry * (1 - stopLoss / 100)
    );
    // reduceOnly orders
    await client.createOrder(params.symbol, "limit", opposite, qty, tpPrice, {
      reduceOnly: true,
    });
    await client.createOrder(
      params.symbol,
      "stop_market",
      opposite,
      qty,
      undefined,
      { stopPrice: slPrice, reduceOnly: true }
    );
  }

  // 5) fetch confirmation
  const confirmed = await client.fetchOrder(order.id, params.symbol);
  return { submitted: order, confirmed };
}

export async function fetchPositions(client, symbol) {
  // returns only non‑zero positions
  const pos = await client.fetchPositions();
  return pos
    .filter(
      (p) => p.contracts && p.contracts > 0 && (!symbol || p.symbol === symbol)
    )
    .map((p) => ({
      symbol: p.symbol,
      side: p.side,
      contracts: p.contracts,
      entryPrice: p.entryPrice,
    }));
}

export async function closePosition(client, symbol) {
  const poses = await fetchPositions(client, symbol);
  if (!poses.length) throw new Error(`No live position to close for ${symbol}`);
  const { side, contracts } = poses[0];
  const opposite = side === "long" ? "sell" : "buy";
  const closed = await client.createOrder(
    symbol,
    "market",
    opposite,
    contracts,
    undefined,
    { reduceOnly: true }
  );
  return { closed, closedQty: contracts };
}
