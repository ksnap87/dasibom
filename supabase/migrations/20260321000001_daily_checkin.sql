-- 출석 체크 테이블
CREATE TABLE IF NOT EXISTS daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
  streak INT NOT NULL DEFAULT 1,
  reward_credits INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, checkin_date)
);

CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON daily_checkins(user_id, checkin_date DESC);

-- 출석 체크 함수 (중복 방지 + 연속 출석 계산 + 보상)
CREATE OR REPLACE FUNCTION daily_checkin(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  today DATE := CURRENT_DATE;
  yesterday DATE := CURRENT_DATE - 1;
  prev_streak INT := 0;
  new_streak INT;
  reward INT;
  already_checked BOOLEAN;
  total_credits INT;
BEGIN
  -- 오늘 이미 체크인했는지 확인
  SELECT EXISTS(
    SELECT 1 FROM daily_checkins WHERE user_id = p_user_id AND checkin_date = today
  ) INTO already_checked;

  IF already_checked THEN
    -- 이미 체크인함 → 현재 정보 반환
    SELECT streak, reward_credits INTO new_streak, reward
    FROM daily_checkins WHERE user_id = p_user_id AND checkin_date = today;

    SELECT credits INTO total_credits FROM profiles WHERE id = p_user_id;

    RETURN jsonb_build_object(
      'already_checked', true,
      'streak', new_streak,
      'reward', reward,
      'credits', total_credits
    );
  END IF;

  -- 어제 출석했는지 확인 (연속 출석)
  SELECT streak INTO prev_streak
  FROM daily_checkins WHERE user_id = p_user_id AND checkin_date = yesterday;

  IF prev_streak IS NULL THEN
    new_streak := 1;
  ELSE
    new_streak := prev_streak + 1;
  END IF;

  -- 보상 계산 (연속 출석 보너스)
  -- 1~6일: 0 크레딧, 7일: 1 크레딧, 14일: 2 크레딧, 30일: 3 크레딧
  IF new_streak >= 30 AND (new_streak % 30) = 0 THEN
    reward := 3;
  ELSIF new_streak >= 14 AND (new_streak % 14) = 0 THEN
    reward := 2;
  ELSIF new_streak >= 7 AND (new_streak % 7) = 0 THEN
    reward := 1;
  ELSE
    reward := 0;
  END IF;

  -- 출석 기록 저장
  INSERT INTO daily_checkins (user_id, checkin_date, streak, reward_credits)
  VALUES (p_user_id, today, new_streak, reward);

  -- 크레딧 지급
  IF reward > 0 THEN
    UPDATE profiles SET credits = credits + reward WHERE id = p_user_id;
  END IF;

  SELECT credits INTO total_credits FROM profiles WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'already_checked', false,
    'streak', new_streak,
    'reward', reward,
    'credits', total_credits
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
