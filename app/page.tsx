'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Shield, Zap, Lock, Building2, HardHat, X, ChevronRight } from 'lucide-react';
import { useConnect, useAccount } from 'wagmi';
import { issueToken, storeCompanyId, getToken } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL;

async function routeAfterConnect(address: string, role: 'company' | 'contractor'): Promise<string> {
  await issueToken(address, role);

  if (role === 'company') {
    const res = await fetch(`${API}/api/registry/companies/me`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) {
      const body = await res.json();
      storeCompanyId(body.data._id);
      const vaultsRes = await fetch(`${API}/api/registry/companies/${body.data._id}/vaults`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const vaultsBody = await vaultsRes.json();
      return vaultsBody.data?.length > 0 ? '/company/dashboard' : '/company/vault-setup';
    }
    return '/register/company';
  }

  // contractor
  const res = await fetch(`${API}/api/registry/contractors/me`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.ok ? '/contractor/dashboard' : '/register/contractor';
}

export default function Home() {
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [pendingRole, setPendingRole] = useState<'company' | 'contractor' | null>(null);
  const [routing, setRouting] = useState<'company' | 'contractor' | null>(null);
  const router = useRouter();
  const { connect, connectors, isPending } = useConnect();
  const { isConnected, address } = useAccount();

  // Route once Porto connect succeeds
  useEffect(() => {
    if (isConnected && address && pendingRole) {
      const role = pendingRole;
      setPendingRole(null);
      setRouting(role);
      routeAfterConnect(address, role)
        .then(path => router.push(path))
        .catch(console.error)
        .finally(() => setRouting(null));
    }
  }, [isConnected, address, pendingRole, router]);

  function handleRoleSelect(role: 'company' | 'contractor') {
    if (isConnected && address) {
      setRouting(role);
      routeAfterConnect(address, role)
        .then(path => router.push(path))
        .catch(console.error)
        .finally(() => setRouting(null));
      return;
    }
    setPendingRole(role);
    connect({ connector: connectors[0] });
  }

  return (
    <div style={{ minHeight: '100vh', overflowX: 'hidden' }}>
      {/* Background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,200,150,0.12) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 80% 80%, rgba(0,100,200,0.08) 0%, transparent 60%), var(--navy-950)' }} />
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, backgroundImage: 'linear-gradient(rgba(90,112,144,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(90,112,144,0.06) 1px, transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 100%)' }} />

      {/* Navbar */}
      <nav style={{ position: 'relative', zIndex: 10, padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(90,112,144,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #00c896, #00a078)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="#050d1a" strokeWidth={2.5} />
          </div>
          <span style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: '1.25rem', letterSpacing: '-0.02em', color: 'var(--white)' }}>BlocPaie</span>
        </div>
        <button className="btn-ghost btn-md" onClick={() => setShowRoleModal(true)}>
          Get Started <ChevronRight size={15} />
        </button>
      </nav>

      {/* Hero */}
      <main style={{ position: 'relative', zIndex: 10, maxWidth: 960, margin: '0 auto', padding: '5rem 2rem 4rem', textAlign: 'center' }}>
        <div className="animate-fade-up opacity-0-init" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: '100px', padding: '0.3rem 1rem', marginBottom: '2rem' }}>
          <span className="glow-dot" />
          <span style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--green-400)' }}>
            Live on Ethereum Sepolia
          </span>
        </div>

        <h1 className="animate-fade-up opacity-0-init delay-100" style={{ fontSize: 'clamp(2.5rem, 7vw, 5rem)', fontWeight: 800, lineHeight: 1.08, letterSpacing: '-0.03em', margin: '0 0 1.5rem', color: 'var(--white)' }}>
          On-chain payroll,{' '}
          <span style={{ background: 'linear-gradient(135deg, #00c896, #00e6a8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            simplified.
          </span>
        </h1>

        <p className="animate-fade-up opacity-0-init delay-200" style={{ fontSize: '1.15rem', color: 'var(--slate-300)', maxWidth: 580, margin: '0 auto 2.5rem', lineHeight: 1.7 }}>
          Issue invoices, manage contractors, and settle payments on-chain — all with passkey authentication and zero gas fees.
        </p>

        <div className="animate-fade-up opacity-0-init delay-300" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button className="btn-primary btn-lg animate-pulse-glow" onClick={() => setShowRoleModal(true)}>
            Open App <ArrowRight size={18} />
          </button>
          <button className="btn-ghost btn-lg">View Docs</button>
        </div>

        {/* Feature cards */}
        <div className="animate-fade-up opacity-0-init delay-400" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem', marginTop: '5rem' }}>
          {[
            { icon: <Zap size={22} color="var(--green-400)" />, title: 'Instant Settlement', desc: 'Invoices execute on-chain in seconds. No wire transfers, no bank delays.' },
            { icon: <Lock size={22} color="var(--green-400)" />, title: 'Privacy Vault', desc: 'Confidential payroll via Zama fhEVM. Amounts and payees stay encrypted.' },
            { icon: <Shield size={22} color="var(--green-400)" />, title: 'Passkey Auth', desc: 'Sign transactions with biometrics. No seed phrases, no browser extensions.' },
          ].map(f => (
            <div key={f.title} className="glass-card glass-card-hover" style={{ padding: '1.5rem', borderRadius: 14, textAlign: 'left' }}>
              <div style={{ width: 44, height: 44, background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
                {f.icon}
              </div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 700 }}>{f.title}</h3>
              <p style={{ margin: 0, fontSize: '0.855rem', color: 'var(--slate-300)', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="animate-fade-up opacity-0-init delay-500" style={{ display: 'flex', justifyContent: 'center', gap: '3rem', marginTop: '4rem', flexWrap: 'wrap' }}>
          {[
            { value: '$2.4M', label: 'Total Settled' },
            { value: '340+', label: 'Active Contracts' },
            { value: '< 2s',  label: 'Avg Execution' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontSize: '2rem', fontWeight: 800, background: 'linear-gradient(135deg, #00c896, #00e6a8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {s.value}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--slate-400)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Loading overlay — shown while routing after Porto connects */}
      {routing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(5,13,26,0.85)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.25rem' }}>
          <div style={{ width: 48, height: 48, border: '3px solid rgba(0,200,150,0.2)', borderTopColor: 'var(--green-400)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: 'var(--white)' }}>Loading dashboard…</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--slate-400)' }}>Setting up your {routing} account</div>
        </div>
      )}

      {/* Role Modal */}
      {showRoleModal && (
        <div className="modal-overlay" onClick={() => setShowRoleModal(false)}>
          <div className="modal-box glass-card" style={{ maxWidth: 500, borderRadius: 20, padding: '2rem', width: '100%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800 }}>Continue as…</h2>
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.83rem', color: 'var(--slate-300)' }}>Select how you&apos;ll use BlocPaie</p>
              </div>
              <button onClick={() => setShowRoleModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', padding: 4 }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <RoleCard icon={<Building2 size={28} color="var(--green-400)" />} title="I'm a Company" desc="Deploy a vault and manage contractor payments" accent="var(--green-400)" accentBg="rgba(0,200,150,0.08)" accentBorder="rgba(0,200,150,0.2)" loading={(isPending && pendingRole === 'company') || routing === 'company'} loadingLabel={routing === 'company' ? 'Loading dashboard…' : 'Connecting…'} onClick={() => handleRoleSelect('company')} />
              <RoleCard icon={<HardHat size={28} color="var(--amber-400)" />} title="I'm a Contractor" desc="Receive invoice payments from companies" accent="var(--amber-400)" accentBg="rgba(245,158,11,0.08)" accentBorder="rgba(245,158,11,0.2)" loading={(isPending && pendingRole === 'contractor') || routing === 'contractor'} loadingLabel={routing === 'contractor' ? 'Loading dashboard…' : 'Connecting…'} onClick={() => handleRoleSelect('contractor')} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RoleCard({ icon, title, desc, accent, accentBg, accentBorder, loading, loadingLabel, onClick }: {
  icon: React.ReactNode; title: string; desc: string; accent: string; accentBg: string; accentBorder: string; loading?: boolean; loadingLabel?: string; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={loading}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? accentBg : 'rgba(15,32,64,0.5)', border: `1px solid ${hovered ? accentBorder : 'rgba(90,112,144,0.25)'}`, borderRadius: 14, padding: '1.5rem 1.25rem', cursor: loading ? 'wait' : 'pointer', textAlign: 'left', transition: 'background 0.2s, border-color 0.2s, transform 0.15s', transform: hovered ? 'translateY(-2px)' : 'none', opacity: loading ? 0.7 : 1 }}
    >
      <div style={{ width: 52, height: 52, background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
        {icon}
      </div>
      <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: 'var(--white)', marginBottom: '0.4rem' }}>{title}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--slate-300)', lineHeight: 1.5 }}>{desc}</div>
      <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--font-syne), Syne, sans-serif', color: accent, opacity: hovered || loading ? 1 : 0, transition: 'opacity 0.2s' }}>
        {loading ? (loadingLabel ?? 'Connecting…') : 'Continue'} {!loading && <ChevronRight size={13} />}
      </div>
    </button>
  );
}
