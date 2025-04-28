'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { FiArrowLeft } from 'react-icons/fi';

export default function BotSettingsPage() {
	const router = useRouter();
	const [form, setForm] = useState({
		useBinance: false,
		useBybit: false,
		category: 'signal', // signal = futures, dca = spot
		dcaPair: '',
		dcaOrderSize: 0,
		dcaMaxLayers: 0,
		preferredSide: 'longShort',
		longSize: 6,
		shortSize: 6,
		takeProfit: 0.5,
		stopLoss: 0,
		leverage: 1,
		tpSlEnabled: false,
		binanceApiKey: '',
		binanceSecret: '',
		bybitApiKey: '',
		bybitSecret: '',
		enabled: true,
		credit: 0,
	});
	const [status, setStatus] = useState('');

	// Load existing
	useEffect(() => {
		axios
			.get('/api/bot-settings', {
				headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
			})
			.then(({ data }) => {
				setForm((f) => ({
					...f,
					useBinance: data.useBinance,
					useBybit: data.useBybit,
					category: data.strategy,
					dcaPair: data.dcaPair,
					dcaOrderSize: data.dcaOrderSize,
					dcaMaxLayers: data.dcaMaxLayers,
					preferredSide: data.preferredSide,
					longSize: data.longSize,
					shortSize: data.shortSize,
					takeProfit: data.takeProfit,
					stopLoss: data.stopLoss,
					leverage: data.leverage,
					tpSlEnabled: data.tpSlEnabled,
					binanceApiKey: data.binance.apiKey,
					binanceSecret: data.binance.secret,
					bybitApiKey: data.bybit.apiKey,
					bybitSecret: data.bybit.secret,
					enabled: data.enabled,
					credit: data.credit,
				}));
			})
			.catch(() => {});
	}, []);

	const handleChange = (e) => {
		const { name, type, checked, value } = e.target;
		let val =
			type === 'checkbox'
				? checked
				: type === 'number'
				? Number(value)
				: name === 'enabled' && type === 'radio'
				? value === 'true'
				: value;

		if (name === 'useBinance' && val)
			return setForm((f) => ({ ...f, useBinance: true, useBybit: false }));
		if (name === 'useBybit' && val)
			return setForm((f) => ({ ...f, useBybit: true, useBinance: false }));

		setForm((f) => ({ ...f, [name]: val }));
	};

	const handleSubmit = async (e) => {
		e.preventDefault();
		setStatus('');

		try {
			await axios.post(
				'/api/bot-settings',
				{
					...form,
					strategy: form.category,
				},
				{
					headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
				}
			);
			setStatus('✅ Settings saved');
		} catch {
			setStatus('❌ Save failed');
		}
	};

	return (
		<div className="min-h-screen bg-gray-900 text-gray-200 p-4">
			<div className="max-w-2xl mx-auto">
				<button
					onClick={() => router.back()}
					className="flex items-center text-gray-400 hover:text-white mb-6"
				>
					<FiArrowLeft className="mr-2" /> Back
				</button>

				<div className="bg-gray-800 rounded-2xl shadow-xl p-8">
					<h1 className="text-3xl font-semibold mb-6">Bot Settings</h1>
					{status && (
						<div className="mb-4 text-center text-red-400">{status}</div>
					)}

					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Exchanges - Cleaned */}
						<div className="flex space-x-6">
							{['Binance', 'Bybit'].map((ex, i) => (
								<label
									key={i}
									className="flex items-center space-x-2 cursor-pointer"
								>
									<input
										type="checkbox"
										name={i === 0 ? 'useBinance' : 'useBybit'}
										checked={i === 0 ? form.useBinance : form.useBybit}
										onChange={handleChange}
										className="w-5 h-5 text-blue-500 bg-gray-700 rounded border-gray-500 focus:ring-0"
									/>
									<span>{ex}</span>
								</label>
							))}
						</div>

						{/* Category */}
						<div className="flex space-x-6">
							{[
								['signal', 'green', 'Signal (Webhook)'],
								['dca', 'yellow', 'DCA (Auto)'],
							].map(([val, c, label]) => (
								<label key={val} className="flex items-center space-x-2">
									<input
										type="radio"
										name="category"
										value={val}
										checked={form.category === val}
										onChange={handleChange}
										className={`w-4 h-4 text-${c}-400 bg-gray-700 border-gray-600`}
									/>
									<span>{label}</span>
								</label>
							))}
						</div>

						{/* Activation */}
						<div className="flex space-x-6">
							{[
								['true', 'indigo', 'Active'],
								['false', 'red', 'Inactive'],
							].map(([val, c, label]) => (
								<label key={val} className="flex items-center space-x-2">
									<input
										type="radio"
										name="enabled"
										value={val}
										checked={form.enabled === (val === 'true')}
										onChange={handleChange}
										className={`w-4 h-4 text-${c}-400 bg-gray-700 border-gray-600`}
									/>
									<span>{label}</span>
								</label>
							))}
						</div>

						{/* DCA Section */}
						{form.category === 'dca' && (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label className="block mb-1">Pair</label>
									<input
										type="text"
										name="dcaPair"
										value={form.dcaPair}
										onChange={handleChange}
										placeholder="e.g. BTCUSDT"
										className="w-full p-2 bg-gray-700 rounded"
									/>
								</div>
								<div>
									<label className="block mb-1">Order Size (USDT)</label>
									<input
										type="number"
										name="dcaOrderSize"
										value={form.dcaOrderSize}
										onChange={handleChange}
										className="w-full p-2 bg-gray-700 rounded"
									/>
								</div>
								<div>
									<label className="block mb-1">Max Layers</label>
									<input
										type="number"
										name="dcaMaxLayers"
										value={form.dcaMaxLayers}
										onChange={handleChange}
										className="w-full p-2 bg-gray-700 rounded"
									/>
								</div>
							</div>
						)}

						{/* Signal Section */}
						{form.category === 'signal' && (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{[
									[
										'preferredSide',
										'Preferred Side',
										'select',
										['longShort', 'long', 'short'],
									],
									['longSize', 'Long Size (USDT)', 'number'],
									['shortSize', 'Short Size (USDT)', 'number'],
									['takeProfit', 'Take Profit (%)', 'number'],
									['stopLoss', 'Stop Loss (%)', 'number'],
									['leverage', 'Leverage', 'number'],
								].map(([name, label, type, opts], i) => (
									<div key={i}>
										<label className="block mb-1">{label}</label>
										{type === 'select' ? (
											<select
												name={name}
												value={form[name]}
												onChange={handleChange}
												className="w-full p-2 bg-gray-700 rounded"
											>
												{opts.map((o) => (
													<option key={o} value={o}>
														{o}
													</option>
												))}
											</select>
										) : (
											<input
												type="number"
												name={name}
												value={form[name]}
												onChange={handleChange}
												className="w-full p-2 bg-gray-700 rounded"
											/>
										)}
									</div>
								))}
								<div className="flex items-center space-x-2 md:col-span-2">
									<input
										type="checkbox"
										name="tpSlEnabled"
										checked={form.tpSlEnabled}
										onChange={handleChange}
										className="w-5 h-5 text-red-500 bg-gray-700 rounded"
									/>
									<span>Enable TP/SL</span>
								</div>
							</div>
						)}

						{/* API Keys */}
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							{[
								['binanceApiKey', 'Binance API Key'],
								['binanceSecret', 'Binance Secret'],
								['bybitApiKey', 'Bybit API Key'],
								['bybitSecret', 'Bybit Secret'],
							].map(([name, label]) => (
								<div key={name}>
									<label className="block mb-1">{label}</label>
									<input
										type="text"
										name={name}
										value={form[name]}
										onChange={handleChange}
										className="w-full p-2 bg-gray-700 rounded"
									/>
								</div>
							))}
						</div>

						{/* Submit */}
						<button
							type="submit"
							className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-400 rounded-xl text-white font-semibold hover:from-blue-500 hover:to-blue-300 transition"
						>
							Save Settings
						</button>
					</form>
				</div>
			</div>
		</div>
	);
}
