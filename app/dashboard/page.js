"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import {
  FiMenu,
  FiLogOut,
  FiUser,
  FiSettings,
  FiClipboard,
} from "react-icons/fi";

// 1️⃣ Core Chart.js registries
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
} from "chart.js";
// 2️⃣ Financial plugin
import {
  CandlestickController,
  CandlestickElement,
} from "chartjs-chart-financial";
// 3️⃣ React wrapper
import { Chart } from "react-chartjs-2";
// 4️⃣ Date adapter
import "chartjs-adapter-date-fns";

// 5️⃣ Register what we need
ChartJS.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  Tooltip,
  Legend,
  CandlestickController,
  CandlestickElement
);

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [botSettings, setBotSettings] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // 🔥 Candlestick
  const [symbol, setSymbol] = useState("DOGE/USDT");
  const [candles, setCandles] = useState([]);

  // 📝 Live open orders
  const [openOrders, setOpenOrders] = useState([]);

  // ⚙️ Signal form
  const [activation, setActivation] = useState("active");
  const [webhookType, setWebhookType] = useState("public");
  const [preferredSide, setPreferredSide] = useState("longShort");
  const [longSize, setLongSize] = useState("6");
  const [shortSize, setShortSize] = useState("6");
  const [tpSlEnabled, setTpSlEnabled] = useState(false);
  const [stopLoss, setStopLoss] = useState("0");
  const [takeProfit, setTakeProfit] = useState("0.5");
  const [leverage, setLeverage] = useState("1");
  const [controlStatus, setControlStatus] = useState("");

  // ─── Auth ──────────────────────────────────────────────────────────────────────
  useEffect(() => {
    setIsClient(true);
    if (typeof window === "undefined") return;
    const t = localStorage.getItem("token");
    if (!t) return router.push("/login");
    try {
      setUser(JSON.parse(atob(t.split(".")[1])));
    } catch {
      router.push("/login");
    }
  }, [router]);

  // ─── Load settings & open orders ────────────────────────────────────────────────
  useEffect(() => {
    if (!isClient) return;
    const token = localStorage.getItem("token");

    // 1) Bot settings
    axios
      .get("/api/bot-settings", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => {
        const d = r.data || {};
        setBotSettings(d);
        setActivation(d.activation ?? "active");
        setWebhookType(d.webhookType ?? "public");
        setPreferredSide(d.preferredSide ?? "longShort");
        setLongSize(d.longSize?.toString() ?? "6");
        setShortSize(d.shortSize?.toString() ?? "6");
        setStopLoss(d.stopLoss?.toString() ?? "0");
        setTakeProfit(d.takeProfit?.toString() ?? "0.5");
        setLeverage(d.leverage?.toString() ?? "1");
        setTpSlEnabled(d.tpSlEnabled ?? false);
      })
      .catch(console.error);
  }, [isClient]);

  //live
  useEffect(() => {
    if (!isClient) return;
    const token = localStorage.getItem("token");
    axios
      .get("/api/orders/live", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setOpenOrders(res.data))
      .catch(console.error);
  }, [isClient]);

  // ─── Fetch OHLC candles ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isClient) return;
    const sym = symbol.replace("/", "");
    axios
      .get("https://api.binance.com/api/v3/klines", {
        params: { symbol: sym, interval: "5m", limit: 50 },
      })
      .then((r) =>
        setCandles(
          r.data.map((c) => ({
            x: c[0],
            o: +c[1],
            h: +c[2],
            l: +c[3],
            c: +c[4],
          }))
        )
      )
      .catch(console.error);
  }, [isClient, symbol]);

  // ─── Handlers ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };
  const handleControlSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!botSettings) return;
    try {
      await axios.post(
        "/api/bot-settings",
        {
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
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setControlStatus("Configuration saved!");
    } catch {
      setControlStatus("Error saving configuration.");
    }
  };

  if (!isClient || !user)
    return <p className="text-center mt-10 text-gray-300">Loading…</p>;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside
        className={`bg-gray-900 text-white p-4 ${
          collapsed ? "w-16" : "w-64"
        } transition-all`}
      >
        <div className="flex items-center justify-between mb-4">
          {!collapsed && <h1 className="text-lg font-bold">Your Brand</h1>}
          <button onClick={() => setCollapsed(!collapsed)}>
            <FiMenu size={20} />
          </button>
        </div>
        <div className="space-y-4">
          <button
            onClick={() => router.push("/profile")}
            className="flex items-center gap-2 hover:text-blue-400"
          >
            <FiUser /> {!collapsed && "Profile"}
          </button>
          <button
            onClick={() => router.push("/bot-settings")}
            className="flex items-center gap-2 hover:text-blue-400"
          >
            <FiSettings /> {!collapsed && "Settings"}
          </button>
          <button
            onClick={() => router.push("/logs")}
            className="flex items-center gap-2 hover:text-yellow-400"
          >
            <FiClipboard /> {!collapsed && "Logs"}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 hover:text-red-400"
          >
            <FiLogOut /> {!collapsed && "Logout"}
          </button>
        </div>
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

        {/* OHLC Candlestick */}
        <div className="bg-gray-700 p-4 rounded mb-6">
          <div className="flex items-center mb-3">
            <h3 className="text-xl flex-1">50×5m Candles</h3>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-gray-600 text-white p-1 rounded"
            >
              {["DOGE/USDT", "BTC/USDT", "ETH/USDT", "XRP/USDT"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="h-64">
            <Chart
              type="candlestick"
              data={{ datasets: [{ label: symbol, data: candles }] }}
              options={{
                scales: {
                  x: { type: "time", time: { unit: "minute" } },
                  y: { beginAtZero: false },
                },
                plugins: { legend: { display: false } },
              }}
            />
          </div>
        </div>

        {/* Live Open Orders */}
        <div className="bg-gray-700 p-4 rounded mb-6">
          <h3 className="text-xl mb-2">Your Open Orders</h3>
          {openOrders.length === 0 ? (
            <p className="text-gray-400">No open orders.</p>
          ) : (
            <div className="space-y-2 text-sm">
              {openOrders.map((o) => (
                <div
                  key={o.id}
                  className="grid grid-cols-5 gap-2 bg-gray-600 p-2 rounded"
                >
                  <div>{o.symbol}</div>
                  <div>{o.side.toUpperCase()}</div>
                  <div>{o.amount}</div>
                  <div>{o.price ?? "MKT"}</div>
                  <div>
                    {new Date(o.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Signal Configuration */}
        <div className="bg-gray-700 p-4 rounded">
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

            {/* Long & Short Sizes */}
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

            {/* TP/SL Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                checked={tpSlEnabled}
                onChange={(e) => setTpSlEnabled(e.target.checked)}
                className="mr-2"
              />
              <label>Enable TP/SL</label>
            </div>

            {/* Stop Loss, Take Profit, Leverage */}
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
        </div>
      </main>
    </div>
  );
}
