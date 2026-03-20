const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

function generatePassword(kakaoId) {
  return crypto
    .createHmac('sha256', process.env.KAKAO_AUTH_SECRET)
    .update(String(kakaoId))
    .digest('hex');
}

// POST /api/auth/kakao
router.post('/kakao', async (req, res) => {
  const { kakaoAccessToken } = req.body;
  if (!kakaoAccessToken) {
    return res.status(400).json({ error: '카카오 토큰이 필요합니다.' });
  }

  try {
    // 1. 카카오 API로 사용자 정보 조회
    const kakaoRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${kakaoAccessToken}` },
    });

    if (!kakaoRes.ok) {
      return res.status(401).json({ error: '카카오 토큰이 유효하지 않습니다.' });
    }

    const kakaoUser = await kakaoRes.json();
    const kakaoId = kakaoUser.id;
    const nickname = kakaoUser.kakao_account?.profile?.nickname ?? '';
    const kakaoEmail = kakaoUser.kakao_account?.email;

    // 2. Supabase용 결정적 이메일/비밀번호 생성
    const email = `kakao_${kakaoId}@dasibom.kakao`;
    const password = generatePassword(kakaoId);

    // 3. 유저 생성 (이미 존재하면 무시)
    const { error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        kakao_id: kakaoId,
        nickname,
        kakao_email: kakaoEmail,
        provider: 'kakao',
      },
    });

    if (createErr && !createErr.message?.includes('already been registered')) {
      console.error('유저 생성 오류:', createErr.message);
      return res.status(500).json({ error: '계정 생성 중 오류가 발생했습니다.' });
    }

    // 4. 로그인하여 세션 발급
    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr) {
      console.error('로그인 오류:', signInErr.message);
      return res.status(500).json({ error: '로그인 처리 중 오류가 발생했습니다.' });
    }

    return res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.user,
    });
  } catch (err) {
    console.error('카카오 인증 오류:', err);
    return res.status(500).json({ error: '인증 처리 중 오류가 발생했습니다.' });
  }
});

// POST /api/auth/dev-login — 개발용 테스트 로그인 (실제 Supabase 세션 발급)
router.post('/dev-login', async (req, res) => {
  // TODO: 출시 전 이 엔드포인트 비활성화
  // if (process.env.NODE_ENV === 'production') {
  //   return res.status(403).json({ error: '개발 모드에서만 사용 가능합니다.' });
  // }

  try {
    const testKakaoId = 'dev_test_user_12345';
    const email = `kakao_${testKakaoId}@dasibom.kakao`;
    const password = generatePassword(testKakaoId);

    // 테스트 유저 생성 (이미 존재하면 무시)
    const { error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        kakao_id: testKakaoId,
        nickname: '테스트유저',
        provider: 'dev',
      },
    });

    if (createErr && !createErr.message?.includes('already been registered')) {
      console.error('DEV 유저 생성 오류:', createErr.message);
      return res.status(500).json({ error: '테스트 계정 생성 실패' });
    }

    // 로그인하여 세션 발급
    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr) {
      console.error('DEV 로그인 오류:', signInErr.message);
      return res.status(500).json({ error: '테스트 로그인 실패' });
    }

    return res.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      user: data.user,
    });
  } catch (err) {
    console.error('DEV 로그인 오류:', err);
    return res.status(500).json({ error: '테스트 로그인 처리 중 오류' });
  }
});

module.exports = router;
