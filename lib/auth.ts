const JWT_KEY = 'blocpaie_jwt'
const COMPANY_ID_KEY = 'blocpaie_company_id'
const CONTRACTOR_ID_KEY = 'blocpaie_contractor_id'
const VAULT_TYPE_KEY = 'blocpaie_vault_type'

function ss(): Storage | null {
  if (typeof window === 'undefined') return null
  return sessionStorage
}

export function storeCompanyId(id: string) {
  ss()?.setItem(COMPANY_ID_KEY, id)
}

export function getCompanyId(): string | null {
  return ss()?.getItem(COMPANY_ID_KEY) ?? null
}

export function storeContractorId(id: string) {
  ss()?.setItem(CONTRACTOR_ID_KEY, id)
}

export function getContractorId(): string | null {
  return ss()?.getItem(CONTRACTOR_ID_KEY) ?? null
}

export function storeVaultType(type: 'erc20' | 'confidential') {
  ss()?.setItem(VAULT_TYPE_KEY, type)
}

export function getVaultType(): 'erc20' | 'confidential' | null {
  const v = ss()?.getItem(VAULT_TYPE_KEY)
  if (v === 'erc20' || v === 'confidential') return v
  return null
}

export function storeToken(token: string) {
  ss()?.setItem(JWT_KEY, token)
}

export function getToken(): string | null {
  return ss()?.getItem(JWT_KEY) ?? null
}

export function clearToken() {
  ss()?.removeItem(JWT_KEY)
}

export async function issueToken(portoAccountAddress: string, role: 'company' | 'contractor') {
  const res = await fetch('/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ portoAccountAddress, role }),
  })
  if (!res.ok) throw new Error('Failed to issue token')
  const { token } = await res.json()
  storeToken(token)
  return token
}
