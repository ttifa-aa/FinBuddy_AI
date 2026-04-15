import { useState, useMemo } from "react";
import { useTransactions } from "@/hooks/use-transactions";
import { useCurrency } from "@/contexts/CurrencyContext";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line,
} from "recharts";
import { Filter, TrendingUp } from "lucide-react";

// Cohesive teal + orange palette with supporting colors
const CHART_COLORS = [
  "#E76F51", // orange
  "#2A9D8F", // teal
  "#F4A261", // peach
  "#457B9D", // steel blue
  "#E9C46A", // amber
  "#52B788", // sage green
  "#C77DFF", // violet
  "#A8DADC", // pale teal
];

const CATEGORY_COLOR_MAP: Record<string, string> = {
  Food:          CHART_COLORS[0],
  Shopping:      CHART_COLORS[1],
  Transport:     CHART_COLORS[2],
  Bills:         CHART_COLORS[3],
  Entertainment: CHART_COLORS[4],
  Health:        CHART_COLORS[5],
  Education:     CHART_COLORS[6],
  Other:         CHART_COLORS[7],
};

function getCategoryColor(category: string, fallbackIndex: number): string {
  return CATEGORY_COLOR_MAP[category] ?? CHART_COLORS[fallbackIndex % CHART_COLORS.length];
}

export default function Forecasts() {
  const { data: transactions = [] } = useTransactions();
  const { format } = useCurrency();

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const dateFiltered = useMemo(() => {
    return transactions.filter((t) => {
      if (dateFrom && t.date < dateFrom) return false;
      if (dateTo && t.date > dateTo) return false;
      return true;
    });
  }, [transactions, dateFrom, dateTo]);

  const categories = useMemo(() => {
    const cats = new Set(transactions.map((t) => t.category));
    return Array.from(cats).sort();
  }, [transactions]);

  // Pie chart data
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    dateFiltered.forEach((t) => {
      map[t.category] = (map[t.category] || 0) + Number(t.amount);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [dateFiltered]);

  // Stacked bar chart — each row has { date, Category1: amount, Category2: amount, ... }
  const stackedDailyData = useMemo(() => {
    const filtered =
      selectedCategory === "all"
        ? dateFiltered
        : dateFiltered.filter((t) => t.category === selectedCategory);

    const map: Record<string, Record<string, number>> = {};
    filtered.forEach((t) => {
      if (!map[t.date]) map[t.date] = {};
      map[t.date][t.category] = (map[t.date][t.category] || 0) + Number(t.amount);
    });

    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cats]) => ({
        date: date.slice(5),
        ...Object.fromEntries(
          Object.entries(cats).map(([cat, val]) => [cat, Math.round(val * 100) / 100])
        ),
      }));
  }, [dateFiltered, selectedCategory]);

  // Which categories appear in the stacked data (for rendering Bar components)
  const activeCategories = useMemo(() => {
    const cats = new Set<string>();
    stackedDailyData.forEach((row) => {
      Object.keys(row).forEach((k) => { if (k !== "date") cats.add(k); });
    });
    return Array.from(cats);
  }, [stackedDailyData]);

  // Category trend line
  const categoryTrend = useMemo(() => {
    if (selectedCategory === "all") return [];
    const map: Record<string, number> = {};
    transactions
      .filter((t) => t.category === selectedCategory)
      .forEach((t) => {
        map[t.date] = (map[t.date] || 0) + Number(t.amount);
      });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, total]) => ({ date: date.slice(5), total: Math.round(total * 100) / 100 }));
  }, [transactions, selectedCategory]);

  // Week comparison
  const weekComparison = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
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
      lastWeek: Math.round(lastWeek * 100) / 100,
    };
  }, [transactions]);

  // Top merchants
  const topMerchants = useMemo(() => {
    const map: Record<string, number> = {};
    dateFiltered.forEach((t) => {
      map[t.description] = (map[t.description] || 0) + Number(t.amount);
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  }, [dateFiltered]);

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border border-border text-sm">
          <p className="font-semibold">{payload[0].name}</p>
          <p>{format(payload[0].value)}</p>
        </div>
      );
    }
    return null;
  };

  const StackedBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      const total = payload.reduce((sum: number, p: any) => sum + (p.value || 0), 0);
      return (
        <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border border-border text-sm min-w-[150px]">
          <p className="font-semibold mb-2">{label}</p>
          {[...payload].reverse().map((p: any) => (
            <div key={p.dataKey} className="flex items-center justify-between gap-3 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: p.fill }} />
                <span className="text-xs text-popover-foreground/70">{p.dataKey}</span>
              </div>
              <span className="text-xs font-semibold">{format(p.value)}</span>
            </div>
          ))}
          <div className="border-t border-border mt-2 pt-2 flex justify-between">
            <span className="text-xs font-semibold">Total</span>
            <span className="text-xs font-bold">{format(total)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const trendColor = getCategoryColor(selectedCategory, 0);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Analytics & Forecasts</h2>
        <p className="text-sm text-muted-foreground mt-1">Visual breakdown of your spending</p>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl p-5 shadow-sm mb-6">
        <h3 className="text-sm font-bold text-card-foreground mb-3 flex items-center gap-2">
          <Filter className="h-4 w-4" /> Custom Insights
        </h3>
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
            <>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    innerRadius={36}
                    dataKey="value"
                    paddingAngle={2}
                    label={({ name, percent }) =>
                      percent > 0.04 ? `${name} ${(percent * 100).toFixed(0)}%` : ""
                    }
                    labelLine={false}
                  >
                    {categoryData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={getCategoryColor(entry.name, i)}
                        stroke="transparent"
                        style={i === 0 ? { filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.20))" } : {}}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<PieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 justify-center">
                {categoryData.map((entry, i) => (
                  <div key={entry.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: getCategoryColor(entry.name, i) }} />
                    <span className="text-xs text-muted-foreground">{entry.name}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Stacked Bar Chart */}
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-bold text-card-foreground mb-1">
            Daily Spending {selectedCategory !== "all" && `(${selectedCategory})`}
          </h3>
          <p className="text-xs text-muted-foreground mb-4">
            {selectedCategory === "all" ? "Colors show category breakdown per day" : "Filtered to selected category"}
          </p>
          {stackedDailyData.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No data</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stackedDailyData} barSize={26}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={45} />
                <Tooltip content={<StackedBarTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} />
                {activeCategories.map((cat, i) => (
                  <Bar
                    key={cat}
                    dataKey={cat}
                    stackId="daily"
                    fill={getCategoryColor(cat, categories.indexOf(cat))}
                    radius={i === activeCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Category Trend Line */}
      {selectedCategory !== "all" && categoryTrend.length > 0 && (
        <div className="bg-card rounded-xl p-5 shadow-sm mb-6">
          <h3 className="text-sm font-bold text-card-foreground mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" style={{ color: trendColor }} />
            {selectedCategory} Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={categoryTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={45} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload?.length) {
                    return (
                      <div className="bg-popover text-popover-foreground p-3 rounded-lg shadow-lg border border-border text-sm">
                        <p className="font-semibold">{label}</p>
                        <p>{format(payload[0].value as number)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="total"
                stroke={trendColor}
                strokeWidth={2.5}
                dot={{ fill: trendColor, r: 4, strokeWidth: 0 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
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
            {topMerchants.map((m, i) => {
              const pct = Math.round((m.value / topMerchants[0].value) * 100);
              return (
                <div key={m.name} className="flex items-center gap-3">
                  <span
                    className="w-6 h-6 rounded-full text-white text-xs font-bold flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-card-foreground truncate">{m.name}</span>
                      <span className="text-sm font-bold text-card-foreground ml-2 flex-shrink-0">{format(m.value)}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
