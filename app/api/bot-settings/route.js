import dbConnect from "@/lib/dbConnect";
import BotSetting from "@/models/BotSetting";
import { decrypt, encrypt } from "@/lib/crypto";
import { verifyToken } from "@/lib/auth";

export async function GET(request) {
  await dbConnect();

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const token = authHeader.replace("Bearer ", "");
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    return new Response("Invalid token", { status: 401 });
  }

  let settings = await BotSetting.findOne({ user: decoded.id });
  if (!settings) {
    // Create default settings
    settings = new BotSetting({
      user: decoded.id,
      binance: { apiKey: "", secret: "" },
      bybit: { apiKey: "", secret: "" },
      useBinance: false,
      useBybit: false,
      credit: 0,
      enabled: true,
      webhookType: "individual",
      activation: "active",
      preferredSide: "longShort",
      longSize: 6,
      shortSize: 6,
      stopLoss: 0,
      takeProfit: 0.5,
      leverage: 1,
      tpSlEnabled: false,
    });
    await settings.save();
    console.log("Default BotSettings created for user:", decoded.id);
  }

  // Decrypt exchange credentials (if present)
  const decryptedBinance = settings.binance?.apiKey
    ? {
        apiKey: decrypt(settings.binance.apiKey),
        secret: decrypt(settings.binance.secret),
      }
    : null;

  const decryptedBybit = settings.bybit?.apiKey
    ? {
        apiKey: decrypt(settings.bybit.apiKey),
        secret: decrypt(settings.bybit.secret),
      }
    : null;

  const response = {
    ...settings.toObject(),
    binance: decryptedBinance,
    bybit: decryptedBybit,
  };

  return new Response(JSON.stringify(response), { status: 200 });
}

export async function POST(request) {
  await dbConnect();

  const authHeader = request.headers.get("authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401 });

  const token = authHeader.replace("Bearer ", "");
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    return new Response("Invalid token", { status: 401 });
  }

  let payload;
  try {
    payload = await request.json();
  } catch (err) {
    console.error("Error parsing JSON", err);
    return new Response("Invalid JSON", { status: 400 });
  }

  // Accept these fields only.
  const {
    binanceApiKey,
    binanceSecret,
    bybitApiKey,
    bybitSecret,
    credit,
    enabled,
    useBinance,
    useBybit,
    activation,
    webhookType,
    preferredSide,
    longSize,
    shortSize,
    stopLoss,
    takeProfit,
    leverage,
    tpSlEnabled,
  } = payload;

  let settings = await BotSetting.findOne({ user: decoded.id });
  if (!settings) {
    settings = new BotSetting({
      user: decoded.id,
      binance: {
        apiKey: binanceApiKey ? encrypt(binanceApiKey) : "",
        secret: binanceSecret ? encrypt(binanceSecret) : "",
      },
      bybit: {
        apiKey: bybitApiKey ? encrypt(bybitApiKey) : "",
        secret: bybitSecret ? encrypt(bybitSecret) : "",
      },
      credit,
      enabled,
      useBinance,
      useBybit,
      activation,
      webhookType,
      preferredSide,
      longSize,
      shortSize,
      stopLoss,
      takeProfit,
      leverage,
      tpSlEnabled,
    });
  } else {
    // Ensure nested objects exist.
    if (!settings.binance) settings.binance = {};
    if (!settings.bybit) settings.bybit = {};
    settings.binance.apiKey = binanceApiKey ? encrypt(binanceApiKey) : settings.binance.apiKey;
    settings.binance.secret = binanceSecret ? encrypt(binanceSecret) : settings.binance.secret;
    settings.bybit.apiKey = bybitApiKey ? encrypt(bybitApiKey) : settings.bybit.apiKey;
    settings.bybit.secret = bybitSecret ? encrypt(bybitSecret) : settings.bybit.secret;
    settings.credit = credit;
    settings.enabled = enabled;
    settings.useBinance = useBinance;
    settings.useBybit = useBybit;
    settings.activation = activation;
    settings.webhookType = webhookType;
    settings.preferredSide = preferredSide;
    settings.longSize = longSize;
    settings.shortSize = shortSize;
    settings.stopLoss = stopLoss;
    settings.takeProfit = takeProfit;
    settings.leverage = leverage;
    settings.tpSlEnabled = tpSlEnabled;
  }
  
  try {
    await settings.save();
  } catch (error) {
    console.error("Error saving settings:", error);
    return new Response(JSON.stringify({ message: "Failed to update settings" }), { status: 500 });
  }

  return new Response(JSON.stringify({ message: "Settings saved", settings }), { status: 200 });
}
