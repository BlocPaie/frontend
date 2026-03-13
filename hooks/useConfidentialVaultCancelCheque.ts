import { useState } from 'react'
import { useSendCalls, useConfig } from 'wagmi'
import { waitForCallsStatus } from '@wagmi/core'
import { encodeFunctionData } from 'viem'
import ConfidentialVaultABI from '@/lib/abis/ConfidentialVault.json'
import { getToken } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL
const MERCHANT_URL = process.env.NEXT_PUBLIC_MERCHANT_URL ?? '/api/porto/merchant'

export function useConfidentialVaultCancelCheque(vaultAddress: `0x${string}` | null) {
  const { sendCallsAsync } = useSendCalls()
  const config = useConfig()
  const [cancelling, setCancelling] = useState<string | null>(null)

  async function cancelCheque(invoiceId: string, chequeId: string) {
    if (!vaultAddress) throw new Error('No vault connected')
    setCancelling(invoiceId)
    try {
      const token = getToken()

      // No payee lookup needed — ConfidentialVault uses a global chequeId
      const { id } = await sendCallsAsync({
        calls: [{
          to: vaultAddress,
          data: encodeFunctionData({
            abi: ConfidentialVaultABI,
            functionName: 'cancelCheque',
            args: [BigInt(chequeId)],
          }),
        }],
        capabilities: { merchantUrl: MERCHANT_URL } as never,
      })

      const result = await waitForCallsStatus(config, { id })
      const receipt = result.receipts?.[0]
      if (!receipt) throw new Error('No receipt in call bundle result')

      const confirmRes = await fetch(`${API}/api/invoices/${invoiceId}/confirm-cancellation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber),
          vaultAddress,
        }),
      })
      if (!confirmRes.ok && confirmRes.status !== 409) {
        throw new Error('Failed to confirm cancellation in backend')
      }

      return { txHash: receipt.transactionHash as string }
    } finally {
      setCancelling(null)
    }
  }

  return { cancelCheque, cancelling }
}
