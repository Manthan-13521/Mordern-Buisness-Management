import { SignJWT, jwtVerify } from 'jose'

export async function signQRToken(memberId: string): Promise<string> {
  const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback_secret_for_dev')
  return new SignJWT({ memberId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10y') // Practically unlimited, controlled by DB token versioning
    .sign(secret)
}

export async function verifyQRToken(token: string): Promise<string | null> {
  try {
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback_secret_for_dev')
    const { payload } = await jwtVerify(token, secret)
    return payload.memberId as string
  } catch {
    return null
  }
}
