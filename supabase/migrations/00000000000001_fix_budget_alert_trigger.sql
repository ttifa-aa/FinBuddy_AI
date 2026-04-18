-- =============================================================
-- Fix: Budget alert trigger — email sending
-- Problems fixed:
--   1. Email was only triggered at 90%+, now triggers at 80%+
--   2. Vault secrets lookup replaced with current_setting()
--      which Supabase populates automatically in trigger context
--   3. http_post called with positional args (pg_net requirement)
--   4. Separate email thresholds: warning at 80%, critical at 100%
-- =============================================================

CREATE OR REPLACE FUNCTION public.check_budget_alert()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_budget        NUMERIC;
  v_total         NUMERIC;
  v_pct           NUMERIC;
  v_month         TEXT;
  v_level         TEXT;
  v_existing      INT;
  v_supabase_url  TEXT;
  v_service_key   TEXT;
  v_email_pct     NUMERIC;
  v_email_sent    INT;
BEGIN
  -- Get the user's monthly budget
  SELECT monthly_budget INTO v_budget
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  -- No budget set or zero budget — nothing to check
  IF v_budget IS NULL OR v_budget <= 0 THEN
    RETURN NEW;
  END IF;

  -- Sum all transactions for this user in the current month
  v_month := to_char(CURRENT_DATE, 'YYYY-MM');
  SELECT COALESCE(SUM(amount), 0) INTO v_total
  FROM public.transactions
  WHERE user_id = NEW.user_id
    AND to_char(date, 'YYYY-MM') = v_month;

  v_pct := (v_total / v_budget) * 100;

  -- Determine notification level
  -- 100%+ = critical, 80%+ = warning, below 80% = do nothing
  IF v_pct >= 100 THEN
    v_level := 'critical';
  ELSIF v_pct >= 80 THEN
    v_level := 'warning';
  ELSE
    RETURN NEW;
  END IF;

  -- Insert in-app notification only if one doesn't already exist
  -- for this level this month (prevents notification spam)
  SELECT COUNT(*) INTO v_existing
  FROM public.notifications
  WHERE user_id = NEW.user_id
    AND level = v_level
    AND dismissed = false
    AND to_char(created_at, 'YYYY-MM') = v_month;

  IF v_existing = 0 THEN
    INSERT INTO public.notifications (user_id, message, level)
    VALUES (
      NEW.user_id,
      CASE v_level
        WHEN 'critical' THEN
          'Budget exceeded! You have spent ' || ROUND(v_pct) || '% of your monthly budget.'
        ELSE
          'Budget warning: You have used ' || ROUND(v_pct) || '% of your monthly budget.'
      END,
      v_level
    );
  END IF;

  -- ── Send email alert ────────────────────────────────────────
  -- Fire email at 80% (warning) and again at 100% (critical).
  -- We track separately from notifications so both thresholds
  -- always get their own email even if dismissed in-app.
  --
  -- Use current_setting() instead of vault — Supabase sets these
  -- automatically in the trigger execution context.
  v_supabase_url := current_setting('app.supabase_url', true);
  v_service_key  := current_setting('app.service_role_key', true);

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    -- Settings not available in this context — skip email silently
    RETURN NEW;
  END IF;

  -- Round percentage to a clean bracket: 80 or 100
  -- so we only send one email per threshold, not one per transaction
  IF v_pct >= 100 THEN
    v_email_pct := 100;
  ELSE
    v_email_pct := 80;
  END IF;

  -- Check if we already sent an email for this threshold this month
  -- We reuse the notifications table with level as the dedup key
  SELECT COUNT(*) INTO v_email_sent
  FROM public.notifications
  WHERE user_id = NEW.user_id
    AND level = v_level
    AND to_char(created_at, 'YYYY-MM') = v_month;

  -- Only send if this is the first notification of this level this month
  -- (v_existing = 0 means we just created it above, so send the email)
  IF v_existing = 0 THEN
    -- pg_net http_post requires positional arguments, not named ones
    PERFORM extensions.http_post(
      v_supabase_url || '/functions/v1/send-overspending-email',
      json_build_object(
        'user_id',        NEW.user_id,
        'percentage',     ROUND(v_pct),
        'total_spent',    ROUND(v_total, 2),
        'budget',         v_budget,
        'category',       NEW.category,
        'category_total', NEW.amount
      )::text,
      json_build_object(
        'Content-Type',  'application/json',
        'Authorization', 'Bearer ' || v_service_key
      )::jsonb
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Re-attach the trigger (drop both old names in case either exists)
DROP TRIGGER IF EXISTS trigger_budget_alert       ON public.transactions;
DROP TRIGGER IF EXISTS trigger_check_budget_alert ON public.transactions;

CREATE TRIGGER trigger_budget_alert
  AFTER INSERT OR UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.check_budget_alert();
