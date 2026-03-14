const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { calculateCompatibilityScore } = require('../utils/scoring');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// GET /api/matches/suggestions — candidates the user hasn't seen yet (sorted by score)
// Query params: region=same_city|metro|nationwide, relationship_goal_match=true
router.get('/suggestions', async (req, res) => {
  const userId = req.user.id;
  const { region, relationship_goal_match } = req.query;

  const { data: me, error: meErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (meErr || !me) return res.status(400).json({ error: '프로필을 찾을 수 없습니다.' });
  if (!me.questionnaire_completed) {
    return res.status(400).json({ error: '설문을 먼저 완료해주세요.' });
  }

  // IDs already acted on
  const { data: seen } = await supabase
    .from('interests')
    .select('to_user_id')
    .eq('from_user_id', userId);

  const excludeIds = [userId, ...(seen?.map(r => r.to_user_id) ?? [])];

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

  const results = candidates
    .filter(c => c.looking_for === 'any' || c.looking_for === me.gender)
    .filter(c => relationship_goal_match === 'true' ? c.relationship_goal === me.relationship_goal : true)
    .map(c => ({
      id: c.id,
      name: c.name,
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
      // 미리 보기 질문용 추가 필드
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
      compatibility_score: calculateCompatibilityScore(me, c),
    }))
    .sort((a, b) => b.compatibility_score - a.compatibility_score)
    .slice(0, 5); // 하루 기본 5명

  res.json(results);
});

// GET /api/matches — mutual matches (chat-enabled)
router.get('/', async (req, res) => {
  const userId = req.user.id;

  const { data, error } = await supabase
    .from('matches')
    .select(`
      id,
      created_at,
      compatibility_score,
      user1:profiles!matches_user1_id_fkey(id, name, birth_year, city, photo_url, bio),
      user2:profiles!matches_user2_id_fkey(id, name, birth_year, city, photo_url, bio)
    `)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  const matches = data.map(m => ({
    match_id: m.id,
    created_at: m.created_at,
    compatibility_score: m.compatibility_score,
    other_user: m.user1?.id === userId ? m.user2 : m.user1,
  }));

  res.json(matches);
});

module.exports = router;
