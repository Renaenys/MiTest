"use client";

import { useState } from "react";
import { getNames } from "country-list";
import { useRouter } from "next/navigation";
import axios from "axios";

const countries = getNames();

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    country: "",
  });
  const [status, setStatus] = useState({ type: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await axios.post("/api/auth/register", form);
      setStatus({ type: "success", message: res.data.message });
      localStorage.setItem("pendingEmail", form.email);
      router.push("/verify");
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.message || "Registration failed",
      });
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2">
      <div className="hidden md:block">
        <img
          src="/logoBG.jpg"
          alt="Register BG"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-8">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-center text-gray-800 dark:text-white mb-6">
            Create an Account
          </h2>

          {status.message && (
            <div
              className={`p-3 text-sm rounded mb-4 ${
                status.type === "success"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {status.message}
            </div>
          )}

          <div className="space-y-4">
            {["firstName", "lastName", "email", "password"].map((field) => (
              <div key={field} className="relative">
                <input
                  type={field === "password" ? "password" : "text"}
                  name={field}
                  onChange={handleChange}
                  className="peer w-full px-3 pt-6 pb-2 border rounded-md outline-none focus:border-green-600 transition-all"
                  placeholder=" "
                />
                <label className="absolute left-3 top-2 text-gray-500 text-sm transition-all peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-base peer-focus:top-2 peer-focus:text-sm capitalize">
                  {field}
                </label>
              </div>
            ))}

            <select
              name="country"
              onChange={handleChange}
              className="w-full p-3 rounded-md border text-gray-300"
            >
              <option value="">Select Country</option>
              {countries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            {loading && (
              <div className="text-center">
                <div className="w-6 h-6 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              </div>
            )}

            <button
              onClick={handleSubmit}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-md transition"
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
