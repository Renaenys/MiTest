'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

// Safe localStorage utility: only accesses storage if running in a browser.
const safeLocalStorage = {
  getItem: (key) => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(key);
    } catch (error) {
      console.error('Error accessing localStorage.getItem:', error);
      return null;
    }
  },
  setItem: (key, value) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, value);
    } catch (error) {
      console.error('Error accessing localStorage.setItem:', error);
    }
  },
  removeItem: (key) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error('Error accessing localStorage.removeItem:', error);
    }
  }
};

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Check for an existing token and redirect to /dashboard if found.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = safeLocalStorage.getItem('token');
      if (token) {
        router.push('/dashboard');
      }
    }
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      const res = await axios.post('/api/auth/login', form);
      if (res.data && res.data.token) {
        safeLocalStorage.setItem('token', res.data.token);
        router.push('/dashboard');
      } else {
        setStatus({ type: 'error', message: 'Invalid response from server.' });
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: err?.response?.data?.message || 'Login failed'
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
          alt="Login Background"
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-6">
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
        </form>
      </div>
    </div>
  );
}
