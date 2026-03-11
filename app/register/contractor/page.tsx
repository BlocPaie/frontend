'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HardHat, ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function ContractorRegister() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const mockWallet = '0x71C7656EC7ab88b098defB751B7401B5f6d8976F';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push('/contractor/dashboard');
    }, 1000);
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
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Wallet Address</label>
              <input className="form-input mono" value={mockWallet} disabled style={{ fontSize: '0.78rem', color: 'var(--slate-300)' }} />
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: 'var(--slate-500)' }}>Auto-filled from your connected wallet</p>
            </div>
            <button
              type="submit"
              className="btn-primary btn-md"
              style={{ marginTop: '0.25rem', justifyContent: 'center', background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              disabled={loading}
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
