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

export const SLOT_GROUPS: Record<string, AdSlotName[]> = {
  Dashboard: [AD_SLOTS.DASHBOARD_INLINE, AD_SLOTS.DASHBOARD_SIDEBAR],
  Members: [AD_SLOTS.MEMBERS_TOP, AD_SLOTS.MEMBERS_INLINE],
  Global: [AD_SLOTS.SIDEBAR, AD_SLOTS.TOP_STRIP, AD_SLOTS.POPUP, AD_SLOTS.BOTTOM_SHEET],
  Analytics: [AD_SLOTS.ANALYTICS_BOTTOM],
};

export interface SlotConfig {
  supportsVideo: boolean;
  supportsCarousel: boolean;
  mobileVisible: boolean;
  desktopVisible: boolean;
  recommendedAspectRatio: string;
  maxAdsPerSlot: number;
  conflictGroups: string[];
  description: string;
  iconName: string;
}

export const SLOT_CONFIGS: Record<AdSlotName, SlotConfig> = {
  [AD_SLOTS.DASHBOARD_INLINE]: {
    supportsVideo: true,
    supportsCarousel: true,
    mobileVisible: true,
    desktopVisible: true,
    recommendedAspectRatio: "16:6",
    maxAdsPerSlot: 1,
    conflictGroups: [],
    description: "Native card inside dashboard analytics grid",
    iconName: "LayoutGrid"
  },
  [AD_SLOTS.DASHBOARD_SIDEBAR]: {
    supportsVideo: true,
    supportsCarousel: false,
    mobileVisible: false,
    desktopVisible: true,
    recommendedAspectRatio: "1:1",
    maxAdsPerSlot: 1,
    conflictGroups: [],
    description: "Fixed placement in dashboard sidebar",
    iconName: "Sidebar"
  },
  [AD_SLOTS.MEMBERS_TOP]: {
    supportsVideo: false,
    supportsCarousel: false,
    mobileVisible: true,
    desktopVisible: true,
    recommendedAspectRatio: "21:3",
    maxAdsPerSlot: 1,
    conflictGroups: ["top-banner"],
    description: "Slim strip above members table",
    iconName: "PanelTop"
  },
  [AD_SLOTS.MEMBERS_INLINE]: {
    supportsVideo: true,
    supportsCarousel: true,
    mobileVisible: true,
    desktopVisible: true,
    recommendedAspectRatio: "16:6",
    maxAdsPerSlot: 1,
    conflictGroups: [],
    description: "Card inside members list layout",
    iconName: "List"
  },
  [AD_SLOTS.SIDEBAR]: {
    supportsVideo: true,
    supportsCarousel: false,
    mobileVisible: false,
    desktopVisible: true,
    recommendedAspectRatio: "1:1",
    maxAdsPerSlot: 1,
    conflictGroups: [],
    description: "Global sidebar placement",
    iconName: "Sidebar"
  },
  [AD_SLOTS.TOP_STRIP]: {
    supportsVideo: false,
    supportsCarousel: false,
    mobileVisible: true,
    desktopVisible: true,
    recommendedAspectRatio: "21:3",
    maxAdsPerSlot: 1,
    conflictGroups: ["top-banner"],
    description: "Global top navigation strip",
    iconName: "PanelTop"
  },
  [AD_SLOTS.BOTTOM_SHEET]: {
    supportsVideo: true,
    supportsCarousel: false,
    mobileVisible: true,
    desktopVisible: false,
    recommendedAspectRatio: "16:9",
    maxAdsPerSlot: 1,
    conflictGroups: ["mobile-overlay"],
    description: "Mobile sliding bottom sheet",
    iconName: "PanelBottom"
  },
  [AD_SLOTS.POPUP]: {
    supportsVideo: true,
    supportsCarousel: true,
    mobileVisible: true,
    desktopVisible: true,
    recommendedAspectRatio: "1:1",
    maxAdsPerSlot: 5,
    conflictGroups: ["mobile-overlay", "fullscreen"],
    description: "Immersive fullscreen popup",
    iconName: "Maximize"
  },
  [AD_SLOTS.ANALYTICS_BOTTOM]: {
    supportsVideo: true,
    supportsCarousel: false,
    mobileVisible: false,
    desktopVisible: true,
    recommendedAspectRatio: "16:6",
    maxAdsPerSlot: 1,
    conflictGroups: [],
    description: "Banner at the bottom of analytics",
    iconName: "BarChart"
  },
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
