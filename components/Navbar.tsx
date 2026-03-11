'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Layers } from 'lucide-react';

interface NavbarProps {
  role?: 'company' | 'contractor';
}

export default function Navbar({ role }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const isCompany = role === 'company';
  const isContractor = role === 'contractor';

  return (
    <nav
      style={{
        background: 'rgba(10,22,40,0.9)',
        borderBottom: '1px solid rgba(90,112,144,0.2)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        padding: '0 1.5rem',
        height: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <button
        onClick={() => router.push('/')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: 0 }}
      >
        <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #00c896, #00a078)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Layers size={16} color="#050d1a" strokeWidth={2.5} />
        </div>
        <span style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--white)', letterSpacing: '-0.01em' }}>
          BlocPaie
        </span>
      </button>

      {(isCompany || isContractor) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {isCompany && (
            <>
              <NavLink label="Dashboard" active={pathname === '/company/dashboard'} onClick={() => router.push('/company/dashboard')} />
              <NavLink label="Invoices"  active={pathname === '/company/invoices'}  onClick={() => router.push('/company/invoices')} />
            </>
          )}
          {isContractor && (
            <NavLink label="Dashboard" active={pathname === '/contractor/dashboard'} onClick={() => router.push('/contractor/dashboard')} />
          )}
          <span style={{
            fontSize: '0.72rem',
            fontFamily: 'var(--font-syne), Syne, sans-serif',
            fontWeight: 600,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: isCompany ? 'var(--green-400)' : 'var(--amber-400)',
            background: isCompany ? 'rgba(0,200,150,0.1)' : 'rgba(245,158,11,0.1)',
            border: `1px solid ${isCompany ? 'rgba(0,200,150,0.25)' : 'rgba(245,158,11,0.25)'}`,
            padding: '0.2rem 0.6rem',
            borderRadius: '100px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}>
            <span className="glow-dot" style={{ background: isCompany ? 'var(--green-500)' : 'var(--amber-500)', boxShadow: `0 0 8px ${isCompany ? 'var(--green-500)' : 'var(--amber-500)'}` }} />
            {isCompany ? 'Company' : 'Contractor'}
          </span>
        </div>
      )}
    </nav>
  );
}

function NavLink({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif',
        fontSize: '0.875rem',
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--white)' : 'var(--slate-300)',
        padding: '0.25rem 0',
        borderBottom: active ? '2px solid var(--green-500)' : '2px solid transparent',
        transition: 'color 0.2s',
      }}
    >
      {label}
    </button>
  );
}
