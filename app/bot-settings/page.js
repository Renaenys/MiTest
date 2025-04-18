"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { FiArrowLeft } from "react-icons/fi";

export default function BotSettingsPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    binanceApiKey: "",
    binanceSecret: "",
    bybitApiKey: "",
    bybitSecret: "",
    credit: "0",
    enabled: true,
    useBinance: false,
    useBybit: false,
  });
  const [status, setStatus] = useState("");

  // Fetch existing exchange settings from API on mount.
  useEffect(() => {
    axios
      .get("/api/bot-settings", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => {
        if (res.data) {
          setForm({
            binanceApiKey: res.data.binance?.apiKey || "",
            binanceSecret: res.data.binance?.secret || "",
            bybitApiKey: res.data.bybit?.apiKey || "",
            bybitSecret: res.data.bybit?.secret || "",
            credit: res.data.credit?.toString() || "0",
            enabled: res.data.enabled ?? true,
            useBinance: res.data.useBinance ?? false,
            useBybit: res.data.useBybit ?? false,
          });
        }
      })
      .catch((err) => {
        console.error("Error fetching bot settings:", err);
      });
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === "checkbox" ? checked : value;
    setForm((prev) => ({ ...prev, [name]: newValue }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("");
    try {
      await axios.post("/api/bot-settings", form, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setStatus("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving bot settings:", error);
      setStatus("Error saving settings.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 p-4">
      {/* Back Button */}
      <div className="w-full max-w-xl mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-300 hover:text-gray-100"
        >
          <FiArrowLeft className="mr-2" size={20} />
          Back
        </button>
      </div>

      {/* Settings Card */}
      <div className="w-full max-w-xl bg-gray-800 bg-opacity-90 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-100 mb-6">
          Exchange & API Settings
        </h2>
        {status && <p className="mb-4 text-gray-300">{status}</p>}
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Binance Credentials */}
          <div className="col-span-1">
            <label className="block mb-1 text-gray-300">Binance API Key:</label>
            <input
              type="text"
              name="binanceApiKey"
              value={form.binanceApiKey}
              onChange={handleChange}
              className="w-full p-2 bg-gray-700 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
          <div className="col-span-1">
            <label className="block mb-1 text-gray-300">Binance Secret:</label>
            <input
              type="text"
              name="binanceSecret"
              value={form.binanceSecret}
              onChange={handleChange}
              className="w-full p-2 bg-gray-700 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
          {/* Bybit Credentials */}
          <div className="col-span-1">
            <label className="block mb-1 text-gray-300">Bybit API Key:</label>
            <input
              type="text"
              name="bybitApiKey"
              value={form.bybitApiKey}
              onChange={handleChange}
              className="w-full p-2 bg-gray-700 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
          <div className="col-span-1">
            <label className="block mb-1 text-gray-300">Bybit Secret:</label>
            <input
              type="text"
              name="bybitSecret"
              value={form.bybitSecret}
              onChange={handleChange}
              className="w-full p-2 bg-gray-700 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
          </div>
          {/* Exchange Usage Options */}
          <div className="col-span-1 flex items-center">
            <input
              id="useBinance"
              type="checkbox"
              name="useBinance"
              checked={form.useBinance}
              onChange={handleChange}
              className="mr-2"
            />
            <label htmlFor="useBinance" className="text-gray-300">
              Use Binance
            </label>
          </div>
          <div className="col-span-1 flex items-center">
            <input
              id="useBybit"
              type="checkbox"
              name="useBybit"
              checked={form.useBybit}
              onChange={handleChange}
              className="mr-2"
            />
            <label htmlFor="useBybit" className="text-gray-300">
              Use Bybit
            </label>
          </div>
          {/* Full width row for Credit (read-only) */}
          <div className="col-span-2">
            <label className="block mb-1 text-gray-300">Credit (Points):</label>
            <p className="w-full p-2 bg-gray-700 rounded text-gray-100">{form.credit}</p>
          </div>
          {/* Full width row for Bot Enabled (read-only) */}
          <div className="col-span-2">
            <label className="block mb-1 text-gray-300">Bot Enabled:</label>
            <p className="w-full p-2 bg-gray-700 rounded text-gray-100">
              {form.enabled ? "Enabled" : "Disabled"}
            </p>
          </div>
          <button
            type="submit"
            className="col-span-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            Save Exchange Settings
          </button>
        </form>
      </div>
    </div>
  );
}
