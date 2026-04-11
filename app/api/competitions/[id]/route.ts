import { NextRequest, NextResponse } from "next/server";
import { dbConnect } from "@/lib/mongodb";
import { Competition } from "@/models/Competition";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/competitions/[id]
 * Competition detail — returns all participants and winners.
 */
export async function GET(_req: Request, props: RouteContext) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, {  status: 401 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const { id } = await props.params;

        const competition = await Competition.findById(id).lean();

        if (!competition) return NextResponse.json({ error: "Not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        if (session.user.role !== "superadmin" && (competition as any).poolId !== session.user.poolId) {
            return NextResponse.json({ error: "Forbidden" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        return NextResponse.json(competition, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[GET /api/competitions/[id]]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}

/**
 * PATCH /api/competitions/[id]
 * Update competition — mark complete, add participant, add winner, update scores.
 * Body: { isCompleted?, participant?, winner?, notes? }
 */
export async function PATCH(req: Request, props: RouteContext) {
    try {
        await dbConnect();

        const session = await getServerSession(authOptions);
        if (!session?.user || !["admin", "superadmin"].includes(session.user.role)) {
            return NextResponse.json({ error: "Admin only" }, {  status: 403 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const { id } = await props.params;
        const body = await req.json();

        const competition = await Competition.findById(id).lean();
        if (!competition) return NextResponse.json({ error: "Not found" }, {  status: 404 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });

        const updates: Record<string, unknown> = {};

        if (typeof body.isCompleted === "boolean") updates.isCompleted = body.isCompleted;
        if (body.notes !== undefined) updates.notes = body.notes;

        // Add participant
        if (body.participant) {
            const { name, memberId, laneNumber } = body.participant;
            if (!name) return NextResponse.json({ error: "participant.name required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            await Competition.findByIdAndUpdate(id, {
                $push: {
                    participants: {
                        name,
                        memberId: memberId ? new mongoose.Types.ObjectId(memberId) : undefined,
                        laneNumber: laneNumber ?? undefined,
                    },
                },
            });
            return NextResponse.json({ message: "Participant added" }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Add / update winner
        if (body.winner) {
            const { position, name, memberId, timing, prize } = body.winner;
            if (!position || !name) return NextResponse.json({ error: "winner.position and winner.name required" }, {  status: 400 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
            // Remove any existing winner at this position, then push new
            await Competition.findByIdAndUpdate(id, { $pull: { winners: { position } } });
            await Competition.findByIdAndUpdate(id, {
                $push: {
                    winners: {
                        position,
                        name,
                        memberId: memberId ? new mongoose.Types.ObjectId(memberId) : undefined,
                        timing:   timing  ?? undefined,
                        prize:    prize   ?? undefined,
                    },
                },
            });
            return NextResponse.json({ message: "Winner recorded" }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        // Update participant timing / position
        if (body.participantUpdate) {
            const { participantId, timing, position } = body.participantUpdate;
            const setObj: Record<string, unknown> = {};
            if (timing !== undefined)   setObj["participants.$.timing"]   = timing;
            if (position !== undefined) setObj["participants.$.position"] = position;
            await Competition.findOneAndUpdate(
                { _id: id, "participants._id": new mongoose.Types.ObjectId(participantId) },
                { $set: setObj }
            );
            return NextResponse.json({ message: "Participant updated" }, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
        }

        const updated = await Competition.findByIdAndUpdate(id, { $set: updates }, { returnDocument: 'after' });
        return NextResponse.json(updated, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    } catch (error) {
        console.error("[PATCH /api/competitions/[id]]", error);
        return NextResponse.json({ error: "Server error" }, {  status: 500 , headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" } });
    }
}
