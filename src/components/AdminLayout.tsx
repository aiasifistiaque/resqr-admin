'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import { getToken } from '@/lib/api';
import Sidebar from './Sidebar';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Desktop sidebar — always visible on md+ */}
      <div className="hidden md:block fixed top-0 left-0 h-screen z-50">
        <Sidebar />
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`fixed top-0 left-0 h-screen z-50 md:hidden transition-transform duration-300 ${
          drawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onClose={() => setDrawerOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-60 min-h-screen flex flex-col">
        {/* Mobile top bar */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3.5 flex items-center gap-3 md:hidden z-30">
          <button
            onClick={() => setDrawerOpen(true)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
          >
            <Menu size={20} />
          </button>
          <p className="font-bold text-gray-900 text-sm tracking-tight">QR Menu Admin</p>
        </div>

        <div className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 py-5 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
