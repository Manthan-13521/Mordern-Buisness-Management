import { uploadToCloudinary } from './cloudinary'
import { randomUUID } from 'crypto'

export async function savePhoto(base64: string): Promise<string> {
  const filename = randomUUID()
  return await uploadToCloudinary(base64, 'photos', filename)
}
