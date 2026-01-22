-- ============================================
-- SPENDING CHALLENGES TABLE FOR MYLO
-- Persists user challenge progress across devices
-- ============================================

CREATE TABLE IF NOT EXISTS public.spending_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  target_days INTEGER NOT NULL DEFAULT 7,
  completed_days TEXT[] DEFAULT '{}',
  failed_days TEXT[] DEFAULT '{}',
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_spending_challenges_user_id ON public.spending_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_spending_challenges_is_active ON public.spending_challenges(is_active);
CREATE INDEX IF NOT EXISTS idx_spending_challenges_user_active ON public.spending_challenges(user_id, is_active);

-- Enable Row Level Security
ALTER TABLE public.spending_challenges ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own challenges" 
  ON public.spending_challenges FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenges" 
  ON public.spending_challenges FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges" 
  ON public.spending_challenges FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own challenges" 
  ON public.spending_challenges FOR DELETE 
  USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_spending_challenges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_spending_challenges_timestamp ON public.spending_challenges;
CREATE TRIGGER update_spending_challenges_timestamp
  BEFORE UPDATE ON public.spending_challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_spending_challenges_updated_at();

-- ============================================
-- USER SETTINGS TABLE FOR MYLO
-- Stores app preferences including haptic and notification settings
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  haptic_intensity TEXT DEFAULT 'light' CHECK (haptic_intensity IN ('off', 'light', 'medium')),
  daily_reminder_enabled BOOLEAN DEFAULT false,
  daily_reminder_time TEXT DEFAULT '20:00',
  overspending_alert_enabled BOOLEAN DEFAULT true,
  onboarding_answers JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own settings" 
  ON public.user_settings FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings" 
  ON public.user_settings FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings" 
  ON public.user_settings FOR UPDATE 
  USING (auth.uid() = user_id);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_user_settings_timestamp ON public.user_settings;
CREATE TRIGGER update_user_settings_timestamp
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_user_settings_updated_at();

-- Function to upsert user settings
CREATE OR REPLACE FUNCTION public.upsert_user_settings(
  p_user_id UUID,
  p_haptic_intensity TEXT DEFAULT NULL,
  p_daily_reminder_enabled BOOLEAN DEFAULT NULL,
  p_daily_reminder_time TEXT DEFAULT NULL,
  p_overspending_alert_enabled BOOLEAN DEFAULT NULL,
  p_onboarding_answers JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_settings_id UUID;
BEGIN
  INSERT INTO public.user_settings (
    user_id,
    haptic_intensity,
    daily_reminder_enabled,
    daily_reminder_time,
    overspending_alert_enabled,
    onboarding_answers
  )
  VALUES (
    p_user_id,
    COALESCE(p_haptic_intensity, 'light'),
    COALESCE(p_daily_reminder_enabled, false),
    COALESCE(p_daily_reminder_time, '20:00'),
    COALESCE(p_overspending_alert_enabled, true),
    p_onboarding_answers
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    haptic_intensity = COALESCE(p_haptic_intensity, user_settings.haptic_intensity),
    daily_reminder_enabled = COALESCE(p_daily_reminder_enabled, user_settings.daily_reminder_enabled),
    daily_reminder_time = COALESCE(p_daily_reminder_time, user_settings.daily_reminder_time),
    overspending_alert_enabled = COALESCE(p_overspending_alert_enabled, user_settings.overspending_alert_enabled),
    onboarding_answers = COALESCE(p_onboarding_answers, user_settings.onboarding_answers),
    updated_at = NOW()
  RETURNING id INTO v_settings_id;
  
  RETURN v_settings_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
