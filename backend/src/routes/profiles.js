const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { calculateCompatibilityScore } = require('../utils/scoring');
const { sendPushToUser } = require('../utils/push');
const { filterProfileContent } = require('../utils/contentFilter');

// 전화번호 암호화/복호화 (AES-256-GCM)
const PHONE_ENCRYPTION_KEY = process.env.PHONE_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ENC_KEY = Buffer.from(PHONE_ENCRYPTION_KEY, 'hex');

function encryptPhone(phone) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  let encrypted = cipher.update(phone, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${tag}:${encrypted}`;
}

function decryptPhone(encryptedData) {
  const [ivHex, tagHex, encrypted] = encryptedData.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET /api/profiles/check-nickname?nickname=xxx — 닉네임 중복 체크
router.get('/check-nickname', async (req, res) => {
  const { nickname } = req.query;
  if (!nickname || typeof nickname !== 'string' || nickname.trim().length < 2) {
    return res.status(400).json({ error: '닉네임은 2자 이상이어야 합니다.' });
  }
  if (nickname.trim().length > 12) {
    return res.status(400).json({ error: '닉네임은 12자 이하여야 합니다.' });
  }

  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('nickname', nickname.trim())
    .maybeSingle();

  res.json({ available: !data });
});

// GET /api/profiles/me
router.get('/me', async (req, res) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });
  res.json(data);
});

// PUT /api/profiles/me — upsert (없으면 생성, 있으면 업데이트)
router.put('/me', async (req, res) => {
  const { id: _id, ...updates } = req.body;

  // 입력값 검증
  if (updates.bio && typeof updates.bio === 'string' && updates.bio.length > 100) {
    return res.status(400).json({ error: '자기소개는 100자까지 입력 가능합니다.' });
  }
  if (updates.hobbies && Array.isArray(updates.hobbies) && updates.hobbies.length > 20) {
    return res.status(400).json({ error: '취미는 최대 20개까지 선택 가능합니다.' });
  }
  // 자기소개 금칙어 필터
  if (updates.bio) {
    const bioFilter = filterProfileContent(updates.bio);
    if (bioFilter.blocked) {
      return res.status(400).json({ error: bioFilter.message });
    }
  }
  // 출생연도 검증 (19세 미만 가입 불가, 비현실적 나이 차단)
  if (updates.birth_year) {
    const currentYear = new Date().getFullYear();
    const age = currentYear - updates.birth_year;
    if (age < 19) {
      return res.status(400).json({ error: '19세 이상만 가입할 수 있습니다.' });
    }
    if (age > 120 || updates.birth_year < 1900) {
      return res.status(400).json({ error: '올바른 출생연도를 입력해주세요.' });
    }
  }

  // 먼저 업데이트 시도
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', req.user.id)
    .maybeSingle();

  let data, error;
  if (existing) {
    ({ data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', req.user.id)
      .select()
      .single());
  } else {
    // 프로필이 없으면 생성
    ({ data, error } = await supabase
      .from('profiles')
      .insert({ id: req.user.id, ...updates })
      .select()
      .single());
  }

  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

// GET /api/profiles/:id — public view of another user
router.get('/:id', async (req, res) => {
  const PUBLIC_COLS = [
    'id', 'name', 'birth_year', 'gender', 'city', 'photo_url', 'bio',
    'hobbies', 'religion', 'relationship_goal', 'health_status',
    'living_situation', 'exercise_frequency', 'personality_type',
    'social_frequency', 'family_importance',
  ].join(', ');

  const { data, error } = await supabase
    .from('profiles')
    .select(PUBLIC_COLS)
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: '프로필을 찾을 수 없습니다.' });
  res.json(data);
});

// POST /api/profiles/interest — like or pass
router.post('/interest', async (req, res) => {
  const { to_user_id, is_liked } = req.body;
  const userId = req.user.id;

  if (!to_user_id || is_liked === undefined) {
    return res.status(400).json({ error: '필수 정보가 없습니다.' });
  }
  if (to_user_id === userId) {
    return res.status(400).json({ error: '자신에게 관심을 표현할 수 없습니다.' });
  }

  const { error } = await supabase
    .from('interests')
    .upsert(
      { from_user_id: userId, to_user_id, is_liked },
      { onConflict: 'from_user_id,to_user_id' }
    );

  if (error) return res.status(400).json({ error: error.message });

  if (!is_liked) return res.json({ matched: false });

  // Check for mutual like
  const { data: mutual } = await supabase
    .from('interests')
    .select('id')
    .eq('from_user_id', to_user_id)
    .eq('to_user_id', userId)
    .eq('is_liked', true)
    .maybeSingle();

  if (!mutual) return res.json({ matched: false });

  // Fetch both profiles and compute score
  const [{ data: p1 }, { data: p2 }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('profiles').select('*').eq('id', to_user_id).single(),
  ]);

  const score = calculateCompatibilityScore(p1, p2);
  const [u1, u2] = [userId, to_user_id].sort();

  await supabase
    .from('matches')
    .upsert(
      { user1_id: u1, user2_id: u2, compatibility_score: score },
      { onConflict: 'user1_id,user2_id' }
    );

  res.json({ matched: true, score });

  // 양쪽 모두에게 매칭 푸시 알림
  const senderName = p1?.name ?? '누군가';
  const receiverName = p2?.name ?? '누군가';
  sendPushToUser(supabase, to_user_id, '새로운 매칭! 💕', `${senderName}님과 매칭되었어요!`, { type: 'new_match' }).catch(err => console.error('[Push] 매칭 알림 실패:', err.message));
  sendPushToUser(supabase, userId, '새로운 매칭! 💕', `${receiverName}님과 매칭되었어요!`, { type: 'new_match' }).catch(err => console.error('[Push] 매칭 알림 실패:', err.message));
});

// POST /api/profiles/credits/deduct — 크레딧 차감 (atomic)
router.post('/credits/deduct', async (req, res) => {
  const userId = req.user.id;
  const amount = req.body.amount ?? 1;

  if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
    return res.status(400).json({ error: '유효하지 않은 차감 수량입니다.' });
  }

  const { data, error } = await supabase.rpc('deduct_credits', {
    p_user_id: userId,
    p_amount: amount,
  });

  if (error) return res.status(500).json({ error: '크레딧 차감 처리 중 오류가 발생했습니다.' });

  if (data === -1) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();
    return res.status(400).json({ error: '크레딧이 부족합니다.', credits: profile?.credits ?? 0 });
  }

  res.json({ credits: data });
});

// POST /api/profiles/report — 신고
const VALID_REPORT_REASONS = ['inappropriate_photo', 'fake_profile', 'offensive_chat', 'other'];

router.post('/report', async (req, res) => {
  const { reported_id, reason, detail } = req.body;
  const userId = req.user.id;

  if (!reported_id || !reason) {
    return res.status(400).json({ error: '필수 정보가 없습니다.' });
  }
  if (!VALID_REPORT_REASONS.includes(reason)) {
    return res.status(400).json({ error: '유효하지 않은 신고 사유입니다.' });
  }
  if (detail && typeof detail === 'string' && detail.length > 500) {
    return res.status(400).json({ error: '상세 내용은 500자까지 입력 가능합니다.' });
  }
  if (reported_id === userId) {
    return res.status(400).json({ error: '자신을 신고할 수 없습니다.' });
  }

  const { error } = await supabase
    .from('reports')
    .insert({ reporter_id: userId, reported_id, reason, detail: detail || null });

  if (error) return res.status(400).json({ error: error.message });

  // 자동 페널티 적용
  const { data: penalty } = await supabase.rpc('process_report_penalty', {
    p_reported_id: reported_id,
  });
  console.log(`[Report] ${reported_id} 신고 처리:`, penalty);

  res.json({ success: true });
});

// POST /api/profiles/block — 차단
router.post('/block', async (req, res) => {
  const { blocked_id } = req.body;
  const userId = req.user.id;

  if (!blocked_id) return res.status(400).json({ error: '필수 정보가 없습니다.' });
  if (blocked_id === userId) return res.status(400).json({ error: '자신을 차단할 수 없습니다.' });

  const { error } = await supabase
    .from('blocks')
    .upsert({ blocker_id: userId, blocked_id }, { onConflict: 'blocker_id,blocked_id' });

  if (error) return res.status(400).json({ error: error.message });

  // 매칭이 있으면 삭제
  const [u1, u2] = [userId, blocked_id].sort();
  await supabase.from('matches').delete().eq('user1_id', u1).eq('user2_id', u2);

  res.json({ success: true });
});

// DELETE /api/profiles/block/:blocked_id — 차단 해제
router.delete('/block/:blocked_id', async (req, res) => {
  const userId = req.user.id;
  const { blocked_id } = req.params;

  const { error } = await supabase
    .from('blocks')
    .delete()
    .eq('blocker_id', userId)
    .eq('blocked_id', blocked_id);

  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

// DELETE /api/profiles/me — 계정 삭제
router.delete('/me', async (req, res) => {
  const userId = req.user.id;

  // 매칭, 메시지, 관심표현, 신고, 차단은 CASCADE로 자동 삭제
  const { error: profileErr } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (profileErr) return res.status(400).json({ error: profileErr.message });

  // Supabase Auth 유저 삭제
  const { error: authErr } = await supabase.auth.admin.deleteUser(userId);
  if (authErr) {
    console.error('Auth user delete failed:', authErr.message);
    return res.status(500).json({ error: '계정 삭제 중 일부 처리에 실패했습니다. 관리자에게 문의해주세요.' });
  }

  res.json({ success: true });
});

// POST /api/profiles/sync-contacts — 연락처 해시 동기화
// 기기 연락처의 전화번호 해시를 서버에 저장하여 추천에서 제외
router.post('/sync-contacts', async (req, res) => {
  const userId = req.user.id;
  const { hashes } = req.body; // string[]

  if (!Array.isArray(hashes) || hashes.length === 0) {
    return res.json({ synced: 0 });
  }

  // 기존 해시 모두 삭제 후 새로 삽입 (전체 교체)
  await supabase
    .from('contact_hashes')
    .delete()
    .eq('user_id', userId);

  const rows = hashes.map(h => ({ user_id: userId, phone_hash: h }));

  // 500개씩 배치 삽입
  let synced = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await supabase
      .from('contact_hashes')
      .upsert(batch, { onConflict: 'user_id,phone_hash', ignoreDuplicates: true });
    if (!error) synced += batch.length;
  }

  res.json({ synced });
});

// POST /api/profiles/phone-hash — 본인인증 시 전화번호 해시 저장
router.post('/phone-hash', async (req, res) => {
  const userId = req.user.id;
  const { phone_hash } = req.body;

  if (!phone_hash) {
    return res.status(400).json({ error: 'phone_hash 필요' });
  }
  // SHA256 hex 형식 검증
  if (typeof phone_hash !== 'string' || !/^[a-f0-9]{64}$/i.test(phone_hash)) {
    return res.status(400).json({ error: '유효하지 않은 phone_hash 형식입니다.' });
  }

  const { error } = await supabase
    .from('profiles')
    .update({ phone_hash })
    .eq('id', userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// POST /api/profiles/verify-phone — 본인인증 전화번호 암호화 저장 (안전 대응용)
router.post('/verify-phone', async (req, res) => {
  const userId = req.user.id;
  const { phone_number } = req.body;

  if (!phone_number || typeof phone_number !== 'string') {
    return res.status(400).json({ error: '전화번호가 필요합니다.' });
  }

  // 전화번호 형식 검증 (E.164: +821012345678)
  const digits = phone_number.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return res.status(400).json({ error: '유효하지 않은 전화번호 형식입니다.' });
  }

  try {
    const encrypted = encryptPhone(phone_number);

    const { error } = await supabase
      .from('verified_phones')
      .upsert({
        user_id: userId,
        encrypted_phone: encrypted,
        verified_at: new Date().toISOString(),
        verification_method: 'firebase_sms',
      }, { onConflict: 'user_id' });

    if (error) return res.status(500).json({ error: '전화번호 저장 실패' });
    res.json({ success: true });
  } catch (err) {
    console.error('전화번호 암호화 저장 실패:', err.message);
    res.status(500).json({ error: '처리 중 오류가 발생했습니다.' });
  }
});

// GET /api/profiles/admin/phone/:userId — 관리자 전용: 암호화된 전화번호 복호화 조회
// 데이팅 폭력 등 긴급 상황 시 수사기관 협조용
router.get('/admin/phone/:userId', async (req, res) => {
  // 관리자 인증: ADMIN_SECRET 헤더 필요
  const adminSecret = req.headers['x-admin-secret'];
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }

  const { userId } = req.params;

  try {
    const { data, error } = await supabase
      .from('verified_phones')
      .select('encrypted_phone, verified_at, verification_method')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: '인증된 전화번호가 없습니다.' });
    }

    const phone = decryptPhone(data.encrypted_phone);

    // 카카오 정보도 함께 조회
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);

    res.json({
      user_id: userId,
      phone_number: phone,
      verified_at: data.verified_at,
      verification_method: data.verification_method,
      kakao_id: authUser?.user_metadata?.kakao_id ?? null,
      kakao_nickname: authUser?.user_metadata?.nickname ?? null,
      kakao_email: authUser?.user_metadata?.kakao_email ?? null,
    });
  } catch (err) {
    console.error('전화번호 복호화 실패:', err.message);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  }
});

// GET /api/profiles/sent-interests — 보낸 관심 히스토리
// 상태: pending(대기중), matched(매칭됨), expired(3일 경과 만료)
router.get('/sent-interests', async (req, res) => {
  try {
    const userId = req.user.id;
    const EXPIRY_DAYS = 3;

    // 내가 좋아요 누른 목록
    const { data: sentLikes, error } = await supabase
      .from('interests')
      .select('to_user_id, created_at')
      .eq('from_user_id', userId)
      .eq('is_liked', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) return res.status(500).json({ error: error.message });
    if (!sentLikes || sentLikes.length === 0) return res.json([]);

    const toUserIds = sentLikes.map(s => s.to_user_id);

    // 상대 프로필 조회
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, nickname, birth_year, city, personality_type, relationship_goal')
      .in('id', toUserIds);

    const profileMap = {};
    for (const p of (profiles || [])) profileMap[p.id] = p;

    // 매칭 여부 확인
    const { data: matches } = await supabase
      .from('matches')
      .select('user1_id, user2_id')
      .or(toUserIds.map(id => {
        const [u1, u2] = [userId, id].sort();
        return `and(user1_id.eq.${u1},user2_id.eq.${u2})`;
      }).join(','));

    const matchedIds = new Set();
    for (const m of (matches || [])) {
      matchedIds.add(m.user1_id === userId ? m.user2_id : m.user1_id);
    }

    const now = new Date();
    const results = sentLikes.map(s => {
      const profile = profileMap[s.to_user_id];
      const createdAt = new Date(s.created_at);
      const expiresAt = new Date(createdAt.getTime() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      const remainingMs = expiresAt.getTime() - now.getTime();

      let status = 'pending';
      if (matchedIds.has(s.to_user_id)) {
        status = 'matched';
      } else if (remainingMs <= 0) {
        status = 'expired';
      }

      return {
        to_user_id: s.to_user_id,
        name: profile?.nickname || (profile?.name ?? null),
        birth_year: profile?.birth_year ?? null,
        city: profile?.city ?? null,
        personality_type: profile?.personality_type ?? null,
        relationship_goal: profile?.relationship_goal ?? null,
        status,
        created_at: s.created_at,
        expires_at: expiresAt.toISOString(),
        remaining_hours: status === 'pending' ? Math.max(0, Math.floor(remainingMs / (1000 * 60 * 60))) : 0,
      };
    });

    res.json(results);
  } catch (err) {
    console.error('sent-interests error:', err);
    res.status(500).json({ error: '보낸 관심 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// POST /api/profiles/checkin — 출석 체크 (매일 1회, 연속 출석 보상)
router.post('/checkin', async (req, res) => {
  try {
    const { data, error } = await supabase.rpc('daily_checkin', {
      p_user_id: req.user.id,
    });

    if (error) return res.status(500).json({ error: '출석 체크 처리 중 오류가 발생했습니다.' });
    res.json(data);
  } catch (err) {
    console.error('출석 체크 오류:', err.message);
    res.status(500).json({ error: '출석 체크 실패' });
  }
});

module.exports = router;
