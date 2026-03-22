import { useEffect, useState } from "react";
import { Brain, TrendingUp, Target, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/contexts/CurrencyContext";

interface PredictionData {
  weekEstimate: number;
  monthEstimate: number;
  typicalSpend: number;
  confidence: string;
  dataMonths: number;
  aiInsight: string;
}

export default function Predictions() {
  const { format } = useCurrency();
  const [data, setData] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPredictions = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error("Not logged in");

        const res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/predict-spending`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${session.access_token}`,
              "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
          }
        );

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Failed to load predictions");
        }
        const resData = await res.json();
        setData(resData);
      } catch (err: any) {
        setError(err.message || "Failed to load predictions");
      } finally {
        setLoading(false);
      }
    };
    fetchPredictions();
  }, []);

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

  if (error) {
    return (
      <div className="bg-card rounded-xl p-12 text-center">
        <p className="text-destructive font-medium">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" /> AI Predictions
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Smart spending projections based on your history</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
        <div className="bg-card rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground/60 mb-2">
            <TrendingUp className="h-4 w-4" /> Expected This Week
          </div>
          <p className="text-2xl font-bold text-card-foreground">{format(data.weekEstimate)}</p>
          <p className="text-xs text-muted-foreground mt-1">Based on current daily average</p>
        </div>

        <div className="bg-card rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground/60 mb-2">
            <Target className="h-4 w-4" /> Expected This Month
          </div>
          <p className="text-2xl font-bold text-card-foreground">{format(data.monthEstimate)}</p>
          <p className="text-xs text-muted-foreground mt-1">Projected 30-day total</p>
        </div>

        <div className="bg-card rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground/60 mb-2">
            <ShieldCheck className="h-4 w-4" /> Typical Monthly Spend
          </div>
          <p className="text-2xl font-bold text-card-foreground">{format(data.typicalSpend)}</p>
          <p className="text-xs text-muted-foreground mt-1">Average of last 3 months</p>
        </div>
      </div>

      {/* Confidence */}
      <div className="bg-card rounded-xl p-5 shadow-sm mb-6">
        <div className="flex items-center gap-2 text-sm font-semibold text-card-foreground mb-2">
          <Brain className="h-4 w-4 text-primary" /> Prediction Confidence
        </div>
        <p className="text-sm text-card-foreground/80">{data.confidence}</p>
        <div className="mt-3 w-full bg-muted rounded-full h-2">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${Math.min(100, (data.dataMonths / 6) * 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">{data.dataMonths} month{data.dataMonths !== 1 ? "s" : ""} of data analyzed</p>
      </div>

      {/* AI Insight */}
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
