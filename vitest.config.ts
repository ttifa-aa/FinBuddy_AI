// Vitest Configuration File
// This file configures Vitest for running tests in the FinBuddy project
// Vitest is a fast unit test framework powered by Vite

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// ── MAIN CONFIGURATION ─────────────────────────────────────────────────────
export default defineConfig({
  // ── PLUGINS ──────────────────────────────────────────────────────────────
  // Vite plugins to use during testing
  plugins: [
    react(), // React SWC plugin for fast JSX transformation
  ],

  // ── TEST CONFIGURATION ───────────────────────────────────────────────────
  test: {
    // Test environment - jsdom simulates browser environment for React components
    environment: "jsdom",

    // Enable global test functions (describe, it, expect) without imports
    globals: true,

    // Setup files to run before tests (global test configuration)
    setupFiles: ["./src/test/setup.ts"],

    // Pattern for test files to include
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },

  // ── RESOLVE CONFIGURATION ────────────────────────────────────────────────
  resolve: {
    // Path aliases for clean imports in tests
    alias: {
      "@": path.resolve(__dirname, "./src"), // @/ -> src/ directory
    },
  },
});
