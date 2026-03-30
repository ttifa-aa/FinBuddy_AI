// this file contains mock transaction data and utility functions for calculating totals, forecasts, savings, category breakdowns, and anomaly detection based on the transactions
// it is used for testing and demonstration purposes, allowing us to simulate real transaction data without needing to connect to a live financial API
// the functions provided here can be used in the application to perform various calculations and analyses on the transaction data, such as calculating total spending, forecasting future spending, calculating savings based on a budget, getting totals for specific categories, and flagging anomalous transactions that deviate significantly from typical spending patterns

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  flagged?: boolean;
}

export const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "1", description: "Grocery store", amount: 85.40, category: "Food", date: "2026-02-12" },
  { id: "2", description: "Uber ride", amount: 24.50, category: "Transport", date: "2026-02-11" },
  { id: "3", description: "Netflix subscription", amount: 15.99, category: "Entertainment", date: "2026-02-10" },
  { id: "4", description: "Electric bill", amount: 120.00, category: "Bills", date: "2026-02-09" },
  { id: "5", description: "New sneakers", amount: 189.00, category: "Shopping", date: "2026-02-08", flagged: true },
  { id: "6", description: "Coffee shop", amount: 6.50, category: "Food", date: "2026-02-08" },
  { id: "7", description: "Gym membership", amount: 45.00, category: "Health", date: "2026-02-07" },
  { id: "8", description: "Online course", amount: 29.99, category: "Education", date: "2026-02-06" },
  { id: "9", description: "Lunch with team", amount: 42.00, category: "Food", date: "2026-02-05" },
  { id: "10", description: "Parking fee", amount: 12.00, category: "Transport", date: "2026-02-04" },
];

export function getSpendingTotal(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

export function getForecast(transactions: Transaction[]): number {
  const total = getSpendingTotal(transactions);
  const dayOfMonth = new Date().getDate();
  const dailyAvg = total / dayOfMonth;
  return Math.round(dailyAvg * 30 * 100) / 100;
}

export function getSavings(budget: number, transactions: Transaction[]): number {
  return Math.round((budget - getSpendingTotal(transactions)) * 100) / 100;
}

export function getCategoryTotal(transactions: Transaction[], category: string): number {
  return transactions.filter(t => t.category.toLowerCase() === category.toLowerCase()).reduce((s, t) => s + t.amount, 0);
}

export function flagAnomalies(transactions: Transaction[]): Transaction[] {
  const categoryAvgs: Record<string, { total: number; count: number }> = {};
  transactions.forEach(t => {
    if (!categoryAvgs[t.category]) categoryAvgs[t.category] = { total: 0, count: 0 };
    categoryAvgs[t.category].total += t.amount;
    categoryAvgs[t.category].count++;
  });

  return transactions.map(t => {
    const avg = categoryAvgs[t.category].total / categoryAvgs[t.category].count;
    return { ...t, flagged: t.amount > avg * 2 };
  });
}
