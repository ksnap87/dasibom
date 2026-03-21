-- profiles 테이블에 nickname 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname text;

-- 닉네임 유니크 제약 (중복 방지)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_nickname_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_nickname_key UNIQUE (nickname);
  END IF;
END $$;

-- 닉네임 검색 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_nickname ON profiles(nickname);
