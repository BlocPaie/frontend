import { useState, useEffect } from 'react'
import { useAccount, useConfig, useSendCalls } from 'wagmi'
import { readContract, waitForCallsStatus } from '@wagmi/core'
import { encodeFunctionData } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import ConfidentialVaultABI from '@/lib/abis/ConfidentialVault.json'
import { getFhevmInstance } from '@/lib/fhevm'

const MERCHANT_URL = process.env.NEXT_PUBLIC_MERCHANT_URL ?? '/api/porto/merchant'

export function useConfidentialVaultBalance(vaultAddress: `0x${string}` | null) {
  const { address } = useAccount()
  const config = useConfig()
  const { sendCallsAsync } = useSendCalls()

  const [totalBalance, setTotalBalance] = useState<number | null>(null)
  const [allocatedBalance, setAllocatedBalance] = useState<number | null>(null)
  const [decrypting, setDecrypting] = useState(false)
  const [error, setError] = useState('')

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
      // 1. Generate ephemeral secp256k1 key — lives in memory only, discarded after use.
      //    Never stored anywhere; each decrypt session uses a fresh key.
      const secp256k1Key = generatePrivateKey()
      const decryptAccount = privateKeyToAccount(secp256k1Key)

      // 2. Grant the ephemeral address ACL access on the current encrypted handles.
      //    One Porto passkey tap — required because Porto signs with WebAuthn P256
      //    which Zama's ECDSA recovery cannot validate.
      //    Use sendCalls so the merchant route sponsors the gas.
      const { id } = await sendCallsAsync({
        calls: [{
          to: vaultAddress,
          data: encodeFunctionData({
            abi: ConfidentialVaultABI,
            functionName: 'grantDecryptAccess',
            args: [decryptAccount.address],
          }),
        }],
        capabilities: { merchantUrl: MERCHANT_URL } as never,
      })
      await waitForCallsStatus(config, { id })

      // 3. Read both encrypted handles from the contract
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

      // 4. Initialise Zama SDK, generate ephemeral NaCl keypair for re-encryption
      const instance = await getFhevmInstance()
      const { publicKey, privateKey } = instance.generateKeypair()
      const startTimestamp = Math.floor(Date.now() / 1000)
      const durationDays = 10

      // 5. Sign EIP-712 locally with the secp256k1 key — no Porto dialog, no passkey
      const eip712 = instance.createEIP712(publicKey, [vaultAddress], startTimestamp, durationDays)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawSig = await decryptAccount.signTypedData({
        domain: eip712.domain,
        types: { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        primaryType: 'UserDecryptRequestVerification',
        message: eip712.message,
      } as any)
      const signature = rawSig.replace('0x', '')

      // 6. Zama KMS decryption — userAddress is the ephemeral secp256k1 address
      const results = await instance.userDecrypt(
        [
          { handle: balHandle, contractAddress: vaultAddress },
          { handle: allocBal, contractAddress: vaultAddress },
        ],
        privateKey,
        publicKey,
        signature,
        [vaultAddress],
        decryptAccount.address,
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
