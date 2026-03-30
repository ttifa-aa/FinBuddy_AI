// Mock Data Library - Transaction Data and Financial Calculations
// This file provides mock transaction data and utility functions for financial calculations
// Used for testing, development, and demonstration purposes to simulate real financial data
// Contains sample transactions, budget calculations, spending analysis, and anomaly detection

// ── TYPE DEFINITIONS ───────────────────────────────────────────────────────
// Transaction interface defining the structure of financial transaction data
export interface Transaction {
  id: string;           // Unique identifier for the transaction
  description: string;  // Human-readable description of the transaction
  amount: number;       // Transaction amount in the user's currency
  category: string;     // Transaction category (Food, Transport, etc.)
  date: string;         // Transaction date in YYYY-MM-DD format
  flagged?: boolean;    // Optional flag for anomalous transactions
}

// ── MOCK DATA ──────────────────────────────────────────────────────────────
// Sample transaction data for testing and demonstration
// Includes various categories and one pre-flagged anomalous transaction
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

// ── FINANCIAL CALCULATION FUNCTIONS ─────────────────────────────────────────

// Calculate total spending across all transactions
export function getSpendingTotal(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

// Calculate 30-day spending forecast based on current spending patterns
export function getForecast(transactions: Transaction[]): number {
  const total = getSpendingTotal(transactions);  // Current period total
  const dayOfMonth = new Date().getDate();       // Current day of month
  const dailyAvg = total / dayOfMonth;           // Average daily spending so far
  return Math.round(dailyAvg * 30 * 100) / 100; // Extrapolate to 30 days, round to cents
}

// Calculate remaining budget (budget minus current spending)
export function getSavings(budget: number, transactions: Transaction[]): number {
  return Math.round((budget - getSpendingTotal(transactions)) * 100) / 100;
}

// Calculate total spending for a specific category (case-insensitive)
export function getCategoryTotal(transactions: Transaction[], category: string): number {
  return transactions
    .filter(t => t.category.toLowerCase() === category.toLowerCase())
    .reduce((sum, t) => sum + t.amount, 0);
}

// ── ANOMALY DETECTION ──────────────────────────────────────────────────────
// Flag transactions that are significantly higher than category averages
// Used to identify potentially suspicious or unusual spending patterns
export function flagAnomalies(transactions: Transaction[]): Transaction[] {
  // Calculate average spending per category
  const categoryAvgs: Record<string, { total: number; count: number }> = {};
  transactions.forEach(t => {
    if (!categoryAvgs[t.category]) {
      categoryAvgs[t.category] = { total: 0, count: 0 };
    }
    categoryAvgs[t.category].total += t.amount;
    categoryAvgs[t.category].count++;
  });

  // Flag transactions that are more than 2x the category average
  return transactions.map(t => {
    const avg = categoryAvgs[t.category].total / categoryAvgs[t.category].count;
    return { ...t, flagged: t.amount > avg * 2 };
  });
}
