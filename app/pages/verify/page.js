'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VerifyPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const inputs = useRef([]);
  const router = useRouter();

  useEffect(() => {
    const e = localStorage.getItem('pendingEmail');
    if (!e) router.push('/register');
    else setEmail(e);
  }, []);

  const handleInput = (e, index) => {
    const value = e.target.value;
    if (!/^\d?$/.test(value)) return;

    e.target.value = value;
    if (value && index < 5) inputs.current[index + 1]?.focus();

    const code = inputs.current.map(input => input?.value).join('');
    if (code.length === 6) submitCode(code);
  };

  const submitCode = async (code) => {
    const res = await fetch('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();
    if (res.ok) {
      setStatus({ type: 'success', message: 'Verified! Redirecting...' });
      setTimeout(() => router.push('/login'), 1500);
    } else {
      setStatus({ type: 'error', message: data.message });
      inputs.current.forEach((input) => (input.value = ''));
      inputs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    const res = await fetch('/api/auth/resend-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    setStatus({ type: res.ok ? 'success' : 'error', message: data.message });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Verify your email</h2>

      {status.message && (
        <div className={`mb-4 p-2 rounded text-sm ${status.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {status.message}
        </div>
      )}

      <div className="flex gap-2 mb-6">
        {[...Array(6)].map((_, i) => (
          <input
            key={i}
            ref={(el) => (inputs.current[i] = el)}
            type="text"
            maxLength="1"
            className="w-12 h-14 text-center text-2xl border rounded-md focus:ring-2 ring-blue-500"
            onInput={(e) => handleInput(e, i)}
          />
        ))}
      </div>

      <button
        onClick={handleResend}
        className="text-blue-600 hover:underline text-sm"
      >
        Didn't get the code? Resend
      </button>
    </div>
  );
}
