// app/profile/page.jsx
"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

export default function ProfilePage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: "", lastName: "", country: "" });
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    axios
      .get("/api/user/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        setForm({
          firstName: res.data.firstName,
          lastName:  res.data.lastName,
          country:   res.data.country,
        });
      })
      .catch(() => {
        router.push("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus("");
    const token = localStorage.getItem("token");

    axios
      .post("/api/user/profile", form, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        localStorage.setItem("token", res.data.token);
        setStatus("✅ Profile updated successfully!");
      })
      .catch(() => {
        setStatus("❌ Error updating profile.");
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <p className="text-gray-300">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-xl shadow-xl p-8">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center text-gray-400 hover:text-gray-200 mb-6"
        >
          <FiArrowLeft className="mr-2" size={20} /> Back
        </button>

        {/* Status Alert */}
        {status && (
          <div
            className={`p-3 rounded mb-6 ${
              status.startsWith("✅")
                ? "bg-green-100 text-green-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {status.slice(2).trim()}
          </div>
        )}

        <h2 className="text-3xl font-semibold text-center text-gray-100 mb-6">
          Edit Profile
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-300 mb-1">First Name</label>
            <input
              name="firstName"
              value={form.firstName}
              onChange={handleChange}
              className="w-full p-3 bg-gray-700 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Last Name</label>
            <input
              name="lastName"
              value={form.lastName}
              onChange={handleChange}
              className="w-full p-3 bg-gray-700 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-1">Country</label>
            <input
              name="country"
              value={form.country}
              onChange={handleChange}
              className="w-full p-3 bg-gray-700 rounded text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg transition"
          >
            Save Profile
          </button>
        </form>
      </div>
    </div>
  );
}
