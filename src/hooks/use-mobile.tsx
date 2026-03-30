// Mobile Detection Hook - Responsive Design Utility
// This custom React hook provides mobile device detection for responsive UI components
// Returns a boolean indicating whether the current viewport is considered mobile-sized
// Useful for conditional rendering, styling, or behavior changes on mobile devices

import * as React from "react";

// ── CONFIGURATION ──────────────────────────────────────────────────────────
// Mobile breakpoint in pixels - screens narrower than this are considered mobile
// Matches common mobile breakpoints (768px is typical tablet/mobile cutoff)
const MOBILE_BREAKPOINT = 768;

// ── HOOK IMPLEMENTATION ────────────────────────────────────────────────────
// Custom hook that tracks whether the current viewport is mobile-sized
export function useIsMobile() {
  // State to track mobile status - undefined initially to avoid hydration mismatches
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    // ── MEDIA QUERY SETUP ────────────────────────────────────────────────────
    // Create a MediaQueryList for screens smaller than the mobile breakpoint
    // Using max-width: 767px (MOBILE_BREAKPOINT - 1) to match < 768px logic
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    // ── CHANGE HANDLER ───────────────────────────────────────────────────────
    // Function to update mobile state when viewport changes
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // ── EVENT LISTENER SETUP ─────────────────────────────────────────────────
    // Listen for changes in media query matches (viewport resize/orientation change)
    mql.addEventListener("change", onChange);

    // ── INITIAL STATE SET ────────────────────────────────────────────────────
    // Set initial mobile state based on current window width
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    // ── CLEANUP ──────────────────────────────────────────────────────────────
    // Remove event listener on unmount to prevent memory leaks
    return () => mql.removeEventListener("change", onChange);
  }, []); // Empty dependency array - only run once on mount

  // ── RETURN VALUE ──────────────────────────────────────────────────────────
  // Return boolean (coerce undefined to false during initial render)
  // This prevents hydration mismatches in SSR environments
  return !!isMobile;
}
