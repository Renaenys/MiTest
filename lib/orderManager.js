// lib/orderManager.js
import ccxt from 'ccxt';
import { decrypt } from './crypto';

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
			defaultType: 'future', // USDT‑margined futures
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
	return sym.includes(':') ? sym.split(':')[0] : sym;
}

/**
 * Poll until a position on `symbol` shows up in fetchPositions().
 * Returns the position object or null if not found after retries.
 */
async function waitForPositionActive(exchange, symbol) {
	for (let i = 0; i < 10; i++) {
		const positions = await exchange.fetchPositions();
		const p = positions.find((x) => x.symbol === symbol && x.contracts > 0);
		if (p) return p;
		await new Promise((r) => setTimeout(r, 1000));
	}
	return null;
}

/**
 * Place Take‑Profit and Stop‑Loss orders against an active position.
 * TP as a limit; SL as a stop_limit.
 */
async function createTpSl(exchange, symbol, side, quantity, entryPrice, tpSl) {
	const { takeProfit, stopLoss } = tpSl;
	if (!entryPrice) {
		console.warn('[orderManager] TP/SL skipped: no entry price');
		return;
	}

	const opposite = side === 'buy' ? 'sell' : 'buy';

	// compute prices
	const tpRaw = entryPrice * (1 + takeProfit / 100);
	const slRaw = entryPrice * (1 - stopLoss / 100);

	const tpPrice = exchange.priceToPrecision(symbol, tpRaw);
	const slPrice = exchange.priceToPrecision(symbol, slRaw);

	// common params
	const params = { reduceOnly: true };
	if (exchange.id === 'binance') {
		// ensure Binance SL truly closes
		params.closePosition = true;
	}

	// 1) Take‑Profit limit
	try {
		console.log(`[orderManager] placing TP limit @ ${tpPrice}`);
		await exchange.createOrder(
			symbol,
			'limit',
			opposite,
			quantity,
			tpPrice,
			params
		);
	} catch (err) {
		console.error('[orderManager] TP failed:', err.message);
	}

	// 2) Stop‑Loss stop_limit
	try {
		console.log(`[orderManager] placing SL stop_limit @ ${slPrice}`);
		await exchange.createOrder(
			symbol,
			'stop_limit',
			opposite,
			quantity,
			slPrice, // limit price
			{
				...params,
				stopPrice: slPrice, // trigger price
			}
		);
	} catch (err) {
		console.error('[orderManager] SL failed:', err.message);
	}
}

/**
 * Execute a futures order:
 *  - Applies user’s leverage
 *  - Converts USDT notional → base qty for market
 *  - Sends the main order
 *  - Optionally schedules TP/SL immediately for both market & limit opens
 */
export async function executeOrder(botSettings, orderParams) {
	const exchange = await createClient(botSettings);
	const rawSymbol = normalizeSymbol(orderParams.symbol);
	const market = exchange.markets[rawSymbol];
	if (!market) throw new Error(`Market ${rawSymbol} not found`);

	// 1) set leverage if configured
	if (botSettings.leverage) {
		const exId = exchange.id.toLowerCase();
		if (exId === 'bybit') {
			const mode = process.env.BYBIT_POSITION_MODE || 'hedge';
			const posIdx = mode === 'one_way' ? 0 : 1;
			await exchange.setMarginMode('isolated', rawSymbol, {
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
	if (orderParams.type === 'market') {
		const ticker = await exchange.fetchTicker(rawSymbol);
		const lastPrice = ticker.last;
		if (!lastPrice) throw new Error(`Cannot fetch price for ${rawSymbol}`);
		const prec = market.precision.amount;
		quantity = parseFloat((orderParams.amount / lastPrice).toFixed(prec));
		console.log(
			`[orderManager] converted ${orderParams.amount} USDT → ${quantity} ${market.base} @ ${lastPrice}`
		);
	}

	// 3) build createOrder params
	const params = {};
	if (orderParams.reduceOnly) params.reduceOnly = true;
	if (exchange.id.toLowerCase() === 'bybit') {
		const mode = process.env.BYBIT_POSITION_MODE || 'hedge';
		const posIdx = mode === 'one_way' ? 0 : 1;
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
	console.log('[orderManager] submitted:', submitted);

	// 5) confirm
	const confirmed = await exchange.fetchOrder(submitted.id, rawSymbol);
	console.log('[orderManager] confirmed:', confirmed);

	// 6) immediately schedule TP/SL if enabled and provided
	if (botSettings.tpSlEnabled && orderParams.tpSl) {
		// for market we may wait for position to appear
		if (orderParams.type === 'market') {
			const pos = await waitForPositionActive(exchange, rawSymbol);
			if (pos) {
				await createTpSl(
					exchange,
					rawSymbol,
					orderParams.side,
					pos.contracts,
					pos.entryPrice,
					orderParams.tpSl
				);
			}
		} else {
			// for limit, use the executed price as entry
			const entry = confirmed.average ?? confirmed.price;
			await createTpSl(
				exchange,
				rawSymbol,
				orderParams.side,
				quantity,
				entry,
				orderParams.tpSl
			);
		}
	}

	return { submitted, confirmed };
}
