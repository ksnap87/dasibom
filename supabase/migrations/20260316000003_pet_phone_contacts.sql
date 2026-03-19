-- Ensure uuid extension is available
create extension if not exists "uuid-ossp" with schema extensions;

-- ============================================================
-- MIGRATION: 반려동물 필드 추가
-- ============================================================
alter table public.profiles
  add column if not exists has_pet boolean,
  add column if not exists pet_type text
    check (pet_type in ('dog', 'cat', 'both', 'other', 'none')),
  add column if not exists pet_friendly boolean;

-- ============================================================
-- MIGRATION: 전화번호 해시 (연락처 기반 추천 제외용)
-- ============================================================
alter table public.profiles
  add column if not exists phone_hash text;

create index if not exists idx_profiles_phone_hash on public.profiles (phone_hash);

-- ============================================================
-- CONTACT_HASHES (연락처 기반 추천 제외)
-- ============================================================
create table if not exists public.contact_hashes (
  id            uuid default gen_random_uuid() primary key,
  user_id       uuid references public.profiles(id) on delete cascade not null,
  phone_hash    text not null,
  unique (user_id, phone_hash)
);

alter table public.contact_hashes enable row level security;

-- Use DO block to avoid error if policy already exists
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_hashes' AND policyname = 'Users can manage own contact hashes'
  ) THEN
    CREATE POLICY "Users can manage own contact hashes"
      ON public.contact_hashes FOR ALL
      USING (auth.uid() = user_id);
  END IF;
END $$;

create index if not exists idx_contact_hashes_user on public.contact_hashes (user_id);
create index if not exists idx_contact_hashes_phone on public.contact_hashes (phone_hash);
