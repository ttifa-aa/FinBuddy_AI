import { LucideIcon } from "lucide-react";
import { isValidElement, type ReactNode } from "react";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon | ReactNode;
  variant?: "default" | "warning";
}

export function MetricCard({ title, value, subtitle, icon, variant = "default" }: MetricCardProps) {
  const isReactElement = isValidElement(icon);

  return (
    <div
      className={`rounded-xl p-6 shadow-sm animate-fade-in ${
        variant === "warning"
          ? "bg-accent text-accent-foreground"
          : "bg-card text-card-foreground"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-semibold opacity-80">{title}</span>
        <div
          className={`p-2 rounded-lg ${
            variant === "warning" ? "bg-accent-foreground/10" : "bg-foreground/10"
          }`}
        >
          {isReactElement ? icon : (() => { const Icon = icon as LucideIcon; return <Icon className="h-5 w-5" />; })()}
        </div>
      </div>
      <p className="text-3xl font-bold tracking-tight">{value}</p>
      <p className="text-sm opacity-60 mt-1 font-medium">{subtitle}</p>
    </div>
  );
}
