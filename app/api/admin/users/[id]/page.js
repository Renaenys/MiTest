import dbConnect from '@/lib/dbConnect';
import User from '@/models/User';
import { withAdmin } from '@/lib/withAdmin';

export const DELETE = withAdmin(async (req, { params }) => {
  await dbConnect();
  await User.findByIdAndDelete(params.id);
  return new Response(JSON.stringify({ message: 'User deleted' }), { status: 200 });
});

export const PUT = withAdmin(async (req, { params }) => {
  await dbConnect();
  const body = await req.json();
  await User.findByIdAndUpdate(params.id, { role: body.role });
  return new Response(JSON.stringify({ message: 'User updated' }), { status: 200 });
});
