-- profile_photos 테이블 생성
CREATE TABLE IF NOT EXISTS public.profile_photos (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references public.profiles(id) on delete cascade not null,
  url        text not null,
  sort_order integer default 0,
  created_at timestamp with time zone default now()
);

ALTER TABLE public.profile_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profile photos"
  ON public.profile_photos FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own photos"
  ON public.profile_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos"
  ON public.profile_photos FOR DELETE
  USING (auth.uid() = user_id);

-- Service role도 insert/delete 가능하게
CREATE POLICY "Service can manage photos"
  ON public.profile_photos FOR ALL
  USING (true)
  WITH CHECK (true);
