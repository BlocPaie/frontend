// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _instance: any | null = null

function waitForRelayerSDK(): Promise<void> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).relayerSDK) return resolve()
    const interval = setInterval(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((window as any).relayerSDK) { clearInterval(interval); resolve() }
    }, 50)
  })
}

export async function getFhevmInstance() {
  if (!_instance) {
    // Wait for the UMD CDN script (loaded in layout.tsx) to set window.relayerSDK
    await waitForRelayerSDK()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { initSDK, createInstance, SepoliaConfig } = (window as any).relayerSDK
    await initSDK()
    _instance = await createInstance({
      ...SepoliaConfig,
      network: process.env.NEXT_PUBLIC_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com',
    })
  }
  return _instance
}
