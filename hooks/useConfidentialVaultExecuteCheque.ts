import { useState } from 'react'
import { useAccount, useSendCalls, useConfig } from 'wagmi'
import { waitForCallsStatus } from '@wagmi/core'
import { encodeFunctionData, parseEventLogs, toHex, getAddress } from 'viem'
import ConfidentialVaultABI from '@/lib/abis/ConfidentialVault.json'
import ConfidentialUSDCABI from '@/lib/abis/ConfidentialUSDC.json'
import { CONFIDENTIAL_USDC_ADDRESS } from '@/lib/constants'
import { getFhevmInstance } from '@/lib/fhevm'
import { getToken } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL
const MERCHANT_URL = process.env.NEXT_PUBLIC_MERCHANT_URL ?? '/api/porto/merchant'

export function useConfidentialVaultExecuteCheque(payoutAddress?: `0x${string}` | null) {
  const { address } = useAccount()
  const { sendCallsAsync } = useSendCalls()
  const config = useConfig()
  const [executing, setExecuting] = useState<string | null>(null)

  async function executeCheque(invoiceId: string, vaultAddress: `0x${string}`, chequeId: number, amount: string) {
    setExecuting(invoiceId)
    try {
      const token = getToken()

      const calls: { to: `0x${string}`; data: `0x${string}` }[] = [
        {
          to: vaultAddress,
          data: encodeFunctionData({
            abi: ConfidentialVaultABI,
            functionName: 'executeCheque',
            args: [BigInt(chequeId)],
          }),
        },
      ]

      // If payout address is set, bundle unwrap immediately after execute.
      // The FHE transfer completes within the same tx so cUSDC is in the Porto
      // account by the time call 2 runs. KMS calls finalizeUnwrap → USDC → payoutAddress.
      if (payoutAddress && address) {
        const amountScaled = BigInt(Math.round(parseFloat(amount) * 1_000_000))
        const instance = await getFhevmInstance()
        const encInput = instance.createEncryptedInput(getAddress(CONFIDENTIAL_USDC_ADDRESS), getAddress(address))
        encInput.add64(amountScaled)
        const { handles, inputProof } = await encInput.encrypt()

        calls.push({
          to: CONFIDENTIAL_USDC_ADDRESS,
          data: encodeFunctionData({
            abi: ConfidentialUSDCABI,
            functionName: 'unwrap',
            args: [address, payoutAddress, toHex(handles[0], { size: 32 }), toHex(inputProof)],
          }),
        })
      }

      const { id } = await sendCallsAsync({
        calls,
        capabilities: { merchantUrl: MERCHANT_URL } as never,
      })

      // Wait for confirmation
      const result = await waitForCallsStatus(config, { id })
      const receipt = result.receipts?.[0]
      if (!receipt) throw new Error('No receipt in call bundle result')

      // Parse ChequeExecuteAttempted — always emitted regardless of outcome.
      // Actual payment confirmed by ConfidentialTransfer on the cUSDC contract.
      const logs = parseEventLogs({
        abi: ConfidentialVaultABI as never[],
        eventName: 'ChequeExecuteAttempted',
        logs: receipt.logs as never[],
      })
      if (!logs.length) throw new Error('ChequeExecuteAttempted event not found in receipt')

      // Confirm payment optimistically in backend (409 = already confirmed, treat as success)
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
