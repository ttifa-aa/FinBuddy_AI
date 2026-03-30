// ESLint Configuration File
// This file configures ESLint rules and plugins for code linting and quality enforcement
// Uses the new flat config format (ESLint 9+)

import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // ── IGNORE PATTERNS ──────────────────────────────────────────────────────
  // Files and directories to exclude from linting
  { ignores: ["dist"] },

  // ── MAIN CONFIGURATION ───────────────────────────────────────────────────
  {
    // Extend recommended configurations from ESLint and TypeScript ESLint
    extends: [js.configs.recommended, ...tseslint.configs.recommended],

    // Apply this config to TypeScript and TSX files
    files: ["**/*.{ts,tsx}"],

    // Language options for parsing
    languageOptions: {
      ecmaVersion: 2020,        // ECMAScript version (ES2020 features)
      globals: globals.browser, // Browser global variables (window, document, etc.)
    },

    // Additional ESLint plugins
    plugins: {
      "react-hooks": reactHooks,      // React hooks rules
      "react-refresh": reactRefresh,  // Hot reload optimization
    },

    // Custom rule configurations
    rules: {
      // Include recommended React hooks rules
      ...reactHooks.configs.recommended.rules,

      // Warn about components that can't be hot-reloaded
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],

      // Disable unused variables check (TypeScript handles this)
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
);
