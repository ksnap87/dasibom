const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { calculateCompatibilityScore } = require('../utils/scoring');
const { sendPushToUser } = require('../utils/push');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
  sendPushToUser(supabase, to_user_id, '새로운 매칭! 💕', `${senderName}님과 매칭되었어요!`, { type: 'new_match' }).catch(() => {});
  sendPushToUser(supabase, userId, '새로운 매칭! 💕', `${receiverName}님과 매칭되었어요!`, { type: 'new_match' }).catch(() => {});
});

// POST /api/profiles/credits/deduct — 크레딧 차감
router.post('/credits/deduct', async (req, res) => {
  const userId = req.user.id;
  const amount = req.body.amount ?? 1;

  const { data: profile, error: fetchErr } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (fetchErr || !profile) return res.status(400).json({ error: '프로필을 찾을 수 없습니다.' });
  if (profile.credits < amount) return res.status(400).json({ error: '크레딧이 부족합니다.', credits: profile.credits });

  const { data, error } = await supabase
    .from('profiles')
    .update({ credits: profile.credits - amount })
    .eq('id', userId)
    .select('credits')
    .single();

  if (error) return res.status(400).json({ error: error.message });
  res.json({ credits: data.credits });
});

// POST /api/profiles/report — 신고
router.post('/report', async (req, res) => {
  const { reported_id, reason, detail } = req.body;
  const userId = req.user.id;

  if (!reported_id || !reason) {
    return res.status(400).json({ error: '필수 정보가 없습니다.' });
  }
  if (reported_id === userId) {
    return res.status(400).json({ error: '자신을 신고할 수 없습니다.' });
  }

  const { error } = await supabase
    .from('reports')
    .insert({ reporter_id: userId, reported_id, reason, detail: detail || null });

  if (error) return res.status(400).json({ error: error.message });
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
  if (authErr) console.error('Auth user delete failed:', authErr.message);

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

  const { error } = await supabase
    .from('profiles')
    .update({ phone_hash })
    .eq('id', userId);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
