import { NextResponse } from 'next/server';
import { runAllDcaBots } from '@/lib/dcaRunner'; // Make sure this exists

export async function POST() {
	try {
		await runAllDcaBots(); // Runs your DCA logic
		console.log(`[API] ✅ DCA run completed at ${new Date().toISOString()}`);
		return NextResponse.json({ status: '✅ DCA run completed' });
	} catch (err) {
		console.error('❌ DCA run failed:', err);
		return NextResponse.json(
			{ status: '❌ DCA failed', error: err.message },
			{ status: 500 }
		);
	}
}

// Block GET requests (optional)
export function GET() {
	return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}
