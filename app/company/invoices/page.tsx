'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, XCircle, ChevronDown, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import StatusBadge from '@/components/StatusBadge';
import TxHash from '@/components/TxHash';
import { getToken, getCompanyId } from '@/lib/auth';
import { useVaultBalance } from '@/hooks/useVaultBalance';
import { useVaultCancelCheque } from '@/hooks/useVaultCancelCheque';

const API = process.env.NEXT_PUBLIC_API_URL;

type InvoiceStatus = 'pending' | 'executed' | 'cancelled';
type StatusFilter = InvoiceStatus | 'all';

interface Invoice {
  _id: string;
  contractorId: string;
  contractorName: string;
  amount: string;
  amountNum: number;
  issuedAt: string;
  status: InvoiceStatus;
  chequeId: string | null;
  vaultAddress: string | null;
  txHash?: string;
}

const STATUS_OPTIONS: { value: StatusFilter; label: string; color: string }[] = [
  { value: 'all',       label: 'All statuses',  color: 'var(--slate-300)' },
  { value: 'pending',   label: 'Pending',        color: 'var(--amber-400)' },
  { value: 'executed',  label: 'Executed',       color: 'var(--green-400)' },
  { value: 'cancelled', label: 'Cancelled',      color: 'var(--slate-400)' },
];

export default function CompanyInvoices() {
  const router = useRouter();
  const { vaultAddress, vaultId } = useVaultBalance();
  const { cancelCheque, cancelling } = useVaultCancelCheque(vaultAddress ?? null, vaultId ?? null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelError, setCancelError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [contractorFilter, setContractorFilter] = useState<string>('all');
  const [statusOpen, setStatusOpen] = useState(false);
  const [contractorOpen, setContractorOpen] = useState(false);

  useEffect(() => {
    const token = getToken();
    const companyId = getCompanyId();
    if (!token || !companyId) { setLoading(false); return; }

    Promise.all([
      fetch(`${API}/api/invoices`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/api/registry/companies/${companyId}/contractors`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ]).then(([invoiceRes, contractorRes]) => {
      const nameMap: Record<string, string> = {};
      for (const c of contractorRes.data ?? []) nameMap[c._id] = c.name;

      type RawTx = { txHash: string; vaultAddress: string; txType: string };
      const mapped: Invoice[] = (invoiceRes.data?.invoices ?? []).map((inv: Record<string, unknown>) => {
        const txs = (inv.transactions as RawTx[]) ?? [];
        const registerTx = txs.find(t => t.txType === 'register') ?? txs[0];
        const latestTx = txs[txs.length - 1];
        return {
          _id: inv._id as string,
          contractorId: inv.contractorId as string,
          contractorName: nameMap[inv.contractorId as string] ?? 'Unknown',
          amount: inv.amount as string,
          amountNum: parseFloat(inv.amount as string),
          issuedAt: inv.issuedAt as string,
          status: inv.status as InvoiceStatus,
          chequeId: (inv.chequeId as string | undefined) ?? null,
          vaultAddress: registerTx?.vaultAddress ?? null,
          txHash: latestTx?.txHash,
        };
      });

      setInvoices(mapped);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const contractors = useMemo(() => [...new Set(invoices.map(i => i.contractorName))].sort(), [invoices]);

  const filtered = useMemo(() => invoices.filter(inv => {
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
    const matchContractor = contractorFilter === 'all' || inv.contractorName === contractorFilter;
    return matchStatus && matchContractor;
  }), [invoices, statusFilter, contractorFilter]);

  const hasActiveFilters = statusFilter !== 'all' || contractorFilter !== 'all';
  const selectedStatus = STATUS_OPTIONS.find(o => o.value === statusFilter)!;

  const handleCancel = async (inv: Invoice) => {
    setCancelError('');
    try {
      if (inv.chequeId) {
        // Registered on-chain — cancel on-chain then confirm
        const { txHash } = await cancelCheque(inv._id, inv.contractorId, inv.chequeId);
        setInvoices(prev => prev.map(i => i._id === inv._id ? { ...i, status: 'cancelled', txHash } : i));
      } else {
        // Not yet registered on-chain — off-chain cancel only
        const res = await fetch(`${API}/api/invoices/${inv._id}/cancel`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (res.ok) {
          setInvoices(prev => prev.map(i => i._id === inv._id ? { ...i, status: 'cancelled' } : i));
        }
      }
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : 'Cancellation failed. Please try again.');
    }
  };

  const fmtAmount = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const fmtDate   = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh' }} onClick={() => { setStatusOpen(false); setContractorOpen(false); }}>
      <Navbar role="company" />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        <div className="animate-fade-up opacity-0-init" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <button className="btn-ghost btn-sm" onClick={() => router.push('/company/dashboard')}><ArrowLeft size={14} /> Dashboard</button>
          <div>
            <h1 style={{ margin: '0 0 0.2rem', fontSize: '1.6rem', fontWeight: 800 }}>Invoices</h1>
            <p style={{ margin: 0, color: 'var(--slate-300)', fontSize: '0.875rem' }}>
              {loading ? 'Loading…' : `${filtered.length} of ${invoices.length} shown · ${invoices.filter(i => i.status === 'pending').length} pending`}
            </p>
          </div>
        </div>

        {/* Filter bar */}
        <div className="animate-fade-up opacity-0-init delay-100" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap', position: 'relative', zIndex: 30 }}>

          {/* Status dropdown */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button className="btn-ghost btn-sm" style={{ borderColor: statusFilter !== 'all' ? 'rgba(0,200,150,0.4)' : undefined, color: statusFilter !== 'all' ? selectedStatus.color : undefined, minWidth: 160, justifyContent: 'space-between' }} onClick={() => { setStatusOpen(p => !p); setContractorOpen(false); }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {statusFilter !== 'all' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: selectedStatus.color, display: 'inline-block', flexShrink: 0 }} />}
                {selectedStatus.label}
              </span>
              <ChevronDown size={13} style={{ opacity: 0.6, transition: 'transform 0.2s', transform: statusOpen ? 'rotate(180deg)' : 'none' }} />
            </button>
            {statusOpen && (
              <div className="glass-card" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 175, borderRadius: 10, overflow: 'hidden', zIndex: 100, animation: 'fadeUp 0.15s ease' }}>
                {STATUS_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => { setStatusFilter(opt.value); setStatusOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', background: statusFilter === opt.value ? 'rgba(0,200,150,0.06)' : 'none', border: 'none', borderBottom: '1px solid rgba(90,112,144,0.12)', padding: '0.6rem 0.9rem', cursor: 'pointer', color: opt.color, fontSize: '0.85rem', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', textAlign: 'left', transition: 'background 0.15s' }}
                    onMouseEnter={e => { if (statusFilter !== opt.value) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(90,112,144,0.08)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = statusFilter === opt.value ? 'rgba(0,200,150,0.06)' : 'none'; }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: opt.color, display: 'inline-block', flexShrink: 0, opacity: opt.value === 'all' ? 0 : 1 }} />
                    {opt.label}
                    {statusFilter === opt.value && <span style={{ marginLeft: 'auto', color: 'var(--green-400)', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Contractor dropdown */}
          <div style={{ position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button className="btn-ghost btn-sm" style={{ borderColor: contractorFilter !== 'all' ? 'rgba(0,200,150,0.4)' : undefined, color: contractorFilter !== 'all' ? 'var(--white)' : undefined, minWidth: 180, justifyContent: 'space-between' }} onClick={() => { setContractorOpen(p => !p); setStatusOpen(false); }}>
              <span>{contractorFilter === 'all' ? 'All contractors' : contractorFilter}</span>
              <ChevronDown size={13} style={{ opacity: 0.6, transition: 'transform 0.2s', transform: contractorOpen ? 'rotate(180deg)' : 'none' }} />
            </button>
            {contractorOpen && (
              <div className="glass-card" style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: 200, borderRadius: 10, overflow: 'hidden', zIndex: 100, animation: 'fadeUp 0.15s ease' }}>
                {['all', ...contractors].map(name => (
                  <button key={name} onClick={() => { setContractorFilter(name); setContractorOpen(false); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', background: contractorFilter === name ? 'rgba(0,200,150,0.06)' : 'none', border: 'none', borderBottom: '1px solid rgba(90,112,144,0.12)', padding: '0.6rem 0.9rem', cursor: 'pointer', color: name === 'all' ? 'var(--slate-300)' : 'var(--white)', fontSize: '0.85rem', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', textAlign: 'left', transition: 'background 0.15s' }}
                    onMouseEnter={e => { if (contractorFilter !== name) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(90,112,144,0.08)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = contractorFilter === name ? 'rgba(0,200,150,0.06)' : 'none'; }}
                  >
                    {name === 'all' ? 'All contractors' : name}
                    {contractorFilter === name && <span style={{ marginLeft: 'auto', color: 'var(--green-400)', fontSize: '0.7rem', fontWeight: 700 }}>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {hasActiveFilters && (
            <button className="btn-ghost btn-sm" onClick={() => { setStatusFilter('all'); setContractorFilter('all'); }} style={{ color: 'var(--slate-400)', gap: '0.3rem' }}>
              <X size={12} /> Clear filters
            </button>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
            {statusFilter !== 'all' && <FilterChip label={selectedStatus.label} color={selectedStatus.color} onRemove={() => setStatusFilter('all')} />}
            {contractorFilter !== 'all' && <FilterChip label={contractorFilter} color="var(--slate-200)" onRemove={() => setContractorFilter('all')} />}
          </div>
        </div>

        {cancelError && (
          <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, color: '#f87171', fontSize: '0.875rem', marginBottom: '1rem' }}>
            {cancelError}
          </div>
        )}

        {/* Table */}
        <div className="glass-card animate-fade-up opacity-0-init delay-200" style={{ borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr><th>Invoice ID</th><th>Contractor</th><th style={{ textAlign: 'right' }}>Amount</th><th>Created</th><th>Status</th><th>Actions / Tx Hash</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--slate-400)' }}>No invoices match the current filters.</td></tr>
                ) : filtered.map((inv, i) => (
                  <tr key={inv._id} style={{ animationDelay: `${i * 0.04}s` }}>
                    <td><span className="mono" style={{ fontSize: '0.78rem', color: 'var(--green-400)', fontWeight: 500 }}>{inv._id.slice(-8)}</span></td>
                    <td style={{ color: 'var(--white)', fontWeight: 500 }}>{inv.contractorName}</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono), IBM Plex Mono, monospace', fontSize: '0.875rem', fontWeight: 500, color: 'var(--white)' }}>{fmtAmount(inv.amountNum)}</td>
                    <td style={{ color: 'var(--slate-400)', fontSize: '0.82rem' }}>{fmtDate(inv.issuedAt)}</td>
                    <td><StatusBadge status={inv.status} /></td>
                    <td>
                      {inv.status === 'pending' && (
                        <button className="btn-danger btn-sm" onClick={() => handleCancel(inv)} disabled={cancelling === inv._id}>
                          {cancelling === inv._id ? (
                            <><span style={{ display: 'inline-block', width: 11, height: 11, border: '1.5px solid #ef4444', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Cancelling…</>
                          ) : (
                            <><XCircle size={13} /> Cancel</>
                          )}
                        </button>
                      )}
                      {(inv.status === 'cancelled' || inv.status === 'executed') && inv.txHash && <TxHash hash={inv.txHash} />}
                      {(inv.status === 'cancelled' || inv.status === 'executed') && !inv.txHash && <span style={{ color: 'var(--slate-500)', fontSize: '0.78rem' }}>—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, color, onRemove }: { label: string; color: string; onRemove: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.2rem 0.5rem 0.2rem 0.7rem', borderRadius: '100px', background: 'rgba(15,32,64,0.8)', border: '1px solid rgba(90,112,144,0.3)', fontSize: '0.75rem', color, fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>
      {label}
      <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--slate-400)', display: 'inline-flex', lineHeight: 1 }}>
        <X size={11} />
      </button>
    </span>
  );
}
