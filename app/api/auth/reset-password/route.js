// app/api/auth/reset-password/route.js
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request) {
	const { code, password } = await request.json();
	await dbConnect();

	const user = await User.findOne({
		resetPasswordCode: code,
		resetPasswordExpires: { $gt: Date.now() },
	});
	if (!user) {
		return NextResponse.json(
			{ ok: false, error: 'Invalid or expired code.' },
			{ status: 400 }
		);
	}

	const salt = await bcrypt.genSalt(10);
	user.password = await bcrypt.hash(password, salt);
	user.resetPasswordCode = undefined;
	user.resetPasswordExpires = undefined;
	await user.save();

	return NextResponse.json({ ok: true });
}
