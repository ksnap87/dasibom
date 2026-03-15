const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const MAX_PHOTOS = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
    cb(null, true);
  },
});

// GET /api/photos — 내 사진 목록
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('profile_photos')
      .select('id, url, sort_order, created_at')
      .eq('user_id', req.user.id)
      .order('sort_order', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/photos/upload — 사진 업로드 (최대 5장)
router.post('/upload', upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '파일이 없습니다.' });
  }

  const userId = req.user.id;

  // 현재 사진 수 확인
  const { count } = await supabase
    .from('profile_photos')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  if ((count || 0) >= MAX_PHOTOS) {
    return res.status(400).json({ error: `사진은 최대 ${MAX_PHOTOS}장까지 업로드 가능합니다.` });
  }

  const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
  const fileName = `${userId}/photo_${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('profile-photos')
    .upload(fileName, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true,
    });

  if (uploadError) {
    return res.status(500).json({ error: uploadError.message });
  }

  const { data: urlData } = supabase.storage
    .from('profile-photos')
    .getPublicUrl(fileName);

  const photoUrl = urlData.publicUrl;

  // profile_photos 테이블에 추가
  const { data: photo, error: insertError } = await supabase
    .from('profile_photos')
    .insert({ user_id: userId, url: photoUrl, sort_order: (count || 0) })
    .select('id, url, sort_order, created_at')
    .single();

  if (insertError) {
    return res.status(500).json({ error: insertError.message });
  }

  // 첫 번째 사진이면 자동으로 프로필 사진으로 설정
  if ((count || 0) === 0) {
    await supabase
      .from('profiles')
      .update({ photo_url: photoUrl })
      .eq('id', userId);
  }

  res.status(201).json(photo);
});

// DELETE /api/photos/:photoId — 사진 삭제
router.delete('/:photoId', async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: photo } = await supabase
      .from('profile_photos')
      .select('id, url')
      .eq('id', req.params.photoId)
      .eq('user_id', userId)
      .single();

    if (!photo) return res.status(404).json({ error: '사진을 찾을 수 없습니다.' });

    await supabase
      .from('profile_photos')
      .delete()
      .eq('id', photo.id);

    // 삭제한 사진이 프로필 사진이었으면 다른 사진으로 대체
    const { data: profile } = await supabase
      .from('profiles')
      .select('photo_url, background_url')
      .eq('id', userId)
      .single();

    if (profile?.photo_url === photo.url) {
      const { data: remaining } = await supabase
        .from('profile_photos')
        .select('url')
        .eq('user_id', userId)
        .order('sort_order', { ascending: true })
        .limit(1);

      await supabase
        .from('profiles')
        .update({ photo_url: remaining?.[0]?.url || null })
        .eq('id', userId);
    }

    if (profile?.background_url === photo.url) {
      await supabase
        .from('profiles')
        .update({ background_url: null })
        .eq('id', userId);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/photos/set-profile — 프로필 사진 설정
router.patch('/set-profile', async (req, res) => {
  try {
    const { photo_url } = req.body;
    if (!photo_url) return res.status(400).json({ error: 'photo_url이 필요합니다.' });

    await supabase
      .from('profiles')
      .update({ photo_url })
      .eq('id', req.user.id);

    res.json({ success: true, photo_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/photos/set-background — 배경 사진 설정
router.patch('/set-background', async (req, res) => {
  try {
    const { background_url } = req.body;

    await supabase
      .from('profiles')
      .update({ background_url: background_url || null })
      .eq('id', req.user.id);

    res.json({ success: true, background_url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
