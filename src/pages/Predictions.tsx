// Predictions Page Component - AI-Powered Spending Analysis
// This component provides intelligent spending predictions and insights using AI
// Features include:
// - Weekly and monthly spending projections
// - Confidence scoring based on data availability
// - AI-generated personalized insights
// - Visual confidence meter
// - Integration with Supabase Edge Functions for AI processing

import { useEffect, useState } from "react";
import { Brain, TrendingUp, Target, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";

// ── TYPE DEFINITIONS ───────────────────────────────────────────────────────
// Interface for the prediction data returned from the AI service
interface PredictionData {
  weekEstimate: number;      // Projected spending for current week
  monthEstimate: number;     // Projected spending for current month
  typicalSpend: number;      // Average monthly spending from historical data
  confidence: string;        // Text description of prediction confidence
  dataMonths: number;        // Number of months of data analyzed
  aiInsight: string;         // AI-generated personalized insight
}

// ── COMPONENT DEFINITION ───────────────────────────────────────────────────
export default function Predictions() {
  // ── HOOKS AND STATE ───────────────────────────────────────────────────────
  const { format } = useCurrency(); // Currency formatting utility
  const [data, setData] = useState<PredictionData | null>(null); // Prediction data from AI
  const [loading, setLoading] = useState(true); // Loading state during API call
  const [error, setError] = useState(""); // Error message if API call fails

  // ── DATA FETCHING ─────────────────────────────────────────────────────────
  // Fetch spending predictions from Supabase Edge Function
  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);
      try {
        // Verify user authentication
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData.session) throw new Error("Not logged in");

        // Call the predict-spending Edge Function
        const { data: resData, error: fnError } = await supabase.functions.invoke("predict-spending", {
          body: {},
        });

        if (fnError) throw new Error(fnError.message || "Failed to load predictions");

        // Store the prediction data
        setData(resData);
      } catch (err: any) {
        setError(err.message || "Failed to load predictions");
      } finally {
        setLoading(false);
      }
    };
    fetchPredictions();
  }, []);

  // ── LOADING STATE ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Brain className="h-10 w-10 text-primary mx-auto mb-3 animate-pulse" />
          <p className="text-muted-foreground font-medium">Analyzing your spending patterns...</p>
        </div>
      </div>
    );
  }

  // ── ERROR STATE ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-card rounded-xl p-12 text-center">
        <p className="text-destructive font-medium">{error}</p>
      </div>
    );
  }

  // ── NO DATA STATE ─────────────────────────────────────────────────────────
  if (!data) return null;

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div>
      // Page Header
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" /> AI Predictions
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Smart spending projections based on your history</p>
      </div>

      // Prediction Cards Grid - Three main spending projections
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        // Weekly Estimate Card
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground/60 mb-2">
            <TrendingUp className="h-4 w-4" /> Expected This Week
          </div>
          <p className="text-2xl font-bold text-card-foreground">{format(data.weekEstimate)}</p>
          <p className="text-xs text-muted-foreground mt-1">Based on current daily average</p>
        </div>

        // Monthly Estimate Card
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground/60 mb-2">
            <Target className="h-4 w-4" /> Expected This Month
          </div>
          <p className="text-2xl font-bold text-card-foreground">{format(data.monthEstimate)}</p>
          <p className="text-xs text-muted-foreground mt-1">Projected 30-day total</p>
        </div>

        // Typical Monthly Spend Card
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground/60 mb-2">
            <ShieldCheck className="h-4 w-4" /> Typical Monthly Spend
          </div>
          <p className="text-2xl font-bold text-card-foreground">{format(data.typicalSpend)}</p>
          <p className="text-xs text-muted-foreground mt-1">Average of last 3 months</p>
        </div>
      </div>

      // Confidence Section - Shows prediction reliability
      <div className="bg-card rounded-xl p-5 shadow-sm mb-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground mb-2">
          <Brain className="h-4 w-4 text-primary" /> Prediction Confidence
        </div>
        <p className="text-sm text-card-foreground/80">{data.confidence}</p>

        // Visual confidence meter - width based on data months
        <div className="mt-3 w-full bg-muted rounded-full h-2">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, (data.dataMonths / 6) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {data.dataMonths} month{data.dataMonths !== 1 ? "s" : ""} of data analyzed
        </p>
      </div>

      // AI Insight Section - Personalized AI-generated advice
      {data.aiInsight && (
        <div className="bg-card rounded-xl p-5 shadow-sm border border-primary/20">
          <div className="flex items-center gap-2 text-sm font-bold text-card-foreground mb-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI Insight
          </div>
          <p className="text-sm text-card-foreground/80 leading-relaxed">{data.aiInsight}</p>
        </div>
      )}
    </div>
  );
}
