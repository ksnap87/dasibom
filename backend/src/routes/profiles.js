const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { calculateCompatibilityScore } = require('../utils/scoring');

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

// PUT /api/profiles/me — partial update (기존 값 유지)
router.put('/me', async (req, res) => {
  // id 필드는 업데이트 조건으로만 사용, body에서 제거
  const { id: _id, ...updates } = req.body;

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', req.user.id)
    .select()
    .single();

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
});

module.exports = router;
