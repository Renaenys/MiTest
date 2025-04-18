// app/api/user/profile/route.js

import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { verifyToken, signToken } from "@/lib/auth";

export async function GET(request) {
  await dbConnect();

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    console.error("JWT verify failed:", err);
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 401 });
  }

  const userId = decoded.id || decoded._id;
  if (!userId) {
    console.error("Token payload missing id:", decoded);
    return new Response(JSON.stringify({ error: "Invalid token payload" }), { status: 401 });
  }

  let user;
  try {
    user = await User.findById(userId).select("-password -activationCode");
  } catch (err) {
    console.error("DB error:", err);
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
  }

  if (!user) {
    console.warn("No user found with id:", userId);
    // return 401 so client redirects to login
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  return new Response(JSON.stringify(user), { status: 200 });
}


export async function POST(request) {
  await dbConnect();

  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), { status: 401 });
  }

  const token = authHeader.replace(/^Bearer\s+/i, "");
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    console.error("JWT verify failed:", err);
    return new Response(JSON.stringify({ error: "Invalid or expired token" }), { status: 401 });
  }

  const userId = decoded.id || decoded._id;
  if (!userId) {
    console.error("Token payload missing id:", decoded);
    return new Response(JSON.stringify({ error: "Invalid token payload" }), { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (err) {
    console.error("JSON parse error:", err);
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  const { firstName, lastName, country } = body;
  if (!firstName && !lastName && !country) {
    return new Response(JSON.stringify({ error: "Nothing to update" }), { status: 400 });
  }

  let user;
  try {
    user = await User.findById(userId);
  } catch (err) {
    console.error("DB error:", err);
    return new Response(JSON.stringify({ error: "Database error" }), { status: 500 });
  }

  if (!user) {
    console.warn("No user found with id:", userId);
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  if (firstName) user.firstName = firstName;
  if (lastName)  user.lastName  = lastName;
  if (country)   user.country   = country;

  try {
    await user.save();
  } catch (err) {
    console.error("Save error:", err);
    return new Response(JSON.stringify({ error: "Failed to update profile" }), { status: 500 });
  }

  const newToken = signToken(user);
  return new Response(JSON.stringify({ message: "Profile updated", token: newToken }), { status: 200 });
}
