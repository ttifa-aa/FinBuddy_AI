// Index Page Component - Main Dashboard
// This is the primary dashboard page that provides a comprehensive financial overview
// Features include:
// - Financial metrics cards showing spending, forecast, and remaining budget
// - Transaction table displaying recent financial activity
// - Notification feed for alerts and insights
// - Alert banner for important messages
// - Responsive grid layout adapting to different screen sizes

import { TrendingUp, PiggyBank } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { TransactionTable } from "@/components/TransactionTable";
import { AlertBanner } from "@/components/AlertBanner";
import { NotificationFeed } from "@/components/NotificationFeed";
import { useTransactions, useProfile, getSpendingTotal, getForecast, getSavings } from "@/hooks/use-transactions";
import { useCurrency } from "@/contexts/CurrencyContext";

// ── COMPONENT DEFINITION ───────────────────────────────────────────────────
const Index = () => {
  // ── HOOKS AND DATA FETCHING ───────────────────────────────────────────────
  const { data: transactions = [], isLoading } = useTransactions(); // Fetch user's transaction data
  const { data: profile } = useProfile(); // Fetch user profile data including budget
  const { format, symbol } = useCurrency(); // Currency formatting utilities

  // ── FINANCIAL CALCULATIONS ────────────────────────────────────────────────
  // Get user's monthly budget from profile, default to $2000 if not set
  const budget = profile?.monthly_budget ? Number(profile.monthly_budget) : 2000;

  // Calculate current month's spending total
  const spending = getSpendingTotal(transactions);

  // Calculate 30-day spending forecast based on transaction patterns
  const forecast = getForecast(transactions);

  // Calculate remaining budget (budget minus current spending)
  const savings = getSavings(budget, transactions);

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* Alert Banner - Shows important notifications and alerts */}
      <AlertBanner />

      {/* Page Header - Displays current month and year */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Your financial overview for {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Financial Metrics Cards - Three key financial indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {/* Total Spending Card - Shows current month's spending */}
        <MetricCard
          title="Total Spending"
          value={format(spending)}
          subtitle="This month so far"
          icon={<span className="text-lg font-bold leading-none">{symbol}</span>}
        />

        {/* Forecast Card - Shows projected monthly total based on spending patterns */}
        <MetricCard
          title="Forecast (30-day)"
          value={format(forecast)}
          subtitle="Projected monthly total"
          icon={TrendingUp}
          variant={forecast > budget ? "warning" : "default"}
        />

        {/* Remaining Budget Card - Shows how much budget is left */}
        <MetricCard
          title="Remaining Budget"
          value={format(savings)}
          subtitle={`of ${format(budget)} budget`}
          icon={PiggyBank}
          variant={savings < 0 ? "warning" : "default"}
        />
      </div>

      {/* Main Content Grid - Transaction table and notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Transaction Table Section - Takes up 2/3 of the width on large screens */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="bg-card rounded-xl p-12 text-center text-card-foreground/60 font-medium">
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="bg-card rounded-xl p-12 text-center text-card-foreground/60 font-medium">
              No transactions yet. Use the chat assistant to add your first expense!
            </div>
          ) : (
            <TransactionTable transactions={transactions} />
          )}
        </div>

        {/* Notification Feed Section - Takes up 1/3 of the width on large screens */}
        <div>
          <NotificationFeed />
        </div>
      </div>
    </>
  );
};

export default Index;