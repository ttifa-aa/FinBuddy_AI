import { useState, useEffect } from "react";
import { Save, DollarSign, Globe, Bell, Mail } from "lucide-react";
import { useProfile, useUpdateProfile } from "@/hooks/use-transactions";
import { SUPPORTED_CURRENCIES } from "@/contexts/CurrencyContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function Settings() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const [budget, setBudget] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [emailDailyReminders, setEmailDailyReminders] = useState(true);
  const [emailOverspendingAlerts, setEmailOverspendingAlerts] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setBudget(profile.monthly_budget?.toString() ?? "2000");
      setCurrency((profile as any).currency ?? "USD");
      setEmailDailyReminders((profile as any).email_daily_reminders ?? true);
      setEmailOverspendingAlerts((profile as any).email_overspending_alerts ?? true);
    }
  }, [profile]);

  const handleSave = () => {
    const parsedBudget = parseFloat(budget);
    const safeBudget = Number.isFinite(parsedBudget) && parsedBudget > 0 && parsedBudget <= 999999 ? parsedBudget : 2000;
    updateProfile.mutate(
      {
        monthly_budget: safeBudget,
        currency,
        email_daily_reminders: emailDailyReminders,
        email_overspending_alerts: emailOverspendingAlerts,
      } as any,
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your preferences</p>
      </div>

      <div className="bg-card rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground mb-2">
            <Globe className="h-4 w-4" /> Preferred Currency
          </label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-full max-w-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground mb-2">
            <DollarSign className="h-4 w-4" /> Monthly Budget Limit
          </label>
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            min={0}
            className="w-full max-w-xs bg-muted rounded-lg px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Enter your monthly budget"
          />
        </div>

        <div className="border-t border-border pt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-card-foreground mb-4">
            <Mail className="h-4 w-4" /> Email Notifications
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between max-w-md">
              <div>
                <Label htmlFor="daily-reminders" className="text-sm font-medium text-card-foreground">
                  Daily Log Reminders
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Get a friendly nudge if you haven't logged expenses in 24 hours
                </p>
              </div>
              <Switch
                id="daily-reminders"
                checked={emailDailyReminders}
                onCheckedChange={setEmailDailyReminders}
              />
            </div>

            <div className="flex items-center justify-between max-w-md">
              <div>
                <Label htmlFor="overspending-alerts" className="text-sm font-medium text-card-foreground">
                  Overspending Email Alerts
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Receive urgent alerts when you exceed 90% or 100% of your budget
                </p>
              </div>
              <Switch
                id="overspending-alerts"
                checked={emailOverspendingAlerts}
                onCheckedChange={setEmailOverspendingAlerts}
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className="flex items-center gap-2 bg-primary text-primary-foreground rounded-lg px-6 py-2.5 text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saved ? "Saved!" : updateProfile.isPending ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
