import { dbConnect } from "@/lib/mongodb";
import { Business, IBusiness } from "@/models/Business";
import { logger } from "@/lib/logger";

/* ═══════════════════════════════════════════════════════════════════ */
/*  TYPES                                                             */
/* ═══════════════════════════════════════════════════════════════════ */

export interface BusinessProfile {
  name: string;
  slug: string;
  address: string;
  phone: string;
  gstNumber: string;
  logoUrl: string;
}

export interface InvoiceBusinessDetails {
  businessName: string;
  gstNumber: string;
  address: string;
  phone: string;
}

export interface BusinessUpdateInput {
  name?: string;
  address?: string;
  phone?: string;
  gstNumber?: string;
}

export interface AuditEntry {
  field: string;
  previousValue: string;
  newValue: string;
  updatedAt: Date;
  updatedBy: string;
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  VALIDATION & SANITIZATION                                         */
/* ═══════════════════════════════════════════════════════════════════ */

/**
 * Indian GST Number format:
 * 2 digits state code + 5 chars PAN + 4 digits + 1 alpha + 1 check char + Z + 1 check digit
 * Example: 22AAAAA0000A1Z5
 */
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function validateGstNumber(gst: string): { valid: boolean; error?: string } {
  if (!gst || gst.trim().length === 0) {
    // GST is optional — empty is allowed
    return { valid: true };
  }

  const normalized = normalizeGstNumber(gst);

  if (normalized.length !== 15) {
    return { valid: false, error: "GST number must be exactly 15 characters" };
  }

  if (!GST_REGEX.test(normalized)) {
    return {
      valid: false,
      error: "Invalid GST format. Expected format: 22AAAAA0000A1Z5",
    };
  }

  return { valid: true };
}

export function normalizeGstNumber(gst: string): string {
  return gst.toUpperCase().trim().replace(/\s+/g, "");
}

export function sanitizeBusinessInput(input: BusinessUpdateInput): BusinessUpdateInput {
  const sanitized: BusinessUpdateInput = {};

  if (input.name !== undefined) {
    sanitized.name = input.name.trim().replace(/\s+/g, " ");
  }

  if (input.address !== undefined) {
    sanitized.address = input.address.trim();
  }

  if (input.phone !== undefined) {
    // Remove non-digit chars except + at beginning
    sanitized.phone = input.phone.trim().replace(/[^\d+\-\s()]/g, "");
  }

  if (input.gstNumber !== undefined) {
    sanitized.gstNumber = input.gstNumber.trim().length > 0
      ? normalizeGstNumber(input.gstNumber)
      : "";
  }

  return sanitized;
}

export function validateBusinessUpdate(input: BusinessUpdateInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (input.name !== undefined && input.name.trim().length === 0) {
    errors.push("Business name cannot be empty");
  }

  if (input.name !== undefined && input.name.trim().length > 200) {
    errors.push("Business name cannot exceed 200 characters");
  }

  if (input.address !== undefined && input.address.trim().length > 500) {
    errors.push("Address cannot exceed 500 characters");
  }

  if (input.phone !== undefined && input.phone.trim().length > 20) {
    errors.push("Phone number cannot exceed 20 characters");
  }

  if (input.gstNumber !== undefined && input.gstNumber.trim().length > 0) {
    const gstResult = validateGstNumber(input.gstNumber);
    if (!gstResult.valid) {
      errors.push(gstResult.error!);
    }
  }

  return { valid: errors.length === 0, errors };
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  DATA ACCESS                                                       */
/* ═══════════════════════════════════════════════════════════════════ */

/**
 * Fetch the full business profile from database.
 * This is the SINGLE SOURCE OF TRUTH for business identity.
 */
export async function getBusinessProfile(businessId: string): Promise<BusinessProfile | null> {
  await dbConnect();

  if (!businessId) {
    throw new Error("Tenant context lost — businessId is required");
  }

  const business = await Business.findOne({ businessId }).lean() as any;
  if (!business) return null;

  return {
    name: business.name || "",
    slug: business.slug || "",
    address: business.address || "",
    phone: business.phone || "",
    gstNumber: business.gstNumber || "",
    logoUrl: business.logoUrl || "",
  };
}

/**
 * Returns exactly the fields needed for invoice rendering.
 * Always fetches from DB — never trusts client input for business identity.
 */
export async function getInvoiceBusinessDetails(businessId: string): Promise<InvoiceBusinessDetails | null> {
  const profile = await getBusinessProfile(businessId);
  if (!profile) return null;

  return {
    businessName: profile.name,
    gstNumber: profile.gstNumber,
    address: profile.address,
    phone: profile.phone,
  };
}

/**
 * Update business profile fields and return audit trail entries.
 */
export async function updateBusinessProfile(
  businessId: string,
  input: BusinessUpdateInput,
  updatedBy: string
): Promise<{ profile: BusinessProfile; auditEntries: AuditEntry[] }> {
  await dbConnect();

  if (!businessId) {
    throw new Error("Tenant context lost — businessId is required");
  }

  // Sanitize inputs
  const sanitized = sanitizeBusinessInput(input);

  // Validate
  const validation = validateBusinessUpdate(sanitized);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
  }

  // Fetch current state for audit trail
  const current = await Business.findOne({ businessId }).lean() as any;
  if (!current) {
    throw new Error("Business not found");
  }

  // Build audit entries for changed fields
  const auditEntries: AuditEntry[] = [];
  const now = new Date();
  const updateFields: Record<string, any> = {};

  if (sanitized.name !== undefined && sanitized.name !== (current.name || "")) {
    auditEntries.push({
      field: "name",
      previousValue: current.name || "",
      newValue: sanitized.name,
      updatedAt: now,
      updatedBy,
    });
    updateFields.name = sanitized.name;
  }

  if (sanitized.address !== undefined && sanitized.address !== (current.address || "")) {
    auditEntries.push({
      field: "address",
      previousValue: current.address || "",
      newValue: sanitized.address,
      updatedAt: now,
      updatedBy,
    });
    updateFields.address = sanitized.address;
  }

  if (sanitized.phone !== undefined && sanitized.phone !== (current.phone || "")) {
    auditEntries.push({
      field: "phone",
      previousValue: current.phone || "",
      newValue: sanitized.phone,
      updatedAt: now,
      updatedBy,
    });
    updateFields.phone = sanitized.phone;
  }

  if (sanitized.gstNumber !== undefined && sanitized.gstNumber !== (current.gstNumber || "")) {
    auditEntries.push({
      field: "gstNumber",
      previousValue: current.gstNumber || "",
      newValue: sanitized.gstNumber,
      updatedAt: now,
      updatedBy,
    });
    updateFields.gstNumber = sanitized.gstNumber;
  }

  // Only update if there are actual changes
  if (Object.keys(updateFields).length > 0) {
    await Business.updateOne({ businessId }, { $set: updateFields });

    // Log audit entries
    for (const entry of auditEntries) {
      logger.info("Business profile updated", {
        businessId,
        field: entry.field,
        previousValue: entry.previousValue,
        newValue: entry.newValue,
        updatedBy: entry.updatedBy,
      });
    }
  }

  // Fetch updated profile
  const profile = await getBusinessProfile(businessId);
  if (!profile) {
    throw new Error("Failed to fetch updated business profile");
  }

  return { profile, auditEntries };
}
