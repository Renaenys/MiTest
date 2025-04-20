'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import axios from 'axios';

const safeLocalStorage = {
	getItem: (key) => {
		if (typeof window === 'undefined') return null;
		try {
			return window.localStorage.getItem(key);
		} catch {
			return null;
		}
	},
	setItem: (key, value) => {
		if (typeof window === 'undefined') return;
		try {
			window.localStorage.setItem(key, value);
		} catch {}
	},
};

export default function LoginPage() {
	const [form, setForm] = useState({ email: '', password: '' });
	const [status, setStatus] = useState({ type: '', message: '' });
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	useEffect(() => {
		const token = safeLocalStorage.getItem('token');
		if (token) router.push('/dashboard');
	}, [router]);

	const handleLogin = async (e) => {
		e.preventDefault();
		setLoading(true);
		setStatus({ type: '', message: '' });
		try {
			const res = await axios.post('/api/auth/login', form);
			if (res.data?.token) {
				safeLocalStorage.setItem('token', res.data.token);
				router.push('/dashboard');
			} else {
				setStatus({ type: 'error', message: 'Invalid response from server.' });
			}
		} catch (err) {
			setStatus({
				type: 'error',
				message: err?.response?.data?.message || 'Login failed',
			});
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="h-screen flex overflow-hidden">
			{/* LEFT: background image on md+ */}
			<div className="hidden md:block md:w-1/2 h-full">
				<img
					src="/logoBG.jpg"
					alt="Login Background"
					className="w-full h-full object-cover object-center"
				/>
			</div>

			{/* RIGHT: form always centers */}
			<div className="w-full md:w-1/2 flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
				<form onSubmit={handleLogin} className="w-full max-w-md space-y-6">
					<h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white">
						Login
					</h2>

					{status.message && (
						<div className="p-3 text-sm rounded bg-red-100 text-red-800">
							{status.message}
						</div>
					)}

					<input
						type="email"
						name="email"
						required
						placeholder="Email"
						className="w-full p-3 border rounded"
						onChange={(e) => setForm({ ...form, email: e.target.value })}
					/>

					<input
						type="password"
						name="password"
						required
						placeholder="Password"
						className="w-full p-3 border rounded"
						onChange={(e) => setForm({ ...form, password: e.target.value })}
					/>

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-700 disabled:opacity-60"
					>
						{loading ? 'Logging in...' : 'Login'}
					</button>

					{/* Links row */}
					<div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
						<Link href="/forgot-password" className="hover:underline">
							Forgot Password?
						</Link>
						<div>
							Don’t have an account?{' '}
							<Link href="/register" className="hover:underline text-blue-600">
								Register
							</Link>
						</div>
					</div>
				</form>
			</div>
		</div>
	);
}
