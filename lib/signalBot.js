import ccxt from "ccxt";

export async function executeTrade(botSettings, signal) {
  // Expected signal format:
  // {
  //   exchange: "binance" or "bybit",
  //   symbol: "BTC/USDT",
  //   type: "market" or "limit",
  //   side: "buy" or "sell",
  //   amount: Number,
  //   price: Number  (optional; only for limit orders)
  // }
  let exchange;
  if (signal.exchange === "binance") {
    exchange = new ccxt.binance({
      apiKey: botSettings.binance.apiKey,
      secret: botSettings.binance.secret,
      enableRateLimit: true,
    });
  } else if (signal.exchange === "bybit") {
    exchange = new ccxt.bybit({
      apiKey: botSettings.bybit.apiKey,
      secret: botSettings.bybit.secret,
      enableRateLimit: true,
    });
  } else {
    throw new Error("Unsupported exchange");
  }

  try {
    // Use ccxt.createOrder; adjust order parameters as needed.
    const order = await exchange.createOrder(
      signal.symbol,
      signal.type,
      signal.side,
      signal.amount,
      signal.price // omit or include as required
    );
    console.log("Order placed successfully:", order);
    return order;
  } catch (error) {
    console.error("Trade execution error:", error);
    throw error;
  }
}
