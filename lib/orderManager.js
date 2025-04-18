// lib/orderManager.js
import ccxt from "ccxt";
import { decrypt } from "./crypto";

/**
 * Executes a futures order using the given bot settings and order parameters.
 *
 * @param {Object} botSettings   A BotSetting document containing encrypted credentials.
 * @param {Object} orderParams   { exchange, symbol, type, side, amount, price? }
 * @returns {Object}             { submitted, confirmed } objects from CCXT.
 */
export async function executeOrder(botSettings, orderParams) {
  // 1) Decrypt keys
  const apiKey = decrypt(botSettings.binance.apiKey).trim();
  const secret = decrypt(botSettings.binance.secret).trim();

  // 2) Instantiate Binance with futures enabled
  const exchange = new ccxt.binance({
    apiKey,
    secret,
    enableRateLimit: true,
    timeout: 30000,
    options: {
      defaultType: "future", // send all calls to the FAPI (USDT‑margined futures)
      fetchCurrencies: false, // skip the slow currency list call
      adjustForTimeDifference: true, // auto‑sync time
    },
  });

  // 3) Load only markets (no currency endpoints)
  await exchange.loadMarkets(false);

  // 4) If market order, convert USDT notional → base currency qty
  let quantity = orderParams.amount;
  if (orderParams.type === "market") {
    const ticker = await exchange.fetchTicker(orderParams.symbol);
    const lastPrice = ticker.last;
    if (!lastPrice) {
      throw new Error(`Cannot fetch price for ${orderParams.symbol}`);
    }
    const prec = exchange.markets[orderParams.symbol].precision.amount;
    quantity = parseFloat((orderParams.amount / lastPrice).toFixed(prec));
    console.log(
      `[orderManager] Converted ${orderParams.amount} USDT → ${quantity} ${
        exchange.markets[orderParams.symbol].base
      }` + ` at ${lastPrice}`
    );
  }

  // 5) Place the order
  console.log("[orderManager] Placing order →", {
    symbol: orderParams.symbol,
    type: orderParams.type,
    side: orderParams.side,
    quantity,
    price: orderParams.price ?? "market",
  });
  const submitted = await exchange.createOrder(
    orderParams.symbol,
    orderParams.type,
    orderParams.side,
    quantity,
    orderParams.price
  );
  console.log("[orderManager] Order submitted →", submitted);

  // 6) Fetch it back to confirm status
  const confirmed = await exchange.fetchOrder(submitted.id, orderParams.symbol);
  console.log("[orderManager] Order confirmed →", confirmed);

  return { submitted, confirmed };
}
