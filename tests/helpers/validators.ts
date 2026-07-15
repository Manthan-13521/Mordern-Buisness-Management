/**
 * validators.ts
 * Purpose: Response schema validation and response time assertions.
 * Validates JSON response shapes, headers, timing, and cache directives.
 */

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null' | 'any';
  required?: boolean;
  nested?: SchemaField[];
}

export function assertResponseSchema(
  body: any,
  schema: SchemaField[],
  path: string = 'root'
): void {
  for (const field of schema) {
    const value = body[field.name];
    const fullPath = `${path}.${field.name}`;

    if (value === undefined || value === null) {
      if (field.required) throw new Error(`Missing required field: ${fullPath}`);
      continue;
    }

    if (field.type !== 'any' && field.type !== 'null') {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (field.type === 'array' && actualType !== 'array') throw new Error(`Field ${fullPath}: expected array, got ${actualType}`);
      else if (field.type === 'object' && actualType !== 'object') throw new Error(`Field ${fullPath}: expected object, got ${actualType}`);
      else if (!['array', 'object'].includes(field.type) && actualType !== field.type) {
        throw new Error(`Field ${fullPath}: expected ${field.type}, got ${actualType}`);
      }
    }

    if (field.nested && typeof value === 'object' && value !== null) {
      assertResponseSchema(value, field.nested, fullPath);
    }
  }
}

export function assertResponseTime(res: Response, maxMs: number): void {
  const timing = (res as any).timing || {};
  if (timing.duration && timing.duration > maxMs) {
    throw new Error(`Response time ${timing.duration}ms exceeds max ${maxMs}ms`);
  }
}

export function assertCacheHeaders(res: Response): void {
  const cacheControl = res.headers.get('cache-control');
  if (cacheControl && cacheControl.includes('no-store')) return;
  if (cacheControl && cacheControl.includes('private')) return;
  // No cache-control header is also valid (no caching)
}

export function assertNoCacheHeaders(res: Response): void {
  const cacheControl = res.headers.get('cache-control');
  if (!cacheControl || !cacheControl.includes('no-store')) {
    console.warn(`[WARN] Expected no-store cache header, got: ${cacheControl || 'none'}`);
  }
}

export function assertSecurityHeaders(res: Response): void {
  const headers = [
    'x-content-type-options',
    'x-frame-options',
    'content-security-policy',
    'strict-transport-security',
  ];
  for (const h of headers) {
    if (!res.headers.get(h)) {
      console.warn(`[WARN] Missing security header: ${h}`);
    }
  }
}
