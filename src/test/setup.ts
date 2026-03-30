// Test Setup Configuration
// This file configures the testing environment for Vitest/Jest
// It sets up global test utilities and mocks for consistent test execution

// ── TESTING LIBRARY EXTENSIONS ──────────────────────────────────────────────
// Import jest-dom to extend Jest matchers with DOM-specific assertions
// Provides matchers like toBeInTheDocument(), toHaveClass(), toBeVisible(), etc.
import "@testing-library/jest-dom";

// ── BROWSER API MOCKS ──────────────────────────────────────────────────────
// Mock the window.matchMedia API which is used by components that respond to media queries
// This is commonly needed for responsive components, theme providers, or UI libraries
// that use media queries for responsive behavior
Object.defineProperty(window, "matchMedia", {
  writable: true, // Allow the mock to be overwritten if needed
  value: (query: string) => ({
    matches: false, // Default to not matching any media query
    media: query,   // Return the original query string
    onchange: null, // No change handler by default
    // Legacy addListener/removeListener methods (deprecated but still used by some libraries)
    addListener: () => {},     // No-op function
    removeListener: () => {},  // No-op function
    // Modern addEventListener/removeEventListener methods
    addEventListener: () => {},    // No-op function
    removeEventListener: () => {}, // No-op function
    dispatchEvent: () => {},       // No-op function
  }),
});
