import { createInstance, SepoliaConfig, type FhevmInstance } from '@zama-fhe/relayer-sdk/web'

let _instance: FhevmInstance | null = null

export async function getFhevmInstance(): Promise<FhevmInstance> {
  if (!_instance) {
    _instance = await createInstance({
      ...SepoliaConfig,
      network: process.env.NEXT_PUBLIC_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com',
    })
  }
  return _instance
}
