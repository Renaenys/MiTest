// app/forgot-password/page.jsx
'use client';
import { useState } from 'react';
import axios from 'axios';

export default function ForgotPasswordPage() {
	const [email, setEmail] = useState('');
	const [status, setStatus] = useState('');

	const handleSubmit = async (e) => {
		e.preventDefault();
		setStatus('Sending reset link…');
		try {
			await axios.post('/api/auth/forgot-password', { email });
			setStatus('If that email exists, a reset link has been sent.');
		} catch {
			setStatus('Something went wrong.');
		}
	};

	return (
		<div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
			<form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
				<h2 className="text-2xl font-bold text-center text-gray-800 dark:text-white">
					Forgot Password
				</h2>
				{status && (
					<p className="text-center text-sm text-gray-700">{status}</p>
				)}

				<input
					type="email"
					required
					placeholder="Your email"
					className="w-full p-2 border rounded"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
				/>

				<button
					type="submit"
					className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
				>
					Send Reset Link
				</button>
			</form>
		</div>
	);
}
