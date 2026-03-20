const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// 상품 ID → 크레딧 수량
const CREDIT_MAP = {
  credit_3: 3,
  credit_10: 11,  // 10 + 1 보너스
  credit_30: 35,  // 30 + 5 보너스
};

// POST /api/credits/verify-purchase — Google Play 구매 검증 + 크레딧 지급
router.post('/verify-purchase', async (req, res) => {
  const userId = req.user.id;
  const { productId, purchaseToken, packageName } = req.body;

  if (!productId || !purchaseToken) {
    return res.status(400).json({ error: '구매 정보가 없습니다.' });
  }

  const creditAmount = CREDIT_MAP[productId];
  if (!creditAmount) {
    return res.status(400).json({ error: '유효하지 않은 상품입니다.' });
  }

  // TODO: Google Play Developer API로 구매 영수증 검증
  // const { google } = require('googleapis');
  // const androidPublisher = google.androidpublisher({ version: 'v3', auth });
  // const result = await androidPublisher.purchases.products.get({
  //   packageName, productId, token: purchaseToken
  // });
  // if (result.data.purchaseState !== 0) return res.status(400)...

  // 중복 구매 방지: 동일 purchaseToken 이미 처리했는지 확인
  const { data: existing } = await supabase
    .from('purchase_history')
    .select('id')
    .eq('purchase_token', purchaseToken)
    .maybeSingle();

  if (existing) {
    return res.status(400).json({ error: '이미 처리된 구매입니다.' });
  }

  // 크레딧 지급 (atomic)
  const { data: newCredits, error: rpcErr } = await supabase.rpc('add_credits', {
    p_user_id: userId,
    p_amount: creditAmount,
  });

  if (rpcErr || newCredits === -1) {
    return res.status(500).json({ error: '크레딧 지급 실패' });
  }

  // 구매 기록 저장
  const { error: historyErr } = await supabase
    .from('purchase_history')
    .insert({
      user_id: userId,
      product_id: productId,
      purchase_token: purchaseToken,
      credit_amount: creditAmount,
    });

  if (historyErr) {
    console.error('구매 기록 저장 실패:', historyErr.message);
  }

  res.json({ credits: newCredits, added: creditAmount });
});

// POST /api/credits/add — 테스트용 크레딧 추가 (개발 환경 전용)
router.post('/add', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: '개발 모드에서만 사용 가능합니다.' });
  }
  const userId = req.user.id;
  const amount = req.body.amount ?? 3;

  if (amount <= 0 || amount > 100) {
    return res.status(400).json({ error: '유효하지 않은 수량입니다.' });
  }

  const { data: newCredits, error } = await supabase.rpc('add_credits', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error || newCredits === -1) return res.status(500).json({ error: '크레딧 추가 실패' });
  res.json({ credits: newCredits, added: amount });
});

module.exports = router;
