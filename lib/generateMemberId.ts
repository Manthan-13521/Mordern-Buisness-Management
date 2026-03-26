import { Counter } from '@/models/Counter'
import { Member } from '@/models/Member'
import { EntertainmentMember } from '@/models/EntertainmentMember'

export async function generateMemberId(poolId: string, isEntertainment: boolean = false): Promise<string> {
  const counterId = isEntertainment ? `entertainmentMemberId_${poolId}` : `memberId_${poolId}`
  const prefix = isEntertainment ? 'MS' : 'M'

  // Check if a counter already exists for this pool
  const existing = await Counter.findById(counterId)

  if (!existing) {
    // Counter doesn't exist yet — seed it from the highest existing ID in this pool
    // so we never collide with pre-existing members
    const Model = isEntertainment ? EntertainmentMember : Member
    const lastMember = await (Model as any)
      .findOne({ poolId, memberId: { $regex: `^${prefix}\\d+$` } })
      .sort({ memberId: -1 })
      .select('memberId')
      .lean()

    let startSeq = 0
    if (lastMember?.memberId) {
      const num = parseInt(lastMember.memberId.replace(prefix, ''), 10)
      if (!isNaN(num)) startSeq = num
    }

    // Create counter seeded at current max so next increment is max+1
    await Counter.create({ _id: counterId, seq: startSeq })
  }

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true }
  )

  return `${prefix}${String(counter.seq).padStart(4, '0')}` // M0001, M0002...
}
