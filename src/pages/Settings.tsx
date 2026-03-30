// Settings Page Component - User Preferences Management
// This component provides a comprehensive settings interface for users to customize their experience
// Features include:
// - Currency selection from supported currencies
// - Monthly budget limit configuration
// - Email notification preferences (daily reminders and overspending alerts)
// - Real-time saving with success feedback
// - Form validation and error handling

import { useState, useEffect } from "react";
import { Save, DollarSign, Globe, Bell, Mail } from "lucide-react";
import { useProfile, useUpdateProfile } from "@/hooks/use-transactions";
import { SUPPORTED_CURRENCIES } from "@/contexts/CurrencyContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// ── COMPONENT DEFINITION ───────────────────────────────────────────────────
export default function Settings() {
  // ── HOOKS AND DATA FETCHING ───────────────────────────────────────────────
  const { data: profile } = useProfile(); // Fetch current user profile data
  const updateProfile = useUpdateProfile(); // Mutation hook for updating profile

  // ── FORM STATE ────────────────────────────────────────────────────────────
  const [budget, setBudget] = useState(""); // Monthly budget input value
  const [currency, setCurrency] = useState("USD"); // Selected currency code
  const [emailDailyReminders, setEmailDailyReminders] = useState(true); // Daily reminder preference
  const [emailOverspendingAlerts, setEmailOverspendingAlerts] = useState(true); // Overspending alert preference
  const [saved, setSaved] = useState(false); // Success state after saving

  // ── DATA SYNCHRONIZATION ──────────────────────────────────────────────────
  // Sync form state with profile data when it loads
  useEffect(() => {
    if (profile) {
      setBudget(profile.monthly_budget?.toString() ?? "2000");
      setCurrency((profile as any).currency ?? "USD");
      setEmailDailyReminders((profile as any).email_daily_reminders ?? true);
      setEmailOverspendingAlerts((profile as any).email_overspending_alerts ?? true);
    }
  }, [profile]);

  // ── SAVE HANDLER ──────────────────────────────────────────────────────────
  // Handle form submission with validation and error handling
  const handleSave = () => {
    const parsedBudget = parseFloat(budget);
    // Validate budget: must be a positive finite number, max 999,999
    const safeBudget = Number.isFinite(parsedBudget) && parsedBudget > 0 && parsedBudget <= 999999 ? parsedBudget : 2000;

    // Update profile with new settings
    updateProfile.mutate(
      {
        monthly_budget: safeBudget,
        currency,
        email_daily_reminders: emailDailyReminders,
        email_overspending_alerts: emailOverspendingAlerts,
      } as any,
      {
        // Show success feedback on successful save
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000); // Hide success message after 2 seconds
        },
      }
    );
  };

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your preferences</p>
      </div>

      {/* Settings Form Container */}
      <div className="bg-card rounded-xl p-6 shadow-sm space-y-6">
        {/* Currency Selection */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-card-foreground mb-2">
            <Globe className="h-4 w-4" /> Preferred Currency
          </label>
          <Select value={currency} onValueChange={setCurrency}>
            <SelectTrigger className="w-full max-w-xs bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              {/* Render all supported currencies as dropdown options */}
              {SUPPORTED_CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Budget Input */}
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

        {/* Email Notifications Section */}
        <div className="border-t border-border pt-6">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-card-foreground mb-4">
            <Mail className="h-4 w-4" /> Email Notifications
          </h3>
          <div className="space-y-4">
            {/* Daily Reminders Toggle */}
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

            {/* Overspending Alerts Toggle */}
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

        {/* Save Button with Loading States */}
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
