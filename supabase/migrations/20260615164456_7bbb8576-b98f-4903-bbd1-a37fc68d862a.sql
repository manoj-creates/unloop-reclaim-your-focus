-- 1) user_backups: stores the latest full backup blob per user (covers recovery sessions, brain history, milestones, widget layout, focus history, prefs)
CREATE TABLE IF NOT EXISTS public.user_backups (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  schema_version integer NOT NULL DEFAULT 1,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_backups TO authenticated;
GRANT ALL ON public.user_backups TO service_role;

ALTER TABLE public.user_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own backups"
  ON public.user_backups
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_backups_touch_updated_at
  BEFORE UPDATE ON public.user_backups
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) Make sure all sync tables have updated_at maintained (analytics/goals/widgets/streaks already do via default; add triggers so updates bump it)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_goals_touch_updated_at') THEN
    CREATE TRIGGER user_goals_touch_updated_at BEFORE UPDATE ON public.user_goals FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_streaks_touch_updated_at') THEN
    CREATE TRIGGER user_streaks_touch_updated_at BEFORE UPDATE ON public.user_streaks FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_analytics_touch_updated_at') THEN
    CREATE TRIGGER user_analytics_touch_updated_at BEFORE UPDATE ON public.user_analytics FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'user_widgets_touch_updated_at') THEN
    CREATE TRIGGER user_widgets_touch_updated_at BEFORE UPDATE ON public.user_widgets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_touch_updated_at') THEN
    CREATE TRIGGER profiles_touch_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
  END IF;
END $$;