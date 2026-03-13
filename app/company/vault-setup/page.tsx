'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Check, ArrowRight } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useCreateVault } from '@/hooks/useCreateVault';
import Navbar from '@/components/Navbar';

type VaultType = 'simple' | 'privacy' | null;

export default function VaultSetup() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { createERC20Vault, createConfidentialVault, isPending } = useCreateVault();
  const [selected, setSelected] = useState<VaultType>(null);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  if (!isConnected) {
    router.replace('/');
    return null;
  }

  const deploy = async () => {
    if (!selected) return;
    setError('');

    try {
      if (selected === 'privacy') {
        await createConfidentialVault();
      } else {
        await createERC20Vault();
      }
      setDone(true);
      setTimeout(() => router.push('/company/dashboard'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deployment failed. Please try again.');
    }
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '4rem 1.5rem' }}>
        <div className="animate-fade-up opacity-0-init" style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 800 }}>Select Vault Type</h1>
          <p style={{ margin: 0, color: 'var(--slate-300)', fontSize: '0.9rem' }}>Your vault holds company funds for contractor payouts</p>
        </div>

        <div className="animate-fade-up opacity-0-init delay-100" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '2rem' }}>
          <VaultCard
            type="simple"
            icon={<Eye size={26} color="var(--green-400)" />}
            title="Simple Token Vault"
            subtitle="ERC-20 · Public"
            desc="Standard USDC vault with transparent on-chain transactions. All amounts and payees are publicly visible."
            pros={['Easy to audit', 'Lower gas cost', 'Full transparency']}
            cons={['Amounts visible on-chain']}
            selected={selected === 'simple'}
            onSelect={() => setSelected('simple')}
            accent="var(--green-400)"
            accentBg="rgba(0,200,150,0.06)"
            accentBorder="rgba(0,200,150,0.3)"
          />
          <VaultCard
            type="privacy"
            icon={<EyeOff size={26} color="#a78bfa" />}
            title="Privacy-Based Vault"
            subtitle="fhEVM · Encrypted"
            desc="Confidential vault using Zama's fully homomorphic encryption. Payee addresses and amounts are fully encrypted."
            pros={['Encrypted payees & amounts', 'Confidential payroll', 'KMS-backed security']}
            cons={['Higher gas cost', 'Slower execution']}
            selected={selected === 'privacy'}
            onSelect={() => setSelected('privacy')}
            accent="#a78bfa"
            accentBg="rgba(167,139,250,0.06)"
            accentBorder="rgba(167,139,250,0.3)"
          />
        </div>

        {selected && (
          <div className="glass-card animate-fade-up opacity-0-init" style={{ borderRadius: 12, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', borderColor: selected === 'privacy' ? 'rgba(167,139,250,0.3)' : 'rgba(0,200,150,0.2)' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--slate-300)' }}>Selected</div>
              <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem' }}>
                {selected === 'privacy' ? 'Privacy-Based Vault (fhEVM)' : 'Simple Token Vault (ERC-20)'}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: selected === 'privacy' ? '#a78bfa' : 'var(--green-400)', fontSize: '0.8rem', fontWeight: 600 }}>
              <Check size={14} /> Confirmed
            </div>
          </div>
        )}

        {error && (
          <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: 'var(--red-400, #f87171)', textAlign: 'center' }}>{error}</p>
        )}

        <button className="btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center' }} disabled={!selected || isPending || done} onClick={deploy}>
          {done ? (
            <><Check size={18} /> Deployed! Redirecting…</>
          ) : isPending ? (
            <>
              <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #050d1a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              Deploying vault…
            </>
          ) : (
            <>Deploy Vault <ArrowRight size={18} /></>
          )}
        </button>

        {isPending && (
          <div style={{ marginTop: '1.5rem', padding: '1rem', borderRadius: 10, background: 'rgba(0,200,150,0.05)', border: '1px solid rgba(0,200,150,0.15)' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--slate-300)', marginBottom: '0.75rem' }}>Broadcasting to Ethereum Sepolia…</div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(90,112,144,0.2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--green-500), var(--green-400))', borderRadius: 2, animation: 'progress 2.5s ease forwards' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function VaultCard({ icon, title, subtitle, desc, pros, cons, selected, onSelect, accent, accentBg, accentBorder, disabled }: {
  icon: React.ReactNode; title: string; subtitle: string; desc: string; pros: string[]; cons: string[];
  selected: boolean; onSelect: () => void; accent: string; accentBg: string; accentBorder: string;
  type: string; disabled?: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      style={{
        background: selected ? accentBg : 'rgba(15,32,64,0.5)',
        border: `2px solid ${selected ? accentBorder : 'rgba(90,112,144,0.2)'}`,
        borderRadius: 16, padding: '1.5rem', cursor: disabled ? 'not-allowed' : 'pointer',
        textAlign: 'left', transition: 'all 0.2s', position: 'relative',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {selected && (
        <div style={{ position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Check size={12} color="#050d1a" strokeWidth={3} />
        </div>
      )}
      <div style={{ width: 50, height: 50, background: accentBg, border: `1px solid ${accentBorder}`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: '1rem', marginBottom: '0.25rem', color: 'var(--white)' }}>{title}</div>
      <div className="mono" style={{ fontSize: '0.72rem', color: accent, marginBottom: '0.75rem', fontWeight: 500 }}>{subtitle}</div>
      <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--slate-300)', lineHeight: 1.55 }}>{desc}</p>
      <div style={{ fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {pros.map(p => (
          <div key={p} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', color: 'var(--slate-200)' }}>
            <Check size={11} color="var(--green-500)" style={{ marginTop: 2, flexShrink: 0 }} /> {p}
          </div>
        ))}
        {cons.map(c => (
          <div key={c} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', color: 'var(--slate-400)' }}>
            <span style={{ fontSize: '0.7rem', marginTop: 1, flexShrink: 0 }}>—</span> {c}
          </div>
        ))}
      </div>
    </button>
  );
}
