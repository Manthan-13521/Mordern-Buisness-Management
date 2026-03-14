import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "./mongodb";
import { User as UserModel, IUser } from "@/models/User";
import { PlatformAdmin } from "@/models/PlatformAdmin";
import { Pool } from "@/models/Pool";
import bcrypt from "bcryptjs";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            id: string;
            role: string;
            poolId?: string;
            poolSlug?: string;
        } & DefaultSession["user"];
    }
    interface User {
        role: string;
        poolId?: string;
        poolSlug?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        poolId?: string;
        poolSlug?: string;
    }
}

export const authOptions: NextAuthOptions = {
    secret: process.env.NEXTAUTH_SECRET || "fallback-dev-secret-change-me",
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
            async authorize(credentials) {
                if (!credentials?.username || !credentials?.password) {
                    throw new Error("Invalid credentials");
                }

                await connectDB();

                if (credentials.isSuperAdmin === 'true') {
                    const platformAdmin = await PlatformAdmin.findOne({ email: credentials.username }).lean();
                    if (platformAdmin) {
                        const isMatch = await bcrypt.compare(credentials.password, platformAdmin.passwordHash);
                        if (!isMatch) throw new Error("Invalid password");
                        
                        return {
                            id: platformAdmin._id.toString(),
                            name: "Super Admin",
                            email: platformAdmin.email,
                            role: "superadmin",
                        };
                    }
                    throw new Error("Super Admin not found");
                }

                let pool = null;

                if (credentials.poolSlug) {
                    pool = await Pool.findOne({ slug: credentials.poolSlug }).lean();
                    if (!pool) throw new Error("Pool not found");
                }

                // Global login lookup OR specific pool lookup
                const userQuery: any = {
                    $or: [
                        { email: credentials.username },
                        { name: credentials.username }
                    ]
                };

                if (pool) {
                    userQuery.poolId = pool.poolId;
                }

                const user = await UserModel.findOne(userQuery).lean() as IUser | null;

                if (!user) {
                    throw new Error("User not found in this pool");
                }

                const isMatch = await bcrypt.compare(credentials.password, user.passwordHash);

                if (!isMatch) {
                    throw new Error("Invalid password");
                }

                // If logged in via generic route, lookup the Pool to get the slug for session
                let effectiveSlug = credentials.poolSlug;
                if (!effectiveSlug && user.poolId) {
                    if (!pool) {
                       pool = await Pool.findOne({ poolId: user.poolId }).lean();
                    }
                    if (pool) effectiveSlug = pool.slug;
                }

                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    poolId: user.poolId,
                    poolSlug: effectiveSlug || credentials.poolSlug,
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
            }
            if (trigger === "update" && session) {
                 token = { ...token, ...session }
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.id = token.id;
                session.user.role = token.role;
                if (token.poolId) session.user.poolId = token.poolId;
                if (token.poolSlug) session.user.poolSlug = token.poolSlug;
            }
            return session;
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 Days
    },
};
