import { useState } from 'react'
import { useAccount, useSendCalls, useConfig } from 'wagmi'
import { readContract, waitForCallsStatus } from '@wagmi/core'
import { encodeFunctionData, toHex } from 'viem'
import ERC20ABI from '@/lib/abis/ERC20.json'
import ConfidentialUSDCABI from '@/lib/abis/ConfidentialUSDC.json'
import ConfidentialVaultABI from '@/lib/abis/ConfidentialVault.json'
import { USDC_ADDRESS, CONFIDENTIAL_USDC_ADDRESS } from '@/lib/constants'
import { getFhevmInstance } from '@/lib/fhevm'

const MERCHANT_URL = process.env.NEXT_PUBLIC_MERCHANT_URL ?? '/api/porto/merchant'
const MAX_UINT48 = BigInt('281474976710655')

export function useConfidentialVaultDeposit(vaultAddress: `0x${string}` | null) {
  const { address } = useAccount()
  const { sendCallsAsync } = useSendCalls()
  const config = useConfig()
  const [isPending, setIsPending] = useState(false)

  async function deposit(amountUsd: number) {
    if (!vaultAddress || !address) throw new Error('No vault or wallet connected')
    setIsPending(true)
    try {
      const amountScaled = BigInt(Math.round(amountUsd * 1_000_000))

      // 1. Check USDC allowance to cUSDC contract
      const allowance = await readContract(config, {
        address: USDC_ADDRESS,
        abi: ERC20ABI as never[],
        functionName: 'allowance',
        args: [address, CONFIDENTIAL_USDC_ADDRESS],
      }) as bigint

      // 2. Check if vault is already an operator on cUSDC (authorised to pull cUSDC from company)
      const operatorSet = await readContract(config, {
        address: CONFIDENTIAL_USDC_ADDRESS,
        abi: ConfidentialUSDCABI as never[],
        functionName: 'isOperator',
        args: [address, vaultAddress],
      }) as boolean

      // 3. Encrypt the deposit amount — proof is bound to (vaultAddress, address)
      const instance = await getFhevmInstance()
      const encInput = instance.createEncryptedInput(vaultAddress, address)
      encInput.add64(amountScaled)
      const { handles, inputProof } = await encInput.encrypt()

      // 4. Build call bundle (up to 4 calls)
      const calls: { to: `0x${string}`; data: `0x${string}` }[] = []

      if (allowance < amountScaled) {
        calls.push({
          to: USDC_ADDRESS,
          data: encodeFunctionData({
            abi: ERC20ABI,
            functionName: 'approve',
            args: [CONFIDENTIAL_USDC_ADDRESS, amountScaled],
          }),
        })
      }

      // wrap(to, amount) — pulls USDC from company, mints cUSDC to company 1:1
      calls.push({
        to: CONFIDENTIAL_USDC_ADDRESS,
        data: encodeFunctionData({
          abi: ConfidentialUSDCABI,
          functionName: 'wrap',
          args: [address, amountScaled],
        }),
      })

      if (!operatorSet) {
        calls.push({
          to: CONFIDENTIAL_USDC_ADDRESS,
          data: encodeFunctionData({
            abi: ConfidentialUSDCABI,
            functionName: 'setOperator',
            args: [vaultAddress, MAX_UINT48],
          }),
        })
      }

      // depositFunds — vault pulls cUSDC from company via confidentialTransferFrom
      calls.push({
        to: vaultAddress,
        data: encodeFunctionData({
          abi: ConfidentialVaultABI,
          functionName: 'depositFunds',
          args: [toHex(handles[0], { size: 32 }), toHex(inputProof)],
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
