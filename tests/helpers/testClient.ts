const BASE_URL = process.env.TEST_BASE_URL || "http://localhost:3000";

export class TestClient {
  private baseUrl: string;
  private cookieJar: Map<string, string> = new Map();

  constructor(baseUrl: string = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request(path: string, init: RequestInit = {}): Promise<Response> {
    const headers = new Headers(init.headers || {});
    if (!headers.has("Content-Type") && init.method !== "GET" && init.method !== "HEAD") {
      headers.set("Content-Type", "application/json");
    }
    // Set matching Origin for CSRF bypass
    if (!headers.has("Origin")) {
      headers.set("Origin", this.baseUrl);
    }

    // Attach stored cookies
    const cookies = Array.from(this.cookieJar.entries())
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("; ");
    if (cookies) headers.set("Cookie", cookies);

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      redirect: "manual",
    });

    // Capture Set-Cookie headers
    const setCookies = (res.headers as any).getSetCookie?.() as string[] | undefined;
    if (setCookies) {
      for (const sc of setCookies) {
        const m = sc.match(/^([^=]+)=([^;]+)/);
        if (m) this.cookieJar.set(decodeURIComponent(m[1]), decodeURIComponent(m[2]));
      }
    }

    return res;
  }

  async login(email: string, password: string, extraFields?: Record<string, string>): Promise<void> {
    // 1. Fetch CSRF token
    const csrfRes = await this.request("/api/auth/csrf");
    const { csrfToken } = await csrfRes.json();
    if (!csrfToken) throw new Error("CSRF token not returned");

    // 2. Submit credentials
    const body = new URLSearchParams({ csrfToken, username: email, password });
    if (extraFields) {
      for (const [k, v] of Object.entries(extraFields)) body.set(k, v);
    }
    const loginRes = await this.request("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (loginRes.status !== 200 && loginRes.status !== 302 && loginRes.status !== 307) {
      const text = await loginRes.text().catch(() => "");
      throw new Error(`Login failed (${loginRes.status}): ${text.substring(0, 200)}`);
    }

    // 3. Verify we got a session token
    if (!this.cookieJar.has("next-auth.session-token")) {
      throw new Error("No session token after login");
    }
  }

  async get(path: string, init?: RequestInit): Promise<Response> {
    return this.request(path, { method: "GET", ...init });
  }

  async post(path: string, body?: unknown, init?: RequestInit): Promise<Response> {
    return this.request(path, {
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    });
  }

  async put(path: string, body?: unknown, init?: RequestInit): Promise<Response> {
    return this.request(path, {
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    });
  }

  async patch(path: string, body?: unknown, init?: RequestInit): Promise<Response> {
    return this.request(path, {
      method: "PATCH",
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...init,
    });
  }

  async del(path: string, init?: RequestInit): Promise<Response> {
    return this.request(path, { method: "DELETE", ...init });
  }

  /**
   * Low-level fetch with cookies/headers managed by the client.
   * Allows full control over body, headers, method (e.g. raw body, no JSON).
   */
  async fetch(path: string, init: RequestInit = {}): Promise<Response> {
    return this.request(path, init);
  }

  async logout(): Promise<void> {
    const res = await this.request("/api/auth/signout", { method: "POST" });
    this.cookieJar.clear();
  }

  clearAuth(): void {
    this.cookieJar.clear();
  }
}

export async function assertStatus(res: Response, expected: number): Promise<void> {
  if (res.status !== expected) {
    const body = await res.text().catch(() => "(no body)");
    throw new Error(`Expected status ${expected}, got ${res.status}: ${body.substring(0, 300)}`);
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
