import bcrypt from 'bcryptjs';
import User from '@/models/User';
import dbConnect from '@/lib/dbConnect';
import { sendActivationEmail } from '@/lib/mailer';

export async function POST(req) {
  await dbConnect();

  try {
    const { email, password, firstName, lastName, country } = await req.json();

    const existing = await User.findOne({ email });
    if (existing) return new Response(JSON.stringify({ message: 'Email already registered' }), { status: 400 });

    const hashed = await bcrypt.hash(password, 10);
    const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code

    const newUser = await User.create({
      email, password: hashed, firstName, lastName, country,
      activationCode: code,
    });

    await sendActivationEmail(email, code);

    return new Response(JSON.stringify({ message: 'Registered. Check email for activation code.' }), { status: 201 });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ message: 'Registration failed' }), { status: 500 });
  }
}
