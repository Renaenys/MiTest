// app/reset-password/page.jsx
'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import axios from 'axios';

export default function ResetPasswordPage() {
	const params = useSearchParams();
	const router = useRouter();
	const code = params.get('code');

	const [password, setPassword] = useState('');
	const [status, setStatus] = useState('');

	useEffect(() => {
		if (!code) {
			setStatus('No reset code provided.');
		}
	}, [code]);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setStatus('Resetting…');
		try {
			await axios.post('/api/auth/reset-password', { code, password });
			setStatus('Password reset! Redirecting to login…');
			setTimeout(() => router.push('/login'), 2000);
		} catch (err) {
			setStatus(err.response?.data?.error || 'Failed to reset password.');
		}
	};

	return (
		<div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
			<form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
				<h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">
					Reset Password
				</h2>
				{status && (
					<p className="text-center text-sm text-gray-700">{status}</p>
				)}

				<input
					type="password"
					required
					placeholder="New password"
					className="w-full p-2 border rounded"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
				/>

				<button
					type="submit"
					disabled={!code}
					className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
				>
					Reset Password
				</button>
			</form>
		</div>
	);
}
