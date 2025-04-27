// app/dashboard/page.jsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import {
	FiMenu,
	FiLogOut,
	FiUser,
	FiSettings,
	FiClipboard,
} from 'react-icons/fi';

export default function DashboardPage() {
	const router = useRouter();
	const [isClient, setIsClient] = useState(false);
	const [user, setUser] = useState(null);
	const [botSettings, setBotSettings] = useState(null);
	const [positions, setPositions] = useState([]);
	const [collapsed, setCollapsed] = useState(false);
	const [controlStatus, setControlStatus] = useState('');

	// Signal config state...
	const [activation, setActivation] = useState('active');
	const [webhookType, setWebhookType] = useState('public');
	const [preferredSide, setPreferredSide] = useState('longShort');
	const [longSize, setLongSize] = useState('6');
	const [shortSize, setShortSize] = useState('6');
	const [tpSlEnabled, setTpSlEnabled] = useState(false);
	const [stopLoss, setStopLoss] = useState('0');
	const [takeProfit, setTakeProfit] = useState('0.5');
	const [leverage, setLeverage] = useState('1');

	// 1) Auth & user
	useEffect(() => {
		setIsClient(true);
		const token = localStorage.getItem('token');
		if (!token) return router.push('/pages/login');
		try {
			setUser(JSON.parse(atob(token.split('.')[1])));
		} catch {
			router.push('/pages/login');
		}
	}, [router]);

	// 2) Fetch settings & positions once
	useEffect(() => {
		if (!isClient || !user) return;
		const token = localStorage.getItem('token');

		// a) Bot settings
		axios
			.get('/api/bot-settings', {
				headers: { Authorization: `Bearer ${token}` },
			})
			.then((res) => {
				const d = res.data;
				setBotSettings(d);
				setActivation(d.activation ?? 'active');
				setWebhookType(d.webhookType ?? 'public');
				setPreferredSide(d.preferredSide ?? 'longShort');
				setLongSize(d.longSize?.toString() ?? '6');
				setShortSize(d.shortSize?.toString() ?? '6');
				setStopLoss(d.stopLoss?.toString() ?? '0');
				setTakeProfit(d.takeProfit?.toString() ?? '0.5');
				setLeverage(d.leverage?.toString() ?? '1');
				setTpSlEnabled(d.tpSlEnabled ?? false);
			})
			.catch(console.error);

		// b) Live positions
		axios
			.get('/api/positions/live', {
				headers: { Authorization: `Bearer ${token}` },
			})
			.then((res) => setPositions(res.data))
			.catch((err) => console.error('Error fetching positions:', err));
	}, [isClient, user]);

	// Handlers...
	const handleLogout = () => {
		localStorage.removeItem('token');
		router.push('/pages/login');
	};
	const handleControlSubmit = async (e) => {
		e.preventDefault();
		if (!botSettings) return;
		const token = localStorage.getItem('token');
		const payload = {
			...botSettings,
			activation,
			webhookType,
			preferredSide,
			longSize: +longSize,
			shortSize: +shortSize,
			stopLoss: +stopLoss,
			takeProfit: +takeProfit,
			leverage: +leverage,
			tpSlEnabled,
		};
		try {
			await axios.post('/api/bot-settings', payload, {
				headers: { Authorization: `Bearer ${token}` },
			});
			setControlStatus('Configuration saved!');
		} catch {
			setControlStatus('Error saving configuration.');
		}
	};

	if (!isClient || !user) {
		return <p className="text-center mt-10 text-gray-300">Loading…</p>;
	}

	return (
		<div className="flex min-h-screen">
			{/* Sidebar */}
			<aside
				className={`bg-gray-900 text-white p-4 ${
					collapsed ? 'w-16' : 'w-64'
				} transition-all`}
			>
				<div className="flex items-center justify-between mb-4">
					{!collapsed && <h1 className="text-lg font-bold">Xtrade</h1>}
					<button onClick={() => setCollapsed(!collapsed)}>
						<FiMenu size={20} />
					</button>
				</div>
				<nav className="space-y-4">
					<button
						onClick={() => router.push('/pages/profile')}
						className="flex items-center gap-2 hover:text-blue-400"
					>
						<FiUser />
						{!collapsed && 'Profile'}
					</button>
					<button
						onClick={() => router.push('/pages/bot-settings')}
						className="flex items-center gap-2 hover:text-blue-400"
					>
						<FiSettings />
						{!collapsed && 'Settings'}
					</button>
					<button
						onClick={() => router.push('/pages/logs')}
						className="flex items-center gap-2 hover:text-yellow-400"
					>
						<FiClipboard />
						{!collapsed && 'Logs'}
					</button>
					<button
						onClick={handleLogout}
						className="flex items-center gap-2 hover:text-red-400"
					>
						<FiLogOut />
						{!collapsed && 'Logout'}
					</button>
				</nav>
			</aside>

			{/* Main */}
			<main className="flex-1 bg-gray-800 p-6 text-gray-100 overflow-y-auto">
				{/* Header */}
				<div className="flex justify-between items-center mb-6">
					<div>
						<h2 className="text-2xl font-semibold">
							{user.firstName} {user.lastName}
						</h2>
						<p className="text-gray-400">{user.email}</p>
					</div>
					<div>
						Points: <strong>{botSettings?.credit ?? 0}</strong>
					</div>
				</div>

				{/* Open Positions */}
				<section className="bg-gray-700 p-4 rounded mb-6">
					<h3 className="text-xl mb-2">Your Open Positions</h3>
					{positions.length === 0 ? (
						<p className="text-gray-400">No open positions.</p>
					) : (
						<div className="grid grid-cols-4 gap-2 text-sm">
							<div className="font-bold">Symbol</div>
							<div className="font-bold">Side</div>
							<div className="font-bold">Contracts</div>
							<div className="font-bold">Entry Price</div>
							{positions.map((p, i) => (
								<React.Fragment key={i}>
									<div>{p.symbol}</div>
									<div className="capitalize">{p.side}</div>
									<div>{p.contracts}</div>
									<div>{p.entryPrice}</div>
								</React.Fragment>
							))}
						</div>
					)}
				</section>

				{/* Signal Configuration Form (unchanged) */}
				<section className="bg-gray-700 p-4 rounded">
					<h3 className="text-xl mb-4">Signal Configuration</h3>
					{controlStatus && (
						<p className="mb-4 text-green-400">{controlStatus}</p>
					)}
					<form
						onSubmit={handleControlSubmit}
						className="space-y-4 text-gray-200"
					>
						{/* Activation */}
						<div>
							<label className="block mb-1">Signal Activation</label>
							<select
								value={activation}
								onChange={(e) => setActivation(e.target.value)}
								className="w-full p-2 bg-gray-600 rounded"
							>
								<option value="active">Active</option>
								<option value="inactive">Inactive</option>
							</select>
						</div>
						{/* Webhook Mode */}
						<div>
							<label className="block mb-1">Webhook Mode</label>
							<select
								value={webhookType}
								onChange={(e) => setWebhookType(e.target.value)}
								className="w-full p-2 bg-gray-600 rounded"
							>
								<option value="public">Public</option>
								<option value="individual">Individual</option>
							</select>
						</div>
						{/* Preferred Side */}
						<div>
							<label className="block mb-1">Preferred Side</label>
							<select
								value={preferredSide}
								onChange={(e) => setPreferredSide(e.target.value)}
								className="w-full p-2 bg-gray-600 rounded"
							>
								<option value="long">Long</option>
								<option value="short">Short</option>
								<option value="longShort">Long + Short</option>
							</select>
						</div>
						{/* Sizes */}
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block mb-1">Long Size (USDT)</label>
								<input
									type="number"
									value={longSize}
									onChange={(e) => setLongSize(e.target.value)}
									className="w-full p-2 bg-gray-600 rounded"
								/>
							</div>
							<div>
								<label className="block mb-1">Short Size (USDT)</label>
								<input
									type="number"
									value={shortSize}
									onChange={(e) => setShortSize(e.target.value)}
									className="w-full p-2 bg-gray-600 rounded"
								/>
							</div>
						</div>
						{/* TP/SL */}
						<div className="flex items-center">
							<input
								type="checkbox"
								checked={tpSlEnabled}
								onChange={(e) => setTpSlEnabled(e.target.checked)}
								className="mr-2"
							/>
							<label>Enable TP/SL</label>
						</div>
						{/* Stop/Take/Leverage */}
						<div className="grid grid-cols-3 gap-4">
							<div>
								<label className="block mb-1">Stop Loss (%)</label>
								<input
									type="number"
									step="0.1"
									value={stopLoss}
									onChange={(e) => setStopLoss(e.target.value)}
									className="w-full p-2 bg-gray-600 rounded"
								/>
							</div>
							<div>
								<label className="block mb-1">Take Profit (%)</label>
								<input
									type="number"
									step="0.1"
									value={takeProfit}
									onChange={(e) => setTakeProfit(e.target.value)}
									className="w-full p-2 bg-gray-600 rounded"
								/>
							</div>
							<div>
								<label className="block mb-1">Leverage</label>
								<input
									type="number"
									value={leverage}
									onChange={(e) => setLeverage(e.target.value)}
									className="w-full p-2 bg-gray-600 rounded"
								/>
							</div>
						</div>
						<button
							type="submit"
							className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
						>
							Save Configuration
						</button>
					</form>
				</section>
			</main>
		</div>
	);
}
