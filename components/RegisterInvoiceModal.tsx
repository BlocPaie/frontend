'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { Contractor } from '@/data/mock';

interface Props {
  contractor: Contractor;
  onClose: () => void;
  onSubmit: (data: { amount: string }) => void;
}

export default function RegisterInvoiceModal({ contractor, onClose, onSubmit }: Props) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onSubmit({ amount });
    }, 1200);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
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
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* Payer */}
          <div>
            <label className="form-label">Payer</label>
            <input className="form-input" value="Acme Corp" disabled />
          </div>

          {/* Payee */}
          <div>
            <label className="form-label">Payee</label>
            <input className="form-input" value={`${contractor.name} — ${contractor.id}`} disabled />
          </div>

          {/* Amount */}
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
              />
              <span className="mono" style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', color: 'var(--slate-400)', fontWeight: 500 }}>
                USDC
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" className="btn-ghost btn-md" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-md" style={{ flex: 2, justifyContent: 'center' }} disabled={loading}>
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #050d1a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Creating…
                </>
              ) : 'Create Invoice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
