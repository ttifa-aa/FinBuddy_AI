// NotFound Page Component - 404 Error Page
// This component handles 404 errors when users navigate to non-existent routes
// Features include:
// - Error logging for debugging purposes
// - Clean, user-friendly error message
// - Link to return to the home page
// - Full-screen centered layout for better UX

import { useLocation } from "react-router-dom";
import { useEffect } from "react";

// ── COMPONENT DEFINITION ───────────────────────────────────────────────────
const NotFound = () => {
  // ── HOOKS ────────────────────────────────────────────────────────────────
  // Get current location information from React Router
  const location = useLocation();

  // ── SIDE EFFECTS ──────────────────────────────────────────────────────────
  // Log 404 errors to console for debugging and monitoring
  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    // Full-screen container with muted background
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <div className="text-center">
        {/* Large 404 heading */}
        <h1 className="mb-4 text-4xl font-bold">404</h1>

        {/* Error message */}
        <p className="mb-4 text-xl text-muted-foreground">Oops! Page not found</p>

        {/* Link back to home page */}
        <a href="/" className="text-primary underline hover:text-primary/90">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
