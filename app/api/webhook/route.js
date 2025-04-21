// app/api/webhook/route.js
import dbConnect from '@/lib/dbConnect';
import BotSetting from '@/models/BotSetting';
import Order from '@/models/Order';
import { executeOrder } from '@/lib/orderManager';

function normalizeFuturesSymbol(sym) {
	return sym.includes(':') ? sym : `${sym}:USDT`;
}

export async function POST(request) {
	// 1) Connect & parse
	await dbConnect();
	let payload;
	try {
		payload = await request.json();
	} catch {
		return new Response(JSON.stringify({ message: 'Invalid JSON' }), {
			status: 400,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// 2) Destructure correctly!
	const {
		secret,
		exchange: exchangeNameRaw = 'binance',
		action,
		symbol,
		side,
		orderType, // ◀── use the correct field name
		price,
	} = payload;
	const exchangeName = exchangeNameRaw.toLowerCase();

	// 3) Auth & validate
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

	// 4) Load bots that actually have credentials for this exchange
	const query = {
		enabled: true,
		credit: { $gte: 100 },
		[`${exchangeName}.apiKey`]: { $exists: true, $ne: '' },
		[`${exchangeName}.secret`]: { $exists: true, $ne: '' },
	};
	const bots = await BotSetting.find(query);
	if (bots.length === 0) {
		return new Response(JSON.stringify({ message: 'No eligible users' }), {
			status: 404,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	// 5) Process each bot
	const futSym = normalizeFuturesSymbol(symbol);
	const results = await Promise.all(
		bots.map(async (bot) => {
			try {
				if (action === 'open') {
					// OPEN
					const usdt =
						bot.preferredSide === 'long'
							? bot.longSize
							: bot.preferredSide === 'short'
							? bot.shortSize
							: (bot.longSize + bot.shortSize) / 2;

					const params = {
						exchange: exchangeName,
						symbol: futSym,
						type: orderType, // ◀── now defined
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

					bot.credit -= 10;
					await bot.save();
					await Order.create({
						user: bot.user,
						exchange: exchangeName,
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
					// CLOSE
					const openDoc = await Order.findOne({
						user: bot.user,
						symbol: futSym,
						status: 'open',
					})
						.sort({ createdAt: -1 })
						.lean();
					if (!openDoc) throw new Error(`No open order for ${futSym}`);

					const closeSide = openDoc.side === 'buy' ? 'sell' : 'buy';
					const notionalUSDT = openDoc.amount;

					const params = {
						exchange: exchangeName,
						symbol: futSym,
						type: 'market',
						side: closeSide,
						amount: notionalUSDT,
					};

					const { confirmed } = await executeOrder(bot, params);

					bot.credit -= 10;
					await bot.save();

					const closedCost = confirmed.cost ?? notionalUSDT;
					await Order.updateOne(
						{ _id: openDoc._id },
						{
							$set: {
								amount: closedCost,
								price: confirmed.price ?? openDoc.price,
								status: 'closed',
								closedAt: new Date(),
								profit: closedCost - notionalUSDT,
								rawClose: confirmed,
							},
						}
					);

					return {
						user: bot.user.toString(),
						action: 'close',
						notional: notionalUSDT,
						closedCost,
					};
				}
			} catch (err) {
				return {
					user: bot.user.toString(),
					error: err.message,
				};
			}
		})
	);

	// 6) Respond
	return new Response(JSON.stringify({ results }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}
