import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { withAdmin } from '@/lib/withAdmin';

export const GET = withAdmin(async (req) => {
  await dbConnect();
  const users = await User.find({}, '-password'); // exclude password
  return new Response(JSON.stringify({ users }), { status: 200 });
});
