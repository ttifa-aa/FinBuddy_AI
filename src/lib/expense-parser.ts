// Client-side NLP-like expense parser
// Parses strings like "Spent 500 on pizza" into structured data

export interface ParsedExpense { // the result of parsing an expense input string
  amount: number;
  category: string;
  description: string;
  date: string;
  confidence: number;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {  // keywords to help determine the category of an expense based on the input text
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
  // Basic normalization
  // which means converting the input string to lowercase and trimming any leading or trailing whitespace
  const text = input.toLowerCase().trim();

  // Extract amount - look for numbers (with optional $ or currency)
  const amountMatch = text.match(/\$?\s*(\d+(?:\.\d{1,2})?)/);
  if (!amountMatch) return null;
  // Validate amount is reasonable
  const amount = parseFloat(amountMatch[1]);
  if (amount <= 0 || amount > 1_000_000) return null;

  // Determine category from keywords
  let category = "Other";
  let bestScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) { // iterate over each category and its associated keywords
    for (const kw of keywords) { // iterate over each keyword in the current category
      if (text.includes(kw) && kw.length > bestScore) { // if the input text includes the keyword 
        // and the length of the keyword is greater than the best score found so far
        category = cat;
        bestScore = kw.length;

      }
    }
  }

  // Extract a description (everything after "on", "for", "at", or just the non-number part)
  const descMatch = text.match(/(?:on|for|at)\s+(.+?)(?:\s+\d|\s*$)/i);
  const description = descMatch ? descMatch[1].trim() : text.replace(/\$?\s*\d+(?:\.\d{1,2})?/, "").replace(/spent|paid|bought/gi, "").trim(); // if a description is found after "on", "for", or "at", use that;
  // otherwise, remove the amount and common verbs to get a basic description

  const today = new Date().toISOString().split("T")[0];

  return {
    amount,
    category,
    description: description || category.toLowerCase(),
    date: today,
    confidence: bestScore > 0 ? 0.85 : 0.5,
  }; // return the structured expense data, including the amount, category, description, date, 
  // and a confidence score based on how well the input matched known categories
}

// Simple query parser for questions about spending
export interface SpendingQuery {
  type: "category_total" | "period_total" | "unknown"; // the type of query, 
  // which can be a request for total spending in a category, 
  // total spending in a time period, or an unknown query
  category?: string;
  period?: "today" | "week" | "month";
}

export function parseQuery(input: string): SpendingQuery {
  const text = input.toLowerCase(); // normalize the input text to lowercase for easier matching

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

  let period: "today" | "week" | "month" | undefined; // determine the time period mentioned in the query, if any
  if (text.includes("today")) period = "today";
  else if (text.includes("week")) period = "week";
  else if (text.includes("month")) period = "month";

  if (text.includes("how much") || text.includes("total") || text.includes("spend") || text.includes("spent")) {
    return { type: "category_total", category, period: period || "month" };
  }

  return { type: "unknown" };
}
