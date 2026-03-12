import { useState } from 'react'
import { useAccount, useSendCalls, useConfig } from 'wagmi'
import { readContract, waitForCallsStatus } from '@wagmi/core'
import { encodeFunctionData } from 'viem'
import ERC20VaultABI from '@/lib/abis/ERC20Vault.json'
import ERC20ABI from '@/lib/abis/ERC20.json'
import { USDC_ADDRESS } from '@/lib/constants'

const MERCHANT_URL = process.env.NEXT_PUBLIC_MERCHANT_URL ?? '/api/porto/merchant'

export function useVaultDeposit(vaultAddress: `0x${string}` | null) {
  const { address } = useAccount()
  const { sendCallsAsync } = useSendCalls()
  const config = useConfig()
  const [isPending, setIsPending] = useState(false)

  async function deposit(amountUsd: number) {
    if (!vaultAddress || !address) throw new Error('No vault or wallet connected')
    setIsPending(true)
    try {
      // USDC uses 6 decimals
      const amountScaled = BigInt(Math.round(amountUsd * 1_000_000))

      // Check existing allowance — if sufficient we skip approve
      const allowance = await readContract(config, {
        address: USDC_ADDRESS,
        abi: ERC20ABI as never[],
        functionName: 'allowance',
        args: [address, vaultAddress],
      }) as bigint

      const calls: { to: `0x${string}`; data: `0x${string}` }[] = []

      if (allowance < amountScaled) {
        calls.push({
          to: USDC_ADDRESS,
          data: encodeFunctionData({
            abi: ERC20ABI,
            functionName: 'approve',
            args: [vaultAddress, amountScaled],
          }),
        })
      }

      calls.push({
        to: vaultAddress,
        data: encodeFunctionData({
          abi: ERC20VaultABI,
          functionName: 'depositFunds',
          args: [amountScaled],
        }),
      })

      const { id } = await sendCallsAsync({
        calls,
        capabilities: { merchantUrl: MERCHANT_URL } as never,
      })

      await waitForCallsStatus(config, { id })
    } finally {
      setIsPending(false)
    }
  }

  return { deposit, isPending }
}
