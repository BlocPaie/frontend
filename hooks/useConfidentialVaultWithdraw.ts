import { useState } from 'react'
import { useAccount, useSendCalls, useConfig } from 'wagmi'
import { waitForCallsStatus } from '@wagmi/core'
import { encodeFunctionData, toHex, getAddress } from 'viem'
import ConfidentialVaultABI from '@/lib/abis/ConfidentialVault.json'
import ConfidentialUSDCABI from '@/lib/abis/ConfidentialUSDC.json'
import { CONFIDENTIAL_USDC_ADDRESS } from '@/lib/constants'
import { getFhevmInstance } from '@/lib/fhevm'

const MERCHANT_URL = process.env.NEXT_PUBLIC_MERCHANT_URL ?? '/api/porto/merchant'

export function useConfidentialVaultWithdraw(vaultAddress: `0x${string}` | null) {
  const { address } = useAccount()
  const { sendCallsAsync } = useSendCalls()
  const config = useConfig()
  const [isPending, setIsPending] = useState(false)

  async function withdraw(amountUsd: number) {
    if (!vaultAddress || !address) throw new Error('No vault or wallet connected')
    setIsPending(true)
    try {
      const amountScaled = BigInt(Math.round(amountUsd * 1_000_000))
      const instance = await getFhevmInstance()
      const caller = getAddress(address)

      // Proof 1: bound to (vaultAddress, caller) — for vault.withdrawFunds
      const withdrawInput = instance.createEncryptedInput(getAddress(vaultAddress), caller)
      withdrawInput.add64(amountScaled)
      const { handles: wHandles, inputProof: wProof } = await withdrawInput.encrypt()

      // Proof 2: bound to (CONFIDENTIAL_USDC_ADDRESS, caller) — for cUSDC.unwrap
      const unwrapInput = instance.createEncryptedInput(getAddress(CONFIDENTIAL_USDC_ADDRESS), caller)
      unwrapInput.add64(amountScaled)
      const { handles: uHandles, inputProof: uProof } = await unwrapInput.encrypt()

      const { id } = await sendCallsAsync({
        calls: [
          {
            // Step 1: pull cUSDC from vault back to company wallet
            to: vaultAddress,
            data: encodeFunctionData({
              abi: ConfidentialVaultABI,
              functionName: 'withdrawFunds',
              args: [toHex(wHandles[0], { size: 32 }), toHex(wProof)],
            }),
          },
          {
            // Step 2: unwrap cUSDC → USDC (KMS calls finalizeUnwrap automatically)
            to: CONFIDENTIAL_USDC_ADDRESS,
            data: encodeFunctionData({
              abi: ConfidentialUSDCABI,
              functionName: 'unwrap',
              args: [address, address, toHex(uHandles[0], { size: 32 }), toHex(uProof)],
            }),
          },
        ],
        capabilities: { merchantUrl: MERCHANT_URL } as never,
      })

      await waitForCallsStatus(config, { id })
    } finally {
      setIsPending(false)
    }
  }

  return { withdraw, isPending }
}
