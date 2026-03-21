import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'

export async function savePhoto(base64: string): Promise<string> {
  const matches = base64.match(/^data:(.+);base64,(.+)$/)
  if (!matches) throw new Error('Invalid base64 image')
  
  const ext = matches[1].split('/')[1] || 'jpg'
  const buffer = Buffer.from(matches[2], 'base64')
  const filename = `${randomUUID()}.${ext}`
  
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  await fs.mkdir(uploadDir, { recursive: true })
  await fs.writeFile(path.join(uploadDir, filename), buffer)
  
  return `/uploads/${filename}`
}
