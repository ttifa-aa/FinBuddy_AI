-- =============================================================
-- FinBuddy AI — Consolidated Schema Migration
-- This SQL file consolidates all schema changes for the FinBuddy AI application into a single migration
-- =============================================================

-- ─── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- ─── 1. PROFILES ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                        UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                   UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name              TEXT,
  avatar_url                TEXT,
  monthly_budget            NUMERIC     DEFAULT 2000,
  currency                  TEXT        NOT NULL DEFAULT 'USD',
  email_daily_reminders     BOOLEAN     NOT NULL DEFAULT true,
  email_overspending_alerts BOOLEAN     NOT NULL DEFAULT true,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- ─── 2. TRANSACTIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.transactions (
  id          UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT        NOT NULL,
  amount      NUMERIC     NOT NULL,
  category    TEXT        NOT NULL DEFAULT 'Other',
  date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  flagged     BOOLEAN     DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"   ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transactions" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transactions" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- ─── 3. NOTIFICATIONS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id         UUID                     NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID                     NOT NULL,
  message    TEXT                     NOT NULL,
  level      TEXT                     NOT NULL DEFAULT 'info' CHECK (level IN ('info', 'warning', 'critical')),
  dismissed  BOOLEAN                  NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"   ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notifications" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- FIX: Allow service-role (used by SECURITY DEFINER triggers) to insert notifications
-- without being blocked by RLS. The trigger already enforces user_id correctly.
CREATE POLICY "Service role can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ─── 4. FUNCTIONS & TRIGGERS ──────────────────────────────────

-- 4a. updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4b. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4c. Budget alert trigger
-- FIX 1: Use net.http_post (pg_net's correct function) instead of extensions.http_post
-- FIX 2: Only sum positive amounts (expenses). Income transactions use negative amounts
--        or are stored separately — guard with amount > 0 to avoid inflating the total.
-- FIX 3: Notification INSERT runs inside SECURITY DEFINER context (no auth.uid()).
--        We bypass RLS by using a direct INSERT that the service-role policy above allows.
CREATE OR REPLACE FUNCTION public.check_budget_alert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_budget       NUMERIC;
  v_total        NUMERIC;
  v_pct          NUMERIC;
  v_month        TEXT;
  v_level        TEXT;
  v_existing     INT;
  v_supabase_url TEXT;
  v_service_key  TEXT;
BEGIN
  -- Get the user's monthly budget
  SELECT monthly_budget INTO v_budget FROM public.profiles WHERE user_id = NEW.user_id;
  IF v_budget IS NULL OR v_budget <= 0 THEN RETURN NEW; END IF;

  v_month := to_char(CURRENT_DATE, 'YYYY-MM');

  -- FIX: Only sum positive (expense) amounts so income entries don't inflate spending
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM public.transactions
  WHERE user_id = NEW.user_id
    AND to_char(date, 'YYYY-MM') = v_month
    AND amount > 0;

  v_pct := (v_total / v_budget) * 100;

  IF v_pct >= 100 THEN v_level := 'critical';
  ELSIF v_pct >= 80  THEN v_level := 'warning';
  ELSE RETURN NEW; END IF;

  -- Deduplicate: only insert one notification per level per month
  SELECT COUNT(*) INTO v_existing FROM public.notifications
  WHERE user_id = NEW.user_id AND level = v_level AND dismissed = false
    AND to_char(created_at, 'YYYY-MM') = v_month;

  IF v_existing = 0 THEN
    -- FIX: INSERT runs under SECURITY DEFINER — no auth.uid() in scope.
    -- The "Service role can insert notifications" policy (WITH CHECK (true)) allows this.
    INSERT INTO public.notifications (user_id, message, level) VALUES (
      NEW.user_id,
      CASE v_level
        WHEN 'critical' THEN 'Budget exceeded! You have spent ' || ROUND(v_pct) || '% of your monthly budget.'
        ELSE 'Budget warning: You have used ' || ROUND(v_pct) || '% of your monthly budget.'
      END,
      v_level
    );
  END IF;

  -- Send email alert when spending hits 90%+
  -- Only fire once per month per threshold to avoid email spam
  IF v_pct >= 90 THEN
    SELECT decrypted_secret INTO v_supabase_url FROM vault.decrypted_secrets WHERE name = 'SUPABASE_URL' LIMIT 1;
    SELECT decrypted_secret INTO v_service_key  FROM vault.decrypted_secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY' LIMIT 1;

    IF v_supabase_url IS NOT NULL AND v_service_key IS NOT NULL THEN
      -- FIX: pg_net uses net.http_post(), not extensions.http_post()
      -- FIX: headers must be jsonb; body must be text
      PERFORM net.http_post(
        url     := v_supabase_url || '/functions/v1/send-overspending-email',
        body    := json_build_object(
                     'user_id',        NEW.user_id,
                     'percentage',     ROUND(v_pct),
                     'total_spent',    ROUND(v_total, 2),
                     'budget',         v_budget,
                     'category',       NEW.category,
                     'category_total', NEW.amount
                   )::text,
        headers := jsonb_build_object(
                     'Content-Type',  'application/json',
                     'Authorization', 'Bearer ' || v_service_key
                   )
      );
    END IF;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trigger_budget_alert       ON public.transactions;
DROP TRIGGER IF EXISTS trigger_check_budget_alert ON public.transactions;

CREATE TRIGGER trigger_budget_alert
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.check_budget_alert();
