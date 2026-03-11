'use client';

import { useState } from 'react';
import { Copy, Check, Clock, CheckCircle2, Zap } from 'lucide-react';
import Navbar from '@/components/Navbar';
import TxHash from '@/components/TxHash';
import { CONTRACTOR_PENDING, CONTRACTOR_EXECUTED, type Invoice } from '@/data/mock';

const MY_ID = 'CTR-0042';

export default function ContractorDashboard() {
  const [pending, setPending] = useState<Invoice[]>(CONTRACTOR_PENDING);
  const [executed, setExecuted] = useState<Invoice[]>(CONTRACTOR_EXECUTED);
  const [executing, setExecuting] = useState<string | null>(null);
  const [idCopied, setIdCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(MY_ID);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 1500);
  };

  const handleExecute = (id: string) => {
    setExecuting(id);
    setTimeout(() => {
      const inv = pending.find(i => i.id === id)!;
      const done: Invoice = { ...inv, status: 'executed', txHash: '0xe' + Math.random().toString(16).slice(2, 62) };
      setPending(prev => prev.filter(i => i.id !== id));
      setExecuted(prev => [done, ...prev]);
      setExecuting(null);
    }, 1800);
  };

  const fmtAmount = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const fmtDate   = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isEmpty   = pending.length === 0 && executed.length === 0;

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
              <span className="mono" style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--white)', letterSpacing: '0.05em' }}>{MY_ID}</span>
              <button onClick={copyId} style={{ background: 'none', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '0.2rem 0.6rem', cursor: 'pointer', color: idCopied ? 'var(--green-400)' : 'var(--amber-400)', fontSize: '0.75rem', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem', transition: 'color 0.2s' }}>
                {idCopied ? <><Check size={11} /> Copied!</> : <><Copy size={11} /> Copy</>}
              </button>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--slate-300)', maxWidth: 340, lineHeight: 1.5 }}>
            Share this ID with any company to let them register invoices on your behalf.
          </p>
        </div>

        {isEmpty ? (
          <div className="glass-card animate-fade-up opacity-0-init delay-200" style={{ borderRadius: 16, padding: '3.5rem 2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.15rem', fontWeight: 700 }}>No invoices yet</h2>
            <p style={{ margin: 0, color: 'var(--slate-300)', fontSize: '0.875rem', maxWidth: 460, marginInline: 'auto', lineHeight: 1.7 }}>
              No invoices have been created for you yet. Share your personal ID{' '}
              <span className="mono" style={{ color: 'var(--amber-400)', background: 'rgba(245,158,11,0.08)', padding: '0.1rem 0.4rem', borderRadius: 4, fontSize: '0.875rem' }}>{MY_ID}</span>
              {' '}with any company that wishes to register you so they can create an invoice on your behalf.
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
                      <thead><tr><th>Invoice ID</th><th>Company</th><th style={{ textAlign: 'right' }}>Amount</th><th>Created</th><th>Action</th></tr></thead>
                      <tbody>
                        {pending.map((inv, i) => (
                          <tr key={inv.id} className="animate-fade-up opacity-0-init" style={{ animationDelay: `${0.35 + i * 0.06}s` }}>
                            <td><span className="mono" style={{ fontSize: '0.78rem', color: 'var(--amber-400)', fontWeight: 500 }}>{inv.id}</span></td>
                            <td style={{ color: 'var(--white)', fontWeight: 500 }}>{inv.companyName}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono), IBM Plex Mono, monospace', fontSize: '0.875rem', fontWeight: 500, color: 'var(--white)' }}>{fmtAmount(inv.amount)}</td>
                            <td style={{ color: 'var(--slate-400)', fontSize: '0.82rem' }}>{fmtDate(inv.createdDate)}</td>
                            <td>
                              <button className="btn-primary btn-sm" onClick={() => handleExecute(inv.id)} disabled={executing === inv.id}>
                                {executing === inv.id ? (
                                  <><span style={{ display: 'inline-block', width: 11, height: 11, border: '1.5px solid #050d1a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />Executing…</>
                                ) : (
                                  <><Zap size={12} /> Execute Invoice</>
                                )}
                              </button>
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
                      <thead><tr><th>Invoice ID</th><th>Company</th><th style={{ textAlign: 'right' }}>Amount</th><th>Executed</th><th>Tx Hash</th></tr></thead>
                      <tbody>
                        {executed.map((inv, i) => (
                          <tr key={inv.id} className="animate-fade-up opacity-0-init" style={{ animationDelay: `${0.4 + i * 0.06}s` }}>
                            <td><span className="mono" style={{ fontSize: '0.78rem', color: 'var(--green-400)', fontWeight: 500 }}>{inv.id}</span></td>
                            <td style={{ color: 'var(--white)', fontWeight: 500 }}>{inv.companyName}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono), IBM Plex Mono, monospace', fontSize: '0.875rem', fontWeight: 500, color: 'var(--white)' }}>{fmtAmount(inv.amount)}</td>
                            <td style={{ color: 'var(--slate-400)', fontSize: '0.82rem' }}>{fmtDate(inv.createdDate)}</td>
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
