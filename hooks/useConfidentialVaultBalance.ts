import { useState, useEffect } from 'react'
import { useAccount, useConfig } from 'wagmi'
import { readContract } from '@wagmi/core'
import ConfidentialVaultABI from '@/lib/abis/ConfidentialVault.json'
import { getFhevmInstance } from '@/lib/fhevm'

export function useConfidentialVaultBalance(vaultAddress: `0x${string}` | null) {
  const { address } = useAccount()
  const config = useConfig()

  const [totalBalance, setTotalBalance] = useState<number | null>(null)
  const [allocatedBalance, setAllocatedBalance] = useState<number | null>(null)
  const [decrypting, setDecrypting] = useState(false)
  const [error, setError] = useState('')

  // Clear cached values when vault address changes
  useEffect(() => {
    setTotalBalance(null)
    setAllocatedBalance(null)
    setError('')
  }, [vaultAddress])

  const decrypt = async () => {
    if (!vaultAddress || !address) return
    setDecrypting(true)
    setError('')
    try {
      // 1. Read both encrypted handles from the contract
      const [vaultBalHandle, allocHandle] = await Promise.all([
        readContract(config, {
          address: vaultAddress,
          abi: ConfidentialVaultABI as never[],
          functionName: 'getVaultBalance',
        }),
        readContract(config, {
          address: vaultAddress,
          abi: ConfidentialVaultABI as never[],
          functionName: 'getAllocatedBalance',
        }),
      ])

      const balHandle = vaultBalHandle as `0x${string}`
      const allocBal = allocHandle as `0x${string}`

      // 2. Initialise SDK, generate a fresh ephemeral keypair
      const instance = await getFhevmInstance()
      const { publicKey, privateKey } = instance.generateKeypair()
      const startTimestamp = Math.floor(Date.now() / 1000)
      const durationDays = 10

      // 3. Build EIP-712 typed data
      const eip712 = instance.createEIP712(publicKey, [vaultAddress], startTimestamp, durationDays)

      // 4. Sign via Porto's raw EIP-1193 provider directly
      //    wagmi's walletClient wraps Porto and returns a 4036-char WebAuthn P256 blob.
      //    The connector's getProvider() returns Porto's own provider which should give
      //    a standard secp256k1 signature.
      const portoConnector = config.connectors.find(c => c.id === 'xyz.ithaca.porto')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const portoProvider = await (portoConnector as any).getProvider()
      const typedData = {
        domain: eip712.domain,
        types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        primaryType: 'UserDecryptRequestVerification',
        message: eip712.message,
      }
      const rawSig = await portoProvider.request({
        method: 'eth_signTypedData_v4',
        params: [address, JSON.stringify(typedData, (_, v) => typeof v === 'bigint' ? v.toString() : v)],
      }) as `0x${string}`
      console.log('[decrypt] rawSig length:', rawSig.length, '(expect 132 for secp256k1)')
      // Zama relayer expects signature without 0x prefix
      const signature = rawSig.replace('0x', '')

      // 5. KMS decryption — both handles decrypted in one round-trip
      const results = await instance.userDecrypt(
        [
          { handle: balHandle, contractAddress: vaultAddress },
          { handle: allocBal, contractAddress: vaultAddress },
        ],
        privateKey,
        publicKey,
        signature,
        [vaultAddress],
        address,
        startTimestamp,
        durationDays,
      )

      setTotalBalance(Number(results[balHandle] as bigint) / 1_000_000)
      setAllocatedBalance(Number(results[allocBal] as bigint) / 1_000_000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Decryption failed. Please try again.')
    } finally {
      setDecrypting(false)
    }
  }

  return { totalBalance, allocatedBalance, decrypting, error, decrypt }
}
