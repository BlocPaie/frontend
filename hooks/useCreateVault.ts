import { useState } from 'react'
import { useSendCalls, useConfig } from 'wagmi'
import { waitForCallsStatus } from '@wagmi/core'
import { encodeFunctionData, parseEventLogs } from 'viem'
import VaultFactoryABI from '@/lib/abis/VaultFactory.json'
import { VAULT_FACTORY_ADDRESS, ERC20_VAULT_TYPE, USDC_ADDRESS } from '@/lib/constants'
import { getToken, getCompanyId } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL

export function useCreateVault() {
  const { sendCallsAsync } = useSendCalls()
  const config = useConfig()
  // Track the full operation (passkey → confirmation → backend) not just sendCallsAsync
  const [isPending, setIsPending] = useState(false)

  async function createERC20Vault() {
    setIsPending(true)
    try {
      const calldata = encodeFunctionData({
        abi: VaultFactoryABI,
        functionName: 'createVault',
        args: [ERC20_VAULT_TYPE, USDC_ADDRESS],
      })

      // 1. Submit via wallet_sendCalls with merchantUrl capability for gas sponsorship
      const { id } = await sendCallsAsync({
        calls: [{ to: VAULT_FACTORY_ADDRESS, data: calldata }],
        capabilities: {
          merchantUrl: process.env.NEXT_PUBLIC_MERCHANT_URL ?? '/api/porto/merchant',
        } as never,
      })

      // 2. Poll until the bundle is confirmed
      const result = await waitForCallsStatus(config, { id })

      const receipt = result.receipts?.[0]
      if (!receipt) throw new Error('No receipt in call bundle result')

      // 3. Parse VaultCreated event from receipt logs
      const logs = parseEventLogs({
        abi: VaultFactoryABI,
        eventName: 'VaultCreated',
        logs: receipt.logs as never[],
      })
      if (!logs.length) throw new Error('VaultCreated event not found in receipt')
      const vaultAddress = (logs[0] as unknown as { args: { vault: `0x${string}` } }).args.vault
      const blockNumber = Number(receipt.blockNumber)

      // 4. Register vault in backend
      const res = await fetch(`${API}/api/registry/vaults`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          companyId: getCompanyId(),
          vaultAddress,
          vaultType: 'erc20',
          tokenAddress: USDC_ADDRESS,
          deployedAtBlock: blockNumber,
        }),
      })
      if (!res.ok) {
        const body = await res.json()
        throw new Error(body?.error?.message ?? 'Failed to register vault')
      }

      return { vaultAddress, blockNumber, txHash: receipt.transactionHash }
    } finally {
      setIsPending(false)
    }
  }

  return { createERC20Vault, isPending }
}
