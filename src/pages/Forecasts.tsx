// Forecasts Page Component
// This component provides comprehensive financial analytics and visualizations
// Displays spending breakdowns, trends, and insights through interactive charts
// Features include:
// - Pie chart showing spending by category
// - Bar chart showing daily spending patterns
// - Line chart showing category trends over time
// - Week-over-week spending comparison
// - Top merchants list
// - Date range and category filtering

import { useState, useMemo } from "react";
import { useTransactions, getSpendingTotal } from "@/hooks/use-transactions";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  LineChart, Line,
} from "recharts";
import { CalendarDays, Filter, TrendingUp } from "lucide-react";

// ── CHART COLORS ───────────────────────────────────────────────────────────
// Color palette for chart visualizations using HSL values that match the theme
const CHART_COLORS = [
  "hsl(352, 36%, 43%)", "hsl(198, 15%, 55%)", "hsl(356, 10%, 62%)",
  "hsl(1, 29%, 47%)", "hsl(30, 50%, 55%)", "hsl(160, 40%, 45%)",
  "hsl(220, 40%, 55%)", "hsl(280, 35%, 50%)",
];

// ── COMPONENT DEFINITION ───────────────────────────────────────────────────
export default function Forecasts() {
  // ── HOOKS AND STATE ───────────────────────────────────────────────────────
  const { data: transactions = [] } = useTransactions(); // Fetch user transactions from Supabase
  const { format, symbol } = useCurrency(); // Currency formatting utilities

  // Filter state for date range and category selection
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  // ── DATA PROCESSING ───────────────────────────────────────────────────────

  // Filter transactions by selected date range
  const dateFiltered = useMemo(() => {
    return transactions.filter((t) => {
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      return true;
    });
  }, [transactions, dateFrom, dateTo]);

  // Extract all unique categories from transactions for filter dropdown
  const categories = useMemo(() => {
    const cats = new Set(transactions.map((t) => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  // ── PIE CHART DATA: Spending by category ──────────────────────────────────
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    dateFiltered.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    });
    const result = Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value); // Sort by value descending
    return result;
  }, [dateFiltered]);

  const maxCategoryIndex = 0; // Already sorted, so first item is largest

  // ── BAR CHART DATA: Daily spending ────────────────────────────────────────
  const dailyData = useMemo(() => {
    const map: Record<string, number> = {};
    // Filter by selected category if not "all"
    const filtered = selectedCategory === "all"
      ? dateFiltered
      : dateFiltered.filter((t) => t.category === selectedCategory);
    filtered.forEach((t) => {
      map[t.date] = (map[t.date] || 0) + Number(t.amount);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b)) // Sort by date
      .map(([date, total]) => ({
        date: date.slice(5), // Show MM-DD format
        total: Math.round(total * 100) / 100
      }));
  }, [dateFiltered, selectedCategory]);

  // ── LINE CHART DATA: Category trend ───────────────────────────────────────
  const categoryTrend = useMemo(() => {
    if (selectedCategory === "all") return []; // No trend for "all categories"
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.category === selectedCategory)
      .forEach((t) => {
        map[t.date] = (map[t.date] || 0) + Number(t.amount);
      });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({
        date: date.slice(5),
        total: Math.round(total * 100) / 100
      }));
  }, [transactions, selectedCategory]);

  // ── WEEK COMPARISON DATA ──────────────────────────────────────────────────
  const weekComparison = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7); // Start of last week

    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    const thisWeekStart = fmt(startOfWeek);
    const lastWeekStart = fmt(startOfLastWeek);

    let thisWeek = 0, lastWeek = 0;
    transactions.forEach((t) => {
      if (t.date >= thisWeekStart) thisWeek += Number(t.amount);
      else if (t.date >= lastWeekStart && t.date < thisWeekStart) lastWeek += Number(t.amount);
    });
    return {
      thisWeek: Math.round(thisWeek * 100) / 100,
      lastWeek: Math.round(lastWeek * 100) / 100
    };
  }, [transactions]);

  // ── TOP MERCHANTS DATA ────────────────────────────────────────────────────
  const topMerchants = useMemo(() => {
    const map: Record<string, number> = {};
    dateFiltered.forEach((t) => {
      const key = t.description; // Use transaction description as merchant name
      map[key] = (map[key] || 0) + Number(t.amount);
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a) // Sort by amount descending
      .slice(0, 5) // Top 5 merchants
      .map(([name, value]) => ({
        name,
        value: Math.round(value * 100) / 100
      }));
  }, [dateFiltered]);

  // ── CUSTOM TOOLTIP COMPONENT ──────────────────────────────────────────────
  // Reusable tooltip component for all charts with consistent styling
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border border-border text-sm">
          <p className="font-semibold">{label || payload[0].name}</p>
          <p>{format(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Analytics & Forecasts</h2>
        <p className="text-sm text-muted-foreground mt-1">Visual breakdown of your spending</p>
      </div>

      {/* Filters Section - Date range, category selection, and week comparison */}
      <div className="bg-card rounded-xl p-5 shadow-sm mb-6">
        <h3 className="text-sm font-bold text-card-foreground mb-3 flex items-center gap-2">
          <Filter className="h-4 w-4" /> Custom Insights
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Date From Filter */}
          <div>
            <label className="text-xs font-semibold text-card-foreground/60 mb-1 block">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Date To Filter */}
          <div>
            <label className="text-xs font-semibold text-card-foreground/60 mb-1 block">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Category Filter */}
          <div>
            <label className="text-xs font-semibold text-card-foreground/60 mb-1 block">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Week Comparison Display */}
          <div>
            <label className="text-xs font-semibold text-card-foreground/60 mb-1 block">Week vs Week</label>
            <div className="flex gap-2 text-sm">
              <div className="bg-muted rounded-lg px-3 py-2 flex-1 text-center">
                <div className="text-xs text-muted-foreground">This week</div>
                <div className="font-bold text-foreground">{format(weekComparison.thisWeek)}</div>
              </div>
              <div className="bg-muted rounded-lg px-3 py-2 flex-1 text-center">
                <div className="text-xs text-muted-foreground">Last week</div>
                <div className="font-bold text-foreground">{format(weekComparison.lastWeek)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid - Two-column layout for pie and bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pie Chart: Spending by Category */}
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-card-foreground mb-4">Spending by Category</h3>
          {categoryData.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%" cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {categoryData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      stroke={i === maxCategoryIndex ? "hsl(var(--foreground))" : "transparent"}
                      strokeWidth={i === maxCategoryIndex ? 3 : 0}
                      style={i === maxCategoryIndex ? {
                        filter: "brightness(1.15)",
                        transform: "scale(1.03)",
                        transformOrigin: "center"
                      } : {}}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar Chart: Daily Spending */}
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-card-foreground mb-4">
            Daily Spending {selectedCategory !== "all" && `(${selectedCategory})`}
          </h3>
          {dailyData.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" fill="hsl(352, 36%, 43%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category Trend Line Chart - Only shown when specific category selected */}
      {selectedCategory !== "all" && categoryTrend.length > 0 && (
        <div className="bg-card rounded-xl p-5 shadow-sm mb-6">
          <h3 className="text-sm font-bold text-card-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> {selectedCategory} Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={categoryTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="hsl(352, 36%, 43%)"
                strokeWidth={2}
                dot={{ fill: "hsl(352, 36%, 43%)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Merchants List - Shows highest spending merchants */}
      <div className="bg-card rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-card-foreground mb-4">Top 5 Merchants</h3>
        {topMerchants.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No data</p>
        ) : (
          <div className="space-y-3">
            {topMerchants.map((m, i) => (
              <div key={m.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm font-medium text-card-foreground truncate">
                  {m.name}
                </span>
                <span className="text-sm font-bold text-card-foreground">
                  {format(m.value)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Analytics & Forecasts</h2>
        <p className="text-sm text-muted-foreground mt-1">Visual breakdown of your spending</p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl p-5 shadow-sm mb-6">
        <h3 className="text-sm font-bold text-card-foreground mb-3 flex items-center gap-2"><Filter className="h-4 w-4" /> Custom Insights</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-card-foreground/60 mb-1 block">From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-semibold text-card-foreground/60 mb-1 block">To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs font-semibold text-card-foreground/60 mb-1 block">Category</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-muted rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="all">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-card-foreground/60 mb-1 block">Week vs Week</label>
            <div className="flex gap-2 text-sm">
              <div className="bg-muted rounded-lg px-3 py-2 flex-1 text-center">
                <div className="text-xs text-muted-foreground">This week</div>
                <div className="font-bold text-foreground">{format(weekComparison.thisWeek)}</div>
              </div>
              <div className="bg-muted rounded-lg px-3 py-2 flex-1 text-center">
                <div className="text-xs text-muted-foreground">Last week</div>
                <div className="font-bold text-foreground">{format(weekComparison.lastWeek)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pie Chart */}
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-card-foreground mb-4">Spending by Category</h3>
          {categoryData.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {categoryData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      stroke={i === maxCategoryIndex ? "hsl(var(--foreground))" : "transparent"}
                      strokeWidth={i === maxCategoryIndex ? 3 : 0}
                      style={i === maxCategoryIndex ? { filter: "brightness(1.15)", transform: "scale(1.03)", transformOrigin: "center" } : {}}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Bar Chart */}
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-card-foreground mb-4">
            Daily Spending {selectedCategory !== "all" && `(${selectedCategory})`}
          </h3>
          {dailyData.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="total" fill="hsl(352, 36%, 43%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category Trend Line */}
      {selectedCategory !== "all" && categoryTrend.length > 0 && (
        <div className="bg-card rounded-xl p-5 shadow-sm mb-6">
          <h3 className="text-sm font-bold text-card-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> {selectedCategory} Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={categoryTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="total" stroke="hsl(352, 36%, 43%)" strokeWidth={2} dot={{ fill: "hsl(352, 36%, 43%)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Merchants */}
      <div className="bg-card rounded-xl p-5 shadow-sm">
        <h3 className="text-sm font-bold text-card-foreground mb-4">Top 5 Merchants</h3>
        {topMerchants.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No data</p>
        ) : (
          <div className="space-y-3">
            {topMerchants.map((m, i) => (
              <div key={m.name} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{i + 1}</span>
                <span className="flex-1 text-sm font-medium text-card-foreground truncate">{m.name}</span>
                <span className="text-sm font-bold text-card-foreground">{format(m.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
