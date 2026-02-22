import { TrendingUp, PiggyBank } from "lucide-react";
import { MetricCard } from "@/components/MetricCard";
import { TransactionTable } from "@/components/TransactionTable";
import { AlertBanner } from "@/components/AlertBanner";
import { NotificationFeed } from "@/components/NotificationFeed";
import { useTransactions, useProfile, getSpendingTotal, getForecast, getSavings } from "@/hooks/use-transactions";
import { useCurrency } from "@/contexts/CurrencyContext";

const Index = () => {
  const { data: transactions = [], isLoading } = useTransactions();
  const { data: profile } = useProfile();
  const { format, symbol } = useCurrency();

  const budget = profile?.monthly_budget ? Number(profile.monthly_budget) : 2000;
  const spending = getSpendingTotal(transactions);
  const forecast = getForecast(transactions);
  const savings = getSavings(budget, transactions);

  return (
    <>
      <AlertBanner />

      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Dashboard</h2>
        <p className="text-sm text-muted-foreground mt-1">Your financial overview for {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        <MetricCard title="Total Spending" value={format(spending)} subtitle="This month so far" icon={<span className="text-lg font-bold leading-none">{symbol}</span>} />
        <MetricCard title="Forecast (30-day)" value={format(forecast)} subtitle="Projected monthly total" icon={TrendingUp} variant={forecast > budget ? "warning" : "default"} />
        <MetricCard title="Remaining Budget" value={format(savings)} subtitle={`of ${format(budget)} budget`} icon={PiggyBank} variant={savings < 0 ? "warning" : "default"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="bg-card rounded-xl p-12 text-center text-card-foreground/60 font-medium">Loading transactions...</div>
          ) : transactions.length === 0 ? (
            <div className="bg-card rounded-xl p-12 text-center text-card-foreground/60 font-medium">
              No transactions yet. Use the chat assistant to add your first expense!
            </div>
          ) : (
            <TransactionTable transactions={transactions} />
          )}
        </div>
        <div>
          <NotificationFeed />
        </div>
      </div>
    </>
  );
};

export default Index;
