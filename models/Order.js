import mongoose from 'mongoose';

const OrderSchema = new mongoose.Schema({
	user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
	exchange: { type: String, required: true },
	orderId: { type: String, required: true },
	symbol: { type: String, required: true },
	side: { type: String, enum: ['buy', 'sell'], required: true },
	type: { type: String, enum: ['market', 'limit'], required: true },
	amount: { type: Number, required: true },
	price: { type: Number },
	status: { type: String, enum: ['open', 'closed'], default: 'open' },
	profit: { type: Number },
	layer: { type: Number }, // 🆕 Track Layer Number
	raw: mongoose.Schema.Types.Mixed,
	createdAt: { type: Date, default: Date.now },
	closedAt: Date,
});

export default mongoose.models.Order || mongoose.model('Order', OrderSchema);
