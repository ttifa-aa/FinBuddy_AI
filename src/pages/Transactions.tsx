import { useState, useMemo } from "react";
import { Search, ArrowUpDown, AlertTriangle, Check, X, Trash2, Pencil } from "lucide-react";
import { useTransactions, useUpdateTransaction, useDeleteTransaction } from "@/hooks/use-transactions";
import { useCurrency } from "@/contexts/CurrencyContext";

type SortKey = "date" | "amount" | "category" | "description";
type SortDir = "asc" | "desc";

const CATEGORIES = ["Food", "Transport", "Shopping", "Entertainment", "Bills", "Health", "Education", "Other"];

export default function Transactions() {
  const { data: transactions = [], isLoading } = useTransactions();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const { format } = useCurrency();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const startEdit = (t: { id: string; amount: number; category: string }) => {
    setEditingId(t.id);
    setEditAmount(t.amount.toString());
    setEditCategory(t.category);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount("");
    setEditCategory("");
  };

  const saveEdit = (id: string) => {
    const parsedAmount = parseFloat(editAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 999999) {
      return;
    }
    updateTransaction.mutate(
      { id, amount: parsedAmount, category: editCategory },
      { onSuccess: () => cancelEdit() }
    );
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = transactions.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.date.includes(q)
    );
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "amount") cmp = Number(a.amount) - Number(b.amount);
      else if (sortKey === "date") cmp = a.date.localeCompare(b.date);
      else if (sortKey === "category") cmp = a.category.localeCompare(b.category);
      else cmp = a.description.localeCompare(b.description);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return result;
  }, [transactions, search, sortKey, sortDir]);

  const SortHeader = ({ label, field, align }: { label: string; field: SortKey; align?: string }) => (
    <th
      className={`px-6 py-3 cursor-pointer hover:text-card-foreground transition-colors select-none ${align || ""}`}
      onClick={() => toggleSort(field)}
    >
      <span className="flex items-center gap-1">
        {label}
        <ArrowUpDown className="h-3 w-3" />
        {sortKey === field && <span className="text-xs">({sortDir})</span>}
      </span>
    </th>
  );

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Transaction History</h2>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} transactions</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full bg-muted rounded-lg pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-sm overflow-hidden animate-fade-in">
        {isLoading ? (
          <div className="p-12 text-center text-card-foreground/60 font-medium">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-card-foreground/60 font-medium">
            {search ? "No matching transactions found." : "No transactions yet."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm font-semibold text-card-foreground/60">
                  <SortHeader label="Description" field="description" />
                  <SortHeader label="Category" field="category" />
                  <SortHeader label="Date" field="date" />
                  <SortHeader label="Amount" field="amount" />
                  <th className="px-6 py-3 w-10"></th>
                  <th className="px-6 py-3 w-28 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const isEditing = editingId === t.id;
                  return (
                    <tr key={t.id} className="border-t border-border/50 hover:bg-foreground/5 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-card-foreground">{t.description}</td>
                      <td className="px-6 py-3">
                        {isEditing ? (
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="text-xs font-semibold px-2 py-1 rounded-lg bg-muted text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            {CATEGORIES.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-foreground/10 text-card-foreground/70">{t.category}</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-sm text-card-foreground/60">{t.date}</td>
                      <td className="px-6 py-3 text-sm font-bold text-card-foreground text-right">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-24 text-right text-sm font-bold bg-muted rounded-lg px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        ) : (
                          format(Number(t.amount))
                        )}
                      </td>
                      <td className="px-6 py-3">{t.flagged && <AlertTriangle className="h-4 w-4 text-accent" />}</td>
                      <td className="px-6 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => saveEdit(t.id)}
                              disabled={updateTransaction.isPending}
                              className="p-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                              title="Save"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                              title="Cancel"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => startEdit(t)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => deleteTransaction.mutate(t.id)}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-muted transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
