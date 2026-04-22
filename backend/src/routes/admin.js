const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

// ── 전화번호 복호화 (profiles.js 와 동일한 AES-256-GCM) ─────────
const PHONE_ENCRYPTION_KEY = process.env.PHONE_ENCRYPTION_KEY;
const ENC_KEY = PHONE_ENCRYPTION_KEY && /^[0-9a-fA-F]{64}$/.test(PHONE_ENCRYPTION_KEY)
  ? Buffer.from(PHONE_ENCRYPTION_KEY, 'hex')
  : null;

function decryptPhone(encryptedData) {
  if (!ENC_KEY) throw new Error('PHONE_ENCRYPTION_KEY 미설정');
  const [ivHex, tagHex, encrypted] = encryptedData.split(':');
  const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const router = express.Router();
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// ── HMAC 인증 미들웨어 ──────────────────────────────────────
// 헤더:
//   x-admin-timestamp: <unix_ms>       (±5분 내)
//   x-admin-signature: HMAC_SHA256(ADMIN_SECRET, `${method}:${originalUrl}:${timestamp}`) in hex
//
// 생성 예시 (bash):
//   TS=$(date +%s%3N)
//   SIG=$(printf "GET:/api/admin/phone/$UID:$TS" | openssl dgst -sha256 -hmac "$ADMIN_SECRET" -hex | awk '{print $2}')
//   curl -H "x-admin-timestamp: $TS" -H "x-admin-signature: $SIG" "https://.../api/admin/phone/$UID"
function auditLog(req, result, extra = '') {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  console.warn(`[ADMIN] ${result} ${req.method} ${req.originalUrl} ip=${ip} ${extra}`.trim());
}

function verifyHmac(req, res, next) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 32) {
    auditLog(req, 'DENY', 'reason=server-misconfigured');
    return res.status(503).json({ error: '관리 기능이 비활성화되어 있습니다.' });
  }
  const ts = req.headers['x-admin-timestamp'];
  const sig = req.headers['x-admin-signature'];
  if (typeof ts !== 'string' || typeof sig !== 'string') {
    auditLog(req, 'DENY', 'reason=missing-headers');
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum) || Math.abs(Date.now() - tsNum) > 5 * 60 * 1000) {
    auditLog(req, 'DENY', 'reason=expired-timestamp');
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  const payload = `${req.method}:${req.originalUrl.split('?')[0]}:${ts}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  let a, b;
  try {
    a = Buffer.from(sig, 'hex');
    b = Buffer.from(expected, 'hex');
  } catch {
    auditLog(req, 'DENY', 'reason=malformed-signature');
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    auditLog(req, 'DENY', 'reason=bad-signature');
    return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
  }
  next();
}

router.use(verifyHmac);

// GET /api/admin/phone/:userId — 암호화된 전화번호 복호화 조회 (수사기관 협조용)
router.get('/phone/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const { data, error } = await supabase
      .from('verified_phones')
      .select('encrypted_phone, verified_at, verification_method')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      auditLog(req, 'NOTFOUND', `target=${userId}`);
      return res.status(404).json({ error: '인증된 전화번호가 없습니다.' });
    }

    const phone = decryptPhone(data.encrypted_phone);
    const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);

    auditLog(req, 'ALLOW', `target=${userId}`);
    res.json({
      user_id: userId,
      phone_number: phone,
      verified_at: data.verified_at,
      verification_method: data.verification_method,
      kakao_id: authUser?.user_metadata?.kakao_id ?? null,
      kakao_nickname: authUser?.user_metadata?.nickname ?? null,
      kakao_email: authUser?.user_metadata?.kakao_email ?? null,
    });
  } catch (err) {
    console.error('전화번호 복호화 실패:', err.message);
    auditLog(req, 'ERROR', `target=${userId} err=${err.message}`);
    res.status(500).json({ error: '조회 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
