import { useState, useEffect } from 'react'
import { useAccount, useSignTypedData, useConfig } from 'wagmi'
import { readContract } from '@wagmi/core'
import ConfidentialVaultABI from '@/lib/abis/ConfidentialVault.json'
import { getFhevmInstance } from '@/lib/fhevm'

export function useConfidentialVaultBalance(vaultAddress: `0x${string}` | null) {
  const { address } = useAccount()
  const { signTypedDataAsync } = useSignTypedData()
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

      // 3. Build EIP-712 and sign with passkey — one tap covers both handles
      // Must pass only UserDecryptRequestVerification type (not full eip712.types)
      // to match what the Zama relayer expects — mirrors the SDK's own signer.signTypedData call
      const eip712 = instance.createEIP712(publicKey, [vaultAddress], startTimestamp, durationDays)
      const rawSig = await signTypedDataAsync({
        domain: eip712.domain,
        types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        primaryType: 'UserDecryptRequestVerification',
        message: eip712.message,
      } as never)
      // Zama relayer expects signature without 0x prefix
      const signature = rawSig.replace('0x', '')

      // 4. KMS decryption — both handles decrypted in one round-trip
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
