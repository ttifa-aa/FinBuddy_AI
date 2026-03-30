// Vite Configuration File
// This file configures Vite, the build tool and development server for the React application
// It defines plugins, server settings, and module resolution options

// ── IMPORTS ────────────────────────────────────────────────────────────────
// Import Vite's configuration helper function
import { defineConfig } from "vite";

// Import the React plugin with SWC (Speedy Web Compiler) for faster builds
import react from "@vitejs/plugin-react-swc";

// Import Node.js path module for resolving file paths
import path from "path";

// ── CONFIGURATION ───────────────────────────────────────────────────────────
// Export the Vite configuration using defineConfig for better TypeScript support
export default defineConfig({
  // ── DEVELOPMENT SERVER CONFIGURATION ──────────────────────────────────────
  server: {
    // Bind to all IPv6 addresses (::) to allow external access
    // This enables access from other devices on the network (e.g., mobile testing)
    host: "::",

    // Set the development server port
    port: 8080,
  },

  // ── PLUGINS ──────────────────────────────────────────────────────────────
  plugins: [
    // React plugin with SWC for fast compilation and HMR (Hot Module Replacement)
    // SWC provides significantly faster builds compared to the standard Babel plugin
    react()
  ],

  // ── MODULE RESOLUTION ─────────────────────────────────────────────────────
  resolve: {
    // Path aliases for cleaner imports throughout the application
    alias: {
      // Map "@" to the src directory for absolute imports
      // Example: import { Button } from "@/components/Button" instead of relative paths
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
