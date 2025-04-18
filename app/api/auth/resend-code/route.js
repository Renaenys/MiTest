import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { sendActivationEmail } from '@/lib/mailer';

export async function POST(req) {
  await dbConnect();

  try {
    const { email } = await req.json();

    const user = await User.findOne({ email });
    if (!user) return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });
    if (user.isVerified) return new Response(JSON.stringify({ message: 'User already verified' }), { status: 400 });

    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.activationCode = newCode;
    await user.save();

    await sendActivationEmail(email, newCode);

    return new Response(JSON.stringify({ message: 'Activation code resent!' }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ message: 'Failed to resend code' }), { status: 500 });
  }
}
