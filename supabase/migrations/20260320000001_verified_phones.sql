-- 본인인증 전화번호 암호화 저장 (안전 대응용)
-- 데이팅 폭력 등 긴급 상황 시 수사기관 협조용
CREATE TABLE IF NOT EXISTS verified_phones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_phone TEXT NOT NULL,  -- AES-256 암호화된 전화번호
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verification_method TEXT NOT NULL DEFAULT 'firebase_sms',
  UNIQUE(user_id)
);

-- RLS: service_role만 접근 가능 (일반 유저/anon 접근 차단)
ALTER TABLE verified_phones ENABLE ROW LEVEL SECURITY;

-- 정책 없음 = anon/authenticated 모두 접근 불가
-- service_role (백엔드)만 직접 접근 가능

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_verified_phones_user ON verified_phones(user_id);
