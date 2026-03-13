import { useState } from 'react'
import { useSendCalls, useConfig } from 'wagmi'
import { waitForCallsStatus } from '@wagmi/core'
import { encodeFunctionData, parseEventLogs } from 'viem'
import ConfidentialVaultABI from '@/lib/abis/ConfidentialVault.json'
import { getToken } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL
const MERCHANT_URL = process.env.NEXT_PUBLIC_MERCHANT_URL ?? '/api/porto/merchant'

export function useConfidentialVaultExecuteCheque() {
  const { sendCallsAsync } = useSendCalls()
  const config = useConfig()
  const [executing, setExecuting] = useState<string | null>(null)

  async function executeCheque(invoiceId: string, vaultAddress: `0x${string}`, chequeId: number) {
    setExecuting(invoiceId)
    try {
      const token = getToken()

      // 1. Submit executeCheque — anyone may call; only the real payee receives tokens
      const { id } = await sendCallsAsync({
        calls: [{
          to: vaultAddress,
          data: encodeFunctionData({
            abi: ConfidentialVaultABI,
            functionName: 'executeCheque',
            args: [BigInt(chequeId)],
          }),
        }],
        capabilities: { merchantUrl: MERCHANT_URL } as never,
      })

      // 2. Wait for confirmation
      const result = await waitForCallsStatus(config, { id })
      const receipt = result.receipts?.[0]
      if (!receipt) throw new Error('No receipt in call bundle result')

      // 3. Parse ChequeExecuteAttempted — always emitted regardless of outcome.
      //    Actual payment is confirmed by ConfidentialTransfer on the cUSDC contract.
      const logs = parseEventLogs({
        abi: ConfidentialVaultABI as never[],
        eventName: 'ChequeExecuteAttempted',
        logs: receipt.logs as never[],
      })
      if (!logs.length) throw new Error('ChequeExecuteAttempted event not found in receipt')

      // 4. Confirm payment optimistically in backend (409 = already confirmed, treat as success)
      const confirmRes = await fetch(`${API}/api/invoices/${invoiceId}/confirm-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber),
          chequeId: String(chequeId),
          vaultAddress,
        }),
      })
      if (!confirmRes.ok && confirmRes.status !== 409) {
        throw new Error('Failed to confirm payment in backend')
      }

      return { txHash: receipt.transactionHash as string }
    } finally {
      setExecuting(null)
    }
  }

  return { executeCheque, executing }
}
