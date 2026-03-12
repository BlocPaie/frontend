import type { Address } from 'viem'

// Deployed on Ethereum Sepolia
export const VAULT_FACTORY_ADDRESS: Address = '0xd15869825E6dc8A8496c837F5e7B3e67Afed88BF'
export const USDC_ADDRESS: Address = '0x973cF403808895056beD3308ddf52B9C2aa6F81b'

// keccak256("ERC20Vault") — registered in VaultFactory on deploy
export const ERC20_VAULT_TYPE = '0x874a5851062fb0ceba9892d93f766528d36b7886c5658869993f9154a34b5863' as const
