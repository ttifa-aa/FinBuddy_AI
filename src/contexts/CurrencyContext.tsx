import { createContext, useContext, type ReactNode } from "react";
import { useProfile } from "@/hooks/use-transactions";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  JPY: "¥",
  CAD: "C$",
  AUD: "A$",
  CHF: "CHF",
  CNY: "¥",
  BRL: "R$",
};

interface CurrencyContextType {
  currency: string;
  symbol: string;
  format: (amount: number) => string;
}

const CurrencyContext = createContext<CurrencyContextType>({
  currency: "USD",
  symbol: "$",
  format: (n) => `$${n.toFixed(2)}`,
});

export const useCurrency = () => useContext(CurrencyContext);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { data: profile } = useProfile();
  const currency = (profile as any)?.currency ?? "USD";
  const symbol = CURRENCY_SYMBOLS[currency] || currency;

  const format = (amount: number) => `${symbol}${amount.toFixed(2)}`;

  return (
    <CurrencyContext.Provider value={{ currency, symbol, format }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export const SUPPORTED_CURRENCIES = Object.entries(CURRENCY_SYMBOLS).map(([code, sym]) => ({
  code,
  symbol: sym,
  label: `${code} (${sym})`,
}));
