// models/BotSetting.js
import mongoose from 'mongoose';

const BotSettingSchema = new mongoose.Schema({
	user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	binance: { apiKey: String, secret: String },
	bybit: { apiKey: String, secret: String },
	useBinance: { type: Boolean, default: false },
	useBybit: { type: Boolean, default: false },
	credit: { type: Number, default: 0 },
	enabled: { type: Boolean, default: true },
	webhookType: {
		type: String,
		enum: ['public', 'individual'],
		default: 'individual',
	},

	// … existing fields …
	activation: { type: String, default: 'active' },
	preferredSide: { type: String, default: 'longShort' },
	longSize: { type: Number, default: 6 },
	shortSize: { type: Number, default: 6 },
	stopLoss: { type: Number, default: 0 },
	takeProfit: { type: Number, default: 0.5 },
	leverage: { type: Number, default: 1 },
	tpSlEnabled: { type: Boolean, default: false },

	// ▼ NEW for DCA ▼
	strategy: { type: String, enum: ['normal', 'dca'], default: 'normal' },
	dcaPair: { type: String, default: '' }, // e.g. "BTCUSDT"
	dcaOrderSize: { type: Number, default: 0 }, // in USDT
	dcaMaxLayers: { type: Number, default: 0 }, // how many DCA orders max
	thresholdBalance: { type: Number, default: 0 }, // min USDT balance required

	createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.BotSetting ||
	mongoose.model('BotSetting', BotSettingSchema);
