import { useEffect, useState } from 'react'
import { useReadContracts } from 'wagmi'
import { formatUnits } from 'viem'
import ERC20VaultABI from '@/lib/abis/ERC20Vault.json'
import ERC20ABI from '@/lib/abis/ERC20.json'
import { USDC_ADDRESS } from '@/lib/constants'
import { getToken, getCompanyId } from '@/lib/auth'

const API = process.env.NEXT_PUBLIC_API_URL

export function useVaultBalance() {
  const [vaultAddress, setVaultAddress] = useState<`0x${string}` | null>(null)
  const [vaultType, setVaultType] = useState<string | null>(null)
  const [vaultId, setVaultId] = useState<string | null>(null)
  const [loadingVault, setLoadingVault] = useState(true)

  useEffect(() => {
    const companyId = getCompanyId()
    if (!companyId) { setLoadingVault(false); return }

    fetch(`${API}/api/registry/companies/${companyId}/vaults`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => r.json())
      .then(body => {
        const vault = body.data?.[0]
        if (vault) {
          setVaultAddress(vault.vaultAddress as `0x${string}`)
          setVaultType(vault.vaultType)
          setVaultId(vault._id)
        }
      })
      .catch(() => {})
      .finally(() => setLoadingVault(false))
  }, [])

  const { data, refetch: refetchBalances } = useReadContracts({
    contracts: vaultAddress
      ? [
          {
            address: USDC_ADDRESS,
            abi: ERC20ABI as never[],
            functionName: 'balanceOf',
            args: [vaultAddress],
          },
          {
            address: vaultAddress,
            abi: ERC20VaultABI as never[],
            functionName: 'allocatedBalance',
          },
        ]
      : [],
    query: { enabled: !!vaultAddress },
  })

  const balances = data as Array<{ result?: unknown }> | undefined

  const totalBalance =
    balances?.[0]?.result != null
      ? Number(formatUnits(balances[0].result as bigint, 6))
      : null

  const allocatedBalance =
    balances?.[1]?.result != null
      ? Number(formatUnits(balances[1].result as bigint, 6))
      : null

  return {
    vaultAddress,
    vaultType,
    vaultId,
    totalBalance,
    allocatedBalance,
    loading: loadingVault,
    refetchBalances,
  }
}
