"use client";

import dynamic from "next/dynamic";

/**
 * Client-only wrapper for components that:
 *  - Read localStorage / sessionStorage
 *  - Listen to scroll / resize events
 *  - Render CSS animations that differ between server and client
 *  - Use useSession() which returns different values during SSR vs client
 *
 * `ssr: false` is only valid inside a "use client" module.
 * app/page.tsx is a Server Component so it imports THIS wrapper instead.
 */
const SmartDemoModal = dynamic(
  () =>
    import("@/components/marketing/SmartDemoModal").then((m) => ({
      default: m.SmartDemoModal,
    })),
  { ssr: false }
);

const FloatingCTA = dynamic(
  () =>
    import("@/components/marketing/FloatingCTA").then((m) => ({
      default: m.FloatingCTA,
    })),
  { ssr: false }
);

export function ClientOnlyComponents() {
  return (
    <>
      <SmartDemoModal />
      <FloatingCTA />
    </>
  );
}
