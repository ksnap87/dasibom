-- FCM 푸시 토큰
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fcm_token text;

-- 크레딧 컬럼
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS credits integer default 3 not null;

-- REPORTS 테이블
CREATE TABLE IF NOT EXISTS public.reports (
  id            uuid default uuid_generate_v4() primary key,
  created_at    timestamp with time zone default now(),
  reporter_id   uuid references public.profiles(id) on delete cascade not null,
  reported_id   uuid references public.profiles(id) on delete cascade not null,
  reason        text not null check (reason in ('inappropriate_photo', 'fake_profile', 'offensive_chat', 'other')),
  detail        text
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can insert own reports') THEN
    CREATE POLICY "Users can insert own reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view own reports') THEN
    CREATE POLICY "Users can view own reports" ON public.reports FOR SELECT USING (auth.uid() = reporter_id);
  END IF;
END $$;

-- BLOCKS 테이블
CREATE TABLE IF NOT EXISTS public.blocks (
  id            uuid default uuid_generate_v4() primary key,
  created_at    timestamp with time zone default now(),
  blocker_id    uuid references public.profiles(id) on delete cascade not null,
  blocked_id    uuid references public.profiles(id) on delete cascade not null,
  unique (blocker_id, blocked_id)
);

ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can manage own blocks') THEN
    CREATE POLICY "Users can manage own blocks" ON public.blocks FOR ALL USING (auth.uid() = blocker_id);
  END IF;
END $$;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_city ON public.profiles (city);
CREATE INDEX IF NOT EXISTS idx_profiles_gender ON public.profiles (gender);
CREATE INDEX IF NOT EXISTS idx_profiles_birth_year ON public.profiles (birth_year);
CREATE INDEX IF NOT EXISTS idx_interests_from ON public.interests (from_user_id);
CREATE INDEX IF NOT EXISTS idx_interests_to ON public.interests (to_user_id);
CREATE INDEX IF NOT EXISTS idx_matches_user1 ON public.matches (user1_id);
CREATE INDEX IF NOT EXISTS idx_matches_user2 ON public.matches (user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_match ON public.messages (match_id, created_at);
