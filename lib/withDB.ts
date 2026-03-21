import { dbConnect } from './mongodb'
import { NextRequest, NextResponse } from 'next/server'

type Handler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse>

export function withDB(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      await dbConnect()
      return await handler(req, ctx)
    } catch (err) {
      console.error('[DB Error]', err)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  }
}
