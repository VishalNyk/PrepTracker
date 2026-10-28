-- ==============================================================================
-- Supabase Row Level Security (RLS) Configuration Script
-- Fixes Supabase Dashboard Security Advisor warning: "RLS is disabled"
-- ==============================================================================

-- 1. Enable Row Level Security (RLS) on all tables in public schema
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ActivityLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Milestone" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MilestoneTask" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TopicCategory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Topic" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TopicNote" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Application" ENABLE ROW LEVEL SECURITY;

-- Also enable RLS on Prisma migrations tracking table if present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_prisma_migrations') THEN
    EXECUTE 'ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;';
  END IF;
END $$;

-- 2. Clean up existing policies for idempotency (safe to re-run anytime)
DROP POLICY IF EXISTS "Users can view and update their own profile" ON public."User";
DROP POLICY IF EXISTS "Users can manage their own activity logs" ON public."ActivityLog";
DROP POLICY IF EXISTS "Users can manage their own milestones" ON public."Milestone";
DROP POLICY IF EXISTS "Users can manage their own milestone tasks" ON public."MilestoneTask";
DROP POLICY IF EXISTS "Users can manage their own topic categories" ON public."TopicCategory";
DROP POLICY IF EXISTS "Users can manage their own topics" ON public."Topic";
DROP POLICY IF EXISTS "Users can manage their own topic notes" ON public."TopicNote";
DROP POLICY IF EXISTS "Users can manage their own applications" ON public."Application";

-- 3. Define Row Level Security Policies for Authenticated Users

-- "User" table: Users can access and manage their own record
CREATE POLICY "Users can view and update their own profile"
  ON public."User"
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- "ActivityLog" table: Users can manage their own activity logs
CREATE POLICY "Users can manage their own activity logs"
  ON public."ActivityLog"
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- "Milestone" table: Users can manage their own milestones
CREATE POLICY "Users can manage their own milestones"
  ON public."Milestone"
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- "MilestoneTask" table: Users can manage tasks belonging to their milestones
CREATE POLICY "Users can manage their own milestone tasks"
  ON public."MilestoneTask"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."Milestone" m
      WHERE m.id = "MilestoneTask"."milestoneId"
        AND m."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."Milestone" m
      WHERE m.id = "MilestoneTask"."milestoneId"
        AND m."userId" = auth.uid()::text
    )
  );

-- "TopicCategory" table: Users can manage their own categories
CREATE POLICY "Users can manage their own topic categories"
  ON public."TopicCategory"
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- "Topic" table: Users can manage their own topics
CREATE POLICY "Users can manage their own topics"
  ON public."Topic"
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- "TopicNote" table: Users can manage notes belonging to their topics
CREATE POLICY "Users can manage their own topic notes"
  ON public."TopicNote"
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."Topic" t
      WHERE t.id = "TopicNote"."topicId"
        AND t."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."Topic" t
      WHERE t.id = "TopicNote"."topicId"
        AND t."userId" = auth.uid()::text
    )
  );

-- "Application" table: Users can manage their own job applications
CREATE POLICY "Users can manage their own applications"
  ON public."Application"
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");
