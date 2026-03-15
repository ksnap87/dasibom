const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { verifyToken } = require('./src/middleware/auth');
const profilesRouter = require('./src/routes/profiles');
const matchesRouter = require('./src/routes/matches');
const messagesRouter = require('./src/routes/messages');
const photosRouter = require('./src/routes/photos');
const creditsRouter = require('./src/routes/credits');

const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Supabase Storage 버킷 자동 생성 (서버 시작 시 1회)
(async () => {
  try {
    const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: buckets } = await sb.storage.listBuckets();
    const exists = buckets?.some(b => b.name === 'profile-photos');
    if (!exists) {
      const { error } = await sb.storage.createBucket('profile-photos', {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      });
      if (error) console.warn('Storage bucket 생성 실패:', error.message);
      else console.log('✅ profile-photos 버킷 생성 완료');
    }
  } catch (e) {
    console.warn('Storage 초기화 스킵:', e.message);
  }
})();

app.get('/health', (req, res) => res.json({ status: 'ok', app: '다시봄 API' }));

app.use('/api/profiles', verifyToken, profilesRouter);
app.use('/api/matches', verifyToken, matchesRouter);
app.use('/api/messages', verifyToken, messagesRouter);
app.use('/api/photos', verifyToken, photosRouter);
app.use('/api/credits', verifyToken, creditsRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

app.listen(PORT, () => {
  console.log(`🌸 다시봄 API running on http://localhost:${PORT}`);
});
