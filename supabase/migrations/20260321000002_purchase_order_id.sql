-- purchase_history에 Google Play order_id 컬럼 추가
ALTER TABLE purchase_history ADD COLUMN IF NOT EXISTS order_id text;

-- purchase_token 유니크 제약 (중복 구매 방지)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'purchase_history_purchase_token_key'
  ) THEN
    ALTER TABLE purchase_history ADD CONSTRAINT purchase_history_purchase_token_key UNIQUE (purchase_token);
  END IF;
END $$;
