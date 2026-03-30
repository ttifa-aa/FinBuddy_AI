// Expense Parser Library - Natural Language Processing for Financial Data
// This module provides NLP-like parsing capabilities for expense tracking
// Converts natural language inputs like "Spent $25 on coffee" into structured financial data
// Also handles spending queries like "How much did I spend on food this month?"

// ── TYPE DEFINITIONS ───────────────────────────────────────────────────────

// Structured result of parsing an expense input string
export interface ParsedExpense {
  amount: number;      // Parsed monetary amount
  category: string;    // Inferred expense category
  description: string; // Cleaned description of the expense
  date: string;        // Date in YYYY-MM-DD format (defaults to today)
  confidence: number;  // Confidence score (0-1) of the parsing accuracy
}

// ── CATEGORY CLASSIFICATION ────────────────────────────────────────────────
// Keyword mappings for automatic expense categorization
// Each category has associated keywords that help identify the expense type
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Food: ["food", "pizza", "burger", "lunch", "dinner", "breakfast", "coffee", "restaurant", "eat", "meal", "groceries", "snack", "sushi", "takeout"],
  Transport: ["uber", "lyft", "taxi", "gas", "fuel", "bus", "train", "metro", "parking", "toll", "ride", "flight", "travel"],
  Shopping: ["clothes", "shoes", "amazon", "shopping", "store", "mall", "buy", "purchase", "order"],
  Entertainment: ["movie", "netflix", "spotify", "game", "concert", "show", "ticket", "fun", "bar", "club", "party"],
  Bills: ["rent", "electric", "water", "internet", "phone", "bill", "insurance", "subscription", "utility"],
  Health: ["doctor", "medicine", "pharmacy", "gym", "hospital", "dental", "health", "medical", "therapy"],
  Education: ["book", "course", "school", "tuition", "class", "training", "learn"],
  Other: [], // Fallback category with no specific keywords
};

// ── EXPENSE PARSING FUNCTION ───────────────────────────────────────────────

// Main parsing function that converts natural language expense strings into structured data
export function parseExpense(input: string): ParsedExpense | null {
  // ── TEXT NORMALIZATION ────────────────────────────────────────────────────
  // Convert to lowercase and trim whitespace for consistent processing
  const text = input.toLowerCase().trim();

  // ── AMOUNT EXTRACTION ─────────────────────────────────────────────────────
  // Look for monetary amounts with optional currency symbols
  // Supports formats like "$25", "25.50", " 25 ", etc.
  const amountMatch = text.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (!amountMatch) return null; // No amount found = invalid input

  // Parse and validate the amount
  const amount = parseFloat(amountMatch[1]);
  if (amount <= 0 || amount > 1_000_000) return null; // Reasonable bounds check

  // ── CATEGORY CLASSIFICATION ───────────────────────────────────────────────
  // Find the best matching category based on keyword presence
  let category = "Other"; // Default fallback
  let bestScore = 0;     // Track best keyword match (longer = more specific)

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      // Check if keyword appears in text and if it's more specific than previous matches
      if (text.includes(keyword) && keyword.length > bestScore) {
        category = cat;
        bestScore = keyword.length; // Prefer longer, more specific keywords
      }
    }
  }

  // ── DESCRIPTION EXTRACTION ────────────────────────────────────────────────
  // Try to extract description using common prepositions
  const descMatch = text.match(/(?:on|for|at)\s+(.+?)(?:\s+\d|\s*$)/i);
  const description = descMatch
    ? descMatch[1].trim() // Use text after "on/for/at"
    : text
        .replace(/\$?\s*\d+(?:\.\d{1,2})?/, "") // Remove amount
        .replace(/spent|paid|bought/gi, "")     // Remove common verbs
        .trim();

  // ── DATE AND CONFIDENCE ───────────────────────────────────────────────────
  const today = new Date().toISOString().split("T")[0]; // Current date in YYYY-MM-DD

  return {
    amount,
    category,
    description: description || category.toLowerCase(), // Fallback to category name
    date: today,
    confidence: bestScore > 0 ? 0.85 : 0.5, // Higher confidence if keyword matched
  };
}

// ── QUERY PARSING ──────────────────────────────────────────────────────────

// Structure for parsed spending queries (e.g., "How much on food this month?")
export interface SpendingQuery {
  type: "category_total" | "period_total" | "unknown"; // Query type classification
  category?: string;    // Specific category if mentioned
  period?: "today" | "week" | "month"; // Time period if specified
}

// Parse natural language queries about spending patterns
export function parseQuery(input: string): SpendingQuery {
  const text = input.toLowerCase(); // Normalize for matching

  // ── CATEGORY DETECTION ────────────────────────────────────────────────────
  // Find mentioned category using the same keyword mapping
  let category: string | undefined;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        category = cat;
        break;
      }
    }
    if (category) break; // Stop at first category match
  }

  // ── TIME PERIOD DETECTION ─────────────────────────────────────────────────
  // Identify time periods mentioned in the query
  let period: "today" | "week" | "month" | undefined;
  if (text.includes("today")) period = "today";
  else if (text.includes("week")) period = "week";
  else if (text.includes("month")) period = "month";

  // ── QUERY TYPE CLASSIFICATION ─────────────────────────────────────────────
  // Determine if this is a spending total query
  if (text.includes("how much") || text.includes("total") || text.includes("spend") || text.includes("spent")) {
    return {
      type: "category_total",
      category,
      period: period || "month" // Default to month if no period specified
    };
  }

  // Unknown or unsupported query type
  return { type: "unknown" };
}
