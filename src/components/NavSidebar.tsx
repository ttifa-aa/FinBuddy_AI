import { LayoutDashboard, CreditCard, TrendingUp, Brain, Settings, LogOut, Menu, X, Moon, Sun, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { useUnreadCount, useNotifications, useDismissNotification } from "@/hooks/use-notifications";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: CreditCard, label: "Transactions", path: "/transactions" },
  { icon: TrendingUp, label: "Forecasts", path: "/forecasts" },
  { icon: Brain, label: "Predictions", path: "/predictions" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function NavSidebar() {
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = useUnreadCount();
  const { data: notifications = [] } = useNotifications();
  const dismiss = useDismissNotification();

  const recent = notifications.slice(0, 10);

  const navContent = (
    <>
      <div className="p-6">
        <h1 className="text-xl font-bold text-secondary-foreground tracking-tight">🤖 FinBuddy</h1>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                active
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-secondary-foreground/80 hover:bg-sidebar-accent hover:text-secondary-foreground"
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-secondary-foreground/60 hover:text-secondary-foreground hover:bg-sidebar-accent transition-all"
          >
            <div className="relative">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            Notifications
            {unreadCount > 0 && (
              <span className="ml-auto bg-accent text-accent-foreground text-xs font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Notification dropdown panel */}
          {notifOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-30"
                onClick={() => setNotifOpen(false)}
              />
              <div className="absolute bottom-full left-0 mb-2 w-80 bg-card border border-border rounded-xl shadow-xl z-40 overflow-hidden">
                <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                  <span className="text-sm font-bold text-card-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {recent.length === 0 ? (
                    <div className="px-4 py-8 text-center">
                      <p className="text-sm font-medium text-muted-foreground">All clear! 🎉</p>
                      <p className="text-xs text-muted-foreground mt-1">No alerts or overspending detected</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-border/50">
                      {recent.map((n) => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 flex items-start gap-3 text-sm ${n.dismissed ? "opacity-40" : ""}`}
                        >
                          <div
                            className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                              n.level === "critical"
                                ? "bg-red-500"
                                : n.level === "warning"
                                ? "bg-yellow-500"
                                : "bg-blue-400"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-card-foreground leading-snug text-xs">{n.message}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(n.created_at).toLocaleString()}
                            </p>
                          </div>
                          {!n.dismissed && (
                            <button
                              onClick={(e) => { e.stopPropagation(); dismiss.mutate(n.id); }}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-secondary-foreground/60 hover:text-secondary-foreground hover:bg-sidebar-accent transition-all"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          {theme === "light" ? "Dark Mode" : "Light Mode"}
        </button>
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-secondary-foreground/60 hover:text-secondary-foreground hover:bg-sidebar-accent transition-all"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-secondary text-secondary-foreground lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-56 bg-secondary flex flex-col z-50 transition-transform lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-secondary-foreground/60 hover:text-secondary-foreground"
        >
          <X className="h-5 w-5" />
        </button>
        {navContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-56 bg-secondary flex-col z-20 hidden lg:flex">
        {navContent}
      </aside>
    </>
  );
}
