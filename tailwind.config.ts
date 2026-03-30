// Tailwind CSS Configuration File
// This file customizes Tailwind CSS for the FinBuddy application
// Defines custom colors, animations, and component configurations

import type { Config } from "tailwindcss";

export default {
  // ── DARK MODE CONFIGURATION ──────────────────────────────────────────────
  // Enables class-based dark mode switching
  darkMode: ["class"],

  // ── CONTENT SCANNING ─────────────────────────────────────────────────────
  // Files that Tailwind should scan for class usage
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],

  // ── CLASS PREFIX ─────────────────────────────────────────────────────────
  // No prefix for Tailwind classes (use bare class names)
  prefix: "",

  // ── THEME CUSTOMIZATION ──────────────────────────────────────────────────
  theme: {
    // Container component configuration for responsive layouts
    container: {
      center: true,        // Center containers horizontally
      padding: "2rem",     // Default padding for containers
      screens: {
        "2xl": "1400px",   // Max width for 2xl breakpoint
      },
    },

    // Theme extensions (custom additions to default Tailwind theme)
    extend: {
      // Custom font family - uses Quicksand
      fontFamily: {
        sans: ["Quicksand", "sans-serif"],
      },

      // ── COLOR SYSTEM ─────────────────────────────────────────────────────
      // CSS custom property-based color system for theming
      colors: {
        // Base UI colors using CSS variables for light/dark mode switching
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",

        // Primary color scheme (main actions, buttons)
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },

        // Secondary color scheme (less prominent elements)
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },

        // Destructive colors (error states, delete actions)
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },

        // Muted colors (subtle text, backgrounds)
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },

        // Accent colors (highlights, warnings)
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },

        // Popover colors (overlay elements like dropdowns)
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },

        // Card colors (content containers)
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // Sidebar-specific color scheme
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },

        // Chat interface color scheme
        chat: {
          header: "hsl(var(--chat-header))",
          "header-foreground": "hsl(var(--chat-header-foreground))",
          user: "hsl(var(--chat-user))",
          "user-foreground": "hsl(var(--chat-user-foreground))",
          bot: "hsl(var(--chat-bot))",
          "bot-foreground": "hsl(var(--chat-bot-foreground))",
        },
      },

      // ── BORDER RADIUS SYSTEM ─────────────────────────────────────────────
      // Responsive border radius using CSS custom properties
      borderRadius: {
        lg: "var(--radius)",                    // Large radius
        md: "calc(var(--radius) - 2px)",        // Medium radius
        sm: "calc(var(--radius) - 4px)",        // Small radius
      },

      // ── CUSTOM ANIMATIONS ────────────────────────────────────────────────
      // Keyframe definitions for custom animations
      keyframes: {
        // Accordion expand animation
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        // Accordion collapse animation
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // Fade in with slight upward movement
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        // Slide in from right
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(16px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        // Soft pulsing effect
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },

      // Animation class definitions using the keyframes
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.4s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },

  // ── PLUGINS ──────────────────────────────────────────────────────────────
  // Additional Tailwind plugins for enhanced functionality
  plugins: [require("tailwindcss-animate")], // Animation utilities plugin
} satisfies Config;
