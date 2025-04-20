// app/api/auth/forgot-password/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { sendResetPasswordEmail } from '@/lib/mailer';
import crypto from 'crypto';

export async function POST(request) {
	const { email } = await request.json();
	await dbConnect();

	const user = await User.findOne({ email });
	if (!user) {
		// for security, don’t reveal whether email exists
		return NextResponse.json({ ok: true });
	}

	// generate reset code & expiry
	const code = crypto.randomBytes(20).toString('hex');
	user.resetPasswordCode = code;
	user.resetPasswordExpires = Date.now() + 3600 * 1000; // 1 hour
	await user.save();

	await sendResetPasswordEmail(email, code);
	return NextResponse.json({ ok: true });
}
