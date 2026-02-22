import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export interface Transaction {
  id: string;
  user_id: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  flagged: boolean;
  created_at: string;
}

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
    enabled: !!user,
  });
}

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
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

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
    enabled: !!user,
  });
}

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
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

export function getSpendingTotal(transactions: Transaction[]): number {
  return transactions.reduce((sum, t) => sum + Number(t.amount), 0);
}

export function getForecast(transactions: Transaction[]): number {
  const total = getSpendingTotal(transactions);
  const dayOfMonth = new Date().getDate();
  const dailyAvg = total / Math.max(dayOfMonth, 1);
  return Math.round(dailyAvg * 30 * 100) / 100;
}

export function getSavings(budget: number, transactions: Transaction[]): number {
  return Math.round((budget - getSpendingTotal(transactions)) * 100) / 100;
}

export function getCategoryTotal(transactions: Transaction[], category: string): number {
  return transactions
    .filter((t) => t.category.toLowerCase() === category.toLowerCase())
    .reduce((s, t) => s + Number(t.amount), 0);
}
