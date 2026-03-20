const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '인증 토큰이 없습니다.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
    }
    req.user = user;

    // 정지된 유저 차단
    const { data: profile } = await supabase
      .from('profiles')
      .select('suspended_until, suspension_reason')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.suspended_until) {
      const suspendedUntil = new Date(profile.suspended_until);
      if (suspendedUntil > new Date()) {
        const isPermanent = suspendedUntil.getFullYear() >= 2099;
        return res.status(403).json({
          error: isPermanent
            ? '계정이 영구 정지되었습니다.'
            : `계정이 ${suspendedUntil.toLocaleDateString('ko-KR')}까지 정지되었습니다.`,
          reason: profile.suspension_reason,
          suspended_until: profile.suspended_until,
          permanent: isPermanent,
        });
      }
    }

    next();
  } catch {
    return res.status(401).json({ error: '인증 처리 중 오류가 발생했습니다.' });
  }
};

module.exports = { verifyToken };
