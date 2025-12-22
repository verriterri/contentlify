'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export function DirectCheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setCheckingAuth(false);
    };
    checkUser();
  }, []);

  const handleCheckout = async () => {
    if (!user) {
      router.push('/signup');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gsc/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;
    } catch (err: any) {
      console.error('[DirectCheckout] Error:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <button
        disabled
        className="w-full bg-primary text-white px-8 py-4 rounded-lg font-semibold text-lg opacity-50"
      >
        Loading...
      </button>
    );
  }

  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto space-y-4">
        <Link
          href="/signup"
          className="block w-full bg-primary text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-600 transition-colors text-center"
        >
          Sign Up to Buy Report for $4.99
        </Link>
        <p className="text-sm text-center text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:text-primary-600 font-medium">
            Sign In
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full bg-primary text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? 'Processing...' : 'Buy Report for $4.99'}
      </button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
