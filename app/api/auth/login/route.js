import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import bcrypt from 'bcryptjs';
import { signToken } from '@/lib/auth';

export async function POST(req) {
	await dbConnect();

	const { email, password } = await req.json();
	const user = await User.findOne({ email });

	if (!user)
		return new Response(JSON.stringify({ message: 'User not found' }), {
			status: 404,
		});
	if (!user.isVerified)
		return new Response(
			JSON.stringify({ message: 'Please verify your email first' }),
			{ status: 403 }
		);

	const isMatch = await bcrypt.compare(password, user.password);
	if (!isMatch)
		return new Response(JSON.stringify({ message: 'Invalid credentials' }), {
			status: 401,
		});

	const token = signToken(user);
	return new Response(JSON.stringify({ token }), { status: 200 });
}
