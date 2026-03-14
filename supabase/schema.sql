-- ============================================================
-- Tulip Dating App — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),

  -- Basic info
  name                   text not null,
  birth_year             integer not null check (birth_year >= 1940 and birth_year <= 1985),
  gender                 text check (gender in ('male', 'female')) not null,
  looking_for            text check (looking_for in ('male', 'female', 'any')) not null,
  city                   text not null,
  photo_url              text,
  bio                    text,
  questionnaire_completed boolean default false,

  -- Values
  family_importance      integer check (family_importance between 1 and 5),
  relationship_goal      text check (relationship_goal in ('marriage', 'companionship', 'friendship', 'open')),

  -- Personality
  personality_type       text check (personality_type in ('introvert', 'extrovert', 'ambivert')),
  social_frequency       text check (social_frequency in ('rarely', 'sometimes', 'often', 'very_often')),

  -- Hobbies
  hobbies                text[] default '{}',

  -- Religion
  religion               text check (religion in ('none', 'buddhism', 'christianity', 'catholicism', 'other')),
  religion_importance    integer check (religion_importance between 1 and 5),

  -- Financial
  financial_stability    text check (financial_stability in ('stable', 'comfortable', 'wealthy')),

  -- Health
  health_status          text check (health_status in ('excellent', 'good', 'fair', 'managing')),
  exercise_frequency     text check (exercise_frequency in ('never', 'rarely', 'sometimes', 'regularly')),
  smoking                text check (smoking in ('never', 'quit', 'occasionally', 'regularly')),
  drinking               text check (drinking in ('never', 'rarely', 'socially', 'regularly')),

  -- Living
  living_situation       text check (living_situation in ('alone', 'with_family', 'with_children', 'other')),
  willing_to_relocate    boolean,

  -- Family
  has_children           boolean,
  children_count         integer,
  children_living_together boolean,
  wants_more_children    boolean,

  -- Partner preferences
  age_min                integer,
  age_max                integer
);

-- RLS
alter table public.profiles enable row level security;

create policy "Authenticated users can view profiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function update_updated_at();

-- ============================================================
-- INTERESTS (likes / passes)
-- ============================================================
create table public.interests (
  id            uuid default uuid_generate_v4() primary key,
  created_at    timestamp with time zone default now(),
  from_user_id  uuid references public.profiles(id) on delete cascade not null,
  to_user_id    uuid references public.profiles(id) on delete cascade not null,
  is_liked      boolean not null,
  unique (from_user_id, to_user_id)
);

alter table public.interests enable row level security;

create policy "Users can view own interests"
  on public.interests for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);

create policy "Users can insert own interests"
  on public.interests for insert
  with check (auth.uid() = from_user_id);

create policy "Users can update own interests"
  on public.interests for update
  using (auth.uid() = from_user_id);

-- ============================================================
-- MATCHES (mutual likes)
-- ============================================================
create table public.matches (
  id                  uuid default uuid_generate_v4() primary key,
  created_at          timestamp with time zone default now(),
  user1_id            uuid references public.profiles(id) on delete cascade not null,
  user2_id            uuid references public.profiles(id) on delete cascade not null,
  compatibility_score integer check (compatibility_score between 0 and 100),
  unique (user1_id, user2_id)
);

alter table public.matches enable row level security;

create policy "Users can view their matches"
  on public.matches for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);

create policy "Service role can insert matches"
  on public.matches for insert
  with check (true); -- backend uses service key

create policy "Service role can update matches"
  on public.matches for update
  using (true);

-- ============================================================
-- MESSAGES
-- ============================================================
create table public.messages (
  id         uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default now(),
  match_id   uuid references public.matches(id) on delete cascade not null,
  sender_id  uuid references public.profiles(id) on delete cascade not null,
  content    text not null,
  read_at    timestamp with time zone
);

alter table public.messages enable row level security;

create policy "Match members can view messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

create policy "Match members can send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
  );

create policy "Recipient can mark read"
  on public.messages for update
  using (
    exists (
      select 1 from public.matches m
      where m.id = match_id
        and (m.user1_id = auth.uid() or m.user2_id = auth.uid())
    )
    and auth.uid() != sender_id
  );

-- ============================================================
-- PROFILE PHOTOS (multiple photos per user)
-- ============================================================
create table public.profile_photos (
  id         uuid default uuid_generate_v4() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  url        text not null,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

alter table public.profile_photos enable row level security;

create policy "Users can view all profile photos"
  on public.profile_photos for select
  using (auth.role() = 'authenticated');

create policy "Users can insert own photos"
  on public.profile_photos for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own photos"
  on public.profile_photos for delete
  using (auth.uid() = user_id);

-- ============================================================
-- SUPABASE STORAGE SETUP (run in Supabase Dashboard > SQL Editor)
-- ============================================================
-- 1. Create bucket 'profile-photos' (public: true) in Storage settings
-- 2. Run these RLS policies for the storage bucket:
--
-- allow authenticated users to upload to their own folder:
-- CREATE POLICY "Users upload own photos"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
--
-- allow public read:
-- CREATE POLICY "Public read profile photos"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'profile-photos');
--
-- allow users to delete their own photos:
-- CREATE POLICY "Users delete own photos"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'profile-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================================
-- REALTIME (Supabase Dashboard > Database > Replication 에서 활성화)
-- ============================================================
-- messages 테이블에 Realtime 활성화 필요:
-- 1. Supabase Dashboard > Database > Replication 이동
-- 2. "supabase_realtime" publication에 messages 테이블 추가
-- 또는 아래 SQL 실행:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================================
-- MIGRATION: 성격&감성 + 일상&생활 질문 확장 (신규 컬럼)
-- Supabase Dashboard > SQL Editor에서 실행
-- ============================================================
-- 성격 & 감성 신규 필드
alter table public.profiles
  add column if not exists emotional_expression text
    check (emotional_expression in ('suppress', 'delayed_share', 'expressive')),
  add column if not exists communication_style text
    check (communication_style in ('listener', 'balanced', 'talker')),
  add column if not exists conflict_style text
    check (conflict_style in ('space', 'direct', 'accommodate'));

-- 일상 & 생활 신규 필드
alter table public.profiles
  add column if not exists chronotype text
    check (chronotype in ('morning', 'evening', 'flexible')),
  add column if not exists rest_style text
    check (rest_style in ('home', 'light_out', 'active')),
  add column if not exists meal_style text
    check (meal_style in ('regular', 'flexible', 'cook', 'dine_out'));

-- ============================================================
-- INDEXES
-- ============================================================
create index on public.profiles (city);
create index on public.profiles (gender);
create index on public.profiles (birth_year);
create index on public.interests (from_user_id);
create index on public.interests (to_user_id);
create index on public.matches (user1_id);
create index on public.matches (user2_id);
create index on public.messages (match_id, created_at);
