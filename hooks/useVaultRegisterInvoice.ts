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

  // invoiceHash: pre-computed client-side — no backend hash fetch needed
  async function registerInvoice(invoiceHash: `0x${string}`, contractorId: string, amount: string) {
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

      const amountScaled = BigInt(Math.round(parseFloat(amount) * 1_000_000))

      // 2. Submit on-chain with pre-computed hash
      const { id } = await sendCallsAsync({
        calls: [{
          to: vaultAddress,
          data: encodeFunctionData({
            abi: ERC20VaultABI,
            functionName: 'registerInvoice',
            args: [invoiceHash, mapping.freshAddress as `0x${string}`, amountScaled],
          }),
        }],
        capabilities: { merchantUrl: MERCHANT_URL } as never,
      })

      // 3. Wait for confirmation
      const result = await waitForCallsStatus(config, { id })
      const receipt = result.receipts?.[0]
      if (!receipt) throw new Error('No receipt in call bundle result')

      // 4. Parse ChequeCreated event → chequeId
      const logs = parseEventLogs({
        abi: ERC20VaultABI as never[],
        eventName: 'ChequeCreated',
        logs: receipt.logs as never[],
      })
      if (!logs.length) throw new Error('ChequeCreated event not found in receipt')
      const chequeId = String((logs[0] as unknown as { args: { chequeId: bigint } }).args.chequeId)

      return { chequeId, txHash: receipt.transactionHash as string, blockNumber: Number(receipt.blockNumber) }
    } finally {
      setIsPending(false)
    }
  }

  return { registerInvoice, isPending }
}
