// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _instance: any | null = null

function waitForRelayerSDK(timeoutMs = 15_000): Promise<void> {
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).relayerSDK) return resolve()
    console.log('[fhevm] waiting for window.relayerSDK...')
    const timer = setTimeout(() => {
      clearInterval(interval)
      reject(new Error('Zama SDK CDN script did not load within 15 s. Check network.'))
    }, timeoutMs)
    const interval = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).relayerSDK) { clearInterval(interval); clearTimeout(timer); resolve() }
    }, 50)
  })
}

export async function getFhevmInstance() {
  if (!_instance) {
    // Wait for the UMD CDN script (loaded in layout.tsx) to set window.relayerSDK
    await waitForRelayerSDK()
    console.log('[fhevm] window.relayerSDK ready, calling initSDK...')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { initSDK, createInstance, SepoliaConfig } = (window as any).relayerSDK
    await initSDK()
    console.log('[fhevm] initSDK done, creating instance...')
    _instance = await createInstance({
      ...SepoliaConfig,
      network: process.env.NEXT_PUBLIC_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com',
    })
    console.log('[fhevm] instance created')
  }
  return _instance
}
