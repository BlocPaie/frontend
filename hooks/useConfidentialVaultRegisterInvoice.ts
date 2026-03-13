import { useState } from 'react'
import { useAccount, useSendCalls, useConfig } from 'wagmi'
import { waitForCallsStatus } from '@wagmi/core'
import { encodeFunctionData, parseEventLogs, toHex, getAddress } from 'viem'
import ConfidentialVaultABI from '@/lib/abis/ConfidentialVault.json'
import { getFhevmInstance } from '@/lib/fhevm'
import { getToken } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL
const MERCHANT_URL = process.env.NEXT_PUBLIC_MERCHANT_URL ?? '/api/porto/merchant'

export function useConfidentialVaultRegisterInvoice(vaultAddress: `0x${string}` | null, vaultId: string | null) {
  const { address } = useAccount()
  const { sendCallsAsync } = useSendCalls()
  const config = useConfig()
  const [isPending, setIsPending] = useState(false)

  // invoiceHash: pre-computed client-side — no backend hash fetch needed
  // contractorAddress: the contractor's Porto account address (used as the encrypted payee)
  async function registerInvoice(invoiceHash: `0x${string}`, contractorAddress: string, amount: string) {
    if (!vaultAddress || !vaultId || !address) throw new Error('No vault connected')
    setIsPending(true)
    try {
      const amountScaled = BigInt(Math.round(parseFloat(amount) * 1_000_000))

      // 1. Two separate encrypted inputs — contract requires separate proofs per value
      const instance = await getFhevmInstance()
      const contractVault = getAddress(vaultAddress)
      const caller = getAddress(address)

      const payeeInput = instance.createEncryptedInput(contractVault, caller)
      payeeInput.addAddress(getAddress(contractorAddress as `0x${string}`))
      const { handles: payeeHandles, inputProof: payeeProof } = await payeeInput.encrypt()

      const amountInput = instance.createEncryptedInput(contractVault, caller)
      amountInput.add64(amountScaled)
      const { handles: amountHandles, inputProof: amountProof } = await amountInput.encrypt()

      // 2. Submit on-chain with pre-computed hash
      const { id } = await sendCallsAsync({
        calls: [{
          to: vaultAddress,
          data: encodeFunctionData({
            abi: ConfidentialVaultABI,
            functionName: 'registerInvoice',
            args: [
              invoiceHash,
              toHex(payeeHandles[0], { size: 32 }),
              toHex(payeeProof),
              toHex(amountHandles[0], { size: 32 }),
              toHex(amountProof),
            ],
          }),
        }],
        capabilities: { merchantUrl: MERCHANT_URL } as never,
      })

      // 3. Wait for confirmation and parse ChequeCreated event
      const result = await waitForCallsStatus(config, { id })
      const receipt = result.receipts?.[0]
      if (!receipt) throw new Error('No receipt in call bundle result')

      const logs = parseEventLogs({
        abi: ConfidentialVaultABI as never[],
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
