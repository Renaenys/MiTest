import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';

export async function POST(req) {
  await dbConnect();
  try {
    const { email, code } = await req.json();

    const user = await User.findOne({ email });
    if (!user) return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });

    if (user.isVerified) return new Response(JSON.stringify({ message: 'User already verified' }), { status: 400 });
    if (user.activationCode !== code) return new Response(JSON.stringify({ message: 'Invalid code' }), { status: 400 });

    user.isVerified = true;
    user.activationCode = '';
    await user.save();

    return new Response(JSON.stringify({ message: 'Verified successfully' }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ message: 'Verification failed' }), { status: 500 });
  }
}
