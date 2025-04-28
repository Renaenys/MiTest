'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

	// 1) Auth & user
	useEffect(() => {
		setIsClient(true);
		const token = localStorage.getItem('token');
		if (!token) return router.push('/login');
		try {
			setUser(JSON.parse(atob(token.split('.')[1])));
		} catch {
			router.push('/login');
		}
	}, [router]);

	// 2) Fetch settings & positions once
	useEffect(() => {
		if (!isClient || !user) return;
		const token = localStorage.getItem('token');

		// a) Bot settings (to show credit, etc)
		axios
			.get('/api/bot-settings', {
				headers: { Authorization: `Bearer ${token}` },
			})
			.then((res) => setBotSettings(res.data))
			.catch(console.error);

		// b) Live positions
		axios
			.get('/api/positions/live', {
				headers: { Authorization: `Bearer ${token}` },
			})
			.then((res) => setPositions(res.data))
			.catch((err) => console.error('Error fetching positions:', err));
	}, [isClient, user]);

	if (!isClient || !user) {
		return <p className="text-center mt-10 text-gray-300">Loading…</p>;
	}

	const handleLogout = () => {
		localStorage.removeItem('token');
		router.push('/login');
	};

	return (
		<div className="relative min-h-screen bg-gray-900 text-gray-100">
			{/* Mobile “open” button */}
			{collapsed && (
				<button
					onClick={() => setCollapsed(false)}
					className="fixed top-4 left-4 z-40 text-white md:hidden"
				>
					<FiMenu size={28} />
				</button>
			)}

			{/* Sidebar */}
			<aside
				className={`
          fixed inset-y-0 left-0 z-30 bg-gray-900 p-4 overflow-y-auto
          transform transition-transform duration-200 w-64
          ${collapsed ? '-translate-x-full' : 'translate-x-0'}
          md:static md:translate-x-0
          ${collapsed ? 'md:w-16' : 'md:w-64'}
        `}
			>
				<div className="flex items-center justify-between mb-6">
					{!collapsed && <span className="text-xl font-bold">Xtrade</span>}
					<button
						onClick={() => setCollapsed(!collapsed)}
						className="text-gray-300 hover:text-white"
					>
						<FiMenu size={20} />
					</button>
				</div>
				<nav className="space-y-4">
					<button
						onClick={() => router.push('/pages/profile')}
						className="flex items-center gap-2 hover:text-blue-400 w-full"
					>
						<FiUser />
						{!collapsed && 'Profile'}
					</button>
					<button
						onClick={() => router.push('/pages/bot-settings')}
						className="flex items-center gap-2 hover:text-blue-400 w-full"
					>
						<FiSettings />
						{!collapsed && 'Settings'}
					</button>
					<button
						onClick={() => router.push('/pages/logs')}
						className="flex items-center gap-2 hover:text-yellow-400 w-full"
					>
						<FiClipboard />
						{!collapsed && 'Logs'}
					</button>
					<button
						onClick={handleLogout}
						className="flex items-center gap-2 hover:text-red-400 w-full"
					>
						<FiLogOut />
						{!collapsed && 'Logout'}
					</button>
				</nav>
			</aside>

			{/* Main content */}
			<main
				className={`
          bg-gray-800 p-6 overflow-y-auto transition-all duration-200
          ${collapsed ? 'md:ml-16' : 'md:ml-64'}
        `}
			>
				{/* Header */}
				<div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 space-y-4 md:space-y-0">
					<div>
						<h2 className="text-2xl font-semibold">
							{user.firstName} {user.lastName}
						</h2>
						<p className="text-gray-400">{user.email}</p>
					</div>
					<div className="text-lg">
						Points: <strong>{botSettings?.credit ?? 0}</strong>
					</div>
				</div>

				{/* Open Positions */}
				<section className="bg-gray-700 p-4 rounded-lg mb-6">
					<h3 className="text-xl mb-2">Your Open Positions</h3>
					{positions.length === 0 ? (
						<p className="text-gray-400">No open positions.</p>
					) : (
						<div className="grid grid-cols-4 gap-4 text-sm">
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
			</main>
		</div>
	);
}
