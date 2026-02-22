import { AlertTriangle } from "lucide-react";
import type { Transaction } from "@/hooks/use-transactions";
import { useCurrency } from "@/contexts/CurrencyContext";

interface TransactionTableProps {
  transactions: Transaction[];
}

export function TransactionTable({ transactions }: TransactionTableProps) {
  const { format } = useCurrency();

  return (
    <div className="bg-card rounded-xl shadow-sm overflow-hidden animate-fade-in">
      <div className="px-6 py-4 border-b border-border">
        <h3 className="text-lg font-bold text-card-foreground">Recent Transactions</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm font-semibold text-card-foreground/60">
              <th className="px-6 py-3">Description</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3 text-right">Amount</th>
              <th className="px-6 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-t border-border/50 hover:bg-foreground/5 transition-colors">
                <td className="px-6 py-3 text-sm font-medium text-card-foreground">{t.description}</td>
                <td className="px-6 py-3">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-foreground/10 text-card-foreground/70">{t.category}</span>
                </td>
                <td className="px-6 py-3 text-sm text-card-foreground/60">{t.date}</td>
                <td className="px-6 py-3 text-sm font-bold text-card-foreground text-right">{format(Number(t.amount))}</td>
                <td className="px-6 py-3">{t.flagged && <AlertTriangle className="h-4 w-4 text-accent" />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
