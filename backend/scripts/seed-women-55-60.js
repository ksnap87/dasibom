/**
 * 일회성 시드 스크립트 — 55~60세 여성 7명 추가
 * 실행 후 삭제 예정
 *
 * 사용: node backend/scripts/seed-women-55-60.js
 */
require('dotenv').config({ path: __dirname + '/../.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

const SEEDS = [
  {
    name: '김미숙', birth_year: 1968, city: '서울',
    relationship_goal: 'marriage', personality_type: 'extrovert',
    religion: 'none', religion_importance: 1, family_importance: 4,
    smoking: 'never', drinking: 'socially', chronotype: 'morning',
    health_status: 'good', exercise_frequency: 'sometimes',
    financial_stability: 'comfortable', emotional_expression: 'expressive',
    communication_style: 'talker', conflict_style: 'direct',
    social_frequency: 'often', rest_style: 'active', meal_style: 'cook',
    has_children: true, children_count: 2, children_living_together: false,
    has_pet: false, pet_friendly: true, willing_to_relocate: false,
    hobbies: ['hiking', 'cooking', 'travel'],
    bio: '활기차고 솔직한 성격이에요. 함께 등산 다닐 분 환영해요.',
  },
  {
    name: '박정희', birth_year: 1970, city: '서울',
    relationship_goal: 'companionship', personality_type: 'ambivert',
    religion: 'christianity', religion_importance: 4, family_importance: 5,
    smoking: 'never', drinking: 'rarely', chronotype: 'morning',
    health_status: 'good', exercise_frequency: 'regularly',
    financial_stability: 'comfortable', emotional_expression: 'delayed_share',
    communication_style: 'balanced', conflict_style: 'space',
    social_frequency: 'sometimes', rest_style: 'light_out', meal_style: 'regular',
    has_children: true, children_count: 1, children_living_together: false,
    has_pet: false, pet_friendly: true, willing_to_relocate: false,
    hobbies: ['reading', 'travel', 'music'],
    bio: '책 읽는 걸 좋아하고, 산책할 때 가장 행복합니다.',
  },
  {
    name: '이순자', birth_year: 1966, city: '경기',
    relationship_goal: 'companionship', personality_type: 'introvert',
    religion: 'buddhism', religion_importance: 3, family_importance: 5,
    smoking: 'never', drinking: 'never', chronotype: 'morning',
    health_status: 'fair', exercise_frequency: 'sometimes',
    financial_stability: 'stable', emotional_expression: 'suppress',
    communication_style: 'listener', conflict_style: 'accommodate',
    social_frequency: 'rarely', rest_style: 'home', meal_style: 'cook',
    has_children: true, children_count: 2, children_living_together: false,
    has_pet: true, pet_type: 'dog', pet_friendly: true, willing_to_relocate: false,
    hobbies: ['gardening', 'volunteering', 'cooking'],
    bio: '조용하지만 마음은 따뜻해요. 강아지와 함께 지내고 있어요.',
  },
  {
    name: '최영자', birth_year: 1969, city: '서울',
    relationship_goal: 'companionship', personality_type: 'extrovert',
    religion: 'none', religion_importance: 1, family_importance: 4,
    smoking: 'never', drinking: 'socially', chronotype: 'evening',
    health_status: 'excellent', exercise_frequency: 'regularly',
    financial_stability: 'wealthy', emotional_expression: 'expressive',
    communication_style: 'talker', conflict_style: 'direct',
    social_frequency: 'very_often', rest_style: 'active', meal_style: 'dine_out',
    has_children: false, has_pet: false, pet_friendly: false,
    willing_to_relocate: true,
    hobbies: ['golf', 'dancing', 'travel'],
    bio: '운동도 여행도 좋아해요. 함께 즐길 동반자를 찾고 있습니다.',
  },
  {
    name: '정해숙', birth_year: 1971, city: '인천',
    relationship_goal: 'marriage', personality_type: 'ambivert',
    religion: 'catholicism', religion_importance: 4, family_importance: 5,
    smoking: 'never', drinking: 'rarely', chronotype: 'flexible',
    health_status: 'good', exercise_frequency: 'sometimes',
    financial_stability: 'comfortable', emotional_expression: 'delayed_share',
    communication_style: 'balanced', conflict_style: 'space',
    social_frequency: 'sometimes', rest_style: 'light_out', meal_style: 'regular',
    has_children: true, children_count: 1, children_living_together: true,
    has_pet: false, pet_friendly: true, willing_to_relocate: false,
    hobbies: ['music', 'photography', 'reading'],
    bio: '음악 듣고 사진 찍는 걸 좋아해요. 차분히 알아갈 수 있길 바랍니다.',
  },
  {
    name: '강미경', birth_year: 1967, city: '서울',
    relationship_goal: 'companionship', personality_type: 'introvert',
    religion: 'none', religion_importance: 1, family_importance: 3,
    smoking: 'never', drinking: 'never', chronotype: 'morning',
    health_status: 'managing', exercise_frequency: 'regularly',
    financial_stability: 'stable', emotional_expression: 'suppress',
    communication_style: 'listener', conflict_style: 'space',
    social_frequency: 'rarely', rest_style: 'home', meal_style: 'cook',
    has_children: false, has_pet: true, pet_type: 'cat', pet_friendly: true,
    willing_to_relocate: false,
    hobbies: ['yoga', 'reading', 'walking'],
    bio: '요가와 산책으로 하루를 시작합니다. 평온한 일상을 함께 나눠요.',
  },
  {
    name: '윤숙자', birth_year: 1970, city: '경기',
    relationship_goal: 'companionship', personality_type: 'extrovert',
    religion: 'christianity', religion_importance: 3, family_importance: 4,
    smoking: 'never', drinking: 'socially', chronotype: 'evening',
    health_status: 'good', exercise_frequency: 'sometimes',
    financial_stability: 'comfortable', emotional_expression: 'expressive',
    communication_style: 'talker', conflict_style: 'accommodate',
    social_frequency: 'often', rest_style: 'active', meal_style: 'dine_out',
    has_children: true, children_count: 2, children_living_together: false,
    has_pet: false, pet_friendly: true, willing_to_relocate: false,
    hobbies: ['movies', 'travel', 'cooking'],
    bio: '영화 보고 맛집 찾는 걸 좋아해요. 같이 다닐 사람이 있으면 더 즐거울 것 같아요.',
  },
];

(async () => {
  for (const [i, s] of SEEDS.entries()) {
    const email = `seed_w_${s.birth_year}_${i}@dasibom.test`;
    const password = `seed_${Math.random().toString(36).slice(2, 12)}`;

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { seed: true, name: s.name },
    });
    if (createErr) {
      console.error(`✗ ${s.name} createUser:`, createErr.message);
      continue;
    }
    const userId = created.user.id;

    const profile = {
      id: userId,
      name: s.name,
      birth_year: s.birth_year,
      gender: 'female',
      looking_for: 'male',
      city: s.city,
      bio: s.bio,
      hobbies: s.hobbies,
      questionnaire_completed: true,
      age_min: 50, age_max: 65,
      relationship_goal: s.relationship_goal,
      personality_type: s.personality_type,
      religion: s.religion,
      religion_importance: s.religion_importance,
      family_importance: s.family_importance,
      smoking: s.smoking,
      drinking: s.drinking,
      chronotype: s.chronotype,
      health_status: s.health_status,
      exercise_frequency: s.exercise_frequency,
      financial_stability: s.financial_stability,
      emotional_expression: s.emotional_expression,
      communication_style: s.communication_style,
      conflict_style: s.conflict_style,
      social_frequency: s.social_frequency,
      rest_style: s.rest_style,
      meal_style: s.meal_style,
      has_children: s.has_children,
      children_count: s.children_count ?? null,
      children_living_together: s.children_living_together ?? null,
      has_pet: s.has_pet,
      pet_type: s.pet_type ?? null,
      pet_friendly: s.pet_friendly,
      willing_to_relocate: s.willing_to_relocate,
    };

    const { error: profErr } = await supabase.from('profiles').upsert(profile);
    if (profErr) {
      console.error(`✗ ${s.name} profile:`, profErr.message);
      continue;
    }
    console.log(`✓ ${s.name} (${s.birth_year}년생, ${s.city}) 추가됨`);
  }
  console.log('\n시드 완료.');
})();
