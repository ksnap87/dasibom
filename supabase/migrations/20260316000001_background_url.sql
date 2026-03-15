-- 배경 사진 URL 컬럼 추가
alter table public.profiles
  add column if not exists background_url text;
