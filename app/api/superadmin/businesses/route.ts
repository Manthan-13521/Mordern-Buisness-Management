import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { User } from "@/models/User";


export async function GET(req: Request) {
    try {
        await dbConnect();

        const user = await resolveUser(req);
        if (!user || user.role !== "superadmin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const businesses = await Business.find({}).sort({ createdAt: -1 }).lean();

        // For each business, let's attach the admin email
        const businessesWithAdmins = await Promise.all(
            businesses.map(async (business: any) => {
                const admin = await User.findOne({ businessId: business.businessId, role: "business_admin" }).select("email").lean();
                return {
                    ...business,
                    adminEmail: admin?.email || "No admin assigned",
                };
            })
        );

        return NextResponse.json(businessesWithAdmins);
    } catch (error) {
        console.error("Fetch Businesses Error:", error);
        return NextResponse.json({ error: "Server error fetching businesses" }, { status: 500 });
    }
}
