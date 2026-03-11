'use client';

import { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

export default function TxHash({ hash }: { hash: string }) {
  const [copied, setCopied] = useState(false);

  const short = `${hash.slice(0, 8)}...${hash.slice(-6)}`;
  const explorerUrl = `https://sepolia.etherscan.io/tx/${hash}`;

  const copy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
      <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--slate-300)' }}>
        {short}
      </span>
      <button
        onClick={copy}
        title="Copy hash"
        style={{
          background: 'none', border: 'none', padding: '2px', cursor: 'pointer',
          color: copied ? 'var(--green-400)' : 'var(--slate-400)',
          transition: 'color 0.2s', display: 'inline-flex',
        }}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <a
        href={explorerUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="View on Etherscan"
        style={{ color: 'var(--slate-400)', display: 'inline-flex', transition: 'color 0.2s' }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--green-400)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--slate-400)')}
      >
        <ExternalLink size={12} />
      </a>
    </span>
  );
}
