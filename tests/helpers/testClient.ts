import "./env";
import { NextResponse } from "next/server";

const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

export interface TestUser {
  email: string;
  password: string;
  role: "admin" | "hostel_admin" | "business_admin" | "superadmin";
  poolId?: string;
  hostelId?: string;
  businessId?: string;
}

export const TEST_USERS: Record<string, TestUser> = {
  poolAdmin: {
    email: "admin@ts.com",
    password: "testpass123",
    role: "admin",
    poolId: "POOL001",
  },
  hostelAdmin: {
    email: "h@1.com",
    password: "testpass123",
    role: "hostel_admin",
    hostelId: "HOS001",
  },
  businessAdmin: {
    email: "b@1.com",
    password: "testpass123",
    role: "business_admin",
    businessId: "BIZ001",
  },
  superAdmin: {
    email: "superadmin@tspools.com",
    password: "testpass123",
    role: "superadmin",
  },
};

export class TestClient {
  private baseUrl: string;
  private cookies: string[] = [];
  private csrfToken: string | null = null;

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async login(user: TestUser): Promise<boolean> {
    // IMPORTANT: Start fresh — no cookies. NextAuth v4 checks CSRF only when
    // a *next-auth.csrf-token* cookie is present in the request. By clearing
    // cookies first, we skip the CSRF check entirely (matching the frontend's
    // signIn() behavior on first visit).
    this.clearCookies();

    // Get CSRF token for API mutation headers (separate from NextAuth login CSRF)
    const csrfRes = await fetch(`${this.baseUrl}/api/auth/csrf-token`);
    if (csrfRes.ok) {
      const data = await csrfRes.json();
      this.csrfToken = data?.csrfToken || data?.token || "";
    }

    // Login via form-encoded POST — NextAuth v4 expects this format.
    // NO csrfToken in body = NextAuth skips CSRF (since we have no cookie).
    const formData = new URLSearchParams();
    formData.append("username", user.email);
    formData.append("password", user.password);
    formData.append("json", "true");
    if (user.role === "admin") formData.append("poolSlug", "ts-pool");
    if (user.role === "superadmin") formData.append("isSuperAdmin", "true");
    if (user.role === "hostel_admin") formData.append("isHostelAdmin", "true");
    if (user.role === "business_admin") formData.append("isBusinessAdmin", "true");

    const loginRes = await this.fetch("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      redirect: "manual",
    });

    // Store session cookies from login response (next-auth.session-token)
    const setCookie = loginRes.headers.get("set-cookie") || "";
    if (setCookie) {
      this.cookies.push(...setCookie.split(",").map(c => c.split(";")[0].trim()).filter(Boolean));
    }

    const hasSession = this.cookies.some(
      (c) => c.includes("next-auth.session-token") || c.includes("__Secure-next-auth.session-token")
    );
    return hasSession;
  }

  async fetch(
    path: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string>),
    };

    if (this.cookies.length > 0) {
      headers["Cookie"] = this.cookies.join("; ");
    }

    return fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
      redirect: "manual",
    });
  }

  async get(path: string): Promise<Response> {
    const suffix = path.includes("?") ? "&test=true" : "?test=true";
    return this.fetch(`${path}${suffix}`);
  }

  async post(path: string, body?: unknown): Promise<Response> {
    const suffix = path.includes("?") ? "&test=true" : "?test=true";
    return this.fetch(`${path}${suffix}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put(path: string, body?: unknown): Promise<Response> {
    const suffix = path.includes("?") ? "&test=true" : "?test=true";
    return this.fetch(`${path}${suffix}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async patch(path: string, body?: unknown): Promise<Response> {
    const suffix = path.includes("?") ? "&test=true" : "?test=true";
    return this.fetch(`${path}${suffix}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async del(path: string): Promise<Response> {
    const suffix = path.includes("?") ? "&test=true" : "?test=true";
    return this.fetch(`${path}${suffix}`, { method: "DELETE" });
  }

  clearCookies(): void {
    this.cookies = [];
  }
}

export function assertOk(res: Response, message?: string): void {
  if (!res.ok && res.status < 300) {
    throw new Error(message || `Expected OK, got ${res.status}`);
  }
}

export function assertStatus(res: Response, status: number): void {
  if (res.status !== status) {
    throw new Error(`Expected status ${status}, got ${res.status}`);
  }
}

export async function assertJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response: ${text.substring(0, 200)}`);
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
