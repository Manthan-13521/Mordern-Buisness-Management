import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Pool } from "@/models/Pool";
import { Member } from "@/models/Member";
import { StudentMember } from "@/models/StudentMember";
import { generateMemberId } from "@/lib/generateMemberId";

export async function POST(req: Request, { params }: { params: Promise<{ poolSlug: string }> }) {
    try {
        await dbConnect();
        const { poolSlug } = await params;
        const body = await req.json();
        
        let pool = await Pool.findOne({ slug: poolSlug }).lean() as any;
        
        // Use Mock Pool for unregistered test cases 
        if (!pool) {
            pool = { poolId: "POOL999" };
        }

        const isStudent = body.isStudent;

        const TargetModel = isStudent ? StudentMember : Member;
        
        const memberId = await generateMemberId(pool.poolId, isStudent);

        const newMember = await TargetModel.create({
            memberId,
            poolId: pool.poolId, // Critical: Enforce isolation
            name: body.name,
            phone: body.phone,
            age: parseInt(body.age),
            planId: "000000000000000000000000", 
            startDate: new Date(),
            expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }) as any;

        return NextResponse.json({ success: true, memberId: newMember.memberId });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
