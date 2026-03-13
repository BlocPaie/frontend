// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _instance: any | null = null

export async function getFhevmInstance() {
  if (!_instance) {
    // Use the bundle subpath: initSDK() fetches WASM from Zama's CDN at runtime
    // so the bundler never processes the WASM file during next build
    const { initSDK, createInstance, SepoliaConfig } = await import('@zama-fhe/relayer-sdk/bundle')
    await initSDK()
    _instance = await createInstance({
      ...SepoliaConfig,
      network: process.env.NEXT_PUBLIC_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com',
    })
  }
  return _instance
}
