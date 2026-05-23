/**
 * Ad Slot Registry — Single source of truth for all ad placement slots.
 * Prevents hardcoding slot names across the codebase.
 * Each slot defines its layout safety constraints and responsive behavior.
 */

export const AD_SLOTS = {
  // Dashboard placements
  DASHBOARD_INLINE: "dashboard-inline",
  DASHBOARD_SIDEBAR: "dashboard-sidebar",

  // Members / Customers page
  MEMBERS_TOP: "members-top",
  MEMBERS_INLINE: "members-inline",

  // Sidebar (global within layout)
  SIDEBAR: "sidebar",

  // Top strip banner (below header)
  TOP_STRIP: "top-strip",

  // Bottom sheet (mobile drawer)
  BOTTOM_SHEET: "bottom-sheet",

  // Fullscreen popup / interstitial
  POPUP: "popup",

  // Analytics / other pages
  ANALYTICS_BOTTOM: "analytics-bottom",
} as const;

export type AdSlotName = (typeof AD_SLOTS)[keyof typeof AD_SLOTS];

/** All valid slot names as an array — useful for form dropdowns and API validation */
export const AD_SLOT_LIST: AdSlotName[] = Object.values(AD_SLOTS);

/** Human-readable labels for each slot */
export const AD_SLOT_LABELS: Record<AdSlotName, string> = {
  [AD_SLOTS.DASHBOARD_INLINE]: "Dashboard — Inline Card",
  [AD_SLOTS.DASHBOARD_SIDEBAR]: "Dashboard — Sidebar",
  [AD_SLOTS.MEMBERS_TOP]: "Members Page — Top Strip",
  [AD_SLOTS.MEMBERS_INLINE]: "Members Page — Inline",
  [AD_SLOTS.SIDEBAR]: "Sidebar — Global",
  [AD_SLOTS.TOP_STRIP]: "Top Strip Banner",
  [AD_SLOTS.BOTTOM_SHEET]: "Bottom Sheet (Mobile)",
  [AD_SLOTS.POPUP]: "Fullscreen Popup",
  [AD_SLOTS.ANALYTICS_BOTTOM]: "Analytics — Bottom",
};

/**
 * Layout safety constraints per slot.
 * Components use these to decide whether to render or hide.
 */
export interface SlotConstraints {
  /** Minimum viewport width in px to render this slot */
  minWidth: number;
  /** Minimum container height in px */
  minHeight: number;
  /** Pages this slot is allowed on (empty = all) */
  allowedPages: string[];
  /** Hide entirely on screens < 640px */
  hideOnMobile: boolean;
  /** Design mode: how the ad visually integrates */
  designMode: "compact" | "standard" | "premium" | "minimal" | "glass";
}

export const SLOT_CONSTRAINTS: Record<AdSlotName, SlotConstraints> = {
  [AD_SLOTS.DASHBOARD_INLINE]: {
    minWidth: 0,
    minHeight: 120,
    allowedPages: ["dashboard"],
    hideOnMobile: false,
    designMode: "glass",
  },
  [AD_SLOTS.DASHBOARD_SIDEBAR]: {
    minWidth: 768,
    minHeight: 200,
    allowedPages: ["dashboard"],
    hideOnMobile: true,
    designMode: "premium",
  },
  [AD_SLOTS.MEMBERS_TOP]: {
    minWidth: 0,
    minHeight: 60,
    allowedPages: ["members", "customers"],
    hideOnMobile: false,
    designMode: "minimal",
  },
  [AD_SLOTS.MEMBERS_INLINE]: {
    minWidth: 0,
    minHeight: 120,
    allowedPages: ["members", "customers"],
    hideOnMobile: false,
    designMode: "standard",
  },
  [AD_SLOTS.SIDEBAR]: {
    minWidth: 1024,
    minHeight: 250,
    allowedPages: [],
    hideOnMobile: true,
    designMode: "compact",
  },
  [AD_SLOTS.TOP_STRIP]: {
    minWidth: 0,
    minHeight: 48,
    allowedPages: [],
    hideOnMobile: false,
    designMode: "minimal",
  },
  [AD_SLOTS.BOTTOM_SHEET]: {
    minWidth: 0,
    minHeight: 80,
    allowedPages: [],
    hideOnMobile: false,
    designMode: "glass",
  },
  [AD_SLOTS.POPUP]: {
    minWidth: 0,
    minHeight: 0,
    allowedPages: [],
    hideOnMobile: false,
    designMode: "premium",
  },
  [AD_SLOTS.ANALYTICS_BOTTOM]: {
    minWidth: 0,
    minHeight: 120,
    allowedPages: ["analytics", "revenue-analytics"],
    hideOnMobile: true,
    designMode: "standard",
  },
};
