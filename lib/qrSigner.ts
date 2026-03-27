import { SignJWT, jwtVerify } from 'jose'

function getSigningSecret(): Uint8Array {
  const secret = process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error('[Security] NEXTAUTH_SECRET must be set for QR token signing.')
  }
  return new TextEncoder().encode(secret)
}

export async function signQRToken(memberId: string): Promise<string> {
  return new SignJWT({ memberId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h') // 8 hour expiration to prevent copied QR codes from living forever
    .sign(getSigningSecret())
}

export async function verifyQRToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, getSigningSecret())
    return payload.memberId as string
  } catch {
    return null
  }
}
