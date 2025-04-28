// app/api/bot-settings/route.js
import dbConnect from '@/lib/dbConnect';
import BotSetting from '@/models/BotSetting';
import { decrypt, encrypt } from '@/lib/crypto';
import { verifyToken } from '@/lib/auth';

export async function GET(req) {
	await dbConnect();
	const token = req.headers.get('authorization')?.replace('Bearer ', '');
	if (!token) return new Response('Unauthorized', { status: 401 });

	let userId;
	try {
		({ id: userId } = verifyToken(token));
	} catch {
		return new Response('Invalid token', { status: 401 });
	}

	let s = await BotSetting.findOne({ user: userId });
	if (!s) {
		s = new BotSetting({ user: userId });
		await s.save();
	}

	const out = s.toObject();
	// decrypt API secrets
	if (out.binance?.apiKey) out.binance.apiKey = decrypt(out.binance.apiKey);
	if (out.binance?.secret) out.binance.secret = decrypt(out.binance.secret);
	if (out.bybit?.apiKey) out.bybit.apiKey = decrypt(out.bybit.apiKey);
	if (out.bybit?.secret) out.bybit.secret = decrypt(out.bybit.secret);

	return new Response(JSON.stringify(out), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}

export async function POST(req) {
	await dbConnect();
	const token = req.headers.get('authorization')?.replace('Bearer ', '');
	if (!token) return new Response('Unauthorized', { status: 401 });

	let userId;
	try {
		({ id: userId } = verifyToken(token));
	} catch {
		return new Response('Invalid token', { status: 401 });
	}

	let body;
	try {
		body = await req.json();
	} catch {
		return new Response('Invalid JSON', { status: 400 });
	}

	// Destructure all fields, including DCA
	const {
		binanceApiKey,
		binanceSecret,
		bybitApiKey,
		bybitSecret,
		useBinance,
		useBybit,
		credit,
		enabled,
		strategy,
		dcaPair,
		dcaOrderSize,
		dcaMaxLayers,
		thresholdBalance,
		// …other fields…
	} = body;

	let s = await BotSetting.findOne({ user: userId });
	if (!s) s = new BotSetting({ user: userId });

	// Encrypt API keys if present
	s.binance = s.binance || {};
	s.bybit = s.bybit || {};
	if (binanceApiKey) s.binance.apiKey = encrypt(binanceApiKey.trim());
	if (binanceSecret) s.binance.secret = encrypt(binanceSecret.trim());
	if (bybitApiKey) s.bybit.apiKey = encrypt(bybitApiKey.trim());
	if (bybitSecret) s.bybit.secret = encrypt(bybitSecret.trim());

	// Save toggles & numeric fields
	if (typeof useBinance === 'boolean') s.useBinance = useBinance;
	if (typeof useBybit === 'boolean') s.useBybit = useBybit;
	if (typeof credit === 'number') s.credit = credit;
	if (typeof enabled === 'boolean') s.enabled = enabled;
	if (['normal', 'dca'].includes(strategy)) s.strategy = strategy;
	if (typeof dcaPair === 'string') s.dcaPair = dcaPair;
	if (typeof dcaOrderSize === 'number') s.dcaOrderSize = dcaOrderSize;
	if (typeof dcaMaxLayers === 'number') s.dcaMaxLayers = dcaMaxLayers;
	if (typeof thresholdBalance === 'number')
		s.thresholdBalance = thresholdBalance;

	// …persist other fields as before…

	await s.save();
	return new Response(JSON.stringify({ message: 'Settings saved' }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
}
