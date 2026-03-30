// PostCSS Configuration File
// PostCSS is a tool for transforming CSS with JavaScript plugins
// It processes CSS files during the build process to add vendor prefixes and enable utility-first styling
// This configuration enables Tailwind CSS and automatic CSS vendor prefixing

// ── CONFIGURATION OBJECT ────────────────────────────────────────────────────
// Export the PostCSS configuration as a default export
export default {
  // ── PLUGINS ───────────────────────────────────────────────────────────────
  plugins: {
    // Tailwind CSS Plugin
    // Processes Tailwind's utility classes and directives (@tailwind, @apply, @responsive, etc.)
    // Converts utility-first CSS framework classes into actual CSS rules
    // Enables the entire Tailwind CSS framework in the project
    tailwindcss: {},

    // Autoprefixer Plugin
    // Automatically adds vendor prefixes to CSS rules for cross-browser compatibility
    // Analyzes CSS and adds prefixes like -webkit-, -moz-, -ms- where needed
    // Based on browser support data from caniuse.com
    autoprefixer: {},
  },
};
