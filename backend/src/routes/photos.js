const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// 메모리에 버퍼로 저장 (파일 시스템 사용 X)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('이미지 파일만 업로드 가능합니다.'));
    }
    cb(null, true);
  },
});

// POST /api/photos/upload
router.post('/upload', upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '파일이 없습니다.' });
  }

  const userId = req.user.id;
  const ext = req.file.mimetype === 'image/png' ? 'png' : 'jpg';
  const fileName = `${userId}/profile_${Date.now()}.${ext}`;

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

  // photo_url을 프로필에도 자동 저장
  await supabase
    .from('profiles')
    .update({ photo_url: urlData.publicUrl })
    .eq('id', userId);

  res.json({ photo_url: urlData.publicUrl });
});

module.exports = router;
