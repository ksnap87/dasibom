-- 신고 누적 페널티 시스템
-- profiles 테이블에 경고/정지 상태 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS warning_count INT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspension_reason TEXT DEFAULT NULL;

-- 신고 처리 상태 추가
ALTER TABLE reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
-- status: pending(대기), reviewed(검토완료), dismissed(기각)

-- 자동 페널티 함수: 신고 3회 → 경고, 5회 → 7일 정지, 10회 → 영구 정지
CREATE OR REPLACE FUNCTION process_report_penalty(p_reported_id UUID)
RETURNS JSONB AS $$
DECLARE
  report_count INT;
  result JSONB;
BEGIN
  -- 해당 유저의 총 신고 횟수
  SELECT COUNT(*) INTO report_count
  FROM reports
  WHERE reported_id = p_reported_id AND status != 'dismissed';

  IF report_count >= 10 THEN
    -- 영구 정지
    UPDATE profiles
    SET suspended_until = '2099-12-31'::TIMESTAMPTZ,
        suspension_reason = '다수 신고 누적으로 영구 정지',
        warning_count = report_count
    WHERE id = p_reported_id;
    result = jsonb_build_object('action', 'permanent_ban', 'report_count', report_count);

  ELSIF report_count >= 5 THEN
    -- 7일 정지
    UPDATE profiles
    SET suspended_until = NOW() + INTERVAL '7 days',
        suspension_reason = '신고 누적으로 7일 이용 정지',
        warning_count = report_count
    WHERE id = p_reported_id;
    result = jsonb_build_object('action', '7day_suspend', 'report_count', report_count);

  ELSIF report_count >= 3 THEN
    -- 경고
    UPDATE profiles
    SET warning_count = report_count
    WHERE id = p_reported_id;
    result = jsonb_build_object('action', 'warning', 'report_count', report_count);

  ELSE
    UPDATE profiles SET warning_count = report_count WHERE id = p_reported_id;
    result = jsonb_build_object('action', 'none', 'report_count', report_count);
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
