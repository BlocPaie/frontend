'use client';

import { useState, useEffect } from 'react';
import { Copy, Check, Clock, CheckCircle2, Zap, ArrowDownToLine, X } from 'lucide-react';
import Navbar from '@/components/Navbar';
import TxHash from '@/components/TxHash';
import { getContractorId, getToken } from '@/lib/auth';
import { useVaultExecuteCheque } from '@/hooks/useVaultExecuteCheque';
import { useConfidentialVaultExecuteCheque } from '@/hooks/useConfidentialVaultExecuteCheque';
import { useConfig, useAccount, useSendCalls } from 'wagmi';
import { readContract, waitForCallsStatus } from '@wagmi/core';
import { encodeFunctionData, toHex, getAddress, isAddress } from 'viem';
import ERC20ABI from '@/lib/abis/ERC20.json';
import ConfidentialUSDCABI from '@/lib/abis/ConfidentialUSDC.json';
import { USDC_ADDRESS, CONFIDENTIAL_USDC_ADDRESS } from '@/lib/constants';
import { getFhevmInstance } from '@/lib/fhevm';

const API = process.env.NEXT_PUBLIC_API_URL;
const MERCHANT_URL = process.env.NEXT_PUBLIC_MERCHANT_URL ?? '/api/porto/merchant';

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
  const { address } = useAccount();
  const { sendCallsAsync } = useSendCalls();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [idCopied, setIdCopied] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Payout address state
  const [payoutAddress, setPayoutAddress] = useState('');
  const [payoutInput, setPayoutInput] = useState('');
  const [savingPayout, setSavingPayout] = useState(false);
  const [payoutError, setPayoutError] = useState('');

  // Receive funds modal
  const [showReceive, setShowReceive] = useState<'erc20' | 'confidential' | null>(null);

  const { executeCheque: executeErc20, executing: executingErc20 } = useVaultExecuteCheque(
    payoutAddress && isAddress(payoutAddress) ? payoutAddress as `0x${string}` : null
  );
  const { executeCheque: executeConf, executing: executingConf } = useConfidentialVaultExecuteCheque(
    payoutAddress && isAddress(payoutAddress) ? payoutAddress as `0x${string}` : null
  );
  const executing = executingErc20 ?? executingConf;

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }

    // Load invoices + payout address in parallel
    Promise.all([
      fetch(`${API}/api/invoices`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API}/api/registry/contractors/${contractorId}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : null),
    ]).then(async ([body, contractorBody]) => {
      // Set payout address from backend
      const saved = contractorBody?.data?.payoutAddress ?? '';
      setPayoutAddress(saved);
      setPayoutInput(saved);

      // Map invoices
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

      // Detect vault type on-chain if backend didn't return it
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

  const handleSavePayout = async () => {
    if (!isAddress(payoutInput)) { setPayoutError('Invalid Ethereum address'); return; }
    setSavingPayout(true);
    setPayoutError('');
    try {
      const res = await fetch(`${API}/api/registry/contractors/${contractorId}/payout-address`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ payoutAddress: payoutInput }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setPayoutAddress(payoutInput);
      setSuccessMsg('Payout address saved!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setPayoutError('Failed to save payout address');
    } finally {
      setSavingPayout(false);
    }
  };

  const handleExecute = async (inv: Invoice) => {
    if (!inv.vaultAddress || inv.chequeId == null) return;
    setError('');
    try {
      if (inv.vaultType === 'confidential') {
        const { txHash } = await executeConf(inv._id, inv.vaultAddress as `0x${string}`, parseInt(inv.chequeId, 10), inv.amount);
        setInvoices(prev => prev.map(i => i._id === inv._id ? { ...i, status: 'executed', txHash } : i));
      } else {
        const { txHash } = await executeErc20(inv._id, inv.vaultAddress as `0x${string}`, parseInt(inv.chequeId, 10), inv.amount);
        setInvoices(prev => prev.map(i => i._id === inv._id ? { ...i, status: 'executed', txHash } : i));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Execution failed. Please try again.');
    }
  };

  const handleReceiveDone = (type: 'erc20' | 'confidential') => {
    setShowReceive(null);
    setSuccessMsg(type === 'confidential' ? 'Unwrap initiated — USDC will arrive at your payout address shortly.' : 'USDC sent to your payout address!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const fmtAmount = (s: string) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(s));
  const fmtDate   = (s: string) => new Date(s).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const isEmpty   = !loading && pending.length === 0 && executed.length === 0;
  const hasPayoutAddress = payoutAddress && isAddress(payoutAddress);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar role="contractor" />
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '2.5rem 1.5rem' }}>

        <div className="animate-fade-up opacity-0-init" style={{ marginBottom: '2rem' }}>
          <h1 style={{ margin: '0 0 0.3rem', fontSize: '1.6rem', fontWeight: 800 }}>My Dashboard</h1>
          <p style={{ margin: 0, color: 'var(--slate-300)', fontSize: '0.875rem' }}>Track your invoices and payment history</p>
        </div>

        {/* ID Banner */}
        <div className="glass-card animate-fade-up opacity-0-init delay-100" style={{ borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1.25rem', background: 'rgba(245,158,11,0.05)', borderColor: 'rgba(245,158,11,0.2)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
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

        {/* Payout Address */}
        <div className="glass-card animate-fade-up opacity-0-init delay-150" style={{ borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ width: 42, height: 42, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: '1.1rem' }}>💸</span>
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--indigo-400, #818cf8)', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Payout Address</div>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.82rem', color: 'var(--slate-300)', lineHeight: 1.5 }}>
              Set an Ethereum address to automatically receive funds when a cheque is executed. For confidential vaults, use the Receive Funds button after execution.
            </p>
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <input
                className="form-input"
                style={{ flex: 1, minWidth: 240, fontFamily: 'var(--font-mono), IBM Plex Mono, monospace', fontSize: '0.8rem' }}
                placeholder="0x..."
                value={payoutInput}
                onChange={e => { setPayoutInput(e.target.value); setPayoutError(''); }}
              />
              <button
                className="btn-primary btn-sm"
                onClick={handleSavePayout}
                disabled={savingPayout || payoutInput === payoutAddress}
              >
                {savingPayout ? 'Saving…' : 'Save'}
              </button>
            </div>
            {payoutError && <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: 'var(--red-400, #f87171)' }}>{payoutError}</p>}
          </div>
          {hasPayoutAddress && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: 180 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--slate-400)', fontFamily: 'var(--font-syne), Syne, sans-serif', fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Receive Funds</div>
              <button className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => setShowReceive('erc20')}>
                <ArrowDownToLine size={12} /> Receive USDC
              </button>
              <button className="btn-ghost btn-sm" style={{ justifyContent: 'flex-start' }} onClick={() => setShowReceive('confidential')}>
                <ArrowDownToLine size={12} /> Unwrap & Receive cUSDC
              </button>
            </div>
          )}
        </div>

        {/* Toast */}
        {successMsg && (
          <div className="animate-fade-up opacity-0-init" style={{ padding: '0.75rem 1.25rem', background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.3)', borderRadius: 10, color: 'var(--green-400)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className="glow-dot" /> {successMsg}
          </div>
        )}

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
                                    <><Zap size={12} /> Execute{hasPayoutAddress && inv.vaultType !== 'confidential' ? ' & Forward' : ''}</>
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

      {showReceive && (
        <ReceiveFundsModal
          type={showReceive}
          payoutAddress={payoutAddress as `0x${string}`}
          portoAddress={address ?? null}
          config={config}
          sendCallsAsync={sendCallsAsync}
          onClose={() => setShowReceive(null)}
          onDone={() => handleReceiveDone(showReceive)}
        />
      )}
    </div>
  );
}

function ReceiveFundsModal({ type, payoutAddress, portoAddress, config, sendCallsAsync, onClose, onDone }: {
  type: 'erc20' | 'confidential';
  payoutAddress: `0x${string}`;
  portoAddress: `0x${string}` | null;
  config: ReturnType<typeof useConfig>;
  sendCallsAsync: ReturnType<typeof useSendCalls>['sendCallsAsync'];
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portoAddress) { setError('Wallet not connected'); return; }
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) return;
    setError('');
    setLoading(true);
    try {
      const amountScaled = BigInt(Math.round(parsed * 1_000_000));

      if (type === 'erc20') {
        // Transfer USDC from Porto account to payout address
        const { id } = await sendCallsAsync({
          calls: [{
            to: USDC_ADDRESS,
            data: encodeFunctionData({ abi: ERC20ABI, functionName: 'transfer', args: [payoutAddress, amountScaled] }),
          }],
          capabilities: { merchantUrl: MERCHANT_URL } as never,
        });
        await waitForCallsStatus(config, { id });
      } else {
        // Unwrap cUSDC → USDC, sending directly to payout address
        const instance = await getFhevmInstance();
        const encInput = instance.createEncryptedInput(getAddress(CONFIDENTIAL_USDC_ADDRESS), getAddress(portoAddress));
        encInput.add64(amountScaled);
        const { handles, inputProof } = await encInput.encrypt();

        const { id } = await sendCallsAsync({
          calls: [{
            to: CONFIDENTIAL_USDC_ADDRESS,
            data: encodeFunctionData({
              abi: ConfidentialUSDCABI,
              functionName: 'unwrap',
              args: [portoAddress, payoutAddress, toHex(handles[0], { size: 32 }), toHex(inputProof)],
            }),
          }],
          capabilities: { merchantUrl: MERCHANT_URL } as never,
        });
        await waitForCallsStatus(config, { id });
      }
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isConf = type === 'confidential';

  return (
    <div className="modal-overlay" onClick={loading ? undefined : onClose}>
      <div className="modal-box glass-card" style={{ maxWidth: 400, borderRadius: 16, padding: '2rem' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>
              {isConf ? 'Unwrap & Receive cUSDC' : 'Receive USDC'}
            </h3>
            <p style={{ margin: '0.3rem 0 0', fontSize: '0.82rem', color: 'var(--slate-300)' }}>
              {isConf
                ? 'Unwrap cUSDC from your Porto account → USDC at your payout address'
                : 'Transfer USDC from your Porto account to your payout address'}
            </p>
          </div>
          <button onClick={onClose} disabled={loading} style={{ background: 'none', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', color: 'var(--slate-400)', padding: 4, borderRadius: 6 }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          <div>
            <label className="form-label">To</label>
            <input className="form-input" value={payoutAddress} disabled style={{ fontFamily: 'var(--font-mono), IBM Plex Mono, monospace', fontSize: '0.78rem' }} />
          </div>

          {isConf && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, fontSize: '0.8rem', color: 'var(--slate-300)', lineHeight: 1.5 }}>
              The KMS will finalise the unwrap automatically. USDC will arrive at your payout address shortly after the tx confirms.
            </div>
          )}

          <div>
            <label className="form-label">Amount ({isConf ? 'cUSDC' : 'USDC'})</label>
            <div style={{ position: 'relative' }}>
              <input
                className="form-input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                disabled={loading}
                style={{ paddingRight: '4.5rem' }}
                autoFocus
              />
              <span className="mono" style={{ position: 'absolute', right: '0.9rem', top: '50%', transform: 'translateY(-50%)', fontSize: '0.72rem', color: 'var(--slate-400)', fontWeight: 500 }}>
                {isConf ? 'cUSDC' : 'USDC'}
              </span>
            </div>
          </div>

          {error && <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--red-400, #f87171)' }}>{error}</p>}

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
            <button type="button" className="btn-ghost btn-md" style={{ flex: 1 }} onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-primary btn-md" style={{ flex: 2, justifyContent: 'center' }} disabled={loading || !amount}>
              {loading ? (
                <><span style={{ display: 'inline-block', width: 14, height: 14, border: '2px solid #050d1a', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />{isConf ? 'Unwrapping…' : 'Sending…'}</>
              ) : (
                <><ArrowDownToLine size={15} />{isConf ? 'Unwrap & Receive' : 'Receive USDC'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
