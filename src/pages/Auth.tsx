import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, User, ArrowRight } from "lucide-react";
// Auth Page Component
// This component handles user authentication (sign in and sign up) for the FinBuddy application
// Uses Supabase Auth for backend authentication services

import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Lock, User, ArrowRight } from "lucide-react";

// ── COMPONENT DEFINITION ───────────────────────────────────────────────────
export default function Auth() {
  // ── STATE MANAGEMENT ──────────────────────────────────────────────────────
  // Form mode: true for login, false for signup
  const [isLogin, setIsLogin] = useState(true);

  // Form field values
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  // UI state for feedback
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // ── FORM SUBMISSION HANDLER ───────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevent default form submission
    setError(""); // Clear previous errors
    setMessage(""); // Clear previous messages
    setLoading(true); // Show loading state

    if (isLogin) {
      // Sign in with existing account
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else {
      // Sign up for new account
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin, // Redirect after email confirmation
          data: { display_name: displayName }, // Additional user metadata
        },
      });
      if (error) {
        setError(error.message);
      } else {
        setMessage("Check your email for a confirmation link!");
      }
    }
    setLoading(false); // Hide loading state
  };

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Main auth container with responsive width */}
      <div className="w-full max-w-md">
        {/* Header section with branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground">🤖 FinBuddy</h1>
          <p className="text-muted-foreground mt-2 text-sm font-medium">
            {isLogin ? "Welcome back! Sign in to your account." : "Create your account to get started."}
          </p>
        </div>

        {/* Authentication form */}
        <form onSubmit={handleSubmit} className="bg-card rounded-xl p-8 shadow-sm space-y-5">
          {/* Display name field - only shown during signup */}
          {!isLogin && (
            <div>
              <label className="text-sm font-semibold text-card-foreground mb-1.5 block">Display Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-muted rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Your name"
                  required
                />
              </div>
            </div>
          )}

          {/* Email input field */}
          <div>
            <label className="text-sm font-semibold text-card-foreground mb-1.5 block">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-muted rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          {/* Password input field */}
          <div>
            <label className="text-sm font-semibold text-card-foreground mb-1.5 block">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-muted rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          {/* Error and success message display */}
          {error && <p className="text-sm text-accent font-medium">{error}</p>}
          {message && <p className="text-sm text-primary font-medium">{message}</p>}

          {/* Submit button with loading state */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-primary-foreground rounded-lg py-3 text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "Please wait..." : isLogin ? "Sign In" : "Create Account"}
            <ArrowRight className="h-4 w-4" />
          </button>

          
          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(""); setMessage(""); }}
              className="text-primary font-semibold hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>
        </form>

        
        <div className="text-center mt-6 text-xs text-muted-foreground space-y-1">
          <p>Copyright © 2026 Aatifa Tahmeed, Samreen Kausar, Sk. Musqan Khadri</p>
          <p>Dr. Jayashree Patil, Associate Professor</p>
        </div>

      </div>
    </div>
  );
}
