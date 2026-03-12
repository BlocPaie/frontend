import { SignJWT } from 'jose'
import { NextResponse } from 'next/server'

const secret = new TextEncoder().encode(process.env.JWT_SECRET)

export async function POST(request: Request) {
  const { portoAccountAddress, role } = await request.json()

  if (!portoAccountAddress || !role) {
    return NextResponse.json({ error: 'Missing portoAccountAddress or role' }, { status: 400 })
  }

  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(portoAccountAddress)
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(secret)

  return NextResponse.json({ token })
}
