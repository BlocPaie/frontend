import { useState } from 'react'
import { useSendCalls, useConfig } from 'wagmi'
import { waitForCallsStatus } from '@wagmi/core'
import { encodeFunctionData } from 'viem'
import ERC20VaultABI from '@/lib/abis/ERC20Vault.json'

const MERCHANT_URL = process.env.NEXT_PUBLIC_MERCHANT_URL ?? '/api/porto/merchant'

export function useVaultWithdraw(vaultAddress: `0x${string}` | null) {
  const { sendCallsAsync } = useSendCalls()
  const config = useConfig()
  const [isPending, setIsPending] = useState(false)

  async function withdraw(amountUsd: number) {
    if (!vaultAddress) throw new Error('No vault connected')
    setIsPending(true)
    try {
      const amountScaled = BigInt(Math.round(amountUsd * 1_000_000))

      const { id } = await sendCallsAsync({
        calls: [{
          to: vaultAddress,
          data: encodeFunctionData({
            abi: ERC20VaultABI,
            functionName: 'withdrawFunds',
            args: [amountScaled],
          }),
        }],
        capabilities: { merchantUrl: MERCHANT_URL } as never,
      })

      await waitForCallsStatus(config, { id })
    } finally {
      setIsPending(false)
    }
  }

  return { withdraw, isPending }
}
