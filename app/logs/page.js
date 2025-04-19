// app/logs/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function LogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    axios
      .get("/api/orders", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setLogs(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return <p className="p-6 text-gray-300">Loading logs…</p>;
  }

  return (
    <div className="min-h-screen bg-gray-800 text-gray-100 p-6">
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center text-gray-400 hover:text-gray-200"
      >
        ← Back
      </button>
      <h1 className="text-2xl mb-4">Order History</h1>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Symbol</th>
              <th className="px-4 py-2">Side</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2">Amount (USDT)</th>
              <th className="px-4 py-2">Price</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Profit (USDT)</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((o) => (
              <tr key={o._id} className="border-b border-gray-700">
                <td className="px-4 py-2">
                  {new Date(o.createdAt).toLocaleString()}
                </td>
                <td className="px-4 py-2">{o.symbol}</td>
                <td className="px-4 py-2">{o.side}</td>
                <td className="px-4 py-2">{o.type}</td>
                <td className="px-4 py-2">{o.amount.toFixed(2)}</td>
                <td className="px-4 py-2">
                  {o.price != null ? o.price.toFixed(6) : "—"}
                </td>
                <td className="px-4 py-2">{o.status}</td>
                <td className="px-4 py-2">
                  {typeof o.profit === "number" ? o.profit.toFixed(2) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
