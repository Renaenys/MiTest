import dbConnect from '@/lib/dbConnect';
import BotSetting from '@/models/BotSetting';
import Order from '@/models/Order';
import ccxt from 'ccxt';
import { decrypt } from '@/lib/crypto';

export async function runAllDcaBots() {
  await dbConnect();
  const bots = await BotSetting.find({ strategy: 'dca', enabled: true });

  for (const bot of bots) {
    console.log(`\n===== 🟢 Processing Bot: ${bot._id} (${bot.dcaPair}) =====`);
    if (!bot.dcaPair || !bot.dcaOrderSize || !bot.dcaMaxLayers) continue;

    const exchangeClass = bot.useBinance ? ccxt.binance : ccxt.bybit;
    const exchange = new exchangeClass({
      apiKey: decrypt(bot.useBinance ? bot.binance.apiKey : bot.bybit.apiKey),
      secret: decrypt(bot.useBinance ? bot.binance.secret : bot.bybit.secret),
      options: { defaultType: 'spot' },
      enableRateLimit: true,
    });

    try {
      await exchange.loadMarkets();
      const symbol = bot.dcaPair.includes('/') ? bot.dcaPair : `${bot.dcaPair.slice(0, -4)}/${bot.dcaPair.slice(-4)}`;
      const market = exchange.markets[symbol];
      if (!market) continue;

      const balance = await exchange.fetchBalance();
      const usdtBalance = balance.total['USDT'] || 0;
      const baseCurrency = symbol.split('/')[0];
      const baseBalance = balance.total[baseCurrency] || 0;
      const ticker = await exchange.fetchTicker(symbol);
      const currentPrice = ticker.last;
      const dcaOrderSize = Number(bot.dcaOrderSize);

      const dbOrders = await Order.find({ user: bot.user, symbol, status: 'open' });
      const filledOrders = dbOrders;
      const currentLayer = filledOrders.length;

      let totalAmount = 0;
      let totalCost = 0;
      filledOrders.forEach(order => {
        totalAmount += order.amount;
        totalCost += order.price * order.amount;
      });
      const averagePrice = totalAmount > 0 ? totalCost / totalAmount : currentPrice;

      console.log(`🧮 Filled Layers: ${filledOrders.length}, Avg Price: ${averagePrice.toFixed(6)}`);
      console.log(`💰 USDT Balance: ${usdtBalance}, ${baseCurrency} Balance: ${baseBalance}`);

      // TP Price Calculation
      const tpMargin = 0.015; // ~1.5% profit over avg price
      const tpPrice = averagePrice * (1 + tpMargin);

      // ✅ Session Start: No orders in DB
      if (currentLayer === 0 && usdtBalance >= dcaOrderSize) {
        const amount = dcaOrderSize / currentPrice;
        const marketOrder = await exchange.createMarketBuyOrder(symbol, amount);
        await Order.create({
          user: bot.user,
          exchange: bot.useBinance ? 'binance' : 'bybit',
          orderId: marketOrder.id,
          symbol,
          side: 'buy',
          type: 'market',
          amount: marketOrder.amount,
          price: marketOrder.price,
          status: 'open',
          layer: 1,
          raw: marketOrder,
        });
        console.log(`✅ New Session: Market Buy ${amount} ${baseCurrency} at ${currentPrice}`);
        continue;
      }

      // ✅ TP Check: Auto Profit
      if (totalAmount > 0 && currentPrice >= tpPrice) {
        const sellOrder = await exchange.createMarketSellOrder(symbol, totalAmount);
        await Order.updateMany(
          { user: bot.user, symbol, status: 'open' },
          { $set: { status: 'closed', profit: sellOrder.cost - totalCost, closedAt: new Date() } }
        );
        console.log(`🎯 TP HIT! Sold ${totalAmount} ${baseCurrency} at ${currentPrice} for profit.`);
        continue; // Session ends
      }

      // ✅ Add DCA Layer if Price Drops
      if (currentLayer < bot.dcaMaxLayers) {
        const nextLayerPrice = averagePrice * (1 - 0.01 * (currentLayer + 1));
        if (currentPrice <= nextLayerPrice && usdtBalance >= dcaOrderSize) {
          const amount = dcaOrderSize / nextLayerPrice;
          const limitOrder = await exchange.createLimitBuyOrder(symbol, amount, nextLayerPrice);
          await Order.create({
            user: bot.user,
            exchange: bot.useBinance ? 'binance' : 'bybit',
            orderId: limitOrder.id,
            symbol,
            side: 'buy',
            type: 'limit',
            amount: limitOrder.amount,
            price: limitOrder.price,
            status: 'open',
            layer: currentLayer + 1, // 🆕 Track next layer number
            raw: limitOrder,
          });
          console.log(`✅ DCA Layer ${currentLayer + 1} Added: ${amount} ${baseCurrency} at ${nextLayerPrice}`);
        } else {
          console.log(`⏳ Price not yet low enough for next DCA layer.`);
        }
      } else {
        console.log(`⛔ Max DCA layers reached (${currentLayer}/${bot.dcaMaxLayers})`);
      }

    } catch (error) {
      console.error(`❌ Error for bot ${bot._id}:`, error);
    }
  }
}
