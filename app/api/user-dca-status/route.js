// app/api/user-dca-status/route.js
import dbConnect from '@/lib/dbConnect';
import BotSetting from '@/models/BotSetting';
import Order from '@/models/Order';
import ccxt from 'ccxt';
import { decrypt } from '@/lib/crypto';

export async function GET(req) {
	const userId = req.headers.get('user-id'); // pass userId in headers or via auth

	if (!userId) {
		return new Response(JSON.stringify({ error: 'No userId provided' }), {
			status: 400,
		});
	}

	await dbConnect();

	const bot = await BotSetting.findOne({
		user: userId,
		strategy: 'dca',
		enabled: true,
	});
	if (!bot) {
		return new Response(JSON.stringify({ error: 'No active DCA bot found' }), {
			status: 404,
		});
	}

	try {
		const exchangeClass = bot.useBinance ? ccxt.binance : ccxt.bybit;
		const exchange = new exchangeClass({
			apiKey: decrypt(bot.useBinance ? bot.binance.apiKey : bot.bybit.apiKey),
			secret: decrypt(bot.useBinance ? bot.binance.secret : bot.bybit.secret),
			options: { defaultType: 'spot' },
			enableRateLimit: true,
		});

		await exchange.loadMarkets();
		const symbol = bot.dcaPair.includes('/')
			? bot.dcaPair
			: `${bot.dcaPair.slice(0, -4)}/${bot.dcaPair.slice(-4)}`;
		const ticker = await exchange.fetchTicker(symbol);
		const currentPrice = ticker.last;

		const orders = await Order.find({ user: bot.user, symbol, status: 'open' });
		let totalAmount = 0;
		let totalCost = 0;

		orders.forEach((order) => {
			totalAmount += order.amount;
			totalCost += order.price * order.amount;
		});

		const averagePrice =
			totalAmount > 0 ? totalCost / totalAmount : currentPrice;
		const tpMargin = 0.015;
		const tpPrice = averagePrice * (1 + tpMargin);

		const nextLayerPrice = averagePrice * (1 - 0.01 * (orders.length + 1));

		return new Response(
			JSON.stringify({
				botId: bot._id,
				pair: symbol,
				currentPrice,
				averagePrice,
				tpPrice,
				nextLayerPrice,
				totalAmount,
				currentLayer: orders.length,
				usdtBalance: (await exchange.fetchBalance()).total['USDT'] || 0,
				baseBalance:
					(await exchange.fetchBalance()).total[symbol.split('/')[0]] || 0,
			}),
			{
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	} catch (error) {
		return new Response(JSON.stringify({ error: error.message }), {
			status: 500,
		});
	}
}
