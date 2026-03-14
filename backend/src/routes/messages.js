const express = require('express');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/** Verify the requesting user belongs to the given match. */
async function getMatch(matchId, userId) {
  const { data, error } = await supabase
    .from('matches')
    .select('id, user1_id, user2_id')
    .eq('id', matchId)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

// GET /api/messages/:matchId
router.get('/:matchId', async (req, res) => {
  try {
    const match = await getMatch(req.params.matchId, req.user.id);
    if (!match) return res.status(403).json({ error: '접근 권한이 없습니다.' });

    const { data, error } = await supabase
      .from('messages')
      .select('id, created_at, content, read_at, sender_id')
      .eq('match_id', req.params.matchId)
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    // sender 정보 배치 조회
    const senderIds = [...new Set(data.map(m => m.sender_id))];
    const { data: senders } = await supabase
      .from('profiles')
      .select('id, name, photo_url')
      .in('id', senderIds);

    const senderMap = Object.fromEntries((senders || []).map(s => [s.id, s]));
    const messages = data.map(m => ({ ...m, sender: senderMap[m.sender_id] || { id: m.sender_id } }));

    res.json(messages);
  } catch (err) {
    console.error('메시지 조회 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages
router.post('/', async (req, res) => {
  try {
    const { match_id, content } = req.body;
    if (!match_id || !content?.trim()) {
      return res.status(400).json({ error: '메시지 내용이 없습니다.' });
    }

    const match = await getMatch(match_id, req.user.id);
    if (!match) return res.status(403).json({ error: '접근 권한이 없습니다.' });

    const { data, error } = await supabase
      .from('messages')
      .insert({ match_id, sender_id: req.user.id, content: content.trim() })
      .select('id, created_at, content, read_at, sender_id')
      .single();

    if (error) return res.status(400).json({ error: error.message });

    const { data: sender } = await supabase
      .from('profiles')
      .select('id, name, photo_url')
      .eq('id', req.user.id)
      .single();

    res.status(201).json({ ...data, sender });
  } catch (err) {
    console.error('메시지 전송 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/messages/read/:matchId — mark all incoming as read
router.patch('/read/:matchId', async (req, res) => {
  try {
    const match = await getMatch(req.params.matchId, req.user.id);
    if (!match) return res.status(403).json({ error: '접근 권한이 없습니다.' });

    const { error } = await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('match_id', req.params.matchId)
      .neq('sender_id', req.user.id)
      .is('read_at', null);

    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  } catch (err) {
    console.error('읽음 처리 오류:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
