const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { calculateCompatibilityScore } = require('../utils/scoring');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET /api/matches/suggestions — candidates the user hasn't seen yet (sorted by score)
// Query params:
//   region=same_city|metro|nationwide
//   relationship_goal_match=true
//   limit=N  (1~50, default 5) — 크레딧으로 추가 추천 시 클라이언트가 늘려 요청
router.get('/suggestions', async (req, res) => {
  try {
  const userId = req.user.id;
  const { region, relationship_goal_match } = req.query;

  // limit 파라미터 — 기본 5, 최대 50 (악용 방지)
  const requestedLimit = parseInt(req.query.limit, 10);
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0
    ? Math.min(requestedLimit, 50)
    : 5;

  const { data: me, error: meErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (meErr || !me) return res.status(400).json({ error: '프로필을 찾을 수 없습니다.' });
  if (!me.questionnaire_completed) {
    return res.status(400).json({ error: '설문을 먼저 완료해주세요.' });
  }

  // IDs already acted on (3일 경과한 좋아요는 만료 → 다시 추천 가능)
  const EXPIRY_DAYS = 3;
  const expiryDate = new Date(Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: seen } = await supabase
    .from('interests')
    .select('to_user_id, is_liked, created_at')
    .eq('from_user_id', userId);

  // 만료된 좋아요(3일 경과 + 매칭 안 됨)는 제외 목록에서 빼기
  const { data: myMatches } = await supabase
    .from('matches')
    .select('user1_id, user2_id')
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
  const matchedUserIds = new Set(
    (myMatches || []).map(m => m.user1_id === userId ? m.user2_id : m.user1_id)
  );

  // 차단한/차단당한 유저 제외
  const { data: blockedByMe } = await supabase
    .from('blocks')
    .select('blocked_id')
    .eq('blocker_id', userId);
  const { data: blockedMe } = await supabase
    .from('blocks')
    .select('blocker_id')
    .eq('blocked_id', userId);

  // 연락처 기반 제외: 내 연락처에 있는 전화번호 해시와 일치하는 유저 제외
  const { data: myContacts } = await supabase
    .from('contact_hashes')
    .select('phone_hash')
    .eq('user_id', userId);
  const contactHashes = new Set(myContacts?.map(c => c.phone_hash) ?? []);

  // phone_hash가 내 연락처에 있는 유저 조회
  let contactExcludeIds = [];
  if (contactHashes.size > 0) {
    const { data: contactUsers } = await supabase
      .from('profiles')
      .select('id, phone_hash')
      .not('phone_hash', 'is', null)
      .in('phone_hash', [...contactHashes]);
    contactExcludeIds = contactUsers?.map(u => u.id) ?? [];
  }

  // 만료되지 않은 관심만 제외 (pass는 항상 제외, like는 3일 내만 제외)
  const activeSeenIds = (seen || [])
    .filter(r => {
      if (!r.is_liked) return true; // pass는 항상 제외
      if (matchedUserIds.has(r.to_user_id)) return true; // 매칭된 상대 제외
      return r.created_at > expiryDate; // 3일 이내 좋아요만 제외
    })
    .map(r => r.to_user_id);

  const excludeIds = [
    userId,
    ...activeSeenIds,
    ...(blockedByMe?.map(r => r.blocked_id) ?? []),
    ...(blockedMe?.map(r => r.blocker_id) ?? []),
    ...contactExcludeIds,
  ];

  let query = supabase
    .from('profiles')
    .select('*')
    .eq('questionnaire_completed', true)
    .not('id', 'in', `(${excludeIds.map(id => `"${id}"`).join(',')})`);

  if (me.looking_for !== 'any') query = query.eq('gender', me.looking_for);

  const currentYear = new Date().getFullYear();
  if (me.age_min) query = query.lte('birth_year', currentYear - me.age_min);
  if (me.age_max) query = query.gte('birth_year', currentYear - me.age_max);

  // 지역 필터
  if (region === 'same_city' && me.city) {
    query = query.eq('city', me.city);
  } else if (region === 'metro') {
    query = query.in('city', ['서울', '경기', '인천']);
  }
  // 'nationwide' = 필터 없음

  const { data: candidates, error } = await query.limit(60);
  if (error) return res.status(500).json({ error: error.message });

  // 자녀 상황 유사도 보너스 점수 계산 (0-100 스케일)
  function familySimilarityBonus(me, c) {
    let bonus = 0;
    // 자녀 유무 일치
    if (me.has_children != null && c.has_children != null && me.has_children === c.has_children) bonus += 3;
    // 자녀 동거 상황 일치
    if (me.children_living_together != null && c.children_living_together != null && me.children_living_together === c.children_living_together) bonus += 2;
    // 반려동물 수용 여부: 상대가 반려동물 있는데 내가 pet_friendly=false면 페널티
    if (c.has_pet === true && me.pet_friendly === false) bonus -= 5;
    if (me.has_pet === true && c.pet_friendly === false) bonus -= 5;
    return bonus;
  }

  const results = candidates
    .filter(c => c.looking_for === 'any' || c.looking_for === me.gender)
    .filter(c => relationship_goal_match === 'true' ? c.relationship_goal === me.relationship_goal : true)
    .map(c => {
      const baseScore = calculateCompatibilityScore(me, c);
      const familyBonus = familySimilarityBonus(me, c);
      return {
        id: c.id,
        name: c.nickname || c.name,
        nickname: c.nickname,
        birth_year: c.birth_year,
        gender: c.gender,
        city: c.city,
        photo_url: c.photo_url,
        bio: c.bio,
        hobbies: c.hobbies,
        religion: c.religion,
        relationship_goal: c.relationship_goal,
        health_status: c.health_status,
        living_situation: c.living_situation,
        exercise_frequency: c.exercise_frequency,
        personality_type: c.personality_type,
        smoking: c.smoking,
        drinking: c.drinking,
        chronotype: c.chronotype,
        family_importance: c.family_importance,
        religion_importance: c.religion_importance,
        has_children: c.has_children,
        willing_to_relocate: c.willing_to_relocate,
        financial_stability: c.financial_stability,
        communication_style: c.communication_style,
        conflict_style: c.conflict_style,
        emotional_expression: c.emotional_expression,
        social_frequency: c.social_frequency,
        rest_style: c.rest_style,
        meal_style: c.meal_style,
        has_pet: c.has_pet,
        pet_type: c.pet_type,
        pet_friendly: c.pet_friendly,
        compatibility_score: Math.min(100, Math.max(0, baseScore + familyBonus)),
      };
    })
    .sort((a, b) => b.compatibility_score - a.compatibility_score)
    .slice(0, limit); // 기본 5명, 크레딧 사용 시 클라이언트가 limit 늘려 요청

  res.json(results);
  } catch (err) {
    console.error('suggestions error:', err);
    res.status(500).json({ error: '추천 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// GET /api/matches — mutual matches (chat-enabled)
router.get('/', async (req, res) => {
  try {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      created_at,
      compatibility_score,
      user1:profiles!matches_user1_id_fkey(id, name, nickname, birth_year, city, photo_url, bio),
      user2:profiles!matches_user2_id_fkey(id, name, nickname, birth_year, city, photo_url, bio)
    `)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  // 차단한/차단당한 유저 제외
  const { data: myBlocks } = await supabase
    .from('blocks')
    .select('blocked_id, blocker_id')
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  const blockIds = new Set([
    ...(myBlocks?.map(b => b.blocker_id === userId ? b.blocked_id : b.blocker_id) ?? []),
  ]);

  const matches = data
    .map(m => ({
      match_id: m.id,
      created_at: m.created_at,
      compatibility_score: m.compatibility_score,
      other_user: m.user1?.id === userId ? m.user2 : m.user1,
    }))
    .filter(m => !blockIds.has(m.other_user?.id));

  // 각 매칭의 마지막 메시지 + 안 읽은 메시지 수 조회
  const matchIds = matches.map(m => m.match_id);
  if (matchIds.length > 0) {
    // 마지막 메시지 조회 (match_id별 최신 1건) — 최대 200개로 제한
    const { data: lastMessages } = await supabase
      .from('messages')
      .select('match_id, content, created_at, sender_id')
      .in('match_id', matchIds)
      .order('created_at', { ascending: false })
      .limit(matchIds.length * 2);

    // match_id별 마지막 메시지 맵
    const lastMsgMap = {};
    for (const msg of (lastMessages || [])) {
      if (!lastMsgMap[msg.match_id]) lastMsgMap[msg.match_id] = msg;
    }

    // 안 읽은 메시지 수 조회
    const { data: unreadMessages } = await supabase
      .from('messages')
      .select('match_id')
      .in('match_id', matchIds)
      .neq('sender_id', userId)
      .is('read_at', null);

    const unreadMap = {};
    for (const msg of (unreadMessages || [])) {
      unreadMap[msg.match_id] = (unreadMap[msg.match_id] || 0) + 1;
    }

    for (const m of matches) {
      const last = lastMsgMap[m.match_id];
      m.last_message = last ? { content: last.content, created_at: last.created_at, sender_id: last.sender_id } : null;
      m.unread_count = unreadMap[m.match_id] || 0;
    }

    // 마지막 메시지가 있는 매칭을 최신순으로 정렬
    matches.sort((a, b) => {
      const aTime = a.last_message?.created_at || a.created_at;
      const bTime = b.last_message?.created_at || b.created_at;
      return new Date(bTime).getTime() - new Date(aTime).getTime();
    });
  }

  res.json(matches);
  } catch (err) {
    console.error('matches error:', err);
    res.status(500).json({ error: '매칭 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
