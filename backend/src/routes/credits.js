const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { verifyPurchase, acknowledgePurchase, isInitialized } = require('../utils/playStore');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const PACKAGE_NAME = 'com.dasibom';

// 상품 ID → 크레딧 수량
const CREDIT_MAP = {
  credit_3: 3,
  credit_10: 11,  // 10 + 1 보너스
  credit_30: 35,  // 30 + 5 보너스
};

// POST /api/credits/verify-purchase — Google Play 구매 검증 + 크레딧 지급
router.post('/verify-purchase', async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, purchaseToken } = req.body;

    if (!productId || !purchaseToken) {
      return res.status(400).json({ error: '구매 정보가 없습니다.' });
    }

    const creditAmount = CREDIT_MAP[productId];
    if (!creditAmount) {
      return res.status(400).json({ error: '유효하지 않은 상품입니다.' });
    }

    // ── 1. Google Play 영수증 검증 ──────────────────────────
    let purchaseData = null;

    if (isInitialized()) {
      try {
        purchaseData = await verifyPurchase(PACKAGE_NAME, productId, purchaseToken);
      } catch (err) {
        console.error('[Credits] Google Play 검증 실패:', err.message);
        return res.status(400).json({ error: '구매 검증에 실패했습니다. 다시 시도해주세요.' });
      }

      // purchaseState: 0 = 구매완료, 1 = 취소됨, 2 = 대기중
      if (purchaseData.purchaseState !== 0) {
        return res.status(400).json({ error: '유효하지 않은 구매입니다.' });
      }
    } else {
      // Google Play 서비스 미설정 시 (개발 환경)
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ error: '결제 검증 서비스를 사용할 수 없습니다.' });
      }
      console.warn('[Credits] Google Play 미설정 — 검증 없이 진행 (개발 모드)');
    }

    // ── 2. 중복 구매 방지 ───────────────────────────────────
    const { data: existing } = await supabase
      .from('purchase_history')
      .select('id')
      .eq('purchase_token', purchaseToken)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ error: '이미 처리된 구매입니다.' });
    }

    // ── 3. 크레딧 지급 (atomic) ─────────────────────────────
    const { data: newCredits, error: rpcErr } = await supabase.rpc('add_credits', {
      p_user_id: userId,
      p_amount: creditAmount,
    });

    if (rpcErr || newCredits === -1) {
      return res.status(500).json({ error: '크레딧 지급 실패' });
    }

    // ── 4. 구매 기록 저장 ───────────────────────────────────
    const { error: historyErr } = await supabase
      .from('purchase_history')
      .insert({
        user_id: userId,
        product_id: productId,
        purchase_token: purchaseToken,
        credit_amount: creditAmount,
        order_id: purchaseData?.orderId ?? null,
      });

    if (historyErr) {
      console.error('구매 기록 저장 실패:', historyErr.message);
    }

    // ── 5. Google Play 구매 승인 (acknowledge) ──────────────
    // 소모성 상품은 3일 내 승인하지 않으면 자동 환불됨
    if (purchaseData && purchaseData.acknowledgementState === 0) {
      try {
        await acknowledgePurchase(PACKAGE_NAME, productId, purchaseToken);
      } catch (ackErr) {
        console.error('[Credits] acknowledge 실패:', ackErr.message);
        // 크레딧은 이미 지급됨 — acknowledge는 재시도 가능
      }
    }

    res.json({ credits: newCredits, added: creditAmount });
  } catch (err) {
    console.error('[Credits] verify-purchase 오류:', err);
    res.status(500).json({ error: '결제 처리 중 오류가 발생했습니다.' });
  }
});

// POST /api/credits/add — 테스트용 크레딧 추가 (개발 환경 전용)
router.post('/add', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: '개발 모드에서만 사용 가능합니다.' });
  }
  const userId = req.user.id;
  const amount = req.body.amount ?? 3;

  if (!Number.isInteger(amount) || amount <= 0 || amount > 100) {
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
