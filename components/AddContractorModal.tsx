'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { getToken, getCompanyId } from '@/lib/auth';

const API = process.env.NEXT_PUBLIC_API_URL;

interface Props {
  vaultId: string;
  onClose: () => void;
  onAdd: () => void;
}

export default function AddContractorModal({ vaultId, onClose, onAdd }: Props) {
  const [contractorId, setContractorId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const companyId = getCompanyId();
    const token = getToken();

    try {
      // 1. Look up contractor by ID to get their Porto address
      const lookupRes = await fetch(`${API}/api/registry/contractors/${contractorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (lookupRes.status === 404) { setError('Contractor not found. Ask them to register on BlocPaie first.'); return; }
      if (!lookupRes.ok) { setError('Could not look up contractor.'); return; }
      const { data: contractor } = await lookupRes.json();

      // 2. Link contractor to company
      const linkRes = await fetch(`${API}/api/registry/companies/${companyId}/contractors`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ portoAccountAddress: contractor.portoAccountAddress }),
      });

      if (linkRes.status === 409) { setError('This contractor is already linked to your company.'); return; }
      if (!linkRes.ok) { const b = await linkRes.json(); setError(b?.error?.message ?? 'Failed to add contractor.'); return; }

      const { data: linked } = await linkRes.json();

      // 3. Register address mapping — freshAddress = Porto address so executeCheque works
      await fetch(`${API}/api/registry/address-mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ contractorId: linked._id, vaultId, freshAddress: linked.portoAccountAddress }),
      });

      onAdd();
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
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
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Add Contractor</h3>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: 'var(--slate-300)' }}>
              Enter their BlocPaie contractor ID
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--slate-400)', padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label className="form-label">Contractor ID</label>
            <input
              className="form-input mono"
              placeholder="64f1a2b6..."
              value={contractorId}
              onChange={e => setContractorId(e.target.value)}
              style={{ fontSize: '0.78rem' }}
              required
              autoFocus
            />
          </div>

          {error && (
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--red-400, #f87171)' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" className="btn-ghost btn-md" style={{ flex: 1 }} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary btn-md" style={{ flex: 2, justifyContent: 'center' }} disabled={loading || !contractorId}>
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #050d1a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  Adding…
                </>
              ) : 'Add Contractor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
