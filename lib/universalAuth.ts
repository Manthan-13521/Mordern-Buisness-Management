import { getServerSession as nextAuthGetServerSession, Session } from "next-auth";
import { getToken as nextAuthGetToken, JWT } from "next-auth/jwt";
import { headers } from "next/headers";
import { jwtVerify } from "jose";

/**
 * Checks for a custom JWT Bearer token used for internal testing/SaaS bots.
 * This completely bypasses CSRF and Cookie requirements for automated node.js scripts.
 */
async function verifyBearerToken(): Promise<any | null> {
    try {
        const headersList = headers();
        const authHeader = headersList.get("authorization");

        if (authHeader && authHeader.startsWith("Bearer ")) {
            const tokenStr = authHeader.substring(7); // "Bearer ".length
            
            const secret = process.env.JWT_SECRET;
            if (!secret) return null;

            const encodedSecret = new TextEncoder().encode(secret);
            const { payload } = await jwtVerify(tokenStr, encodedSecret);
            
            return payload; // This matches NextAuth internal Token structure
        }
    } catch (e) {
        console.error("[UniversalAuth] Invalid JWT Bearer token received.", e);
    }
    
    return null;
}

/**
 * Drop-in replacement for next-auth `getServerSession`.
 * First checks for our pure JWT token, then falls back to cookie-based NextAuth.
 */
export async function getServerSession(...args: any[]): Promise<Session | null> {
    const bearerPayload = await verifyBearerToken();
    
    if (bearerPayload) {
        const expiresDate = new Date();
        expiresDate.setHours(expiresDate.getHours() + 1); // Mock 1h expiry

        return {
            user: {
                ...bearerPayload
            },
            expires: expiresDate.toISOString()
        } as Session;
    }

    // Fallback to native NextAuth behavior
    return await nextAuthGetServerSession(...(args as [any, any]));
}

/**
 * Drop-in replacement for next-auth/jwt `getToken`.
 * First checks for our pure JWT token, then falls back to cookie-based NextAuth.
 */
export async function getToken(params: any): Promise<any | null> {
    const bearerPayload = await verifyBearerToken();
    
    if (bearerPayload) {
        // We ensure that the returned item conforms to NextAuth's token usage.
        return bearerPayload;
    }

    // Fallback to native NextAuth behavior
    return await nextAuthGetToken(params);
}
