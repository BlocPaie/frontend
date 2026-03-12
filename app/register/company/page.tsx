'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, ArrowRight } from 'lucide-react';
import { useAccount } from 'wagmi';
import { storeCompanyId } from '@/lib/auth';
import Navbar from '@/components/Navbar';

const API = process.env.NEXT_PUBLIC_API_URL;

export default function CompanyRegister() {
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
      const res = await fetch(`${API}/api/registry/companies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, portoAccountAddress: address }),
      });

      if (res.status === 201) {
        const body = await res.json();
        storeCompanyId(body.data._id);
        router.push('/company/vault-setup');
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
          <div style={{ width: 56, height: 56, background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem' }}>
            <Building2 size={26} color="var(--green-400)" />
          </div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 800 }}>Register Company</h1>
          <p style={{ margin: 0, color: 'var(--slate-300)', fontSize: '0.9rem' }}>Set up your organisation to start issuing payroll</p>
        </div>

        <div className="glass-card animate-fade-up opacity-0-init delay-100" style={{ borderRadius: 16, padding: '2rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="form-label">Company Name</label>
              <input className="form-input" type="text" placeholder="Acme Corp" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Wallet Address</label>
              <input className="form-input mono" value={address ?? 'Connecting…'} disabled style={{ fontSize: '0.78rem', color: 'var(--slate-300)' }} />
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: 'var(--slate-500)' }}>Auto-filled from your connected wallet</p>
            </div>
            {error && (
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--red-400, #f87171)' }}>{error}</p>
            )}
            <button type="submit" className="btn-primary btn-md" style={{ marginTop: '0.25rem', justifyContent: 'center' }} disabled={loading || !address}>
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #050d1a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Creating account…
                </>
              ) : (
                <>Continue <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        </div>

        {/* Step indicator */}
        <div className="animate-fade-up opacity-0-init delay-200" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
          {['Register', 'Select Vault', 'Dashboard'].map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', background: i === 0 ? 'var(--green-500)' : 'rgba(90,112,144,0.2)', border: `1px solid ${i === 0 ? 'var(--green-500)' : 'rgba(90,112,144,0.3)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, color: i === 0 ? '#050d1a' : 'var(--slate-400)' }}>
                {i + 1}
              </div>
              <span style={{ fontSize: '0.75rem', color: i === 0 ? 'var(--white)' : 'var(--slate-500)' }}>{s}</span>
              {i < 2 && <div style={{ width: 24, height: 1, background: 'rgba(90,112,144,0.3)', margin: '0 0 0.25rem' }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
