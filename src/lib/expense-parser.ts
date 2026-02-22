// Client-side NLP-like expense parser
// Parses strings like "Spent 500 on pizza" into structured data

export interface ParsedExpense {
  amount: number;
  category: string;
  description: string;
  date: string;
  confidence: number;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: ["food", "pizza", "burger", "lunch", "dinner", "breakfast", "coffee", "restaurant", "eat", "meal", "groceries", "snack", "sushi", "takeout"],
  Transport: ["uber", "lyft", "taxi", "gas", "fuel", "bus", "train", "metro", "parking", "toll", "ride", "flight", "travel"],
  Shopping: ["clothes", "shoes", "amazon", "shopping", "store", "mall", "buy", "purchase", "order"],
  Entertainment: ["movie", "netflix", "spotify", "game", "concert", "show", "ticket", "fun", "bar", "club", "party"],
  Bills: ["rent", "electric", "water", "internet", "phone", "bill", "insurance", "subscription", "utility"],
  Health: ["doctor", "medicine", "pharmacy", "gym", "hospital", "dental", "health", "medical", "therapy"],
  Education: ["book", "course", "school", "tuition", "class", "training", "learn"],
  Other: [],
};

export function parseExpense(input: string): ParsedExpense | null {
  const text = input.toLowerCase().trim();

  // Extract amount - look for numbers (with optional $ or currency)
  const amountMatch = text.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1]);
  if (amount <= 0 || amount > 1_000_000) return null;

  // Determine category from keywords
  let category = "Other";
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw) && kw.length > bestScore) {
        category = cat;
        bestScore = kw.length;
      }
    }
  }

  // Extract a description (everything after "on", "for", "at", or just the non-number part)
  const descMatch = text.match(/(?:on|for|at)\s+(.+?)(?:\s+\d|\s*$)/i);
  const description = descMatch ? descMatch[1].trim() : text.replace(/\$?\s*\d+(?:\.\d{1,2})?/, "").replace(/spent|paid|bought/gi, "").trim();

  const today = new Date().toISOString().split("T")[0];

  return {
    amount,
    category,
    description: description || category.toLowerCase(),
    date: today,
    confidence: bestScore > 0 ? 0.85 : 0.5,
  };
}

// Simple query parser for questions about spending
export interface SpendingQuery {
  type: "category_total" | "period_total" | "unknown";
  category?: string;
  period?: "today" | "week" | "month";
}

export function parseQuery(input: string): SpendingQuery {
  const text = input.toLowerCase();

  let category: string | undefined;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (text.includes(kw)) {
        category = cat;
        break;
      }
    }
    if (category) break;
  }

  let period: "today" | "week" | "month" | undefined;
  if (text.includes("today")) period = "today";
  else if (text.includes("week")) period = "week";
  else if (text.includes("month")) period = "month";

  if (text.includes("how much") || text.includes("total") || text.includes("spend") || text.includes("spent")) {
    return { type: "category_total", category, period: period || "month" };
  }

  return { type: "unknown" };
}
