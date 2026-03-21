import { Counter } from '@/models/Counter'

export async function generateMemberId(isEntertainment: boolean = false): Promise<string> {
  const counterId = isEntertainment ? 'entertainmentMemberId' : 'memberId'
  const prefix = isEntertainment ? 'MS' : 'M'

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  )
  
  return `${prefix}${String(counter.seq).padStart(4, '0')}` // M0001, M0002...
}
