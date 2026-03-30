// Import UI components for notifications and tooltips
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Import React Query for data fetching and caching
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Import React Router for client-side routing
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Import context providers for authentication, theme, and currency
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CurrencyProvider } from "@/contexts/CurrencyContext";

// Import page components for different routes
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Transactions from "./pages/Transactions";
import Forecasts from "./pages/Forecasts";
import Predictions from "./pages/Predictions";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Import layout components
import { NavSidebar } from "./components/NavSidebar";
import { FloatingChatButton } from "./components/FloatingChatButton";

// Import custom hook for transaction data
import { useTransactions } from "./hooks/use-transactions";

// Initialize React Query client for data management
const queryClient = new QueryClient();

/**
 * ProtectedRoute component - wraps routes that require authentication
 * Redirects to /auth if user is not logged in, shows loading state during auth check
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center"><p className="text-muted-foreground font-medium">Loading...</p></div>;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

/**
 * AuthRoute component - wraps authentication routes
 * Redirects to home page if user is already logged in
 */
function AuthRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * AppLayout component - main application layout wrapper
 * Includes navigation sidebar, floating chat button, and main content area
 * Fetches transaction data for the chat component
 */
function AppLayout({ children }: { children: React.ReactNode }) {
  const { data: transactions = [] } = useTransactions();
  return (
    <div className="min-h-screen bg-background">
      <NavSidebar />
      <FloatingChatButton transactions={transactions} />
      <main className="lg:ml-56 p-4 pt-16 lg:pt-8 lg:p-8">
        {children}
      </main>
    </div>
  );
}

/**
 * Main App component - root of the application
 * Sets up all context providers and routing structure
 * Provider hierarchy: QueryClient -> Theme -> Auth -> Currency -> Tooltip -> Router
 */
const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <CurrencyProvider>
          <TooltipProvider>
            {/* Toast notification systems */}
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                {/* Authentication route - only accessible when not logged in */}
                <Route path="/auth" element={<AuthRoute><Auth /></AuthRoute>} />

                {/* Protected routes - require authentication */}
                <Route path="/" element={<ProtectedRoute><AppLayout><Index /></AppLayout></ProtectedRoute>} />
                <Route path="/transactions" element={<ProtectedRoute><AppLayout><Transactions /></AppLayout></ProtectedRoute>} />
                <Route path="/forecasts" element={<ProtectedRoute><AppLayout><Forecasts /></AppLayout></ProtectedRoute>} />
                <Route path="/predictions" element={<ProtectedRoute><AppLayout><Predictions /></AppLayout></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />

                {/* Catch-all route for 404 pages */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </CurrencyProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
