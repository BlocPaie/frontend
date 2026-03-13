import { keccak256, encodeAbiParameters, parseAbiParameters } from 'viem'

// Generates a MongoDB-compatible ObjectId (24-char hex) client-side.
export function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, '0')
  const random = Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0')).join('')
  return timestamp + random
}

// Matches backend's computeInvoiceHash in backend/src/utils/hash.ts exactly:
// keccak256(abi.encode(invoiceId, companyId, contractorId, amount, currency, timestamp))
export function computeInvoiceHash(
  invoiceId: string,
  companyId: string,
  contractorId: string,
  amount: string,
  issuedAt: Date,
): `0x${string}` {
  const timestamp = BigInt(Math.floor(issuedAt.getTime() / 1000))
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters('string, string, string, string, string, uint256'),
      [invoiceId, companyId, contractorId, amount, 'USDC', timestamp]
    )
  )
}
