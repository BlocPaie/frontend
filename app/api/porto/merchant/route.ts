import { Route } from 'porto/server'

const handler = Route.merchant({
  address: process.env.MERCHANT_ADDRESS as `0x${string}`,
  key: process.env.MERCHANT_PRIVATE_KEY as `0x${string}`,
  basePath: '/api/porto/merchant',
  sponsor() {
    return true
  },
})

// Forward GET, POST, and OPTIONS to the Porto Hono handler.
// Porto's built-in cors middleware handles preflight and CORS headers.
export async function GET(request: Request) { return handler.fetch(request) }
export async function POST(request: Request) { return handler.fetch(request) }
export async function OPTIONS(request: Request) { return handler.fetch(request) }
