import { X, AlertTriangle, ShieldAlert, CheckCircle } from "lucide-react";
import { useNotifications, useDismissNotification } from "@/hooks/use-notifications";

export function AlertBanner() {
  const { data: notifications = [] } = useNotifications();
  const dismiss = useDismissNotification();

  // Show only the most recent undismissed critical or warning
  const activeBanner = notifications.find(
    (n) => !n.dismissed && (n.level === "critical" || n.level === "warning")
  );

  if (!activeBanner) return null;

  const isCritical = activeBanner.level === "critical";

  return (
    <div
      className={`flex items-center justify-between gap-3 px-5 py-3 rounded-xl mb-5 text-sm font-semibold animate-fade-in ${
        isCritical
          ? "bg-accent text-accent-foreground"
          : "bg-secondary text-secondary-foreground"
      }`}
    >
      <div className="flex items-center gap-2">
        {isCritical ? <ShieldAlert className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
        {activeBanner.message}
      </div>
      <button
        onClick={() => dismiss.mutate(activeBanner.id)}
        className="p-1 rounded hover:opacity-70 transition-opacity flex-shrink-0"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
