/**
 * 다시봄 E2E 대규모 테스트 — 20명
 * 매칭, 채팅, 크레딧 사용 종합 테스트
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const API = `http://localhost:3000`;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CITIES = ['서울', '서울', '서울', '경기', '경기', '인천', '부산', '대구', '대전', '광주'];

const WOMEN = [
  { name: '박선희', birth_year: 1968, city: '서울', personality_type: 'ambivert', relationship_goal: 'companionship', religion: 'christianity', smoking: 'never', drinking: 'rarely', hobbies: ['walking', 'music', 'cooking'] },
  { name: '이미경', birth_year: 1970, city: '서울', personality_type: 'extrovert', relationship_goal: 'marriage', religion: 'catholicism', smoking: 'never', drinking: 'socially', hobbies: ['travel', 'cooking', 'movies', 'yoga'] },
  { name: '한은지', birth_year: 1972, city: '인천', personality_type: 'ambivert', relationship_goal: 'friendship', religion: 'christianity', smoking: 'never', drinking: 'never', hobbies: ['gardening', 'volunteering', 'reading'] },
  { name: '최영희', birth_year: 1966, city: '서울', personality_type: 'introvert', relationship_goal: 'companionship', religion: 'buddhism', smoking: 'never', drinking: 'rarely', hobbies: ['reading', 'yoga', 'art'] },
  { name: '정미라', birth_year: 1969, city: '경기', personality_type: 'extrovert', relationship_goal: 'marriage', religion: 'none', smoking: 'never', drinking: 'socially', hobbies: ['travel', 'dancing', 'movies'] },
  { name: '김순자', birth_year: 1964, city: '부산', personality_type: 'ambivert', relationship_goal: 'companionship', religion: 'buddhism', smoking: 'never', drinking: 'never', hobbies: ['walking', 'swimming', 'cooking'] },
  { name: '오정현', birth_year: 1971, city: '대구', personality_type: 'introvert', relationship_goal: 'marriage', religion: 'none', smoking: 'never', drinking: 'rarely', hobbies: ['reading', 'music', 'photography'] },
  { name: '윤서영', birth_year: 1967, city: '서울', personality_type: 'extrovert', relationship_goal: 'companionship', religion: 'christianity', smoking: 'never', drinking: 'socially', hobbies: ['hiking', 'travel', 'cooking'] },
  { name: '임보라', birth_year: 1973, city: '경기', personality_type: 'ambivert', relationship_goal: 'friendship', religion: 'none', smoking: 'never', drinking: 'rarely', hobbies: ['yoga', 'gardening', 'movies'] },
  { name: '송미숙', birth_year: 1965, city: '인천', personality_type: 'introvert', relationship_goal: 'companionship', religion: 'catholicism', smoking: 'never', drinking: 'never', hobbies: ['reading', 'walking', 'volunteering'] },
];

const MEN = [
  { name: '김정호', birth_year: 1965, city: '서울', personality_type: 'introvert', relationship_goal: 'companionship', religion: 'buddhism', smoking: 'never', drinking: 'socially', hobbies: ['hiking', 'reading', 'photography'] },
  { name: '최상우', birth_year: 1963, city: '경기', personality_type: 'extrovert', relationship_goal: 'companionship', religion: 'none', smoking: 'quit', drinking: 'socially', hobbies: ['golf', 'fishing', 'travel'] },
  { name: '이동건', birth_year: 1967, city: '서울', personality_type: 'ambivert', relationship_goal: 'marriage', religion: 'christianity', smoking: 'never', drinking: 'rarely', hobbies: ['hiking', 'music', 'cooking'] },
  { name: '박민수', birth_year: 1970, city: '서울', personality_type: 'extrovert', relationship_goal: 'marriage', religion: 'none', smoking: 'never', drinking: 'socially', hobbies: ['travel', 'movies', 'swimming'] },
  { name: '정대영', birth_year: 1964, city: '경기', personality_type: 'introvert', relationship_goal: 'companionship', religion: 'buddhism', smoking: 'never', drinking: 'rarely', hobbies: ['reading', 'walking', 'gardening'] },
  { name: '홍재석', birth_year: 1966, city: '부산', personality_type: 'ambivert', relationship_goal: 'companionship', religion: 'none', smoking: 'quit', drinking: 'socially', hobbies: ['fishing', 'golf', 'hiking'] },
  { name: '조성민', birth_year: 1968, city: '대구', personality_type: 'extrovert', relationship_goal: 'marriage', religion: 'christianity', smoking: 'never', drinking: 'rarely', hobbies: ['music', 'cooking', 'volunteering'] },
  { name: '유승환', birth_year: 1971, city: '서울', personality_type: 'ambivert', relationship_goal: 'friendship', religion: 'none', smoking: 'never', drinking: 'socially', hobbies: ['movies', 'swimming', 'photography'] },
  { name: '강태준', birth_year: 1962, city: '대전', personality_type: 'introvert', relationship_goal: 'companionship', religion: 'buddhism', smoking: 'never', drinking: 'never', hobbies: ['reading', 'walking', 'art'] },
  { name: '신용식', birth_year: 1969, city: '광주', personality_type: 'extrovert', relationship_goal: 'companionship', religion: 'catholicism', smoking: 'never', drinking: 'socially', hobbies: ['travel', 'dancing', 'golf'] },
];

function makeProfile(base, gender) {
  return {
    ...base,
    gender,
    looking_for: gender === 'male' ? 'female' : 'male',
    bio: `안녕하세요 ${base.name}입니다`,
    emotional_expression: 'delayed_share',
    communication_style: 'balanced',
    conflict_style: 'direct',
    social_frequency: 'sometimes',
    chronotype: 'morning',
    rest_style: 'light_out',
    exercise_frequency: 'sometimes',
    meal_style: 'regular',
    has_children: Math.random() > 0.4,
    children_living_together: false,
    wants_more_children: false,
    willing_to_relocate: Math.random() > 0.5,
    family_importance: Math.floor(Math.random() * 3) + 3,
    religion_importance: Math.floor(Math.random() * 3) + 2,
    health_status: 'good',
    financial_stability: ['stable', 'comfortable'][Math.floor(Math.random() * 2)],
    living_situation: 'alone',
    age_min: 48,
    age_max: 70,
    questionnaire_completed: true,
  };
}

const ALL_USERS = [
  ...WOMEN.map((w, i) => ({ email: `test_w${i}@test.com`, password: 'test1234', profile: makeProfile(w, 'female') })),
  ...MEN.map((m, i) => ({ email: `test_m${i}@test.com`, password: 'test1234', profile: makeProfile(m, 'male') })),
];

const tokens = {};
const userIds = {};
let stats = { pass: 0, fail: 0 };

async function apiCall(method, path, token, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

function log(icon, msg) { console.log(`${icon}  ${msg}`); }
function pass(msg) { stats.pass++; log('✅', msg); }
function fail(msg) { stats.fail++; log('❌', msg); }
function info(msg) { log('📋', msg); }
function sep(title) { console.log(`\n${'═'.repeat(60)}\n📋  ${title}\n${'─'.repeat(60)}`); }

async function cleanup() {
  info('기존 테스트 유저 정리...');
  const { data: existing } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const testUsers = existing?.users?.filter(u => u.email?.startsWith('test_')) || [];
  for (const u of testUsers) {
    await supabase.from('profiles').delete().eq('id', u.id);
    await supabase.auth.admin.deleteUser(u.id);
  }
  pass(`${testUsers.length}명 정리 완료`);
}

async function step1_signup() {
  sep('STEP 1: 20명 회원가입');
  for (const u of ALL_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email, password: u.password, email_confirm: true,
    });
    if (error) { fail(`${u.profile.name} 가입 실패: ${error.message}`); continue; }
    userIds[u.email] = data.user.id;

    const { data: session, error: loginErr } = await supabase.auth.signInWithPassword({
      email: u.email, password: u.password,
    });
    if (loginErr) { fail(`${u.profile.name} 로그인 실패`); continue; }
    tokens[u.email] = session.session.access_token;
  }
  pass(`${Object.keys(tokens).length}명 가입+로그인 완료`);
}

async function step2_profile() {
  sep('STEP 2: 프로필 설정');
  let ok = 0;
  for (const u of ALL_USERS) {
    const token = tokens[u.email];
    if (!token) continue;
    try {
      await apiCall('PUT', '/api/profiles/me', token, u.profile);
      ok++;
    } catch (e) {
      fail(`${u.profile.name} 프로필 실패: ${e.message}`);
    }
  }
  pass(`${ok}/20명 프로필 설정 완료`);
}

async function step3_suggestions() {
  sep('STEP 3: 추천 확인 (각 유저별)');
  let totalSuggestions = 0;
  for (const u of ALL_USERS) {
    const token = tokens[u.email];
    if (!token) continue;
    try {
      const s = await apiCall('GET', '/api/matches/suggestions?region=nationwide', token);
      totalSuggestions += s.length;
      const names = s.slice(0, 3).map(x => `${x.name}(${x.compatibility_score})`).join(', ');
      info(`${u.profile.name}: ${s.length}명 — ${names}${s.length > 3 ? '...' : ''}`);
    } catch (e) {
      fail(`${u.profile.name} 추천 실패: ${e.message}`);
    }
  }
  pass(`총 ${totalSuggestions}건 추천 생성됨 (평균 ${(totalSuggestions / 20).toFixed(1)}명/유저)`);
}

async function step4_mass_interests() {
  sep('STEP 4: 대규모 관심 표현 & 매칭 생성');

  // 시나리오: 여성 → 남성 좋아요 (높은 호환도 순)
  // 그 후 남성 → 여성 좋아요 (일부만 — 매칭 발생)
  const matchResults = [];

  // 여성들이 각자 추천 상위 2명에게 좋아요
  for (let i = 0; i < WOMEN.length; i++) {
    const email = `test_w${i}@test.com`;
    const token = tokens[email];
    if (!token) continue;
    try {
      const suggestions = await apiCall('GET', '/api/matches/suggestions?region=nationwide', token);
      for (const s of suggestions.slice(0, 2)) {
        const result = await apiCall('POST', '/api/profiles/interest', token, {
          to_user_id: s.id, is_liked: true,
        });
        if (result.matched) {
          matchResults.push(`${WOMEN[i].name} ❤️ ${s.name}`);
        }
      }
      // 나머지 1명은 패스
      if (suggestions.length > 2) {
        await apiCall('POST', '/api/profiles/interest', token, {
          to_user_id: suggestions[2].id, is_liked: false,
        });
      }
    } catch (e) {
      fail(`여성 ${WOMEN[i].name} 관심 표현 실패: ${e.message}`);
    }
  }

  // 남성들이 각자 추천 상위 3명에게 좋아요 (매칭 확률 높임)
  for (let i = 0; i < MEN.length; i++) {
    const email = `test_m${i}@test.com`;
    const token = tokens[email];
    if (!token) continue;
    try {
      const suggestions = await apiCall('GET', '/api/matches/suggestions?region=nationwide', token);
      for (const s of suggestions.slice(0, 3)) {
        const result = await apiCall('POST', '/api/profiles/interest', token, {
          to_user_id: s.id, is_liked: true,
        });
        if (result.matched) {
          matchResults.push(`${MEN[i].name} ❤️ ${s.name}`);
        }
      }
    } catch (e) {
      fail(`남성 ${MEN[i].name} 관심 표현 실패: ${e.message}`);
    }
  }

  if (matchResults.length > 0) {
    pass(`${matchResults.length}건 매칭 생성!`);
    matchResults.forEach(m => info(`  💕 ${m}`));
  } else {
    fail('매칭이 하나도 생성되지 않음!');
  }
}

async function step5_chat_test() {
  sep('STEP 5: 채팅 테스트 (매칭된 유저들)');

  let chatCount = 0;
  const messages = [
    '안녕하세요! 반갑습니다 ^^',
    '프로필 보고 관심이 생겼어요',
    '취미가 비슷하시네요!',
    '주말에 뭐하세요?',
    '좋은 하루 보내세요~',
  ];

  // 모든 유저의 매칭 목록 확인 후 채팅
  for (const u of ALL_USERS) {
    const token = tokens[u.email];
    if (!token) continue;
    try {
      const matches = await apiCall('GET', '/api/matches', token);
      for (const m of matches) {
        if (m.last_message) continue; // 이미 대화한 매칭은 스킵
        const msg = messages[chatCount % messages.length];
        await apiCall('POST', '/api/messages', token, {
          match_id: m.match_id, content: msg,
        });
        chatCount++;
      }
    } catch (e) {
      fail(`${u.profile.name} 채팅 실패: ${e.message}`);
    }
  }

  pass(`${chatCount}건 첫 메시지 전송 완료`);

  // 일부 유저가 답장
  let replyCount = 0;
  for (const u of ALL_USERS.slice(10)) { // 남성들이 답장
    const token = tokens[u.email];
    if (!token) continue;
    try {
      const matches = await apiCall('GET', '/api/matches', token);
      for (const m of matches) {
        if (!m.last_message || m.last_message.sender_id === userIds[u.email]) continue;
        await apiCall('POST', '/api/messages', token, {
          match_id: m.match_id, content: '안녕하세요! 저도 반갑습니다 :)',
        });
        // 읽음 처리
        await apiCall('PATCH', `/api/messages/read/${m.match_id}`, token);
        replyCount++;
      }
    } catch (e) {
      // 답장 실패는 무시
    }
  }

  pass(`${replyCount}건 답장 + 읽음 처리 완료`);
}

async function step6_verify_matches() {
  sep('STEP 6: 매칭 목록 검증 (last_message, unread, 새매칭 구분)');

  let totalMatches = 0;
  let withMessages = 0;
  let newMatches = 0;
  let totalUnread = 0;

  for (const u of ALL_USERS) {
    const token = tokens[u.email];
    if (!token) continue;
    try {
      const matches = await apiCall('GET', '/api/matches', token);
      totalMatches += matches.length;
      for (const m of matches) {
        if (m.last_message) withMessages++;
        else newMatches++;
        totalUnread += m.unread_count || 0;
      }
    } catch (e) {}
  }

  info(`총 매칭: ${totalMatches / 2}건 (각 유저에서 중복 카운트 → ${totalMatches})`);
  info(`대화중: ${withMessages}건, 새매칭: ${newMatches}건, 미읽음: ${totalUnread}건`);

  if (totalMatches > 0) pass('매칭 목록 정상');
  else fail('매칭이 0건!');

  if (withMessages > 0) pass('last_message 정상 반환');
  else fail('대화중인 매칭이 없음');
}

async function step7_credits() {
  sep('STEP 7: 크레딧 시스템');

  const u = ALL_USERS[0];
  const token = tokens[u.email];

  try {
    // 크레딧 확인
    const profile = await apiCall('GET', '/api/profiles/me', token);
    info(`${u.profile.name} 크레딧: ${profile.credits}개`);

    // 차감
    if (profile.credits > 0) {
      const r = await apiCall('POST', '/api/profiles/credits/deduct', token, { amount: 1 });
      pass(`크레딧 차감: ${profile.credits} → ${r.credits}`);
    }

    // 전부 소진 후 차감 시도
    let cr = (await apiCall('GET', '/api/profiles/me', token)).credits;
    while (cr > 0) {
      const r = await apiCall('POST', '/api/profiles/credits/deduct', token, { amount: 1 });
      cr = r.credits;
    }
    try {
      await apiCall('POST', '/api/profiles/credits/deduct', token, { amount: 1 });
      fail('크레딧 0인데 차감 성공!');
    } catch {
      pass('크레딧 0 차감 거부 정상');
    }
  } catch (e) {
    fail(`크레딧 테스트 실패: ${e.message}`);
  }
}

async function step8_region_filter() {
  sep('STEP 8: 지역 필터 검증');

  // 서울 유저가 same_city로 조회
  const seoulUser = ALL_USERS.find(u => u.profile.city === '서울');
  const token = tokens[seoulUser.email];

  try {
    const same = await apiCall('GET', '/api/matches/suggestions?region=same_city', token);
    const nonSeoul = same.filter(s => s.city !== '서울');
    if (nonSeoul.length > 0) fail(`같은 도시 필터 오류: ${nonSeoul.map(s => s.city)}`);
    else pass(`같은 도시: ${same.length}명 (모두 서울)`);

    const metro = await apiCall('GET', '/api/matches/suggestions?region=metro', token);
    const nonMetro = metro.filter(s => !['서울', '경기', '인천'].includes(s.city));
    if (nonMetro.length > 0) fail(`수도권 필터 오류: ${nonMetro.map(s => s.city)}`);
    else pass(`수도권: ${metro.length}명`);

    const all = await apiCall('GET', '/api/matches/suggestions?region=nationwide', token);
    pass(`전국: ${all.length}명`);
  } catch (e) {
    fail(`지역 필터 실패: ${e.message}`);
  }
}

async function step9_photos_bio() {
  sep('STEP 9: 사진 & 자기소개 API');

  const token = tokens[ALL_USERS[0].email];

  try {
    const photos = await apiCall('GET', '/api/photos', token);
    pass(`사진 목록 조회 OK (${photos.length}장)`);

    await apiCall('PATCH', '/api/photos/set-profile', token, { photo_url: 'https://test.com/p.jpg' });
    await apiCall('PATCH', '/api/photos/set-background', token, { background_url: 'https://test.com/bg.jpg' });
    pass('프로필/배경 사진 설정 OK');

    const p = await apiCall('GET', '/api/profiles/me', token);
    if (p.photo_url === 'https://test.com/p.jpg' && p.background_url === 'https://test.com/bg.jpg') {
      pass('사진 URL 프로필 반영 확인');
    } else {
      fail('사진 URL 불일치');
    }

    // 자기소개 100자
    await apiCall('PUT', '/api/profiles/me', token, { bio: '가'.repeat(100) });
    pass('자기소개 100자 저장 OK');
  } catch (e) {
    fail(`사진/자기소개 실패: ${e.message}`);
  }
}

// ─── 실행 ───
(async () => {
  console.log('\n🌸 다시봄 E2E 대규모 테스트 (20명)\n');
  const start = Date.now();

  try {
    await cleanup();
    await step1_signup();
    await step2_profile();
    await step3_suggestions();
    await step4_mass_interests();
    await step5_chat_test();
    await step6_verify_matches();
    await step7_credits();
    await step8_region_filter();
    await step9_photos_bio();

    console.log(`\n${'═'.repeat(60)}`);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n🌸 테스트 완료 (${elapsed}초)`);
    console.log(`   ✅ 통과: ${stats.pass}건`);
    console.log(`   ❌ 실패: ${stats.fail}건`);
    if (stats.fail === 0) console.log('\n   🎉 모든 테스트 통과!\n');
    else console.log(`\n   ⚠️  ${stats.fail}건 실패 — 위 로그 확인\n`);
  } catch (e) {
    console.error('\n💥 치명적 오류:', e);
  }
})();
