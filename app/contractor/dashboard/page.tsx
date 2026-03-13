'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Clock, CheckCircle2, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import TxHash from '@/components/TxHash';
import { getContractorId, getToken } from '@/lib/auth';
import { useVaultExecuteCheque } from '@/hooks/useVaultExecuteCheque';
import { useConfidentialVaultExecuteCheque } from '@/hooks/useConfidentialVaultExecuteCheque';
import { useConfig } from 'wagmi';
import { readContract } from '@wagmi/core';

const API = process.env.NEXT_PUBLIC_API_URL;

interface Invoice {
  _id: string;
  companyId: string;
  vaultAddress: string | null;
  vaultType: string | null;
  amount: string;
  issuedAt: string;
  status: 'pending' | 'executed' | 'cancelled';
  chequeId: string | null;
  txHash?: string;
}

export default function ContractorDashboard() {
  const contractorId = getContractorId() ?? '';
  const config = useConfig();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [idCopied, setIdCopied] = useState(false);
  const [error, setError] = useState('');
  const { executeCheque: executeErc20, executing: executingErc20 } = useVaultExecuteCheque();
  const { executeCheque: executeConf, executing: executingConf } = useConfidentialVaultExecuteCheque();
  const executing = executingErc20 ?? executingConf;

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }

    fetch(`${API}/api/invoices`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(async body => {
        type RawTx = { txHash: string; vaultAddress: string; txType: string };
        const mapped: Invoice[] = (body.data?.invoices ?? []).map((inv: Record<string, unknown>) => {
          const txs = (inv.transactions as RawTx[]) ?? [];
          const registerTx = txs.find(t => t.txType === 'register') ?? txs[0];
          const latestTx = txs[txs.length - 1];
          return {
            _id: inv._id as string,
            companyId: inv.companyId as string,
            vaultAddress: registerTx?.vaultAddress ?? null,
            vaultType: (inv.vaultType as string | undefined) ?? null,
            amount: inv.amount as string,
            issuedAt: inv.issuedAt as string,
            status: inv.status as Invoice['status'],
            chequeId: (inv.chequeId as string | undefined) ?? null,
            txHash: latestTx?.txHash,
          };
        });

        // If the backend didn't return vaultType, detect it on-chain.
        // confidentialProtocolId() only exists on ConfidentialVault — use it as a probe.
        const unknownAddresses = [...new Set(
          mapped.filter(i => !i.vaultType && i.vaultAddress).map(i => i.vaultAddress!)
        )];
        const typeMap: Record<string, string> = {};
        await Promise.all(unknownAddresses.map(async addr => {
          try {
            await readContract(config, {
              address: addr as `0x${string}`,
              abi: [{ name: 'confidentialProtocolId', type: 'function', stateMutability: 'view', inputs: [], outputs: [{ type: 'uint256', name: '' }] }],
              functionName: 'confidentialProtocolId',
            });
            typeMap[addr] = 'confidential';
          } catch {
            typeMap[addr] = 'erc20';
          }
        }));

        setInvoices(mapped.map(i => ({
          ...i,
          vaultType: i.vaultType ?? (i.vaultAddress ? typeMap[i.vaultAddress] ?? null : null),
        })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const pending = invoices.filter(i => i.status === 'pending');
  const executed = invoices.filter(i => i.status === 'executed');

  const copyId = () => {
    navigator.clipboard.writeText(contractorId);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 1500);
  };

  const handleExecute = async (inv: Invoice) => {
    if (!inv.vaultAddress || inv.chequeId == null) return;
    setError('');
    try {
      const fn = inv.vaultType === 'confidential' ? executeConf : executeErc20;
      const { txHash } = await fn(inv._id, inv.vaultAddress as `0x${string}`, parseInt(inv.chequeId, 10));
      setInvoices(prev => prev.map(i =>
        i._id === inv._id ? { ...i, status: 'executed', txHash } : i
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed. Please try again.');
    }
  };

  const fmtAmount = (s: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(s));
  const fmtDate   = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isEmpty   = !loading && pending.length === 0 && executed.length === 0;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar role="contractor" />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        <div className="animate-fade-up opacity-0-init" style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 0.3rem', fontSize: '1.6rem', fontWeight: 800 }}>My Dashboard</h1>
          <p style={{ margin: 0, color: 'var(--slate-300)', fontSize: '0.875rem' }}>Track your invoices and payment history</p>
        </div>

        {/* ID Banner */}
        <div className="glass-card animate-fade-up opacity-0-init delay-100" style={{ borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '2rem', background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ width: 42, height: 42, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '1.1rem' }}>🪪</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--amber-400)', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Your Contractor ID</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="mono" style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--white)', letterSpacing: '0.05em' }}>{contractorId}</span>
              <button onClick={copyId} style={{ background: 'none', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '0.2rem 0.6rem', cursor: 'pointer', color: idCopied ? 'var(--green-400)' : 'var(--amber-400)', fontSize: '0.75rem', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'color 0.2s' }}>
                {idCopied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
              </button>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--slate-300)', maxWidth: 340, lineHeight: 1.5 }}>
            Share this ID with any company to let them register invoices on your behalf.
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem 1.25rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, color: '#f87171', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div className="glass-card" style={{ borderRadius: 16, padding: '3rem', textAlign: 'center', color: 'var(--slate-400)' }}>Loading…</div>
        ) : isEmpty ? (
          <div className="glass-card animate-fade-up opacity-0-init delay-200" style={{ borderRadius: 16, padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.15rem', fontWeight: 700 }}>No invoices yet</h2>
            <p style={{ margin: 0, color: 'var(--slate-300)', fontSize: '0.875rem', maxWidth: 460, marginInline: 'auto', lineHeight: 1.7 }}>
              No invoices have been created for you yet. Share your contractor ID with a company to get started.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Pending */}
            <section>
              <div className="animate-fade-up opacity-0-init delay-200" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.875rem' }}>
                <Clock size={16} color="var(--amber-400)" />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Pending Invoices</h2>
                {pending.length > 0 && <span style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', color: 'var(--amber-400)', fontSize: '0.7rem', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: '100px' }}>{pending.length}</span>}
              </div>
              <div className="glass-card animate-fade-up opacity-0-init delay-300" style={{ borderRadius: 14, overflow: 'hidden' }}>
                {pending.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-400)', fontSize: '0.875rem' }}>No pending invoices</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead><tr><th>Invoice ID</th><th>Vault</th><th style={{ textAlign: 'right' }}>Amount</th><th>Created</th><th>Action</th></tr></thead>
                      <tbody>
                        {pending.map((inv, i) => (
                          <tr key={inv._id} className="animate-fade-up opacity-0-init" style={{ animationDelay: `${0.35 + i * 0.06}s` }}>
                            <td><span className="mono" style={{ fontSize: '0.78rem', color: 'var(--amber-400)', fontWeight: 500 }}>{inv._id.slice(-8)}</span></td>
                            <td><span className="mono" style={{ fontSize: '0.78rem', color: 'var(--slate-300)' }}>{inv.vaultAddress ? `${inv.vaultAddress.slice(0, 6)}…${inv.vaultAddress.slice(-4)}` : '—'}</span></td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono), IBM Plex Mono, monospace', fontSize: '0.875rem', fontWeight: 500, color: 'var(--white)' }}>{fmtAmount(inv.amount)}</td>
                            <td style={{ color: 'var(--slate-400)', fontSize: '0.82rem' }}>{fmtDate(inv.issuedAt)}</td>
                            <td>
                              {inv.chequeId != null ? (
                                <button className="btn-primary btn-sm" onClick={() => handleExecute(inv)} disabled={executing === inv._id}>
                                  {executing === inv._id ? (
                                    <><span style={{ display: 'inline-block', width: 11, height: 11, border: '1.5px solid #050d1a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Executing…</>
                                  ) : (
                                    <><Zap size={12} /> Execute</>
                                  )}
                                </button>
                              ) : (
                                <span style={{ color: 'var(--slate-500)', fontSize: '0.78rem' }}>Awaiting registration</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* Executed */}
            <section>
              <div className="animate-fade-up opacity-0-init delay-300" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.875rem' }}>
                <CheckCircle2 size={16} color="var(--green-400)" />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>Executed Invoices</h2>
                {executed.length > 0 && <span style={{ background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)', color: 'var(--green-400)', fontSize: '0.7rem', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 700, padding: '0.1rem 0.5rem', borderRadius: '100px' }}>{executed.length}</span>}
              </div>
              <div className="glass-card animate-fade-up opacity-0-init delay-400" style={{ borderRadius: 14, overflow: 'hidden' }}>
                {executed.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--slate-400)', fontSize: '0.875rem' }}>No executed invoices yet</div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table className="data-table">
                      <thead><tr><th>Invoice ID</th><th>Vault</th><th style={{ textAlign: 'right' }}>Amount</th><th>Executed</th><th>Tx Hash</th></tr></thead>
                      <tbody>
                        {executed.map((inv, i) => (
                          <tr key={inv._id} className="animate-fade-up opacity-0-init" style={{ animationDelay: `${0.4 + i * 0.06}s` }}>
                            <td><span className="mono" style={{ fontSize: '0.78rem', color: 'var(--green-400)', fontWeight: 500 }}>{inv._id.slice(-8)}</span></td>
                            <td><span className="mono" style={{ fontSize: '0.78rem', color: 'var(--slate-300)' }}>{inv.vaultAddress ? `${inv.vaultAddress.slice(0, 6)}…${inv.vaultAddress.slice(-4)}` : '—'}</span></td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono), IBM Plex Mono, monospace', fontSize: '0.875rem', fontWeight: 500, color: 'var(--white)' }}>{fmtAmount(inv.amount)}</td>
                            <td style={{ color: 'var(--slate-400)', fontSize: '0.82rem' }}>{fmtDate(inv.issuedAt)}</td>
                            <td>{inv.txHash ? <TxHash hash={inv.txHash} /> : <span style={{ color: 'var(--slate-500)', fontSize: '0.78rem' }}>—</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
