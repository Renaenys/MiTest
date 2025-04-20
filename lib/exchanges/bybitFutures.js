
// lib/exchanges/bybitFutures.js
import ccxt from 'ccxt';
import { decrypt } from '../crypto';

export async function createClient(apiKeyEnc, secretEnc) {
  const apiKey = decrypt(apiKeyEnc).trim();
  const secret = decrypt(secretEnc).trim();
  const client = new ccxt.bybit({
    apiKey, secret,
    enableRateLimit: true,
    timeout: 30000,
    options: {
      defaultType: 'future',
      adjustForTimeDifference: true,
    },
  });
  await client.loadMarkets(false);
  return client;
}

export async function executeOrder(client, params, userConfig = {}) {
  // set isolated margin mode & leverage
  await client.setMarginMode('isolated', params.symbol);
  await client.setLeverage(userConfig.leverage, params.symbol, { position_idx: 0 });

  let qty = params.amount;
  if (params.type === 'market') {
    const ticker = await client.fetchTicker(params.symbol);
    const prec = client.markets[params.symbol].precision.amount;
    qty = parseFloat((params.amount / ticker.last).toFixed(prec));
  }

  const order = await client.createOrder(
    params.symbol,
    params.type,
    params.side,
    qty,
    params.price,
    { position_idx: 0 }
  );

  if (params.tpSl && params.type === 'market') {
    const { takeProfit, stopLoss } = params.tpSl;
    const entry = order.price;
    const opposite = params.side === 'buy' ? 'sell' : 'buy';
    const tpPrice = client.priceToPrecision(params.symbol, entry * (1 + takeProfit/100));
    const slPrice = client.priceToPrecision(params.symbol, entry * (1 - stopLoss/100));
    const pp = { position_idx: 0, reduceOnly: true };
    await client.createOrder(params.symbol, 'limit', opposite, qty, tpPrice, pp);
    await client.createOrder(params.symbol, 'stop_market', opposite, qty, undefined, { ...pp, stopPrice: slPrice });
  }

  const confirmed = await client.fetchOrder(order.id, params.symbol);
  return { submitted: order, confirmed };
}

export async function fetchPositions(client, symbol) {
  const pos = await client.fetchPositions();
  return pos.filter(p => p.contracts && p.contracts > 0 && (!symbol || p.symbol === symbol))
            .map(p => ({
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
  const opp = side === 'long' ? 'sell' : 'buy';
  const closed = await client.createOrder(symbol, 'market', opp, contracts, undefined, { reduceOnly: true, position_idx: 0 });
  return { closed, closedQty: contracts };
}
