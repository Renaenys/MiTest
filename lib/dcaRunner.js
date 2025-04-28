import dbConnect from '@/lib/dbConnect';
import BotSetting from '@/models/BotSetting';
import ccxt from 'ccxt';
import { decrypt } from '@/lib/crypto';

export async function runAllDcaBots() {
	await dbConnect();
	const bots = await BotSetting.find({ strategy: 'dca', enabled: true });

	for (const bot of bots) {
		if (!bot.dcaPair || !bot.dcaOrderSize || !bot.dcaMaxLayers) continue;

		const isBinance = bot.useBinance;
		const exClass = isBinance ? ccxt.binance : ccxt.bybit;
		const ex = new exClass({
			apiKey: decrypt(isBinance ? bot.binance.apiKey : bot.bybit.apiKey),
			secret: decrypt(isBinance ? bot.binance.secret : bot.bybit.secret),
			options: { defaultType: 'spot' },
		});

		try {
			const orders = await ex.fetchOrders(bot.dcaPair);
			const filled = orders.filter(
				(o) => o.status === 'closed' || o.status === 'filled'
			);

			if (filled.length === 0) {
				await ex.createMarketBuyOrder(
					bot.dcaPair,
					bot.dcaOrderSize / (await ex.fetchTicker(bot.dcaPair)).last
				);
			} else if (filled.length < bot.dcaMaxLayers) {
				const lastPrice = (await ex.fetchTicker(bot.dcaPair)).last;
				const nextPrice = lastPrice * (1 - 0.01 * (filled.length + 1));
				await ex.createLimitBuyOrder(
					bot.dcaPair,
					bot.dcaOrderSize / nextPrice,
					nextPrice
				);
			}
		} catch (err) {
			if (err instanceof ccxt.InsufficientFunds) {
				console.warn(`DCA skipped for user ${bot.user}: insufficient funds`);
				continue;
			}
			console.error(`DCA error for user ${bot.user}:`, err);
		}
	}
}
