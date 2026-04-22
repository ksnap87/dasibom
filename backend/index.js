const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { verifyToken } = require('./src/middleware/auth');
const profilesRouter = require('./src/routes/profiles');
const matchesRouter = require('./src/routes/matches');
const messagesRouter = require('./src/routes/messages');
const photosRouter = require('./src/routes/photos');
const creditsRouter = require('./src/routes/credits');
const authRouter = require('./src/routes/auth');
const adminRouter = require('./src/routes/admin');

const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// 전역 Rate Limiting: IP당 15분에 100회
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// 민감 엔드포인트 — 스팸/열거 방지용 세분화 리밋
const interestLimiter = rateLimit({
  windowMs: 60 * 1000, max: 20,
  message: { error: '너무 많이 눌렀어요. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true, legacyHeaders: false,
});
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, max: 30,
  message: { error: '메시지를 너무 빠르게 보내고 있어요. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true, legacyHeaders: false,
});
const nicknameLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  message: { error: '닉네임 확인이 너무 잦아요. 잠시 후 다시 시도해주세요.' },
  standardHeaders: true, legacyHeaders: false,
});

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['https://dasibom-production.up.railway.app'],
}));
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

app.use('/api/auth', authRouter);  // 인증 불필요
app.use('/api/admin', adminRouter); // HMAC 자체 인증 (verifyToken 우회)

// 닉네임 중복체크는 /api/profiles/check-nickname (인증 필요) 로 이동됨 — 설문 중 호출

// 민감 엔드포인트에 세분 리밋 선적용 (아래 router mount 에서 다시 매치되며 이어짐)
app.use('/api/profiles/check-nickname', nicknameLimiter);
app.use('/api/profiles/interest', interestLimiter);

app.use('/api/profiles', verifyToken, profilesRouter);
app.use('/api/matches', verifyToken, matchesRouter);
app.use('/api/messages', verifyToken, messageLimiter, messagesRouter);
app.use('/api/photos', verifyToken, photosRouter);
app.use('/api/credits', verifyToken, creditsRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

app.listen(PORT, () => {
  console.log(`🌸 다시봄 API running on http://localhost:${PORT}`);
});
