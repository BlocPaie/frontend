import { useState } from 'react'
import { useSendCalls, useConfig } from 'wagmi'
import { waitForCallsStatus } from '@wagmi/core'
import { encodeFunctionData, parseEventLogs } from 'viem'
import ERC20VaultABI from '@/lib/abis/ERC20Vault.json'
import { getToken } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL
const MERCHANT_URL = process.env.NEXT_PUBLIC_MERCHANT_URL ?? '/api/porto/merchant'

export function useVaultRegisterInvoice(vaultAddress: `0x${string}` | null, vaultId: string | null) {
  const { sendCallsAsync } = useSendCalls()
  const config = useConfig()
  const [isPending, setIsPending] = useState(false)

  async function registerInvoice(invoiceId: string, contractorId: string, amount: string) {
    if (!vaultAddress || !vaultId) throw new Error('No vault connected')
    setIsPending(true)
    try {
      const token = getToken()

      // 1. Get fresh address (payee) for this contractor+vault
      const mappingRes = await fetch(
        `${API}/api/registry/address-mappings/by-contractor?vaultId=${vaultId}&contractorId=${contractorId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (!mappingRes.ok) throw new Error('Address mapping not found — add the contractor first')
      const { data: mapping } = await mappingRes.json()

      // 2. Get invoice hash from backend (do not recompute locally)
      const hashRes = await fetch(`${API}/api/invoices/${invoiceId}/hash`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!hashRes.ok) throw new Error('Failed to fetch invoice hash')
      const { data: hashData } = await hashRes.json()

      // 3. Scale amount to USDC 6-decimal uint128
      const amountScaled = BigInt(Math.round(parseFloat(amount) * 1_000_000))

      // 4. Encode and submit on-chain
      const { id } = await sendCallsAsync({
        calls: [{
          to: vaultAddress,
          data: encodeFunctionData({
            abi: ERC20VaultABI,
            functionName: 'registerInvoice',
            args: [hashData.invoiceHash as `0x${string}`, mapping.freshAddress as `0x${string}`, amountScaled],
          }),
        }],
        capabilities: { merchantUrl: MERCHANT_URL } as never,
      })

      // 5. Wait for confirmation
      const result = await waitForCallsStatus(config, { id })
      const receipt = result.receipts?.[0]
      if (!receipt) throw new Error('No receipt in call bundle result')

      // 6. Parse ChequeCreated event → chequeId
      const logs = parseEventLogs({
        abi: ERC20VaultABI as never[],
        eventName: 'ChequeCreated',
        logs: receipt.logs as never[],
      })
      if (!logs.length) throw new Error('ChequeCreated event not found in receipt')
      const chequeId = String((logs[0] as unknown as { args: { chequeId: bigint } }).args.chequeId)

      // 7. Confirm registration in backend
      const confirmRes = await fetch(`${API}/api/invoices/${invoiceId}/confirm-registration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          txHash: receipt.transactionHash,
          blockNumber: Number(receipt.blockNumber),
          chequeId,
          vaultAddress,
        }),
      })
      // 409 = already confirmed (idempotent), treat as success
      if (!confirmRes.ok && confirmRes.status !== 409) {
        throw new Error('Failed to confirm registration in backend')
      }

      return { chequeId, txHash: receipt.transactionHash }
    } finally {
      setIsPending(false)
    }
  }

  return { registerInvoice, isPending }
}
