import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { dbConnect } from "./mongodb";
import { User as UserModel, IUser } from "@/models/User";
import { PlatformAdmin } from "@/models/PlatformAdmin";
import { Pool } from "@/models/Pool";
import bcrypt from "bcryptjs";
import { DefaultSession } from "next-auth";
import { logger } from "./logger";

// Basic in-memory rate limiter to prevent brute force attacks (e.g. 5 attempts / 15 mins)
const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string) {
    const now = Date.now();
    const record = rateLimitMap.get(key);

    if (record) {
        if (now > record.resetAt) {
            // Expired lockout, reset
            rateLimitMap.set(key, { count: 1, resetAt: now + LOCKOUT_MINUTES * 60 * 1000 });
        } else if (record.count >= MAX_ATTEMPTS) {
            const minsLeft = Math.ceil((record.resetAt - now) / 60000);
            throw new Error(`Too many login attempts. Please try again in ${minsLeft} minutes.`);
        } else {
            record.count += 1;
        }
    } else {
        rateLimitMap.set(key, { count: 1, resetAt: now + LOCKOUT_MINUTES * 60 * 1000 });
    }
}

function clearRateLimit(key: string) {
    rateLimitMap.delete(key);
}

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: string;
            poolId?: string;
            poolSlug?: string;
            poolName?: string;
            // ── Hostel tenant fields (additive) ──
            hostelId?: string;
            hostelSlug?: string;
            hostelName?: string;
            // ── Business tenant fields (additive) ──
            businessId?: string;
            businessSlug?: string;
            businessName?: string;
            // ── Subscription fields ──
            subscriptionStatus?: "active" | "expired" | "none";
            subscriptionExpiryDate?: string | null;
        } & DefaultSession["user"];
    }
    interface User {
        role: string;
        poolId?: string;
        poolSlug?: string;
        poolName?: string;
        // ── Hostel tenant fields (additive) ──
        hostelId?: string;
        hostelSlug?: string;
        hostelName?: string;
        // ── Business tenant fields (additive) ──
        businessId?: string;
        businessSlug?: string;
        businessName?: string;
        // ── Subscription fields ──
        subscriptionStatus?: "active" | "expired" | "none";
        subscriptionExpiryDate?: string | null;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        poolId?: string;
        poolSlug?: string;
        poolName?: string;
        // ── Hostel tenant fields (additive) ──
        hostelId?: string;
        hostelSlug?: string;
        hostelName?: string;
        // ── Business tenant fields (additive) ──
        businessId?: string;
        businessSlug?: string;
        businessName?: string;
        // ── Subscription fields ──
        subscriptionStatus?: "active" | "expired" | "none";
        subscriptionExpiryDate?: string | null;
    }
}

export const authOptions: NextAuthOptions = {
    secret: (() => {
        const secret = process.env.NEXTAUTH_SECRET;
        if (!secret) {
            throw new Error(
                "[Auth] NEXTAUTH_SECRET is not set. Generate one with: openssl rand -base64 64"
            );
        }
        return secret;
    })(),
    pages: {
        signIn: "/auth/signin" // general fallback, middleware dictates exact path
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
                poolSlug: { label: "Pool Slug", type: "text" },
                isSuperAdmin: { label: "Super Admin", type: "text" }
            },
            async authorize(credentials, req) {
                if (!credentials?.username || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }

                const clientIp = (req?.headers as any)?.["x-forwarded-for"] || "unknown_ip";
                const rlKey = `${clientIp}_${credentials.username.toLowerCase()}`;
                
                checkRateLimit(rlKey);

                await dbConnect();

                if (credentials.isSuperAdmin === 'true') {
                    const platformAdmin = await PlatformAdmin.findOne({ email: credentials.username }).lean();
                    if (platformAdmin) {
                        const isMatch = await bcrypt.compare(credentials.password, platformAdmin.passwordHash);
                        if (isMatch) {
                            clearRateLimit(rlKey);
                            logger.audit({
                                type: "LOGIN_SUCCESS",
                                userId: platformAdmin._id.toString(),
                                ip: clientIp,
                                meta: { role: "superadmin" }
                            });
                            return {
                                id: platformAdmin._id.toString(),
                                name: "Super Admin",
                                email: platformAdmin.email,
                                role: "superadmin",
                            };
                        } else {
                            logger.audit({
                                type: "LOGIN_FAILED",
                                ip: clientIp,
                                meta: { role: "superadmin", email: credentials.username, reason: "invalid_password" }
                            });
                            throw new Error("Invalid password");
                        }
                    }
                    logger.audit({
                        type: "LOGIN_FAILED",
                        ip: clientIp,
                        meta: { role: "superadmin", email: credentials.username, reason: "admin_not_found" }
                    });
                    throw new Error("Super Admin not found");
                }

                // Run Pool + User lookups in parallel for speed
                const userQuery: any = {
                    $or: [
                        { email: credentials.username },
                        { name: credentials.username }
                    ]
                };

                const [pool, user] = await Promise.all([
                    credentials.poolSlug
                        ? Pool.findOne({ slug: credentials.poolSlug }).lean()
                        : Promise.resolve(null),
                    UserModel.findOne(userQuery).lean() as Promise<IUser | null>,
                ]);

                if (credentials.poolSlug && !pool) throw new Error("Pool not found");

                // Tenant isolation: if pool was specified, verify user belongs to it
                if (pool && user && user.poolId !== pool.poolId) {
                    throw new Error("Invalid credentials");
                }

                if (!user) {
                    throw new Error("Invalid credentials");
                }

                const isMatch = await bcrypt.compare(credentials.password, user.passwordHash);

                if (!isMatch) {
                    logger.audit({
                        type: "LOGIN_FAILED",
                        ip: clientIp,
                        meta: { role: user.role, poolId: user.poolId, username: credentials.username, reason: "invalid_password" }
                    });
                    throw new Error("Invalid password");
                }

                logger.audit({
                    type: "LOGIN_SUCCESS",
                    userId: user._id.toString(),
                    poolId: user.poolId,
                    ip: clientIp,
                    meta: { role: user.role }
                });

                clearRateLimit(rlKey);

                // If logged in via generic route, lookup the Pool to get the slug for session
                let effectiveSlug = credentials.poolSlug;
                let poolNameStr = pool ? (pool as any).poolName : undefined;

                if (!effectiveSlug && user.poolId) {
                    const userPool = pool || await Pool.findOne({ poolId: user.poolId }).lean();
                    if (userPool) {
                        effectiveSlug = userPool.slug;
                        poolNameStr = userPool.poolName;
                    }
                }

                // ── Compute subscription status dynamically ──
                const subExpiry = user.subscription?.expiryDate;
                const subscriptionStatus: "active" | "expired" | "none" = subExpiry
                    ? (new Date() > new Date(subExpiry) ? "expired" : "active")
                    : "none";
                const subscriptionExpiryDate = subExpiry ? new Date(subExpiry).toISOString() : null;

                // ── Hostel admin path (additive — pool flow untouched above) ──
                if (user.role === "hostel_admin" && user.hostelId) {
                    const { Hostel } = await import("@/models/Hostel");
                    const hostel = await Hostel.findOne({ hostelId: user.hostelId }).lean();
                    clearRateLimit(rlKey);
                    return {
                        id: user._id.toString(),
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        hostelId: user.hostelId,
                        hostelSlug: hostel?.slug,
                        hostelName: hostel?.hostelName,
                        subscriptionStatus,
                        subscriptionExpiryDate,
                    };
                }

                // ── Business admin path (additive) ──
                if (user.role === "business_admin" && user.businessId) {
                    const { Business } = await import("@/models/Business");
                    const business = await Business.findOne({ businessId: user.businessId }).lean();
                    clearRateLimit(rlKey);
                    return {
                        id: user._id.toString(),
                        name: user.name,
                        email: user.email,
                        role: user.role,
                        businessId: user.businessId,
                        businessSlug: business?.slug,
                        businessName: business?.name,
                        subscriptionStatus,
                        subscriptionExpiryDate,
                    };
                }

                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    poolId: user.poolId,
                    poolSlug: effectiveSlug || credentials.poolSlug,
                    poolName: poolNameStr,
                    subscriptionStatus,
                    subscriptionExpiryDate,
                };
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user, trigger, session }) {
            if (user) {
                token.id = user.id;
                token.role = user.role;
                if (user.poolId) token.poolId = user.poolId;
                if (user.poolSlug) token.poolSlug = user.poolSlug;
                if (user.poolName) token.poolName = user.poolName;
                // ── Hostel fields (additive) ──
                if (user.hostelId) token.hostelId = user.hostelId;
                if (user.hostelSlug) token.hostelSlug = user.hostelSlug;
                if (user.hostelName) token.hostelName = user.hostelName;
                // ── Business fields (additive) ──
                if (user.businessId) token.businessId = user.businessId;
                if (user.businessSlug) token.businessSlug = user.businessSlug;
                if (user.businessName) token.businessName = user.businessName;
                // ── Subscription fields ──
                token.subscriptionStatus = user.subscriptionStatus ?? "none";
                token.subscriptionExpiryDate = user.subscriptionExpiryDate ?? null;
            }
            if (trigger === "update" && session) {
                 token = { ...token, ...session };
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.role = token.role;
                if (token.poolId) session.user.poolId = token.poolId;
                if (token.poolSlug) session.user.poolSlug = token.poolSlug;
                if (token.poolName) session.user.poolName = token.poolName;
                // ── Hostel fields (additive) ──
                if (token.hostelId) session.user.hostelId = token.hostelId;
                if (token.hostelSlug) session.user.hostelSlug = token.hostelSlug;
                if (token.hostelName) session.user.hostelName = token.hostelName;
                // ── Business fields (additive) ──
                if (token.businessId) session.user.businessId = token.businessId;
                if (token.businessSlug) session.user.businessSlug = token.businessSlug;
                if (token.businessName) session.user.businessName = token.businessName;
                // ── Subscription fields ──
                session.user.subscriptionStatus = token.subscriptionStatus ?? "none";
                session.user.subscriptionExpiryDate = token.subscriptionExpiryDate ?? null;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 Days expiration for the JWT payload validation itself
    }
};
