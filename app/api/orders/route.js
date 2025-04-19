// app/api/orders/route.js
import dbConnect from "@/lib/dbConnect";
import Order from "@/models/Order";
import { verifyToken } from "@/lib/auth";

export async function GET(request) {
  await dbConnect();
  const authHeader = request.headers.get("authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });
  let decoded;
  try {
    decoded = verifyToken(authHeader.replace("Bearer ", ""));
  } catch {
    return new Response("Invalid token", { status: 401 });
  }

  const orders = await Order.find({ user: decoded.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return new Response(JSON.stringify(orders), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
