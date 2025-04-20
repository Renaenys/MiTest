// lib/exchangeManager.js
import * as binance from "./exchanges/binanceFutures";
import * as bybit from "./exchanges/bybitFutures";

export function getModule(name) {
  name = name.toLowerCase();
  if (name === "binance") return binance;
  if (name === "bybit") return bybit;
  throw new Error(`Unsupported exchange: ${name}`);
}
