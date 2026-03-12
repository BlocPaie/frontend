import { createConfig, http } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { porto } from 'porto/wagmi'

export const wagmiConfig = createConfig({
  chains: [sepolia],
  ssr: true,
  connectors: typeof window !== 'undefined'
    ? [porto({ merchantUrl: process.env.NEXT_PUBLIC_MERCHANT_URL ?? '/api/porto/merchant' })]
    : [],
  transports: {
    [sepolia.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com',
    ),
  },
})
