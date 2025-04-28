import fetch from 'node-fetch';

async function callLocalAPI() {
	try {
		const res = await fetch('http://localhost:3000/api/dca-run', {
			method: 'POST',
		});
		const data = await res.json();
		console.log(`[DCA] ${data.status}`);
	} catch (err) {
		console.error('❌ Failed to call DCA API:', err.message);
	}
}

callLocalAPI().then(() => process.exit());
