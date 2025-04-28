import { runAllDcaBots } from '@/lib/dcaRunner';

export async function POST() {
	try {
		await runAllDcaBots();
		return new Response(JSON.stringify({ message: 'DCA run completed' }), {
			status: 200,
		});
	} catch (err) {
		console.error('DCA run failed:', err);
		return new Response(JSON.stringify({ message: 'DCA run failed' }), {
			status: 500,
		});
	}
}

export async function GET() {
	return new Response(JSON.stringify({ message: 'Use POST to trigger DCA' }), {
		status: 405,
	});
}
