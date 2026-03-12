import { useState } from 'react'
import { useSendCalls, useConfig } from 'wagmi'
import { waitForCallsStatus } from '@wagmi/core'
import { encodeFunctionData } from 'viem'
import ERC20VaultABI from '@/lib/abis/ERC20Vault.json'
import { getToken } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL
const MERCHANT_URL = process.env.NEXT_PUBLIC_MERCHANT_URL ?? '/api/porto/merchant'

export function useVaultCancelCheque(vaultAddress: `0x${string}` | null, vaultId: string | null) {
  const { sendCallsAsync } = useSendCalls()
  const config = useConfig()
  const [cancelling, setCancelling] = useState<string | null>(null)

  async function cancelCheque(invoiceId: string, contractorId: string, chequeId: string) {
    if (!vaultAddress || !vaultId) throw new Error('No vault connected')
    setCancelling(invoiceId)
    try {
      const token = getToken()

      // 1. Get fresh address (payee) for this contractor+vault
      const mappingRes = await fetch(
        `${API}/api/registry/address-mappings/by-contractor?vaultId=${vaultId}&contractorId=${contractorId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!mappingRes.ok) throw new Error('Address mapping not found')
      const { data: mapping } = await mappingRes.json()

      // 2. Submit cancelCheque on-chain
      const { id } = await sendCallsAsync({
        calls: [{
          to: vaultAddress,
          data: encodeFunctionData({
            abi: ERC20VaultABI,
            functionName: 'cancelCheque',
            args: [mapping.freshAddress as `0x${string}`, BigInt(chequeId)],
          }),
        }],
        capabilities: { merchantUrl: MERCHANT_URL } as never,
      })

      // 3. Wait for confirmation
      const result = await waitForCallsStatus(config, { id })
      const receipt = result.receipts?.[0]
      if (!receipt) throw new Error('No receipt in call bundle result')

      // 4. Confirm cancellation in backend (409 = already confirmed, treat as success)
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
