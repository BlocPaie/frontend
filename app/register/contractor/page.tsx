'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { HardHat, ArrowRight } from 'lucide-react';
import { useAccount } from 'wagmi';
import { storeContractorId } from '@/lib/auth';
import Navbar from '@/components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function ContractorRegister() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Guard: must have a Porto connection to be on this page
  useEffect(() => {
    if (!isConnected) router.replace('/');
  }, [isConnected, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/api/registry/contractors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, portoAccountAddress: address }),
      });

      if (res.status === 201) {
        const body = await res.json();
        storeContractorId(body.data._id);
        router.push('/contractor/dashboard');
        return;
      }

      const body = await res.json();
      setError(body?.error?.message ?? 'Registration failed. Please try again.');
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <div className="animate-fade-up opacity-0-init" style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <HardHat size={26} color="var(--amber-400)" />
          </div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 800 }}>Register as Contractor</h1>
          <p style={{ margin: 0, color: 'var(--slate-300)', fontSize: '0.9rem' }}>Get paid instantly when companies issue invoices for you</p>
        </div>

        <div className="glass-card animate-fade-up opacity-0-init delay-100" style={{ borderRadius: 16, padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" placeholder="Jane Smith" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Wallet Address</label>
              <input className="form-input mono" value={address ?? 'Connecting…'} disabled style={{ fontSize: '0.78rem', color: 'var(--slate-300)' }} />
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: 'var(--slate-500)' }}>Auto-filled from your connected wallet</p>
            </div>
            {error && (
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--red-400, #f87171)' }}>{error}</p>
            )}
            <button
              type="submit"
              className="btn-primary btn-md"
              style={{ marginTop: '0.25rem', justifyContent: 'center', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              disabled={loading || !address}
            >
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #050d1a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Registering…
                </>
              ) : (
                <>Create Account <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
