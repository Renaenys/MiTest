'use client';

import { useEffect, useState } from 'react';

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAdmin(false);
      return;
    }

    const decoded = JSON.parse(atob(token.split('.')[1]));
    setIsAdmin(decoded?.role === 'admin');
  }, []);

  if (isAdmin === null) return <p>Checking...</p>;
  if (!isAdmin) return <p>Access denied. You are not an admin.</p>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <p>Welcome, admin!</p>
      {/* You can show user lists, dashboard stats, etc. */}
    </div>
  );
}
