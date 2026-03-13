'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useVaultRegisterInvoice } from '@/hooks/useVaultRegisterInvoice';
import { useConfidentialVaultRegisterInvoice } from '@/hooks/useConfidentialVaultRegisterInvoice';
import { getToken } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL;

interface Contractor {
  _id: string;
  name: string;
  portoAccountAddress: string;
}

interface Props {
  contractor: Contractor;
  vaultId: string;
  vaultAddress: `0x${string}`;
  vaultType: string | null;
  onClose: () => void;
  onSubmit: () => void;
}

export default function RegisterInvoiceModal({ contractor, vaultId, vaultAddress, vaultType, onClose, onSubmit }: Props) {
  const isConfidential = vaultType === 'confidential';
  const { registerInvoice: registerErc20, isPending: pendingErc20 } = useVaultRegisterInvoice(isConfidential ? null : vaultAddress, vaultId);
  const { registerInvoice: registerConf, isPending: pendingConf } = useConfidentialVaultRegisterInvoice(isConfidential ? vaultAddress : null, vaultId);
  const isPending = isConfidential ? pendingConf : pendingErc20;
  const [amount, setAmount] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // 1. Create invoice in DB
      const res = await fetch(`${API}/api/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          contractorId: contractor._id,
          vaultId,
          amount: parseFloat(amount).toFixed(2),
          currency: 'USDC',
          issuedAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body?.error?.message ?? 'Failed to create invoice.');
        return;
      }

      const { data: invoice } = await res.json();

      // 2. Register on-chain + confirm
      if (isConfidential) {
        await registerConf(invoice._id, contractor.portoAccountAddress, invoice.amount);
      } else {
        await registerErc20(invoice._id, contractor._id, invoice.amount);
      }

      onSubmit();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed. Please try again.');
    }
  };

  return (
    <div className="modal-overlay" onClick={isPending ? undefined : onClose}>
      <div
        className="modal-box glass-card"
        style={{ maxWidth: 420, borderRadius: 16, padding: '2rem' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Register Invoice</h3>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: 'var(--slate-300)' }}>
              For <span style={{ color: 'var(--white)', fontWeight: 500 }}>{contractor.name}</span>
            </p>
          </div>
          <button onClick={onClose} disabled={isPending} style={{ background: 'none', border: 'none', cursor: isPending ? 'not-allowed' : 'pointer', color: 'var(--slate-400)', padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label className="form-label">Payee</label>
            <input className="form-input" value={`${contractor.name} — ${contractor._id.slice(-6)}`} disabled />
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
                disabled={isPending}
                style={{ paddingRight: '4rem' }}
                autoFocus
              />
              <span className="mono" style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', color: 'var(--slate-400)', fontWeight: 500 }}>
                USDC
              </span>
            </div>
          </div>

          {isPending && (
            <div style={{ fontSize: '0.8rem', color: 'var(--slate-300)', background: 'rgba(0,200,150,0.05)', border: '1px solid rgba(0,200,150,0.15)', borderRadius: 8, padding: '0.75rem 1rem' }}>
              <div style={{ marginBottom: '0.3rem', fontWeight: 500, color: 'var(--green-400)' }}>Registering on-chain…</div>
              Sign the passkey prompt, then wait for the transaction to confirm.
            </div>
          )}

          {error && (
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--red-400, #f87171)' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" className="btn-ghost btn-md" style={{ flex: 1 }} onClick={onClose} disabled={isPending}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-md" style={{ flex: 2, justifyContent: 'center' }} disabled={isPending || !amount}>
              {isPending ? (
                <>
                  <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #050d1a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Registering…
                </>
              ) : 'Register Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
