// app/api/webhook/route.js
import dbConnect from '@/lib/dbConnect';
import BotSetting from '@/models/BotSetting';
import Order from '@/models/Order';
import { executeOrder } from '@/lib/orderManager';

function normalizeFuturesSymbol(sym) {
	return sym.includes(':') ? sym : `${sym}:USDT`;
}

export async function POST(request) {
	await dbConnect();

	// 1) Parse & validate
	let payload;
	try {
		payload = await request.json();
	} catch {
		return new Response(JSON.stringify({ message: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	const { action, symbol, side, orderType, secret, price } = payload;
	if (secret !== process.env.WEBHOOK_SECRET) {
		return new Response(JSON.stringify({ message: 'Invalid secret' }), {
			status: 403,
			headers: { 'Content-Type': 'application/json' },
		});
	}
	if (!['open', 'close'].includes(action)) {
		return new Response(JSON.stringify({ message: 'Unsupported action' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// 2) Load all eligible bots
	const bots = await BotSetting.find({
		enabled: true,
		credit: { $gte: 100 },
	});
	if (bots.length === 0) {
		return new Response(JSON.stringify({ message: 'No eligible users' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// 3) Process each bot in parallel
	const results = await Promise.all(
		bots.map(async (bot) => {
			const futSym = normalizeFuturesSymbol(symbol);
			try {
				if (action === 'open') {
					// 3a) OPEN: pick USDT notional from user prefs
					const usdt =
						bot.preferredSide === 'long'
							? bot.longSize
							: bot.preferredSide === 'short'
							? bot.shortSize
							: (bot.longSize + bot.shortSize) / 2;

					const params = {
						exchange: 'binance',
						symbol: futSym,
						type: orderType,
						side,
						amount: usdt,
						price: orderType === 'limit' ? price : undefined,
					};
					if (bot.tpSlEnabled) {
						params.tpSl = {
							takeProfit: bot.takeProfit,
							stopLoss: bot.stopLoss,
						};
					}
					const { submitted, confirmed } = await executeOrder(bot, params);

					// debit + record
					bot.credit -= 10;
					await bot.save();
					await Order.create({
						user: bot.user,
						exchange: 'binance',
						orderId: submitted.id,
						symbol: futSym,
						side,
						type: orderType,
						amount: usdt,
						price: submitted.price ?? price,
						status: 'open',
						raw: submitted,
						createdAt: new Date(),
					});

					return {
						user: bot.user.toString(),
						action: 'open',
						order: confirmed,
					};
				} else {
					// 3b) CLOSE: mirror the same USDT notional
					const openDoc = await Order.findOne({
						user: bot.user,
						symbol: futSym,
						status: 'open',
					}).sort({ createdAt: -1 });
					if (!openDoc) {
						throw new Error(`No open order for ${futSym}`);
					}

					const closeSide = openDoc.side === 'buy' ? 'sell' : 'buy';
					const notionalUSDT = openDoc.amount;

					const { confirmed } = await executeOrder(bot, {
						exchange: 'binance',
						symbol: futSym,
						type: 'market',
						side: closeSide,
						amount: notionalUSDT,
					});

					// debit + update
					bot.credit -= 10;
					await bot.save();

					const closedCost = confirmed.cost ?? notionalUSDT;
					openDoc.amount = closedCost;
					openDoc.price = confirmed.price ?? openDoc.price;
					openDoc.status = 'closed';
					openDoc.closedAt = new Date();
					openDoc.profit = closedCost - notionalUSDT;
					openDoc.rawClose = confirmed;
					await openDoc.save();

					return {
						user: bot.user.toString(),
						action: 'close',
						notional: notionalUSDT,
						closedCost,
					};
				}
			} catch (err) {
				return { user: bot.user.toString(), error: err.message };
			}
		})
	);

	// 4) Respond with all results
	return new Response(JSON.stringify({ results }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}
