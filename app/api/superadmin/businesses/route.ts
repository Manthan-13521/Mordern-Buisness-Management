import { NextResponse } from "next/server";
import { resolveUser, AuthUser } from "@/lib/authHelper";
import { dbConnect } from "@/lib/mongodb";
import { Business } from "@/models/Business";
import { User } from "@/models/User";
import { requestContext } from "@/lib/requestContext";

export async function GET(req: Request) {

        const requestId = req ? (req.headers.get("x-request-id") || crypto.randomUUID()) : crypto.randomUUID();
        const clientIp = req ? (req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown") : "unknown";
        const routePath = req ? new URL(req.url).pathname : "unknown";
        const requestMethod = "GET";

        return requestContext.run({
            requestId,
            ip: clientIp,
            route: routePath,
            method: requestMethod,
            startTime: Date.now()
        }, async () => {
            try {
            await dbConnect();

            const user = await resolveUser(req);
            if (!user || user.role !== "superadmin") {
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
            }

            const businesses = await Business.find({}).sort({ createdAt: -1 }).lean();

            // Fetch all business admins in a single query to avoid N+1 problem
            const businessIds = businesses.map((b: any) => b.businessId);
            const admins = await User.find({ businessId: { $in: businessIds }, role: "business_admin" })
                .select("businessId email")
                .lean();

            const adminMap = admins.reduce((acc: any, admin: any) => {
                acc[admin.businessId] = admin.email;
                return acc;
            }, {});

            // Attach the admin email to each business
            const businessesWithAdmins = businesses.map((business: any) => ({
                ...business,
                adminEmail: adminMap[business.businessId] || "No admin assigned",
            }));

            return NextResponse.json(businessesWithAdmins);
        } catch (error) {
            console.error("Fetch Businesses Error:", error);
            return NextResponse.json({ error: "Server error fetching businesses" }, { status: 500 });
        }
        });
            
}
