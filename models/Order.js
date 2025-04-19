// models/Order.js
import mongoose from "mongoose";

const OrderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  exchange: { type: String, enum: ["binance", "bybit"], required: true },
  orderId: { type: String, required: true },
  symbol: { type: String, required: true },
  side: { type: String, enum: ["buy", "sell"], required: true },
  type: { type: String, enum: ["market", "limit"], required: true },
  amount: { type: Number, required: true },
  price: { type: Number }, // for limit orders
  status: { type: String, enum: ["open", "closed"], default: "open" },
  raw: { type: mongoose.Schema.Types.Mixed }, // full CCXT response
  rawClose: { type: mongoose.Schema.Types.Mixed }, // CCXT response on close
  createdAt: { type: Date, default: Date.now },
  closedAt: { type: Date },
});

export default mongoose.models.Order || mongoose.model("Order", OrderSchema);
