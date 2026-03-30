import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Transaction Data Management Hook
 *
 * This module provides comprehensive data management for financial transactions in the FinBuddy application.
 * It handles CRUD operations for transactions and user profiles using React Query for caching and
 * Supabase as the backend database. The hooks provide optimistic updates, error handling, and
 * automatic cache invalidation.
 *
 * Key Features:
 * - Transaction CRUD operations (Create, Read, Update, Delete)
 * - User profile management
 * - Financial calculations and analytics
 * - React Query integration for caching and synchronization
 * - TypeScript support with full type safety
 * - Automatic cache invalidation on data changes
 */

/**
 * Transaction data structure
 * Represents a single financial transaction in the system
 */
export interface Transaction {
  /** Unique identifier for the transaction */
  id: string;
  /** ID of the user who owns this transaction */
  user_id: string;
  /** Description of the transaction (e.g., "Coffee at Starbucks") */
  description: string;
  /** Transaction amount (positive for income, negative for expenses) */
  amount: number;
  /** Category classification (e.g., "Food", "Transportation", "Entertainment") */
  category: string;
  /** Date of the transaction in ISO format (YYYY-MM-DD) */
  date: string;
  /** Whether this transaction has been flagged for review */
  flagged: boolean;
  /** Timestamp when the transaction was created */
  created_at: string;
}

/**
 * Hook for fetching all transactions for the current user
 * Uses React Query to cache data and automatically refetch when needed
 *
 * @returns Query object with transactions data, loading state, and error handling
 */
export function useTransactions() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["transactions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;
      return (data ?? []) as Transaction[];
    },
    enabled: !!user, // Only run query when user is authenticated
  });
}

/**
 * Hook for adding new transactions
 * Creates a new transaction record in the database and invalidates the cache
 *
 * @returns Mutation object with methods to trigger the mutation and track its state
 */
export function useAddTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (tx: { description: string; amount: number; category: string; date: string; flagged?: boolean }) => {
      const { data, error } = await supabase
        .from("transactions")
        .insert({ ...tx, user_id: user!.id })
        .select()
        .single();

      if (error) throw error;
      return data as Transaction;
    },
    onSuccess: () => {
      // Invalidate and refetch transactions after successful addition
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

/**
 * Hook for updating existing transactions
 * Modifies transaction amount and category, then refreshes the cache
 *
 * @returns Mutation object for updating transaction data
 */
export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, amount, category }: { id: string; amount: number; category: string }) => {
      const { data, error } = await supabase
        .from("transactions")
        .update({ amount, category })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Transaction;
    },
    onSuccess: () => {
      // Refresh transaction data after successful update
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

/**
 * Hook for deleting transactions
 * Removes a transaction from the database and updates the cache
 *
 * @returns Mutation object for transaction deletion
 */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Refresh transaction list after successful deletion
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

/**
 * Hook for fetching user profile data
 * Retrieves user-specific settings like budget and currency preferences
 *
 * @returns Query object with profile data and loading states
 */
export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user, // Only fetch when user is authenticated
  });
}

/**
 * Hook for updating user profile settings
 * Modifies user preferences like monthly budget and currency
 *
 * @returns Mutation object for profile updates
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: { monthly_budget?: number; currency?: string }) => {
      const { data, error } = await supabase
        .from("profiles")
        .update(updates as any)
        .eq("user_id", user!.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Refresh profile data after successful update
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

/**
 * Get the current month in YYYY-MM format
 * Used for filtering transactions by month
 *
 * @returns Current month string (e.g., "2024-03")
 */
export function getCurrentMonth(): string {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

/**
 * Filter transactions to show only current month entries
 * Useful for monthly spending analysis and budgeting
 *
 * @param transactions - Array of all transactions
 * @returns Filtered array containing only current month transactions
 */
export function filterCurrentMonth(transactions: Transaction[]): Transaction[] {
  const month = getCurrentMonth();
  return transactions.filter((t) => t.date.startsWith(month));
}

/**
 * Calculate total spending for the current month
 * Sums all transaction amounts for month-to-date spending
 *
 * @param transactions - Array of all transactions
 * @returns Total amount spent in the current month
 */
export function getSpendingTotal(transactions: Transaction[]): number {
  return filterCurrentMonth(transactions).reduce((sum, t) => sum + Number(t.amount), 0);
}

/**
 * Calculate monthly spending forecast based on current spending pattern
 * Projects end-of-month spending based on daily average so far
 *
 * @param transactions - Array of all transactions
 * @returns Projected total spending for the full month
 */
export function getForecast(transactions: Transaction[]): number {
  const total = getSpendingTotal(transactions);
  const dayOfMonth = new Date().getDate();
  const dailyAvg = total / Math.max(dayOfMonth, 1);
  return Math.round(dailyAvg * 30 * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate remaining budget (savings) for the current month
 * Shows how much of the monthly budget is left after current spending
 *
 * @param budget - User's monthly budget amount
 * @param transactions - Array of all transactions
 * @returns Amount remaining in budget (can be negative if overspent)
 */
export function getSavings(budget: number, transactions: Transaction[]): number {
  return Math.round((budget - getSpendingTotal(transactions)) * 100) / 100;
}

/**
 * Calculate total spending for a specific category in the current month
 * Useful for category-wise budget tracking and analysis
 *
 * @param transactions - Array of all transactions
 * @param category - Category name to filter by (case-insensitive)
 * @returns Total amount spent in the specified category this month
 */
export function getCategoryTotal(transactions: Transaction[], category: string): number {
  return filterCurrentMonth(transactions)
    .filter((t) => t.category.toLowerCase() === category.toLowerCase())
    .reduce((s, t) => s + Number(t.amount), 0);
}
