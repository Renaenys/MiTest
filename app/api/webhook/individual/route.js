import dbConnect from "@/lib/dbConnect";
import BotSetting from "@/models/BotSetting";
import Order from "@/models/Order";
import { executeTrade } from "@/lib/signalBot";
import { verifyToken } from "@/lib/auth";

export async function POST(request) {
  await dbConnect();

  // Auth
  const auth = request.headers.get("authorization");
  if (!auth) return new Response("Unauthorized", { status: 401 });
  let decoded;
  try {
    decoded = verifyToken(auth.replace("Bearer ",""));
  } catch {
    return new Response("Invalid token", { status: 401 });
  }

  // Payload
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const { secret, signal } = body;
  if (!secret || !signal) {
    return new Response(JSON.stringify({ message: "Missing secret or signal" }), { status: 400 });
  }

  // Settings
  const setting = await BotSetting.findOne({ user: decoded.id });
  if (!setting || !setting.enabled || setting.credit < 100) {
    return new Response(JSON.stringify({ message: "Not eligible" }), { status: 403 });
  }
  if (secret !== setting.webhookType === "individual" ? setting.userSecret : process.env.WEBHOOK_SECRET) {
    return new Response(JSON.stringify({ message: "Invalid secret" }), { status: 403 });
  }

  try {
    // Execute trade: signal.amount is USDT notional -> convert inside executeTrade if needed
    const order = await executeTrade(setting, signal);

    // deduct 10 points
    setting.credit -= 10;
    await setting.save();

    // log order
    await Order.create({
      user:        setting.user,
      webhookType: "individual",
      exchange:    signal.exchange,
      orderId:     order.id || order.orderId || String(order.timestamp),
      symbol:      signal.symbol,
      side:        signal.side,
      type:        signal.type,
      amount:      order.amount || signal.amount,
      price:       order.price || signal.price,
      status:      order.status || "open",
      raw:         order
    });

    return new Response(JSON.stringify({ message: "Order executed", order }), { status: 200 });
  } catch (err) {
    console.error("Individual webhook error:", err.message);
    return new Response(JSON.stringify({ message: err.message }), { status: 500 });
  }
}
