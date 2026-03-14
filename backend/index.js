const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { verifyToken } = require('./src/middleware/auth');
const profilesRouter = require('./src/routes/profiles');
const matchesRouter = require('./src/routes/matches');
const messagesRouter = require('./src/routes/messages');
const photosRouter = require('./src/routes/photos');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok', app: '다시봄 API' }));

app.use('/api/profiles', verifyToken, profilesRouter);
app.use('/api/matches', verifyToken, matchesRouter);
app.use('/api/messages', verifyToken, messagesRouter);
app.use('/api/photos', verifyToken, photosRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

app.listen(PORT, () => {
  console.log(`🌸 다시봄 API running on http://localhost:${PORT}`);
});
