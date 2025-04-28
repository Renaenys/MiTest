import mongoose from 'mongoose';

const BotSettingSchema = new mongoose.Schema({
	user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	binance: { apiKey: String, secret: String },
	bybit: { apiKey: String, secret: String },
	useBinance: { type: Boolean, default: false },
	useBybit: { type: Boolean, default: false },
	credit: { type: Number, default: 0 },
	enabled: { type: Boolean, default: true },

	strategy: { type: String, enum: ['signal', 'dca'], default: 'signal' },

	dcaPair: { type: String, default: '' },
	dcaOrderSize: { type: Number, default: 0 },
	dcaMaxLayers: { type: Number, default: 0 },

	preferredSide: { type: String, default: 'longShort' },
	longSize: { type: Number, default: 6 },
	shortSize: { type: Number, default: 6 },
	stopLoss: { type: Number, default: 0 },
	takeProfit: { type: Number, default: 0.5 },
	leverage: { type: Number, default: 1 },
	tpSlEnabled: { type: Boolean, default: false },

	createdAt: { type: Date, default: Date.now },
});

export default mongoose.models.BotSetting ||
	mongoose.model('BotSetting', BotSettingSchema);
