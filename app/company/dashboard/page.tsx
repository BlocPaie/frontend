'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { FileText, Plus, Wallet, PieChart, UserPlus, ArrowDownToLine, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import RegisterInvoiceModal from '@/components/RegisterInvoiceModal';
import AddContractorModal from '@/components/AddContractorModal';
import { useVaultBalance } from '@/hooks/useVaultBalance';
import { useVaultDeposit } from '@/hooks/useVaultDeposit';
import { getToken, getCompanyId } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL;

interface Contractor {
  _id: string;
  name: string;
  portoAccountAddress: string;
  createdAt: string;
}

export default function CompanyDashboard() {
  const router = useRouter();
  const { address } = useAccount();
  const { vaultAddress, vaultType, vaultId, totalBalance, allocatedBalance, loading: loadingVault, refetchBalances } = useVaultBalance();
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [invoiceTarget, setInvoiceTarget] = useState<Contractor | null>(null);
  const [showDeposit, setShowDeposit] = useState(false);
  const [showAddContractor, setShowAddContractor] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const fetchContractors = useCallback(async () => {
    const companyId = getCompanyId();
    if (!companyId) return;
    const res = await fetch(`${API}/api/registry/companies/${companyId}/contractors`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    if (res.ok) {
      const body = await res.json();
      setContractors(body.data ?? []);
    }
  }, []);

  useEffect(() => { fetchContractors(); }, [fetchContractors]);

  const handleInvoiceSubmit = () => {
    setInvoiceTarget(null);
    setSuccessMsg('Invoice created successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
    refetchBalances();
  };

  const handleDeposit = () => {
    setShowDeposit(false);
    refetchBalances();
    setSuccessMsg('Funds deposited successfully!');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const fmtUsd = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const fmtAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar role="company" />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        {/* Page header */}
        <div className="animate-fade-up opacity-0-init" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ margin: '0 0 0.3rem', fontSize: '1.6rem', fontWeight: 800 }}>Dashboard</h1>
            <p style={{ margin: '0 0 0.25rem', color: 'var(--slate-300)', fontSize: '0.875rem' }}>
              {loadingVault ? 'Loading…' : vaultType === 'erc20' ? 'Simple Token Vault' : vaultType ?? 'No vault'}
            </p>
            {address && (
              <p className="mono" style={{ margin: 0, fontSize: '0.78rem', color: 'var(--slate-400)' }}>
                {address}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-primary btn-md" onClick={() => setShowDeposit(true)}>
              <ArrowDownToLine size={15} /> Deposit Funds
            </button>
            <button className="btn-ghost btn-md" onClick={() => router.push('/company/invoices')}>
              <FileText size={15} /> View Invoices
            </button>
          </div>
        </div>

        {/* Toast */}
        {successMsg && (
          <div className="animate-fade-up opacity-0-init" style={{ padding: '0.75rem 1.25rem', background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.3)', borderRadius: 10, color: 'var(--green-400)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="glow-dot" /> {successMsg}
          </div>
        )}

        {/* Stats */}
        <div className="animate-fade-up opacity-0-init delay-100" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2.5rem' }}>
          <StatCard
            icon={<Wallet size={20} color="var(--green-400)" />}
            label="Total Vault Balance"
            value={fmtUsd(totalBalance ?? 0)}
            subtext="USDC · Sepolia"
            accentBg="rgba(0,200,150,0.06)"
            accentBorder="rgba(0,200,150,0.2)"
            loading={loadingVault || totalBalance == null}
          />
          <StatCard
            icon={<PieChart size={20} color="var(--amber-400)" />}
            label="Allocated Balance"
            value={fmtUsd(allocatedBalance ?? 0)}
            subtext="Pending invoices"
            accentBg="rgba(245,158,11,0.06)"
            accentBorder="rgba(245,158,11,0.2)"
            loading={loadingVault || allocatedBalance == null}
          />
        </div>

        {/* Contractors table */}
        <div className="glass-card animate-fade-up opacity-0-init delay-200" style={{ borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(90,112,144,0.15)' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Contractors</h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--slate-400)' }}>{contractors.length} registered</p>
            </div>
            <button className="btn-ghost btn-sm" onClick={() => setShowAddContractor(true)}><UserPlus size={13} /> Add Contractor</button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th><th>Wallet</th><th>Registered</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {contractors.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--slate-400)', padding: '2rem' }}>No contractors yet. Add one to get started.</td></tr>
                )}
                {contractors.map((c, i) => (
                  <tr key={c._id} className="animate-fade-up opacity-0-init" style={{ animationDelay: `${0.25 + i * 0.06}s` }}>
                    <td style={{ fontWeight: 500, color: 'var(--white)' }}>{c.name}</td>
                    <td><span className="mono" style={{ fontSize: '0.78rem' }}>{fmtAddress(c.portoAccountAddress)}</span></td>
                    <td style={{ color: 'var(--slate-400)', fontSize: '0.82rem' }}>
                      {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td>
                      <button className="btn-ghost btn-sm" style={{ fontSize: '0.78rem' }} onClick={() => setInvoiceTarget(c)}>
                        <Plus size={13} /> Register Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {invoiceTarget && vaultId && vaultAddress && (
        <RegisterInvoiceModal
          contractor={invoiceTarget}
          vaultId={vaultId}
          vaultAddress={vaultAddress}
          onClose={() => setInvoiceTarget(null)}
          onSubmit={handleInvoiceSubmit}
        />
      )}

      {showAddContractor && vaultId && (
        <AddContractorModal
          vaultId={vaultId}
          onClose={() => setShowAddContractor(false)}
          onAdd={() => {
            setShowAddContractor(false);
            fetchContractors();
            setSuccessMsg('Contractor added successfully!');
            setTimeout(() => setSuccessMsg(''), 3000);
          }}
        />
      )}

      {showDeposit && (
        <DepositModal
          vaultAddress={vaultAddress}
          onClose={() => setShowDeposit(false)}
          onDeposit={handleDeposit}
        />
      )}

    </div>
  );
}

function DepositModal({ vaultAddress, onClose, onDeposit }: {
  vaultAddress: `0x${string}` | null;
  onClose: () => void;
  onDeposit: () => void;
}) {
  const { deposit, isPending: loading } = useVaultDeposit(vaultAddress);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;
    setError('');
    try {
      await deposit(parsed);
      onDeposit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed. Please try again.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box glass-card"
        style={{ maxWidth: 400, borderRadius: 16, padding: '2rem' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Deposit Funds</h3>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: 'var(--slate-300)' }}>
              Add USDC to your vault on Sepolia
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label className="form-label">Vault</label>
            <input className="form-input" value="Acme Corp — Simple Token Vault" disabled />
          </div>
          <div>
            <label className="form-label">Amount (USDC)</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type="number"
                min="1"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                style={{ paddingRight: '4rem' }}
                autoFocus
              />
              <span className="mono" style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', color: 'var(--slate-400)', fontWeight: 500 }}>
                USDC
              </span>
            </div>
          </div>

          {/* Quick-fill amounts */}
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[1000, 5000, 10000, 50000].map(preset => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                style={{
                  flex: 1,
                  background: amount === String(preset) ? 'rgba(0,200,150,0.1)' : 'rgba(10,22,40,0.6)',
                  border: `1px solid ${amount === String(preset) ? 'rgba(0,200,150,0.4)' : 'rgba(90,112,144,0.25)'}`,
                  borderRadius: 6,
                  padding: '0.3rem 0',
                  cursor: 'pointer',
                  color: amount === String(preset) ? 'var(--green-400)' : 'var(--slate-300)',
                  fontSize: '0.72rem',
                  fontFamily: 'var(--font-syne), Syne, sans-serif',
                  fontWeight: 600,
                  transition: 'all 0.15s',
                }}
              >
                ${(preset / 1000).toFixed(0)}k
              </button>
            ))}
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--red-400, #f87171)' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" className="btn-ghost btn-md" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-md" style={{ flex: 2, justifyContent: 'center' }} disabled={loading || !amount}>
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #050d1a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Depositing…
                </>
              ) : (
                <><ArrowDownToLine size={15} /> Deposit</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, subtext, accentBg, accentBorder, loading }: {
  icon: React.ReactNode; label: string; value: string; subtext: string; accentBg: string; accentBorder: string; loading?: boolean;
}) {
  return (
    <div className="glass-card" style={{ borderRadius: 14, padding: '1.5rem', background: accentBg, borderColor: accentBorder }}>
      <div style={{ width: 38, height: 38, background: 'rgba(10,22,40,0.5)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>{icon}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--slate-400)', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 600, marginBottom: '0.35rem' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 800, fontSize: '1.65rem', color: loading ? 'var(--slate-500)' : 'var(--white)', letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--slate-400)', marginTop: '0.25rem' }}>{subtext}</div>
    </div>
  );
}
