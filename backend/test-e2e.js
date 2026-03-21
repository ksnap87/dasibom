/**
 * 다시봄 E2E QC 테스트
 * 가상 유저 5명: 회원가입 → 프로필 설정 → 추천 → 관심 표현 → 매칭 → 채팅 → 크레딧
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const API = `http://localhost:3000`;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 테스트 유저 데이터 (50대 이상 타겟)
const TEST_USERS = [
  {
    email: 'test_sunhee@test.com', password: 'test1234',
    profile: {
      name: '박선희', birth_year: 1968, gender: 'female', looking_for: 'male', city: '서울',
      bio: '음악과 산책을 좋아하는 56세입니다',
      personality_type: 'ambivert', emotional_expression: 'delayed_share',
      communication_style: 'balanced', conflict_style: 'direct',
      social_frequency: 'sometimes', chronotype: 'morning', rest_style: 'light_out',
      exercise_frequency: 'sometimes', meal_style: 'cook', smoking: 'never', drinking: 'rarely',
      hobbies: ['walking', 'music', 'cooking'],
      has_children: true, children_living_together: false, wants_more_children: false, willing_to_relocate: false,
      relationship_goal: 'companionship', family_importance: 4,
      religion: 'christianity', religion_importance: 3,
      health_status: 'good', financial_stability: 'stable', living_situation: 'alone',
      age_min: 55, age_max: 68, questionnaire_completed: true,
    },
  },
  {
    email: 'test_jungho@test.com', password: 'test1234',
    profile: {
      name: '김정호', birth_year: 1965, gender: 'male', looking_for: 'female', city: '서울',
      bio: '등산과 독서를 즐기는 60세입니다',
      personality_type: 'introvert', emotional_expression: 'suppress',
      communication_style: 'listener', conflict_style: 'space',
      social_frequency: 'rarely', chronotype: 'morning', rest_style: 'active',
      exercise_frequency: 'regularly', meal_style: 'regular', smoking: 'never', drinking: 'socially',
      hobbies: ['hiking', 'reading', 'photography'],
      has_children: true, children_living_together: false, wants_more_children: false, willing_to_relocate: false,
      relationship_goal: 'companionship', family_importance: 4,
      religion: 'buddhism', religion_importance: 2,
      health_status: 'excellent', financial_stability: 'comfortable', living_situation: 'alone',
      age_min: 50, age_max: 62, questionnaire_completed: true,
    },
  },
  {
    email: 'test_mikyung@test.com', password: 'test1234',
    profile: {
      name: '이미경', birth_year: 1970, gender: 'female', looking_for: 'male', city: '서울',
      bio: '여행과 요리를 좋아합니다',
      personality_type: 'extrovert', emotional_expression: 'expressive',
      communication_style: 'talker', conflict_style: 'accommodate',
      social_frequency: 'often', chronotype: 'flexible', rest_style: 'active',
      exercise_frequency: 'sometimes', meal_style: 'dine_out', smoking: 'never', drinking: 'socially',
      hobbies: ['travel', 'cooking', 'movies', 'yoga'],
      has_children: false, wants_more_children: false, willing_to_relocate: true,
      relationship_goal: 'marriage', family_importance: 5,
      religion: 'catholicism', religion_importance: 4,
      health_status: 'good', financial_stability: 'comfortable', living_situation: 'alone',
      age_min: 52, age_max: 65, questionnaire_completed: true,
    },
  },
  {
    email: 'test_sangwoo@test.com', password: 'test1234',
    profile: {
      name: '최상우', birth_year: 1963, gender: 'male', looking_for: 'female', city: '경기',
      bio: '골프와 낚시를 즐기는 62세',
      personality_type: 'extrovert', emotional_expression: 'expressive',
      communication_style: 'talker', conflict_style: 'direct',
      social_frequency: 'often', chronotype: 'morning', rest_style: 'active',
      exercise_frequency: 'regularly', meal_style: 'dine_out', smoking: 'quit', drinking: 'socially',
      hobbies: ['golf', 'fishing', 'travel'],
      has_children: true, children_living_together: false, wants_more_children: false, willing_to_relocate: false,
      relationship_goal: 'companionship', family_importance: 3,
      religion: 'none', religion_importance: 1,
      health_status: 'good', financial_stability: 'wealthy', living_situation: 'alone',
      age_min: 48, age_max: 60, questionnaire_completed: true,
    },
  },
  {
    email: 'test_eunji@test.com', password: 'test1234',
    profile: {
      name: '한은지', birth_year: 1972, gender: 'female', looking_for: 'male', city: '인천',
      bio: '원예와 봉사활동을 좋아해요',
      personality_type: 'ambivert', emotional_expression: 'delayed_share',
      communication_style: 'balanced', conflict_style: 'accommodate',
      social_frequency: 'sometimes', chronotype: 'morning', rest_style: 'home',
      exercise_frequency: 'rarely', meal_style: 'cook', smoking: 'never', drinking: 'never',
      hobbies: ['gardening', 'volunteering', 'reading', 'walking'],
      has_children: true, children_living_together: true, wants_more_children: false, willing_to_relocate: false,
      relationship_goal: 'friendship', family_importance: 5,
      religion: 'christianity', religion_importance: 5,
      health_status: 'fair', financial_stability: 'stable', living_situation: 'with_children',
      age_min: 50, age_max: 65, questionnaire_completed: true,
    },
  },
];

const tokens = {}; // email -> access_token
const userIds = {}; // email -> user_id

async function apiCall(method, path, token, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}${path}`, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(`${method} ${path} ${res.status}: ${JSON.stringify(data)}`);
  return data;
}

function log(icon, msg) { console.log(`${icon}  ${msg}`); }
function pass(msg) { log('✅', msg); }
function fail(msg) { log('❌', msg); }
function info(msg) { log('📋', msg); }
function sep() { console.log('\n' + '═'.repeat(60)); }

async function cleanup() {
  info('기존 테스트 유저 정리 중...');
  for (const u of TEST_USERS) {
    // 기존 유저 삭제
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find(eu => eu.email === u.email);
    if (found) {
      await supabase.from('profiles').delete().eq('id', found.id);
      await supabase.auth.admin.deleteUser(found.id);
    }
  }
  pass('기존 테스트 데이터 정리 완료');
}

async function step1_signup() {
  sep();
  info('STEP 1: 회원가입 (5명)');
  for (const u of TEST_USERS) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (error) { fail(`${u.profile.name} 가입 실패: ${error.message}`); continue; }
    userIds[u.email] = data.user.id;

    // 로그인해서 토큰 받기
    const { data: session, error: loginErr } = await supabase.auth.signInWithPassword({
      email: u.email, password: u.password,
    });
    if (loginErr) { fail(`${u.profile.name} 로그인 실패: ${loginErr.message}`); continue; }
    tokens[u.email] = session.session.access_token;
    pass(`${u.profile.name} (${u.email}) 가입+로그인 완료 [${data.user.id.slice(0, 8)}...]`);
  }
}

async function step2_profile() {
  sep();
  info('STEP 2: 프로필 설정 + 설문 완료');
  for (const u of TEST_USERS) {
    const token = tokens[u.email];
    if (!token) continue;

    // PUT /api/profiles/me로 생성+업데이트 (upsert)
    try {
      const result = await apiCall('PUT', '/api/profiles/me', token, u.profile);
      if (result.questionnaire_completed) {
        pass(`${u.profile.name} - 프로필 설정 완료 (${u.profile.city}, ${new Date().getFullYear() - u.profile.birth_year}세)`);
      } else {
        fail(`${u.profile.name} - questionnaire_completed가 false`);
      }
    } catch (e) {
      fail(`${u.profile.name} 프로필 업데이트 실패: ${e.message}`);
    }
  }
}

async function step3_suggestions() {
  sep();
  info('STEP 3: 추천 목록 확인');
  for (const u of TEST_USERS) {
    const token = tokens[u.email];
    if (!token) continue;

    try {
      // 전국 범위로 추천
      const suggestions = await apiCall('GET', '/api/matches/suggestions?region=nationwide', token);
      const names = suggestions.map(s => `${s.name}(${s.compatibility_score}점)`).join(', ');
      pass(`${u.profile.name} 추천: [${suggestions.length}명] ${names}`);

      if (suggestions.length === 0) {
        fail(`${u.profile.name} - 추천 상대가 0명! 필터 확인 필요`);
      }
    } catch (e) {
      fail(`${u.profile.name} 추천 조회 실패: ${e.message}`);
    }
  }
}

async function step4_interests() {
  sep();
  info('STEP 4: 관심 표현 (좋아요 / 패스)');

  // 시나리오:
  // 박선희 ❤️ 김정호 (상호)
  // 김정호 ❤️ 박선희 → 매칭!
  // 이미경 ❤️ 김정호 (일방)
  // 이미경 ❤️ 최상우 (상호)
  // 최상우 ❤️ 이미경 → 매칭!
  // 한은지 ❤️ 김정호 (일방)
  // 박선희 ❌ 최상우 (패스)

  const interactions = [
    { from: 'test_sunhee@test.com', to: 'test_jungho@test.com', liked: true, expect: 'no_match' },
    { from: 'test_jungho@test.com', to: 'test_sunhee@test.com', liked: true, expect: 'match' },
    { from: 'test_mikyung@test.com', to: 'test_jungho@test.com', liked: true, expect: 'no_match' },
    { from: 'test_mikyung@test.com', to: 'test_sangwoo@test.com', liked: true, expect: 'no_match' },
    { from: 'test_sangwoo@test.com', to: 'test_mikyung@test.com', liked: true, expect: 'match' },
    { from: 'test_eunji@test.com', to: 'test_jungho@test.com', liked: true, expect: 'no_match' },
    { from: 'test_sunhee@test.com', to: 'test_sangwoo@test.com', liked: false, expect: 'pass' },
  ];

  for (const i of interactions) {
    const fromName = TEST_USERS.find(u => u.email === i.from).profile.name;
    const toName = TEST_USERS.find(u => u.email === i.to).profile.name;
    const token = tokens[i.from];
    const toId = userIds[i.to];

    try {
      const result = await apiCall('POST', '/api/profiles/interest', token, {
        to_user_id: toId, is_liked: i.liked,
      });

      if (i.expect === 'match' && result.matched) {
        pass(`${fromName} ❤️ ${toName} → 매칭 성공! (호환도: ${result.score}점)`);
      } else if (i.expect === 'no_match' && !result.matched) {
        pass(`${fromName} ❤️ ${toName} → 관심 표현 (아직 상호 아님)`);
      } else if (i.expect === 'pass' && !result.matched) {
        pass(`${fromName} ❌ ${toName} → 패스`);
      } else {
        fail(`${fromName} → ${toName}: 예상과 다른 결과 (matched=${result.matched}, 예상=${i.expect})`);
      }
    } catch (e) {
      fail(`${fromName} → ${toName} 실패: ${e.message}`);
    }
  }
}

async function step5_matches() {
  sep();
  info('STEP 5: 매칭 목록 확인 (채팅 가능 상대)');

  for (const u of TEST_USERS) {
    const token = tokens[u.email];
    if (!token) continue;

    try {
      const matches = await apiCall('GET', '/api/matches', token);
      if (matches.length > 0) {
        const details = matches.map(m =>
          `${m.other_user.name}(${m.last_message ? '대화중' : '새매칭'}, unread:${m.unread_count || 0})`
        ).join(', ');
        pass(`${u.profile.name} 매칭: [${matches.length}명] ${details}`);
      } else {
        info(`${u.profile.name} - 매칭 없음`);
      }
    } catch (e) {
      fail(`${u.profile.name} 매칭 조회 실패: ${e.message}`);
    }
  }
}

async function step6_chat() {
  sep();
  info('STEP 6: 채팅 테스트');

  // 박선희 ↔ 김정호 매칭에서 채팅
  const sunheeToken = tokens['test_sunhee@test.com'];
  const junghoToken = tokens['test_jungho@test.com'];

  // 박선희의 매칭 목록에서 김정호 찾기
  const sunheeMatches = await apiCall('GET', '/api/matches', sunheeToken);
  const matchWithJungho = sunheeMatches.find(m => m.other_user.name === '김정호');

  if (!matchWithJungho) {
    fail('박선희-김정호 매칭을 찾을 수 없음');
    return;
  }

  const matchId = matchWithJungho.match_id;
  pass(`매칭 ID: ${matchId.slice(0, 8)}...`);

  // 박선희가 메시지 보내기
  try {
    const msg1 = await apiCall('POST', '/api/messages', sunheeToken, {
      match_id: matchId, content: '안녕하세요, 프로필 보고 관심이 생겼어요 :)',
    });
    pass(`박선희 → 김정호: "${msg1.content}"`);
  } catch (e) {
    fail(`메시지 전송 실패: ${e.message}`);
    return;
  }

  // 김정호가 메시지 보내기
  try {
    const msg2 = await apiCall('POST', '/api/messages', junghoToken, {
      match_id: matchId, content: '반갑습니다! 등산 좋아하시나요?',
    });
    pass(`김정호 → 박선희: "${msg2.content}"`);
  } catch (e) {
    fail(`메시지 전송 실패: ${e.message}`);
  }

  // 박선희가 또 보내기
  try {
    const msg3 = await apiCall('POST', '/api/messages', sunheeToken, {
      match_id: matchId, content: '네! 산책도 좋아하고, 주말마다 남산 다녀와요',
    });
    pass(`박선희 → 김정호: "${msg3.content}"`);
  } catch (e) {
    fail(`메시지 전송 실패: ${e.message}`);
  }

  // 메시지 목록 조회
  try {
    const messages = await apiCall('GET', `/api/messages/${matchId}`, sunheeToken);
    pass(`채팅 메시지 수: ${messages.length}개`);
  } catch (e) {
    fail(`메시지 조회 실패: ${e.message}`);
  }

  // 읽음 처리
  try {
    await apiCall('PATCH', `/api/messages/read/${matchId}`, junghoToken);
    pass('김정호 읽음 처리 완료');
  } catch (e) {
    fail(`읽음 처리 실패: ${e.message}`);
  }

  // 이미경 ↔ 최상우 매칭에서도 채팅
  const mikyungToken = tokens['test_mikyung@test.com'];
  const mikyungMatches = await apiCall('GET', '/api/matches', mikyungToken);
  const matchWithSangwoo = mikyungMatches.find(m => m.other_user.name === '최상우');

  if (matchWithSangwoo) {
    try {
      await apiCall('POST', '/api/messages', mikyungToken, {
        match_id: matchWithSangwoo.match_id, content: '안녕하세요! 골프 좋아하시는군요 ^^',
      });
      pass(`이미경 → 최상우: 채팅 전송 성공`);
    } catch (e) {
      fail(`이미경→최상우 채팅 실패: ${e.message}`);
    }
  }
}

async function step7_verify_chat_list() {
  sep();
  info('STEP 7: 채팅 후 매칭 목록 재확인 (last_message, unread_count)');

  for (const email of ['test_sunhee@test.com', 'test_jungho@test.com', 'test_mikyung@test.com', 'test_sangwoo@test.com']) {
    const token = tokens[email];
    const name = TEST_USERS.find(u => u.email === email).profile.name;
    try {
      const matches = await apiCall('GET', '/api/matches', token);
      for (const m of matches) {
        const lastMsg = m.last_message ? `"${m.last_message.content.slice(0, 20)}..."` : '(없음)';
        const status = m.last_message ? '대화중' : '새매칭';
        info(`  ${name} ↔ ${m.other_user.name}: ${status}, 마지막="${lastMsg}", 안읽음=${m.unread_count || 0}`);
      }
    } catch (e) {
      fail(`${name} 매칭 재확인 실패: ${e.message}`);
    }
  }
}

async function step8_credits() {
  sep();
  info('STEP 8: 크레딧 시스템 테스트');

  const sunheeToken = tokens['test_sunhee@test.com'];

  // 현재 크레딧 확인
  try {
    const profile = await apiCall('GET', '/api/profiles/me', sunheeToken);
    info(`박선희 현재 크레딧: ${profile.credits}개`);

    // 크레딧 차감
    const result = await apiCall('POST', '/api/profiles/credits/deduct', sunheeToken, { amount: 1 });
    pass(`크레딧 1개 차감 → 남은: ${result.credits}개`);

    // 크레딧 0일 때 차감 시도
    // 먼저 모두 차감
    let remaining = result.credits;
    while (remaining > 0) {
      const r = await apiCall('POST', '/api/profiles/credits/deduct', sunheeToken, { amount: 1 });
      remaining = r.credits;
    }
    info(`크레딧 전부 소진: ${remaining}개`);

    // 0일 때 차감
    try {
      await apiCall('POST', '/api/profiles/credits/deduct', sunheeToken, { amount: 1 });
      fail('크레딧 0인데 차감 성공 — 에러 핸들링 필요!');
    } catch (e) {
      pass(`크레딧 0일 때 차감 거부됨: ${e.message}`);
    }
  } catch (e) {
    fail(`크레딧 테스트 실패: ${e.message}`);
  }
}

async function step9_suggestions_after_interest() {
  sep();
  info('STEP 9: 관심 표현 후 추천 목록에서 제외 확인');

  const sunheeToken = tokens['test_sunhee@test.com'];
  try {
    const suggestions = await apiCall('GET', '/api/matches/suggestions?region=nationwide', sunheeToken);
    const names = suggestions.map(s => s.name);
    info(`박선희 추천 목록: ${names.length > 0 ? names.join(', ') : '(비어있음)'}`);

    // 김정호(좋아요), 최상우(패스)는 이미 관심 표현했으므로 제외되어야 함
    if (names.includes('김정호')) {
      fail('이미 좋아요한 김정호가 추천에 남아있음!');
    } else {
      pass('김정호(좋아요) 추천에서 제외됨');
    }
    if (names.includes('최상우')) {
      fail('이미 패스한 최상우가 추천에 남아있음!');
    } else {
      pass('최상우(패스) 추천에서 제외됨');
    }
  } catch (e) {
    fail(`추천 재확인 실패: ${e.message}`);
  }
}

async function step10_region_filter() {
  sep();
  info('STEP 10: 지역 필터 테스트');

  const sunheeToken = tokens['test_sunhee@test.com'];

  // same_city: 서울만
  try {
    const seoul = await apiCall('GET', '/api/matches/suggestions?region=same_city', sunheeToken);
    const seoulNames = seoul.map(s => `${s.name}(${s.city})`);
    info(`같은 도시(서울): ${seoulNames.length > 0 ? seoulNames.join(', ') : '(없음)'}`);

    const nonSeoul = seoul.filter(s => s.city !== '서울');
    if (nonSeoul.length > 0) {
      fail(`서울 외 도시가 포함됨: ${nonSeoul.map(s => s.city).join(', ')}`);
    } else {
      pass('같은 도시 필터 정상');
    }
  } catch (e) {
    fail(`지역 필터 실패: ${e.message}`);
  }

  // metro: 수도권
  try {
    const metro = await apiCall('GET', '/api/matches/suggestions?region=metro', sunheeToken);
    const metroNames = metro.map(s => `${s.name}(${s.city})`);
    info(`수도권: ${metroNames.length > 0 ? metroNames.join(', ') : '(없음)'}`);

    const nonMetro = metro.filter(s => !['서울', '경기', '인천'].includes(s.city));
    if (nonMetro.length > 0) {
      fail(`수도권 외 도시가 포함됨: ${nonMetro.map(s => s.city).join(', ')}`);
    } else {
      pass('수도권 필터 정상');
    }
  } catch (e) {
    fail(`수도권 필터 실패: ${e.message}`);
  }
}

async function step11_photos() {
  sep();
  info('STEP 11: 사진 API 테스트');

  const sunheeToken = tokens['test_sunhee@test.com'];

  // 사진 목록 조회 (비어있어야 함)
  try {
    const photos = await apiCall('GET', '/api/photos', sunheeToken);
    pass(`사진 목록 조회: ${photos.length}장`);
  } catch (e) {
    fail(`사진 조회 실패: ${e.message}`);
  }

  // 프로필/배경 사진 설정 (URL만 설정 — 실제 업로드는 멀티파트라 스킵)
  try {
    await apiCall('PATCH', '/api/photos/set-profile', sunheeToken, {
      photo_url: 'https://example.com/test-photo.jpg',
    });
    pass('프로필 사진 URL 설정 성공');
  } catch (e) {
    fail(`프로필 사진 설정 실패: ${e.message}`);
  }

  try {
    await apiCall('PATCH', '/api/photos/set-background', sunheeToken, {
      background_url: 'https://example.com/test-bg.jpg',
    });
    pass('배경 사진 URL 설정 성공');
  } catch (e) {
    fail(`배경 사진 설정 실패: ${e.message}`);
  }

  // 프로필에 반영 확인
  try {
    const profile = await apiCall('GET', '/api/profiles/me', sunheeToken);
    if (profile.photo_url === 'https://example.com/test-photo.jpg') {
      pass('프로필 사진 URL 프로필에 반영됨');
    } else {
      fail(`프로필 사진 URL 불일치: ${profile.photo_url}`);
    }
    if (profile.background_url === 'https://example.com/test-bg.jpg') {
      pass('배경 사진 URL 프로필에 반영됨');
    } else {
      fail(`배경 사진 URL 불일치: ${profile.background_url}`);
    }
  } catch (e) {
    fail(`프로필 확인 실패: ${e.message}`);
  }
}

async function step12_bio_limit() {
  sep();
  info('STEP 12: 자기소개 100자 제한 테스트');

  const sunheeToken = tokens['test_sunhee@test.com'];

  // 100자 이내
  try {
    const shortBio = '음악과 산책을 좋아합니다. 따뜻한 마음을 가진 사람을 찾고 있어요.';
    await apiCall('PUT', '/api/profiles/me', sunheeToken, { bio: shortBio });
    pass(`${shortBio.length}자 자기소개 저장 성공`);
  } catch (e) {
    fail(`자기소개 저장 실패: ${e.message}`);
  }
}

// ─── 실행 ───
(async () => {
  console.log('\n🌸 다시봄 E2E QC 테스트 시작\n');
  const start = Date.now();

  try {
    await cleanup();
    await step1_signup();
    await step2_profile();
    await step3_suggestions();
    await step4_interests();
    await step5_matches();
    await step6_chat();
    await step7_verify_chat_list();
    await step8_credits();
    await step9_suggestions_after_interest();
    await step10_region_filter();
    await step11_photos();
    await step12_bio_limit();

    sep();
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`\n🌸 테스트 완료 (${elapsed}초)\n`);
  } catch (e) {
    console.error('\n💥 테스트 중 치명적 오류:', e);
  }
})();
