-- 구매 기록 테이블
CREATE TABLE IF NOT EXISTS public.purchase_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  product_id text NOT NULL,
  purchase_token text UNIQUE NOT NULL,
  credit_amount integer NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_purchase_history_user ON public.purchase_history(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_history_token ON public.purchase_history(purchase_token);

-- RLS
ALTER TABLE public.purchase_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" ON public.purchase_history
  FOR SELECT USING (auth.uid() = user_id);
