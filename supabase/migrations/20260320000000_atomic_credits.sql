-- Atomic credit deduction (race condition 방지)
CREATE OR REPLACE FUNCTION deduct_credits(p_user_id UUID, p_amount INT)
RETURNS INT AS $$
DECLARE
  new_credits INT;
BEGIN
  UPDATE profiles
  SET credits = credits - p_amount
  WHERE id = p_user_id AND credits >= p_amount
  RETURNING credits INTO new_credits;

  IF NOT FOUND THEN
    RETURN -1;  -- 크레딧 부족
  END IF;

  RETURN new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic credit addition (race condition 방지)
CREATE OR REPLACE FUNCTION add_credits(p_user_id UUID, p_amount INT)
RETURNS INT AS $$
DECLARE
  new_credits INT;
BEGIN
  UPDATE profiles
  SET credits = credits + p_amount
  WHERE id = p_user_id
  RETURNING credits INTO new_credits;

  IF NOT FOUND THEN
    RETURN -1;
  END IF;

  RETURN new_credits;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
