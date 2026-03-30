// Transactions Page Component - Transaction History Management
// This component provides a comprehensive interface for viewing and managing financial transactions
// Features include:
// - Search functionality across description, category, and date
// - Sortable columns (date, amount, category, description)
// - Inline editing of transaction amount and category
// - Delete transactions with confirmation
// - Flagged transaction indicators for suspicious activity
// - Responsive table layout with mobile-friendly design

import { useState, useMemo } from "react";
import { Search, ArrowUpDown, AlertTriangle, Check, X, Trash2, Pencil } from "lucide-react";
import { useTransactions, useUpdateTransaction, useDeleteTransaction } from "@/hooks/use-transactions";
import { useCurrency } from "@/contexts/CurrencyContext";

// ── TYPE DEFINITIONS ───────────────────────────────────────────────────────
// Sort key options for table columns
type SortKey = "date" | "amount" | "category" | "description";
// Sort direction options
type SortDir = "asc" | "desc";

// ── CONSTANTS ──────────────────────────────────────────────────────────────
// Available transaction categories for editing
const CATEGORIES = ["Food", "Transport", "Shopping", "Entertainment", "Bills", "Health", "Education", "Other"];

// ── COMPONENT DEFINITION ───────────────────────────────────────────────────
export default function Transactions() {
  // ── HOOKS AND DATA FETCHING ───────────────────────────────────────────────
  const { data: transactions = [], isLoading } = useTransactions(); // Fetch all user transactions
  const updateTransaction = useUpdateTransaction(); // Mutation hook for updating transactions
  const deleteTransaction = useDeleteTransaction(); // Mutation hook for deleting transactions
  const { format } = useCurrency(); // Currency formatting utility

  // ── STATE MANAGEMENT ──────────────────────────────────────────────────────
  const [search, setSearch] = useState(""); // Search query for filtering transactions
  const [sortKey, setSortKey] = useState<SortKey>("date"); // Current sort column
  const [sortDir, setSortDir] = useState<SortDir>("desc"); // Current sort direction

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null); // ID of transaction being edited
  const [editAmount, setEditAmount] = useState(""); // Edit form amount value
  const [editCategory, setEditCategory] = useState(""); // Edit form category value

  // ── SORTING LOGIC ────────────────────────────────────────────────────────
  // Toggle sort direction or change sort key
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      // Same column clicked - toggle direction
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      // Different column clicked - set new key and default to descending
      setSortKey(key);
      setSortDir("desc");
    }
  };

  // ── INLINE EDITING FUNCTIONS ──────────────────────────────────────────────
  // Start editing a transaction
  const startEdit = (t: { id: string; amount: number; category: string }) => {
    setEditingId(t.id);
    setEditAmount(t.amount.toString());
    setEditCategory(t.category);
  };

  // Cancel editing and reset form
  const cancelEdit = () => {
    setEditingId(null);
    setEditAmount("");
    setEditCategory("");
  };

  // Save edited transaction
  const saveEdit = (id: string) => {
    const parsedAmount = parseFloat(editAmount);
    // Validate amount: must be positive finite number, max 999,999
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || parsedAmount > 999999) {
      return; // Invalid amount - don't save
    }
    updateTransaction.mutate(
      { id, amount: parsedAmount, category: editCategory },
      { onSuccess: () => cancelEdit() } // Reset edit state on success
    );
  };

  // ── FILTERING AND SORTING ────────────────────────────────────────────────
  // Filter and sort transactions based on search query and sort settings
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    // Filter transactions by search query
    let result = transactions.filter(
      (t) =>
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.date.includes(q)
    );

    // Sort filtered results
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

  // ── SORT HEADER COMPONENT ─────────────────────────────────────────────────
  // Reusable component for sortable table headers
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

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Page Header with Search */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Transaction History</h2>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} transactions</p>
        </div>

        {/* Search Input */}
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

      {/* Transactions Table */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden animate-fade-in">
        {isLoading ? (
          // Loading state
          <div className="p-12 text-center text-card-foreground/60 font-medium">Loading...</div>
        ) : filtered.length === 0 ? (
          // Empty state
          <div className="p-12 text-center text-card-foreground/60 font-medium">
            {search ? "No matching transactions found." : "No transactions yet."}
          </div>
        ) : (
          // Transaction table with horizontal scroll for mobile
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Table Header with Sortable Columns */}
              <thead>
                <tr className="text-left text-sm font-semibold text-card-foreground/60">
                  <SortHeader label="Description" field="description" />
                  <SortHeader label="Category" field="category" />
                  <SortHeader label="Date" field="date" />
                  <SortHeader label="Amount" field="amount" />
                  <th className="px-6 py-3 w-10"></th> {/* Flagged indicator column */}
                  <th className="px-6 py-3 w-28 text-right">Actions</th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {filtered.map((t) => {
                  const isEditing = editingId === t.id;
                  return (
                    <tr key={t.id} className="border-t border-border/50 hover:bg-foreground/5 transition-colors">
                      {/* Description Column */}
                      <td className="px-6 py-3 text-sm font-medium text-card-foreground">{t.description}</td>

                      {/* Category Column - Editable */}
                      <td className="px-6 py-3">
                        {isEditing ? (
                          // Edit mode: category dropdown
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
                          // View mode: category badge
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-foreground/10 text-card-foreground/70">{t.category}</span>
                        )}
                      </td>

                      {/* Date Column */}
                      <td className="px-6 py-3 text-sm text-card-foreground/60">{t.date}</td>

                      {/* Amount Column - Editable */}
                      <td className="px-6 py-3 text-sm font-bold text-card-foreground text-right">
                        {isEditing ? (
                          // Edit mode: amount input
                          <input
                            type="number"
                            value={editAmount}
                            onChange={(e) => setEditAmount(e.target.value)}
                            className="w-24 text-right text-sm font-bold bg-muted rounded-lg px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                        ) : (
                          // View mode: formatted amount
                          format(Number(t.amount))
                        )}
                      </td>

                      {/* Flagged Indicator Column */}
                      <td className="px-6 py-3">
                        {t.flagged && <AlertTriangle className="h-4 w-4 text-accent" />}
                      </td>

                      {/* Actions Column */}
                      <td className="px-6 py-3 text-right">
                        {isEditing ? (
                          // Edit mode actions: Save and Cancel buttons
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
                          // View mode actions: Edit and Delete buttons
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
