import { dbConnect } from './mongodb'
import { NextRequest, NextResponse } from 'next/server'

type Handler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse>

export function withDB(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      await dbConnect()
      return await handler(req, ctx)
    } catch (err: any) {
      console.error('[DB Error]', err)

      // Mongoose validation failed — bad input from client
      if (err.name === 'ValidationError') {
        return NextResponse.json(
          { error: 'Validation failed', details: err.message },
          { status: 400 }
        )
      }

      // MongoDB duplicate key (e.g. unique memberId conflict)
      if (err.code === 11000) {
        const field = err.keyPattern ? Object.keys(err.keyPattern)[0] : 'field'
        return NextResponse.json(
          { error: `Duplicate entry`, field },
          { status: 409 }
        )
      }

      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
  }
}
