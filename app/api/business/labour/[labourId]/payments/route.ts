import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { dbConnect } from "@/lib/mongodb";
import { BusinessLabourPayment } from "@/models/BusinessLabourPayment";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ labourId: string }> }) {
    try {
        const session = await getServerSession(authOptions);
        if (!session || session.user.role !== "business_admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { labourId } = await params;
        const body = await req.json();
        const { amount, date, notes, paymentType } = body;

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "Invalid payment amount" }, { status: 400 });
        }

        await dbConnect();
        const businessId = session.user.businessId;

        const payment = new BusinessLabourPayment({
            labourId,
            businessId,
            amount,
            paymentType: paymentType || "paid",
            date: date ? new Date(date) : new Date(),
            notes
        });

        await payment.save();

        return NextResponse.json({ success: true, payment }, {
            headers: { "Cache-Control": "no-store, no-cache, must-revalidate, private" }
        });
    } catch (error) {
        console.error("Labour Payment Error:", error);
        return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
    }
}
