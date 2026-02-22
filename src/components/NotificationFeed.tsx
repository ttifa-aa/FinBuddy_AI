import { Bell, CheckCircle } from "lucide-react";
import { useNotifications, useDismissNotification } from "@/hooks/use-notifications";

export function NotificationFeed() {
  const { data: notifications = [] } = useNotifications();
  const dismiss = useDismissNotification();

  const recent = notifications.slice(0, 10);

  return (
    <div className="bg-card rounded-xl shadow-sm overflow-hidden animate-fade-in">
      <div className="px-6 py-4 border-b border-border flex items-center gap-2">
        <Bell className="h-4 w-4 text-card-foreground/60" />
        <h3 className="text-sm font-bold text-card-foreground">Notifications</h3>
      </div>

      {recent.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <CheckCircle className="h-8 w-8 mx-auto mb-2 text-card" style={{ color: "hsl(198, 15%, 75%)" }} />
          <p className="text-sm font-medium" style={{ color: "hsl(198, 15%, 55%)" }}>
            Your finances are on track 🎉
          </p>
          <p className="text-xs text-muted-foreground mt-1">No alerts or overspending detected</p>
        </div>
      ) : (
        <div className="divide-y divide-border/50 max-h-72 overflow-y-auto">
          {recent.map((n) => (
            <div
              key={n.id}
              className={`px-6 py-3 flex items-start gap-3 text-sm transition-opacity ${
                n.dismissed ? "opacity-50" : ""
              }`}
            >
              <div
                className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  n.level === "critical"
                    ? "bg-accent"
                    : n.level === "warning"
                    ? "bg-secondary"
                    : "bg-muted-foreground"
                }`}
              />
              <div className="flex-1 min-w-0">
                <p className="text-card-foreground leading-snug">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(n.created_at).toLocaleString()}
                </p>
              </div>
              {!n.dismissed && (
                <button
                  onClick={() => dismiss.mutate(n.id)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                >
                  dismiss
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
